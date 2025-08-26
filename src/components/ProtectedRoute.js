import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Login from './Login';
import LoadingIndicator from './LoadingIndicator';

const ProtectedRoute = ({ children }) => {
  const { user, loading, login, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <LoadingIndicator />
        <p>Verificando acceso...</p>
      </div>
    );
  }

  if (!isAuthenticated()) {
    return <Login onLogin={login} />;
  }

  return children;
};

export default ProtectedRoute;
