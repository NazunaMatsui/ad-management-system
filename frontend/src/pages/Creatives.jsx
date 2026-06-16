import React, { useState, useEffect, useRef } from 'react';
import { creativeAPI, campaignAPI } from '../utils/api';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001';

const STATUS_CONFIG = {
  active:   { label: '運用中', bg: '#dcfce7', color: '#16a34a' },
  paused:   { label: '停止中', bg: '#fee2e2', color: '#dc2626' },
  archived: { label: 'アーカイブ', bg: '#f1f5f9', color: '#64748b' },
};

const EMPTY_FORM = { campaign_id: '', name: '', headline: '', body_text: '', status: 'active' };

export default function Creatives() {
  const [creatives, setCreatives] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [filterCampaign, setFilterCampaign] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    Promise.all([creativeAPI.getAll(), campaignAPI.getAll()])
      .then(([cr, ca]) => { setCreatives(cr.data); setCampaigns(ca.data); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = filterCampaign
    ? creatives.filter(c => String(c.campaign_id) === filterCampaign)
    : creatives;

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setImagePreview('');
    setShowForm(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({ campaign_id: c.campaign_id || '', name: c.name, headline: c.headline || '', body_text: c.body_text || '', status: c.status || 'active' });
    setImageFile(null);
    setImagePreview(c.image_url ? `${API_BASE}${c.image_url}` : '');
    setShowForm(true);
  };

  const handleImageChange = (file) => {
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleImageChange(file);
  };

  const save = async () => {
    if (!form.name.trim()) return alert('クリエイティブ名を入力してください');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('campaign_id', form.campaign_id || '');
      fd.append('headline', form.headline || '');
      fd.append('body_text', form.body_text || '');
      fd.append('status', form.status);
      if (imageFile) fd.append('image', imageFile);

      if (editing) {
        const res = await creativeAPI.update(editing.creative_id, fd);
        const camp = campaigns.find(x => String(x.campaign_id) === String(res.data.campaign_id));
        setCreatives(prev => prev.map(c => c.creative_id === editing.creative_id ? { ...res.data, campaign_name: camp?.campaign_name } : c));
      } else {
        const res = await creativeAPI.create(fd);
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
        <select value={filterCampaign} onChange={e => setFilterCampaign(e.target.value)} style={{
          padding: '0.45rem 0.875rem', borderRadius: '8px',
          border: '1px solid var(--border-color)', fontSize: '0.82rem',
          color: 'var(--text-primary)', background: '#fff', cursor: 'pointer'
        }}>
          <option value="">全キャンペーン</option>
          {campaigns.map(c => <option key={c.campaign_id} value={c.campaign_id}>{c.campaign_name}</option>)}
        </select>
        <span style={{ marginLeft: '0.75rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{filtered.length}件</span>
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
            const imgSrc = cr.image_url ? `${API_BASE}${cr.image_url}` : '';
            return (
              <div key={cr.creative_id} style={{
                background: '#fff', borderRadius: '14px',
                border: '1px solid var(--border-color)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden'
              }}>
                {imgSrc ? (
                  <div style={{ height: '160px', overflow: 'hidden', background: '#f8fafc' }}>
                    <img src={imgSrc} alt={cr.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.parentNode.style.display='none'; }} />
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
                    <span style={{ fontSize: '0.65rem', fontWeight: '600', padding: '0.15rem 0.5rem', borderRadius: '99px', background: st.bg, color: st.color, flexShrink: 0 }}>{st.label}</span>
                  </div>
                  {cr.campaign_name && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>📁 {cr.campaign_name}</div>}
                  {cr.headline && (
                    <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#1e40af', marginBottom: '0.375rem', padding: '0.3rem 0.6rem', background: '#eff6ff', borderRadius: '6px' }}>
                      {cr.headline}
                    </div>
                  )}
                  {cr.body_text && (
                    <div style={{
                      fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '0.75rem',
                      display: '-webkit-box', WebkitLineClamp: expanded ? 'none' : 3, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                    }}>
                      {cr.body_text}
                    </div>
                  )}
                  {cr.body_text && cr.body_text.length > 80 && (
                    <button onClick={() => setExpandedId(expanded ? null : cr.creative_id)} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.75rem', cursor: 'pointer', padding: '0 0 0.5rem', fontWeight: '500' }}>
                      {expanded ? '折りたたむ ▲' : '続きを見る ▼'}
                    </button>
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                    <button onClick={() => openEdit(cr)} style={{ padding: '0.35rem 0.8rem', borderRadius: '7px', border: '1px solid var(--border-color)', background: '#fff', color: 'var(--text-secondary)', fontSize: '0.78rem', cursor: 'pointer', fontWeight: '500' }}>編集</button>
                    <button onClick={() => remove(cr.creative_id)} style={{ padding: '0.35rem 0.8rem', borderRadius: '7px', border: '1px solid #fecaca', background: '#fff', color: '#ef4444', fontSize: '0.78rem', cursor: 'pointer', fontWeight: '500' }}>削除</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* モーダル */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#1e293b' }}>
                {editing ? 'クリエイティブを編集' : 'クリエイティブを新規作成'}
              </h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* クリエイティブ名 */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem', fontWeight: '600', color: '#374151' }}>
                クリエイティブ名 <span style={{ color: '#ef4444' }}>*</span>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="例：春キャンペーン_バナーA"
                  style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.875rem', fontWeight: '400' }} />
              </label>

              {/* キャンペーン */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem', fontWeight: '600', color: '#374151' }}>
                キャンペーン
                <select value={form.campaign_id} onChange={e => setForm(f => ({ ...f, campaign_id: e.target.value }))}
                  style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
                  <option value="">選択しない</option>
                  {campaigns.map(c => <option key={c.campaign_id} value={c.campaign_id}>{c.campaign_name}</option>)}
                </select>
              </label>

              {/* 見出し */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem', fontWeight: '600', color: '#374151' }}>
                見出し（ヘッドライン）
                <input value={form.headline} onChange={e => setForm(f => ({ ...f, headline: e.target.value }))} placeholder="例：今だけ限定！無料体験受付中"
                  style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.875rem', fontWeight: '400' }} />
              </label>

              {/* 広告文 */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem', fontWeight: '600', color: '#374151' }}>
                広告文（ボディテキスト）
                <textarea value={form.body_text} onChange={e => setForm(f => ({ ...f, body_text: e.target.value }))} placeholder="例：あなたの目標達成をサポート。まずは無料体験から..." rows={4}
                  style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.875rem', fontWeight: '400', resize: 'vertical', fontFamily: 'inherit' }} />
              </label>

              {/* 画像アップロード */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#374151' }}>画像</span>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  style={{
                    border: `2px dashed ${dragOver ? '#6366f1' : '#cbd5e1'}`,
                    borderRadius: '10px', cursor: 'pointer',
                    background: dragOver ? '#eef2ff' : '#f8fafc',
                    transition: 'all 0.15s', overflow: 'hidden'
                  }}
                >
                  {imagePreview ? (
                    <div style={{ position: 'relative' }}>
                      <img src={imagePreview} alt="preview" style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', display: 'block' }} />
                      <div style={{
                        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: 0, transition: 'opacity 0.15s',
                      }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '0'}
                        onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                        style={{
                          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: '0.82rem', fontWeight: '600', gap: '6px', cursor: 'pointer'
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                        画像を変更
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '2rem', textAlign: 'center' }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 0.75rem' }}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '500' }}>クリックまたはドラッグ＆ドロップ</div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.25rem' }}>PNG・JPG・GIF・WebP（最大10MB）</div>
                    </div>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleImageChange(e.target.files[0])} />
                {imagePreview && (
                  <button onClick={() => { setImageFile(null); setImagePreview(''); }} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '500', padding: 0 }}>
                    画像を削除
                  </button>
                )}
              </div>

              {/* ステータス */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem', fontWeight: '600', color: '#374151' }}>
                ステータス
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
                  <option value="active">運用中</option>
                  <option value="paused">停止中</option>
                  <option value="archived">アーカイブ</option>
                </select>
              </label>
            </div>

            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)} style={{ padding: '0.5rem 1.1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#fff', color: 'var(--text-secondary)', fontSize: '0.875rem', cursor: 'pointer' }}>キャンセル</button>
              <button onClick={save} disabled={saving} style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', background: saving ? '#cbd5e1' : 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none', color: '#fff', fontSize: '0.875rem', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? '保存中...' : '保存する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
