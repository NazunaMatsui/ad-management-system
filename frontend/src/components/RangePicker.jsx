import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

const DAYS   = ['日', '月', '火', '水', '木', '金', '土'];
const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

const toStr  = (y, m, d) => `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
const parseStr = (s) => { if (!s) return null; const [y,m,d] = s.split('-').map(Number); return {y,m,d}; };
const getDays = (y,m) => new Date(y,m,0).getDate();
const getDow  = (y,m) => new Date(y,m-1,1).getDay();

const todayY = new Date().getFullYear();
const todayM = new Date().getMonth() + 1;
const todayD = new Date().getDate();
const todayStr = toStr(todayY, todayM, todayD);

export default function RangePicker({ startDate, endDate, onChange, accentColor = '#3b82f6', accentBg = '#eff6ff' }) {
  const initY = parseStr(startDate)?.y ?? todayY;
  const initM = parseStr(startDate)?.m ?? todayM;

  const [viewY,     setViewY]     = useState(initY);
  const [viewM,     setViewM]     = useState(initM);
  const [hoverDate, setHoverDate] = useState(null);
  const [yearView,  setYearView]  = useState(false);
  const [monthView, setMonthView] = useState(false);

  const yearRange = Array.from({ length: 11 }, (_, i) => todayY - 5 + i);

  const prevMonth = () => { if (viewM === 1) { setViewY(y=>y-1); setViewM(12); } else setViewM(m=>m-1); };
  const nextMonth = () => { if (viewM === 12){ setViewY(y=>y+1); setViewM(1);  } else setViewM(m=>m+1); };

  const handleDayClick = (dateStr) => {
    if (!startDate || (startDate && endDate)) {
      // 最初のクリック or 再選択
      onChange(dateStr, null);
    } else {
      // 2回目のクリック
      if (dateStr < startDate) {
        onChange(dateStr, startDate);
      } else {
        onChange(startDate, dateStr);
      }
    }
  };

  const isInRange = (dateStr) => {
    const s = startDate;
    const e = endDate || hoverDate;
    if (!s || !e) return false;
    const [lo, hi] = s <= e ? [s, e] : [e, s];
    return dateStr > lo && dateStr < hi;
  };

  const isStart = (dateStr) => dateStr === startDate;
  const isEnd   = (dateStr) => {
    const e = endDate || (startDate && hoverDate && hoverDate !== startDate ? hoverDate : null);
    return dateStr === e;
  };
  const isRangeEdge = (dateStr) => isStart(dateStr) || isEnd(dateStr);

  // マス生成
  const daysInMonth = getDays(viewY, viewM);
  const firstDow    = getDow(viewY, viewM);
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const headerBtnStyle = {
    display: 'flex', alignItems: 'center', gap: '0.2rem',
    padding: '0.25rem 0.5rem', borderRadius: '6px', border: 'none',
    background: 'transparent', cursor: 'pointer', fontWeight: '700',
    fontSize: '0.875rem', color: '#1e293b', transition: 'background 0.1s'
  };

  return (
    <div style={{ userSelect: 'none' }}>
      {/* ナビゲーションヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <button onClick={prevMonth} style={{ width: '28px', height: '28px', borderRadius: '7px', border: '1px solid #e2e8f0', backgroundColor: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
          <ChevronLeft size={15} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.125rem' }}>
          {/* 年ボタン */}
          <button
            style={{ ...headerBtnStyle, color: yearView ? accentColor : '#1e293b', backgroundColor: yearView ? accentBg : 'transparent' }}
            onClick={() => { setYearView(v => !v); setMonthView(false); }}
            onMouseEnter={e => { if (!yearView) e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
            onMouseLeave={e => { if (!yearView) e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            {viewY}年 <ChevronDown size={12} style={{ transform: yearView ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', color: '#94a3b8' }} />
          </button>
          {/* 月ボタン */}
          <button
            style={{ ...headerBtnStyle, color: monthView ? accentColor : '#1e293b', backgroundColor: monthView ? accentBg : 'transparent' }}
            onClick={() => { setMonthView(v => !v); setYearView(false); }}
            onMouseEnter={e => { if (!monthView) e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
            onMouseLeave={e => { if (!monthView) e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            {MONTHS[viewM-1]} <ChevronDown size={12} style={{ transform: monthView ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', color: '#94a3b8' }} />
          </button>
        </div>

        <button onClick={nextMonth} style={{ width: '28px', height: '28px', borderRadius: '7px', border: '1px solid #e2e8f0', backgroundColor: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
          <ChevronRight size={15} />
        </button>
      </div>

      {/* 年選択グリッド */}
      {yearView && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '3px', marginBottom: '0.5rem' }}>
          {yearRange.map(y => {
            const sel = y === viewY;
            const cur = y === todayY;
            return (
              <button key={y} onClick={() => { setViewY(y); setYearView(false); }}
                style={{ padding: '0.4rem', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: sel ? '700' : cur ? '600' : '400', backgroundColor: sel ? accentColor : cur ? accentBg : 'transparent', color: sel ? '#fff' : cur ? accentColor : '#374151', transition: 'all 0.1s' }}
                onMouseEnter={e => { if (!sel) e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                onMouseLeave={e => { if (!sel) e.currentTarget.style.backgroundColor = cur ? accentBg : 'transparent'; }}
              >{y}</button>
            );
          })}
        </div>
      )}

      {/* 月選択グリッド */}
      {monthView && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '3px', marginBottom: '0.5rem' }}>
          {MONTHS.map((label, i) => {
            const m = i + 1;
            const sel = m === viewM;
            const cur = m === todayM && viewY === todayY;
            return (
              <button key={m} onClick={() => { setViewM(m); setMonthView(false); }}
                style={{ padding: '0.4rem', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: sel ? '700' : cur ? '600' : '400', backgroundColor: sel ? accentColor : cur ? accentBg : 'transparent', color: sel ? '#fff' : cur ? accentColor : '#374151', transition: 'all 0.1s' }}
                onMouseEnter={e => { if (!sel) e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                onMouseLeave={e => { if (!sel) e.currentTarget.style.backgroundColor = cur ? accentBg : 'transparent'; }}
              >{label}</button>
            );
          })}
        </div>
      )}

      {/* 曜日ヘッダー */}
      {!yearView && !monthView && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: '0.25rem' }}>
            {DAYS.map((d, i) => (
              <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: '600', padding: '0.2rem 0', color: i === 0 ? '#ef4444' : i === 6 ? accentColor : '#94a3b8' }}>
                {d}
              </div>
            ))}
          </div>

          {/* 日付グリッド */}
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}
            onMouseLeave={() => setHoverDate(null)}
          >
            {cells.map((d, i) => {
              if (!d) return <div key={`e-${i}`} />;

              const dateStr  = toStr(viewY, viewM, d);
              const isToday  = dateStr === todayStr;
              const inRange  = isInRange(dateStr);
              const isEdge   = isRangeEdge(dateStr);
              const isSt     = isStart(dateStr);
              const isEd     = isEnd(dateStr);
              const dow      = (firstDow + d - 1) % 7;

              // 範囲の左端・右端（角丸制御）
              const isRangeLeft  = inRange && dow === 0;
              const isRangeRight = inRange && dow === 6;

              return (
                <div
                  key={d}
                  onClick={() => handleDayClick(dateStr)}
                  onMouseEnter={() => !endDate && startDate && setHoverDate(dateStr)}
                  style={{
                    position: 'relative', cursor: 'pointer',
                    backgroundColor: inRange
                      ? (accentColor === '#3b82f6' ? 'rgba(59,130,246,0.1)' : 'rgba(107,114,128,0.08)')
                      : 'transparent',
                    borderRadius: isSt && isEd ? '8px' : isSt ? '8px 0 0 8px' : isEd ? '0 8px 8px 0' : isRangeLeft ? '0' : isRangeRight ? '0' : '0',
                  }}
                >
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    height: '34px', borderRadius: '8px',
                    backgroundColor: isEdge ? accentColor : 'transparent',
                    color: isEdge ? '#ffffff'
                      : isToday ? accentColor
                      : dow === 0 ? '#ef4444'
                      : dow === 6 ? accentColor
                      : '#374151',
                    fontSize: '0.82rem',
                    fontWeight: isEdge || isToday ? '700' : '400',
                    boxShadow: isEdge ? `0 2px 8px ${accentColor}55` : isToday && !isEdge ? `inset 0 0 0 1.5px ${accentColor}66` : 'none',
                    transition: 'all 0.1s',
                  }}
                    onMouseEnter={e => { if (!isEdge) e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                    onMouseLeave={e => { if (!isEdge) e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    {d}
                  </div>
                </div>
              );
            })}
          </div>

          {/* フッター */}
          <div style={{ marginTop: '0.75rem', paddingTop: '0.625rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              {!startDate ? '開始日をクリック' : !endDate ? '終了日をクリック' : `${startDate} 〜 ${endDate}`}
            </span>
            {(startDate || endDate) && (
              <button
                onClick={() => onChange(null, null)}
                style={{ fontSize: '0.72rem', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem 0.4rem', borderRadius: '4px' }}
                onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
              >クリア</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
