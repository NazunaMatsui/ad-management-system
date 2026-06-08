import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  TrendingUp, 
  FileText, 
  LogOut,
  Menu,
  X
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'ダッシュボード', path: '/', icon: LayoutDashboard },
    { name: '期間比較', path: '/compare', icon: TrendingUp },
    { name: '運用メモ', path: '/memos', icon: FileText }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* サイドバー */}
      <aside style={{
        width: '250px',
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        height: '100vh',
        zIndex: 40
      }}>
        {/* ロゴ */}
        <div style={{ 
          padding: '1.5rem', 
          borderBottom: '1px solid var(--border-color)'
        }}>
          <h1 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '700',
            background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-green))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            📊 Ad Manager
          </h1>
          <p style={{ 
            fontSize: '0.75rem', 
            color: 'var(--text-muted)',
            marginTop: '0.25rem'
          }}>
            広告費管理システム
          </p>
        </div>

        {/* ナビゲーション */}
        <nav style={{ flex: 1, padding: '1rem', overflow: 'auto' }}>
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  marginBottom: '0.5rem',
                  textDecoration: 'none',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  backgroundColor: active ? 'var(--bg-hover)' : 'transparent',
                  transition: 'all 0.2s',
                  fontSize: '0.875rem',
                  fontWeight: active ? '600' : '400'
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* ユーザー情報 */}
        <div style={{ 
          padding: '1rem', 
          borderTop: '1px solid var(--border-color)'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '0.75rem'
          }}>
            <div>
              <div style={{ 
                fontSize: '0.875rem', 
                fontWeight: '600',
                marginBottom: '0.125rem'
              }}>
                {user?.username}
              </div>
              <div style={{ 
                fontSize: '0.75rem', 
                color: 'var(--text-muted)'
              }}>
                {user?.email}
              </div>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <LogOut size={16} />
            ログアウト
          </button>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <main style={{ 
        marginLeft: '250px', 
        flex: 1,
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)'
      }}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
