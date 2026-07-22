import React, { useState, useEffect, useRef } from 'react';
import { metricsAPI } from '../utils/api';
import { Calendar, TrendingUp, ChevronDown } from 'lucide-react';

const fmt    = (v) => new Intl.NumberFormat('ja-JP').format(Math.round(Number(v) || 0));
const fmtYen = (v) => `¥${fmt(v)}`;
const fmtPct = (v) => `${(Number(v) || 0).toFixed(2)}%`;

const DAYS = ['日', '月', '火', '水', '木', '金', '土'];
const fmtDate = (isoStr) => {
  try {
    const s = String(isoStr).split('T')[0];
    const [y, mo, d] = s.split('-').map(Number);
    const dt = new Date(y, mo - 1, d);
    return `${mo}/${d} (${DAYS[dt.getDay()]})`;
  } catch (_) { return isoStr || ''; }
};

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const currentMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
};

const METRICS = [
  { key: 'spend',               label: '消化金額',    format: fmtYen },
  { key: 'impressions',         label: 'IMP',         format: fmt    },
  { key: 'clicks',              label: 'クリック',    format: fmt    },
  { key: 'conversions_meta',    label: 'CV (META)',   format: fmt    },
  { key: 'conversions_booking', label: 'CV (予約)',   format: fmt    },
  { key: 'cpa',                 label: 'CPA',         format: fmtYen },
  { key: 'cpc',                 label: 'CPC',         format: fmtYen },
  { key: 'ctr',                 label: 'CTR',         format: fmtPct },
  { key: 'cvr',                 label: 'CVR',         format: fmtPct },
];

const MONTH_LABELS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

const monthLabel = (key) => {
  const [y, mo] = key.split('-');
  return `${y}年${Number(mo)}月`;
};

export default function OverallSummary() {
  const [allRows,       setAllRows]       = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [loading,       setLoading]       = useState(true);
  const [dropdownOpen,  setDropdownOpen]  = useState(false);
  const [pickerView,    setPickerView]    = useState('month');
  const [pickerYear,    setPickerYear]    = useState(() => Number(currentMonthKey().split('-')[0]));
  const dropdownRef = useRef(null);

  // 1年分まとめて取得
  const fetchStart = (() => {
    const d = new Date(); d.setMonth(d.getMonth() - 11); d.setDate(1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
  })();
  const fetchEnd = todayStr();

  useEffect(() => {
    setLoading(true);
    metricsAPI.get({ start_date: fetchStart, end_date: fetchEnd })
      .then(res => {
        // 同じ日付のデータを全キャンペーン合算
        const dateMap = {};
        for (const row of res.data) {
          const dateKey = String(row.date || '').split('T')[0];
          if (!dateMap[dateKey]) {
            dateMap[dateKey] = { date: row.date, spend: 0, impressions: 0, clicks: 0, conversions_meta: 0, conversions_booking: 0 };
          }
          const d = dateMap[dateKey];
          d.spend               += Number(row.spend || 0);
          d.impressions         += Number(row.impressions || 0);
          d.clicks              += Number(row.clicks || 0);
          d.conversions_meta    += Number(row.conversions_meta || 0);
          d.conversions_booking += Number(row.conversions_booking || 0);
        }
        const rows = Object.values(dateMap).map(d => ({
          ...d,
          cpa: d.conversions_meta > 0 ? d.spend / d.conversions_meta : 0,
          cpc: d.clicks > 0 ? d.spend / d.clicks : 0,
          ctr: d.impressions > 0 ? (d.clicks / d.impressions * 100) : 0,
          cvr: d.clicks > 0 ? (d.conversions_meta / d.clicks * 100) : 0,
        })).sort((a, b) => String(b.date).localeCompare(String(a.date)));
        setAllRows(rows);
      })
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
        setPickerView('month');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // 月リスト（データがある月）
  const monthList = (() => {
    const keys = new Set();
    allRows.forEach(row => {
      const s = String(row.date || '').split('T')[0];
      const [y, mo] = s.split('-');
      keys.add(`${y}-${mo}`);
    });
    return Array.from(keys).sort((a, b) => b.localeCompare(a));
  })();

  // 選択月のデータ
  const rows = allRows.filter(row => {
    const s = String(row.date || '').split('T')[0];
    const [y, mo] = s.split('-');
    return `${y}-${mo}` === selectedMonth;
  });

  // 選択月の合計
  const totals = rows.reduce((acc, row) => {
    acc.spend               += Number(row.spend || 0);
    acc.impressions         += Number(row.impressions || 0);
    acc.clicks              += Number(row.clicks || 0);
    acc.conversions_meta    += Number(row.conversions_meta || 0);
    acc.conversions_booking += Number(row.conversions_booking || 0);
    return acc;
  }, { spend: 0, impressions: 0, clicks: 0, conversions_meta: 0, conversions_booking: 0 });
  totals.cpa = totals.conversions_meta > 0 ? totals.spend / totals.conversions_meta : 0;
  totals.cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
  totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions * 100) : 0;
  totals.cvr = totals.clicks > 0 ? (totals.conversions_meta / totals.clicks * 100) : 0;
  const totalCV = totals.conversions_meta + totals.conversions_booking;

  const cmk = currentMonthKey();
  const yearList = [...new Set(monthList.map(k => Number(k.split('-')[0])))].sort((a, b) => b - a);
  const monthsInYear = monthList.filter(k => k.startsWith(`${pickerYear}-`));

  const openDropdown = () => {
    const y = Number(selectedMonth.split('-')[0]);
    setPickerYear(y);
    setPickerView('month');
    setDropdownOpen(o => !o);
  };

  return (
    <div style={{ padding: '2rem' }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <div style={{ width: '4px', height: '28px', borderRadius: '4px', background: 'linear-gradient(180deg,#3b82f6,#6366f1)' }} />
            <h1 style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              全キャンペーン合計
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginLeft: '1rem' }}>すべてのキャンペーンを合算した日別パフォーマンスデータ</p>
        </div>

        {/* 月選択ドロップダウン */}
        {!loading && monthList.length > 0 && (
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={openDropdown}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer',
                border: `1.5px solid ${dropdownOpen ? '#3b82f6' : '#e2e8f0'}`,
                backgroundColor: dropdownOpen ? '#f8fafc' : '#ffffff',
                color: '#1e293b', fontSize: '0.875rem', fontWeight: '600',
                boxShadow: dropdownOpen ? '0 0 0 3px rgba(59,130,246,0.1)' : '0 1px 3px rgba(0,0,0,0.06)',
                transition: 'all 0.15s', minWidth: '160px', justifyContent: 'space-between'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={14} style={{ color: '#3b82f6' }} />
                {monthLabel(selectedMonth)}
                {selectedMonth === cmk && (
                  <span style={{ fontSize: '0.62rem', backgroundColor: '#dbeafe', color: '#3b82f6', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: '700' }}>
                    今月
                  </span>
                )}
              </span>
              <ChevronDown size={14} style={{ color: '#94a3b8', transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>

            {dropdownOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                backgroundColor: '#ffffff', border: '1px solid #e2e8f0',
                borderRadius: '12px', boxShadow: '0 12px 32px rgba(0,0,0,0.1)',
                zIndex: 50, minWidth: '220px', padding: '0.5rem',
                animation: 'fadeInDown 0.15s ease'
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.375rem 0.5rem 0.5rem',
                  borderBottom: '1px solid #f1f5f9', marginBottom: '0.375rem'
                }}>
                  <button
                    onClick={() => setPickerView(v => v === 'year' ? 'month' : 'year')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.3rem',
                      padding: '0.25rem 0.5rem', borderRadius: '6px', border: 'none',
                      backgroundColor: pickerView === 'year' ? '#eff6ff' : '#f8fafc',
                      color: pickerView === 'year' ? '#3b82f6' : '#374151',
                      fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer'
                    }}
                  >
                    {pickerYear}年
                    <ChevronDown size={12} style={{ transform: pickerView === 'year' ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', color: '#94a3b8' }} />
                  </button>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    {pickerView === 'year' ? '年を選択' : '月を選択'}
                  </span>
                </div>

                {pickerView === 'year' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '3px', padding: '0.125rem' }}>
                    {yearList.map(y => {
                      const isSelected = y === pickerYear;
                      const isCurrent  = y === Number(cmk.split('-')[0]);
                      return (
                        <button key={y} onClick={() => { setPickerYear(y); setPickerView('month'); }}
                          style={{
                            padding: '0.5rem', borderRadius: '7px', border: 'none', cursor: 'pointer',
                            fontSize: '0.85rem', fontWeight: isSelected ? '700' : isCurrent ? '600' : '400',
                            backgroundColor: isSelected ? '#3b82f6' : isCurrent ? '#eff6ff' : 'transparent',
                            color: isSelected ? '#fff' : isCurrent ? '#3b82f6' : '#374151',
                            boxShadow: isSelected ? '0 2px 6px rgba(59,130,246,0.3)' : 'none',
                          }}
                          onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                          onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = isCurrent ? '#eff6ff' : 'transparent'; }}
                        >
                          {y}
                        </button>
                      );
                    })}
                  </div>
                )}

                {pickerView === 'month' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '3px', padding: '0.125rem' }}>
                    {MONTH_LABELS.map((label, i) => {
                      const mo  = i + 1;
                      const key = `${pickerYear}-${String(mo).padStart(2,'0')}`;
                      const hasData    = monthsInYear.includes(key);
                      const isSelected = key === selectedMonth;
                      const isCurrent  = key === cmk;
                      return (
                        <button key={mo}
                          onClick={() => { if (hasData) { setSelectedMonth(key); setDropdownOpen(false); setPickerView('month'); } }}
                          disabled={!hasData}
                          style={{
                            padding: '0.5rem', borderRadius: '7px', border: 'none',
                            cursor: hasData ? 'pointer' : 'default',
                            fontSize: '0.85rem', fontWeight: isSelected ? '700' : isCurrent ? '600' : '400',
                            backgroundColor: isSelected ? '#3b82f6' : isCurrent ? '#eff6ff' : 'transparent',
                            color: isSelected ? '#fff' : !hasData ? '#d1d5db' : isCurrent ? '#3b82f6' : '#374151',
                            boxShadow: isSelected ? '0 2px 6px rgba(59,130,246,0.3)' : 'none',
                          }}
                          onMouseEnter={e => { if (hasData && !isSelected) e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                          onMouseLeave={e => { if (hasData && !isSelected) e.currentTarget.style.backgroundColor = isCurrent ? '#eff6ff' : 'transparent'; }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            <style>{`@keyframes fadeInDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
          </div>
        )}
      </div>

      {/* サマリーカード */}
      {rows.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(145px,1fr))', gap: '0.875rem', marginBottom: '1.25rem' }}>
          {[
            { label: '消化金額', value: fmtYen(totals.spend), color: '#3b82f6', bg: '#eff6ff' },
            { label: 'CV合計',   value: fmt(totalCV),          color: '#10b981', bg: '#f0fdf4' },
            { label: 'CPA',      value: fmtYen(totals.cpa),   color: '#f59e0b', bg: '#fffbeb' },
            { label: 'CTR',      value: fmtPct(totals.ctr),   color: '#8b5cf6', bg: '#faf5ff' },
            { label: 'CVR',      value: fmtPct(totals.cvr),   color: '#ec4899', bg: '#fdf2f8' },
          ].map(item => (
            <div key={item.label} style={{ backgroundColor: item.bg, border: `1px solid ${item.color}22`, borderRadius: '10px', padding: '0.875rem 1rem' }}>
              <div style={{ fontSize: '0.7rem', color: item.color, marginBottom: '0.3rem', fontWeight: '600' }}>{item.label}</div>
              <div style={{ fontSize: '1.15rem', fontWeight: '700', color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* テーブル */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '6px', background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
            <TrendingUp size={12} color="white" />
          </span>
          <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>
            {loading ? '読み込み中...' : monthLabel(selectedMonth)}の日別データ
          </span>
          {!loading && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>{rows.length}日分</span>}
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>読み込み中...</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>データがありません</div>
        ) : (
          <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 320px)' }}>
            <table className="table" style={{ minWidth: '900px' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th style={{ textAlign: 'left', position: 'sticky', left: 0, top: 0, backgroundColor: 'var(--bg-tertiary)', zIndex: 11, minWidth: '110px' }}>日付</th>
                  {METRICS.map(m => <th key={m.key} style={{ whiteSpace: 'nowrap', position: 'sticky', top: 0, backgroundColor: 'var(--bg-tertiary)', zIndex: 10 }}>{m.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {/* 月合計行 */}
                <tr style={{ backgroundColor: '#eff6ff' }}>
                  <td style={{ position: 'sticky', left: 0, backgroundColor: '#eff6ff', fontWeight: '700', color: '#3b82f6', fontSize: '0.78rem', zIndex: 1 }}>月合計</td>
                  {METRICS.map(m => (
                    <td key={m.key} style={{ color: '#3b82f6', fontWeight: '700' }}>{m.format(totals[m.key])}</td>
                  ))}
                </tr>
                {/* 日別行 */}
                {rows.map(row => (
                  <tr key={String(row.date).split('T')[0]}>
                    <td style={{ position: 'sticky', left: 0, backgroundColor: 'var(--bg-secondary)', zIndex: 1, fontWeight: '500', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                      {fmtDate(row.date)}
                    </td>
                    {METRICS.map(m => (
                      <td key={m.key} style={{ whiteSpace: 'nowrap' }}>
                        {m.format(row[m.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
