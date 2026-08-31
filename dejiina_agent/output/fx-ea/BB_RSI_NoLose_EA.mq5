//+------------------------------------------------------------------+
//|  BB_RSI_NoLose_EA.mq5  (MetaTrader 5 版)                         |
//|  ボリンジャーバンド + RSI 逆張り「負けない取引」モデル                    |
//+------------------------------------------------------------------+
#property copyright "Dejiina Agent"
#property version   "2.00"

#include <Trade\Trade.mqh>
CTrade trade;

//--- ボリンジャーバンド設定
input int    BB_Period      = 20;
input double BB_Deviation   = 2.0;
input int    BB_Shift       = 0;

//--- RSI設定
input int    RSI_Period     = 14;
input double RSI_Overbought = 70.0;
input double RSI_Oversold   = 30.0;

//--- エントリーフィルター
input int    MinBandWidth_Pips = 20;   // レンジフィルター（バンド幅の最小pips）

//--- TP / SL 設定
input double SL_Buffer_Pips  = 5.0;   // SLバッファ（pips）
input bool   UseMiddleBandTP = true;  // TPをBBミドルに設定
input double FixedTP_Pips    = 30.0;  // 固定TP（ミドルバンドTP無効時）

//--- トレーリングストップ
input bool   UseTrailing      = true;
input double Trail_Start_Pips = 10.0;
input double Trail_Step_Pips  = 5.0;

//--- 資金管理
input double RiskPercent      = 1.5;
input double FixedLots        = 0.1;
input bool   UseAutoLot       = true;
input int    MaxSpread_Points = 30;

//--- 時間フィルター
input bool   UseTimeFilter    = true;
input int    StartHour        = 8;
input int    EndHour          = 22;

//--- 最大同時ポジション数
input int    MaxPositions     = 1;
input ulong  MagicNumber      = 202600;

//--- インジケーターハンドル
int bb_handle;
int rsi_handle;
double pip;

//+------------------------------------------------------------------+
int OnInit()
{
    if(Digits() == 5 || Digits() == 3)
        pip = _Point * 10;
    else
        pip = _Point;

    bb_handle  = iBands(_Symbol, PERIOD_CURRENT, BB_Period, BB_Shift, BB_Deviation, PRICE_CLOSE);
    rsi_handle = iRSI(_Symbol, PERIOD_CURRENT, RSI_Period, PRICE_CLOSE);

    if(bb_handle == INVALID_HANDLE || rsi_handle == INVALID_HANDLE)
    {
        Print("[ERROR] インジケーターハンドル取得失敗");
        return INIT_FAILED;
    }

    trade.SetExpertMagicNumber(MagicNumber);
    trade.SetDeviationInPoints(30);
    Print("BB_RSI_NoLose_EA MT5版 起動完了");
    return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
    IndicatorRelease(bb_handle);
    IndicatorRelease(rsi_handle);
}

//+------------------------------------------------------------------+
void OnTick()
{
    // 時間フィルター
    if(UseTimeFilter)
    {
        MqlDateTime dt;
        TimeToStruct(TimeCurrent(), dt);
        if(dt.hour < StartHour || dt.hour >= EndHour) return;
    }

    // スプレッドチェック
    if((int)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD) > MaxSpread_Points) return;

    // トレーリングストップ管理
    ManageOpenPositions();

    // 最大ポジション数チェック
    if(CountPositions() >= MaxPositions) return;

    // ===== インジケーター値取得 =====
    double bbUpper[], bbMiddle[], bbLower[];
    double rsiVal[];

    ArraySetAsSeries(bbUpper,  true);
    ArraySetAsSeries(bbMiddle, true);
    ArraySetAsSeries(bbLower,  true);
    ArraySetAsSeries(rsiVal,   true);

    if(CopyBuffer(bb_handle, 1, 0, 3, bbUpper)  < 3) return; // Upper
    if(CopyBuffer(bb_handle, 0, 0, 3, bbMiddle) < 3) return; // Middle
    if(CopyBuffer(bb_handle, 2, 0, 3, bbLower)  < 3) return; // Lower
    if(CopyBuffer(rsi_handle, 0, 0, 3, rsiVal)  < 3) return;

    double close[];
    ArraySetAsSeries(close, true);
    if(CopyClose(_Symbol, PERIOD_CURRENT, 0, 3, close) < 3) return;

    // インデックス：[0]=現在足(未確定) [1]=1本前(確定) [2]=2本前(確定)
    double bbU1 = bbUpper[1],  bbU2 = bbUpper[2];
    double bbM1 = bbMiddle[1];
    double bbL1 = bbLower[1],  bbL2 = bbLower[2];
    double rsi1 = rsiVal[1],   rsi2 = rsiVal[2];
    double c1   = close[1],    c2   = close[2];

    // バンド幅フィルター
    double bandWidth = (bbU1 - bbL1) / pip;
    if(bandWidth < MinBandWidth_Pips) return;

    // ===== ロングエントリー条件 =====
    bool longCond = (c2 < bbL2) && (rsi2 < RSI_Oversold) && (c1 > bbL1);

    // ===== ショートエントリー条件 =====
    bool shortCond = (c2 > bbU2) && (rsi2 > RSI_Overbought) && (c1 < bbU1);

    double askPrice = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
    double bidPrice = SymbolInfoDouble(_Symbol, SYMBOL_BID);

    // ===== ロングエントリー =====
    if(longCond)
    {
        double sl = bbL1 - SL_Buffer_Pips * pip;
        double tp = UseMiddleBandTP ? bbM1 : askPrice + FixedTP_Pips * pip;
        double slDist = MathAbs(askPrice - sl);
        double lots   = CalculateLots(slDist);

        double rr = MathAbs(tp - askPrice) / slDist;
        if(rr < 0.5) { Print("[SKIP] ロング R/R低 =", DoubleToStr(rr,2)); return; }

        if(trade.Buy(lots, _Symbol, askPrice,
                     NormalizeDouble(sl, _Digits),
                     NormalizeDouble(tp, _Digits), "BB_RSI_Long"))
            Print("[BUY] Lots=", lots, " SL=", sl, " TP=", tp, " R/R=", DoubleToStr(rr,2));
        else
            Print("[ERROR] BUY失敗: ", trade.ResultRetcode());
    }

    // ===== ショートエントリー =====
    if(shortCond)
    {
        double sl = bbU1 + SL_Buffer_Pips * pip;
        double tp = UseMiddleBandTP ? bbM1 : bidPrice - FixedTP_Pips * pip;
        double slDist = MathAbs(bidPrice - sl);
        double lots   = CalculateLots(slDist);

        double rr = MathAbs(bidPrice - tp) / slDist;
        if(rr < 0.5) { Print("[SKIP] ショート R/R低 =", DoubleToStr(rr,2)); return; }

        if(trade.Sell(lots, _Symbol, bidPrice,
                      NormalizeDouble(sl, _Digits),
                      NormalizeDouble(tp, _Digits), "BB_RSI_Short"))
            Print("[SELL] Lots=", lots, " SL=", sl, " TP=", tp, " R/R=", DoubleToStr(rr,2));
        else
            Print("[ERROR] SELL失敗: ", trade.ResultRetcode());
    }
}

//+------------------------------------------------------------------+
void ManageOpenPositions()
{
    if(!UseTrailing) return;

    for(int i = PositionsTotal() - 1; i >= 0; i--)
    {
        if(!PositionSelectByTicket(PositionGetTicket(i))) continue;
        if(PositionGetInteger(POSITION_MAGIC) != (long)MagicNumber) continue;
        if(PositionGetString(POSITION_SYMBOL) != _Symbol) continue;

        double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
        double curSL     = PositionGetDouble(POSITION_SL);
        double trailStart = Trail_Start_Pips * pip;
        double trailStep  = Trail_Step_Pips * pip;
        double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
        double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);

        if(PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY)
        {
            if(bid - openPrice >= trailStart)
            {
                double newSL = NormalizeDouble(bid - trailStep, _Digits);
                if(newSL > curSL + pip)
                    trade.PositionModify(PositionGetTicket(i), newSL,
                                         PositionGetDouble(POSITION_TP));
            }
        }
        else if(PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_SELL)
        {
            if(openPrice - ask >= trailStart)
            {
                double newSL = NormalizeDouble(ask + trailStep, _Digits);
                if(newSL < curSL - pip || curSL == 0)
                    trade.PositionModify(PositionGetTicket(i), newSL,
                                         PositionGetDouble(POSITION_TP));
            }
        }
    }
}

//+------------------------------------------------------------------+
double CalculateLots(double slDistance)
{
    if(!UseAutoLot) return FixedLots;

    double balance   = AccountInfoDouble(ACCOUNT_BALANCE);
    double riskAmt   = balance * RiskPercent / 100.0;
    double tickVal   = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
    double tickSize  = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
    if(tickVal <= 0 || tickSize <= 0) return FixedLots;

    double slTicks = slDistance / tickSize;
    double lots    = riskAmt / (slTicks * tickVal);

    double minLot  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
    double maxLot  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
    double lotStep = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);

    lots = MathFloor(lots / lotStep) * lotStep;
    return MathMax(minLot, MathMin(maxLot, lots));
}

//+------------------------------------------------------------------+
int CountPositions()
{
    int cnt = 0;
    for(int i = 0; i < PositionsTotal(); i++)
    {
        if(!PositionSelectByTicket(PositionGetTicket(i))) continue;
        if(PositionGetInteger(POSITION_MAGIC) == (long)MagicNumber &&
           PositionGetString(POSITION_SYMBOL) == _Symbol)
            cnt++;
    }
    return cnt;
}
//+------------------------------------------------------------------+
