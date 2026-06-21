import React, { useState, useEffect, useRef } from 'react';
import { creativeImageAPI, creativeTextAPI } from '../utils/api';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001';

const labelStyle = {
  display: 'block', fontSize: '0.8rem', fontWeight: '600',
  color: '#374151', marginBottom: '5px',
};
const inputStyle = {
  width: '100%', padding: '9px 12px',
  border: '1.5px solid #e2e8f0', borderRadius: '8px',
  fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit',
};

// ─── 画像管理タブ ────────────────────────────────────────────────────────────

function ImageTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', memo: '', tags: '' });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const load = async (q) => {
    setLoading(true);
    try {
      const res = await creativeImageAPI.getAll(q ? { search: q } : {});
      setItems(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', memo: '', tags: '' });
    setImageFile(null);
    setImagePreview('');
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ name: item.name, memo: item.memo || '', tags: item.tags || '' });
    setImageFile(null);
    setImagePreview(item.image_url ? `${API_BASE}${item.image_url}` : '');
    setShowForm(true);
  };

  const handleImage = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!form.name.trim()) return alert('名前を入力してください');
    if (!editing && !imageFile) return alert('画像を選択してください');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('memo', form.memo);
      fd.append('tags', form.tags);
      if (imageFile) fd.append('image', imageFile);
      if (editing) {
        await creativeImageAPI.update(editing.id, fd);
      } else {
        await creativeImageAPI.create(fd);
      }
      setShowForm(false);
      load(search);
    } catch { alert('保存に失敗しました'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!window.confirm('削除しますか？')) return;
    await creativeImageAPI.delete(id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
        <form onSubmit={e => { e.preventDefault(); load(search); }} style={{ display: 'flex', gap: '8px', flex: 1 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="名前・タグ・メモで検索..."
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', outline: 'none' }} />
          <button type="submit" style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem' }}>検索</button>
        </form>
        <button onClick={openNew} style={{ padding: '8px 18px', background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600', whiteSpace: 'nowrap' }}>＋ 画像追加</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>読み込み中...</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>画像がまだ登録されていません</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
          {items.map(item => (
            <div key={item.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ position: 'relative', paddingTop: '75%', background: '#f8fafc' }}>
                <img src={`${API_BASE}${item.image_url}`} alt={item.name}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { e.target.style.display = 'none'; }} />
              </div>
              <div style={{ padding: '10px 12px' }}>
                <div style={{ fontWeight: '600', fontSize: '0.82rem', color: '#1e293b', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                {item.tags && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
                    {item.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                      <span key={t} style={{ fontSize: '0.65rem', padding: '1px 6px', background: '#eff6ff', color: '#3b82f6', borderRadius: '99px' }}>{t}</span>
                    ))}
                  </div>
                )}
                {item.memo && <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.memo}</div>}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => openEdit(item)} style={{ flex: 1, padding: '5px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.72rem', color: '#475569' }}>編集</button>
                  <button onClick={() => del(item.id)} style={{ flex: 1, padding: '5px', background: '#fee2e2', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.72rem', color: '#dc2626' }}>削除</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '500px', maxHeight: '90vh', overflowY: 'auto', padding: '28px' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: '1.1rem', fontWeight: '700', color: '#1e293b' }}>{editing ? '画像を編集' : '画像を追加'}</h2>

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>名前 *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder="例：本町院_メインビジュアル" />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>画像{editing ? '（変更する場合のみ）' : ' *'}</label>
              <div
                onDrop={e => { e.preventDefault(); setDragOver(false); handleImage(e.dataTransfer.files[0]); }}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
                style={{ border: `2px dashed ${dragOver ? '#3b82f6' : '#cbd5e1'}`, borderRadius: '10px', padding: '20px', textAlign: 'center', cursor: 'pointer', background: dragOver ? '#eff6ff' : '#f8fafc', transition: 'all 0.2s' }}
              >
                {imagePreview
                  ? <img src={imagePreview} alt="preview" style={{ maxHeight: '160px', maxWidth: '100%', borderRadius: '6px' }} />
                  : <div style={{ color: '#94a3b8', fontSize: '0.82rem' }}><div style={{ fontSize: '2rem', marginBottom: '6px' }}>🖼️</div>クリックまたはドラッグ＆ドロップ</div>
                }
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleImage(e.target.files[0])} />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>タグ（カンマ区切り）</label>
              <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} style={inputStyle} placeholder="例：本町, 美容鍼, メイン" />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>メモ</label>
              <textarea value={form.memo} onChange={e => setForm(f => ({ ...f, memo: e.target.value }))} style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} placeholder="使用用途や注意点など" />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)} style={{ padding: '9px 20px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem' }}>キャンセル</button>
              <button onClick={save} disabled={saving} style={{ padding: '9px 24px', background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff', border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: '600' }}>
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 広告文管理タブ ──────────────────────────────────────────────────────────

function TextTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', headline: '', body_text: '', memo: '', tags: '' });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const load = async (q) => {
    setLoading(true);
    try {
      const res = await creativeTextAPI.getAll(q ? { search: q } : {});
      setItems(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', headline: '', body_text: '', memo: '', tags: '' });
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ name: item.name, headline: item.headline || '', body_text: item.body_text || '', memo: item.memo || '', tags: item.tags || '' });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) return alert('名前を入力してください');
    setSaving(true);
    try {
      if (editing) { await creativeTextAPI.update(editing.id, form); }
      else { await creativeTextAPI.create(form); }
      setShowForm(false);
      load(search);
    } catch { alert('保存に失敗しました'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!window.confirm('削除しますか？')) return;
    await creativeTextAPI.delete(id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
        <form onSubmit={e => { e.preventDefault(); load(search); }} style={{ display: 'flex', gap: '8px', flex: 1 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="名前・見出し・本文・タグで検索..."
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', outline: 'none' }} />
          <button type="submit" style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem' }}>検索</button>
        </form>
        <button onClick={openNew} style={{ padding: '8px 18px', background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600', whiteSpace: 'nowrap' }}>＋ 広告文追加</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>読み込み中...</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>広告文がまだ登録されていません</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {items.map(item => {
            const expanded = expandedId === item.id;
            return (
              <div key={item.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', background: '#fff', overflow: 'hidden' }}>
                <div onClick={() => setExpandedId(expanded ? null : item.id)}
                  style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#1e293b' }}>{item.name}</div>
                    {item.headline && <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>見出し：{item.headline}</div>}
                    {item.tags && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '5px' }}>
                        {item.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                          <span key={t} style={{ fontSize: '0.65rem', padding: '1px 6px', background: '#f0fdf4', color: '#16a34a', borderRadius: '99px' }}>{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
                    <button onClick={e => { e.stopPropagation(); openEdit(item); }} style={{ padding: '5px 12px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', color: '#475569' }}>編集</button>
                    <button onClick={e => { e.stopPropagation(); del(item.id); }} style={{ padding: '5px 12px', background: '#fee2e2', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', color: '#dc2626' }}>削除</button>
                    <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{expanded ? '▲' : '▼'}</span>
                  </div>
                </div>
                {expanded && (
                  <div style={{ padding: '0 18px 16px', borderTop: '1px solid #f1f5f9' }}>
                    {item.headline && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>見出し</div>
                        <div style={{ fontSize: '0.875rem', color: '#1e293b', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px' }}>{item.headline}</div>
                      </div>
                    )}
                    {item.body_text && (
                      <div style={{ marginTop: '10px' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>本文</div>
                        <div style={{ fontSize: '0.875rem', color: '#1e293b', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', whiteSpace: 'pre-wrap' }}>{item.body_text}</div>
                      </div>
                    )}
                    {item.memo && (
                      <div style={{ marginTop: '10px' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>メモ</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px' }}>{item.memo}</div>
                      </div>
                    )}
                    <div style={{ marginTop: '8px', fontSize: '0.68rem', color: '#94a3b8' }}>登録日: {new Date(item.created_at).toLocaleDateString('ja-JP')}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '540px', maxHeight: '90vh', overflowY: 'auto', padding: '28px' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: '1.1rem', fontWeight: '700', color: '#1e293b' }}>{editing ? '広告文を編集' : '広告文を追加'}</h2>

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>名前 *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder="例：美容鍼LP_夏キャンペーン_見出しA" />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>見出し</label>
              <input value={form.headline} onChange={e => setForm(f => ({ ...f, headline: e.target.value }))} style={inputStyle} placeholder="例：【限定】美容鍼で本格ケア ¥1,980〜" />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>本文</label>
              <textarea value={form.body_text} onChange={e => setForm(f => ({ ...f, body_text: e.target.value }))} style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }} placeholder="広告本文を入力..." />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>タグ（カンマ区切り）</label>
              <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} style={inputStyle} placeholder="例：本町, 美容鍼, 夏" />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>メモ</label>
              <textarea value={form.memo} onChange={e => setForm(f => ({ ...f, memo: e.target.value }))} style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }} placeholder="使用状況や改善点など" />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)} style={{ padding: '9px 20px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem' }}>キャンセル</button>
              <button onClick={save} disabled={saving} style={{ padding: '9px 24px', background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff', border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: '600' }}>
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── メインページ ────────────────────────────────────────────────────────────

export default function Creatives() {
  const [tab, setTab] = useState('images');

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>クリエイティブ管理</h1>
        <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px' }}>画像素材と広告文を個別に管理・検索できます</p>
      </div>

      <div style={{ display: 'flex', marginBottom: '24px', borderBottom: '2px solid #e2e8f0' }}>
        {[
          { key: 'images', label: '🖼️  画像素材' },
          { key: 'texts',  label: '📝  広告文' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '10px 24px', border: 'none', cursor: 'pointer',
            fontSize: '0.9rem', fontWeight: tab === t.key ? '700' : '500',
            color: tab === t.key ? '#3b82f6' : '#64748b',
            background: 'none',
            borderBottom: tab === t.key ? '2px solid #3b82f6' : '2px solid transparent',
            marginBottom: '-2px', transition: 'all 0.15s',
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'images' ? <ImageTab /> : <TextTab />}
    </div>
  );
}
