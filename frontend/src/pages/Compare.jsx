import React, { useState, useCallback } from 'react';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { metricsAPI, campaignAPI } from '../utils/api';
import DatePicker from '../components/DatePicker';
import { TrendingUp, TrendingDown, Minus, RefreshCw, ChevronDown } from 'lucide-react';

// ---- フォーマッター ----
const fmtYen = (v) => `¥${new Intl.NumberFormat('ja-JP').format(Math.round(Number(v) || 0))}`;
const fmtNum = (v) => new Intl.NumberFormat('ja-JP').format(Math.round(Number(v) || 0));
const fmtPct = (v) => `${(Number(v) || 0).toFixed(2)}%`;

const METRICS = [
  { key: 'total_spend',               label: '消化金額',          format: fmtYen,  higher: 'neutral' },
  { key: 'total_impressions',         label: 'インプレッション',  format: fmtNum,  higher: 'good' },
  { key: 'total_clicks',              label: 'クリック数',        format: fmtNum,  higher: 'good' },
  { key: 'total_conversions_meta',    label: 'CV（Meta）',        format: fmtNum,  higher: 'good' },
  { key: 'total_conversions_booking', label: 'CV（予約）',        format: fmtNum,  higher: 'good' },
  { key: 'total_cv',                  label: 'CV合計',            format: fmtNum,  higher: 'good' },
  { key: 'avg_cpa',                   label: 'CPA',               format: fmtYen,  higher: 'bad' },
  { key: 'avg_cpc',                   label: 'CPC',               format: fmtYen,  higher: 'bad' },
  { key: 'avg_ctr',                   label: 'CTR',               format: fmtPct,  higher: 'good' },
  { key: 'avg_cvr',                   label: 'CVR',               format: fmtPct,  higher: 'good' },
];

const calcSummary = (rows) => {
  const t = rows.reduce((acc, row) => {
    acc.total_spend               += Number(row.spend || 0);
    acc.total_impressions         += Number(row.impressions || 0);
    acc.total_clicks              += Number(row.clicks || 0);
    acc.total_conversions_meta    += Number(row.conversions_meta || 0);
    acc.total_conversions_booking += Number(row.conversions_booking || 0);
    return acc;
  }, { total_spend:0, total_impressions:0, total_clicks:0, total_conversions_meta:0, total_conversions_booking:0 });

  t.total_cv  = t.total_conversions_meta + t.total_conversions_booking;
  t.avg_cpa   = t.total_cv     > 0 ? t.total_spend / t.total_cv             : 0;
  t.avg_cpc   = t.total_clicks > 0 ? t.total_spend / t.total_clicks         : 0;
  t.avg_ctr   = t.total_impressions > 0 ? (t.total_clicks / t.total_impressions * 100) : 0;
  t.avg_cvr   = t.total_clicks > 0 ? (t.total_cv / t.total_clicks * 100)   : 0;
  return t;
};

const diff = (a, b) => (b === 0 ? null : ((a - b) / Math.abs(b)) * 100);

const today   = () => format(new Date(), 'yyyy-MM-dd');
const daysAgo = (n) => format(subDays(new Date(), n), 'yyyy-MM-dd');

const QUICK = [
  { label: '今月 vs 先月', apply: () => {
    const now = new Date();
    return {
      after:  { start: format(startOfMonth(now), 'yyyy-MM-dd'), end: today() },
      before: { start: format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd'), end: format(endOfMonth(subMonths(now, 1)), 'yyyy-MM-dd') }
    };
  }},
  { label: '直近7日 vs 前7日', apply: () => ({
    after:  { start: daysAgo(6),  end: today() },
    before: { start: daysAgo(13), end: daysAgo(7) }
  })},
  { label: '直近30日 vs 前30日', apply: () => ({
    after:  { start: daysAgo(29), end: today() },
    before: { start: daysAgo(59), end: daysAgo(30) }
  })},
];

export default function Compare() {
  const [afterStart,  setAfterStart]  = useState(daysAgo(6));
  const [afterEnd,    setAfterEnd]    = useState(today());
  const [beforeStart, setBeforeStart] = useState(daysAgo(13));
  const [beforeEnd,   setBeforeEnd]   = useState(daysAgo(7));
  const [campaign,    setCampaign]    = useState('all');
  const [campaigns,   setCampaigns]   = useState([]);
  const [afterData,   setAfterData]   = useState(null);
  const [beforeData,  setBeforeData]  = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [compared,    setCompared]    = useState(false);

  React.useEffect(() => {
    campaignAPI.getAll().then(r => setCampaigns(r.data)).catch(() => {});
  }, []);

  const run = useCallback(async () => {
    if (!afterStart || !afterEnd || !beforeStart || !beforeEnd) return;
    setLoading(true);
    try {
      const base = campaign !== 'all' ? { campaign_id: campaign } : {};
      const [aRes, bRes] = await Promise.all([
        metricsAPI.get({ ...base, start_date: afterStart,  end_date: afterEnd }),
        metricsAPI.get({ ...base, start_date: beforeStart, end_date: beforeEnd }),
      ]);
      setAfterData(calcSummary(aRes.data));
      setBeforeData(calcSummary(bRes.data));
      setCompared(true);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [afterStart, afterEnd, beforeStart, beforeEnd, campaign]);

  // 4つの日付が揃ったら自動比較
  React.useEffect(() => {
    if (afterStart && afterEnd && beforeStart && beforeEnd) {
      run();
    }
  }, [afterStart, afterEnd, beforeStart, beforeEnd, campaign]);

  const applyQuick = (q) => {
    const { after, before } = q.apply();
    setAfterStart(after.start); setAfterEnd(after.end);
    setBeforeStart(before.start); setBeforeEnd(before.end);
  };

  const sectionLabel = {
    fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.4rem', display: 'block'
  };

  return (
    <div style={{ padding: '2rem' }}>
      {/* ページヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px',
          background: 'linear-gradient(135deg, #10b981, #06b6d4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(16,185,129,0.3)', flexShrink: 0
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
            <polyline points="16 7 22 7 22 13"/>
          </svg>
        </div>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1e293b', lineHeight: 1.2 }}>期間比較</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.2rem' }}>2つの期間を選択して広告パフォーマンスを比較</p>
        </div>
      </div>

      {/* 設定カード */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem 1.5rem', overflow: 'visible' }}>

        {/* 上段：キャンペーン + クイック選択 */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.25rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ minWidth: '200px', flex: '0 0 200px' }}>
            <span style={sectionLabel}>キャンペーン</span>
            <div style={{ position: 'relative' }}>
              <select
                className="input" value={campaign}
                onChange={e => setCampaign(e.target.value)}
                style={{ appearance: 'none', paddingRight: '2rem', cursor: 'pointer', height: '38px' }}
              >
                <option value="all">すべて</option>
                {campaigns.map(c => <option key={c.campaign_id} value={c.campaign_id}>{c.campaign_name}</option>)}
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
            </div>
          </div>

          <div style={{ width: '1px', height: '38px', backgroundColor: '#f1f5f9', flexShrink: 0 }} />

          <div>
            <span style={sectionLabel}>クイック選択</span>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {QUICK.map(q => (
                <button key={q.label} onClick={() => applyQuick(q)}
                  style={{
                    padding: '0 0.875rem', height: '38px', borderRadius: '7px', border: '1px solid #e2e8f0',
                    backgroundColor: '#fff', color: '#475569', fontSize: '0.82rem',
                    fontWeight: '500', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#eff6ff'; e.currentTarget.style.borderColor = '#93c5fd'; e.currentTarget.style.color = '#3b82f6'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; }}
                >{q.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* 下段：期間選択 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr auto', gap: '1rem', alignItems: 'start' }}>

          {/* 比較前 */}
          <div style={{
            backgroundColor: '#f8fafc', borderRadius: '12px',
            border: '1.5px solid #e2e8f0', padding: '1rem 1.25rem',
            position: 'relative', zIndex: 10, overflow: 'visible'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#94a3b8', flexShrink: 0 }} />
              <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>比較前</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: '600' }}>開始日</div>
                <DatePicker value={beforeStart} onChange={setBeforeStart} placeholder="開始日を選択" maxDate={beforeEnd} />
              </div>
              <span style={{ color: '#d1d5db', flexShrink: 0, paddingTop: '1.2rem' }}>—</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: '600' }}>終了日</div>
                <DatePicker value={beforeEnd} onChange={setBeforeEnd} placeholder="終了日を選択" minDate={beforeStart} />
              </div>
            </div>
            {beforeStart && beforeEnd && (
              <div style={{ marginTop: '0.625rem', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>
                {beforeStart} 〜 {beforeEnd}
              </div>
            )}
          </div>

          {/* 区切り */}
          <div style={{ width: '1px', backgroundColor: '#e2e8f0', alignSelf: 'stretch', margin: '0 0.25rem' }} />

          {/* 比較後 */}
          <div style={{
            backgroundColor: '#eff6ff', borderRadius: '12px',
            border: '1.5px solid #bfdbfe', padding: '1rem 1.25rem',
            position: 'relative', zIndex: 20, overflow: 'visible'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3b82f6', flexShrink: 0 }} />
              <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.06em' }}>比較後</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.68rem', color: '#93c5fd', marginBottom: '0.3rem', fontWeight: '600' }}>開始日</div>
                <DatePicker value={afterStart} onChange={setAfterStart} placeholder="開始日を選択" maxDate={afterEnd} />
              </div>
              <span style={{ color: '#bfdbfe', flexShrink: 0, paddingTop: '1.2rem' }}>—</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.68rem', color: '#93c5fd', marginBottom: '0.3rem', fontWeight: '600' }}>終了日</div>
                <DatePicker value={afterEnd} onChange={setAfterEnd} placeholder="終了日を選択" minDate={afterStart} />
              </div>
            </div>
            {afterStart && afterEnd && (
              <div style={{ marginTop: '0.625rem', fontSize: '0.75rem', color: '#60a5fa', textAlign: 'center' }}>
                {afterStart} 〜 {afterEnd}
              </div>
            )}
          </div>

          {/* 再比較ボタン */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', paddingTop: '2rem' }}>
            {loading && (
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} />
                比較中...
              </div>
            )}
            <button
              onClick={run}
              disabled={loading || !afterStart || !afterEnd || !beforeStart || !beforeEnd}
              title="再比較"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                padding: '0 1rem', height: '40px', borderRadius: '9px', border: 'none',
                background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
                color: '#fff', fontSize: '0.82rem', fontWeight: '700',
                cursor: (loading || !afterStart || !afterEnd || !beforeStart || !beforeEnd) ? 'not-allowed' : 'pointer',
                opacity: (loading || !afterStart || !afterEnd || !beforeStart || !beforeEnd) ? 0.5 : 1,
                boxShadow: '0 3px 10px rgba(99,102,241,0.3)',
                transition: 'all 0.15s', whiteSpace: 'nowrap'
              }}
            >
              <RefreshCw size={13} />
              再比較
            </button>
          </div>
        </div>
      </div>

      {/* 比較結果 */}
      {compared && afterData && beforeData && (
        <>
          {/* 期間ラベル */}
          {/* 期間ラベル */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.625rem',
              backgroundColor: '#f8fafc', borderRadius: '8px', padding: '0.5rem 0.875rem'
            }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#94a3b8', flexShrink: 0 }} />
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b' }}>比較前</span>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{beforeStart} 〜 {beforeEnd}</span>
            </div>
            <div style={{ width: '1px', backgroundColor: '#e2e8f0', alignSelf: 'stretch', margin: '0 0.25rem' }} />
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.625rem',
              backgroundColor: '#eff6ff', borderRadius: '8px', padding: '0.5rem 0.875rem'
            }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#3b82f6', flexShrink: 0 }} />
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#2563eb' }}>比較後</span>
              <span style={{ fontSize: '0.8rem', color: '#3b82f6' }}>{afterStart} 〜 {afterEnd}</span>
            </div>
            {/* 凡例 */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              {[{ color: '#2563eb', label: '改善' }, { color: '#ef4444', label: '悪化' }, { color: '#94a3b8', label: '変化なし' }].map(l => (
                <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: '#94a3b8' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: l.color }} />{l.label}
                </span>
              ))}
            </div>
          </div>

          {/* 指標カードグリッド */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.875rem' }}>
            {METRICS.map(m => {
              const aVal   = afterData[m.key]  || 0;
              const bVal   = beforeData[m.key] || 0;
              const d      = diff(aVal, bVal);
              const isUp   = aVal >= bVal;
              const isGood = m.higher === 'good' ? isUp : m.higher === 'bad' ? !isUp : null;
              const accent  = d === null || Math.abs(d) < 0.01 ? '#94a3b8' : isGood === true ? '#2563eb' : '#ef4444';
              const accentBg = d === null || Math.abs(d) < 0.01 ? '#f8fafc' : isGood === true ? '#eff6ff' : '#fef2f2';
              const absDiff = aVal - bVal;
              const maxVal  = Math.max(aVal, bVal) || 1;

              return (
                <div key={m.key} style={{
                  backgroundColor: '#ffffff', borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  overflow: 'hidden', transition: 'box-shadow 0.15s'
                }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'}
                >
                  {/* カードヘッダー */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.875rem 1.125rem 0.75rem',
                    borderBottom: '1px solid #f1f5f9'
                  }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>
                      {m.label}
                    </span>
                    {/* 増減率バッジ */}
                    {d !== null && Math.abs(d) >= 0.01 ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                        padding: '0.25rem 0.625rem', borderRadius: '99px',
                        backgroundColor: accentBg, color: accent,
                        fontSize: '0.8rem', fontWeight: '700'
                      }}>
                        {d > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {d > 0 ? '+' : ''}{d.toFixed(1)}%
                      </span>
                    ) : (
                      <span style={{ color: '#cbd5e1', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Minus size={12} /> —
                      </span>
                    )}
                  </div>

                  {/* 数値エリア：比較前 → 比較後 横並び */}
                  <div style={{ display: 'flex', alignItems: 'stretch', padding: '1rem 1.125rem', gap: '0' }}>

                    {/* 比較前 */}
                    <div style={{ flex: 1, paddingRight: '1rem' }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#d1d5db' }} />
                        比較前
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#94a3b8', lineHeight: 1.2 }}>
                        {m.format(bVal)}
                      </div>
                      {/* バー */}
                      <div style={{ marginTop: '0.625rem', height: '3px', backgroundColor: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(bVal/maxVal)*100}%`, backgroundColor: '#e2e8f0', borderRadius: '99px' }} />
                      </div>
                    </div>

                    {/* 矢印 + 増減 */}
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      padding: '0 0.75rem', gap: '0.25rem', flexShrink: 0
                    }}>
                      <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
                        <path d="M0 7h17M12 1l6 6-6 6" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {absDiff !== 0 && (
                        <span style={{ fontSize: '0.68rem', fontWeight: '700', color: accent, whiteSpace: 'nowrap' }}>
                          {absDiff > 0 ? '+' : ''}{m.format(absDiff)}
                        </span>
                      )}
                    </div>

                    {/* 比較後 */}
                    <div style={{ flex: 1, paddingLeft: '1rem', borderLeft: `2px solid ${accentBg === '#f8fafc' ? '#e2e8f0' : accent}44` }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: '700', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#3b82f6' }} />
                        比較後
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '800', color: accent === '#94a3b8' ? '#1e293b' : accent, lineHeight: 1.2 }}>
                        {m.format(aVal)}
                      </div>
                      {/* バー */}
                      <div style={{ marginTop: '0.625rem', height: '3px', backgroundColor: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(aVal/maxVal)*100}%`, backgroundColor: accent === '#94a3b8' ? '#94a3b8' : accent, borderRadius: '99px', transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {!compared && !loading && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#94a3b8' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'linear-gradient(135deg,#e0f2fe,#d1fae5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem'
          }}>
            <TrendingUp size={24} style={{ color: '#10b981' }} />
          </div>
          <p style={{ fontSize: '0.95rem', fontWeight: '600', color: '#64748b', marginBottom: '0.375rem' }}>期間を選択して「比較する」をクリック</p>
          <p style={{ fontSize: '0.82rem' }}>比較前後の2期間を指定すると、各指標の増減が表示されます</p>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
