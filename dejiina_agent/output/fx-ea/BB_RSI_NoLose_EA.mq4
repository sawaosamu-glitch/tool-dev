//+------------------------------------------------------------------+
//|  BB_RSI_NoLose_EA.mq4                                            |
//|  ボリンジャーバンド + RSI 逆張り「負けない取引」モデル                    |
//|  戦略：BB外側タッチ＋RSI過熱→バンド内復帰でエントリー                    |
//|         TPはBBミドル（頭と尻尾はくれてやれ）                           |
//+------------------------------------------------------------------+
#property copyright "Dejiina Agent"
#property version   "2.00"
#property strict

//--- ボリンジャーバンド設定
input int    BB_Period     = 20;       // BBの期間
input double BB_Deviation  = 2.0;      // BB偏差（シグマ）
input int    BB_Shift      = 0;        // BBシフト

//--- RSI設定
input int    RSI_Period    = 14;       // RSI期間
input double RSI_Overbought = 70.0;   // RSI 過買い水準
input double RSI_Oversold   = 30.0;   // RSI 過売り水準

//--- エントリーフィルター（追加確認）
input bool   UseConfirmCandle = true;  // 確認足を待つ（推奨ON）
input int    MinBandWidth_Pips = 20;   // バンド幅の最小値（レンジ相場フィルター）

//--- TP / SL 設定
input double SL_Buffer_Pips = 5.0;    // SL：BBバンド外側からの追加バッファ（pips）
input bool   UseMiddleBandTP = true;  // TPをBBミドルに設定（推奨ON）
input double FixedTP_Pips    = 30.0;  // ミドルバンドTP無効時の固定TP（pips）

//--- トレーリングストップ設定
input bool   UseTrailing       = true;  // トレーリングストップ使用
input double Trail_Start_Pips  = 10.0; // 何pips含み益になったらトレール開始
input double Trail_Step_Pips   = 5.0;  // トレールのステップ幅（pips）

//--- 資金管理
input double RiskPercent      = 1.5;   // 1トレードのリスク（口座残高の%）
input double FixedLots        = 0.1;   // リスク計算無効時の固定ロット
input bool   UseAutoLot       = true;  // 自動ロット計算
input int    MaxSpread_Points = 30;    // 最大許容スプレッド（ポイント）

//--- 時間フィルター（低流動性時間帯を除外）
input bool   UseTimeFilter  = true;   // 時間フィルター使用
input int    StartHour      = 8;      // 取引開始時間（サーバー時刻）
input int    EndHour        = 22;     // 取引終了時間（サーバー時刻）

//--- 最大同時ポジション数
input int    MaxPositions   = 1;      // 同時に持てる最大ポジション数

//--- マジックナンバー
input int    MagicNumber    = 202600; // EA識別番号

//+------------------------------------------------------------------+
//| グローバル変数                                                     |
//+------------------------------------------------------------------+
double pip;  // 1pip = 価格単位

//+------------------------------------------------------------------+
//| 初期化                                                             |
//+------------------------------------------------------------------+
int OnInit()
{
    // pip単位の設定（5桁/3桁ブローカー対応）
    if(Digits == 5 || Digits == 3)
        pip = Point * 10;
    else
        pip = Point;

    Print("BB_RSI_NoLose_EA 起動完了 | Pip=", pip, " | Magic=", MagicNumber);
    return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| メインロジック（毎ティック呼び出し）                                    |
//+------------------------------------------------------------------+
void OnTick()
{
    // --- 時間フィルター ---
    if(UseTimeFilter)
    {
        int hour = TimeHour(TimeCurrent());
        if(hour < StartHour || hour >= EndHour) return;
    }

    // --- スプレッドチェック ---
    if((int)MarketInfo(Symbol(), MODE_SPREAD) > MaxSpread_Points) return;

    // --- 既存ポジション管理（トレーリングストップ） ---
    ManageOpenPositions();

    // --- 新規エントリー判断 ---
    if(CountPositions() >= MaxPositions) return;

    // === インジケーター値の取得 ===
    // ボリンジャーバンド（1本前の確定足）
    double bbUpper  = iBands(NULL, 0, BB_Period, BB_Deviation, BB_Shift, PRICE_CLOSE, MODE_UPPER, 1);
    double bbMiddle = iBands(NULL, 0, BB_Period, BB_Deviation, BB_Shift, PRICE_CLOSE, MODE_MAIN,  1);
    double bbLower  = iBands(NULL, 0, BB_Period, BB_Deviation, BB_Shift, PRICE_CLOSE, MODE_LOWER, 1);

    // 2本前（エントリー判断用：バンドタッチ確認）
    double bbUpper2  = iBands(NULL, 0, BB_Period, BB_Deviation, BB_Shift, PRICE_CLOSE, MODE_UPPER, 2);
    double bbLower2  = iBands(NULL, 0, BB_Period, BB_Deviation, BB_Shift, PRICE_CLOSE, MODE_LOWER, 2);

    // RSI
    double rsi1 = iRSI(NULL, 0, RSI_Period, PRICE_CLOSE, 1);  // 1本前
    double rsi2 = iRSI(NULL, 0, RSI_Period, PRICE_CLOSE, 2);  // 2本前

    // 価格
    double close1 = iClose(NULL, 0, 1);
    double close2 = iClose(NULL, 0, 2);

    // バンド幅チェック（極端に狭い＝レンジ相場を除外）
    double bandWidth = (bbUpper - bbLower) / pip;
    if(bandWidth < MinBandWidth_Pips) return;

    // === ロングエントリー条件 ===
    // 条件1：2本前のローソクがBB下限を割り込んだ（close2 < bbLower2）
    // 条件2：2本前のRSIが過売り（rsi2 < RSI_Oversold）
    // 条件3：1本前のローソクがBB内に戻った（close1 > bbLower）  ← 確認足
    bool longCondition = (close2 < bbLower2) &&
                         (rsi2 < RSI_Oversold) &&
                         (close1 > bbLower);

    // === ショートエントリー条件 ===
    // 条件1：2本前のローソクがBB上限を突破（close2 > bbUpper2）
    // 条件2：2本前のRSIが過買い（rsi2 > RSI_Overbought）
    // 条件3：1本前のローソクがBB内に戻った（close1 < bbUpper）  ← 確認足
    bool shortCondition = (close2 > bbUpper2) &&
                          (rsi2 > RSI_Overbought) &&
                          (close1 < bbUpper);

    // === エントリー実行 ===
    if(longCondition)
    {
        double sl, tp;
        double entryPrice = Ask;

        // SL：BB下限 - バッファ
        sl = bbLower - SL_Buffer_Pips * pip;

        // TP：BBミドル or 固定pips
        if(UseMiddleBandTP)
            tp = bbMiddle;
        else
            tp = entryPrice + FixedTP_Pips * pip;

        // SLまでの距離でロットを計算
        double slDistance = MathAbs(entryPrice - sl);
        double lots = CalculateLots(slDistance);

        // リスクリワード確認（最低1:0.5以上）
        double rr = MathAbs(tp - entryPrice) / slDistance;
        if(rr < 0.5)
        {
            Print("[SKIP] ロング：R/R比が低すぎます (", DoubleToString(rr, 2), ")");
            return;
        }

        int ticket = OrderSend(Symbol(), OP_BUY, lots, entryPrice, 3,
                               NormalizeDouble(sl, Digits),
                               NormalizeDouble(tp, Digits),
                               "BB_RSI_Long", MagicNumber, 0, clrBlue);

        if(ticket > 0)
            Print("[BUY] エントリー成功 | Lots=", lots, " | SL=", sl, " | TP=", tp,
                  " | R/R=", DoubleToString(rr, 2));
        else
            Print("[ERROR] BUYエラー: ", GetLastError());
    }

    if(shortCondition)
    {
        double sl, tp;
        double entryPrice = Bid;

        // SL：BB上限 + バッファ
        sl = bbUpper + SL_Buffer_Pips * pip;

        // TP：BBミドル or 固定pips
        if(UseMiddleBandTP)
            tp = bbMiddle;
        else
            tp = entryPrice - FixedTP_Pips * pip;

        // SLまでの距離でロットを計算
        double slDistance = MathAbs(entryPrice - sl);
        double lots = CalculateLots(slDistance);

        // リスクリワード確認
        double rr = MathAbs(entryPrice - tp) / slDistance;
        if(rr < 0.5)
        {
            Print("[SKIP] ショート：R/R比が低すぎます (", DoubleToString(rr, 2), ")");
            return;
        }

        int ticket = OrderSend(Symbol(), OP_SELL, lots, entryPrice, 3,
                               NormalizeDouble(sl, Digits),
                               NormalizeDouble(tp, Digits),
                               "BB_RSI_Short", MagicNumber, 0, clrRed);

        if(ticket > 0)
            Print("[SELL] エントリー成功 | Lots=", lots, " | SL=", sl, " | TP=", tp,
                  " | R/R=", DoubleToString(rr, 2));
        else
            Print("[ERROR] SELLエラー: ", GetLastError());
    }
}

//+------------------------------------------------------------------+
//| 保有ポジションの管理（トレーリングストップ）                              |
//+------------------------------------------------------------------+
void ManageOpenPositions()
{
    if(!UseTrailing) return;

    for(int i = OrdersTotal() - 1; i >= 0; i--)
    {
        if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
        if(OrderMagicNumber() != MagicNumber) continue;
        if(OrderSymbol() != Symbol()) continue;

        double trailStart = Trail_Start_Pips * pip;
        double trailStep  = Trail_Step_Pips * pip;

        if(OrderType() == OP_BUY)
        {
            double currentProfit = Bid - OrderOpenPrice();
            if(currentProfit >= trailStart)
            {
                double newSL = Bid - trailStep;
                newSL = NormalizeDouble(newSL, Digits);
                if(newSL > OrderStopLoss() + pip)
                {
                    bool res = OrderModify(OrderTicket(), OrderOpenPrice(),
                                           newSL, OrderTakeProfit(), 0, clrBlue);
                    if(res)
                        Print("[TRAIL] BUYトレール更新 | NewSL=", newSL);
                }
            }
        }
        else if(OrderType() == OP_SELL)
        {
            double currentProfit = OrderOpenPrice() - Ask;
            if(currentProfit >= trailStart)
            {
                double newSL = Ask + trailStep;
                newSL = NormalizeDouble(newSL, Digits);
                if(newSL < OrderStopLoss() - pip || OrderStopLoss() == 0)
                {
                    bool res = OrderModify(OrderTicket(), OrderOpenPrice(),
                                           newSL, OrderTakeProfit(), 0, clrRed);
                    if(res)
                        Print("[TRAIL] SELLトレール更新 | NewSL=", newSL);
                }
            }
        }
    }
}

//+------------------------------------------------------------------+
//| 自動ロット計算（リスク%ベース）                                        |
//+------------------------------------------------------------------+
double CalculateLots(double slDistance)
{
    if(!UseAutoLot) return FixedLots;

    double accountBalance = AccountBalance();
    double riskAmount     = accountBalance * RiskPercent / 100.0;

    double tickValue = MarketInfo(Symbol(), MODE_TICKVALUE);
    if(tickValue <= 0) return FixedLots;

    double tickSize  = MarketInfo(Symbol(), MODE_TICKSIZE);
    if(tickSize <= 0) return FixedLots;

    double slInTicks = slDistance / tickSize;
    double lots      = riskAmount / (slInTicks * tickValue);

    double minLot  = MarketInfo(Symbol(), MODE_MINLOT);
    double maxLot  = MarketInfo(Symbol(), MODE_MAXLOT);
    double lotStep = MarketInfo(Symbol(), MODE_LOTSTEP);

    lots = MathFloor(lots / lotStep) * lotStep;
    lots = MathMax(minLot, MathMin(maxLot, lots));

    return lots;
}

//+------------------------------------------------------------------+
//| 保有ポジション数カウント                                              |
//+------------------------------------------------------------------+
int CountPositions()
{
    int count = 0;
    for(int i = 0; i < OrdersTotal(); i++)
    {
        if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
        if(OrderMagicNumber() == MagicNumber && OrderSymbol() == Symbol())
            count++;
    }
    return count;
}
//+------------------------------------------------------------------+
