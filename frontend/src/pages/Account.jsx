import React, { useState, useRef, useCallback } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function Account() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [emailForm, setEmailForm] = useState({ current_password: '', new_email: '', confirm_email: '' });
  const [msg, setMsg] = useState(null);
  const [emailMsg, setEmailMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(() => user?.avatar || null);
  const [avatarHover, setAvatarHover] = useState(false);
  const [cropSrc, setCropSrc] = useState(null);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);

  const roleLabel = user?.role === 'owner' ? 'オーナー' : '管理者';

  const handleAvatarClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        alert('画像サイズは5MB以下にしてください');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => setCropSrc(ev.target.result);
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const onImageLoad = useCallback((e) => {
    const { width, height } = e.currentTarget;
    const c = centerCrop(makeAspectCrop({ unit: '%', width: 80 }, 1, width, height), width, height);
    setCrop(c);
  }, []);

  const getCroppedBase64 = () => {
    const image = imgRef.current;
    if (!image || !completedCrop) return null;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const size = 256;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(
      image,
      completedCrop.x * scaleX, completedCrop.y * scaleY,
      completedCrop.width * scaleX, completedCrop.height * scaleY,
      0, 0, size, size
    );
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  const handleCropDone = async () => {
    const base64 = getCroppedBase64();
    if (!base64) return;
    setCropSrc(null);
    setAvatarPreview(base64);
    try {
      await api.patch('/auth/me/avatar', { avatar: base64 });
      updateUser({ avatar: base64 });
    } catch {
      alert('アバターの保存に失敗しました');
    }
  };

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const handleEmailChange = (e) => setEmailForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setEmailMsg(null);
    if (emailForm.new_email !== emailForm.confirm_email) {
      setEmailMsg({ type: 'error', text: '新しいメールアドレスが一致しません' });
      return;
    }
    setEmailLoading(true);
    try {
      const res = await api.post('/auth/change-email', {
        current_password: emailForm.current_password,
        new_email: emailForm.new_email,
      });
      // Update token and user in sessionStorage
      sessionStorage.setItem('token', res.data.token);
      const updatedUser = { ...user, email: res.data.email };
      sessionStorage.setItem('user', JSON.stringify(updatedUser));
      // Reload to refresh auth context
      window.location.reload();
    } catch (err) {
      setEmailMsg({ type: 'error', text: err.response?.data?.error || 'メールアドレスの変更に失敗しました' });
      setEmailLoading(false);
    }
  };

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
    <div style={{ padding: '1.75rem 2rem', maxWidth: '900px' }}>

      {/* トリミングモーダル */}
      {cropSrc && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '16px',
            padding: '1.5rem', maxWidth: '480px', width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1e293b', marginBottom: '1rem' }}>
              画像をトリミング
            </h3>
            <div style={{ maxHeight: '360px', overflow: 'auto', display: 'flex', justifyContent: 'center' }}>
              <ReactCrop
                crop={crop} onChange={c => setCrop(c)}
                onComplete={c => setCompletedCrop(c)}
                aspect={1} circularCrop
              >
                <img ref={imgRef} src={cropSrc} onLoad={onImageLoad}
                  style={{ maxWidth: '100%', maxHeight: '360px' }} alt="crop" />
              </ReactCrop>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setCropSrc(null)} style={{
                padding: '0.5rem 1rem', borderRadius: '8px',
                border: '1px solid #e2e8f0', backgroundColor: '#fff',
                color: '#64748b', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer',
              }}>キャンセル</button>
              <button onClick={handleCropDone} style={{
                padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none',
                background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
                color: 'white', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer',
              }}>この範囲で保存</button>
            </div>
          </div>
        </div>
      )}

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
          <div
            onClick={handleAvatarClick}
            onMouseEnter={() => setAvatarHover(true)}
            onMouseLeave={() => setAvatarHover(false)}
            style={{
              width: '52px', height: '52px', borderRadius: '50%',
              background: avatarPreview ? 'none' : 'linear-gradient(135deg,#3b82f6,#6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '1.25rem', fontWeight: '700', flexShrink: 0,
              cursor: 'pointer', position: 'relative', overflow: 'hidden',
            }}
          >
            {avatarPreview
              ? <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              : user?.username?.[0]
            }
            {avatarHover && (
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                backgroundColor: 'rgba(0,0,0,0.45)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.6rem', color: 'white', fontWeight: '600', textAlign: 'center', lineHeight: 1.3,
              }}>
                変更
              </div>
            )}
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

      {/* メールアドレス変更・パスワード変更 横並び */}
      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>

      {/* メールアドレス変更 */}
      <div style={{
        flex: 1, backgroundColor: '#fff', borderRadius: '12px',
        border: '1px solid #e2e8f0', padding: '1.5rem',
      }}>
        <h2 style={{ fontSize: '1rem', fontWeight: '700', color: '#1e293b', marginBottom: '1.25rem' }}>
          メールアドレス変更
        </h2>

        {emailMsg && (
          <div style={{
            padding: '0.65rem 1rem', borderRadius: '8px', marginBottom: '1rem',
            fontSize: '0.84rem', fontWeight: '500',
            backgroundColor: emailMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
            color: emailMsg.type === 'success' ? '#166534' : '#991b1b',
            border: `1px solid ${emailMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          }}>
            {emailMsg.text}
          </div>
        )}

        <form onSubmit={handleEmailSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>現在のパスワード</label>
            <input
              type="password" name="current_password"
              value={emailForm.current_password} onChange={handleEmailChange}
              style={inputStyle} required autoComplete="current-password"
            />
          </div>
          <div>
            <label style={labelStyle}>新しいメールアドレス</label>
            <input
              type="email" name="new_email"
              value={emailForm.new_email} onChange={handleEmailChange}
              style={inputStyle} required placeholder="new@example.com"
            />
          </div>
          <div>
            <label style={labelStyle}>新しいメールアドレス（確認）</label>
            <input
              type="email" name="confirm_email"
              value={emailForm.confirm_email} onChange={handleEmailChange}
              style={inputStyle} required placeholder="new@example.com"
            />
          </div>
          <button
            type="submit" disabled={emailLoading}
            style={{
              padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none',
              fontSize: '0.875rem', fontWeight: '600', cursor: emailLoading ? 'not-allowed' : 'pointer',
              color: 'white',
              background: emailLoading ? '#94a3b8' : 'linear-gradient(135deg,#3b82f6,#6366f1)',
              boxShadow: emailLoading ? 'none' : '0 2px 6px rgba(99,102,241,0.3)',
              transition: 'all 0.2s', width: 'fit-content',
            }}
          >
            {emailLoading ? '変更中...' : 'メールアドレスを変更する'}
          </button>
        </form>
      </div>

      {/* パスワード変更 */}
      <div style={{
        flex: 1, backgroundColor: '#fff', borderRadius: '12px',
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

      </div>{/* end 横並び */}
    </div>
  );
}
