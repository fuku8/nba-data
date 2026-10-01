# シーズン繰越（ロールオーバー）手順

作成日: 2026-09-02
対象: `scripts/rollover.sh`, `data/season.txt`, `data/<season>/`, `scripts/local-update.sh`（launchd 日次取得）
背景と設計判断は `plan.md` §12（Phase 0・§12-11）。ここは手順だけを書く。

---

## いつやるか

**新シーズン開幕戦の終了後、同じ日の 16:00（日次取得）より前。** 2026-27 は日本時間 2026-10-21（2026-10-01 ふくたろう決定。それまでの「開幕の前日〜当日」を変更）。開幕戦の後に繰り越せば、同じ日の 16:00 の取得で初日のデータが入り、下記の空表の期間がほぼ生じない。早くやるほど損をする。

- NBA API は開幕前の新シーズンを問い合わせると選手スタッツ・試合が 0 行で返る（順位表だけ 30 チーム 0-0）。2026-09-02 に `LeagueDashPlayerStats` / `LeagueGameFinder` の 2026-27 で実測。
- 繰越の翌日 16:00 の日次取得で RS の CSV がヘッダーのみに上書きされ、開幕まで RS 各ページ（トップ・選手一覧・リーダーズ・チーム）は「<新季> Regular Season」見出しのまま空表になる。「開幕前」表示があるのは PO ページ（`/playoffs`・`/*/po`）だけ。
- 選手ページは1人1ページ（`/players/<id>`・過去季はページ内のタブ）なので、繰越後も全選手のページが残る（2026-10-01 変更。それまでは現季に成績が無い選手の `/players/<id>` が 404 になり、`/players/<id>/<旧季>` だけが残る作りだった）。
- 一方、繰越を遅らせて失うものは無い。日次取得は旧季を取り続けるだけで、確定済みの値は AGE（誕生日）と hustle の丸め以外は動かない。

開幕日は毎年変わるので NBA 公式の schedule で確認する（例年 10 月下旬）。

## 前提

- `data/<旧季>/` にスナップショットがある（2025-26 は `dd37490` で保存済み）。無ければ `mkdir data/<旧季> && cp -R data/*.csv data/shots data/boxscores data/<旧季>/`
- launchd の日次取得（`com.nba-data.update`・毎日 16:00）がロードされている: `launchctl list | grep nba-data`
- 作業ツリーがクリーン（`git status`）

## 手順

`rollover.sh` は「スナップショットと `data/` 直下の差分ゼロ」を機械確認し、差分があれば中断する。手作業で消して回らず、必ずスクリプトを通す。

```bash
cd ~/nba-data

# 1. スナップショットとの差分を見る
for f in data/*.csv; do cmp -s "$f" "data/2025-26/$(basename "$f")" || echo "DIFF: $f"; done
diff -rq data/shots data/2025-26/shots && diff -rq data/boxscores data/2025-26/boxscores

# 2. 差分があれば揃える。日次取得で AGE と hustle の小数桁、日曜の取得で shots の並び順が動くだけなので、
#    確定時点の値（スナップショット）を正とし、直下をスナップショットで戻す。
#    16:00 の日次取得が走ると再びずれるので、2〜5 は同じ日の 16:00 前に終える。
#    player_names_ja.csv・team_names_ja.csv・player_teams.csv（名簿＝現在の所属）はスナップショットに無い
#    （季に依らず data/ 直下だけに置く）。rollover.sh はこの3つを比較しない。
#    player_teams.csv は繰越後の最初の日次取得で新季の名簿に入れ替わる。
cp data/2025-26/*.csv data/
cp data/2025-26/shots/*.json data/shots/

# 3. 繰越（確認プロンプトで y）
scripts/rollover.sh 2025-26 2026-27

# 4. ビルド検証（静的エクスポート。落ちる場合は下の「既知の落とし穴」）
npm run build

# 5. コミット・push（データ更新コミットとは分ける）
git add data/ && git commit -m "data: rollover 2025-26 -> 2026-27"
git push origin main   # SSH が使えない環境では HTTPS URL を明示
# push は 16:00 の日次取得に任せてもよい（local-update.sh が未 push のコミットごと push する）。
# 先に push すると、16:00 まで「新季の見出し＋旧季の値」で公開される
```

### 4 のビルドで確認すること

| 確認項目 | 期待 |
|---|---|
| `out/playoffs.html` | 「プレーオフ開幕前」 |
| `out/index.html` | 見出しが「2026-27 Regular Season」 |
| `out/players/203999.html` | 今季未出場の選手でもページがあり、2025-26 の RS が上・PO が下で出る |
| 今季出場のある選手の `out/players/<id>.html` | Stats 表は今季の行＋「過去シーズン」の畳み、図表は季のタブ（既定は今季） |
| `out/playoffs/NYK-SAS.html` | 過去季（2025-26）のシリーズ詳細が残っている |
| `out/games/0042500101.html` | 過去季（2025-26 PO）のボックススコアが残っている |
| `out/og/players/` | 選手 OG 画像が1人1枚（582 件以上） |

### 翌日以降に確認すること

- `logs/update.log`（16:00 実行後）: RS 取得が 0 選手で「✓」になっていること。PO 取得（`po_player_per_game`）が毎日「✗」で落ちる場合は例外の扱いを見直す（`plan.md` §12 Phase 0 の未確認事項）。hustle は失敗時に自動で HEAD に戻るので「hustle failed -> revert」は正常。
- Cloudflare Pages のビルドが通っていること（GitHub `main` の push 後）。
- 開幕後の初回取得で `player_per_game.csv` に行が入り、`MIN_GP` の下限（`plan.md` §12「序盤のGP下限」）で League Percentile が出ること。

## 開幕後: 選手プロフィールと日本語名の更新

**繰越の当日ではなく、開幕後の初回取得で `player_per_game.csv` に新季の選手が入ってから行う**（2026-10-01 ふくたろう指示）。繰越直後は新季の名簿が空で、ルーキー・新加入の選手がまだ居ないため、そこで回しても何も増えない。新しい選手の追加と、前季から暫定のままの表記の見直しを一度に済ませる。

```bash
cd ~/nba-data

# 1. 新しい選手のプロフィールを追加（日次取得には入っていない。1回50件なので「未取得 0」になるまで繰り返す）
python3 scripts/fetch-player-profiles.py --dry-run   # 未取得の件数を見る
python3 scripts/fetch-player-profiles.py

# 2. 暫定表記を引き直したい選手は、data/player_names_ja.csv の NAME_JA を空にする
#    （SOURCE を空にするだけでは引き直されない。スクリプトは NAME_JA が入っていて
#     SOURCE が wikipedia-ja 以外の行をそのまま保つ）

# 3. 日本語名の対応表を更新（Wikipedia 日本語版。無い選手は NAME_JA 空＝英語名で表示。plan §13-1）
python3 scripts/fetch-player-names-ja.py

# 4. ビルド → コミット・push（データ更新コミットとは分ける）
npm run build
```

- 対応表の対象は `player_profiles.csv` に居る選手。このファイルは累積で、繰越でも消さないので、リーグを去った選手の日本語名は残る（過去季ページで使う）。
- 3 のあと NAME_JA が空の選手は英語名で表示される。音写を入れるなら SOURCE を「暫定」にして手で書く。
- シーズン中に契約した選手（two-way など）も日次取得ではプロフィール・日本語名が入らない。気づいたら同じ手順を回す。

## 既知の落とし穴（静的エクスポート）

繰越後の状態を模擬してビルドしたとき、以下の 2 件でビルドが落ちた（2026-09-02・`38ea369` で修正済み）。同種の変更を入れるときに再発しやすいので残す。

1. **動的ルートの `generateStaticParams` が空になると `output: "export"` はビルド失敗にする**（「missing generateStaticParams()」。`next/dist/build/index.js` の `prerenderedRoutes.length > 0` 判定）。`/games/[gameId]` は boxscore（PO のみ取得）から params を作るため RS 期間中に空になった。→ 現季＋過去季から探す（`findBoxScore` / `boxScoreGameIds`）。新しい `[param]` ルートを足すときは「現季のデータが無い期間に params が空にならないか」を必ず考える。`/teams/[teamId]` は固定 30 チーム、`/players/[...slug]` は全季の選手を列挙するので安全。`/playoffs/[series]` は同じ理由で 2026-10-01 の模擬繰越ビルドが落ち、現季→過去季の順で探す形に直した。
2. **Route Handler は拡張子なしのファイルで書き出される**ため、`og/players/<id>` と `og/players/<id>/<season>` が同名衝突して EISDIR。→ 過去季は `/og/players/<season>/<id>` に逆順化。`page.tsx` は `.html` が付くので衝突しない。（2026-10-01 に選手ページを1人1ページにしたので、季つきの OG URL は今は無い）

模擬ビルドのやり方（本体を汚さない）:

```bash
S=/tmp/nba-sim && mkdir -p $S && rsync -a --exclude .next --exclude .git --exclude out ~/nba-data/ $S/
# node_modules はシンボリックリンク不可（Turbopack が "points out of the filesystem root" で拒否）。rsync で実体コピーする
cd $S && cp data/2025-26/*.csv data/ && cp data/2025-26/shots/*.json data/shots/ && scripts/rollover.sh 2025-26 2026-27 && npm run build
# 翌日の取得後を模擬するなら RS CSV をヘッダーのみにしてもう一度 build
for f in player_per_game player_totals player_advanced games team_per_game team_advanced; do head -1 data/$f.csv > data/$f.tmp && mv data/$f.tmp data/$f.csv; done
npm run build
```

## 戻し方

繰越コミットを `git revert` すれば `season.txt` と削除したファイルが戻る。日次取得が既に新季で走ってしまった後なら、その「Update NBA data」コミットも一緒に revert する。
