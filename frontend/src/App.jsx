import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CampaignDetail from './pages/CampaignDetail';
import './styles/globals.css';

// 認証が必要なルートのラッパー
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <p>読み込み中...</p>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/compare"
        element={
          <ProtectedRoute>
            <Layout>
              <div style={{ padding: '2rem' }}>
                <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '14px',
                    background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(16,185,129,0.3)', flexShrink: 0
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                      <polyline points="16 7 22 7 22 13"/>
                    </svg>
                  </div>
                  <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1e293b', lineHeight: 1.2 }}>
                      期間比較
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.2rem' }}>
                      期間ごとのパフォーマンス比較
                    </p>
                  </div>
                </div>
                <div className="card">
                  <p style={{ color: 'var(--text-secondary)' }}>
                    期間比較機能は実装中です。
                  </p>
                </div>
              </div>
            </Layout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/memos"
        element={
          <ProtectedRoute>
            <Layout>
              <div style={{ padding: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1rem' }}>
                  📝 運用メモ
                </h1>
                <div className="card">
                  <p style={{ color: 'var(--text-secondary)' }}>
                    運用メモ機能は実装中です。
                  </p>
                </div>
              </div>
            </Layout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/campaigns/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <CampaignDetail />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
