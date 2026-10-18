import assert from "node:assert/strict";
import test from "node:test";
import {
  inlineSvgClassStyles,
  svgToLottie,
} from "../dist/logic/svgFileToTgsSticker.js";

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <style>
      .cls-1 { fill: #011839; }
      .cls-2 { fill: #7738c8; }
    </style>
  </defs>
  <path class="cls-1" d="M0 0H50V100H0Z"/>
  <path class="cls-2" d="M50 0H100V100H50Z"/>
</svg>`;

function paintItems(lottie) {
  return lottie.layers[0].shapes.flatMap((group) =>
    group.it.filter((item) => item.ty === "fl" || item.ty === "st"),
  );
}

test("inlines class-based SVG colors for the primary converter", () => {
  const inlined = inlineSvgClassStyles(svg);

  assert.match(inlined, /class="cls-1"[^>]*fill="#011839"/);
  assert.match(inlined, /class="cls-2"[^>]*fill="#7738c8"/);
});

test("fallback SVG conversion preserves class colors without black strokes", () => {
  const { lottie, warnings } = svgToLottie(svg);
  const paint = paintItems(lottie);

  assert.deepEqual(warnings, []);
  assert.equal(
    paint.some((item) => item.ty === "st"),
    false,
  );
  assert.deepEqual(
    paint.map((item) => item.c.k),
    [
      [1 / 255, 24 / 255, 57 / 255],
      [119 / 255, 56 / 255, 200 / 255],
    ],
  );
});

test("keeps SVG default fill black when fill is omitted", () => {
  const { lottie } = svgToLottie(
    '<svg viewBox="0 0 10 10"><path d="M0 0H10V10H0Z"/></svg>',
  );
  const paint = paintItems(lottie);

  assert.equal(paint.length, 1);
  assert.equal(paint[0].ty, "fl");
  assert.deepEqual(paint[0].c.k, [0, 0, 0]);
});
