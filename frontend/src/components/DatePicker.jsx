import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, ChevronDown } from 'lucide-react';

const DAYS   = ['日', '月', '火', '水', '木', '金', '土'];
const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

const parseYMD = (str) => {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return { y, m, d };
};
const toYMD = (y, m, d) =>
  `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

const getDaysInMonth = (y, m) => new Date(y, m, 0).getDate();
const getFirstDow    = (y, m) => new Date(y, m - 1, 1).getDay();

const todayYMD = () => {
  const d = new Date();
  return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
};

// view: 'day' | 'year' | 'month'
export default function DatePicker({ value, onChange, placeholder = '日付を選択', minDate, maxDate }) {
  const [open,    setOpen]    = useState(false);
  const [view,    setView]    = useState('day'); // 'day' | 'year' | 'month'
  const selected = parseYMD(value);
  const today    = todayYMD();
  const [viewY,  setViewY]   = useState(selected?.y ?? today.y);
  const [viewM,  setViewM]   = useState(selected?.m ?? today.m);
  const yearListRef = useRef(null);
  const ref = useRef(null);

  const selectMonth = (m) => { setViewM(m); setView('day'); };

  // 外クリックで閉じる
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setView('day'); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // value 変化で表示月を同期
  useEffect(() => {
    if (selected) { setViewY(selected.y); setViewM(selected.m); }
  }, [value]);

  // 年選択ビューを開いたら選択年までスクロール
  useEffect(() => {
    if (view === 'year' && yearListRef.current) {
      const el = yearListRef.current.querySelector('[data-selected="true"]');
      if (el) el.scrollIntoView({ block: 'center' });
    }
  }, [view]);

  const prevMonth = () => { if (viewM === 1) { setViewY(y => y - 1); setViewM(12); } else setViewM(m => m - 1); };
  const nextMonth = () => { if (viewM === 12) { setViewY(y => y + 1); setViewM(1); } else setViewM(m => m + 1); };

  const selectDay = (d) => { onChange(toYMD(viewY, viewM, d)); setOpen(false); setView('day'); };
  const selectYear = (y) => { setViewY(y); setView('day'); };

  const isDisabled = (d) => {
    const str = toYMD(viewY, viewM, d);
    if (minDate && str < minDate) return true;
    if (maxDate && str > maxDate) return true;
    return false;
  };

  // 年リスト（今年の±10年）
  const yearRange = Array.from({ length: 21 }, (_, i) => today.y - 10 + i);

  // カレンダーマス
  const daysInMonth = getDaysInMonth(viewY, viewM);
  const firstDow    = getFirstDow(viewY, viewM);
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const labelText = selected
    ? `${selected.y}/${String(selected.m).padStart(2,'0')}/${String(selected.d).padStart(2,'0')}`
    : placeholder;

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
      {/* トリガーボタン */}
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setView('day'); }}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '0.625rem',
          padding: '0.6rem 0.875rem', borderRadius: '8px',
          border: `1.5px solid ${open ? '#3b82f6' : '#e2e8f0'}`,
          backgroundColor: '#ffffff', cursor: 'pointer', textAlign: 'left',
          fontSize: '0.875rem', color: selected ? '#1e293b' : '#94a3b8',
          boxShadow: open ? '0 0 0 3px rgba(59,130,246,0.1)' : '0 1px 2px rgba(0,0,0,0.04)',
          transition: 'all 0.15s', fontFamily: 'inherit'
        }}
      >
        <CalendarDays size={15} style={{ color: open ? '#3b82f6' : '#94a3b8', flexShrink: 0 }} />
        <span style={{ flex: 1 }}>{labelText}</span>
        {selected && (
          <span
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            style={{ color: '#cbd5e1', fontSize: '0.75rem', cursor: 'pointer' }}
            title="クリア"
          >✕</span>
        )}
      </button>

      {/* ドロップダウン */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 100,
          backgroundColor: '#ffffff', borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 12px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
          padding: '1rem', minWidth: '280px',
          animation: 'fadeInDown 0.15s ease'
        }}>

          {/* ヘッダー */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
            {view === 'day' && (
              <button onClick={prevMonth} style={navBtnStyle}>
                <ChevronLeft size={16} />
              </button>
            )}

            {/* 年月ラベル（年クリックで年選択ビューへ） */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: view === 'year' ? 1 : 'unset' }}>
              <button
                onClick={() => setView(v => v === 'year' ? 'day' : 'year')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.25rem',
                  padding: '0.3rem 0.625rem', borderRadius: '7px', border: 'none',
                  backgroundColor: view === 'year' ? '#eff6ff' : 'transparent',
                  color: view === 'year' ? '#3b82f6' : '#1e293b',
                  fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {viewY}年
                <ChevronDown size={13} style={{ transform: view === 'year' ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', color: '#94a3b8' }} />
              </button>
              {view === 'day' && (
                <button
                  onClick={() => setView('month')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.25rem',
                    padding: '0.3rem 0.625rem', borderRadius: '7px', border: 'none',
                    backgroundColor: 'transparent',
                    color: '#1e293b',
                    fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {MONTHS[viewM - 1]}
                  <ChevronDown size={13} style={{ color: '#94a3b8' }} />
                </button>
              )}
              {view === 'month' && (
                <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#3b82f6' }}>
                  月を選択
                </span>
              )}
            </div>

            {view === 'day' && (
              <button onClick={nextMonth} style={navBtnStyle}>
                <ChevronRight size={16} />
              </button>
            )}
          </div>

          {/* 月選択ビュー */}
          {view === 'month' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '4px' }}>
              {MONTHS.map((label, i) => {
                const m = i + 1;
                const isSelected = m === viewM;
                const isThisMonth = viewY === today.y && m === today.m;
                return (
                  <button
                    key={m}
                    onClick={() => selectMonth(m)}
                    style={{
                      padding: '0.6rem 0.25rem', borderRadius: '8px', border: 'none',
                      cursor: 'pointer', fontSize: '0.85rem',
                      fontWeight: isSelected ? '700' : isThisMonth ? '600' : '400',
                      backgroundColor: isSelected ? '#3b82f6' : isThisMonth ? '#eff6ff' : 'transparent',
                      color: isSelected ? '#ffffff' : isThisMonth ? '#3b82f6' : '#374151',
                      boxShadow: isSelected ? '0 2px 8px rgba(59,130,246,0.35)' : 'none',
                      transition: 'all 0.1s'
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = isThisMonth ? '#eff6ff' : 'transparent'; }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {/* 年選択ビュー */}
          {view === 'year' && (
            <div
              ref={yearListRef}
              style={{
                display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '4px',
                maxHeight: '200px', overflowY: 'auto', paddingRight: '2px'
              }}
            >
              {yearRange.map(y => {
                const isSelected = y === viewY;
                const isThisYear = y === today.y;
                return (
                  <button
                    key={y}
                    data-selected={isSelected}
                    onClick={() => selectYear(y)}
                    style={{
                      padding: '0.5rem', borderRadius: '8px', border: 'none',
                      cursor: 'pointer', fontSize: '0.85rem',
                      fontWeight: isSelected ? '700' : isThisYear ? '600' : '400',
                      backgroundColor: isSelected ? '#3b82f6' : isThisYear ? '#eff6ff' : 'transparent',
                      color: isSelected ? '#ffffff' : isThisYear ? '#3b82f6' : '#374151',
                      boxShadow: isSelected ? '0 2px 8px rgba(59,130,246,0.35)' : 'none',
                      transition: 'all 0.1s'
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = isThisYear ? '#eff6ff' : 'transparent'; }}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          )}

          {/* 日付ビュー */}
          {view === 'day' && (
            <>
              {/* 曜日ヘッダー */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: '0.25rem' }}>
                {DAYS.map((d, i) => (
                  <div key={d} style={{
                    textAlign: 'center', fontSize: '0.72rem', fontWeight: '600', padding: '0.25rem 0',
                    color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : '#94a3b8'
                  }}>{d}</div>
                ))}
              </div>

              {/* 日付グリッド */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px' }}>
                {cells.map((d, i) => {
                  if (!d) return <div key={`e-${i}`} />;
                  const isToday  = viewY === today.y && viewM === today.m && d === today.d;
                  const isSel    = selected && viewY === selected.y && viewM === selected.m && d === selected.d;
                  const disabled = isDisabled(d);
                  const dow      = (firstDow + d - 1) % 7;
                  return (
                    <button
                      key={d}
                      onClick={() => !disabled && selectDay(d)}
                      disabled={disabled}
                      style={{
                        width: '100%', aspectRatio: '1', borderRadius: '8px', border: 'none',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        fontSize: '0.82rem', fontWeight: isSel || isToday ? '700' : '400',
                        transition: 'all 0.1s',
                        backgroundColor: isSel ? '#3b82f6' : isToday ? '#eff6ff' : 'transparent',
                        color: disabled ? '#d1d5db'
                          : isSel   ? '#ffffff'
                          : isToday ? '#3b82f6'
                          : dow === 0 ? '#ef4444'
                          : dow === 6 ? '#3b82f6'
                          : '#374151',
                        boxShadow: isSel ? '0 2px 8px rgba(59,130,246,0.35)' : isToday ? 'inset 0 0 0 1.5px #bfdbfe' : 'none',
                      }}
                      onMouseEnter={e => { if (!isSel && !disabled) e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                      onMouseLeave={e => { if (!isSel && !disabled) e.currentTarget.style.backgroundColor = isToday ? '#eff6ff' : 'transparent'; }}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* フッター */}
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {view === 'year'  && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>年を選択</span>}
            {view === 'month' && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>月を選択</span>}
            {view === 'day'   && <span />}
            <button
              onClick={() => { const t = todayYMD(); setViewY(t.y); setViewM(t.m); setView('day'); if (view === 'day') selectDay(t.d); }}
              style={{
                padding: '0.3rem 0.75rem', borderRadius: '6px', border: '1px solid #bfdbfe',
                backgroundColor: '#eff6ff', color: '#3b82f6', fontSize: '0.78rem',
                fontWeight: '600', cursor: 'pointer'
              }}
            >今日</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

const navBtnStyle = {
  width: '30px', height: '30px', borderRadius: '8px', border: '1px solid #e2e8f0',
  backgroundColor: '#ffffff', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', color: '#64748b',
  transition: 'all 0.15s', padding: 0, flexShrink: 0
};
