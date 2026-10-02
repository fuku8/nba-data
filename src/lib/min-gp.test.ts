import test from "node:test";
import assert from "node:assert/strict";
import { earlyMinGp, earlyCompareMinGp, compareListMinGp, rsMinGp, MIN_GP } from "./data/min-gp.ts";

test("earlyMinGp: リーグ最多GPの半分を 5〜20 に収める", () => {
  assert.equal(earlyMinGp(0), 5);   // 開幕前・空データ
  assert.equal(earlyMinGp(8), 5);   // 半分が5未満なら5
  assert.equal(earlyMinGp(12), 6);
  assert.equal(earlyMinGp(39), 20); // 四捨五入で20に届く
  assert.equal(earlyMinGp(82), 20); // シーズン終盤は固定値
});

test("rsMinGp: 過去季は固定の MIN_GP", () => {
  assert.equal(rsMinGp("1999-00"), MIN_GP);
});

test("earlyCompareMinGp: 誰も5試合に届かない間は1、以後は母集団の下限（上限10）", () => {
  assert.equal(earlyCompareMinGp(0), 1);  // 開幕前・空データ
  assert.equal(earlyCompareMinGp(1), 1);  // 開幕初日
  assert.equal(earlyCompareMinGp(4), 1);
  assert.equal(earlyCompareMinGp(5), 5);  // 最初のチームが5試合に届いた日
  assert.equal(earlyCompareMinGp(12), 6);
  assert.equal(earlyCompareMinGp(20), 10);
  assert.equal(earlyCompareMinGp(82), 10);
});

test("compareListMinGp: 過去季は 10", () => {
  assert.equal(compareListMinGp("1999-00"), 10);
});
