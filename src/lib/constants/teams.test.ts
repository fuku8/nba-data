import test from "node:test";
import assert from "node:assert/strict";

import { NBA_TEAMS, getTeamColor, contrastRatio, onDarkColor } from "./teams.ts";

const BG = "#0a0a0a";

test("getTeamColor: 全30チームが暗背景に対して 3:1 以上", () => {
  const abbrs = Object.keys(NBA_TEAMS);
  assert.equal(abbrs.length, 30);
  for (const abbr of abbrs) {
    const cr = contrastRatio(getTeamColor(abbr), BG);
    assert.ok(cr >= 3, `${abbr} ${getTeamColor(abbr)} は ${cr.toFixed(2)}:1`);
  }
});

test("getTeamColor: もともと 3:1 以上のチームは primary のまま", () => {
  for (const [abbr, t] of Object.entries(NBA_TEAMS)) {
    if (contrastRatio(t.primaryColor, BG) >= 3) assert.equal(getTeamColor(abbr), t.primaryColor, abbr);
  }
});

test("onDarkColor: secondary で救えるチームは secondary（DEN=黄・PHX=橙・BKN=白）", () => {
  assert.equal(getTeamColor("DEN"), NBA_TEAMS.DEN.secondaryColor);
  assert.equal(getTeamColor("PHX"), NBA_TEAMS.PHX.secondaryColor);
  assert.equal(getTeamColor("BKN"), NBA_TEAMS.BKN.secondaryColor);
  assert.equal(getTeamColor("MIN"), NBA_TEAMS.MIN.secondaryColor);
});

test("onDarkColor: 両方NG（UTA・CLE・DAL）は primary を明るくした色で、3:1 に達する最小明度", () => {
  for (const abbr of ["UTA", "CLE", "DAL"]) {
    const t = NBA_TEAMS[abbr];
    const c = getTeamColor(abbr);
    assert.notEqual(c, t.primaryColor);
    assert.notEqual(c, t.secondaryColor);
    assert.ok(contrastRatio(c, BG) >= 3 && contrastRatio(c, BG) < 3.6, `${abbr} ${c} ${contrastRatio(c, BG).toFixed(2)}`);
  }
  assert.equal(onDarkColor("#ffffff", "#000000"), "#ffffff");
  assert.equal(contrastRatio("#000000", "#ffffff").toFixed(0), "21");
});

test("getTeamColor: 不明な略称はフォールバック", () => {
  assert.equal(getTeamColor("XXX"), "#666666");
});
