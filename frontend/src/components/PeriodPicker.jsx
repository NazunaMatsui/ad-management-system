import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, CalendarDays } from 'lucide-react';

const DAYS   = ['日', '月', '火', '水', '木', '金', '土'];
const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

const toStr  = (y, m, d) => `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
const getDays = (y, m) => new Date(y, m, 0).getDate();
const getDow  = (y, m) => new Date(y, m - 1, 1).getDay();

const today = new Date();
const TY = today.getFullYear(), TM = today.getMonth() + 1, TD = today.getDate();
const todayStr = toStr(TY, TM, TD);

export default function PeriodPicker({ startDate, endDate, onChange, accentColor = '#3b82f6', accentBg = '#eff6ff', label = '期間' }) {
  const [open,      setOpen]      = useState(false);
  const [viewY,     setViewY]     = useState(startDate ? +startDate.slice(0,4) : TY);
  const [viewM,     setViewM]     = useState(startDate ? +startDate.slice(5,7) : TM);
  const [hoverDate, setHoverDate] = useState(null);
  const [yearView,  setYearView]  = useState(false);
  const [monthView, setMonthView] = useState(false);
  const ref = useRef(null);

  // 外クリックで閉じる
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setYearView(false); setMonthView(false); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // 開いたとき開始日の月に移動
  useEffect(() => {
    if (open && startDate) { setViewY(+startDate.slice(0,4)); setViewM(+startDate.slice(5,7)); }
  }, [open]);

  const prevMonth = () => viewM === 1 ? (setViewY(y=>y-1), setViewM(12)) : setViewM(m=>m-1);
  const nextMonth = () => viewM === 12? (setViewY(y=>y+1), setViewM(1))  : setViewM(m=>m+1);

  const handleClick = (dateStr) => {
    if (dateStr > todayStr) return;
    if (!startDate || (startDate && endDate)) {
      onChange(dateStr, null);       // 1回目 or リセット後
    } else if (dateStr < startDate) {
      onChange(dateStr, startDate);  // 開始より前を選んだら入れ替え＆確定
      setOpen(false); setHoverDate(null);
    } else {
      onChange(startDate, dateStr);  // 2回目で確定
      setOpen(false); setHoverDate(null);
    }
  };

  const isInRange = (d) => {
    const s = startDate, e = endDate || hoverDate;
    if (!s || !e) return false;
    const [lo, hi] = s <= e ? [s, e] : [e, s];
    return d > lo && d < hi;
  };
  const isStart = (d) => d === startDate;
  const isEnd   = (d) => {
    const e = endDate || (startDate && hoverDate && hoverDate !== startDate ? hoverDate : null);
    return d === e;
  };

  // マス生成
  const daysInMonth = getDays(viewY, viewM);
  const firstDow    = getDow(viewY, viewM);
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const yearRange = Array.from({length: 11}, (_,i) => TY - 5 + i);

  // トリガーラベル
  const triggerLabel = startDate && endDate
    ? `${startDate} 〜 ${endDate}`
    : startDate
    ? `${startDate} 〜 終了日を選択`
    : '期間を選択';

  const navBtn = (onClick, children) => (
    <button onClick={onClick} style={{ width:'28px', height:'28px', borderRadius:'7px', border:'1px solid #e2e8f0', backgroundColor:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#64748b', flexShrink:0 }}>
      {children}
    </button>
  );
  const headerBtn = (active, onClick, children) => (
    <button onClick={onClick}
      style={{ display:'flex', alignItems:'center', gap:'0.2rem', padding:'0.25rem 0.5rem', borderRadius:'6px', border:'none', backgroundColor: active ? accentBg : 'transparent', color: active ? accentColor : '#1e293b', fontWeight:'700', fontSize:'0.875rem', cursor:'pointer' }}
      onMouseEnter={e=>{ if(!active) e.currentTarget.style.backgroundColor='#f1f5f9'; }}
      onMouseLeave={e=>{ if(!active) e.currentTarget.style.backgroundColor= active ? accentBg : 'transparent'; }}
    >{children}</button>
  );

  return (
    <div ref={ref} style={{ position:'relative', width:'100%' }}>
      {/* トリガー */}
      <button type="button" onClick={() => setOpen(o=>!o)} style={{
        width:'100%', display:'flex', alignItems:'center', gap:'0.625rem',
        padding:'0.6rem 0.875rem', borderRadius:'8px',
        border:`1.5px solid ${open ? accentColor : '#e2e8f0'}`,
        backgroundColor:'#fff', cursor:'pointer', textAlign:'left',
        fontSize:'0.875rem', color: (startDate || endDate) ? '#1e293b' : '#94a3b8',
        boxShadow: open ? `0 0 0 3px ${accentColor}22` : '0 1px 2px rgba(0,0,0,0.04)',
        transition:'all 0.15s', fontFamily:'inherit', justifyContent:'space-between'
      }}>
        <span style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
          <CalendarDays size={15} style={{ color: open ? accentColor : '#94a3b8', flexShrink:0 }} />
          {triggerLabel}
        </span>
        {(startDate || endDate) && (
          <span onClick={e=>{ e.stopPropagation(); onChange(null,null); }} style={{ color:'#cbd5e1', fontSize:'0.75rem', cursor:'pointer' }} title="クリア">✕</span>
        )}
      </button>

      {/* カレンダードロップダウン */}
      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 8px)', left:0, zIndex:200,
          backgroundColor:'#fff', borderRadius:'14px',
          border:'1px solid #e2e8f0',
          boxShadow:'0 12px 40px rgba(0,0,0,0.12)',
          padding:'1rem', minWidth:'300px',
          animation:'fadeInDown 0.15s ease'
        }}>
          {/* ヘッダー */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.75rem' }}>
            {navBtn(prevMonth, <ChevronLeft size={15}/>)}
            <div style={{ display:'flex', alignItems:'center', gap:'0.125rem' }}>
              {headerBtn(yearView,  ()=>{ setYearView(v=>!v); setMonthView(false); }, <>{viewY}年 <ChevronDown size={11} style={{ color:'#94a3b8', transform: yearView?'rotate(180deg)':'none', transition:'transform 0.15s' }}/></>)}
              {headerBtn(monthView, ()=>{ setMonthView(v=>!v); setYearView(false); }, <>{MONTHS[viewM-1]} <ChevronDown size={11} style={{ color:'#94a3b8', transform: monthView?'rotate(180deg)':'none', transition:'transform 0.15s' }}/></>)}
            </div>
            {navBtn(nextMonth, <ChevronRight size={15}/>)}
          </div>

          {/* 年グリッド */}
          {yearView && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'3px', marginBottom:'0.5rem' }}>
              {yearRange.map(y => {
                const sel = y===viewY, cur = y===TY;
                return <button key={y} onClick={()=>{ setViewY(y); setYearView(false); }} style={{ padding:'0.4rem', borderRadius:'7px', border:'none', cursor:'pointer', fontSize:'0.82rem', fontWeight:sel?'700':cur?'600':'400', backgroundColor:sel?accentColor:cur?accentBg:'transparent', color:sel?'#fff':cur?accentColor:'#374151', transition:'all 0.1s' }} onMouseEnter={e=>{ if(!sel) e.currentTarget.style.backgroundColor='#f1f5f9'; }} onMouseLeave={e=>{ if(!sel) e.currentTarget.style.backgroundColor=cur?accentBg:'transparent'; }}>{y}</button>;
              })}
            </div>
          )}

          {/* 月グリッド */}
          {monthView && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'3px', marginBottom:'0.5rem' }}>
              {MONTHS.map((lbl,i) => {
                const m=i+1, sel=m===viewM, cur=m===TM&&viewY===TY;
                return <button key={m} onClick={()=>{ setViewM(m); setMonthView(false); }} style={{ padding:'0.4rem', borderRadius:'7px', border:'none', cursor:'pointer', fontSize:'0.82rem', fontWeight:sel?'700':cur?'600':'400', backgroundColor:sel?accentColor:cur?accentBg:'transparent', color:sel?'#fff':cur?accentColor:'#374151', transition:'all 0.1s' }} onMouseEnter={e=>{ if(!sel) e.currentTarget.style.backgroundColor='#f1f5f9'; }} onMouseLeave={e=>{ if(!sel) e.currentTarget.style.backgroundColor=cur?accentBg:'transparent'; }}>{lbl}</button>;
              })}
            </div>
          )}

          {/* 日付カレンダー */}
          {!yearView && !monthView && (
            <>
              {/* 曜日ヘッダー */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', marginBottom:'0.25rem' }}>
                {DAYS.map((d,i)=>(
                  <div key={d} style={{ textAlign:'center', fontSize:'0.72rem', fontWeight:'600', padding:'0.2rem 0', color: i===0?'#ef4444': i===6?accentColor:'#94a3b8' }}>{d}</div>
                ))}
              </div>

              {/* 日付グリッド */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }} onMouseLeave={()=>setHoverDate(null)}>
                {cells.map((d,i)=>{
                  if (!d) return <div key={`e-${i}`}/>;
                  const ds   = toStr(viewY, viewM, d);
                  const inR  = isInRange(ds);
                  const isSt = isStart(ds);
                  const isEd = isEnd(ds);
                  const isEdge = isSt || isEd;
                  const isT  = ds === todayStr;
                  const isFuture = ds > todayStr;
                  const dow  = (firstDow + d - 1) % 7;

                  return (
                    <div key={d}
                      onClick={()=>handleClick(ds)}
                      onMouseEnter={()=>{ if(startDate && !endDate && !isFuture) setHoverDate(ds); }}
                      style={{
                        position:'relative', cursor: isFuture ? 'not-allowed' : 'pointer',
                        backgroundColor: inR ? `${accentColor}18` : 'transparent',
                        borderRadius: isSt&&isEd?'8px' : isSt?'8px 0 0 8px' : isEd?'0 8px 8px 0' : '0',
                      }}
                    >
                      <div style={{
                        display:'flex', alignItems:'center', justifyContent:'center',
                        height:'34px', borderRadius:'8px',
                        backgroundColor: isEdge ? accentColor : 'transparent',
                        color: isFuture ? '#d1d5db' : isEdge?'#fff' : isT?accentColor : dow===0?'#ef4444' : dow===6?accentColor : '#374151',
                        fontSize:'0.82rem',
                        fontWeight: isEdge||isT ? '700':'400',
                        boxShadow: isEdge?`0 2px 8px ${accentColor}55` : isT&&!isEdge?`inset 0 0 0 1.5px ${accentColor}66`:'none',
                        transition:'background 0.1s'
                      }}
                        onMouseEnter={e=>{ if(!isEdge && !isFuture) e.currentTarget.style.backgroundColor='#f1f5f9'; }}
                        onMouseLeave={e=>{ if(!isEdge) e.currentTarget.style.backgroundColor='transparent'; }}
                      >{d}</div>
                    </div>
                  );
                })}
              </div>

              {/* フッター */}
              <div style={{ marginTop:'0.75rem', paddingTop:'0.625rem', borderTop:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:'0.72rem', color:'#94a3b8' }}>
                  {!startDate ? '開始日をクリック' : !endDate ? '終了日をクリック' : `${startDate} 〜 ${endDate}`}
                </span>
                <div style={{ display:'flex', gap:'0.4rem' }}>
                  <button onClick={()=>{ const y=new Date(); y.setDate(y.getDate()-1); const ys=toStr(y.getFullYear(),y.getMonth()+1,y.getDate()); onChange(ys,ys); setOpen(false); }} style={{ padding:'0.3rem 0.75rem', borderRadius:'6px', border:'1px solid #e2e8f0', backgroundColor:'#f8fafc', color:'#64748b', fontSize:'0.78rem', fontWeight:'600', cursor:'pointer' }}>昨日</button>
                  <button onClick={()=>{ onChange(toStr(TY,TM,TD), toStr(TY,TM,TD)); setOpen(false); }} style={{ padding:'0.3rem 0.75rem', borderRadius:'6px', border:`1px solid ${accentColor}44`, backgroundColor:accentBg, color:accentColor, fontSize:'0.78rem', fontWeight:'600', cursor:'pointer' }}>今日</button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <style>{`@keyframes fadeInDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
