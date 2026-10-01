import test from "node:test";
import assert from "node:assert/strict";
import { earlyMinGp, rsMinGp, MIN_GP } from "./data/min-gp.ts";

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
