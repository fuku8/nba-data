import test from "node:test";
import assert from "node:assert/strict";

import { bestIndexes, diffFavors, formatDiff } from "./compare-diff.ts";

test("bestIndexes: highは最大値、lowは最小値のインデックスを返す", () => {
  assert.deepEqual(bestIndexes([28.4, 21.2, 25.1], "high"), [0]);
  assert.deepEqual(bestIndexes([112.1, 108.5, 110.9], "low"), [1]);
});

test("bestIndexes: 同値タイは全インデックス、nullは無視する", () => {
  assert.deepEqual(bestIndexes([10, null, 10, 4], "high"), [0, 2]);
});

test("bestIndexes: 有効値が1つ以下なら空配列（1人だけの表に優劣はない）", () => {
  assert.deepEqual(bestIndexes([5, null, null], "high"), []);
  assert.deepEqual(bestIndexes([null, null], "low"), []);
});

test("formatDiff: 符号付き整形とnull・ゼロの扱い", () => {
  assert.equal(formatDiff(28.4, 25.1, 1), "+3.3");
  assert.equal(formatDiff(2, 5, 0), "-3");
  assert.equal(formatDiff(0.3, 0.3, 1), "±0.0");
  assert.equal(formatDiff(null, 1, 0), "-");
});

test("diffFavors: 向きに応じてどちらに有利かを返す", () => {
  assert.equal(diffFavors(28.4, 25.1, "high"), 0);
  assert.equal(diffFavors(112.1, 108.5, "low"), 1);
  assert.equal(diffFavors(3, 3, "high"), null);
  assert.equal(diffFavors(null, 3, "high"), null);
});
