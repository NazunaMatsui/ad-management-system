import React, { useState, useEffect, useRef } from 'react';
import { creativeImageAPI, creativeTextAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001';

const STORES = ['西宮店', '本町店'];

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
const selectStyle = {
  ...inputStyle,
  background: '#fff', cursor: 'pointer',
};

function StoreFilter({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      {['all', ...STORES].map(s => (
        <button key={s} onClick={() => onChange(s)} style={{
          padding: '5px 14px', borderRadius: '99px', border: '1.5px solid',
          fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s',
          borderColor: value === s ? '#3b82f6' : '#e2e8f0',
          background: value === s ? '#eff6ff' : '#fff',
          color: value === s ? '#3b82f6' : '#64748b',
        }}>
          {s === 'all' ? '全店舗' : s}
        </button>
      ))}
    </div>
  );
}

function StoreSelect({ value, onChange, required }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={selectStyle}>
      <option value="">店舗を選択{required ? ' *' : '（任意）'}</option>
      {STORES.map(s => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}

function MediaPreview({ url, type, label, style }) {
  if (!url) return null;
  const src = url.startsWith('data:') ? url : `${API_BASE}${url}`;
  return (
    <div style={{ ...style }}>
      {label && <div style={{ fontSize: '0.68rem', color: '#64748b', marginBottom: '3px', fontWeight: '600' }}>{label}</div>}
      {type === 'video'
        ? <video src={src} controls style={{ width: '100%', borderRadius: '6px', maxHeight: '140px' }} />
        : <img src={src} alt="" style={{ width: '100%', borderRadius: '6px', maxHeight: '140px', objectFit: 'cover' }}
            onError={e => { e.target.style.display = 'none'; }} />
      }
    </div>
  );
}

function MediaSlot({ index, file, existingUrl, existingType, onFile, onClear, editing }) {
  const ref = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewType, setPreviewType] = useState('image');

  useEffect(() => {
    if (file) {
      const reader = new FileReader();
      const isVideo = file.type.startsWith('video/');
      setPreviewType(isVideo ? 'video' : 'image');
      reader.onload = e => setPreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  }, [file]);

  const handleFile = (f) => {
    if (!f) return;
    if (!/^image\//.test(f.type) && !/^video\//.test(f.type)) return;
    onFile(f);
  };

  const displayUrl = preview || existingUrl;
  const displayType = preview ? previewType : existingType;

  return (
    <div
      onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onClick={() => ref.current?.click()}
      style={{
        border: `2px dashed ${dragOver ? '#3b82f6' : displayUrl ? '#a5b4fc' : '#cbd5e1'}`,
        borderRadius: '8px', padding: displayUrl ? '6px' : '12px 8px',
        textAlign: 'center', cursor: 'pointer', flex: 1,
        background: dragOver ? '#eff6ff' : displayUrl ? '#f5f3ff' : '#fafafa',
        transition: 'all 0.2s', position: 'relative', minWidth: 0,
      }}
    >
      {displayUrl
        ? <>
            <MediaPreview url={displayUrl} type={displayType} />
            <button type="button" onClick={e => { e.stopPropagation(); onFile(null); onClear(); }}
              style={{ position: 'absolute', top: '4px', right: '4px', fontSize: '0.65rem', color: '#fff', background: 'rgba(220,38,38,0.8)', border: 'none', borderRadius: '99px', cursor: 'pointer', padding: '1px 5px', lineHeight: 1.4 }}>
              ✕
            </button>
          </>
        : <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
            クリックまたは<br />ドロップ
          </div>
      }
      <input ref={ref} type="file" accept="image/*,video/*" style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files[0])} />
    </div>
  );
}

// ─── プレビューモーダル（画像/動画）─────────────────────────────────────────
function ImagePreviewModal({ item, onClose }) {
  const urlKeys = ['image_url', 'image_url_2', 'image_url_3'];
  const urls = urlKeys.map(k => item[k]).filter(Boolean);
  const labels = [item.size_label_1, item.size_label_2, item.size_label_3];
  const [active, setActive] = useState(0);
  const src = `${API_BASE}${urls[active] || urls[0]}`;

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '640px', maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* ヘッダー */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#1e293b' }}>{item.name}</div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
              {item.store && <span style={{ fontSize: '0.65rem', padding: '1px 7px', background: '#fef3c7', color: '#d97706', borderRadius: '99px' }}>{item.store}</span>}
              {item.tags && item.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                <span key={t} style={{ fontSize: '0.65rem', padding: '1px 6px', background: '#eff6ff', color: '#3b82f6', borderRadius: '99px' }}>{t}</span>
              ))}
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', padding: '6px 12px', fontSize: '0.85rem', color: '#64748b' }}>✕ 閉じる</button>
        </div>

        {/* メディア */}
        <div style={{ flex: 1, overflow: 'auto', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
          {item.media_type === 'video'
            ? <video src={src} controls style={{ maxWidth: '100%', maxHeight: '60vh' }} />
            : <img src={src} alt="" style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain' }} />
          }
        </div>

        {/* サイズタブ */}
        {urls.length > 1 && (
          <div style={{ display: 'flex', gap: '6px', padding: '10px 16px', borderTop: '1px solid #f1f5f9', background: '#f8fafc', flexShrink: 0 }}>
            {urls.map((_, i) => (
              <button key={i} onClick={() => setActive(i)} style={{
                flex: 1, padding: '6px 8px', fontSize: '0.72rem', fontWeight: '600',
                border: '1.5px solid', borderRadius: '7px', cursor: 'pointer', transition: 'all 0.15s',
                borderColor: active === i ? '#6366f1' : '#e2e8f0',
                background: active === i ? '#eef2ff' : '#fff',
                color: active === i ? '#6366f1' : '#94a3b8',
              }}>
                {labels[i] || `サイズ${i + 1}`}
              </button>
            ))}
          </div>
        )}

        {/* メモ */}
        {item.memo && (
          <div style={{ padding: '10px 20px', borderTop: '1px solid #f1f5f9', fontSize: '0.78rem', color: '#64748b', flexShrink: 0 }}>
            {item.memo}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── プレビューモーダル（広告文）────────────────────────────────────────────
function TextPreviewModal({ item, onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const headlines = [item.headline, item.headline_2, item.headline_3, item.headline_4, item.headline_5].filter(Boolean);

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '480px', maxHeight: '92vh', overflow: 'auto' }}>
        {/* ヘッダー */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#1e293b' }}>{item.name}</div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', padding: '6px 12px', fontSize: '0.85rem', color: '#64748b' }}>✕ 閉じる</button>
        </div>

        {/* Facebook広告風プレビュー */}
        <div style={{ padding: '20px' }}>
          <div style={{ border: '1px solid #dde3eb', borderRadius: '10px', overflow: 'hidden', fontFamily: 'Helvetica, Arial, sans-serif', maxWidth: '400px', margin: '0 auto', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            {/* アカウント行 */}
            <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '1rem', flexShrink: 0 }}>
                {item.store?.[0] || 'A'}
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1c1e21' }}>{item.store || '店舗名'}</div>
                <div style={{ fontSize: '0.68rem', color: '#65676b' }}>スポンサー済み · <span style={{ fontSize: '0.68rem' }}>🌐</span></div>
              </div>
            </div>

            {/* 本文 */}
            {item.body_text && (
              <div style={{ padding: '0 14px 12px', fontSize: '0.875rem', color: '#1c1e21', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {item.body_text}
              </div>
            )}

            {/* 画像プレースホルダー */}
            <div style={{ background: '#e4e6eb', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#65676b', fontSize: '0.82rem' }}>
              画像/動画エリア
            </div>

            {/* 見出し */}
            <div style={{ padding: '10px 14px', background: '#f0f2f5', borderTop: '1px solid #dde3eb' }}>
              {headlines.slice(0, 3).map((h, i) => (
                <div key={i} style={{ fontSize: i === 0 ? '0.9rem' : '0.78rem', fontWeight: i === 0 ? '700' : '400', color: i === 0 ? '#1c1e21' : '#65676b', marginBottom: i === 0 ? '2px' : '0' }}>{h}</div>
              ))}
            </div>

            {/* CTAボタン */}
            <div style={{ padding: '10px 14px', background: '#f0f2f5', display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ padding: '7px 16px', background: '#e4e6eb', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '600', color: '#1c1e21' }}>詳しくはこちら</div>
            </div>
          </div>

          {/* 全見出しリスト */}
          {headlines.length > 0 && (
            <div style={{ marginTop: '16px', background: '#f8fafc', borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', marginBottom: '8px' }}>登録済み見出し（全{headlines.length}件）</div>
              {headlines.map((h, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '5px' }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: '700', color: '#6366f1', background: '#eef2ff', padding: '1px 6px', borderRadius: '99px', flexShrink: 0 }}>見出し{i + 1}</span>
                  <div style={{ fontSize: '0.82rem', color: '#1e293b' }}>{h}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 画像/動画タブ ────────────────────────────────────────────────────────────

function ImageTab({ isOwner }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '', memo: '', tags: '', store: '',
    size_label_1: 'スクエア(1:1)', size_label_2: 'ストーリー(9:16)', size_label_3: '横型(16:9)',
  });
  const [files, setFiles] = useState([null, null, null]);
  const [clears, setClears] = useState([false, false, false]);
  const [saving, setSaving] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);

  const load = async (q, store) => {
    setLoading(true);
    try {
      const params = {};
      if (q) params.search = q;
      if (store && store !== 'all') params.store = store;
      const res = await creativeImageAPI.getAll(params);
      setItems(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(search, storeFilter); }, [storeFilter]);

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', memo: '', tags: '', store: '', size_label_1: 'スクエア(1:1)', size_label_2: 'ストーリー(9:16)', size_label_3: '横型(16:9)' });
    setFiles([null, null, null]);
    setClears([false, false, false]);
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      name: item.name, memo: item.memo || '', tags: item.tags || '', store: item.store || '',
      size_label_1: item.size_label_1 || 'スクエア(1:1)',
      size_label_2: item.size_label_2 || 'ストーリー(9:16)',
      size_label_3: item.size_label_3 || '横型(16:9)',
    });
    setFiles([null, null, null]);
    setClears([false, false, false]);
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) return alert('名前を入力してください');
    if (!editing && !files[0]) return alert('1枚目の画像/動画を選択してください');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('memo', form.memo);
      fd.append('tags', form.tags);
      fd.append('store', form.store);
      fd.append('size_label_1', form.size_label_1);
      fd.append('size_label_2', form.size_label_2);
      fd.append('size_label_3', form.size_label_3);
      if (files[0]) fd.append('media1', files[0]);
      if (files[1]) fd.append('media2', files[1]);
      if (files[2]) fd.append('media3', files[2]);
      if (clears[1]) fd.append('clear2', '1');
      if (clears[2]) fd.append('clear3', '1');
      if (editing) {
        await creativeImageAPI.update(editing.id, fd);
      } else {
        await creativeImageAPI.create(fd);
      }
      setShowForm(false);
      load(search, storeFilter);
    } catch { alert('保存に失敗しました'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!window.confirm('削除しますか？')) return;
    await creativeImageAPI.delete(id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const sizeLabels = ['size_label_1', 'size_label_2', 'size_label_3'];
  const urlKeys = ['image_url', 'image_url_2', 'image_url_3'];

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
        <form onSubmit={e => { e.preventDefault(); load(search, storeFilter); }} style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '200px' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="名前・タグ・メモで検索..."
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', outline: 'none' }} />
          <button type="submit" style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem' }}>検索</button>
        </form>
        {isOwner && <button onClick={openNew} style={{ padding: '8px 18px', background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600', whiteSpace: 'nowrap' }}>＋ 追加</button>}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <StoreFilter value={storeFilter} onChange={v => setStoreFilter(v)} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>読み込み中...</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>素材がまだ登録されていません</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
          {items.map(item => {
            const urls = urlKeys.map(k => item[k]).filter(Boolean);
            const labels = [item.size_label_1, item.size_label_2, item.size_label_3];
            return (
              <div key={item.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                {/* メディアスロット（最大3枚タブ表示） */}
                <MediaSlotViewer urls={urls} labels={labels} type={item.media_type} />
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <div style={{ fontWeight: '600', fontSize: '0.82rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{item.name}</div>
                    {item.store && (
                      <span style={{ fontSize: '0.65rem', padding: '1px 7px', background: '#fef3c7', color: '#d97706', borderRadius: '99px', flexShrink: 0 }}>{item.store}</span>
                    )}
                  </div>
                  {item.tags && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
                      {item.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                        <span key={t} style={{ fontSize: '0.65rem', padding: '1px 6px', background: '#eff6ff', color: '#3b82f6', borderRadius: '99px' }}>{t}</span>
                      ))}
                    </div>
                  )}
                  {item.memo && <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.memo}</div>}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => setPreviewItem(item)} style={{ flex: isOwner ? 1 : undefined, padding: '5px 10px', background: '#f0fdf4', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.72rem', color: '#16a34a', fontWeight: '600' }}>プレビュー</button>
                    {isOwner && <button onClick={() => openEdit(item)} style={{ flex: 1, padding: '5px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.72rem', color: '#475569' }}>編集</button>}
                    {isOwner && <button onClick={() => del(item.id)} style={{ flex: 1, padding: '5px', background: '#fee2e2', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.72rem', color: '#dc2626' }}>削除</button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {previewItem && <ImagePreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '560px', maxHeight: '92vh', overflowY: 'auto', padding: '28px' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: '1.1rem', fontWeight: '700', color: '#1e293b' }}>
              {editing ? '素材を編集' : '素材を追加'}
            </h2>

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>名前 *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder="例：西宮店_春キャンペーン_メイン" />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>店舗 *</label>
              <StoreSelect value={form.store} onChange={v => setForm(f => ({ ...f, store: v }))} required />
            </div>

            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#374151', marginBottom: '12px' }}>
                サイズ別素材（3パターン1セット）
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {[0, 1, 2].map(i => {
                  const labelKey = sizeLabels[i];
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#6366f1', background: '#eef2ff', padding: '2px 7px', borderRadius: '99px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {i === 0 ? '必須' : '任意'}
                        </span>
                        <input
                          value={form[labelKey]}
                          onChange={e => setForm(f => ({ ...f, [labelKey]: e.target.value }))}
                          style={{ ...inputStyle, padding: '4px 8px', fontSize: '0.72rem' }}
                          placeholder={['スクエア(1:1)', 'ストーリー(9:16)', '横型(16:9)'][i]}
                        />
                      </div>
                      <MediaSlot
                        index={i}
                        file={files[i]}
                        existingUrl={editing ? editing[urlKeys[i]] : null}
                        existingType={editing?.media_type}
                        onFile={f => setFiles(prev => { const n = [...prev]; n[i] = f; return n; })}
                        onClear={() => { setFiles(prev => { const n = [...prev]; n[i] = null; return n; }); setClears(prev => { const n = [...prev]; if (i > 0) n[i] = true; return n; }); }}
                        editing={!!editing}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>タグ（カンマ区切り）</label>
              <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} style={inputStyle} placeholder="例：春, キャンペーン, スクエア" />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>メモ</label>
              <textarea value={form.memo} onChange={e => setForm(f => ({ ...f, memo: e.target.value }))} style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }} placeholder="使用用途や注意点など" />
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

function MediaSlotViewer({ urls, labels, type }) {
  const [active, setActive] = useState(0);
  if (!urls.length) return <div style={{ paddingTop: '60%', background: '#f8fafc' }} />;
  const src = `${API_BASE}${urls[active] || urls[0]}`;
  return (
    <div>
      <div style={{ position: 'relative', paddingTop: '70%', background: '#f8fafc' }}>
        {type === 'video'
          ? <video src={src} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          : <img src={src} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { e.target.style.display = 'none'; }} />
        }
      </div>
      {urls.length > 1 && (
        <div style={{ display: 'flex', gap: '4px', padding: '6px 8px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
          {urls.map((_, i) => (
            <button key={i} onClick={() => setActive(i)} style={{
              flex: 1, padding: '3px 6px', fontSize: '0.65rem', fontWeight: '600',
              border: '1px solid', borderRadius: '5px', cursor: 'pointer',
              borderColor: active === i ? '#6366f1' : '#e2e8f0',
              background: active === i ? '#eef2ff' : '#fff',
              color: active === i ? '#6366f1' : '#94a3b8',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {labels[i] || `サイズ${i + 1}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 広告文タブ ───────────────────────────────────────────────────────────────

function TextTab({ isOwner }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', headline: '', headline_2: '', headline_3: '', headline_4: '', headline_5: '', body_text: '', memo: '', tags: '', store: '' });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const load = async (q, store) => {
    setLoading(true);
    try {
      const params = {};
      if (q) params.search = q;
      if (store && store !== 'all') params.store = store;
      const res = await creativeTextAPI.getAll(params);
      setItems(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(search, storeFilter); }, [storeFilter]);

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', headline: '', body_text: '', memo: '', tags: '', store: '' });
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ name: item.name, headline: item.headline || '', headline_2: item.headline_2 || '', headline_3: item.headline_3 || '', headline_4: item.headline_4 || '', headline_5: item.headline_5 || '', body_text: item.body_text || '', memo: item.memo || '', tags: item.tags || '', store: item.store || '' });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) return alert('名前を入力してください');
    setSaving(true);
    try {
      if (editing) { await creativeTextAPI.update(editing.id, form); }
      else { await creativeTextAPI.create(form); }
      setShowForm(false);
      load(search, storeFilter);
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
      <div style={{ display: 'flex', gap: '12px', marginBottom: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
        <form onSubmit={e => { e.preventDefault(); load(search, storeFilter); }} style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '200px' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="名前・見出し・本文・タグで検索..."
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', outline: 'none' }} />
          <button type="submit" style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem' }}>検索</button>
        </form>
        {isOwner && <button onClick={openNew} style={{ padding: '8px 18px', background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600', whiteSpace: 'nowrap' }}>＋ 追加</button>}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <StoreFilter value={storeFilter} onChange={v => setStoreFilter(v)} />
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#1e293b' }}>{item.name}</div>
                      {item.store && (
                        <span style={{ fontSize: '0.65rem', padding: '1px 7px', background: '#fef3c7', color: '#d97706', borderRadius: '99px', flexShrink: 0 }}>{item.store}</span>
                      )}
                    </div>
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
                    {isOwner && <button onClick={e => { e.stopPropagation(); openEdit(item); }} style={{ padding: '5px 12px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', color: '#475569' }}>編集</button>}
                    {isOwner && <button onClick={e => { e.stopPropagation(); del(item.id); }} style={{ padding: '5px 12px', background: '#fee2e2', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', color: '#dc2626' }}>削除</button>}
                    <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{expanded ? '▲' : '▼'}</span>
                  </div>
                </div>
                {expanded && (
                  <div style={{ padding: '0 18px 16px', borderTop: '1px solid #f1f5f9' }}>
                    {[item.headline, item.headline_2, item.headline_3, item.headline_4, item.headline_5].some(Boolean) && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>見出し</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {[item.headline, item.headline_2, item.headline_3, item.headline_4, item.headline_5].map((h, i) => h ? (
                            <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6366f1', background: '#eef2ff', padding: '1px 7px', borderRadius: '99px', flexShrink: 0 }}>見出し{i + 1}</span>
                              <div style={{ fontSize: '0.875rem', color: '#1e293b', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', flex: 1 }}>{h}</div>
                            </div>
                          ) : null)}
                        </div>
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
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder="例：西宮店_美容鍼LP_夏_見出しA" />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>店舗 *</label>
              <StoreSelect value={form.store} onChange={v => setForm(f => ({ ...f, store: v }))} required />
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#374151', marginBottom: '10px' }}>見出し（最大5つ）</div>
              {[
                { key: 'headline',   label: '見出し1', placeholder: '例：【限定】美容鍼で本格ケア ¥1,980〜' },
                { key: 'headline_2', label: '見出し2', placeholder: '' },
                { key: 'headline_3', label: '見出し3', placeholder: '' },
                { key: 'headline_4', label: '見出し4', placeholder: '' },
                { key: 'headline_5', label: '見出し5', placeholder: '' },
              ].map(({ key, label, placeholder }) => (
                <div key={key} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#6366f1', background: '#eef2ff', padding: '2px 8px', borderRadius: '99px', whiteSpace: 'nowrap' }}>{label}</span>
                  <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ ...inputStyle, padding: '7px 10px', fontSize: '0.82rem' }} placeholder={placeholder} />
                </div>
              ))}
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>本文</label>
              <textarea value={form.body_text} onChange={e => setForm(f => ({ ...f, body_text: e.target.value }))} style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }} placeholder="広告本文を入力..." />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>タグ（カンマ区切り）</label>
              <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} style={inputStyle} placeholder="例：西宮, 美容鍼, 夏" />
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
  const { user } = useAuth();
  const isOwner = user?.role === 'owner';

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>クリエイティブ管理</h1>
        <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px' }}>画像/動画素材と広告文を店舗別に管理できます</p>
      </div>

      <div style={{ display: 'flex', marginBottom: '24px', borderBottom: '2px solid #e2e8f0' }}>
        {[
          { key: 'images', label: '画像/動画素材' },
          { key: 'texts',  label: '広告文' },
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

      {tab === 'images' ? <ImageTab isOwner={isOwner} /> : <TextTab isOwner={isOwner} />}
    </div>
  );
}
