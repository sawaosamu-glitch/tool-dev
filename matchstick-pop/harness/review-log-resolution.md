# review-log-resolution — 指摘の収束状況

| 指摘 | 区分 | 状態 | 検証 |
|---|---|---|---|
| C-01 少ない本数で解ける問題の混入 | Blocker | 解決 | TC-U24, TC-U34, TC-I01 |
| C-02 座標の非整数化 | Blocker | 解決 | TC-U02, TC-U03 |
| O-01 印刷設定の周知不足 | Blocker | 解決 | 画面案内＋README（目視確認済） |
| C-03 探索空間の爆発 | Must | 解決 | TC-U26 |
| C-04 NaN混入 | Must | 解決 | TC-U41, TC-E03 |
| C-05 NG時のファイル生成 | Must | 解決 | TC-E04 |
| O-02 複数解の誤判定 | Must | 解決 | answers.html に全解＋注意書き |
| O-03 非エンジニアの問題追加 | Must | 解決 | README「問題を差し替える・追加する」 |
| O-05 JIS/ISO B判の取り違え | Must | 解決 | JIS採用、TC-U44 |
| C-06 テスト実行の失敗 | Should | 解決 | `npm test` 49件PASS |
| O-04 刷る前の検証 | Should | 解決 | TC-E06 |
| O-06 大判の自前印刷 | Later | 運用で吸収 | RSK-01 |

**残Blocker: 0 ／ 残Must: 0**
