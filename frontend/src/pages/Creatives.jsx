import React, { useState, useEffect } from 'react';
import { creativeAPI, campaignAPI } from '../utils/api';

const STATUS_CONFIG = {
  active:   { label: '運用中', bg: '#dcfce7', color: '#16a34a' },
  paused:   { label: '停止中', bg: '#fee2e2', color: '#dc2626' },
  archived: { label: 'アーカイブ', bg: '#f1f5f9', color: '#64748b' },
};

const EMPTY_FORM = { campaign_id: '', name: '', headline: '', body_text: '', image_url: '', status: 'active' };

export default function Creatives() {
  const [creatives, setCreatives] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filterCampaign, setFilterCampaign] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    Promise.all([
      creativeAPI.getAll(),
      campaignAPI.getAll(),
    ]).then(([cr, ca]) => {
      setCreatives(cr.data);
      setCampaigns(ca.data);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = filterCampaign
    ? creatives.filter(c => String(c.campaign_id) === filterCampaign)
    : creatives;

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      campaign_id: c.campaign_id || '',
      name: c.name,
      headline: c.headline || '',
      body_text: c.body_text || '',
      image_url: c.image_url || '',
      status: c.status || 'active',
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) return alert('クリエイティブ名を入力してください');
    setSaving(true);
    try {
      if (editing) {
        const res = await creativeAPI.update(editing.creative_id, form);
        setCreatives(prev => prev.map(c => c.creative_id === editing.creative_id ? { ...res.data, campaign_name: campaigns.find(x => x.campaign_id === res.data.campaign_id)?.campaign_name } : c));
      } else {
        const res = await creativeAPI.create(form);
        const camp = campaigns.find(x => String(x.campaign_id) === String(form.campaign_id));
        setCreatives(prev => [{ ...res.data, campaign_name: camp?.campaign_name }, ...prev]);
      }
      setShowForm(false);
    } catch {
      alert('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('このクリエイティブを削除しますか？')) return;
    await creativeAPI.delete(id);
    setCreatives(prev => prev.filter(c => c.creative_id !== id));
  };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>読み込み中...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px' }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>クリエイティブ管理</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.25rem' }}>
            Meta広告で使用した画像・広告文・見出しを管理します
          </p>
        </div>
        <button onClick={openNew} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '0.5rem 1.1rem', borderRadius: '9px',
          background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
          border: 'none', color: '#fff', fontSize: '0.875rem',
          fontWeight: '600', cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(99,102,241,0.3)'
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          新規作成
        </button>
      </div>

      {/* フィルター */}
      <div style={{ marginBottom: '1.25rem' }}>
        <select
          value={filterCampaign}
          onChange={e => setFilterCampaign(e.target.value)}
          style={{
            padding: '0.45rem 0.875rem', borderRadius: '8px',
            border: '1px solid var(--border-color)', fontSize: '0.82rem',
            color: 'var(--text-primary)', background: '#fff', cursor: 'pointer'
          }}
        >
          <option value="">全キャンペーン</option>
          {campaigns.map(c => (
            <option key={c.campaign_id} value={c.campaign_id}>{c.campaign_name}</option>
          ))}
        </select>
        <span style={{ marginLeft: '0.75rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          {filtered.length}件
        </span>
      </div>

      {/* カード一覧 */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '4rem 2rem',
          background: '#fff', borderRadius: '14px',
          border: '1px solid var(--border-color)',
          color: 'var(--text-muted)', fontSize: '0.875rem'
        }}>
          クリエイティブがまだ登録されていません。「新規作成」から追加してください。
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '1rem' }}>
          {filtered.map(cr => {
            const st = STATUS_CONFIG[cr.status] || STATUS_CONFIG.active;
            const expanded = expandedId === cr.creative_id;
            return (
              <div key={cr.creative_id} style={{
                background: '#fff', borderRadius: '14px',
                border: '1px solid var(--border-color)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                overflow: 'hidden', transition: 'box-shadow 0.15s'
              }}>
                {/* 画像プレビュー */}
                {cr.image_url ? (
                  <div style={{ height: '160px', overflow: 'hidden', background: '#f8fafc' }}>
                    <img
                      src={cr.image_url} alt={cr.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  </div>
                ) : (
                  <div style={{
                    height: '120px', background: 'linear-gradient(135deg,#e0e7ff,#f0fdf4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                  </div>
                )}

                <div style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1e293b', flex: 1 }}>{cr.name}</div>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: '600', padding: '0.15rem 0.5rem',
                      borderRadius: '99px', background: st.bg, color: st.color, flexShrink: 0
                    }}>{st.label}</span>
                  </div>

                  {cr.campaign_name && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      📁 {cr.campaign_name}
                    </div>
                  )}

                  {cr.headline && (
                    <div style={{
                      fontSize: '0.8rem', fontWeight: '600', color: '#1e40af',
                      marginBottom: '0.375rem', padding: '0.3rem 0.6rem',
                      background: '#eff6ff', borderRadius: '6px'
                    }}>
                      {cr.headline}
                    </div>
                  )}

                  {cr.body_text && (
                    <div style={{
                      fontSize: '0.78rem', color: 'var(--text-secondary)',
                      lineHeight: '1.5', marginBottom: '0.75rem',
                      display: '-webkit-box', WebkitLineClamp: expanded ? 'none' : 3,
                      WebkitBoxOrient: 'vertical', overflow: 'hidden'
                    }}>
                      {cr.body_text}
                    </div>
                  )}

                  {cr.body_text && cr.body_text.length > 80 && (
                    <button onClick={() => setExpandedId(expanded ? null : cr.creative_id)} style={{
                      background: 'none', border: 'none', color: '#3b82f6',
                      fontSize: '0.75rem', cursor: 'pointer', padding: '0 0 0.5rem', fontWeight: '500'
                    }}>
                      {expanded ? '折りたたむ ▲' : '続きを見る ▼'}
                    </button>
                  )}

                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                    <button onClick={() => openEdit(cr)} style={{
                      padding: '0.35rem 0.8rem', borderRadius: '7px',
                      border: '1px solid var(--border-color)', background: '#fff',
                      color: 'var(--text-secondary)', fontSize: '0.78rem', cursor: 'pointer', fontWeight: '500'
                    }}>編集</button>
                    <button onClick={() => remove(cr.creative_id)} style={{
                      padding: '0.35rem 0.8rem', borderRadius: '7px',
                      border: '1px solid #fecaca', background: '#fff',
                      color: '#ef4444', fontSize: '0.78rem', cursor: 'pointer', fontWeight: '500'
                    }}>削除</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* モーダル */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, padding: '1rem'
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '520px',
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#1e293b' }}>
                {editing ? 'クリエイティブを編集' : 'クリエイティブを新規作成'}
              </h2>
              <button onClick={() => setShowForm(false)} style={{
                background: 'none', border: 'none', fontSize: '20px',
                cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1
              }}>✕</button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem', fontWeight: '600', color: '#374151' }}>
                クリエイティブ名 <span style={{ color: '#ef4444' }}>*</span>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="例：春キャンペーン_バナーA"
                  style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.875rem', fontWeight: '400' }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem', fontWeight: '600', color: '#374151' }}>
                キャンペーン
                <select
                  value={form.campaign_id}
                  onChange={e => setForm(f => ({ ...f, campaign_id: e.target.value }))}
                  style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}
                >
                  <option value="">選択しない</option>
                  {campaigns.map(c => (
                    <option key={c.campaign_id} value={c.campaign_id}>{c.campaign_name}</option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem', fontWeight: '600', color: '#374151' }}>
                見出し（ヘッドライン）
                <input
                  value={form.headline}
                  onChange={e => setForm(f => ({ ...f, headline: e.target.value }))}
                  placeholder="例：今だけ限定！無料体験受付中"
                  style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.875rem', fontWeight: '400' }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem', fontWeight: '600', color: '#374151' }}>
                広告文（ボディテキスト）
                <textarea
                  value={form.body_text}
                  onChange={e => setForm(f => ({ ...f, body_text: e.target.value }))}
                  placeholder="例：あなたの目標達成をサポート。まずは無料体験から..."
                  rows={4}
                  style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.875rem', fontWeight: '400', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem', fontWeight: '600', color: '#374151' }}>
                画像URL
                <input
                  value={form.image_url}
                  onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                  placeholder="https://..."
                  style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.875rem', fontWeight: '400' }}
                />
                {form.image_url && (
                  <img src={form.image_url} alt="preview" style={{ width: '100%', maxHeight: '140px', objectFit: 'cover', borderRadius: '8px', marginTop: '0.25rem' }} onError={e => { e.target.style.display='none'; }} />
                )}
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem', fontWeight: '600', color: '#374151' }}>
                ステータス
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}
                >
                  <option value="active">運用中</option>
                  <option value="paused">停止中</option>
                  <option value="archived">アーカイブ</option>
                </select>
              </label>
            </div>

            <div style={{
              padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)',
              display: 'flex', gap: '0.75rem', justifyContent: 'flex-end'
            }}>
              <button onClick={() => setShowForm(false)} style={{
                padding: '0.5rem 1.1rem', borderRadius: '8px',
                border: '1px solid var(--border-color)', background: '#fff',
                color: 'var(--text-secondary)', fontSize: '0.875rem', cursor: 'pointer'
              }}>キャンセル</button>
              <button onClick={save} disabled={saving} style={{
                padding: '0.5rem 1.25rem', borderRadius: '8px',
                background: saving ? '#cbd5e1' : 'linear-gradient(135deg,#3b82f6,#6366f1)',
                border: 'none', color: '#fff', fontSize: '0.875rem',
                fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer'
              }}>
                {saving ? '保存中...' : '保存する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
