import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { campaignAPI } from '../utils/api';
import { LogOut, ChevronDown, ChevronRight } from 'lucide-react';
import AiChat from './AiChat';

// CSS角丸アイコンコンポーネント
const NavIcon = ({ gradient, children }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: '26px', height: '26px', borderRadius: '7px',
    background: gradient, color: 'white', fontSize: '13px',
    flexShrink: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.12)'
  }}>
    {children}
  </span>
);

const NAV_ITEMS = [
  {
    name: 'ダッシュボード', path: '/',
    icon: <NavIcon gradient="linear-gradient(135deg,#3b82f6,#6366f1)">⬛</NavIcon>,
    iconActive: <NavIcon gradient="linear-gradient(135deg,#2563eb,#4f46e5)">⬛</NavIcon>,
    iconEl: (active) => (
      <NavIcon gradient={active ? 'linear-gradient(135deg,#2563eb,#4f46e5)' : 'linear-gradient(135deg,#93c5fd,#a5b4fc)'}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
      </NavIcon>
    )
  },
  {
    name: '期間比較', path: '/compare',
    iconEl: (active) => (
      <NavIcon gradient={active ? 'linear-gradient(135deg,#059669,#0891b2)' : 'linear-gradient(135deg,#6ee7b7,#67e8f9)'}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
        </svg>
      </NavIcon>
    )
  },
];

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [campaigns, setCampaigns] = useState([]);
  const [campaignsOpen, setCampaignsOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    campaignAPI.getAll().then(res => setCampaigns(res.data)).catch(() => {});
  }, [location.pathname]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const isActive = (path) => location.pathname === path;
  const isCampaignActive = (id) => location.pathname === `/campaigns/${id}`;

  const linkStyle = (active) => ({
    display: 'flex', alignItems: 'center', gap: '0.625rem',
    padding: '0.55rem 0.75rem',
    marginBottom: '0.125rem', borderRadius: '9px',
    textDecoration: 'none',
    color: active ? '#1e40af' : 'var(--text-secondary)',
    backgroundColor: active ? 'rgba(59,130,246,0.09)' : 'transparent',
    fontWeight: active ? '600' : '400',
    fontSize: '0.875rem', transition: 'all 0.15s'
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: '260px', backgroundColor: '#fff',
        borderRight: '1px solid var(--border-color)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', height: '100vh', zIndex: 40,
      }}>
        {/* ロゴ */}
        <div style={{
          padding: '1.1rem 1.25rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex', alignItems: 'center', gap: '0.75rem'
        }}>
          <div style={{
            width: '34px', height: '34px',
            background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
            borderRadius: '10px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0,
            boxShadow: '0 4px 8px rgba(99,102,241,0.3)'
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', letterSpacing: '-0.01em' }}>Ad Manager</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>広告費管理システム</div>
          </div>
          <span style={{
            fontSize: '0.62rem', fontWeight: '700', padding: '0.15rem 0.5rem',
            borderRadius: '99px', flexShrink: 0,
            backgroundColor: user?.role === 'owner' ? '#eff6ff' : '#f0fdf4',
            color: user?.role === 'owner' ? '#1d4ed8' : '#166534',
            border: `1px solid ${user?.role === 'owner' ? '#bfdbfe' : '#bbf7d0'}`,
          }}>
            {user?.role === 'owner' ? 'オーナー' : '管理者'}
          </span>
        </div>

        {/* ナビ */}
        <nav style={{ flex: 1, padding: '0.875rem 0.75rem', overflow: 'auto' }}>

          {/* ダッシュボード */}
          {[
            {
              name: 'ダッシュボード', path: '/',
              grad: ['linear-gradient(135deg,#3b82f6,#6366f1)', 'linear-gradient(135deg,#93c5fd,#c4b5fd)'],
              svgPath: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>
            },
            {
              name: '期間比較', path: '/compare',
              grad: ['linear-gradient(135deg,#10b981,#06b6d4)', 'linear-gradient(135deg,#6ee7b7,#a5f3fc)'],
              svgPath: <><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></>
            },
            {
              name: 'キャンペーン一覧', path: '/campaigns',
              grad: ['linear-gradient(135deg,#f59e0b,#ef4444)', 'linear-gradient(135deg,#fcd34d,#fca5a5)'],
              svgPath: <><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></>
            },
            {
              name: 'クリエイティブ管理', path: '/creatives',
              grad: ['linear-gradient(135deg,#8b5cf6,#ec4899)', 'linear-gradient(135deg,#c4b5fd,#f9a8d4)'],
              svgPath: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></>
            },
          ].map(item => {
            const active = isActive(item.path);
            return (
              <Link key={item.path} to={item.path}
                style={linkStyle(active)}
                onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '26px', height: '26px', borderRadius: '7px',
                  background: active ? item.grad[0] : item.grad[1],
                  flexShrink: 0, boxShadow: active ? '0 2px 6px rgba(0,0,0,0.15)' : 'none'
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    {item.svgPath}
                  </svg>
                </span>
                {item.name}
              </Link>
            );
          })}

          {/* 管理者メニュー */}
          {user?.role === 'owner' && (
            <div style={{ marginTop: '0.5rem' }}>
              {[{
                name: 'メンバー管理', path: '/admin/users',
                grad: ['linear-gradient(135deg,#f59e0b,#f97316)', 'linear-gradient(135deg,#fcd34d,#fdba74)'],
                svgPath: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>
              }].map(item => {
                const active = isActive(item.path);
                return (
                  <Link key={item.path} to={item.path}
                    style={linkStyle(active)}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: '26px', height: '26px', borderRadius: '7px',
                      background: active ? item.grad[0] : item.grad[1],
                      flexShrink: 0, boxShadow: active ? '0 2px 6px rgba(0,0,0,0.15)' : 'none'
                    }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        {item.svgPath}
                      </svg>
                    </span>
                    {item.name}
                  </Link>
                );
              })}
            </div>
          )}

          {/* キャンペーンセクション */}
          <div style={{ marginTop: '1.25rem' }}>
            <button onClick={() => setCampaignsOpen(o => !o)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', padding: '0.35rem 0.75rem',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: '0.68rem',
              fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '16px', height: '16px', borderRadius: '4px',
                  background: 'linear-gradient(135deg,#f59e0b,#ef4444)'
                }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                  </svg>
                </span>
                キャンペーン
              </span>
              {campaignsOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            </button>

            {campaignsOpen && (
              <div style={{ marginTop: '0.375rem' }}>
                {/* 全キャンペーン合算 */}
                <Link to="/overall"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.5rem 0.75rem', marginBottom: '0.125rem',
                    borderRadius: '8px', textDecoration: 'none',
                    fontSize: '0.82rem',
                    color: isActive('/overall') ? '#1e40af' : 'var(--text-secondary)',
                    backgroundColor: isActive('/overall') ? 'rgba(59,130,246,0.09)' : 'transparent',
                    fontWeight: isActive('/overall') ? '600' : '500', transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => { if (!isActive('/overall')) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { if (!isActive('/overall')) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <span style={{
                    width: '7px', height: '7px', borderRadius: '50%',
                    background: 'linear-gradient(135deg,#3b82f6,#10b981)', flexShrink: 0
                  }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    全キャンペーン合算
                  </span>
                  <span style={{
                    fontSize: '0.62rem', fontWeight: '600', padding: '0.1rem 0.375rem',
                    borderRadius: '99px', backgroundColor: '#dbeafe', color: '#1d4ed8',
                    flexShrink: 0
                  }}>合算</span>
                </Link>
                {campaigns.length === 0 ? (
                  <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    キャンペーンなし
                  </div>
                ) : campaigns.map((c, i) => {
                  const active = isCampaignActive(c.campaign_id);
                  const statusConfig = {
                    active:  { label: '運用中', bg: '#dcfce7', color: '#16a34a', dot: '#22c55e' },
                    paused:  { label: '停止中', bg: '#fee2e2', color: '#dc2626', dot: '#ef4444' },
                    testing: { label: 'テスト', bg: '#fef9c3', color: '#ca8a04', dot: '#f59e0b' },
                    ended:   { label: '終了',   bg: '#f1f5f9', color: '#64748b', dot: '#94a3b8' },
                  };
                  const st = statusConfig[c.status] || statusConfig.active;
                  return (
                    <Link key={c.campaign_id} to={`/campaigns/${c.campaign_id}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.5rem 0.75rem', marginBottom: '0.125rem',
                        borderRadius: '8px', textDecoration: 'none',
                        fontSize: '0.82rem',
                        color: active ? '#1e40af' : 'var(--text-secondary)',
                        backgroundColor: active ? 'rgba(59,130,246,0.09)' : 'transparent',
                        fontWeight: active ? '600' : '400', transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <span style={{
                        width: '7px', height: '7px', borderRadius: '50%',
                        backgroundColor: st.dot, flexShrink: 0
                      }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {c.campaign_name}
                      </span>
                      <span style={{
                        fontSize: '0.62rem', fontWeight: '600', padding: '0.1rem 0.375rem',
                        borderRadius: '99px', backgroundColor: st.bg, color: st.color,
                        flexShrink: 0, letterSpacing: '0.02em'
                      }}>
                        {st.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* ユーザー */}
        <div style={{ padding: '0.875rem', borderTop: '1px solid var(--border-color)', backgroundColor: '#f8fafc' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.625rem',
            padding: '0.4rem 0.5rem', borderRadius: '8px',
          }}>
            <div style={{
              width: '30px', height: '30px', borderRadius: '50%',
              background: user?.avatar ? 'none' : 'linear-gradient(135deg,#3b82f6,#6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '0.8rem', fontWeight: '700', flexShrink: 0,
              overflow: 'hidden',
            }}>
              {user?.avatar
                ? <img src={user.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : user?.username?.[0]
              }
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.username}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
            </div>
            <Link to="/account" style={{ textDecoration: 'none', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '6px', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e2e8f0'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </Link>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem', padding: '0.4rem' }}>
            <LogOut size={13} /> ログアウト
          </button>
        </div>
      </aside>

      <main style={{ marginLeft: '260px', flex: 1, minHeight: '100vh', backgroundColor: 'var(--bg-primary)', overflowX: 'hidden' }}>
        {children}
      </main>

      {/* AI チャットボタン */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          style={{
            position: 'fixed', bottom: '24px', right: '24px', zIndex: 999,
            width: '52px', height: '52px', borderRadius: '50%',
            background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
            border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.15s'
          }}
          title="AIアシスタントに質問する"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            <line x1="9" y1="10" x2="9" y2="10"/><line x1="12" y1="10" x2="12" y2="10"/><line x1="15" y1="10" x2="15" y2="10"/>
          </svg>
        </button>
      )}

      {chatOpen && <AiChat onClose={() => setChatOpen(false)} />}
    </div>
  );
};

export default Layout;
