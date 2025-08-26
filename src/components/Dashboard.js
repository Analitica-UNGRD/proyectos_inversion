import React, { useState, useEffect } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { verificarEmailAdmin } from '../services/spreadsheetApi';
import { useAuth } from '../contexts/AuthContext';
import useLogger from '../hooks/useLogger';
import { 
  FaEdit, 
  FaChartBar, 
  FaDesktop, 
  FaBook, 
  FaExternalLinkAlt,
  FaProjectDiagram,
  FaUserShield,
  FaSignOutAlt,
  FaUser
} from 'react-icons/fa';
import { obtenerLogsRecientes, getSystemConfig } from '../services/spreadsheetApi';

const Dashboard = () => {
  const history = useHistory();
  const { user, logout, isAdminUser } = useAuth();
  const { log } = useLogger();
  const [notificacion, setNotificacion] = useState(null);

  // Registrar acceso al dashboard
  useEffect(() => {
    log('dashboard_access', 'Usuario accedió al dashboard');
  }, [log]);

  const manejarCerrarSesion = () => {
    if (window.confirm('¿Está seguro que desea cerrar sesión?')) {
      logout();
    }
  };

  const mostrarNotificacion = (mensaje, tipo = 'error') => {
    setNotificacion({ mensaje, tipo });
    setTimeout(() => setNotificacion(null), 4000); // Se oculta después de 4 segundos
  };

    const manejarAccesoAdmin = async () => {
    // Si el usuario ya está marcado como admin en el AuthContext, no pedir email
    if (isAdminUser && isAdminUser()) {
      log('admin_access_granted', `Acceso admin automático para: ${user?.email}`);
      mostrarNotificacion('Acceso autorizado. Redirigiendo...', 'success');
      setTimeout(() => history.push('/admin'), 400);
      return;
    }

    // Si no está identificado como admin, pedir email y verificar
    const email = prompt('Ingrese su email de administrador:');
    if (!email) return; // Usuario canceló

    log('admin_access_attempt', `Intento de acceso admin con email: ${email}`);

    try {
      const resultado = await verificarEmailAdmin(email);
      if (resultado.success && resultado.esAdmin) {
        log('admin_access_granted', `Acceso admin autorizado para: ${email}`);
        mostrarNotificacion('Acceso autorizado. Redirigiendo...', 'success');
        setTimeout(() => history.push('/admin'), 1000);
      } else {
        log('admin_access_denied', `Acceso admin denegado para: ${email}`);
        mostrarNotificacion('Acceso denegado. El email ingresado no tiene permisos de administrador.');
      }
    } catch (error) {
      log('admin_access_error', `Error en verificación admin: ${error.message}`);
      mostrarNotificacion('Error de conexión. Verifique su conexión e intente nuevamente.');
      console.error('Error en autenticación:', error);
    }
  };

  const mainSections = [
    {
      title: 'Registro de Seguimiento',
      description: 'Gestionar proyectos y actividades existentes',
      icon: FaEdit,
      path: '/formulario',
      color: '#4CAF50',
      gradient: 'linear-gradient(135deg, #4CAF50 0%, #45a049 50%, #66BB6A 100%)',
      shadowColor: 'rgba(76, 175, 80, 0.4)'
    },
    {
      title: 'Presentación',
      description: 'Visualizar datos y métricas del proyecto',
      icon: FaDesktop,
      path: '/presentacion',
      color: '#2196F3',
      gradient: 'linear-gradient(135deg, #2196F3 0%, #1976D2 50%, #42A5F5 100%)',
      shadowColor: 'rgba(33, 150, 243, 0.4)'
    },
    {
      title: 'Gráficos',
      description: 'Análisis visual y estadísticas avanzadas',
      icon: FaChartBar,
      path: '/graficos',
      color: '#FF9800',
      gradient: 'linear-gradient(135deg, #FF9800 0%, #F57C00 50%, #FFB74D 100%)',
      shadowColor: 'rgba(255, 152, 0, 0.4)'
    },
    {
      title: 'Administrador',
      description: 'Crear nuevos proyectos y configuración',
      icon: FaUserShield,
      path: '/admin',
      color: '#9C27B0',
      gradient: 'linear-gradient(135deg, #9C27B0 0%, #7B1FA2 50%, #AB47BC 100%)',
      shadowColor: 'rgba(156, 39, 176, 0.4)'
    },
    {
      title: 'Registro de Actividad',
      description: 'Ver logs de actividad del sistema',
      icon: FaDesktop,
      path: '/logs',
      color: '#607D8B',
      gradient: 'linear-gradient(135deg, #607D8B 0%, #455A64 50%, #78909C 100%)',
      shadowColor: 'rgba(96, 125, 139, 0.4)'
    }
  ];

  const documentationSections = [
    {
      title: 'Documentación',
      description: 'Guías, manuales y documentación técnica',
      icon: FaBook,
      url: 'https://lookerstudio.google.com/reporting/df556199-85e6-4797-97ae-f358c3d26545',
      color: '#607D8B'
    },
    {
      title: 'Looker Studio',
      description: 'Dashboard interactivo en Looker Studio',
      icon: FaExternalLinkAlt,
      url: '#',
      color: '#795548'
    }
  ];

  // Estado para la info del sistema
  const [systemInfo, setSystemInfo] = useState({ version: null, status: 'Desconocido', lastUpdate: null, loading: false });

  const cargarSystemInfo = async () => {
    setSystemInfo(prev => ({ ...prev, loading: true }));
    try {
      // Obtener version desde la configuración del sistema si existe
      // Primero mirar localStorage (se actualiza desde Admin para reflejo inmediato)
      let version = null;
      try {
        const localVer = localStorage.getItem('appVersion');
        if (localVer) version = localVer;
      } catch (e) {}

      if (!version) {
        try {
          const cfg = await getSystemConfig();
          if (cfg && cfg.version) version = cfg.version;
        } catch (err) {
          // ignore - no hay cfg
        }
      }

      // Obtener último log
      let last = null;
      try {
        const logs = await obtenerLogsRecientes(1);
        if (Array.isArray(logs) && logs.length > 0) {
          const l = logs[0];
          // intentar normalizar campos
          const email = l.email || l.user || l.usuario || l.username || l.correo || '';
          const accion = l.accion || l.action || l.tipo || '';
          const descripcion = l.descripcion || l.desc || l.message || '';
          const fecha = l.fecha || l.timestamp || l.createdAt || l.created_at || l.date || '';
          last = { email, accion, descripcion, fecha };
        }
      } catch (err) {
        console.error('Error cargando logs recientes:', err);
      }

      // format last date if exists
      const formatDate = (input) => {
        if (!input) return '';
        // If already a Date
        if (input instanceof Date && !isNaN(input)) return input.toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        // Try parse ISO or numeric
        let d = null;
        // if numeric timestamp
        if (!isNaN(Number(input))) {
          d = new Date(Number(input));
        } else {
          // try replace space-only formats
          const maybe = input.toString().trim();
          d = new Date(maybe);
        }
        if (d && !isNaN(d)) {
          return d.toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
        return input; // fallback raw
      };

      if (last && last.fecha) last.formatted = formatDate(last.fecha);

      setSystemInfo({
        version: version || require('../../package.json').version || 'N/A',
        status: 'En línea',
        lastUpdate: last,
        loading: false
      });
    } catch (error) {
      setSystemInfo(prev => ({ ...prev, status: 'Desconectado', loading: false }));
      console.error('Error cargando system info:', error);
      mostrarNotificacion('No se pudo cargar información del sistema.','error');
    }
  };

  useEffect(() => {
    cargarSystemInfo();
  }, []);

  return (
    <div className="app-page">
      {/* Franja superior con usuario y cerrar sesión */}
      <div className="top-strip">
        <div className="top-strip-inner">
          <div className="top-user">
            <FaUser size={16} />
            <span>{user?.email}</span>
          </div>
          <button
            onClick={manejarCerrarSesion}
            className="top-logout"
            title="Cerrar Sesión"
          >
            <FaSignOutAlt size={14} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
  {/* moved: system-info will appear below secondary block */}

      <div className="dashboard-container">
  {/* Notificación flotante */}
      {notificacion && (
        <div 
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: notificacion.tipo === 'success' 
              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
              : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: 'white',
            padding: '16px 24px',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            zIndex: 1000,
            fontSize: '0.95rem',
            fontWeight: 600,
            maxWidth: '420px',
            border: '1px solid rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)',
            transform: 'translateX(0)',
            opacity: 1,
            transition: 'all 0.3s ease-out'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '6px', 
              height: '6px', 
              borderRadius: '50%', 
              backgroundColor: 'white',
              opacity: 0.8
            }}></div>
            {notificacion.mensaje}
          </div>
        </div>
      )}
      
      {/* Hero centrado */}
      <div className="hero">
        <h1 className="hero-title">PROYECTOS DE INVERSIÓN UNGRD 2025</h1>
        <p className="hero-subtitle">Gestiona y visualiza los proyectos de inversión de manera profesional</p>
      </div>
  {/* Principales grandes */}
      <section className="dashboard-cards">
        {mainSections.slice(0,3).map((section, index) => (
          <Link key={section.title} to={section.path} className="dashboard-card" style={{ textDecoration: 'none' }}>
            <div 
              style={{
                '--card-gradient': section.gradient,
                '--shadow-color': section.shadowColor
              }}
              onMouseEnter={(e) => {
                const card = e.currentTarget.closest('.dashboard-card');
                card.style.boxShadow = `0 30px 80px ${section.shadowColor}, 0 15px 35px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.9)`;
              }}
              onMouseLeave={(e) => {
                const card = e.currentTarget.closest('.dashboard-card');
                card.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 25px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)';
              }}
            >
              <div style={{ 
                background: section.gradient,
                borderRadius: '25px',
                padding: '30px',
                marginBottom: '20px',
                boxShadow: `0 12px 35px ${section.shadowColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease'
              }}>
                <section.icon size={64} style={{ color: 'white' }} />
              </div>
              <div className="dashboard-card-title" style={{ color: section.color, marginBottom: '15px' }}>{section.title}</div>
              <div style={{ color: '#6c7a89', fontSize: '1.1rem', lineHeight: '1.6', maxWidth: '280px' }}>{section.description}</div>
            </div>
          </Link>
        ))}
      </section>
      {/* Secundarios en bloque separado */}
      <div className="dashboard-secondary-block">
        <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap', alignItems: 'stretch' }}>
          <a href="#" className="dashboard-btn dashboard-btn-secondary dashboard-btn-documentation" style={{ 
            background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,245,245,0.95) 100%)', 
            color: '#c62828', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: '200px', 
            height: '140px', 
            fontSize: '1rem', 
            padding: '0', 
            gap: '15px', 
            borderRadius: '25px', 
            boxShadow: '0 8px 30px rgba(198, 40, 40, 0.2), 0 4px 15px rgba(0,0,0,0.1)', 
            border: '2px solid rgba(198, 40, 40, 0.1)',
            textDecoration: 'none',
            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            backdropFilter: 'blur(15px)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #c62828 0%, #d32f2f 100%)',
              borderRadius: '15px',
              padding: '12px',
              boxShadow: '0 4px 15px rgba(198, 40, 40, 0.3)',
              transition: 'all 0.3s ease'
            }}>
              <FaBook size={24} style={{ color: 'white' }} />
            </div>
            <span style={{ fontWeight: 700, color: '#c62828', fontSize: '1rem', transition: 'color 0.3s ease' }}>Documentación</span>
          </a>
          <a href="https://lookerstudio.google.com/reporting/df556199-85e6-4797-97ae-f358c3d26545" target="_blank" rel="noopener noreferrer" className="dashboard-btn dashboard-btn-secondary dashboard-btn-looker" style={{ 
            background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(240,248,255,0.95) 100%)', 
            color: '#0288d1', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: '200px', 
            height: '140px', 
            fontSize: '1rem', 
            padding: '0', 
            gap: '15px', 
            borderRadius: '25px', 
            boxShadow: '0 8px 30px rgba(2, 136, 209, 0.2), 0 4px 15px rgba(0,0,0,0.1)', 
            border: '2px solid rgba(2, 136, 209, 0.1)',
            textDecoration: 'none',
            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            backdropFilter: 'blur(15px)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #0288d1 0%, #0277bd 100%)',
              borderRadius: '15px',
              padding: '12px',
              boxShadow: '0 4px 15px rgba(2, 136, 209, 0.3)',
              transition: 'all 0.3s ease'
            }}>
              <FaChartBar size={24} style={{ color: 'white' }} />
            </div>
            <span style={{ fontWeight: 700, color: '#0288d1', fontSize: '1rem', transition: 'color 0.3s ease' }}>Looker Studio</span>
          </a>
          <button onClick={manejarAccesoAdmin} className="dashboard-btn dashboard-btn-secondary dashboard-btn-admin-secondary" style={{ 
            background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,245,255,0.95) 100%)', 
            color: '#6a1b9a', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: '200px', 
            height: '140px', 
            fontSize: '1rem', 
            padding: '0', 
            gap: '15px', 
            borderRadius: '25px', 
            boxShadow: '0 8px 30px rgba(106, 27, 154, 0.2), 0 4px 15px rgba(0,0,0,0.1)', 
            border: '2px solid rgba(106, 27, 154, 0.1)', 
            cursor: 'pointer',
            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            backdropFilter: 'blur(15px)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #6a1b9a 0%, #7b1fa2 100%)',
              borderRadius: '15px',
              padding: '12px',
              boxShadow: '0 4px 15px rgba(106, 27, 154, 0.3)',
              transition: 'all 0.3s ease'
            }}>
              <FaUserShield size={24} style={{ color: 'white' }} />
            </div>
            <span style={{ fontWeight: 700, color: '#6a1b9a', fontSize: '1rem', transition: 'color 0.3s ease' }}>Admin</span>
          </button>
        </div>
      </div>
      {/* Sección: Información del sistema (debajo de los botones secundarios) */}
      <div className="system-info">
        <div className="system-info-inner">
          <div className="system-card">
            <div className="system-card-title">Versión</div>
            <div className="system-card-value">{systemInfo.loading ? 'Cargando...' : (systemInfo.version || 'N/A')}</div>
          </div>

          <div className="system-card">
            <div className="system-card-title">Estado</div>
            <div className="system-card-value">{systemInfo.loading ? '...' : systemInfo.status}</div>
          </div>

          <div className="system-card system-card-last">
            <div className="system-card-title">Última actualización</div>
            {systemInfo.loading ? (
              <div className="system-card-value">Cargando...</div>
            ) : systemInfo.lastUpdate ? (
              <div>
                <div style={{ fontWeight: 700 }}>{systemInfo.lastUpdate.email}</div>
                <div style={{ color: '#6b7280' }}>{systemInfo.lastUpdate.accion} - {systemInfo.lastUpdate.descripcion}</div>
                <div style={{ color: '#9aa4b2', fontSize: '0.95rem' }}>{systemInfo.lastUpdate.formatted || systemInfo.lastUpdate.fecha}</div>
              </div>
            ) : (
              <div className="system-card-value">Sin actualizaciones</div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 12 }}>
            <button className="dashboard-btn" onClick={cargarSystemInfo} style={{ padding: '10px 18px' }}>Actualizar</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

export default Dashboard;