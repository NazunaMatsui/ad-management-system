import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

function genPassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function AdminUsers() {
  const { user } = useAuth();
  const isPrimaryOwner = user?.email === 'n-matsui@nexmesh.jp';
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ username: '', email: '', role: 'admin' });
  const [tempPassword, setTempPassword] = useState('');
  const [newUser, setNewUser] = useState(null);
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user?.role !== 'owner') { navigate('/'); return; }
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data);
    } catch {
      setMsg({ type: 'error', text: 'ユーザー一覧の取得に失敗しました' });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = () => setTempPassword(genPassword());

  const handleAdd = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (!tempPassword) { setMsg({ type: 'error', text: '仮パスワードを生成してください' }); return; }
    setSaving(true);
    try {
      const res = await api.post('/auth/register', { ...form, password: tempPassword });
      setNewUser({ ...res.data.user, tempPassword });
      setForm({ username: '', email: '', role: 'viewer' });
      setTempPassword('');
      await load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || '追加に失敗しました' });
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (id, newRole) => {
    try {
      await api.patch(`/auth/users/${id}/role`, { role: newRole });
      await load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || '権限変更に失敗しました' });
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`「${name}」を削除しますか？`)) return;
    try {
      await api.delete(`/auth/users/${id}`);
      await load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || '削除に失敗しました' });
    }
  };

  const copyInfo = () => {
    if (!newUser) return;
    const text = `【ログイン情報】\nメール: ${newUser.email}\n仮パスワード: ${newUser.tempPassword}\nURL: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inputStyle = {
    width: '100%', padding: '0.55rem 0.75rem',
    border: '1px solid #e2e8f0', borderRadius: '8px',
    fontSize: '0.875rem', color: '#1e293b',
    outline: 'none', boxSizing: 'border-box', backgroundColor: '#fff',
  };

  return (
    <div style={{ padding: '1.75rem 2rem', maxWidth: '700px' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.25rem' }}>
        メンバー管理
      </h1>
      <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '2rem' }}>
        登録ユーザーの確認と追加（管理者のみ）
      </p>

      {msg && (
        <div style={{
          padding: '0.65rem 1rem', borderRadius: '8px', marginBottom: '1.25rem',
          fontSize: '0.84rem', fontWeight: '500',
          backgroundColor: msg.type === 'success' ? '#f0fdf4' : '#fef2f2',
          color: msg.type === 'success' ? '#166534' : '#991b1b',
          border: `1px solid ${msg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
        }}>
          {msg.text}
        </div>
      )}

      {/* 登録ユーザー一覧 */}
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e293b' }}>登録メンバー</span>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{users.length}名</span>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>読み込み中...</div>
        ) : users.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>メンバーがいません</div>
        ) : (
          <div>
            {users.map((u, i) => (
              <div key={u.user_id} style={{
                display: 'flex', alignItems: 'center', gap: '0.875rem',
                padding: '0.875rem 1.25rem',
                borderBottom: i < users.length - 1 ? '1px solid #f8fafc' : 'none',
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: u.role === 'owner' ? 'linear-gradient(135deg,#3b82f6,#6366f1)' : 'linear-gradient(135deg,#10b981,#06b6d4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: '0.875rem', fontWeight: '700', flexShrink: 0,
                }}>
                  {u.username?.[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1e293b' }}>{u.username}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.1rem' }}>{u.email}</div>
                </div>
                {u.user_id === user?.userId ? (
                  <span style={{
                    fontSize: '0.7rem', fontWeight: '600', padding: '0.15rem 0.55rem',
                    borderRadius: '99px', flexShrink: 0,
                    backgroundColor: '#eff6ff', color: '#1d4ed8',
                  }}>
                    オーナー
                  </span>
                ) : isPrimaryOwner ? (
                  <select
                    value={u.role}
                    onChange={e => handleRoleChange(u.user_id, e.target.value)}
                    style={{
                      fontSize: '0.72rem', fontWeight: '600', padding: '0.2rem 0.5rem',
                      borderRadius: '6px', border: '1px solid #e2e8f0',
                      backgroundColor: u.role === 'owner' ? '#eff6ff' : '#f0fdf4',
                      color: u.role === 'owner' ? '#1d4ed8' : '#166534',
                      cursor: 'pointer', flexShrink: 0,
                    }}
                  >
                    <option value="admin">管理者</option>
                    <option value="owner">オーナー</option>
                  </select>
                ) : (
                  <span style={{
                    fontSize: '0.7rem', fontWeight: '600', padding: '0.15rem 0.55rem',
                    borderRadius: '99px', flexShrink: 0,
                    backgroundColor: u.role === 'owner' ? '#eff6ff' : '#f0fdf4',
                    color: u.role === 'owner' ? '#1d4ed8' : '#166534',
                  }}>
                    {u.role === 'owner' ? 'オーナー' : '管理者'}
                  </span>
                )}
                {isPrimaryOwner && u.user_id !== user?.userId && (
                  <button
                    onClick={() => handleDelete(u.user_id, u.username)}
                    style={{
                      padding: '0.3rem 0.65rem', borderRadius: '6px', border: '1px solid #fecaca',
                      backgroundColor: '#fff', color: '#dc2626', fontSize: '0.75rem',
                      fontWeight: '600', cursor: 'pointer', flexShrink: 0,
                    }}
                  >
                    削除
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 新規追加完了カード */}
      {newUser && (
        <div style={{
          backgroundColor: '#f0fdf4', borderRadius: '12px',
          border: '1px solid #bbf7d0', padding: '1.25rem', marginBottom: '1.5rem',
        }}>
          <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#166534', marginBottom: '0.75rem' }}>
            追加完了 — 以下をメンバーに共有してください
          </div>
          <div style={{ display: 'grid', gap: '0.4rem', fontSize: '0.84rem', color: '#1e293b', marginBottom: '0.875rem' }}>
            <div><span style={{ color: '#64748b', marginRight: '0.5rem' }}>名前</span>{newUser.username}</div>
            <div><span style={{ color: '#64748b', marginRight: '0.5rem' }}>メール</span>{newUser.email}</div>
            <div>
              <span style={{ color: '#64748b', marginRight: '0.5rem' }}>仮パスワード</span>
              <code style={{ backgroundColor: '#dcfce7', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: '700', letterSpacing: '0.05em' }}>
                {newUser.tempPassword}
              </code>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={copyInfo} style={{
              padding: '0.45rem 1rem', borderRadius: '7px', border: 'none',
              backgroundColor: copied ? '#16a34a' : '#22c55e', color: 'white',
              fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer',
            }}>
              {copied ? 'コピーしました' : 'ログイン情報をコピー'}
            </button>
            <button onClick={() => setNewUser(null)} style={{
              padding: '0.45rem 0.75rem', borderRadius: '7px',
              border: '1px solid #bbf7d0', backgroundColor: '#fff',
              color: '#64748b', fontSize: '0.8rem', cursor: 'pointer',
            }}>
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* メンバー追加フォーム */}
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#1e293b', marginBottom: '1.25rem' }}>
          メンバーを追加
        </h2>
        <form onSubmit={handleAdd} style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '0.375rem' }}>名前</label>
            <input
              type="text" required value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              style={inputStyle} placeholder="山田 花子"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '0.375rem' }}>メールアドレス</label>
            <input
              type="email" required value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              style={inputStyle} placeholder="hanako@example.com"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '0.375rem' }}>権限</label>
            <select
              value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              style={inputStyle}
            >
              <option value="admin">管理者</option>
              <option value="owner">オーナー</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '0.375rem' }}>仮パスワード</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text" readOnly value={tempPassword}
                style={{ ...inputStyle, flex: 1, backgroundColor: '#f8fafc', fontFamily: 'monospace', letterSpacing: '0.05em' }}
                placeholder="右のボタンで生成"
              />
              <button type="button" onClick={handleGenerate} style={{
                padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc', color: '#475569', fontSize: '0.8rem',
                fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                生成
              </button>
            </div>
            <p style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.375rem' }}>
              メンバーにこのパスワードを伝え、ログイン後に変更してもらってください
            </p>
          </div>
          <button type="submit" disabled={saving} style={{
            padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none',
            fontSize: '0.875rem', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer',
            color: 'white',
            background: saving ? '#94a3b8' : 'linear-gradient(135deg,#3b82f6,#6366f1)',
            boxShadow: saving ? 'none' : '0 2px 6px rgba(99,102,241,0.3)',
            width: 'fit-content',
          }}>
            {saving ? '追加中...' : 'メンバーを追加する'}
          </button>
        </form>
      </div>
    </div>
  );
}
