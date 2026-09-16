import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, csvToObjects } from "./data/csv-utils.ts";

// 回帰: 書き手（pandas/csv.writer）が合法にクォートした改行入りフィールドは1レコードのまま
// （旧実装は行分割が先で、1フィールドからレコードが捏造された）
test("クォート内の改行は行を分割しない", () => {
  const csv = 'PLAYER_ID,PLAYER_NAME,PTS\n9999,"Evil\n8888,Fake Player,99.9",10.0\n';
  const rows = parseCsv(csv);
  assert.equal(rows.length, 2); // ヘッダー + 1レコード
  assert.equal(rows[1][1], "Evil\n8888,Fake Player,99.9");
  const objs = csvToObjects(rows);
  assert.equal(objs.length, 1);
  assert.equal(objs[0]["PTS"], "10.0");
});

test('エスケープされた "" は文字として復元される', () => {
  const rows = parseCsv('A,B\n"He said ""hi""",2\n');
  assert.equal(rows[1][0], 'He said "hi"');
  assert.equal(rows[1][1], "2");
});

test("クォート内のカンマで列がずれない（GAME_DATE列の位置固定）", () => {
  const csv = 'GAME_ID,GAME_DATE\n"00225,X",2026-04-12\n';
  const rows = parseCsv(csv);
  const dateIdx = rows[0].indexOf("GAME_DATE");
  assert.equal(rows[rows.length - 1][dateIdx], "2026-04-12");
});

test("CRLFと末尾空行を許容する", () => {
  const rows = parseCsv("A,B\r\n1,2\r\n");
  assert.deepEqual(rows, [["A", "B"], ["1", "2"]]);
});
