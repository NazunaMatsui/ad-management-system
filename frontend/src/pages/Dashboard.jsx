import React, { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { metricsAPI, campaignAPI } from '../utils/api';
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
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [summary, setSummary] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, selectedCampaign]);

  const fetchCampaigns = async () => {
    try {
      const response = await campaignAPI.getAll();
      setCampaigns(response.data);
    } catch (error) {
      console.error('キャンペーン取得エラー:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        start_date: startDate,
        end_date: endDate,
        ...(selectedCampaign !== 'all' && { campaign_id: selectedCampaign })
      };

      const [summaryRes, dailyRes] = await Promise.all([
        metricsAPI.getSummary(params),
        metricsAPI.get(params)
      ]);

      // サマリーデータの集計
      const totalSummary = summaryRes.data.reduce((acc, item) => ({
        total_spend: (acc.total_spend || 0) + parseFloat(item.total_spend || 0),
        total_impressions: (acc.total_impressions || 0) + parseInt(item.total_impressions || 0),
        total_clicks: (acc.total_clicks || 0) + parseInt(item.total_clicks || 0),
        total_conversions_meta: (acc.total_conversions_meta || 0) + parseInt(item.total_conversions_meta || 0),
        total_conversions_booking: (acc.total_conversions_booking || 0) + parseInt(item.total_conversions_booking || 0)
      }), {});

      // KPI計算
      const totalCV = totalSummary.total_conversions_meta + totalSummary.total_conversions_booking;
      totalSummary.avg_cpa = totalCV > 0 ? totalSummary.total_spend / totalCV : 0;
      totalSummary.avg_cpc = totalSummary.total_clicks > 0 ? totalSummary.total_spend / totalSummary.total_clicks : 0;
      totalSummary.avg_ctr = totalSummary.total_impressions > 0 ? (totalSummary.total_clicks / totalSummary.total_impressions * 100) : 0;
      totalSummary.avg_cvr = totalSummary.total_clicks > 0 ? (totalCV / totalSummary.total_clicks * 100) : 0;

      setSummary(totalSummary);
      setDailyData(dailyRes.data.reverse()); // 日付昇順に
    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value || 0);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('ja-JP').format(value || 0);
  };

  const StatCard = ({ icon: Icon, label, value, subValue, accent, bg }) => (
    <div style={{
      backgroundColor: '#ffffff', borderRadius: '14px',
      border: '1px solid #f1f5f9', padding: '1.25rem 1.5rem',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      display: 'flex', alignItems: 'center', gap: '1rem'
    }}>
      {/* アイコンバッジ */}
      <div style={{
        width: '46px', height: '46px', borderRadius: '12px',
        backgroundColor: bg, display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0
      }}>
        <Icon size={20} style={{ color: accent }} />
      </div>
      {/* テキスト */}
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
  );

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

          {/* キャンペーン選択 */}
          <div style={{ flex: '0 0 220px', padding: '0 1rem 0 0' }}>
            <label style={labelStyle}>キャンペーン</label>
            <div style={{ position: 'relative' }}>
              <select
                className="input"
                value={selectedCampaign}
                onChange={(e) => setSelectedCampaign(e.target.value)}
                style={{ appearance: 'none', paddingRight: '2rem', cursor: 'pointer', height: '38px' }}
              >
                <option value="all">すべてのキャンペーン</option>
                {campaigns.map(c => (
                  <option key={c.campaign_id} value={c.campaign_id}>{c.campaign_name}</option>
                ))}
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
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
                maxDate={endDate || undefined}
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

      {/* サマリーカード + KPI 一体化 */}
      {summary && (
        <>
          {/* メイン指標 4枚 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '1rem' }}>
            <StatCard icon={DollarSign} label="消化金額"
              value={formatCurrency(summary.total_spend)}
              accent="#3b82f6" bg="#eff6ff" />
            <StatCard icon={Eye} label="インプレッション"
              value={formatNumber(summary.total_impressions)}
              accent="#10b981" bg="#f0fdf4" />
            <StatCard icon={MousePointerClick} label="クリック数"
              value={formatNumber(summary.total_clicks)}
              subValue={`CTR: ${summary.avg_ctr.toFixed(2)}%`}
              accent="#f59e0b" bg="#fffbeb" />
            <StatCard icon={Target} label="コンバージョン"
              value={formatNumber(summary.total_conversions_meta + summary.total_conversions_booking)}
              subValue={`Meta: ${summary.total_conversions_meta} / 予約: ${summary.total_conversions_booking}`}
              accent="#ef4444" bg="#fef2f2" />
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
              tick={{ fill: 'var(--text-secondary)' }}
            />
            <YAxis 
              stroke="var(--text-secondary)"
              tick={{ fill: 'var(--text-secondary)' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'var(--bg-tertiary)', 
                border: '1px solid var(--border-color)',
                borderRadius: '6px'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="spend" 
              stroke="var(--accent-blue)" 
              name="消化金額"
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey="clicks" 
              stroke="var(--accent-green)" 
              name="クリック数"
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey="conversions_meta" 
              stroke="var(--accent-orange)" 
              name="CV (Meta)"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Dashboard;
