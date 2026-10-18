function scaleTranslateValues(
  values: number[],
  scale: number,
  offsetX: number,
  offsetY: number,
) {
  return [
    (values[0] ?? 0) * scale + offsetX,
    (values[1] ?? 0) * scale + offsetY,
    ...values.slice(2),
  ];
}

function scaleValues(values: number[], scale: number) {
  return [
    (values[0] ?? 0) * scale,
    (values[1] ?? 0) * scale,
    ...values.slice(2),
  ];
}

function isSplitDimensionProperty(property: any) {
  return (
    !!property &&
    ((property.s === true && property.x && property.y) ||
      (typeof property.k === "object" &&
        property.k !== null &&
        !Array.isArray(property.k)))
  );
}

function scaleSplitDimensionComponent(
  property: any,
  axis: "x" | "y",
  transform: (v: number) => number,
) {
  if (!property || typeof property !== "object") return;
  const component = property[axis] ?? property.k?.[axis];
  if (!component || typeof component !== "object") return;

  if (typeof component.k === "number") {
    component.k = transform(component.k);
    return;
  }
  if (Array.isArray(component.k)) {
    for (const keyframe of component.k) {
      if (!keyframe || typeof keyframe !== "object") continue;
      if (Array.isArray(keyframe.s))
        keyframe.s = [transform(keyframe.s[0] ?? 0)];
      if (Array.isArray(keyframe.e))
        keyframe.e = [transform(keyframe.e[0] ?? 0)];
    }
  }
}

function componentAt(value: unknown, axis: number): number | undefined {
  if (typeof value === "number") return value;
  if (!Array.isArray(value)) return undefined;
  const component = value[axis] ?? value[0];
  return typeof component === "number" ? component : undefined;
}

function handleHasDifferentAxisCurves(handle: any): boolean {
  if (!handle || typeof handle !== "object") return false;
  const x = Array.isArray(handle.x) ? handle.x : [handle.x];
  const y = Array.isArray(handle.y) ? handle.y : [handle.y];
  const dimensions = Math.max(x.length, y.length);

  for (let axis = 1; axis < dimensions; axis += 1) {
    if ((x[axis] ?? x[0]) !== x[0] || (y[axis] ?? y[0]) !== y[0]) {
      return true;
    }
  }
  return false;
}

function scalarEasingHandle(handle: any, axis: number) {
  if (!handle || typeof handle !== "object") return undefined;
  const x = componentAt(handle.x, axis);
  const y = componentAt(handle.y, axis);
  if (x === undefined || y === undefined) return undefined;
  return { x, y };
}

function scalarPositionKeyframe(keyframe: any, axis: number) {
  const scalar: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(keyframe)) {
    if (["s", "e", "i", "o", "to", "ti"].includes(key)) continue;
    scalar[key] = value;
  }

  const start = componentAt(keyframe.s, axis);
  const end = componentAt(keyframe.e, axis);
  const incoming = scalarEasingHandle(keyframe.i, axis);
  const outgoing = scalarEasingHandle(keyframe.o, axis);
  if (start !== undefined) scalar.s = [start];
  if (end !== undefined) scalar.e = [end];
  if (incoming) scalar.i = incoming;
  if (outgoing) scalar.o = outgoing;

  return scalar;
}

function splitTelegramIncompatiblePosition(property: any): boolean {
  if (
    !property ||
    property.a !== 1 ||
    !Array.isArray(property.k) ||
    property.k.length === 0 ||
    property.k.some((keyframe: any) => keyframe?.to || keyframe?.ti) ||
    !property.k.some(
      (keyframe: any) =>
        handleHasDifferentAxisCurves(keyframe?.i) ||
        handleHasDifferentAxisCurves(keyframe?.o),
    )
  ) {
    return false;
  }

  const dimensions = Math.max(
    ...property.k.map((keyframe: any) =>
      Math.max(
        Array.isArray(keyframe?.s) ? keyframe.s.length : 0,
        Array.isArray(keyframe?.e) ? keyframe.e.length : 0,
      ),
    ),
  );
  if (dimensions < 2) return false;

  const keyframes = property.k;
  const preserved = Object.fromEntries(
    Object.entries(property).filter(([key]) => key !== "a" && key !== "k"),
  );
  const split: Record<string, unknown> = {
    ...preserved,
    s: true,
    x: {
      a: 1,
      k: keyframes.map((keyframe: any) => scalarPositionKeyframe(keyframe, 0)),
    },
    y: {
      a: 1,
      k: keyframes.map((keyframe: any) => scalarPositionKeyframe(keyframe, 1)),
    },
  };
  if (dimensions >= 3) {
    split.z = {
      a: 1,
      k: keyframes.map((keyframe: any) => scalarPositionKeyframe(keyframe, 2)),
    };
  }

  for (const key of Object.keys(property)) delete property[key];
  Object.assign(property, split);
  return true;
}

/**
 * Jitter can export one position property with a separate temporal curve for
 * every axis. Telegram's renderer applies the first curve to every axis.
 * Splitting the property into scalar X/Y tracks preserves both original curves.
 */
export function normalizeTelegramPositionEasing(json: any): number {
  let normalized = 0;
  const normalizeLayers = (layers: any) => {
    if (!Array.isArray(layers)) return;
    for (const layer of layers) {
      if (splitTelegramIncompatiblePosition(layer?.ks?.p)) normalized += 1;
    }
  };

  normalizeLayers(json?.layers);
  for (const asset of Array.isArray(json?.assets) ? json.assets : []) {
    normalizeLayers(asset?.layers);
  }
  return normalized;
}

function scaleSpatialTangents(property: any, scale: number) {
  if (!property || !Array.isArray(property.k)) return;
  for (const keyframe of property.k) {
    if (!keyframe || typeof keyframe !== "object") continue;
    for (const tangentKey of ["to", "ti"] as const) {
      const tangent = keyframe[tangentKey];
      if (
        Array.isArray(tangent) &&
        tangent.every((x: unknown) => typeof x === "number")
      ) {
        keyframe[tangentKey] = tangent.map((x: number) => x * scale);
      }
    }
  }
}

function transformVectorProperty(
  property: any,
  transform: (value: number[], kind: "start" | "end") => number[],
) {
  if (!property || !Array.isArray(property.k)) return;
  if (property.k.every((item: unknown) => typeof item === "number")) {
    property.k = transform(property.k, "start");
    return;
  }

  for (const keyframe of property.k) {
    if (!keyframe || typeof keyframe !== "object") continue;
    if (Array.isArray(keyframe.s)) keyframe.s = transform(keyframe.s, "start");
    if (Array.isArray(keyframe.e)) keyframe.e = transform(keyframe.e, "end");
  }
}

function scaleKeyframeTimes(value: any, factor: number) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) scaleKeyframeTimes(item, factor);
    return;
  }

  if (Array.isArray(value.k)) {
    for (const keyframe of value.k) {
      if (
        keyframe &&
        typeof keyframe === "object" &&
        typeof keyframe.t === "number"
      ) {
        keyframe.t *= factor;
      }
    }
  }

  for (const child of Object.values(value)) scaleKeyframeTimes(child, factor);
}

function scaleLayerTimes(layers: any, factor: number) {
  if (!Array.isArray(layers)) return;
  for (const layer of layers) {
    if (!layer || typeof layer !== "object") continue;
    if (typeof layer.ip === "number") layer.ip *= factor;
    if (typeof layer.op === "number") layer.op *= factor;
    if (typeof layer.st === "number") layer.st *= factor;
  }
  scaleKeyframeTimes(layers, factor);
}

function scaleAnimationTimeline(json: any, factor: number) {
  if (typeof json.ip === "number") json.ip *= factor;
  if (typeof json.op === "number") json.op *= factor;

  scaleLayerTimes(json.layers, factor);
  for (const asset of Array.isArray(json.assets) ? json.assets : []) {
    scaleLayerTimes(asset?.layers, factor);
  }

  for (const marker of Array.isArray(json.markers) ? json.markers : []) {
    if (typeof marker?.tm === "number") marker.tm *= factor;
    if (typeof marker?.dr === "number") marker.dr *= factor;
  }
}

export function autoFixLottieJson(jsonText: string) {
  const json = JSON.parse(jsonText);
  const changes: string[] = [];

  const width = typeof json.w === "number" && json.w > 0 ? json.w : 512;
  const height = typeof json.h === "number" && json.h > 0 ? json.h : 512;
  if (width !== 512 || height !== 512) {
    const scale = 512 / Math.max(width, height);
    const offsetX = (512 - width * scale) / 2;
    const offsetY = (512 - height * scale) / 2;

    for (const layer of Array.isArray(json.layers) ? json.layers : []) {
      if (layer?.parent != null) continue;
      const ks = layer?.ks ?? (layer.ks = {});

      if (isSplitDimensionProperty(ks.p)) {
        scaleSplitDimensionComponent(ks.p, "x", (v) => v * scale + offsetX);
        scaleSplitDimensionComponent(ks.p, "y", (v) => v * scale + offsetY);
      } else if (ks.p && Array.isArray(ks.p.k)) {
        transformVectorProperty(ks.p, (values) =>
          scaleTranslateValues(values, scale, offsetX, offsetY),
        );
        scaleSpatialTangents(ks.p, scale);
      } else if (offsetX !== 0 || offsetY !== 0) {
        ks.p = { a: 0, k: [offsetX, offsetY, 0] };
      }

      if (isSplitDimensionProperty(ks.s)) {
        scaleSplitDimensionComponent(ks.s, "x", (v) => v * scale);
        scaleSplitDimensionComponent(ks.s, "y", (v) => v * scale);
      } else if (ks.s && Array.isArray(ks.s.k)) {
        transformVectorProperty(ks.s, (values) => scaleValues(values, scale));
      } else {
        ks.s = { a: 0, k: [100 * scale, 100 * scale, 100] };
      }
    }
    json.w = 512;
    json.h = 512;
    changes.push(`canvas ${width}x${height} → 512x512 (proportional fit)`);
  }

  if (typeof json.fr === "number" && json.fr > 0 && json.fr !== 60) {
    const previousFrameRate = json.fr;
    scaleAnimationTimeline(json, 60 / previousFrameRate);
    json.fr = 60;
    changes.push(`fps ${previousFrameRate} → 60`);
  }

  if (
    typeof json.fr === "number" &&
    json.fr > 0 &&
    typeof json.ip === "number" &&
    typeof json.op === "number" &&
    (json.op - json.ip) / json.fr > 3
  ) {
    const duration = (json.op - json.ip) / json.fr;
    scaleAnimationTimeline(json, 3 / duration);
    changes.push(`duration ${duration.toFixed(2)}s → 3s (retimed)`);
  }

  const normalizedPositionTracks = normalizeTelegramPositionEasing(json);
  if (normalizedPositionTracks > 0) {
    changes.push(
      `position easing → Telegram-compatible X/Y tracks (${normalizedPositionTracks})`,
    );
  }

  return { jsonText: JSON.stringify(json), changes };
}
