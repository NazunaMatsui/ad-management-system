import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
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
                <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1rem' }}>
                  📈 期間比較
                </h1>
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
