import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";

import { pastSeasonOf, playerHref, seasonPath } from "./season-path.ts";
import { allSeasons, seasonDir } from "./season.ts";

test("seasonPath / playerHref: 今季は季を付けず、過去季だけ付ける", () => {
  assert.equal(seasonPath("/leaders/po"), "/leaders/po");
  assert.equal(seasonPath("/leaders/po", "2025-26"), "/leaders/po/2025-26");
  assert.equal(playerHref(203999), "/players/203999");
  assert.equal(playerHref(203999, "2025-26"), "/players/203999#2025-26");
});

test("pastSeasonOf: パスに過去季があればその季、今季と季に依らないページは undefined", () => {
  const cur = "2026-27";
  assert.equal(pastSeasonOf("/standings/2025-26", cur), "2025-26");
  assert.equal(pastSeasonOf("/leaders/po/2025-26", cur), "2025-26");
  assert.equal(pastSeasonOf("/playoffs/2025-26/NYK-SAS", cur), "2025-26");
  assert.equal(pastSeasonOf("/games/0042500101", cur), "2025-26");
  for (const p of ["/", "/standings", "/leaders/po", "/playoffs/NYK-SAS", "/players/203999", "/games/po", "/games/0042600101", "/standings/2026-27"]) {
    assert.equal(pastSeasonOf(p, cur), undefined, p);
  }
  // 繰越前（2025-26 が今季）は PO のボックススコアも今季扱い
  assert.equal(pastSeasonOf("/games/0042500101", "2025-26"), undefined);
});

test("pastSeasonOf: 保存済みボックススコアの gameId から、置いてある季が求まる", () => {
  for (const season of allSeasons()) {
    const dir = path.join(seasonDir(season), "boxscores");
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
      assert.equal(pastSeasonOf(`/games/${f.replace(/\.json$/, "")}`, "0000-00"), season, f);
    }
  }
});
