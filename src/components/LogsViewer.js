import React, { useState, useEffect } from 'react';
import { obtenerLogsRecientes } from '../services/spreadsheetApi';
import LoadingIndicator from './LoadingIndicator';
import useLogger from '../hooks/useLogger';
import { FaHistory, FaUser, FaClock, FaInfoCircle } from 'react-icons/fa';
import './logs.css';


const LogsViewer = () => {
  const { log } = useLogger();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEmail, setSelectedEmail] = useState('');

  useEffect(() => {
    log('logs_access', 'Usuario accedió al registro de actividad');
    

    const cargarLogs = async () => {
      try {
        setLoading(true);
        const logsData = await obtenerLogsRecientes(100); // Traer más logs para filtrar
        setLogs(logsData);
      } catch (err) {
        setError('Error cargando logs: ' + err.message);
        console.error('Error cargando logs:', err);
      } finally {
        setLoading(false);
      }
    };

    cargarLogs();

    // Actualizar logs cada 30 segundos
    const interval = setInterval(cargarLogs, 30000);

    return () => clearInterval(interval);
  }, []);

  const formatearFecha = (fechaString) => {
    try {
      const fecha = new Date(fechaString);
      return fecha.toLocaleString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return fechaString;
    }
  };

  const obtenerIconoAccion = (accion) => {
    switch (accion) {
      case 'login':
        return { icon: FaUser, color: '#2ecc71' };
      case 'logout':
        return { icon: FaUser, color: '#e74c3c' };
      case 'dashboard_access':
        return { icon: FaInfoCircle, color: '#3498db' };
      case 'formulario_access':
        return { icon: FaInfoCircle, color: '#f39c12' };
      case 'graficos_access':
        return { icon: FaInfoCircle, color: '#9b59b6' };
      case 'avance_actualizado':
        return { icon: FaInfoCircle, color: '#16a085' };
      case 'admin_access_attempt':
        return { icon: FaInfoCircle, color: '#e67e22' };
      case 'admin_access_granted':
        return { icon: FaInfoCircle, color: '#27ae60' };
      case 'admin_access_denied':
        return { icon: FaInfoCircle, color: '#c0392b' };
      default:
        return { icon: FaInfoCircle, color: '#7f8c8d' };
    }
  };

  if (loading) {
    return (
      <div className="logs-viewer loading-container">
        <LoadingIndicator />
        <p>Cargando logs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="logs-viewer error-container">
        <div className="error-message">
          <FaInfoCircle className="error-icon" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Obtener lista única de correos para el filtro
  const uniqueEmails = Array.from(new Set(logs.map(l => l.email).filter(Boolean))).sort();

  // Filtrar logs por correo si hay uno seleccionado
  const filteredLogs = selectedEmail
    ? logs.filter(l => l.email === selectedEmail)
    : logs;

  return (
    <div className="logs-viewer">
      <div className="logs-header">
        <FaHistory className="logs-icon" />
        <h2>Registro de Actividad</h2>
        <span className="logs-count">({filteredLogs.length} registros)</span>
      </div>

      {/* Filtro por correo */}
      <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
        <label htmlFor="filtro-email" style={{ fontWeight: 600, color: '#2c5aa0' }}>Filtrar por correo:</label>
        <select
          id="filtro-email"
          value={selectedEmail}
          onChange={e => setSelectedEmail(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db', minWidth: 180 }}
        >
          <option value="">Todos</option>
          {uniqueEmails.map(email => (
            <option key={email} value={email}>{email}</option>
          ))}
        </select>
      </div>

      <div className="logs-container">
        {filteredLogs.length === 0 ? (
          <div className="no-logs">
            <FaInfoCircle />
            <p>No hay registros de actividad disponibles</p>
          </div>
        ) : (
          filteredLogs.map((log, index) => {
            const { icon: IconComponent, color } = obtenerIconoAccion(log.accion);
            return (
              <div key={index} className="log-entry">
                <div className="log-icon" style={{ color }}>
                  <IconComponent />
                </div>
                <div className="log-content">
                  <div className="log-header-row">
                    <span className="log-email">{log.email}</span>
                    <span className="log-time">
                      <FaClock className="clock-icon" />
                      {formatearFecha(log.fecha)}
                    </span>
                  </div>
                  <div className="log-action">{log.accion}</div>
                  {log.descripcion && (
                    <div className="log-description">{log.descripcion}</div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default LogsViewer;
