import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CampaignDetail from './pages/CampaignDetail';
import Compare from './pages/Compare';
import Campaigns from './pages/Campaigns';
import DataEntry from './pages/DataEntry';
import Memos from './pages/Memos';
import Creatives from './pages/Creatives';
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
              <Compare />
            </Layout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/campaigns"
        element={
          <ProtectedRoute>
            <Layout>
              <Campaigns />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/data-entry"
        element={
          <ProtectedRoute>
            <Layout>
              <DataEntry />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/memos"
        element={
          <ProtectedRoute>
            <Layout>
              <Memos />
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

      <Route
        path="/creatives"
        element={
          <ProtectedRoute>
            <Layout>
              <Creatives />
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
