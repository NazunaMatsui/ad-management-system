import React, { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { campaignAPI, metricsAPI } from '../utils/api';
import { ClipboardList, Save, CheckCircle, AlertCircle } from 'lucide-react';

const labelStyle = {
  display: 'block', marginBottom: '0.375rem',
  fontSize: '0.7rem', fontWeight: '600',
  color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em'
};

const inputStyle = {
  width: '100%', height: '38px', padding: '0 0.875rem',
  border: '1px solid var(--border-color)', borderRadius: '6px',
  backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)',
  fontSize: '0.875rem', boxSizing: 'border-box', outline: 'none',
};

export default function DataEntry() {
  const [campaigns, setCampaigns] = useState([]);
  const [campaignId, setCampaignId] = useState('');
  const [date, setDate] = useState(format(subDays(new Date(), 1), 'yyyy-MM-dd'));
  const [conversionsBooking, setConversionsBooking] = useState('');
  const [existing, setExisting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    campaignAPI.getAll().then(r => {
      setCampaigns(r.data);
      if (r.data.length > 0) setCampaignId(String(r.data[0].campaign_id));
    });
  }, []);

  // キャンペーン・日付が変わったら既存データを取得
  useEffect(() => {
    if (!campaignId || !date) return;
    setExisting(null);
    setConversionsBooking('');
    metricsAPI.get({ campaign_id: campaignId, start_date: date, end_date: date })
      .then(r => {
        const row = r.data[0];
        if (row) {
          setExisting(row);
          setConversionsBooking(String(row.conversions_booking ?? ''));
        }
      })
      .catch(() => {});
  }, [campaignId, date]);

  const handleSave = async () => {
    if (!campaignId || !date || conversionsBooking === '') return;
    setSaving(true);
    setMessage(null);
    try {
      await metricsAPI.create({
        campaign_id: parseInt(campaignId),
        date,
        spend: existing ? existing.spend : 0,
        impressions: existing ? existing.impressions : 0,
        clicks: existing ? existing.clicks : 0,
        conversions_meta: existing ? existing.conversions_meta : 0,
        conversions_booking: parseInt(conversionsBooking) || 0,
        data_source: existing ? existing.data_source : 'manual',
      });
      setMessage({ type: 'success', text: '保存しました' });
    } catch {
      setMessage({ type: 'error', text: '保存に失敗しました' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px',
          background: 'linear-gradient(135deg, #10b981, #06b6d4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(16,185,129,0.3)', flexShrink: 0
        }}>
          <ClipboardList size={24} color="white" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1.2 }}>
            CV（予約）手動入力
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            キャンペーン・日付ごとに予約CV数を入力します
          </p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '480px', padding: '1.5rem' }}>
        {/* キャンペーン */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>キャンペーン</label>
          <select
            value={campaignId}
            onChange={e => setCampaignId(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            {campaigns.map(c => (
              <option key={c.campaign_id} value={String(c.campaign_id)}>
                {c.campaign_name}
              </option>
            ))}
          </select>
        </div>

        {/* 日付 */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>日付</label>
          <input
            type="date"
            value={date}
            max={format(new Date(), 'yyyy-MM-dd')}
            onChange={e => setDate(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* 既存データ表示 */}
        {existing && (
          <div style={{
            marginBottom: '1.25rem', padding: '0.75rem 1rem',
            backgroundColor: '#f8fafc', borderRadius: '8px',
            border: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#64748b'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '0.4rem', color: '#475569' }}>既存データ</div>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <span>消化金額: ¥{Number(existing.spend).toLocaleString()}</span>
              <span>クリック: {Number(existing.clicks).toLocaleString()}</span>
              <span>CV(Meta): {existing.conversions_meta}</span>
            </div>
          </div>
        )}

        {/* CV（予約）入力 */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>CV（予約）件数</label>
          <input
            type="number"
            min="0"
            value={conversionsBooking}
            onChange={e => setConversionsBooking(e.target.value)}
            placeholder="例: 3"
            style={{ ...inputStyle, fontSize: '1.1rem', fontWeight: '600' }}
          />
          {!existing && (
            <p style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.375rem' }}>
              ※ この日付のデータが存在しない場合、新規作成されます（広告費・クリック等は0）
            </p>
          )}
        </div>

        {/* 保存ボタン */}
        <button
          onClick={handleSave}
          disabled={saving || conversionsBooking === ''}
          style={{
            width: '100%', height: '42px', borderRadius: '8px', border: 'none',
            background: saving || conversionsBooking === '' ? '#94a3b8' : 'linear-gradient(135deg, #10b981, #06b6d4)',
            color: '#fff', fontSize: '0.9rem', fontWeight: '700',
            cursor: saving || conversionsBooking === '' ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            boxShadow: saving || conversionsBooking === '' ? 'none' : '0 2px 8px rgba(16,185,129,0.35)',
            transition: 'all 0.15s',
          }}
        >
          <Save size={16} />
          {saving ? '保存中...' : '保存する'}
        </button>

        {/* 結果メッセージ */}
        {message && (
          <div style={{
            marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
            fontSize: '0.85rem', fontWeight: '600',
            color: message.type === 'success' ? '#10b981' : '#ef4444'
          }}>
            {message.type === 'success'
              ? <CheckCircle size={16} />
              : <AlertCircle size={16} />}
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}
