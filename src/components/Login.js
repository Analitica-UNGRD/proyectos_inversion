
import React, { useState, useEffect } from 'react';
import LoadingIndicator from './LoadingIndicator';
import { verificarCredencialesAcceso, verificarEmailAdmin } from '../services/spreadsheetApi';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [AuroraComp, setAuroraComp] = useState(null);

  useEffect(() => {
    const savedAuth = localStorage.getItem('ungrd_auth');
    if (savedAuth) {
      try {
        const authData = JSON.parse(savedAuth);
        const expirationTime = new Date(authData.expiration);
        if (new Date() < expirationTime) {
          onLogin(authData);
        } else {
          localStorage.removeItem('ungrd_auth');
        }
      } catch (error) {
        localStorage.removeItem('ungrd_auth');
      }
    }
  }, [onLogin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await verificarCredencialesAcceso(email, password);
      if (result.success) {
        // Verificar si el email es admin
        let isAdmin = false;
        try {
          const adminRes = await verificarEmailAdmin(email);
          if (adminRes && (adminRes.isAdmin === true || adminRes.success === true)) isAdmin = true;
        } catch (err) {
          // ignore
        }

        const authData = {
          email: email,
          authenticated: true,
          isAdmin,
          expiration: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };
        localStorage.setItem('ungrd_auth', JSON.stringify(authData));
        onLogin(authData);
      } else {
        setError(result.message || 'Credenciales incorrectas');
      }
    } catch (err) {
      setError('Error de conexión. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.body.classList.add('login-bg');

    // Carga dinámica de Aurora solo en cliente y con manejo de errores
    if (typeof window !== 'undefined' && window.WebGL2RenderingContext) {
      import('./Aurora')
        .then(mod => setAuroraComp(() => mod.default))
        .catch(err => {
          console.warn('No se pudo cargar Aurora dinámicamente:', err);
          setAuroraComp(null);
        });
    }

    return () => {
      document.body.classList.remove('login-bg');
    };
  }, []);

  return (
    <>
      <div className="login-animated-bg" aria-hidden="true">
        {AuroraComp ? <AuroraComp colorStops={["#FFD600", "#6C4BFF", "#007ACC"]} amplitude={1.05} blend={0.5} /> : null}
        <span className="circle c1"></span>
        <span className="circle c2"></span>
        <span className="circle c3"></span>
        <span className="circle c4"></span>
        <span className="circle c5"></span>
        <span className="circle c6"></span>
      </div>

      <div className="login-container-custom">
      <div className="login-left-custom">
        <img src="/Logo_gris.png" alt="Logo UNGRD" className="login-logo-custom" />
        <div className="login-title-custom">¡Hola, Bienvenido!</div>
        <div className="login-subtitle-custom">Gestión inteligente de proyectos de inversión</div>
        <form className="login-form-custom" onSubmit={handleSubmit}>
          <div className="login-field-custom">
            <svg viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.106 7.222c0-2.967-2.249-5.032-5.482-5.032-3.35 0-5.646 2.318-5.646 5.702 0 3.493 2.235 5.708 5.762 5.708.862 0 1.689-.123 2.304-.335v-.862c-.43.199-1.354.328-2.29.328-2.926 0-4.813-1.88-4.813-4.798 0-2.844 1.921-4.881 4.594-4.881 2.735 0 4.608 1.688 4.608 4.156 0 1.682-.554 2.769-1.416 2.769-.492 0-.772-.28-.772-.76V5.206H8.923v.834h-.11c-.266-.595-.881-.964-1.6-.964-1.4 0-2.378 1.162-2.378 2.823 0 1.737.957 2.906 2.379 2.906.8 0 1.415-.39 1.709-1.087h.11c.081.67.703 1.148 1.503 1.148 1.572 0 2.57-1.415 2.57-3.643zm-7.177.704c0-1.197.54-1.907 1.456-1.907.93 0 1.524.738 1.524 1.907S8.308 9.84 7.371 9.84c-.895 0-1.442-.725-1.442-1.914z"/>
            </svg>
            <input
              type="text"
              className="login-input-custom"
              placeholder="@gestiondelriego.gov.co"
              autoComplete="off"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <div className="login-field-custom">
            <svg viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
            </svg>
            <input
              type="password"
              className="login-input-custom"
              placeholder="Contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          {error && <div className="login-error-custom">{error}</div>}
          <button type="submit" className="login-btn-custom" disabled={loading}>
            {loading ? <LoadingIndicator /> : 'Iniciar Sesión'}
          </button>
        </form>
        <div className="login-help-custom">¿Problemas para acceder? Contacte al administrador del sistema.</div>
      </div>
      <div className="login-right-custom">
        <img src="/Login_UNGRD.png" alt="Login UNGRD" className="login-img-custom" />
      </div>
      </div>
    </>
  );
};

export default Login;
