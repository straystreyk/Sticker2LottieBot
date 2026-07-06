import type { Context } from "grammy";
import { InputFile } from "grammy";
import { execFile } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter } from "node:path";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { gzipSync } from "node:zlib";
import { CONFIG } from "../config.js";
import { logConversion } from "../db/database.js";
import { sendDonationPrompt } from "./sendDonationPrompt.js";

type Point = [number, number];

type LottiePath = {
  i: Point[];
  o: Point[];
  v: Point[];
  c: boolean;
};

type SvgStyle = {
  fill?: string;
  stroke?: string;
  strokeWidth: number;
  opacity: number;
  fillOpacity: number;
  strokeOpacity: number;
};

type Matrix = [number, number, number, number, number, number];

const CANVAS_SIZE = 512;
const FRAME_RATE = 30;
const OUT_POINT = 30;
const CIRCLE_KAPPA = 0.5522847498307936;
const execFileAsync = promisify(execFile);
const LOCAL_LOTTIE_CONVERT_BIN = resolve("vendor/lottie-convert/lottie_convert");

const namedColors: Record<string, string> = {
  black: "#000000",
  white: "#ffffff",
  red: "#ff0000",
  green: "#008000",
  blue: "#0000ff",
  yellow: "#ffff00",
  cyan: "#00ffff",
  magenta: "#ff00ff",
  gray: "#808080",
  grey: "#808080",
  transparent: "none",
};

function getTelegramFileUrl(filePath: string) {
  return `https://api.telegram.org/file/bot${CONFIG.botToken}/${filePath}`;
}

async function downloadAsBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  return Buffer.from(await res.arrayBuffer());
}

function parseAttrs(text: string) {
  const attrs: Record<string, string> = {};
  const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null;

  while ((match = attrRe.exec(text))) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? "";
  }

  if (attrs.style) {
    for (const chunk of attrs.style.split(";")) {
      const [key, value] = chunk.split(":").map((part) => part.trim());
      if (key && value) attrs[key.toLowerCase()] = value;
    }
  }

  return attrs;
}

function parseStyleBlock(svg: string) {
  const classes: Record<string, Record<string, string>> = {};
  const styleBlocks = svg.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi);

  for (const block of styleBlocks) {
    const css = block[1].replace(/\/\*[\s\S]*?\*\//g, "");
    const ruleRe = /\.([_a-zA-Z][-_a-zA-Z0-9]*)\s*\{([^}]*)\}/g;
    let rule: RegExpExecArray | null;

    while ((rule = ruleRe.exec(css))) {
      const attrs: Record<string, string> = {};
      for (const declaration of rule[2].split(";")) {
        const [key, value] = declaration.split(":").map((part) => part.trim());
        if (key && value) attrs[key.toLowerCase()] = value;
      }
      classes[rule[1]] = { ...(classes[rule[1]] ?? {}), ...attrs };
    }
  }

  return classes;
}

function attrsWithClasses(attrs: Record<string, string>, classes: Record<string, Record<string, string>>) {
  const classAttrs = (attrs.class ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .reduce<Record<string, string>>((merged, className) => ({ ...merged, ...(classes[className] ?? {}) }), {});

  return { ...classAttrs, ...attrs };
}

function collectShapeDefinitions(svg: string, classes: Record<string, Record<string, string>>) {
  const definitions: Record<string, { tag: string; attrs: Record<string, string> }> = {};
  const shapeRe = /<\s*(path|rect|circle|ellipse|line|polyline|polygon)\b([^>]*)\/?>/gi;
  let match: RegExpExecArray | null;

  while ((match = shapeRe.exec(svg))) {
    const attrs = attrsWithClasses(parseAttrs(match[2]), classes);
    if (attrs.id) {
      definitions[attrs.id] = { tag: match[1].toLowerCase(), attrs };
    }
  }

  return definitions;
}

function mergeAttrs(parent: Record<string, string>, child: Record<string, string>) {
  const inheritedKeys = [
    "fill",
    "stroke",
    "stroke-width",
    "opacity",
    "fill-opacity",
    "stroke-opacity",
    "display",
    "visibility",
  ];
  const inherited = Object.fromEntries(inheritedKeys.filter((key) => parent[key] != null).map((key) => [key, parent[key]]));
  return { ...inherited, ...child };
}

function numberAttr(attrs: Record<string, string>, name: string, fallback = 0) {
  const value = attrs[name];
  if (!value) return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseViewport(svg: string) {
  const svgMatch = svg.match(/<svg\b([^>]*)>/i);
  const attrs = parseAttrs(svgMatch?.[1] ?? "");
  const viewBox = attrs.viewbox
    ?.trim()
    .split(/[\s,]+/)
    .map((part) => Number.parseFloat(part));

  if (viewBox?.length === 4 && viewBox.every(Number.isFinite)) {
    return { minX: viewBox[0], minY: viewBox[1], width: viewBox[2], height: viewBox[3] };
  }

  return {
    minX: 0,
    minY: 0,
    width: numberAttr(attrs, "width", CANVAS_SIZE),
    height: numberAttr(attrs, "height", CANVAS_SIZE),
  };
}

function createNormalizer(svg: string) {
  const viewport = parseViewport(svg);
  const scale = Math.min(CANVAS_SIZE / viewport.width, CANVAS_SIZE / viewport.height);
  const offsetX = (CANVAS_SIZE - viewport.width * scale) / 2;
  const offsetY = (CANVAS_SIZE - viewport.height * scale) / 2;

  return {
    point(x: number, y: number): Point {
      return [(x - viewport.minX) * scale + offsetX, (y - viewport.minY) * scale + offsetY];
    },
    length(value: number) {
      return value * scale;
    },
    viewport,
  };
}

function identityMatrix(): Matrix {
  return [1, 0, 0, 1, 0, 0];
}

function multiplyMatrix(left: Matrix, right: Matrix): Matrix {
  return [
    left[0] * right[0] + left[2] * right[1],
    left[1] * right[0] + left[3] * right[1],
    left[0] * right[2] + left[2] * right[3],
    left[1] * right[2] + left[3] * right[3],
    left[0] * right[4] + left[2] * right[5] + left[4],
    left[1] * right[4] + left[3] * right[5] + left[5],
  ];
}

function applyMatrix(matrix: Matrix, x: number, y: number): Point {
  return [matrix[0] * x + matrix[2] * y + matrix[4], matrix[1] * x + matrix[3] * y + matrix[5]];
}

function parseTransform(transform?: string): Matrix {
  if (!transform) return identityMatrix();

  let matrix = identityMatrix();
  const transformRe = /(matrix|translate|scale|rotate)\s*\(([^)]*)\)/g;
  let match: RegExpExecArray | null;

  while ((match = transformRe.exec(transform))) {
    const args = match[2]
      .trim()
      .split(/[\s,]+/)
      .map((part) => Number.parseFloat(part))
      .filter(Number.isFinite);
    let next = identityMatrix();

    if (match[1] === "matrix" && args.length >= 6) {
      next = [args[0], args[1], args[2], args[3], args[4], args[5]];
    } else if (match[1] === "translate") {
      next = [1, 0, 0, 1, args[0] ?? 0, args[1] ?? 0];
    } else if (match[1] === "scale") {
      next = [args[0] ?? 1, 0, 0, args[1] ?? args[0] ?? 1, 0, 0];
    } else if (match[1] === "rotate") {
      const angle = ((args[0] ?? 0) * Math.PI) / 180;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const rotation: Matrix = [cos, sin, -sin, cos, 0, 0];
      if (args.length >= 3) {
        next = multiplyMatrix(
          multiplyMatrix([1, 0, 0, 1, args[1], args[2]], rotation),
          [1, 0, 0, 1, -args[1], -args[2]],
        );
      } else {
        next = rotation;
      }
    }

    matrix = multiplyMatrix(matrix, next);
  }

  return matrix;
}

function parseColor(input?: string): [number, number, number, number] | null {
  if (!input) return [0, 0, 0, 1];
  const color = input.trim().toLowerCase();
  const normalized = namedColors[color] ?? color;

  if (normalized === "none" || normalized === "transparent" || normalized.startsWith("url(")) {
    return null;
  }

  const shortHex = normalized.match(/^#([0-9a-f]{3})$/i);
  if (shortHex) {
    const [r, g, b] = shortHex[1].split("").map((part) => Number.parseInt(part + part, 16) / 255);
    return [r, g, b, 1];
  }

  const hex = normalized.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const value = hex[1];
    return [
      Number.parseInt(value.slice(0, 2), 16) / 255,
      Number.parseInt(value.slice(2, 4), 16) / 255,
      Number.parseInt(value.slice(4, 6), 16) / 255,
      1,
    ];
  }

  const rgb = normalized.match(/^rgba?\(([^)]+)\)$/);
  if (rgb) {
    const parts = rgb[1].split(/[\s,\/]+/).filter(Boolean);
    if (parts.length >= 3) {
      const alpha = parts[3] == null ? 1 : Number.parseFloat(parts[3]);
      return [
        Number.parseFloat(parts[0]) / 255,
        Number.parseFloat(parts[1]) / 255,
        Number.parseFloat(parts[2]) / 255,
        Number.isFinite(alpha) ? alpha : 1,
      ];
    }
  }

  return [0, 0, 0, 1];
}

function parseStyle(attrs: Record<string, string>, normalizeLength: (value: number) => number): SvgStyle {
  return {
    fill: attrs.fill ?? "#000000",
    stroke: attrs.stroke,
    strokeWidth: normalizeLength(numberAttr(attrs, "stroke-width", 1)),
    opacity: numberAttr(attrs, "opacity", 1),
    fillOpacity: numberAttr(attrs, "fill-opacity", 1),
    strokeOpacity: numberAttr(attrs, "stroke-opacity", 1),
  };
}

function createEmptyPath(closed = false): LottiePath {
  return { i: [], o: [], v: [], c: closed };
}

function addLine(path: LottiePath, point: Point) {
  path.v.push(point);
  path.i.push([0, 0]);
  path.o.push([0, 0]);
}

function addCubic(path: LottiePath, c1: Point, c2: Point, end: Point) {
  const lastIndex = path.v.length - 1;
  const start = path.v[lastIndex];
  path.o[lastIndex] = [c1[0] - start[0], c1[1] - start[1]];
  path.v.push(end);
  path.i.push([c2[0] - end[0], c2[1] - end[1]]);
  path.o.push([0, 0]);
}

function tokenizePath(d: string) {
  return d.match(/[AaCcHhLlMmQqSsTtVvZz]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) ?? [];
}

function isCommand(token: string) {
  return /^[AaCcHhLlMmQqSsTtVvZz]$/.test(token);
}

function vectorAngle(ux: number, uy: number, vx: number, vy: number) {
  const dot = ux * vx + uy * vy;
  const length = Math.sqrt((ux * ux + uy * uy) * (vx * vx + vy * vy));
  const sign = ux * vy - uy * vx < 0 ? -1 : 1;
  const ratio = length === 0 ? 0 : Math.min(1, Math.max(-1, dot / length));
  return sign * Math.acos(ratio);
}

function arcToCubics(
  x1: number,
  y1: number,
  rx: number,
  ry: number,
  xAxisRotation: number,
  largeArcFlag: number,
  sweepFlag: number,
  x2: number,
  y2: number,
) {
  rx = Math.abs(rx);
  ry = Math.abs(ry);

  if (rx === 0 || ry === 0 || (x1 === x2 && y1 === y2)) {
    return [{ c1: [x1, y1] as Point, c2: [x2, y2] as Point, end: [x2, y2] as Point }];
  }

  const phi = (xAxisRotation * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = cosPhi * dx + sinPhi * dy;
  const y1p = -sinPhi * dx + cosPhi * dy;

  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    const scale = Math.sqrt(lambda);
    rx *= scale;
    ry *= scale;
  }

  const rx2 = rx * rx;
  const ry2 = ry * ry;
  const x1p2 = x1p * x1p;
  const y1p2 = y1p * y1p;
  const sign = largeArcFlag === sweepFlag ? -1 : 1;
  const numerator = rx2 * ry2 - rx2 * y1p2 - ry2 * x1p2;
  const denominator = rx2 * y1p2 + ry2 * x1p2;
  const coefficient = sign * Math.sqrt(Math.max(0, numerator / denominator));
  const cxp = coefficient * ((rx * y1p) / ry);
  const cyp = coefficient * (-(ry * x1p) / rx);
  const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;

  const theta1 = vectorAngle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let deltaTheta = vectorAngle(
    (x1p - cxp) / rx,
    (y1p - cyp) / ry,
    (-x1p - cxp) / rx,
    (-y1p - cyp) / ry,
  );

  if (!sweepFlag && deltaTheta > 0) deltaTheta -= Math.PI * 2;
  if (sweepFlag && deltaTheta < 0) deltaTheta += Math.PI * 2;

  const segments = Math.max(1, Math.ceil(Math.abs(deltaTheta) / (Math.PI / 2)));
  const segmentTheta = deltaTheta / segments;
  const transform = (pointX: number, pointY: number): Point => [
    cx + rx * (cosPhi * pointX - sinPhi * pointY),
    cy + ry * (sinPhi * pointX + cosPhi * pointY),
  ];

  return Array.from({ length: segments }, (_, segment) => {
    const startTheta = theta1 + segment * segmentTheta;
    const endTheta = startTheta + segmentTheta;
    const alpha = (4 / 3) * Math.tan((endTheta - startTheta) / 4);
    const c1 = transform(
      Math.cos(startTheta) - alpha * Math.sin(startTheta),
      Math.sin(startTheta) + alpha * Math.cos(startTheta),
    );
    const c2 = transform(
      Math.cos(endTheta) + alpha * Math.sin(endTheta),
      Math.sin(endTheta) - alpha * Math.cos(endTheta),
    );
    const end = transform(Math.cos(endTheta), Math.sin(endTheta));
    return { c1, c2, end };
  });
}

function parsePathData(d: string, normalizePoint: (x: number, y: number) => Point) {
  const tokens = tokenizePath(d);
  const paths: LottiePath[] = [];
  const warnings: string[] = [];
  let index = 0;
  let command = "";
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  let current = createEmptyPath();
  let lastCubicControl: Point | null = null;
  let lastQuadraticControl: Point | null = null;

  const hasNumber = () => index < tokens.length && !isCommand(tokens[index]);
  const readNumber = () => Number.parseFloat(tokens[index++]);
  const flush = () => {
    if (current.v.length > 1) paths.push(current);
    current = createEmptyPath();
  };
  const moveTo = (nextX: number, nextY: number) => {
    flush();
    x = nextX;
    y = nextY;
    startX = x;
    startY = y;
    addLine(current, normalizePoint(x, y));
  };
  const lineTo = (nextX: number, nextY: number) => {
    x = nextX;
    y = nextY;
    addLine(current, normalizePoint(x, y));
  };

  while (index < tokens.length) {
    if (isCommand(tokens[index])) command = tokens[index++];
    const relative = command === command.toLowerCase();
    const type = command.toUpperCase();

    if (type === "M") {
      if (!hasNumber()) continue;
      moveTo((relative ? x : 0) + readNumber(), (relative ? y : 0) + readNumber());
      while (hasNumber()) lineTo((relative ? x : 0) + readNumber(), (relative ? y : 0) + readNumber());
      command = relative ? "l" : "L";
    } else if (type === "L") {
      while (hasNumber()) lineTo((relative ? x : 0) + readNumber(), (relative ? y : 0) + readNumber());
      lastCubicControl = null;
      lastQuadraticControl = null;
    } else if (type === "H") {
      while (hasNumber()) lineTo((relative ? x : 0) + readNumber(), y);
      lastCubicControl = null;
      lastQuadraticControl = null;
    } else if (type === "V") {
      while (hasNumber()) lineTo(x, (relative ? y : 0) + readNumber());
      lastCubicControl = null;
      lastQuadraticControl = null;
    } else if (type === "C") {
      while (hasNumber()) {
        const c1x = (relative ? x : 0) + readNumber();
        const c1y = (relative ? y : 0) + readNumber();
        const c2x = (relative ? x : 0) + readNumber();
        const c2y = (relative ? y : 0) + readNumber();
        const endX = (relative ? x : 0) + readNumber();
        const endY = (relative ? y : 0) + readNumber();
        addCubic(current, normalizePoint(c1x, c1y), normalizePoint(c2x, c2y), normalizePoint(endX, endY));
        x = endX;
        y = endY;
        lastCubicControl = [c2x, c2y];
        lastQuadraticControl = null;
      }
    } else if (type === "S") {
      while (hasNumber()) {
        const c1x = lastCubicControl ? x * 2 - lastCubicControl[0] : x;
        const c1y = lastCubicControl ? y * 2 - lastCubicControl[1] : y;
        const c2x = (relative ? x : 0) + readNumber();
        const c2y = (relative ? y : 0) + readNumber();
        const endX = (relative ? x : 0) + readNumber();
        const endY = (relative ? y : 0) + readNumber();
        addCubic(current, normalizePoint(c1x, c1y), normalizePoint(c2x, c2y), normalizePoint(endX, endY));
        x = endX;
        y = endY;
        lastCubicControl = [c2x, c2y];
        lastQuadraticControl = null;
      }
    } else if (type === "Q" || type === "T") {
      while (hasNumber()) {
        let qx: number;
        let qy: number;
        if (type === "T") {
          qx = lastQuadraticControl ? x * 2 - lastQuadraticControl[0] : x;
          qy = lastQuadraticControl ? y * 2 - lastQuadraticControl[1] : y;
        } else {
          qx = (relative ? x : 0) + readNumber();
          qy = (relative ? y : 0) + readNumber();
        }
        const endX = (relative ? x : 0) + readNumber();
        const endY = (relative ? y : 0) + readNumber();
        const c1: Point = [x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y)];
        const c2: Point = [endX + (2 / 3) * (qx - endX), endY + (2 / 3) * (qy - endY)];
        addCubic(current, normalizePoint(c1[0], c1[1]), normalizePoint(c2[0], c2[1]), normalizePoint(endX, endY));
        x = endX;
        y = endY;
        lastQuadraticControl = [qx, qy];
        lastCubicControl = null;
      }
    } else if (type === "Z") {
      current.c = true;
      x = startX;
      y = startY;
      lastCubicControl = null;
      lastQuadraticControl = null;
    } else if (type === "A") {
      while (hasNumber()) {
        const rx = readNumber();
        const ry = readNumber();
        const xAxisRotation = readNumber();
        const largeArcFlag = readNumber();
        const sweepFlag = readNumber();
        const endX = (relative ? x : 0) + readNumber();
        const endY = (relative ? y : 0) + readNumber();
        for (const segment of arcToCubics(x, y, rx, ry, xAxisRotation, largeArcFlag, sweepFlag, endX, endY)) {
          addCubic(
            current,
            normalizePoint(segment.c1[0], segment.c1[1]),
            normalizePoint(segment.c2[0], segment.c2[1]),
            normalizePoint(segment.end[0], segment.end[1]),
          );
        }
        x = endX;
        y = endY;
      }
      lastCubicControl = null;
      lastQuadraticControl = null;
    } else {
      warnings.push(`unsupported path command ${command}`);
      break;
    }
  }

  flush();
  return { paths, warnings };
}

function rectPath(x: number, y: number, width: number, height: number, normalizePoint: (x: number, y: number) => Point): LottiePath {
  const path = createEmptyPath(true);
  addLine(path, normalizePoint(x, y));
  addLine(path, normalizePoint(x + width, y));
  addLine(path, normalizePoint(x + width, y + height));
  addLine(path, normalizePoint(x, y + height));
  return path;
}

function ellipsePath(cx: number, cy: number, rx: number, ry: number, normalizePoint: (x: number, y: number) => Point): LottiePath {
  const path = createEmptyPath(true);
  addLine(path, normalizePoint(cx, cy - ry));
  addCubic(
    path,
    normalizePoint(cx + rx * CIRCLE_KAPPA, cy - ry),
    normalizePoint(cx + rx, cy - ry * CIRCLE_KAPPA),
    normalizePoint(cx + rx, cy),
  );
  addCubic(
    path,
    normalizePoint(cx + rx, cy + ry * CIRCLE_KAPPA),
    normalizePoint(cx + rx * CIRCLE_KAPPA, cy + ry),
    normalizePoint(cx, cy + ry),
  );
  addCubic(
    path,
    normalizePoint(cx - rx * CIRCLE_KAPPA, cy + ry),
    normalizePoint(cx - rx, cy + ry * CIRCLE_KAPPA),
    normalizePoint(cx - rx, cy),
  );
  addCubic(
    path,
    normalizePoint(cx - rx, cy - ry * CIRCLE_KAPPA),
    normalizePoint(cx - rx * CIRCLE_KAPPA, cy - ry),
    normalizePoint(cx, cy - ry),
  );
  return path;
}

function pointsPath(points: string, closed: boolean, normalizePoint: (x: number, y: number) => Point): LottiePath | null {
  const values = points
    .trim()
    .split(/[\s,]+/)
    .map((part) => Number.parseFloat(part))
    .filter(Number.isFinite);

  if (values.length < 4) return null;
  const path = createEmptyPath(closed);
  for (let index = 0; index + 1 < values.length; index += 2) {
    addLine(path, normalizePoint(values[index], values[index + 1]));
  }
  return path;
}

function shapeStyleItems(style: SvgStyle) {
  const items: any[] = [];
  const fill = parseColor(style.fill);
  const stroke = parseColor(style.stroke);

  if (fill) {
    items.push({
      ty: "fl",
      c: { a: 0, k: fill.slice(0, 3) },
      o: { a: 0, k: fill[3] * style.opacity * style.fillOpacity * 100 },
      r: 1,
      bm: 0,
      nm: "Fill",
    });
  }

  if (stroke && style.strokeWidth > 0) {
    items.push({
      ty: "st",
      c: { a: 0, k: stroke.slice(0, 3) },
      o: { a: 0, k: stroke[3] * style.opacity * style.strokeOpacity * 100 },
      w: { a: 0, k: style.strokeWidth },
      lc: 2,
      lj: 2,
      ml: 4,
      bm: 0,
      nm: "Stroke",
    });
  }

  return items;
}

function groupForPath(path: LottiePath, style: SvgStyle, name: string) {
  const styleItems = shapeStyleItems(style);
  if (!styleItems.length) return null;

  return {
    ty: "gr",
    nm: name,
    it: [
      {
        ty: "sh",
        ks: { a: 0, k: path },
        nm: `${name} Path`,
        hd: false,
      },
      ...styleItems,
      {
        ty: "tr",
        p: { a: 0, k: [0, 0] },
        a: { a: 0, k: [0, 0] },
        s: { a: 0, k: [100, 100] },
        r: { a: 0, k: 0 },
        o: { a: 0, k: 100 },
        sk: { a: 0, k: 0 },
        sa: { a: 0, k: 0 },
        nm: "Transform",
      },
    ],
    bm: 0,
    hd: false,
  };
}

export function svgToLottie(svg: string) {
  const normalizer = createNormalizer(svg);
  const groups: any[] = [];
  const warnings: string[] = [];
  const classes = parseStyleBlock(svg);
  const definitions = collectShapeDefinitions(svg, classes);
  const stack: Array<{ attrs: Record<string, string>; matrix: Matrix; hidden: boolean }> = [
    { attrs: {}, matrix: identityMatrix(), hidden: false },
  ];
  const tagRe = /<\s*(\/?)(svg|defs|g|use|path|rect|circle|ellipse|line|polyline|polygon)\b([^>]*?)(\/?)>/gi;
  let match: RegExpExecArray | null;

  while ((match = tagRe.exec(svg))) {
    const closing = match[1] === "/";
    let tag = match[2].toLowerCase();
    const rawAttrs = attrsWithClasses(parseAttrs(match[3]), classes);
    const selfClosing = match[4] === "/" || /\/\s*$/.test(match[0]);
    const parent = stack[stack.length - 1];
    let attrs = mergeAttrs(parent.attrs, rawAttrs);
    let matrix = multiplyMatrix(parent.matrix, parseTransform(rawAttrs.transform));
    let hidden =
      parent.hidden ||
      attrs.display === "none" ||
      attrs.visibility === "hidden" ||
      numberAttr(attrs, "opacity", 1) <= 0;

    if (closing) {
      if ((tag === "g" || tag === "svg" || tag === "defs") && stack.length > 1) stack.pop();
      continue;
    }

    if (tag === "g" || tag === "svg" || tag === "defs") {
      if (!selfClosing) stack.push({ attrs, matrix, hidden: hidden || tag === "defs" });
      continue;
    }

    if (tag === "use") {
      const href = rawAttrs.href ?? rawAttrs["xlink:href"];
      const id = href?.startsWith("#") ? href.slice(1) : undefined;
      const definition = id ? definitions[id] : undefined;

      if (!definition) {
        warnings.push(`unsupported use reference ${href ?? ""}`.trim());
        continue;
      }

      tag = definition.tag;
      attrs = mergeAttrs(attrs, definition.attrs);
      matrix = multiplyMatrix(matrix, [1, 0, 0, 1, numberAttr(rawAttrs, "x"), numberAttr(rawAttrs, "y")]);
      hidden =
        parent.hidden ||
        attrs.display === "none" ||
        attrs.visibility === "hidden" ||
        numberAttr(attrs, "opacity", 1) <= 0;
    }

    if (hidden) continue;

    const point = (x: number, y: number) => {
      const transformed = applyMatrix(matrix, x, y);
      return normalizer.point(transformed[0], transformed[1]);
    };
    const style = parseStyle(attrs, normalizer.length);
    const paths: LottiePath[] = [];

    if (tag === "path") {
      const d = attrs.d;
      if (!d) continue;
      const parsed = parsePathData(d, point);
      paths.push(...parsed.paths);
      warnings.push(...parsed.warnings);
    } else if (tag === "rect") {
      paths.push(
        rectPath(
          numberAttr(attrs, "x"),
          numberAttr(attrs, "y"),
          numberAttr(attrs, "width"),
          numberAttr(attrs, "height"),
          point,
        ),
      );
      if (attrs.rx || attrs.ry) warnings.push("rounded rect corners are imported as square corners");
    } else if (tag === "circle") {
      const radius = numberAttr(attrs, "r");
      paths.push(ellipsePath(numberAttr(attrs, "cx"), numberAttr(attrs, "cy"), radius, radius, point));
    } else if (tag === "ellipse") {
      paths.push(
        ellipsePath(
          numberAttr(attrs, "cx"),
          numberAttr(attrs, "cy"),
          numberAttr(attrs, "rx"),
          numberAttr(attrs, "ry"),
          point,
        ),
      );
    } else if (tag === "line") {
      const path = createEmptyPath(false);
      addLine(path, point(numberAttr(attrs, "x1"), numberAttr(attrs, "y1")));
      addLine(path, point(numberAttr(attrs, "x2"), numberAttr(attrs, "y2")));
      paths.push(path);
    } else if (tag === "polyline" || tag === "polygon") {
      const path = pointsPath(attrs.points ?? "", tag === "polygon", point);
      if (path) paths.push(path);
    }

    const hasFill = parseColor(style.fill) !== null;
    if (hasFill) {
      for (const path of paths) {
        path.c = true;
      }
    }

    for (const [index, path] of paths.entries()) {
      const group = groupForPath(path, style, `${tag} ${groups.length + index + 1}`);
      if (group) groups.push(group);
    }
  }

  if (!groups.length) {
    throw new Error("This SVG does not contain supported vector shapes.");
  }

  const lottie = {
    v: "5.7.4",
    fr: FRAME_RATE,
    ip: 0,
    op: OUT_POINT,
    w: CANVAS_SIZE,
    h: CANVAS_SIZE,
    nm: "SVG import",
    ddd: 0,
    assets: [],
    layers: [
      {
        ddd: 0,
        ind: 1,
        ty: 4,
        nm: "SVG shapes",
        sr: 1,
        ks: {
          o: { a: 0, k: 100 },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [0, 0, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: { a: 0, k: [100, 100, 100] },
        },
        ao: 0,
        shapes: groups,
        ip: 0,
        op: OUT_POINT,
        st: 0,
        bm: 0,
      },
    ],
    markers: [],
  };

  return { lottie, warnings };
}

function buildCaption(shapeCount: number, tgsBytes: number, warnings: string[]) {
  const lines = [
    "🧩 Here is your .tgs file",
    `📊 512x512, ${FRAME_RATE}fps, 1.00s, shapes: ${shapeCount}, tgs: ${(tgsBytes / 1024).toFixed(1)}KB`,
    warnings.length ? `⚠️ ${Array.from(new Set(warnings)).slice(0, 4).join(", ")}` : null,
  ].filter(Boolean);

  const caption = lines.join("\n");
  return caption.length > 1024 ? caption.slice(0, 1020) + "..." : caption;
}

function buildBinaryCaption(tgsBytes: number) {
  return [
    "🧩 Here is your .tgs file",
    `📊 512x512, ${FRAME_RATE}fps, tgs: ${(tgsBytes / 1024).toFixed(1)}KB`,
  ].join("\n");
}

async function fileExists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function findOnPath(command: string) {
  for (const dir of (process.env.PATH ?? "").split(delimiter)) {
    if (!dir) continue;
    const candidate = join(dir, command);
    if (await fileExists(candidate)) return candidate;
  }

  return undefined;
}

async function resolveLottieConvertBin() {
  if (process.env.LOTTIE_CONVERT_BIN && (await fileExists(process.env.LOTTIE_CONVERT_BIN))) {
    return process.env.LOTTIE_CONVERT_BIN;
  }

  const pathCommand = await findOnPath("lottie_convert.py");
  if (pathCommand) return pathCommand;

  if (await fileExists(LOCAL_LOTTIE_CONVERT_BIN)) {
    return LOCAL_LOTTIE_CONVERT_BIN;
  }

  throw new Error("No SVG to TGS converter found.");
}

async function convertSvgWithBinary(svg: Buffer) {
  const lottieConvertBin = await resolveLottieConvertBin();

  const dir = await mkdtemp(join(tmpdir(), "sticker2lottie-svg-bin-"));
  const inputPath = join(dir, "input.svg");
  const outputPath = join(dir, "output.tgs");

  try {
    await writeFile(inputPath, svg);
    await execFileAsync(
      lottieConvertBin,
      [
        inputPath,
        outputPath,
        "--sanitize",
        "--fps",
        String(FRAME_RATE),
        "--width",
        String(CANVAS_SIZE),
        "--height",
        String(CANVAS_SIZE),
        "--optimize",
        "2",
      ],
      { timeout: 30_000, maxBuffer: 1024 * 1024 },
    );

    return readFile(outputPath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function replyWithTgsDocument(ctx: Context, tgs: Buffer, caption: string) {
  const dir = await mkdtemp(join(tmpdir(), "sticker2lottie-svg-"));
  const filePath = join(dir, "sticker.tgs");

  try {
    await writeFile(filePath, tgs);
    await ctx.replyWithDocument(new InputFile(filePath), {
      caption,
      disable_content_type_detection: true,
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function svgFileToTgsSticker(ctx: Context, fileId: string) {
  const userId = ctx.from?.id;
  if (!userId) throw new Error("No userId passed.");

  try {
    const file = await ctx.api.getFile(fileId);
    if (!file.file_path) throw new Error("Telegram file_path is empty.");

    const svgBuffer = await downloadAsBuffer(getTelegramFileUrl(file.file_path));
    let tgs: Buffer;
    let caption: string;
    let conversionWarning: string | undefined;

    try {
      tgs = await convertSvgWithBinary(svgBuffer);
      caption = buildBinaryCaption(tgs.byteLength);
    } catch (binaryError) {
      conversionWarning = binaryError instanceof Error ? binaryError.message : "primary SVG converter failed";
      const svg = svgBuffer.toString("utf-8");
      const { lottie, warnings } = svgToLottie(svg);
      const jsonText = JSON.stringify(lottie);
      tgs = gzipSync(Buffer.from(jsonText, "utf-8"), { level: 9 });
      const shapeCount = lottie.layers[0].shapes.length;
      caption = buildCaption(shapeCount, tgs.byteLength, [`primary SVG converter unavailable; used fallback`, ...warnings]);
    }

    const sizeWarnings = tgs.byteLength > 64 * 1024 ? [`compressed size ${(tgs.byteLength / 1024).toFixed(1)}KB; Telegram limit is 64KB`] : [];
    if (sizeWarnings.length) {
      caption = [caption, `⚠️ ${sizeWarnings.join(", ")}`].join("\n");
    }

    if (sizeWarnings.length) {
      await ctx.reply("Telegram may reject this SVG because the generated .tgs is larger than 64KB. I sent it as a file.");
      await replyWithTgsDocument(ctx, tgs, caption);
      logConversion({
        telegramUserId: userId,
        sourceType: "svg",
        targetType: "tgs",
        success: false,
        errorMessage: [conversionWarning, ...sizeWarnings].filter(Boolean).join("; "),
      });
      await sendDonationPrompt(ctx);
      return;
    }

    await ctx.reply(caption);
    try {
      await ctx.replyWithSticker(new InputFile(tgs, "sticker.tgs"));
      logConversion({
        telegramUserId: userId,
        sourceType: "svg",
        targetType: "tgs",
        success: true,
        errorMessage: conversionWarning,
      });
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : "Telegram rejected the sticker upload";
      await ctx.reply(["Telegram rejected this .tgs as a sticker.", "I sent it as a file instead.", `Reason: ${message}`].join("\n"));
      await replyWithTgsDocument(ctx, tgs, caption);
      logConversion({
        telegramUserId: userId,
        sourceType: "svg",
        targetType: "tgs",
        success: false,
        errorMessage: message,
      });
    }

    await sendDonationPrompt(ctx);
  } catch (error) {
    logConversion({
      telegramUserId: userId,
      sourceType: "svg",
      targetType: "tgs",
      success: false,
      errorMessage: error instanceof Error ? error.message : "Unknown processing error",
    });
    throw error;
  }
}
