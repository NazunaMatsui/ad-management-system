import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { campaignAPI } from '../utils/api';
import { LogOut, ChevronDown, ChevronRight } from 'lucide-react';

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

  useEffect(() => {
    campaignAPI.getAll().then(res => setCampaigns(res.data)).catch(() => {});
  }, []);

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
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', letterSpacing: '-0.01em' }}>Ad Manager</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>広告費管理システム</div>
          </div>
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
                {campaigns.length === 0 ? (
                  <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    キャンペーンなし
                  </div>
                ) : campaigns.map((c, i) => {
                  const active = isCampaignActive(c.campaign_id);
                  const dotColors = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];
                  const color = dotColors[i % dotColors.length];
                  const statusConfig = {
                    active:  { label: '運用中', bg: '#dcfce7', color: '#16a34a' },
                    paused:  { label: '停止中', bg: '#fee2e2', color: '#dc2626' },
                    testing: { label: 'テスト', bg: '#fef9c3', color: '#ca8a04' },
                    ended:   { label: '終了',   bg: '#f1f5f9', color: '#64748b' },
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
                        backgroundColor: active ? color : '#cbd5e1', flexShrink: 0
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.625rem' }}>
            <div style={{
              width: '30px', height: '30px', borderRadius: '50%',
              background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '0.8rem', fontWeight: '700', flexShrink: 0
            }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.username}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem', padding: '0.4rem' }}>
            <LogOut size={13} /> ログアウト
          </button>
        </div>
      </aside>

      <main style={{ marginLeft: '260px', flex: 1, minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
