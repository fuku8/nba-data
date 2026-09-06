// スマホ幅の表: # と名前の列を左に固定し、横にスクロールしても誰の行か分かるようにする。
// 名前は 120px 幅（チーム表はスマホでは略称）で、数値列が最初の画面に 3〜4 本入る幅を残す。
// ponytail: 固定セルは bg-card で塗るので行ホバーの色は固定列に乗らない（気になったら group-hover で合わせる）
export const STICKY_RANK = "sticky left-0 z-10 bg-card min-w-8"; // 名前列の left-8 と幅を揃える
export const STICKY_NAME = "sticky left-8 z-10 bg-card max-w-[120px] sm:max-w-none";
// 選手名セル: 切り詰めず折り返す（nba.com のスマホ表示と同型）。min-w が無いと
// w-full の表がスマホで名前列を min-content まで潰すので幅を固定する。
// 12em（text-xs で 144px）は「シェイ・ギルジャス＝」（10文字）が1行に入り、
// SegmentedName の「・」「＝」区切りでほぼ全選手が2行以内に収まる幅
export const NAME_WRAP = "whitespace-normal leading-snug min-w-[12em] max-w-[12em] sm:max-w-none";
