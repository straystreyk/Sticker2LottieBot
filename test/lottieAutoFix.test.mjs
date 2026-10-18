import assert from "node:assert/strict";
import test from "node:test";
import {
  autoFixLottieJson,
  normalizeTelegramPositionEasing,
} from "../dist/logic/lottieAutoFix.js";

function autoFix(json) {
  const result = autoFixLottieJson(JSON.stringify(json));
  return { ...result, json: JSON.parse(result.jsonText) };
}

test("retimes the full animation instead of cutting off frames", () => {
  const { json, changes } = autoFix({
    v: "5.7.4",
    w: 512,
    h: 512,
    fr: 60,
    ip: 0,
    op: 360,
    markers: [{ tm: 120, dr: 60 }],
    layers: [
      {
        ind: 1,
        ty: 4,
        ip: 0,
        op: 360,
        st: 0,
        ks: {
          p: {
            a: 1,
            k: [
              { t: 0, s: [0, 0], e: [100, 100] },
              { t: 180, s: [100, 100], e: [200, 200] },
              { t: 360 },
            ],
          },
        },
      },
    ],
    assets: [
      {
        id: "nested",
        layers: [
          {
            ind: 1,
            ty: 4,
            ip: 0,
            op: 360,
            st: 0,
            ks: {
              o: {
                a: 1,
                k: [{ t: 0, s: [0], e: [100] }, { t: 360 }],
              },
            },
          },
        ],
      },
    ],
  });

  assert.equal(json.op, 180);
  assert.equal(json.layers[0].op, 180);
  assert.deepEqual(
    json.layers[0].ks.p.k.map((keyframe) => keyframe.t),
    [0, 90, 180],
  );
  assert.equal(json.assets[0].layers[0].op, 180);
  assert.deepEqual(
    json.assets[0].layers[0].ks.o.k.map((keyframe) => keyframe.t),
    [0, 180],
  );
  assert.deepEqual(json.markers[0], { tm: 60, dr: 30 });
  assert.ok(changes.some((change) => change.includes("retimed")));
});

test("rescales terminal keyframes when reducing frame rate", () => {
  const { json } = autoFix({
    v: "5.7.4",
    w: 512,
    h: 512,
    fr: 120,
    ip: 0,
    op: 240,
    layers: [
      {
        ind: 1,
        ty: 4,
        ip: 0,
        op: 240,
        st: 0,
        ks: {
          r: {
            a: 1,
            k: [{ t: 0, s: [0], e: [360] }, { t: 240 }],
          },
        },
      },
    ],
  });

  assert.equal(json.fr, 60);
  assert.equal(json.op, 120);
  assert.deepEqual(
    json.layers[0].ks.r.k.map((keyframe) => keyframe.t),
    [0, 120],
  );
});

test("converts low frame rates to Telegram's required 60fps without changing duration", () => {
  const { json, changes } = autoFix({
    v: "5.7.4",
    w: 512,
    h: 512,
    fr: 30,
    ip: 0,
    op: 90,
    layers: [
      {
        ind: 1,
        ty: 4,
        ip: 0,
        op: 90,
        st: 0,
        ks: {
          r: {
            a: 1,
            k: [{ t: 0, s: [0], e: [360] }, { t: 90 }],
          },
        },
      },
    ],
  });

  assert.equal(json.fr, 60);
  assert.equal(json.op, 180);
  assert.equal((json.op - json.ip) / json.fr, 3);
  assert.deepEqual(
    json.layers[0].ks.r.k.map((keyframe) => keyframe.t),
    [0, 180],
  );
  assert.ok(changes.includes("fps 30 → 60"));
});

test("adds scaling to a root layer whose transform was empty", () => {
  const { json } = autoFix({
    v: "5.7.4",
    w: 4000,
    h: 4000,
    fr: 60,
    ip: 0,
    op: 60,
    layers: [
      { ind: 1, ty: 3, ks: {} },
      { ind: 2, parent: 1, ty: 4, ks: {} },
    ],
  });

  assert.equal(json.w, 512);
  assert.equal(json.h, 512);
  assert.deepEqual(json.layers[0].ks.s.k, [12.8, 12.8, 100]);
  assert.deepEqual(json.layers[1].ks, {});
});

test("splits position axes when Telegram would reuse the X-axis easing", () => {
  const json = {
    layers: [
      {
        ind: 42,
        ks: {
          p: {
            a: 1,
            k: [
              {
                t: 0,
                s: [618, 47],
                i: { x: [0.624, 0.711], y: [0.204, 0.387] },
                o: { x: [0.275, 0.378], y: [0, 0] },
              },
              { t: 30, s: [620, -29], h: 1 },
            ],
          },
        },
      },
    ],
  };

  assert.equal(normalizeTelegramPositionEasing(json), 1);
  const position = json.layers[0].ks.p;
  assert.equal(position.s, true);
  assert.equal(position.a, undefined);
  assert.equal(position.k, undefined);
  assert.deepEqual(position.x.k[0], {
    t: 0,
    s: [618],
    i: { x: 0.624, y: 0.204 },
    o: { x: 0.275, y: 0 },
  });
  assert.deepEqual(position.y.k[0], {
    t: 0,
    s: [47],
    i: { x: 0.711, y: 0.387 },
    o: { x: 0.378, y: 0 },
  });
  assert.deepEqual(position.y.k[1], { t: 30, s: [-29], h: 1 });
  assert.equal(normalizeTelegramPositionEasing(json), 0);
});

test("normalizes position easing inside precomposition assets", () => {
  const position = {
    a: 1,
    k: [
      {
        t: 0,
        s: [0, 100],
        i: { x: [1, 0], y: [1, 1] },
        o: { x: [0, 0.5], y: [0, 0] },
      },
      { t: 60, s: [0, 200], h: 1 },
    ],
  };
  const json = { layers: [], assets: [{ layers: [{ ks: { p: position } }] }] };

  assert.equal(normalizeTelegramPositionEasing(json), 1);
  assert.equal(position.s, true);
  assert.equal(position.y.k[0].o.x, 0.5);
});

test("keeps spatial position paths intact instead of dropping their tangents", () => {
  const position = {
    a: 1,
    k: [
      {
        t: 0,
        s: [0, 0],
        i: { x: [1, 0], y: [1, 1] },
        o: { x: [0, 0.5], y: [0, 0] },
        to: [10, 20],
      },
      { t: 60, s: [100, 100], ti: [-10, -20] },
    ],
  };
  const json = { layers: [{ ks: { p: position } }] };

  assert.equal(normalizeTelegramPositionEasing(json), 0);
  assert.equal(position.s, undefined);
  assert.deepEqual(position.k[0].to, [10, 20]);
});

test("scales standard separated position dimensions", () => {
  const { json } = autoFix({
    v: "5.7.4",
    w: 1000,
    h: 500,
    fr: 60,
    ip: 0,
    op: 60,
    layers: [
      {
        ind: 1,
        ks: {
          p: {
            s: true,
            x: { a: 0, k: 100 },
            y: { a: 0, k: 200 },
          },
        },
      },
    ],
  });

  assert.equal(json.layers[0].ks.p.x.k, 51.2);
  assert.equal(json.layers[0].ks.p.y.k, 230.4);
});
