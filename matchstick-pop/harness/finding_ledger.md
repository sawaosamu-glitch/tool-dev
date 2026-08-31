# finding_ledger — 指摘と再リサーチの接続

| 指摘 | 再リサーチID | 調査結果 | 反映先 |
|---|---|---|---|
| C-01 | RR-01 「移動」の形式化 | `|A \ B|`（|A|=|B|）で定義。少ない手数も全て探索する必要があると判明 | research_v2 U-03、CONSTRAINTS 1章、SRS FR-05 |
| C-02 | RR-02 座標系の設計 | 演算子`+`の縦棒が半マスずれるため、マッチ棒長を2にして全整数化 | research_v2 U-03、SDD ADR-01 |
| O-01 | RR-03 ブラウザの印刷仕様 | Chromeは余白デフォルト時のみ`@page size`を尊重。背景グラフィックも既定OFF | research_v1 EV-01/EV-02、SRS CON-01/CON-02 |
| O-05 | RR-04 用紙規格 | JIS B2=515×728mm、ISO B2=500×707mm。国内流通はJIS | research_v1 EV-03、SDD |
| 写真の再現可否 | RR-05 出題の成立性 | 6+9=7 は2本で唯一解、四角2→3は余り棒2本が必要 | research_v2 U-01/U-02、data/quizzes.json |
