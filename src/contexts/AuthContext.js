import React, { createContext, useContext, useState, useEffect } from 'react';
import { verificarCredencialesAcceso, registrarLog } from '../services/spreadsheetApi';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay una sesión guardada al inicializar
    const savedAuth = localStorage.getItem('ungrd_auth');
    if (savedAuth) {
      try {
        const authData = JSON.parse(savedAuth);
        // Verificar que la sesión no haya expirado
        const expirationTime = new Date(authData.expiration);
        if (new Date() < expirationTime) {
          // Preserve isAdmin flag if present
          setUser({ ...authData, isAdmin: !!authData.isAdmin });
        } else {
          localStorage.removeItem('ungrd_auth');
        }
      } catch (error) {
        localStorage.removeItem('ungrd_auth');
      }
    }
    setLoading(false);
  }, []);

  const login = async (authData) => {
    setUser(authData);
    localStorage.setItem('ungrd_auth', JSON.stringify(authData));
    
    // Registrar el log de inicio de sesión
    try {
      await registrarLog(authData.email, 'login', 'Usuario inició sesión');
    } catch (error) {
      console.error('Error registrando log de login:', error);
    }
  };

  const logout = async () => {
    // Registrar el log de cierre de sesión antes de limpiar los datos
    if (user) {
      try {
        await registrarLog(user.email, 'logout', 'Usuario cerró sesión');
      } catch (error) {
        console.error('Error registrando log de logout:', error);
      }
    }
    
    setUser(null);
    localStorage.removeItem('ungrd_auth');
  };

  const isAuthenticated = () => {
    if (!user) return false;
    
    // Verificar que la sesión no haya expirado
    const expirationTime = new Date(user.expiration);
    if (new Date() >= expirationTime) {
      logout();
      return false;
    }
    
    return true;
  };

  const isAdminUser = () => {
    return !!(user && user.isAdmin);
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated,
  isAdminUser,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
