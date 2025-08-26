import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { saveDataToSpreadsheet, getConfiguracionEdicion, setMesActivo, obtenerNombresReales, guardarDatosFinanciera, obtenerProyectosUnicos, obtenerBPINsUnicos, obtenerTiposValorUnicos, getSystemConfig, setSystemVersion, registrarLog } from '../services/spreadsheetApi';
import { useAuth } from '../contexts/AuthContext';
import LoadingIndicator from './LoadingIndicator';
import UserManager from './UserManager';
import LogsViewer from './LogsViewer';
import { FaArrowLeft, FaSave, FaUserShield, FaPlus, FaCalendarAlt, FaEdit, FaDollarSign, FaPercentage, FaCog, FaBug, FaProjectDiagram, FaHistory } from 'react-icons/fa';

const Admin = () => {
  const [formData, setFormData] = useState({
    bpin: '',
    proyecto: '',
    objetivo: '',
    producto: '',
    observaciones: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Estados para configuración de mes activo
  const [configuracionEdicion, setConfiguracionEdicion] = useState(null);
  const [mesSeleccionado, setMesSeleccionado] = useState('');
  const [guardandoMes, setGuardandoMes] = useState(false);
  const [mensajeMes, setMensajeMes] = useState('');
  
  // Estados para debug
  const [debugLoading, setDebugLoading] = useState(false);

  // Version del sistema (editable desde admin)
  const [systemVersion, setSystemVersionState] = useState(null);
  const [versionInput, setVersionInput] = useState('');
  const [savingVersion, setSavingVersion] = useState(false);
  const [versionMsg, setVersionMsg] = useState('');
  const { user } = useAuth();

  // Estado para acordeón
  const [acordeon, setAcordeon] = useState(null);

  // --- NUEVA SECCIÓN: Formulario para ingresar datos financieros ---
  const [financiera, setFinanciera] = useState({
    mes: '',
    proyecto: '',
    bpin: '',
    responsable: '',
    valores: {
      'Apropiacion Inicial': { valor: '', porcentaje: '' },
      'Apropiacion Vigente': { valor: '', porcentaje: '' },
      'Total CDP': { valor: '', porcentaje: '' },
      'Apropiacion Disponible': { valor: '', porcentaje: '' },
      'Total Comprometido': { valor: '', porcentaje: '' },
      'Total Obligacion': { valor: '', porcentaje: '' },
      'Total Orden de Pago': { valor: '', porcentaje: '' }
    }
  });
  const [guardandoFinanciera, setGuardandoFinanciera] = useState(false);
  const [mensajeFinanciera, setMensajeFinanciera] = useState('');
  
  // Estados para los selectores
  const [proyectos, setProyectos] = useState([]);
  const [bpins, setBpins] = useState([]);
  const [tiposValor, setTiposValor] = useState([
    'Apropiacion Inicial',
    'Apropiacion Vigente',
    'Total CDP',
    'Apropiacion Disponible',
    'Total Comprometido',
    'Total Obligacion',
    'Total Orden de Pago'
  ]);
  const [cargandoSelectores, setCargandoSelectores] = useState(false);

  // Función para determinar si un tipo de valor requiere porcentaje
  const requierePorcentaje = (tipoValor) => {
    const tipoLower = tipoValor.toLowerCase();
    return tipoLower.includes('comprometido') || 
           tipoLower.includes('obligacion') || 
           tipoLower.includes('orden de pago');
  };

  const handleFinancieraChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('valor_') || name.startsWith('porcentaje_')) {
      const [tipo, ...restoTipoValor] = name.split('_');
      const tipoCompleto = restoTipoValor.join('_').replace(/_/g, ' ');
      
      setFinanciera((prev) => ({
        ...prev,
        valores: {
          ...prev.valores,
          [tipoCompleto]: {
            ...prev.valores[tipoCompleto],
            [tipo]: value
          }
        }
      }));
    } else {
      setFinanciera((prev) => ({ 
        ...prev, 
        [name]: value 
      }));
    }
  };

  const handleFinancieraSubmit = async (e) => {
    e.preventDefault();
    setGuardandoFinanciera(true);
    setMensajeFinanciera('');
    
    try {
      // Generar fecha del último día del mes seleccionado
      const año = 2025;
      const mesNum = parseInt(financiera.mes);
      const ultimoDiaDelMes = new Date(año, mesNum, 0).getDate();
      const fechaCorte = `${año}-${mesNum.toString().padStart(2, '0')}-${ultimoDiaDelMes}`;
      
      // Preparar datos para guardar - crear una fila por cada tipo de valor que tenga datos
      const filasParaGuardar = [];
      
      Object.keys(financiera.valores).forEach(tipoValor => {
        const valorData = financiera.valores[tipoValor];
        // Guardar si tiene valor (incluso si es 0) o si el campo no está vacío
        if (valorData.valor !== '' && valorData.valor !== null && valorData.valor !== undefined) {
          const valorNumerico = parseFloat(valorData.valor) || 0;
          const fila = {
            'BPIN': financiera.bpin,
            'Proyecto': financiera.proyecto,
            'Tipo de Valor': tipoValor,
            'Valor': valorNumerico === 0 ? '' : valorNumerico, // Si es 0, enviar cadena vacía
            'Porcentaje': requierePorcentaje(tipoValor) && valorData.porcentaje 
              ? (parseFloat(valorData.porcentaje) === 0 ? '' : parseFloat(valorData.porcentaje) || '') 
              : '',
            'Fecha Corte': fechaCorte
          };
          filasParaGuardar.push(fila);
        }
      });
      
      if (filasParaGuardar.length === 0) {
        setMensajeFinanciera('Error: Debe ingresar al menos un valor en los campos');
        return;
      }
      
      await guardarDatosFinanciera(filasParaGuardar);
      setMensajeFinanciera(`¡${filasParaGuardar.length} filas guardadas correctamente!`);
      
      // Limpiar formulario
      inicializarFormularioFinanciera(tiposValor);
    } catch (err) {
      setMensajeFinanciera('Error al guardar: ' + (err.message || err));
    } finally {
      setGuardandoFinanciera(false);
    }
  };

  const meses = [
    { value: '1', label: 'Enero' },
    { value: '2', label: 'Febrero' },
    { value: '3', label: 'Marzo' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Mayo' },
    { value: '6', label: 'Junio' },
    { value: '7', label: 'Julio' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' }
  ];

  const mesesConfig = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  useEffect(() => {
    cargarConfiguracion();
    cargarDatosSelectores();
  }, []);

  const inicializarFormularioFinanciera = (tipos) => {
    const valoresIniciales = {};
    tipos.forEach(tipo => {
      valoresIniciales[tipo] = { valor: '', porcentaje: '' };
    });
    
    setFinanciera({
      mes: '',
      proyecto: '',
      bpin: '',
      responsable: '',
      valores: valoresIniciales
    });
  };

  const cargarDatosSelectores = async () => {
    setCargandoSelectores(true);
    try {
      
      // Cargar tipos de valor primero
      try {
        const tiposRes = await obtenerTiposValorUnicos();
        
        if (tiposRes && tiposRes.success && tiposRes.tipos) {
          setTiposValor(tiposRes.tipos);
          inicializarFormularioFinanciera(tiposRes.tipos);
        } else {
          console.error('Error: respuesta no válida para tipos de valor:', tiposRes);
          const tiposPorDefecto = [
            'Apropiacion Inicial',
            'Apropiacion Vigente',
            'Total CDP',
            'Apropiacion Disponible',
            'Total Comprometido',
            'Total Obligacion',
            'Total Orden de Pago'
          ];
          setTiposValor(tiposPorDefecto);
          inicializarFormularioFinanciera(tiposPorDefecto);
        }
      } catch (errorTipos) {
        console.error('Error cargando tipos de valor:', errorTipos);
        const tiposPorDefecto = [
          'Apropiacion Inicial',
          'Apropiacion Vigente',
          'Total CDP',
          'Apropiacion Disponible',
          'Total Comprometido',
          'Total Obligacion',
          'Total Orden de Pago'
        ];
        setTiposValor(tiposPorDefecto);
        inicializarFormularioFinanciera(tiposPorDefecto);
      }
      
      // Cargar proyectos
      try {
        const proyectosRes = await obtenerProyectosUnicos();
        
        if (proyectosRes && proyectosRes.success && proyectosRes.proyectos) {
          const proyectosUnicos = [...new Set(proyectosRes.proyectos.map(p => p.trim()).filter(Boolean))];
          setProyectos(proyectosUnicos.sort());
        } else if (proyectosRes && proyectosRes.proyectos && Array.isArray(proyectosRes.proyectos)) {
          const proyectosUnicos = [...new Set(proyectosRes.proyectos.map(p => p.PROYECTO || p.proyecto).filter(Boolean).map(p => p.trim()))];
          setProyectos(proyectosUnicos.sort());
        } else {
          console.error('Error: respuesta no válida o sin campo success para proyectos:', proyectosRes);
          setProyectos([]);
        }
      } catch (errorProyectos) {
        console.error('Error cargando proyectos:', errorProyectos);
        setProyectos([]);
      }
      
      // Cargar BPINs
      try {
        const bpinsRes = await obtenerBPINsUnicos();
        
        if (bpinsRes && bpinsRes.success && bpinsRes.bpins) {
          const bpinsUnicos = [...new Set(bpinsRes.bpins.map(b => b.trim()).filter(Boolean))];
          setBpins(bpinsUnicos.sort());
        } else if (bpinsRes && bpinsRes.proyectos && Array.isArray(bpinsRes.proyectos)) {
          const bpinsUnicos = [...new Set(bpinsRes.proyectos.map(p => p.BPIN || p.bpin).filter(Boolean).map(b => b.trim()))];
          setBpins(bpinsUnicos.sort());
        } else {
          console.error('Error: respuesta no válida o sin campo success para BPINs:', bpinsRes);
          setBpins([]);
        }
      } catch (errorBpins) {
        console.error('Error cargando BPINs:', errorBpins);
        setBpins([]);
      }
    } catch (error) {
      console.error('Error general cargando datos para selectores:', error);
      setProyectos([]);
      setBpins([]);
      const tiposPorDefecto = [
        'Apropiacion Inicial',
        'Apropiacion Vigente',
        'Total CDP',
        'Apropiacion Disponible',
        'Total Comprometido',
        'Total Obligacion',
        'Total Orden de Pago'
      ];
      setTiposValor(tiposPorDefecto);
      inicializarFormularioFinanciera(tiposPorDefecto);
    } finally {
      setCargandoSelectores(false);
    }
  };

  const cargarConfiguracion = async () => {
    try {
      const config = await getConfiguracionEdicion();
      setConfiguracionEdicion(config);
      setMesSeleccionado(config.mesActivo || 'enero');
      // cargar version del sistema si existe
      try {
        const sysCfg = await getSystemConfig();
        if (sysCfg && sysCfg.version) {
          setSystemVersionState(sysCfg.version);
          setVersionInput(sysCfg.version);
        }
      } catch (err) {
        // ignore
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
    }
  };

  const cambiarMesActivo = async () => {
    setGuardandoMes(true);
    setMensajeMes('');
    
    try {
      const resultado = await setMesActivo(mesSeleccionado);
      if (resultado.success) {
        setMensajeMes('Mes activo actualizado correctamente');
        setConfiguracionEdicion(prev => ({ ...prev, mesActivo: mesSeleccionado }));
      } else {
        setMensajeMes('Error actualizando mes activo');
      }
    } catch (error) {
      console.error('Error:', error);
      setMensajeMes('Error actualizando mes activo');
    } finally {
      setGuardandoMes(false);
    }
  };

  const toggleAcordeon = (seccion) => {
    setAcordeon(acordeon === seccion ? null : seccion);
  };

  const obtenerNombresRealesDebug = async () => {
    setDebugLoading(true);
    try {
      const resultado = await obtenerNombresReales();
      alert('Información obtenida correctamente. Revisa la consola del navegador (F12) para ver los detalles.');
    } catch (error) {
      console.error('Error obteniendo nombres reales:', error);
      alert('Error al obtener información de Google Sheets. Revisa la consola para más detalles.');
    } finally {
      setDebugLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await saveDataToSpreadsheet(formData);
      setSuccess(true);
      setFormData({
        bpin: '',
        proyecto: '',
        objetivo: '',
        producto: '',
        observaciones: '',
      });
    } catch (err) {
      setError('Error saving data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <Link to="/" className="back-button">
          <FaArrowLeft size={20} />
          <span>Volver al Dashboard</span>
        </Link>
        <div className="page-title">
          <FaUserShield size={40} />
          <h1>Panel de Administración</h1>
          <p>Gestión avanzada y creación de nuevos proyectos</p>
        </div>
      </div>

      <div className="admin-content" style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
        {/* Panel profesional con acordeones para cada sección */}
        {/* 1. Configuración del Sistema */}
        <div className="admin-section" style={{ marginBottom: 18, borderRadius: 16, boxShadow: '0 4px 24px rgba(44,90,160,0.08)', background: '#f8fafc', border: '1px solid #e5e7eb' }}>
          <div onClick={() => toggleAcordeon('sistema')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: 20, borderRadius: 16, background: 'linear-gradient(135deg, #e0e7ff 0%, #f8fafc 100%)', borderBottom: acordeon === 'sistema' ? '1px solid #c7d2fe' : 'none' }}>
            <FaCog size={22} style={{ color: '#2c5aa0' }} />
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#2c5aa0', letterSpacing: '0.5px' }}>Configuración del Sistema</h2>
            <span style={{ marginLeft: 'auto', fontWeight: 800, fontSize: '1.2rem', color: '#2c5aa0' }}>{acordeon === 'sistema' ? '-' : '+'}</span>
          </div>
          {acordeon === 'sistema' && (
            <div style={{ padding: 24, background: '#fff', borderRadius: 12 }}>
              <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 140 }}>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Versión actual</div>
                  <div style={{ fontWeight: 800 }}>{systemVersion || 'N/A'}</div>
                </div>
                <input placeholder="vX.Y.Z" value={versionInput} onChange={(e) => setVersionInput(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', flex: '0 0 180px' }} />
                <button onClick={async () => {
                  setSavingVersion(true);
                  setVersionMsg('');
                  try {
                    const res = await setSystemVersion(versionInput);
                    if (res && res.success) {
                      setSystemVersionState(versionInput);
                      setVersionMsg('Versión actualizada');
                      try { await registrarLog(user?.email || 'system', 'SET_VERSION', `Versión establecida a ${versionInput}`); } catch(e){}
                      try { localStorage.setItem('appVersion', versionInput); } catch(e){}
                    } else {
                      setVersionMsg('Error al actualizar versión');
                    }
                  } catch (err) {
                    setVersionMsg('Error al actualizar versión');
                  } finally { setSavingVersion(false); }
                }} className="dashboard-btn" style={{ padding: '8px 14px' }}>{savingVersion ? 'Guardando...' : 'Guardar'}</button>
                {versionMsg && <div style={{ color: '#6b7280' }}>{versionMsg}</div>}
              </div>
            </div>
          )}
        </div>

        {/* 2. Ingreso de datos financieros */}
        <div className="admin-section" style={{ marginBottom: 20, borderRadius: 16, boxShadow: '0 4px 24px rgba(22,160,133,0.08)', background: '#f8fafc', border: '1px solid #e5e7eb' }}>
          <div onClick={() => toggleAcordeon('financiera')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: 20, borderRadius: 16, background: 'linear-gradient(135deg, #e0f2f1 0%, #f8fafc 100%)', borderBottom: acordeon === 'financiera' ? '1px solid #b2dfdb' : 'none' }}>
            <FaPlus size={22} style={{ color: '#10b981' }} />
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#10b981', letterSpacing: '0.5px' }}>Ingresar Nueva Fila Financiera</h2>
            <span style={{ marginLeft: 'auto', fontWeight: 800, fontSize: '1.2rem', color: '#10b981' }}>{acordeon === 'financiera' ? '-' : '+'}</span>
          </div>
          {acordeon === 'financiera' && (
            <div style={{ 
              marginTop: '24px',
              background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
              borderRadius: '16px',
              padding: '32px',
              boxShadow: '0 10px 25px rgba(22, 160, 133, 0.15)',
              border: '1px solid #e2e8f0'
            }}>
              {cargandoSelectores && (
                <div style={{ 
                  background: '#e0f2f1', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  marginBottom: '20px',
                  color: '#00695c',
                  textAlign: 'center'
                }}>
                  <LoadingIndicator />
                  <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem' }}>Cargando datos disponibles...</p>
                </div>
              )}
              
              <form onSubmit={handleFinancieraSubmit} style={{ display: 'grid', gap: '24px' }}>
                {/* Información básica */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                  gap: '20px',
                  marginBottom: '24px',
                  padding: '20px',
                  background: '#f8fafc',
                  borderRadius: '12px',
                  border: '2px solid #e2e8f0'
                }}>
                  {/* Selector de Mes */}
                  <div style={{ position: 'relative' }}>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      fontSize: '0.95rem', 
                      fontWeight: 600, 
                      color: '#374151', 
                      marginBottom: '8px' 
                    }}>
                      <FaCalendarAlt size={16} style={{ color: '#16a085' }} />
                      Mes de Corte:
                    </label>
                    <select
                      name="mes"
                      value={financiera.mes}
                      onChange={handleFinancieraChange}
                      required
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '2px solid #e2e8f0',
                        borderRadius: '10px',
                        fontSize: '0.95rem',
                        backgroundColor: '#fff',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <option value="">Selecciona un mes</option>
                      {meses.map(mes => (
                        <option key={mes.value} value={mes.value}>
                          {mes.label}
                        </option>
                      ))}
                    </select>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>
                      Se generará fecha del último día del mes (ej: 2025-06-30)
                    </div>
                  </div>

                  {/* Selector de Proyecto */}
                  <div style={{ position: 'relative' }}>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      fontSize: '0.95rem', 
                      fontWeight: 600, 
                      color: '#374151', 
                      marginBottom: '8px' 
                    }}>
                      <FaUserShield size={16} style={{ color: '#16a085' }} />
                      Proyecto:
                    </label>
                    <select
                      name="proyecto"
                      value={financiera.proyecto}
                      onChange={handleFinancieraChange}
                      required
                      disabled={cargandoSelectores}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '2px solid #e2e8f0',
                        borderRadius: '10px',
                        fontSize: '0.95rem',
                        backgroundColor: cargandoSelectores ? '#f3f4f6' : '#fff',
                        cursor: cargandoSelectores ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <option value="">Selecciona un proyecto</option>
                      {proyectos.map(proyecto => (
                        <option key={proyecto} value={proyecto}>
                          {proyecto.length > 60 ? proyecto.substring(0, 60) + '...' : proyecto}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selector de BPIN */}
                  <div style={{ position: 'relative' }}>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      fontSize: '0.95rem', 
                      fontWeight: 600, 
                      color: '#374151', 
                      marginBottom: '8px' 
                    }}>
                      <FaSave size={16} style={{ color: '#16a085' }} />
                      BPIN:
                    </label>
                    <select
                      name="bpin"
                      value={financiera.bpin}
                      onChange={handleFinancieraChange}
                      required
                      disabled={cargandoSelectores}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '2px solid #e2e8f0',
                        borderRadius: '10px',
                        fontSize: '0.95rem',
                        backgroundColor: cargandoSelectores ? '#f3f4f6' : '#fff',
                        cursor: cargandoSelectores ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <option value="">Selecciona un BPIN</option>
                      {bpins.map(bpin => (
                        <option key={bpin} value={bpin}>
                          {bpin}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sección de Tipos de Valor */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    color: '#1f2937',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <FaDollarSign size={20} style={{ color: '#16a085' }} />
                    Valores Financieros
                  </h3>
                  <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '20px' }}>
                    Ingrese los valores para cada tipo. Se guardarán todas las filas con valores ingresados (incluso si son 0).
                  </p>
                  
                  <div style={{ 
                    display: 'grid', 
                    gap: '16px' 
                  }}>
                    {tiposValor.map((tipoValor) => {
                      const necesitaPorcentaje = requierePorcentaje(tipoValor);
                      const nombreCampoValor = `valor_${tipoValor.replace(/ /g, '_')}`;
                      const nombreCampoPorcentaje = `porcentaje_${tipoValor.replace(/ /g, '_')}`;
                      
                      return (
                        <div 
                          key={tipoValor}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: necesitaPorcentaje ? '2fr 1fr 1fr' : '2fr 1fr',
                            gap: '16px',
                            alignItems: 'end',
                            padding: '16px',
                            background: necesitaPorcentaje ? '#fff7ed' : '#f8fafc',
                            borderRadius: '10px',
                            border: `2px solid ${necesitaPorcentaje ? '#fed7aa' : '#e2e8f0'}`,
                            transition: 'all 0.3s ease'
                          }}
                        >
                          <div>
                            <label style={{
                              display: 'block',
                              fontSize: '0.9rem',
                              fontWeight: 600,
                              color: '#374151',
                              marginBottom: '6px'
                            }}>
                              {tipoValor}
                              {necesitaPorcentaje && (
                                <span style={{ 
                                  color: '#ea580c', 
                                  marginLeft: '4px',
                                  fontSize: '0.8rem' 
                                }}>
                                  (con %)
                                </span>
                              )}
                            </label>
                          </div>
                          
                          <div>
                            <label style={{
                              display: 'block',
                              fontSize: '0.85rem',
                              fontWeight: 500,
                              color: '#6b7280',
                              marginBottom: '4px'
                            }}>
                              Valor (COP)
                            </label>
                            <input
                              type="number"
                              name={nombreCampoValor}
                              value={financiera.valores[tipoValor]?.valor || ''}
                              onChange={handleFinancieraChange}
                              min="0"
                              step="0.01"
                              placeholder="0"
                              style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: '2px solid #e2e8f0',
                                borderRadius: '8px',
                                fontSize: '0.9rem',
                                backgroundColor: '#fff',
                                transition: 'all 0.3s ease'
                              }}
                            />
                          </div>
                          
                          {necesitaPorcentaje && (
                            <div>
                              <label style={{
                                display: 'block',
                                fontSize: '0.85rem',
                                fontWeight: 500,
                                color: '#6b7280',
                                marginBottom: '4px'
                              }}>
                                Porcentaje (%)
                              </label>
                              <input
                                type="number"
                                name={nombreCampoPorcentaje}
                                value={financiera.valores[tipoValor]?.porcentaje || ''}
                                onChange={handleFinancieraChange}
                                min="0"
                                max="100"
                                step="0.01"
                                placeholder="0.00"
                                style={{
                                  width: '100%',
                                  padding: '10px 12px',
                                  border: '2px solid #fed7aa',
                                  borderRadius: '8px',
                                  fontSize: '0.9rem',
                                  backgroundColor: '#fff',
                                  transition: 'all 0.3s ease'
                                }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Botón de Guardar */}
                <button 
                  type="submit" 
                  disabled={guardandoFinanciera || cargandoSelectores}
                  style={{ 
                    background: guardandoFinanciera || cargandoSelectores 
                      ? 'linear-gradient(145deg, #9ca3af, #6b7280)' 
                      : 'linear-gradient(145deg, #16a085, #0d8068)',
                    color: '#fff', 
                    padding: '16px 32px', 
                    border: 'none', 
                    borderRadius: '12px', 
                    fontWeight: 700,
                    fontSize: '1rem',
                    cursor: guardandoFinanciera || cargandoSelectores ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    boxShadow: '0 6px 20px rgba(22, 160, 133, 0.3)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <FaSave size={18} />
                  {guardandoFinanciera ? 'Guardando...' : cargandoSelectores ? 'Cargando...' : 'Guardar Todos los Valores'}
                </button>
              </form>
            </div>
          )}
          {mensajeFinanciera && acordeon === 'financiera' && (
            <div style={{ 
              marginTop: '20px', 
              padding: '16px 20px', 
              borderRadius: '12px', 
              fontSize: '0.95rem',
              fontWeight: 600,
              background: mensajeFinanciera.startsWith('¡') 
                ? 'linear-gradient(145deg, #dcfce7, #bbf7d0)' 
                : 'linear-gradient(145deg, #fef2f2, #fecaca)',
              color: mensajeFinanciera.startsWith('¡') ? '#166534' : '#dc2626',
              border: `2px solid ${mensajeFinanciera.startsWith('¡') ? '#22c55e' : '#ef4444'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              {mensajeFinanciera.startsWith('¡') ? (
                <FaSave size={18} style={{ color: '#166534' }} />
              ) : (
                <FaUserShield size={18} style={{ color: '#dc2626' }} />
              )}
              {mensajeFinanciera}
            </div>
          )}
        </div>

        {/* 3. Configuración de Edición */}
        <div className="admin-section" style={{ marginBottom: 20, borderRadius: 16, boxShadow: '0 4px 24px rgba(59,130,246,0.08)', background: '#f8fafc', border: '1px solid #e5e7eb' }}>
          <div onClick={() => toggleAcordeon('mes')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: 20, borderRadius: 16, background: 'linear-gradient(135deg, #e3f0ff 0%, #f8fafc 100%)', borderBottom: acordeon === 'mes' ? '1px solid #bfdbfe' : 'none' }}>
            <FaEdit size={22} style={{ color: '#1e40af' }} />
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1e40af', letterSpacing: '0.5px' }}>Configuración de Edición</h2>
            <span style={{ marginLeft: 'auto', fontWeight: 800, fontSize: '1.2rem', color: '#1e40af' }}>{acordeon === 'mes' ? '-' : '+'}</span>
          </div>
          {acordeon === 'mes' && (
            <div style={{ marginTop: 18 }}>
              <div className="config-container" style={{ 
                background: '#fff', 
                borderRadius: '16px', 
                padding: '24px', 
                boxShadow: '0 10px 25px rgba(59, 130, 246, 0.1)', 
                border: '1px solid #e5e7eb' 
              }}>
                <div style={{ marginBottom: '20px' }}>
                  <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '16px' }}>
                    Selecciona el mes que estará disponible para edición por parte de los usuarios
                  </p>
                  {configuracionEdicion && (
                    <div style={{ 
                      background: '#f0f9ff', 
                      border: '1px solid #bfdbfe', 
                      borderRadius: '8px', 
                      padding: '12px', 
                      marginBottom: '20px' 
                    }}>
                      <p style={{ color: '#1e40af', fontSize: '0.9rem', margin: 0 }}>
                        <strong>Mes actualmente activo:</strong> {configuracionEdicion.mesActivo?.charAt(0).toUpperCase() + configuracionEdicion.mesActivo?.slice(1)}
                      </p>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '0.9rem', 
                      fontWeight: 600, 
                      color: '#374151', 
                      marginBottom: '8px' 
                    }}>
                      Nuevo mes activo:
                    </label>
                    <select
                      value={mesSeleccionado}
                      onChange={(e) => setMesSeleccionado(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        backgroundColor: '#fff',
                        cursor: 'pointer'
                      }}
                    >
                      {mesesConfig.map(mes => (
                        <option key={mes} value={mes}>
                          {mes.charAt(0).toUpperCase() + mes.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={cambiarMesActivo}
                    disabled={guardandoMes || mesSeleccionado === configuracionEdicion?.mesActivo}
                    style={{
                      padding: '12px 24px',
                      background: mesSeleccionado === configuracionEdicion?.mesActivo 
                        ? '#9ca3af' 
                        : guardandoMes 
                          ? '#6b7280' 
                          : '#3b82f6',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: mesSeleccionado === configuracionEdicion?.mesActivo || guardandoMes ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      minWidth: '140px',
                      justifyContent: 'center'
                    }}
                  >
                    <FaEdit size={16} />
                    {guardandoMes ? 'Actualizando...' : 'Actualizar Mes'}
                  </button>
                </div>
                {mensajeMes && (
                  <div style={{ 
                    marginTop: '16px', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    fontSize: '0.9rem',
                    background: mensajeMes.includes('correctamente') ? '#dcfce7' : '#fef2f2',
                    color: mensajeMes.includes('correctamente') ? '#166534' : '#dc2626',
                    border: mensajeMes.includes('correctamente') ? '1px solid #bbf7d0' : '1px solid #fecaca'
                  }}>
                    {mensajeMes}
                  </div>
                )}

                {/* User manager: editar/añadir/borrar usuarios y admin_email */}
                <div style={{ marginTop: 20 }}>
                  <UserManager />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. Herramientas de Diagnóstico */}
        <div className="admin-section" style={{ marginBottom: 20, borderRadius: 16, boxShadow: '0 4px 24px rgba(245,158,11,0.08)', background: '#f8fafc', border: '1px solid #e5e7eb' }}>
          <div onClick={() => toggleAcordeon('debug')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: 20, borderRadius: 16, background: 'linear-gradient(135deg, #fef3c7 0%, #f8fafc 100%)', borderBottom: acordeon === 'debug' ? '1px solid #fde68a' : 'none' }}>
            <FaBug size={22} style={{ color: '#92400e' }} />
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#92400e', letterSpacing: '0.5px' }}>Herramientas de Diagnóstico</h2>
            <span style={{ marginLeft: 'auto', fontWeight: 800, fontSize: '1.2rem', color: '#92400e' }}>{acordeon === 'debug' ? '-' : '+'}</span>
          </div>
          {acordeon === 'debug' && (
            <div style={{ marginTop: 18 }}>
              <div className="admin-form-container">
                <div style={{ marginBottom: '20px' }}>
                  <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '16px' }}>
                    Herramientas para diagnosticar problemas con el mapeo de columnas en Google Sheets.
                  </p>
                  <button
                    onClick={obtenerNombresRealesDebug}
                    disabled={debugLoading}
                    style={{
                      padding: '12px 24px',
                      background: debugLoading ? '#6b7280' : '#f59e0b',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: debugLoading ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      minWidth: '250px',
                      justifyContent: 'center'
                    }}
                  >
                    <FaUserShield size={16} />
                    {debugLoading ? 'Obteniendo datos...' : 'Ver nombres reales en Google Sheets'}
                  </button>
                  <p style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '8px' }}>
                    Los resultados se mostrarán en la consola del navegador (F12).
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 5. Crear Nuevo Proyecto */}
        <div className="admin-section" style={{ marginBottom: 20, borderRadius: 16, boxShadow: '0 4px 24px rgba(99,102,241,0.08)', background: '#f8fafc', border: '1px solid #e5e7eb' }}>
          <div onClick={() => toggleAcordeon('proyecto')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: 20, borderRadius: 16, background: 'linear-gradient(135deg, #f3e8ff 0%, #f8fafc 100%)', borderBottom: acordeon === 'proyecto' ? '1px solid #ddd6fe' : 'none' }}>
            <FaProjectDiagram size={22} style={{ color: '#5b21b6' }} />
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#5b21b6', letterSpacing: '0.5px' }}>Crear Nuevo Proyecto</h2>
            <span style={{ marginLeft: 'auto', fontWeight: 800, fontSize: '1.2rem', color: '#5b21b6' }}>{acordeon === 'proyecto' ? '-' : '+'}</span>
          </div>
          {acordeon === 'proyecto' && (
            <div style={{ marginTop: 18 }}>
              <div className="admin-form-container">
                {loading && <LoadingIndicator />}
                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">¡Proyecto creado exitosamente!</div>}
                <form onSubmit={handleSubmit} className="admin-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="bpin">BPIN</label>
                      <input 
                        type="text" 
                        id="bpin"
                        name="bpin" 
                        value={formData.bpin} 
                        onChange={handleChange} 
                        required 
                        placeholder="Ej: 2024-001"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="proyecto">Nombre del Proyecto</label>
                      <input 
                        type="text" 
                        id="proyecto"
                        name="proyecto" 
                        value={formData.proyecto} 
                        onChange={handleChange} 
                        required 
                        placeholder="Nombre completo del proyecto"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="objetivo">Objetivo</label>
                    <textarea 
                      id="objetivo"
                      name="objetivo" 
                      value={formData.objetivo} 
                      onChange={handleChange} 
                      required 
                      placeholder="Describa el objetivo principal del proyecto"
                      rows={3}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="producto">Producto Esperado</label>
                    <textarea 
                      id="producto"
                      name="producto" 
                      value={formData.producto} 
                      onChange={handleChange} 
                      required 
                      placeholder="Describa el producto o resultado esperado"
                      rows={3}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="observaciones">Observaciones</label>
                    <textarea 
                      id="observaciones"
                      name="observaciones" 
                      value={formData.observaciones} 
                      onChange={handleChange}
                      placeholder="Observaciones adicionales (opcional)"
                      rows={4}
                    />
                  </div>
                  <button type="submit" className="admin-submit-button" disabled={loading}>
                    <FaSave size={18} />
                    <span>{loading ? 'Creando...' : 'Crear Proyecto'}</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 6. Historial de logs */}
      <div className="admin-section" style={{ marginBottom: 20, borderRadius: 16, boxShadow: '0 4px 24px rgba(44,90,160,0.08)', background: '#f8fafc', border: '1px solid #e5e7eb' }}>
        <div onClick={() => toggleAcordeon('logs')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: 20, borderRadius: 16, background: 'linear-gradient(135deg, #e0e7ff 0%, #f8fafc 100%)', borderBottom: acordeon === 'logs' ? '1px solid #c7d2fe' : 'none' }}>
          <FaHistory size={22} style={{ color: '#2c5aa0' }} />
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#2c5aa0', letterSpacing: '0.5px' }}>Historial de Movimientos y Actividad</h2>
          <span style={{ marginLeft: 'auto', fontWeight: 800, fontSize: '1.2rem', color: '#2c5aa0' }}>{acordeon === 'logs' ? '-' : '+'}</span>
        </div>
        {acordeon === 'logs' && (
          <div style={{ padding: 24, background: '#fff', borderRadius: 12 }}>
            <LogsViewer />
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
