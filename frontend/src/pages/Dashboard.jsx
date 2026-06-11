import React, { useState, useEffect, useRef } from 'react';
import { format, subDays, eachDayOfInterval, parseISO } from 'date-fns';
import { metricsAPI, campaignAPI, metaAPI } from '../utils/api';
import DatePicker from '../components/DatePicker';
import {
  TrendingUp,
  DollarSign,
  Eye,
  MousePointerClick,
  Target,
  ArrowUp,
  ArrowDown,
  ChevronDown,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const labelStyle = {
  display: 'block', marginBottom: '0.375rem',
  fontSize: '0.7rem', fontWeight: '600',
  color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em'
};

const Dashboard = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState([]); // 空 = すべて
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [summary, setSummary] = useState(null);
  const [campaignBreakdown, setCampaignBreakdown] = useState([]);
  const [dailyData, setDailyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    fetchData(selectedCampaigns);
  }, [startDate, endDate, selectedCampaigns]);

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await campaignAPI.getAll();
      setCampaigns(response.data);
    } catch (error) {
      console.error('キャンペーン取得エラー:', error);
    }
  };

  const fetchData = async (campaignFilter = selectedCampaigns) => {
    setLoading(true);
    try {
      const params = {
        start_date: startDate,
        end_date: endDate,
        ...(campaignFilter.length > 0 && { campaign_ids: campaignFilter.join(',') }),
      };

      const [summaryRes, dailyRes] = await Promise.all([
        metricsAPI.getSummary(params),
        metricsAPI.get(params)
      ]);

      // キャンペーン別内訳を保存（ホバー表示用）
      setCampaignBreakdown(summaryRes.data);

      // サマリーデータの集計
      const totalSummary = summaryRes.data.reduce((acc, item) => ({
        total_spend: (acc.total_spend || 0) + parseFloat(item.total_spend || 0),
        total_impressions: (acc.total_impressions || 0) + parseInt(item.total_impressions || 0),
        total_clicks: (acc.total_clicks || 0) + parseInt(item.total_clicks || 0),
        total_conversions_meta: (acc.total_conversions_meta || 0) + parseInt(item.total_conversions_meta || 0),
        total_conversions_booking: (acc.total_conversions_booking || 0) + parseInt(item.total_conversions_booking || 0)
      }), {});

      // KPI計算
      const totalCV = (totalSummary.total_conversions_meta || 0) + (totalSummary.total_conversions_booking || 0);
      totalSummary.avg_cpa = (totalSummary.total_conversions_booking || 0) > 0 ? totalSummary.total_spend / totalSummary.total_conversions_booking : 0;
      totalSummary.avg_cpc = (totalSummary.total_clicks || 0) > 0 ? totalSummary.total_spend / totalSummary.total_clicks : 0;
      totalSummary.avg_ctr = (totalSummary.total_impressions || 0) > 0 ? (totalSummary.total_clicks / totalSummary.total_impressions * 100) : 0;
      totalSummary.avg_cvr = (totalSummary.total_clicks || 0) > 0 ? (totalCV / totalSummary.total_clicks * 100) : 0;

      setSummary(totalSummary);

      // 同日・複数キャンペーンの行を日付ごとに合算
      const aggregated = {};
      dailyRes.data.forEach(d => {
        const key = format(parseISO(d.date), 'yyyy-MM-dd');
        if (!aggregated[key]) {
          aggregated[key] = { date: key, spend: 0, clicks: 0, conversions_meta: 0 };
        }
        aggregated[key].spend += parseFloat(d.spend || 0);
        aggregated[key].clicks += parseInt(d.clicks || 0);
        aggregated[key].conversions_meta += parseInt(d.conversions_meta || 0);
      });

      // 開始日〜終了日の全日付を埋めてデータが無い日は0
      const allDays = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) })
        .map(d => {
          const key = format(d, 'yyyy-MM-dd');
          return aggregated[key] || { date: key, spend: 0, clicks: 0, conversions_meta: 0 };
        });
      setDailyData(allDays);
    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncMeta = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await metaAPI.sync(startDate, endDate);
      setSyncMessage({ type: 'success', text: res.data.message });
      await fetchData();
    } catch (error) {
      const detail = error.response?.data?.detail || error.response?.data?.error || 'エラーが発生しました';
      setSyncMessage({ type: 'error', text: detail });
    } finally {
      setSyncing(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value || 0);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('ja-JP').format(value || 0);
  };

  const StatCard = ({ icon: Icon, label, value, subValue, accent, bg, breakdownKey, breakdownFormat }) => {
    const [hovered, setHovered] = useState(false);
    const rows = campaignBreakdown.filter(r => parseFloat(r[breakdownKey] || 0) > 0);
    const showTooltip = hovered && rows.length > 1;

    return (
      <div
        style={{ position: 'relative' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div style={{
          backgroundColor: '#ffffff', borderRadius: '14px',
          border: `1px solid ${hovered ? accent + '44' : '#f1f5f9'}`,
          padding: '1.25rem 1.5rem',
          boxShadow: hovered ? `0 4px 16px ${accent}22` : '0 1px 4px rgba(0,0,0,0.05)',
          display: 'flex', alignItems: 'center', gap: '1rem',
          transition: 'all 0.15s',
        }}>
          <div style={{
            width: '46px', height: '46px', borderRadius: '12px',
            backgroundColor: bg, display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0
          }}>
            <Icon size={20} style={{ color: accent }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>
              {label}
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: '700', color: '#1e293b', lineHeight: 1.1 }}>
              {value}
            </div>
            {subValue && (
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                {subValue}
              </div>
            )}
          </div>
        </div>

        {/* ホバー時キャンペーン別内訳 */}
        {showTooltip && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 300,
            backgroundColor: '#fff', borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            padding: '0.75rem', minWidth: '240px',
            animation: 'fadeInDown 0.12s ease',
          }}>
            <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
              キャンペーン別内訳
            </div>
            {rows.map(r => (
              <div key={r.campaign_id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.3rem 0', borderBottom: '1px solid #f8fafc',
                gap: '0.5rem',
              }}>
                <span style={{ fontSize: '0.78rem', color: '#475569', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.campaign_name}
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1e293b', flexShrink: 0 }}>
                  {breakdownFormat(parseFloat(r[breakdownKey] || 0))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading && !summary) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>データを読み込んでいます...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px',
          background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(99,102,241,0.3)', flexShrink: 0
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
            <line x1="2" y1="20" x2="22" y2="20"/>
          </svg>
        </div>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1.2 }}>
            ダッシュボード
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            広告パフォーマンスの概要
          </p>
        </div>
      </div>

      {/* フィルター */}
      <div className="card" style={{ marginBottom: '2rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '0', flexWrap: 'wrap', alignItems: 'stretch' }}>

          {/* キャンペーン複数選択 */}
          <div style={{ flex: '0 0 240px', padding: '0 1rem 0 0' }} ref={dropdownRef}>
            <label style={labelStyle}>キャンペーン</label>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setDropdownOpen(o => !o)}
                style={{
                  width: '100%', height: '38px', padding: '0 2rem 0 0.875rem',
                  border: '1px solid var(--border-color)', borderRadius: '6px',
                  backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)',
                  fontSize: '0.875rem', cursor: 'pointer', textAlign: 'left',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {selectedCampaigns.length === 0
                    ? 'すべてのキャンペーン'
                    : selectedCampaigns.length === 1
                      ? campaigns.find(c => String(c.campaign_id) === selectedCampaigns[0])?.campaign_name || '1件選択'
                      : `${selectedCampaigns.length}件選択`}
                </span>
              </button>
              <ChevronDown size={13} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />

              {dropdownOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 100,
                  backgroundColor: '#fff', border: '1px solid var(--border-color)',
                  borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                  minWidth: '260px', maxHeight: '260px', overflowY: 'auto',
                }}>
                  {/* すべて */}
                  <div
                    onClick={() => setSelectedCampaigns([])}
                    style={{
                      padding: '0.6rem 0.875rem', cursor: 'pointer', display: 'flex',
                      alignItems: 'center', gap: '0.625rem', fontSize: '0.875rem',
                      borderBottom: '1px solid var(--border-color)',
                      color: selectedCampaigns.length === 0 ? '#2563eb' : 'var(--text-primary)',
                      fontWeight: selectedCampaigns.length === 0 ? '600' : '400',
                      backgroundColor: selectedCampaigns.length === 0 ? '#eff6ff' : 'transparent',
                    }}
                    onMouseEnter={e => { if (selectedCampaigns.length !== 0) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                    onMouseLeave={e => { if (selectedCampaigns.length !== 0) e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <span style={{
                      width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0,
                      border: selectedCampaigns.length === 0 ? '2px solid #2563eb' : '1.5px solid #cbd5e1',
                      backgroundColor: selectedCampaigns.length === 0 ? '#2563eb' : '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {selectedCampaigns.length === 0 && <svg width="9" height="9" viewBox="0 0 10 8" fill="none"><polyline points="1,4 4,7 9,1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </span>
                    すべてのキャンペーン
                  </div>
                  {campaigns.map(c => {
                    const id = String(c.campaign_id);
                    const checked = selectedCampaigns.includes(id);
                    const toggle = () => setSelectedCampaigns(prev =>
                      checked ? prev.filter(x => x !== id) : [...prev, id]
                    );
                    const statusCfg = {
                      active:  { label: '運用中', bg: '#dcfce7', color: '#16a34a' },
                      paused:  { label: '停止中', bg: '#fee2e2', color: '#dc2626' },
                      testing: { label: 'テスト', bg: '#fef9c3', color: '#ca8a04' },
                      ended:   { label: '終了',   bg: '#f1f5f9', color: '#64748b' },
                    };
                    const st = statusCfg[c.status] || statusCfg.ended;
                    return (
                      <div
                        key={id}
                        onClick={toggle}
                        style={{
                          padding: '0.6rem 0.875rem', cursor: 'pointer', display: 'flex',
                          alignItems: 'center', gap: '0.625rem', fontSize: '0.875rem',
                          color: checked ? '#2563eb' : 'var(--text-primary)',
                          fontWeight: checked ? '600' : '400',
                          backgroundColor: checked ? '#eff6ff' : 'transparent',
                        }}
                        onMouseEnter={e => { if (!checked) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                        onMouseLeave={e => { if (!checked) e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <span style={{
                          width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0,
                          border: checked ? '2px solid #2563eb' : '1.5px solid #cbd5e1',
                          backgroundColor: checked ? '#2563eb' : '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {checked && <svg width="9" height="9" viewBox="0 0 10 8" fill="none"><polyline points="1,4 4,7 9,1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{c.campaign_name}</span>
                        <span style={{
                          fontSize: '0.65rem', fontWeight: '600', padding: '0.1rem 0.4rem',
                          borderRadius: '99px', backgroundColor: st.bg, color: st.color,
                          flexShrink: 0, letterSpacing: '0.02em',
                        }}>{st.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 縦区切り */}
          <div style={{ width: '1px', backgroundColor: '#f1f5f9', margin: '0 1rem', flexShrink: 0 }} />

          {/* 日付範囲 */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', flex: '1', minWidth: '280px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>開始日</label>
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                placeholder="開始日"
                maxDate={endDate || format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            <div style={{ color: '#d1d5db', paddingBottom: '9px', flexShrink: 0, fontSize: '0.9rem' }}>—</div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>終了日</label>
              <DatePicker
                value={endDate}
                onChange={setEndDate}
                placeholder="終了日"
                minDate={startDate || undefined}
                maxDate={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
          </div>

          {/* 縦区切り */}
          <div style={{ width: '1px', backgroundColor: '#f1f5f9', margin: '0 1rem', flexShrink: 0 }} />

          {/* クイック選択 */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <label style={labelStyle}>クイック選択</label>
            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
              {[
                { label: '今週', action: () => { setStartDate(format(subDays(new Date(), 6), 'yyyy-MM-dd')); setEndDate(format(new Date(), 'yyyy-MM-dd')); } },
                { label: '先週', action: () => { setStartDate(format(subDays(new Date(), 13), 'yyyy-MM-dd')); setEndDate(format(subDays(new Date(), 7), 'yyyy-MM-dd')); } },
                { label: '今月', action: () => { const d = new Date(); setStartDate(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`); setEndDate(format(new Date(), 'yyyy-MM-dd')); } },
                { label: '先月', action: () => { const d = new Date(); d.setDate(0); setEndDate(format(d, 'yyyy-MM-dd')); d.setDate(1); setStartDate(format(d, 'yyyy-MM-dd')); } },
                { label: '30日', action: () => { setStartDate(format(subDays(new Date(), 29), 'yyyy-MM-dd')); setEndDate(format(new Date(), 'yyyy-MM-dd')); } },
              ].map(q => (
                <button
                  key={q.label}
                  onClick={q.action}
                  style={{
                    padding: '0 0.7rem', height: '38px', borderRadius: '7px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff', color: '#64748b', fontSize: '0.8rem',
                    fontWeight: '500', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#eff6ff'; e.currentTarget.style.borderColor = '#93c5fd'; e.currentTarget.style.color = '#3b82f6'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Meta同期 */}
      <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          onClick={syncMeta}
          disabled={syncing}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.45rem 1rem', borderRadius: '8px',
            background: syncing ? '#94a3b8' : 'linear-gradient(135deg, #1877f2, #0d65d9)',
            color: '#fff', border: 'none', fontSize: '0.825rem', fontWeight: '600',
            cursor: syncing ? 'not-allowed' : 'pointer',
            boxShadow: syncing ? 'none' : '0 2px 6px rgba(24,119,242,0.35)',
            transition: 'all 0.15s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
          {syncing ? '同期中...' : 'Meta データ同期'}
        </button>
        {syncMessage && (
          <span style={{
            fontSize: '0.8rem', fontWeight: '500',
            color: syncMessage.type === 'success' ? '#10b981' : '#ef4444',
          }}>
            {syncMessage.type === 'success' ? '✓ ' : '✗ '}{syncMessage.text}
          </span>
        )}
      </div>

      {/* サマリーカード + KPI 一体化 */}
      {summary && (
        <>
          {/* メイン指標 4枚 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '1rem' }}>
            <StatCard icon={DollarSign} label="消化金額"
              value={formatCurrency(summary.total_spend)}
              accent="#3b82f6" bg="#eff6ff"
              breakdownKey="total_spend"
              breakdownFormat={v => `¥${Math.round(v).toLocaleString()}`} />
            <StatCard icon={Eye} label="インプレッション"
              value={formatNumber(summary.total_impressions)}
              accent="#10b981" bg="#f0fdf4"
              breakdownKey="total_impressions"
              breakdownFormat={v => Math.round(v).toLocaleString()} />
            <StatCard icon={MousePointerClick} label="クリック数"
              value={formatNumber(summary.total_clicks)}
              subValue={`CTR: ${summary.avg_ctr.toFixed(2)}%`}
              accent="#f59e0b" bg="#fffbeb"
              breakdownKey="total_clicks"
              breakdownFormat={v => Math.round(v).toLocaleString()} />
            <StatCard icon={Target} label="コンバージョン"
              value={formatNumber(summary.total_conversions_meta + summary.total_conversions_booking)}
              subValue={`Meta: ${summary.total_conversions_meta} / 予約: ${summary.total_conversions_booking}`}
              accent="#ef4444" bg="#fef2f2"
              breakdownKey="total_conversions_meta"
              breakdownFormat={v => `${Math.round(v).toLocaleString()} CV`} />
          </div>

          {/* KPI 帯 */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
            gap: '1rem', marginBottom: '1.5rem'
          }}>
            {[
              { label: 'CPA', value: formatCurrency(summary.avg_cpa), accent: '#6366f1', bg: '#f5f3ff' },
              { label: 'CPC', value: formatCurrency(summary.avg_cpc), accent: '#0891b2', bg: '#ecfeff' },
              { label: 'CTR', value: `${summary.avg_ctr.toFixed(2)}%`, accent: '#d97706', bg: '#fffbeb' },
              { label: 'CVR', value: `${summary.avg_cvr.toFixed(2)}%`, accent: '#16a34a', bg: '#f0fdf4' },
            ].map(k => (
              <div key={k.label} style={{
                backgroundColor: k.bg, borderRadius: '12px',
                border: `1px solid ${k.accent}18`,
                padding: '1rem 1.25rem',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <span style={{ fontSize: '0.72rem', fontWeight: '700', color: k.accent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {k.label}
                </span>
                <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b' }}>
                  {k.value}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* トレンドグラフ */}
      <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.5rem' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '28px', height: '28px', borderRadius: '8px',
            background: 'linear-gradient(135deg,#3b82f6,#6366f1)'
          }}>
            <TrendingUp size={14} color="white" />
          </span>
          <h2 style={{ fontSize: '1rem', fontWeight: '700', color: '#1e293b' }}>日別トレンド</h2>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis
              dataKey="date"
              stroke="var(--text-secondary)"
              tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
              interval={dailyData.length <= 7 ? 0 : dailyData.length <= 14 ? 1 : dailyData.length <= 31 ? 2 : Math.floor(dailyData.length / 10)}
              tickFormatter={v => {
                const d = new Date(v);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
            />
            {/* 左軸：消化金額（データ最大値に応じて動的スケール） */}
            <YAxis
              yAxisId="spend"
              orientation="left"
              stroke="#3b82f6"
              tick={{ fill: '#3b82f6', fontSize: 11 }}
              domain={[0, dataMax => Math.ceil(dataMax * 1.25 / 10000) * 10000 || 50000]}
              tickFormatter={v => v === 0 ? '0' : v >= 10000 ? `${v/10000}万` : v.toLocaleString()}
              width={56}
            />
            {/* 右軸：クリック数・CV */}
            <YAxis
              yAxisId="count"
              orientation="right"
              stroke="#10b981"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              domain={[0, dataMax => Math.ceil(dataMax * 1.5) || 10]}
              tickFormatter={v => v.toLocaleString()}
              width={48}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px'
              }}
              formatter={(value, name) => {
                if (name === '消化金額') return [`¥${value.toLocaleString()}`, name];
                return [value.toLocaleString(), name];
              }}
            />
            <Legend />
            <Line
              yAxisId="spend"
              type="monotone"
              dataKey="spend"
              stroke="#3b82f6"
              name="消化金額"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="count"
              type="monotone"
              dataKey="clicks"
              stroke="#10b981"
              name="クリック数"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="count"
              type="monotone"
              dataKey="conversions_meta"
              stroke="#f59e0b"
              name="CV (Meta)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Dashboard;
