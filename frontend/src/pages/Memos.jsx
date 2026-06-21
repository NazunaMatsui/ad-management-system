import React, { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { campaignAPI, memoAPI } from '../utils/api';
import { FileText, Plus, Trash2, Edit2, Save, X, ChevronDown } from 'lucide-react';

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

const CAMPAIGN_ALL = '';

export default function Memos() {
  const [campaigns, setCampaigns] = useState([]);
  const [memos, setMemos] = useState([]);
  const [loading, setLoading] = useState(true);

  // フィルター
  const [filterCampaign, setFilterCampaign] = useState(CAMPAIGN_ALL);

  // 新規入力フォーム
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ campaign_id: '', date: format(new Date(), 'yyyy-MM-dd'), memo_content: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // 編集
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    campaignAPI.getAll().then(r => {
      setCampaigns(r.data);
      if (r.data.length > 0) setForm(f => ({ ...f, campaign_id: String(r.data[0].campaign_id) }));
    });
  }, []);

  const fetchMemos = () => {
    setLoading(true);
    const params = {};
    if (filterCampaign) params.campaign_id = filterCampaign;
    memoAPI.get(params)
      .then(r => setMemos(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchMemos(); }, [filterCampaign]);

  const handleCreate = async () => {
    if (!form.campaign_id || !form.date || !form.memo_content.trim()) {
      setFormError('すべての項目を入力してください');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await memoAPI.create({ ...form, campaign_id: parseInt(form.campaign_id) });
      setForm(f => ({ ...f, memo_content: '' }));
      setShowForm(false);
      fetchMemos();
    } catch {
      setFormError('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id) => {
    if (!editContent.trim()) return;
    try {
      const memo = memos.find(m => m.id === id);
      await memoAPI.update(id, {
        campaign_id: memo.campaign_id,
        date: memo.date,
        memo_content: editContent,
      });
      setEditingId(null);
      fetchMemos();
    } catch {}
  };

  const handleDelete = async (id) => {
    if (!window.confirm('このメモを削除しますか？')) return;
    try {
      await memoAPI.delete(id);
      fetchMemos();
    } catch {}
  };

  const groupedMemos = memos.reduce((acc, m) => {
    const key = m.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});
  const sortedDates = Object.keys(groupedMemos).sort((a, b) => b.localeCompare(a));

  const statusConfig = {
    active:  { label: '運用中', bg: '#dcfce7', color: '#16a34a' },
    paused:  { label: '停止中', bg: '#fee2e2', color: '#dc2626' },
    testing: { label: 'テスト', bg: '#fef9c3', color: '#ca8a04' },
    ended:   { label: '終了',   bg: '#f1f5f9', color: '#64748b' },
  };

  return (
    <div style={{ padding: '2rem' }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(139,92,246,0.3)', flexShrink: 0
          }}>
            <FileText size={24} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1.2 }}>運用メモ</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.2rem' }}>キャンペーンの運用記録・変更履歴を残す</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none',
            background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
            color: '#fff', fontSize: '0.875rem', fontWeight: '700',
            cursor: 'pointer', boxShadow: '0 2px 8px rgba(139,92,246,0.35)',
          }}
        >
          <Plus size={16} />
          メモを追加
        </button>
      </div>

      {/* 新規入力フォーム */}
      {showForm && (
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', border: '1.5px solid #c4b5fd' }}>
          <div style={{ fontWeight: '700', fontSize: '0.95rem', marginBottom: '1rem', color: '#8b5cf6' }}>新規メモ</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={labelStyle}>キャンペーン</label>
              <select value={form.campaign_id} onChange={e => setForm(f => ({ ...f, campaign_id: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                {campaigns.map(c => <option key={c.campaign_id} value={String(c.campaign_id)}>{c.campaign_name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>日付</label>
              <input type="date" value={form.date} max={format(new Date(), 'yyyy-MM-dd')} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>メモ内容</label>
            <textarea
              value={form.memo_content}
              onChange={e => setForm(f => ({ ...f, memo_content: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCreate(); } }}
              placeholder="運用変更内容、気づいた点、対応事項など..."
              rows={4}
              style={{ ...inputStyle, height: 'auto', padding: '0.625rem 0.875rem', resize: 'vertical', lineHeight: '1.6' }}
            />
          </div>
          {formError && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{formError}</div>}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowForm(false); setFormError(''); }} style={{ padding: '0.5rem 1rem', borderRadius: '7px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: '0.85rem', cursor: 'pointer' }}>
              キャンセル
            </button>
            <button onClick={handleCreate} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.25rem', borderRadius: '7px', border: 'none', background: saving ? '#94a3b8' : 'linear-gradient(135deg,#8b5cf6,#ec4899)', color: '#fff', fontSize: '0.85rem', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer' }}>
              <Save size={14} />{saving ? '保存中...' : '保存する'}
            </button>
          </div>
        </div>
      )}

      {/* フィルター */}
      <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <label style={{ ...labelStyle, marginBottom: 0, whiteSpace: 'nowrap' }}>キャンペーン</label>
        <select value={filterCampaign} onChange={e => setFilterCampaign(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: '200px' }}>
          <option value="">すべて</option>
          {campaigns.map(c => <option key={c.campaign_id} value={String(c.campaign_id)}>{c.campaign_name}</option>)}
        </select>
        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{memos.length}件</span>
      </div>

      {/* メモ一覧 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>読み込み中...</div>
      ) : memos.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          <FileText size={40} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
          <div>メモがありません</div>
          <div style={{ fontSize: '0.8rem', marginTop: '0.375rem' }}>「メモを追加」ボタンから記録を残せます</div>
        </div>
      ) : (
        <div>
          {sortedDates.map(date => (
            <div key={date} style={{ marginBottom: '1.5rem' }}>
              {/* 日付ヘッダー */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.625rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', whiteSpace: 'nowrap' }}>{date}</div>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
              </div>
              {/* その日のメモ */}
              {groupedMemos[date].map(memo => {
                const camp = campaigns.find(c => c.campaign_id === memo.campaign_id);
                const st = statusConfig[camp?.status] || statusConfig.active;
                const isEditing = editingId === memo.id;
                return (
                  <div key={memo.id} className="card" style={{ padding: '1rem 1.25rem', marginBottom: '0.625rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        {/* キャンペーン名 + ステータス */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1e293b' }}>{memo.campaign_name}</span>
                          {camp && (
                            <span style={{ fontSize: '0.62rem', fontWeight: '600', padding: '0.1rem 0.375rem', borderRadius: '99px', backgroundColor: st.bg, color: st.color }}>
                              {st.label}
                            </span>
                          )}
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>by {memo.created_by_name}</span>
                        </div>
                        {/* メモ本文 */}
                        {isEditing ? (
                          <div>
                            <textarea
                              value={editContent}
                              onChange={e => setEditContent(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleUpdate(memo.id); } }}
                              rows={3}
                              autoFocus
                              style={{ ...inputStyle, height: 'auto', padding: '0.5rem 0.75rem', resize: 'vertical', lineHeight: '1.6', fontSize: '0.875rem' }}
                            />
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                              <button onClick={() => setEditingId(null)} style={{ padding: '0.3rem 0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: '0.78rem', cursor: 'pointer' }}>
                                <X size={12} style={{ display: 'inline', marginRight: '0.2rem' }} />キャンセル
                              </button>
                              <button onClick={() => handleUpdate(memo.id)} style={{ padding: '0.3rem 0.75rem', borderRadius: '6px', border: 'none', background: 'linear-gradient(135deg,#8b5cf6,#ec4899)', color: '#fff', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer' }}>
                                <Save size={12} style={{ display: 'inline', marginRight: '0.2rem' }} />保存
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p style={{ fontSize: '0.875rem', color: '#374151', lineHeight: '1.6', whiteSpace: 'pre-wrap', margin: 0 }}>{memo.memo_content}</p>
                        )}
                      </div>
                      {/* 操作ボタン */}
                      {!isEditing && (
                        <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                          <button onClick={() => { setEditingId(memo.id); setEditContent(memo.memo_content); }} style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="編集">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => handleDelete(memo.id)} style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #fee2e2', background: '#fff5f5', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="削除">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
