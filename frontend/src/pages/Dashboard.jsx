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

  const StatCard = ({ icon: Icon, label, value, subValue, trend, color }) => (
    <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ 
        position: 'absolute', 
        top: '-20px', 
        right: '-20px',
        width: '100px',
        height: '100px',
        backgroundColor: color,
        opacity: 0.1,
        borderRadius: '50%'
      }} />
      
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Icon size={20} style={{ color }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {label}
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.25rem' }}>
            {value}
          </div>
          {subValue && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {subValue}
            </div>
          )}
        </div>
        
        {trend && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.25rem',
            padding: '0.25rem 0.5rem',
            borderRadius: '6px',
            backgroundColor: trend > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: trend > 0 ? 'var(--accent-green)' : 'var(--accent-red)'
          }}>
            {trend > 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
            <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>
              {Math.abs(trend).toFixed(1)}%
            </span>
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
      <div className="card" style={{ marginBottom: '2rem', padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>

          {/* キャンペーン選択 */}
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              キャンペーン
            </label>
            <div style={{ position: 'relative' }}>
              <select
                className="input"
                value={selectedCampaign}
                onChange={(e) => setSelectedCampaign(e.target.value)}
                style={{ appearance: 'none', paddingRight: '2rem', cursor: 'pointer' }}
              >
                <option value="all">すべてのキャンペーン</option>
                {campaigns.map(c => (
                  <option key={c.campaign_id} value={c.campaign_id}>{c.campaign_name}</option>
                ))}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
            </div>
          </div>

          {/* 区切り */}
          <div style={{ width: '1px', height: '40px', backgroundColor: 'var(--border-color)', alignSelf: 'flex-end', marginBottom: '1px' }} />

          {/* 日付範囲 */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', flex: '1', minWidth: '300px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                開始日
              </label>
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                placeholder="開始日を選択"
                maxDate={endDate || undefined}
              />
            </div>

            <div style={{ color: '#cbd5e1', fontSize: '1.1rem', paddingBottom: '0.5rem', flexShrink: 0 }}>→</div>

            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                終了日
              </label>
              <DatePicker
                value={endDate}
                onChange={setEndDate}
                placeholder="終了日を選択"
                minDate={startDate || undefined}
              />
            </div>
          </div>

          {/* クイック選択 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              クイック選択
            </label>
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
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
                    padding: '0.375rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)',
                    backgroundColor: '#ffffff', color: 'var(--text-secondary)', fontSize: '0.78rem',
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

      {/* サマリーカード */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <StatCard 
            icon={DollarSign}
            label="消化金額"
            value={formatCurrency(summary.total_spend)}
            color="var(--accent-blue)"
          />
          <StatCard 
            icon={Eye}
            label="インプレッション"
            value={formatNumber(summary.total_impressions)}
            color="var(--accent-green)"
          />
          <StatCard 
            icon={MousePointerClick}
            label="クリック数"
            value={formatNumber(summary.total_clicks)}
            subValue={`CTR: ${summary.avg_ctr.toFixed(2)}%`}
            color="var(--accent-orange)"
          />
          <StatCard 
            icon={Target}
            label="コンバージョン"
            value={formatNumber(summary.total_conversions_meta + summary.total_conversions_booking)}
            subValue={`Meta: ${summary.total_conversions_meta} / 予約: ${summary.total_conversions_booking}`}
            color="var(--accent-red)"
          />
        </div>
      )}

      {/* KPI指標 */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              CPA
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
              {formatCurrency(summary.avg_cpa)}
            </div>
          </div>
          
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              CPC
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
              {formatCurrency(summary.avg_cpc)}
            </div>
          </div>
          
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              CTR
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
              {summary.avg_ctr.toFixed(2)}%
            </div>
          </div>
          
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              CVR
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
              {summary.avg_cvr.toFixed(2)}%
            </div>
          </div>
        </div>
      )}

      {/* トレンドグラフ */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>
          日別トレンド
        </h2>
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
