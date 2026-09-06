// リーダーリストの掲載人数。client（リスト）と leaders-page（図の対象＝リスト上位の和集合）の両方で使う。
// "use client" モジュールからサーバーへ定数を import すると client reference 化して値が取れないため、素のモジュールに置く
export const TOP_N = 20;
