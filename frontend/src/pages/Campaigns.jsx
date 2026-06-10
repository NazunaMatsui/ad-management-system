import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { campaignAPI, metricsAPI, metaAPI } from '../utils/api';

const fmt    = (v) => new Intl.NumberFormat('ja-JP').format(Math.round(Number(v) || 0));
const fmtYen = (v) => `¥${fmt(v)}`;

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const daysAgoStr = (n) => {
  const d = new Date(); d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const STATUS = {
  active:  { label: '運用中',   bg: '#dcfce7', color: '#16a34a', dot: '#22c55e' },
  paused:  { label: '停止中',   bg: '#fee2e2', color: '#dc2626', dot: '#ef4444' },
  testing: { label: 'テスト中', bg: '#fef9c3', color: '#ca8a04', dot: '#eab308' },
  ended:   { label: '終了',     bg: '#f1f5f9', color: '#64748b', dot: '#94a3b8' },
};

const DOT_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [summaries, setSummaries] = useState({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);

  const startDate = daysAgoStr(29);
  const endDate = todayStr();

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const res = await campaignAPI.getAll();
      setCampaigns(res.data);
      await loadSummaries(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadSummaries = async (list) => {
    const results = {};
    await Promise.all(list.map(async (c) => {
      try {
        const r = await metricsAPI.getSummary({
          campaign_id: c.campaign_id,
          start_date: startDate,
          end_date: endDate,
        });
        results[c.campaign_id] = r.data[0] || null;
      } catch (_) {
        results[c.campaign_id] = null;
      }
    }));
    setSummaries(results);
  };

  const syncMeta = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await metaAPI.sync(startDate, endDate);
      setSyncMessage({ type: 'success', text: res.data.message });
      await loadAll();
    } catch (error) {
      const detail = error.response?.data?.detail || error.response?.data?.error || 'エラーが発生しました';
      setSyncMessage({ type: 'error', text: detail });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        読み込み中...
      </div>
    );
  }

  return (
    <div style={{ padding: '1.75rem 2rem' }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
            キャンペーン一覧
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            直近30日間のパフォーマンス（{startDate} 〜 {endDate}）
          </p>
        </div>
        <button
          onClick={syncMeta}
          disabled={syncing}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.55rem 1.1rem', borderRadius: '8px', border: 'none',
            fontSize: '0.85rem', fontWeight: '600', cursor: syncing ? 'not-allowed' : 'pointer',
            color: 'white',
            background: syncing ? '#94a3b8' : 'linear-gradient(135deg, #1877f2, #0d65d9)',
            boxShadow: syncing ? 'none' : '0 2px 6px rgba(24,119,242,0.35)',
            transition: 'all 0.2s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          {syncing ? '同期中...' : 'Metaデータ同期'}
        </button>
      </div>

      {/* 同期メッセージ */}
      {syncMessage && (
        <div style={{
          padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem',
          fontSize: '0.85rem', fontWeight: '500',
          backgroundColor: syncMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
          color: syncMessage.type === 'success' ? '#166534' : '#991b1b',
          border: `1px solid ${syncMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
        }}>
          {syncMessage.text}
        </div>
      )}

      {campaigns.length === 0 ? (
        <div style={{
          padding: '3rem', textAlign: 'center', backgroundColor: 'white',
          borderRadius: '12px', border: '1px solid var(--border-color)',
          color: 'var(--text-muted)', fontSize: '0.9rem'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📊</div>
          キャンペーンがありません。<br />
          「Metaデータ同期」でキャンペーンを取り込んでください。
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {campaigns.map((c, i) => {
            const st = STATUS[c.status] || STATUS.active;
            const color = DOT_COLORS[i % DOT_COLORS.length];
            const s = summaries[c.campaign_id];

            return (
              <Link
                key={c.campaign_id}
                to={`/campaigns/${c.campaign_id}`}
                style={{ textDecoration: 'none' }}
              >
                <div
                  style={{
                    backgroundColor: 'white', borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    padding: '1rem 1.25rem',
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    transition: 'box-shadow 0.15s, border-color 0.15s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                    e.currentTarget.style.borderColor = '#93c5fd';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                  }}
                >
                  {/* カラードット */}
                  <div style={{
                    width: '10px', height: '10px', borderRadius: '50%',
                    backgroundColor: color, flexShrink: 0,
                  }} />

                  {/* キャンペーン名 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.9rem', fontWeight: '600', color: '#1e293b',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>
                      {c.campaign_name}
                    </div>
                    {c.meta_campaign_id && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        ID: {c.meta_campaign_id}
                      </div>
                    )}
                  </div>

                  {/* ステータスバッジ */}
                  <span style={{
                    fontSize: '0.72rem', fontWeight: '600', padding: '0.2rem 0.6rem',
                    borderRadius: '99px', backgroundColor: st.bg, color: st.color,
                    flexShrink: 0, letterSpacing: '0.02em'
                  }}>
                    <span style={{
                      display: 'inline-block', width: '6px', height: '6px',
                      borderRadius: '50%', backgroundColor: st.dot,
                      marginRight: '0.3rem', verticalAlign: 'middle'
                    }} />
                    {st.label}
                  </span>

                  {/* KPI */}
                  <div style={{
                    display: 'flex', gap: '1.5rem', flexShrink: 0,
                    borderLeft: '1px solid var(--border-color)', paddingLeft: '1.25rem'
                  }}>
                    {[
                      { label: '消化金額', value: s ? fmtYen(s.total_spend) : '—' },
                      { label: 'クリック', value: s ? fmt(s.total_clicks) : '—' },
                      { label: 'CV (Meta)', value: s ? fmt(s.total_conversions_meta ?? 0) : '—' },
                      { label: 'CPA', value: s && s.total_conversions_booking > 0
                          ? fmtYen(s.total_spend / s.total_conversions_booking)
                          : '—' },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ textAlign: 'right', minWidth: '60px' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>{label}</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e293b' }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* 矢印 */}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
