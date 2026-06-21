import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function Account() {
  const { user } = useAuth();
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const roleLabel = user?.role === 'owner' ? 'オーナー' : '管理者';

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (form.new_password !== form.confirm_password) {
      setMsg({ type: 'error', text: '新しいパスワードが一致しません' });
      return;
    }
    if (form.new_password.length < 6) {
      setMsg({ type: 'error', text: 'パスワードは6文字以上で入力してください' });
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        current_password: form.current_password,
        new_password: form.new_password,
      });
      setMsg({ type: 'success', text: 'パスワードを変更しました' });
      setForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'パスワードの変更に失敗しました' });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '0.55rem 0.75rem',
    border: '1px solid #e2e8f0', borderRadius: '8px',
    fontSize: '0.875rem', color: '#1e293b',
    outline: 'none', boxSizing: 'border-box',
    backgroundColor: '#fff',
  };

  const labelStyle = {
    display: 'block', fontSize: '0.78rem',
    fontWeight: '600', color: '#64748b',
    marginBottom: '0.375rem',
  };

  return (
    <div style={{ padding: '1.75rem 2rem', maxWidth: '560px' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.25rem' }}>
        アカウント情報
      </h1>
      <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '2rem' }}>
        ログイン中のユーザー情報とパスワード変更
      </p>

      {/* プロフィールカード */}
      <div style={{
        backgroundColor: '#fff', borderRadius: '12px',
        border: '1px solid #e2e8f0', padding: '1.5rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%',
            background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: '1.25rem', fontWeight: '700', flexShrink: 0,
          }}>
            {user?.username?.[0]}
          </div>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#1e293b' }}>
              {user?.username}
            </div>
            <span style={{
              display: 'inline-block', fontSize: '0.72rem', fontWeight: '600',
              padding: '0.15rem 0.6rem', borderRadius: '99px', marginTop: '0.25rem',
              backgroundColor: user?.role === 'owner' ? '#eff6ff' : '#f0fdf4',
              color: user?.role === 'owner' ? '#1d4ed8' : '#166534',
            }}>
              {roleLabel}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '0.875rem' }}>
          {[
            { label: '名前', value: user?.username },
            { label: 'メールアドレス', value: user?.email },
            { label: '権限', value: roleLabel },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '500' }}>{label}</span>
              <span style={{ fontSize: '0.875rem', color: '#1e293b', fontWeight: '500' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* パスワード変更 */}
      <div style={{
        backgroundColor: '#fff', borderRadius: '12px',
        border: '1px solid #e2e8f0', padding: '1.5rem',
      }}>
        <h2 style={{ fontSize: '1rem', fontWeight: '700', color: '#1e293b', marginBottom: '1.25rem' }}>
          パスワード変更
        </h2>

        {msg && (
          <div style={{
            padding: '0.65rem 1rem', borderRadius: '8px', marginBottom: '1rem',
            fontSize: '0.84rem', fontWeight: '500',
            backgroundColor: msg.type === 'success' ? '#f0fdf4' : '#fef2f2',
            color: msg.type === 'success' ? '#166534' : '#991b1b',
            border: `1px solid ${msg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          }}>
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>現在のパスワード</label>
            <input
              type="password" name="current_password"
              value={form.current_password} onChange={handleChange}
              style={inputStyle} required autoComplete="current-password"
            />
          </div>
          <div>
            <label style={labelStyle}>新しいパスワード</label>
            <input
              type="password" name="new_password"
              value={form.new_password} onChange={handleChange}
              style={inputStyle} required autoComplete="new-password"
              placeholder="6文字以上"
            />
          </div>
          <div>
            <label style={labelStyle}>新しいパスワード（確認）</label>
            <input
              type="password" name="confirm_password"
              value={form.confirm_password} onChange={handleChange}
              style={inputStyle} required autoComplete="new-password"
            />
          </div>
          <button
            type="submit" disabled={loading}
            style={{
              padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none',
              fontSize: '0.875rem', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer',
              color: 'white',
              background: loading ? '#94a3b8' : 'linear-gradient(135deg,#3b82f6,#6366f1)',
              boxShadow: loading ? 'none' : '0 2px 6px rgba(99,102,241,0.3)',
              transition: 'all 0.2s', width: 'fit-content',
            }}
          >
            {loading ? '変更中...' : 'パスワードを変更する'}
          </button>
        </form>
      </div>
    </div>
  );
}
