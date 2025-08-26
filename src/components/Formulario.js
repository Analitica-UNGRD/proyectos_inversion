import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDatos, guardarDatos, getConfiguracionEdicion, actualizarAvanceMensual, actualizarObservacion, actualizarAvanceGeneral } from '../services/spreadsheetApi';
import LoadingIndicator from './LoadingIndicator';
import useLogger from '../hooks/useLogger';
import { 
  FaArrowLeft, 
  FaEdit, 
  FaChevronDown, 
  FaChevronRight, 
  FaProjectDiagram,
  FaTasks,
  FaInfoCircle,
  FaCalendarAlt,
  FaShieldAlt,
  FaUsers,
  FaDollarSign,
  FaChartLine,
  FaChartBar,
  FaBook,
  FaSave,
  FaLock,
  FaUnlock
} from 'react-icons/fa';

const Formulario = () => {
  const { log } = useLogger();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [proyectos, setProyectos] = useState([]);
  const [expandedProject, setExpandedProject] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  
  // Estados para edición
  const [configuracionEdicion, setConfiguracionEdicion] = useState({ mesActivo: null, proyectosEditables: [] });
  const [editandoAvances, setEditandoAvances] = useState({});
  const [guardando, setGuardando] = useState(false);
  // Estados para observaciones y avance general
  const [editandoObservaciones, setEditandoObservaciones] = useState({});
  const [editandoAvanceGeneral, setEditandoAvanceGeneral] = useState({});
  // Función para manejar cambios en observaciones
  const handleObservacionChange = (proyectoId, actividadId, valor) => {
    const key = `${proyectoId}_${actividadId}`;
    setEditandoObservaciones(prev => ({ ...prev, [key]: valor }));
  };

  // Función para manejar cambios en avance general
  const handleAvanceGeneralChange = (proyectoId, actividadId, valor) => {
    const key = `${proyectoId}_${actividadId}`;
    setEditandoAvanceGeneral(prev => ({ ...prev, [key]: valor }));
  };

  // Guardar observación
  const guardarObservacion = async (proyectoId, actividadId) => {
    setGuardando(true);
    const key = `${proyectoId}_${actividadId}`;
    const valor = editandoObservaciones[key];
    try {
      await actualizarObservacion(proyectoId, actividadId, valor);
      setEditandoObservaciones(prev => ({ ...prev, [key]: undefined }));
    } catch (e) {
      alert('Error guardando observación');
    }
    setGuardando(false);
  };

  // Guardar avance general (columna U)
  const guardarAvanceGeneral = async (proyectoId, actividadId) => {
    setGuardando(true);
    const key = `${proyectoId}_${actividadId}`;
    const valor = editandoAvanceGeneral[key];
    try {
      await actualizarAvanceGeneral(proyectoId, actividadId, valor);
      setEditandoAvanceGeneral(prev => ({ ...prev, [key]: undefined }));
    } catch (e) {
      alert('Error guardando avance general');
    }
    setGuardando(false);
  };

  // Lista completa de meses para mostrar siempre
  const todosLosMeses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  // Función para obtener solo los meses hasta el mes activo
  const getMesesHastaActivo = () => {
    if (!configuracionEdicion.mesActivo) return todosLosMeses;
    
    const mesActivoIndex = todosLosMeses.indexOf(configuracionEdicion.mesActivo.toLowerCase());
    if (mesActivoIndex === -1) return todosLosMeses;
    
    return todosLosMeses.slice(0, mesActivoIndex + 1);
  };

  // Configuración de proyectos con datos reales
  const projectConfig = [
    {
      color: '#3498db',
      icon: FaShieldAlt,
      bgColor: 'rgba(52, 152, 219, 0.08)',
    },
    {
      color: '#e67e22',
      icon: FaUsers,
      bgColor: 'rgba(230, 126, 34, 0.08)',
    },
    {
      color: '#16a085',
      icon: FaDollarSign,
      bgColor: 'rgba(22, 160, 133, 0.08)',
    }
  ];

  useEffect(() => {
    log('formulario_access', 'Usuario accedió al formulario de proyectos');
    
    const loadData = async () => {
      try {
        // Cargar datos de proyectos y configuración de edición en paralelo
        const [datos, config] = await Promise.all([
          getDatos(),
          getConfiguracionEdicion()
        ]);
        
        setConfiguracionEdicion(config);
        
        if (datos && datos.proyectos && datos.proyectos.length > 0) {
          // Agrupar actividades por proyecto
          const proyectosAgrupados = [];
          const proyectosUnicos = [...new Set(datos.proyectos.map(p => p['PROYECTO']))].slice(0, 3);
          proyectosUnicos.forEach((nombreProyecto, idx) => {
            const actividades = datos.proyectos
              .filter(p => p['PROYECTO'] === nombreProyecto)
              .map((p, i) => ({
                id: i + 1,
                nombre: p['ACTIVIDAD'] || p['OBJ'] || 'Actividad',
                objetivo: p['OBJ'] || '',
                producto: p['PRODUCTO'] || '',
                unidadMedida: p['Unidad de Medida'] || '',
                metaTotal: p['META TOTAL'] || '',
                meta2025: p['META 2025'] || '',
                // Guardar el índice real en Google Sheets para el guardado
                proyectoNombre: p['PROYECTO'],
                actividadNombre: p['ACTIVIDAD'] || p['OBJ'],
                filaOriginal: datos.proyectos.findIndex(row => row === p) + 2, // +2 porque empezamos en fila 2 (1 es header)
                avances: {
                  enero: p['ENERO'] ?? '',
                  febrero: p['FEBRERO'] ?? '',
                  marzo: p['MARZO'] ?? '',
                  abril: p['ABRIL'] ?? '',
                  mayo: p['MAYO'] ?? '',
                  junio: p['JUNIO'] ?? '',
                  julio: p['JULIO'] ?? '',
                  agosto: p['AGOSTO'] ?? '',
                  septiembre: p['SEPTIEMBRE'] ?? '',
                  octubre: p['OCTUBRE'] ?? '',
                  noviembre: p['NOVIEMBRE'] ?? '',
                  diciembre: p['DICIEMBRE'] ?? ''
                }
              }));
            proyectosAgrupados.push({
              id: idx + 1,
              nombre: nombreProyecto,
              bpin: datos.proyectos.find(p => p['PROYECTO'] === nombreProyecto)?.['BPIN'] || '',
              actividades
            });
          });
          setProyectos(proyectosAgrupados);
        } else {
          // Datos de ejemplo con proyectos reales de gestión del riesgo
          const proyectosEjemplo = [
            {
              id: 1,
              nombre: "Fortalecimiento de la política nacional de gestión del riesgo de desastres mediante la valoración del impacto de la implementación del PNGRD",
              bpin: "2024-PNGRD",
              actividades: [
                {
                  id: 1,
                  nombre: "Diagnóstico de la implementación del PNGRD",
                  objetivo: "Evaluar el estado actual de implementación de la política nacional de gestión del riesgo de desastres",
                  producto: "Informe de diagnóstico y evaluación de la política PNGRD",
                  unidadMedida: "Documentos",
                  // Agregar nombres para el guardado
                  proyectoNombre: "Fortalecimiento de la política nacional de gestión del riesgo de desastres mediante la valoración del impacto de la implementación del PNGRD",
                  actividadNombre: "Diagnóstico de la implementación del PNGRD",
                  avances: {
                    enero: 5, febrero: 20, marzo: 40, abril: 65, mayo: 85, junio: 100
                  }
                },
                {
                  id: 2,
                  nombre: "Valoración del impacto de las estrategias",
                  objetivo: "Medir la efectividad de las estrategias implementadas en el marco del PNGRD",
                  producto: "Estudio de impacto y recomendaciones para mejoramiento",
                  unidadMedida: "Análisis",
                  // Agregar nombres para el guardado
                  proyectoNombre: "Fortalecimiento de la política nacional de gestión del riesgo de desastres mediante la valoración del impacto de la implementación del PNGRD",
                  actividadNombre: "Valoración del impacto de las estrategias",
                  avances: {
                    enero: 0, febrero: 15, marzo: 35, abril: 60, mayo: 80, junio: 95
                  }
                },
                {
                  id: 3,
                  nombre: "Propuesta de mejoramiento institucional",
                  objetivo: "Desarrollar propuestas para optimizar la implementación de la política",
                  producto: "Plan de mejoramiento de la gestión del riesgo institucional",
                  unidadMedida: "Propuestas",
                  // Agregar nombres para el guardado
                  proyectoNombre: "Fortalecimiento de la política nacional de gestión del riesgo de desastres mediante la valoración del impacto de la implementación del PNGRD",
                  actividadNombre: "Propuesta de mejoramiento institucional",
                  avances: {
                    enero: 0, febrero: 0, marzo: 20, abril: 45, mayo: 75, junio: 100
                  }
                }
              ]
            },
            {
              id: 2,
              nombre: "Fortalecimiento de los procesos sociales de participación ciudadana. gestión de conocimientos y saberes y divulgación en el marco del sistema nacional de gestión del riesgo de desastre",
              bpin: "2024-PART",
              actividades: [
                {
                  id: 4,
                  nombre: "Desarrollo de estrategias de participación ciudadana",
                  objetivo: "Crear mecanismos efectivos de participación ciudadana en gestión del riesgo",
                  producto: "Manual de estrategias de participación ciudadana en gestión del riesgo",
                  unidadMedida: "Estrategias",
                  // Agregar nombres para el guardado
                  proyectoNombre: "Fortalecimiento de los procesos sociales de participación ciudadana. gestión de conocimientos y saberes y divulgación en el marco del sistema nacional de gestión del riesgo de desastre",
                  actividadNombre: "Desarrollo de estrategias de participación ciudadana",
                  avances: {
                    enero: 10, febrero: 25, marzo: 50, abril: 70, mayo: 90, junio: 100
                  }
                },
                {
                  id: 5,
                  nombre: "Gestión de conocimientos tradicionales",
                  objetivo: "Sistematizar y valorar saberes ancestrales en gestión del riesgo",
                  producto: "Base de datos de conocimientos tradicionales en gestión del riesgo",
                  unidadMedida: "Registros",
                  // Agregar nombres para el guardado
                  proyectoNombre: "Fortalecimiento de los procesos sociales de participación ciudadana. gestión de conocimientos y saberes y divulgación en el marco del sistema nacional de gestión del riesgo de desastre",
                  actividadNombre: "Gestión de conocimientos tradicionales",
                  avances: {
                    enero: 0, febrero: 20, marzo: 45, abril: 65, mayo: 85, junio: 100
                  }
                },
                {
                  id: 6,
                  nombre: "Campaña de divulgación del SNGRD",
                  objetivo: "Socializar el sistema nacional de gestión del riesgo de desastres",
                  producto: "Campaña multimedia de divulgación y sensibilización ciudadana",
                  unidadMedida: "Productos comunicativos",
                  // Agregar nombres para el guardado
                  proyectoNombre: "Fortalecimiento de los procesos sociales de participación ciudadana. gestión de conocimientos y saberes y divulgación en el marco del sistema nacional de gestión del riesgo de desastre",
                  actividadNombre: "Campaña de divulgación del SNGRD",
                  avances: {
                    enero: 15, febrero: 30, marzo: 50, abril: 70, mayo: 85, junio: 100
                  }
                }
              ]
            },
            {
              id: 3,
              nombre: "Fortalecimiento financiero del FNGRD orientado al proceso de reasentamiento en el marco de acciones judiciales. relacionados con la ocurrencia de escenarios de riesgo",
              bpin: "2024-FNGRD",
              actividades: [
                {
                  id: 7,
                  nombre: "Análisis financiero del FNGRD",
                  objetivo: "Evaluar la capacidad financiera actual del fondo nacional de gestión del riesgo",
                  producto: "Diagnóstico financiero y proyecciones del FNGRD",
                  unidadMedida: "Estudios",
                  // Agregar nombres para el guardado
                  proyectoNombre: "Fortalecimiento financiero del FNGRD orientado al proceso de reasentamiento en el marco de acciones judiciales. relacionados con la ocurrencia de escenarios de riesgo",
                  actividadNombre: "Análisis financiero del FNGRD",
                  avances: {
                    enero: 10, febrero: 30, marzo: 55, abril: 75, mayo: 90, junio: 100
                  }
                },
                {
                  id: 8,
                  nombre: "Diseño de instrumentos de reasentamiento",
                  objetivo: "Crear herramientas financieras especializadas para procesos de reasentamiento",
                  producto: "Instrumentos financieros para reasentamiento poblacional",
                  unidadMedida: "Instrumentos",
                  // Agregar nombres para el guardado
                  proyectoNombre: "Fortalecimiento financiero del FNGRD orientado al proceso de reasentamiento en el marco de acciones judiciales. relacionados con la ocurrencia de escenarios de riesgo",
                  actividadNombre: "Diseño de instrumentos de reasentamiento",
                  avances: {
                    enero: 0, febrero: 25, marzo: 50, abril: 70, mayo: 85, junio: 100
                  }
                },
                {
                  id: 9,
                  nombre: "Marco jurídico para acciones judiciales",
                  objetivo: "Establecer protocolos financieros para procesos judiciales relacionados con gestión del riesgo",
                  producto: "Protocolo jurídico-financiero para acciones judiciales",
                  unidadMedida: "Protocolos",
                  // Agregar nombres para el guardado
                  proyectoNombre: "Fortalecimiento financiero del FNGRD orientado al proceso de reasentamiento en el marco de acciones judiciales. relacionados con la ocurrencia de escenarios de riesgo",
                  actividadNombre: "Marco jurídico para acciones judiciales",
                  avances: {
                    enero: 5, febrero: 20, marzo: 40, abril: 60, mayo: 80, junio: 95
                  }
                }
              ]
            }
          ];
          setProyectos(proyectosEjemplo);
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Error cargando los datos de proyectos');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const toggleProject = (projectId) => {
    setExpandedProject(expandedProject === projectId ? null : projectId);
    setSelectedActivity(null);
  };

  const selectActivity = (activity) => {
    setSelectedActivity(selectedActivity?.id === activity.id ? null : activity);
  };



  // Función para verificar si un mes es editable
  const esMesEditable = (mes) => {
    return configuracionEdicion.mesActivo === mes;
  };

  // Función para manejar cambios en avances
  const handleAvanceChange = (proyectoId, actividadId, mes, valor) => {
    const key = `${proyectoId}_${actividadId}_${mes}`;
    setEditandoAvances(prev => ({
      ...prev,
      [key]: valor
    }));
  };

  // Función para guardar un avance específico
  const guardarAvance = async (proyectoId, actividadId, mes) => {
    const key = `${proyectoId}_${actividadId}_${mes}`;
    const nuevoValor = editandoAvances[key];
    
    if (nuevoValor === undefined) return;
    
    // Buscar la actividad real para obtener los nombres
    const proyecto = proyectos.find(p => p.id === proyectoId);
    const actividad = proyecto?.actividades.find(a => a.id === actividadId);
    
    if (!actividad) {
      console.error('No se encontró la actividad');
      return;
    }
    
    console.log('Guardando avance:', { 
      proyectoNombre: actividad.proyectoNombre, 
      actividadNombre: actividad.actividadNombre, 
      mes, 
      nuevoValor,
      filaOriginal: actividad.filaOriginal,
      nombreProyecto: proyecto.nombre,
      nombreActividad: actividad.nombre
    });
    
    setGuardando(true);
    try {
      // Enviar los nombres reales en lugar de IDs
      const resultado = await actualizarAvanceMensual(actividad.proyectoNombre, actividad.actividadNombre, mes, nuevoValor);
      console.log('Resultado del guardado:', resultado);
      
      // Registrar log de actualización
      log('avance_actualizado', `Actualizado avance: ${actividad.proyectoNombre} - ${actividad.actividadNombre} - ${mes}: ${nuevoValor}%`);
      
      if (resultado.debug) {
        console.log('Info de debug:', resultado.debug);
        console.log('Proyectos en Google Sheets:', resultado.debug.proyectosEnSheet);
        console.log('Actividades en Google Sheets:', resultado.debug.actividadesEnSheet);
      }
      
      // Actualizar el estado local de proyectos
      setProyectos(prevProyectos => 
        prevProyectos.map(proyecto => 
          proyecto.id === proyectoId 
            ? {
                ...proyecto,
                actividades: proyecto.actividades.map(actividad => 
                  actividad.id === actividadId
                    ? {
                        ...actividad,
                        avances: {
                          ...actividad.avances,
                          [mes]: nuevoValor
                        }
                      }
                    : actividad
                )
              }
            : proyecto
        )
      );
      
      // Limpiar el estado de edición
      const newEditandoAvances = { ...editandoAvances };
      delete newEditandoAvances[key];
      setEditandoAvances(newEditandoAvances);
      
      alert('Avance guardado correctamente');
    } catch (error) {
      alert('Error al guardar el avance: ' + error.message);
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return <LoadingIndicator />;
  }

  if (error) {
    return (
      <div className="formulario-container">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <Link to="/" className="back-button" style={{ background: '#e3f0ff', color: '#1a2a3a', borderRadius: '8px', padding: '8px 18px', fontWeight: 600, boxShadow: '0 2px 8px rgba(60,72,88,0.07)', textDecoration: 'none', border: 'none' }}>Volver al Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="formulario-container">
      <div className="formulario-header">
        <Link to="/" className="back-button">
          <FaArrowLeft size={20} />
          <span>Volver al Dashboard</span>
        </Link>
        <div className="page-title">
          <FaProjectDiagram size={40} style={{ color: '#3498db' }} />
          <h1 style={{ color: '#1a2a3a', fontSize: '2.5rem', fontWeight: 700, margin: '0.5rem 0' }}>MÓDULO DE REPORTE</h1>
          <p style={{ color: '#64748b', fontSize: '1.1rem', fontWeight: 500, margin: 0 }}>Sistema Nacional de Gestión del Riesgo de Desastres</p>
          
          {/* Indicador del mes activo para edición */}
          {configuracionEdicion.mesActivo && (
            <div style={{ 
              marginTop: '1rem', 
              padding: '8px 16px', 
              background: '#e0f2fe', 
              borderRadius: '8px', 
              border: '1px solid #0288d1',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <FaUnlock size={16} style={{ color: '#0288d1' }} />
              <span style={{ color: '#0288d1', fontWeight: 600, fontSize: '0.9rem' }}>
                Mes activo para edición: {configuracionEdicion.mesActivo.charAt(0).toUpperCase() + configuracionEdicion.mesActivo.slice(1)}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="projects-section">
        <div className="projects-list">
          {proyectos.map((proyecto, index) => {
            const config = projectConfig[index % projectConfig.length];
            const IconComponent = config.icon;
            const isExpanded = expandedProject === proyecto.id;
            return (
              <div
                key={proyecto.id}
                className="project-card-modern"
                style={{
                  '--project-color': config.color,
                  '--project-bg': config.bgColor,
                  marginBottom: '2rem',
                  boxShadow: isExpanded ? '0 8px 32px rgba(0,0,0,0.12)' : '0 4px 24px rgba(0,0,0,0.08)',
                  borderLeft: `6px solid ${config.color}`
                }}
              >
                <div
                  className="project-header-modern"
                  onClick={() => toggleProject(proyecto.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="project-icon-container" style={{ background: config.color }}>
                    <IconComponent size={28} color="#fff" />
                  </div>
                  <div className="project-info-modern">
                    <h3 style={{ color: config.color }}>{proyecto.nombre}</h3>
                    <div className="project-meta">
                      <span className="project-bpin">{proyecto.bpin}</span>
                      <span className="activities-count">{proyecto.actividades?.length || 0} actividades</span>
                    </div>
                  </div>
                  <FaChevronDown className={`expand-icon-modern ${isExpanded ? 'expanded' : ''}`} size={22} color={config.color} />
                </div>
                {isExpanded && (
                  <div className="activities-section-modern">
                    <div className="activities-header">
                      <FaTasks size={20} color={config.color} />
                      <span>Actividades del Proyecto</span>
                    </div>
                    <div className="activities-grid space-y-6">
                      {(proyecto.actividades || []).map(actividad => (
                        <div key={actividad.id} className="activity-card-modern bg-white rounded-lg shadow p-6 border border-gray-100">
                          <div className="activity-header-modern flex items-center justify-between cursor-pointer" onClick={() => selectActivity(actividad)}>
                            <div className="activity-title">
                              <span className="activity-name text-lg font-bold text-gray-800">{actividad.nombre}</span>
                            </div>
                            <FaInfoCircle className="info-icon-modern text-blue-500" size={18} />
                          </div>
                          {selectedActivity?.id === actividad.id && (
                            <div className="activity-details-modern mt-4">
                              {/* Sección de detalles dividida visualmente */}
                              <div className="details-blocks-modern mb-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
                                <div className="detail-block-modern" style={{ background: '#e3f0ff', borderRadius: '12px', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <FaCalendarAlt size={22} style={{ color: '#4f8cff' }} />
                                  <div>
                                    <div style={{ fontWeight: 600, color: '#1a2a3a', fontSize: '1.05rem' }}>Unidad de Medida</div>
                                    <div style={{ color: '#222', fontSize: '1rem' }}>{actividad.unidadMedida}</div>
                                  </div>
                                </div>
                                <div className="detail-block-modern" style={{ background: '#eafbe3', borderRadius: '12px', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <FaChartBar size={22} style={{ color: '#4CAF50' }} />
                                  <div>
                                    <div style={{ fontWeight: 600, color: '#1a2a3a', fontSize: '1.05rem' }}>Meta Total</div>
                                    <div style={{ color: '#222', fontSize: '1rem' }}>{actividad.metaTotal}</div>
                                  </div>
                                </div>
                                <div className="detail-block-modern" style={{ background: '#fff3e3', borderRadius: '12px', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <FaChartLine size={22} style={{ color: '#FF9800' }} />
                                  <div>
                                    <div style={{ fontWeight: 600, color: '#1a2a3a', fontSize: '1.05rem' }}>Meta 2025</div>
                                    <div style={{ color: '#222', fontSize: '1rem' }}>{actividad.meta2025}</div>
                                  </div>
                                </div>
                                <div className="detail-block-modern" style={{ background: '#f7e3fb', borderRadius: '12px', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <FaProjectDiagram size={22} style={{ color: '#9C27B0' }} />
                                  <div>
                                    <div style={{ fontWeight: 600, color: '#1a2a3a', fontSize: '1.05rem' }}>OBJ</div>
                                    <div style={{ color: '#222', fontSize: '1rem' }}>{actividad.objetivo}</div>
                                  </div>
                                </div>
                                <div className="detail-block-modern" style={{ background: '#e3f7fa', borderRadius: '12px', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <FaBook size={22} style={{ color: '#607D8B' }} />
                                  <div>
                                    <div style={{ fontWeight: 600, color: '#1a2a3a', fontSize: '1.05rem' }}>PRODUCTO</div>
                                    <div style={{ color: '#222', fontSize: '1rem' }}>{actividad.producto}</div>
                                  </div>
                                </div>
                              </div>
                              {/* Progreso mensual: vertical para el primer proyecto, casillas pequeñas para los otros */}
                              <div className="progress-section-modern mt-4">
                                <div className="progress-header flex items-center gap-2 mb-4" style={{ zIndex: 10, position: 'relative', background: '#fff', padding: '8px 0' }}>
                                  <FaChartLine size={16} className="text-blue-500" />
                                  <span className="font-semibold text-gray-700">Progreso Mensual</span>
                                </div>
                                {/* Si el avance es texto, mostrarlo en bloques modernos y legibles */}
                                {proyecto.id === 1 ? (
                                  <div className="progress-vertical-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', alignItems: 'start', marginTop: '20px' }}>
                                    {getMesesHastaActivo().map((mes) => {
                                      const valor = actividad.avances?.[mes] || '';
                                      const esEditable = esMesEditable(mes);
                                      const key = `${proyecto.id}_${actividad.id}_${mes}`;
                                      const valorEditando = editandoAvances[key];
                                      const valorMostrar = valorEditando !== undefined ? valorEditando : valor;
                                      
                                      return (
                                        <div key={mes} className="progress-card" style={{ 
                                          background: '#fff', 
                                          borderRadius: '12px', 
                                          boxShadow: '0 4px 20px rgba(60,72,88,0.12)', 
                                          border: esEditable ? '2px solid #10b981' : '1px solid #e5e7eb', 
                                          overflow: 'hidden', 
                                          position: 'relative' 
                                        }}>
                                          <div className="month-header" style={{ 
                                            background: esEditable 
                                              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                                              : 'linear-gradient(135deg, #4f8cff 0%, #6366f1 100%)', 
                                            color: '#fff', 
                                            fontWeight: 600, 
                                            textAlign: 'center', 
                                            fontSize: '0.95rem', 
                                            padding: '12px 16px', 
                                            margin: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px'
                                          }}>
                                            {mes.charAt(0).toUpperCase() + mes.slice(1)}
                                            {esEditable && <FaUnlock size={14} />}
                                            {!esEditable && <FaLock size={14} />}
                                          </div>
                                          <div className="content-area" style={{ padding: '20px', minHeight: '120px' }}>
                                            {esEditable ? (
                                              <div>
                                                <textarea
                                                  value={valorMostrar}
                                                  onChange={(e) => handleAvanceChange(proyecto.id, actividad.id, mes, e.target.value)}
                                                  style={{
                                                    width: '100%',
                                                    minHeight: '100px',
                                                    padding: '12px',
                                                    border: '1px solid #d1d5db',
                                                    borderRadius: '8px',
                                                    fontSize: '0.9rem',
                                                    lineHeight: '1.6',
                                                    resize: 'vertical',
                                                    fontFamily: 'inherit'
                                                  }}
                                                  placeholder="Ingrese el avance del mes..."
                                                />
                                                {valorEditando !== undefined && (
                                                  <button
                                                    onClick={() => guardarAvance(proyecto.id, actividad.id, mes)}
                                                    disabled={guardando}
                                                    style={{
                                                      marginTop: '10px',
                                                      padding: '8px 16px',
                                                      background: '#10b981',
                                                      color: '#fff',
                                                      border: 'none',
                                                      borderRadius: '6px',
                                                      cursor: guardando ? 'not-allowed' : 'pointer',
                                                      fontSize: '0.85rem',
                                                      fontWeight: 600,
                                                      display: 'flex',
                                                      alignItems: 'center',
                                                      gap: '6px',
                                                      opacity: guardando ? 0.7 : 1
                                                    }}
                                                  >
                                                    <FaSave size={12} />
                                                    {guardando ? 'Guardando...' : 'Guardar'}
                                                  </button>
                                                )}
                                              </div>
                                            ) : (
                                              <div style={{ color: '#374151', fontSize: '0.9rem', fontWeight: 400, lineHeight: '1.6', wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
                                                {valorMostrar}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="progress-numeric-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '6px', marginTop: '16px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    {getMesesHastaActivo().map((mes) => {
                                      const valor = actividad.avances?.[mes] || '';
                                      const esEditable = esMesEditable(mes);
                                      const key = `${proyecto.id}_${actividad.id}_${mes}`;
                                      const valorEditando = editandoAvances[key];
                                      const valorMostrar = valorEditando !== undefined ? valorEditando : valor;
                                      
                                      return (
                                        <div key={mes} className="progress-numeric-cell" style={{ 
                                          display: 'flex', 
                                          flexDirection: 'column', 
                                          alignItems: 'center', 
                                          background: esEditable 
                                            ? 'linear-gradient(145deg, #f0fdf4 0%, #dcfce7 100%)' 
                                            : 'linear-gradient(145deg, #ffffff 0%, #f1f5f9 100%)', 
                                          borderRadius: '8px', 
                                          boxShadow: '0 2px 8px rgba(100,116,139,0.1)', 
                                          border: esEditable ? '2px solid #10b981' : '1px solid #cbd5e1', 
                                          minHeight: '90px', 
                                          padding: '8px 4px', 
                                          transition: 'all 0.2s ease' 
                                        }}>
                                          <div className="month-label" style={{ 
                                            color: esEditable ? '#059669' : '#64748b', 
                                            fontWeight: 600, 
                                            fontSize: '0.7rem', 
                                            marginBottom: '4px', 
                                            textAlign: 'center', 
                                            textTransform: 'uppercase', 
                                            letterSpacing: '0.5px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                          }}>
                                            {mes.slice(0, 3)}
                                            {esEditable && <FaUnlock size={8} />}
                                            {!esEditable && <FaLock size={8} />}
                                          </div>
                                          <div className="progress-value" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, width: '100%', gap: '4px' }}>
                                            {esEditable ? (
                                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', width: '100%' }}>
                                                <input
                                                  type="number"
                                                  value={valorMostrar}
                                                  onChange={(e) => handleAvanceChange(proyecto.id, actividad.id, mes, e.target.value)}
                                                  style={{
                                                    width: '50px',
                                                    padding: '4px',
                                                    border: '1px solid #d1d5db',
                                                    borderRadius: '4px',
                                                    textAlign: 'center',
                                                    fontSize: '0.9rem',
                                                    fontWeight: 600
                                                  }}
                                                  min="0"
                                                  max="100"
                                                />
                                                {valorEditando !== undefined && (
                                                  <button
                                                    onClick={() => guardarAvance(proyecto.id, actividad.id, mes)}
                                                    disabled={guardando}
                                                    style={{
                                                      padding: '2px 6px',
                                                      background: '#10b981',
                                                      color: '#fff',
                                                      border: 'none',
                                                      borderRadius: '3px',
                                                      cursor: guardando ? 'not-allowed' : 'pointer',
                                                      fontSize: '0.65rem',
                                                      fontWeight: 600,
                                                      display: 'flex',
                                                      alignItems: 'center',
                                                      gap: '2px',
                                                      opacity: guardando ? 0.7 : 1
                                                    }}
                                                  >
                                                    <FaSave size={8} />
                                                    OK
                                                  </button>
                                                )}
                                              </div>
                                            ) : (
                                              <span style={{ 
                                                fontWeight: 700, 
                                                color: '#0f172a', 
                                                fontSize: '1rem', 
                                                textAlign: 'center', 
                                                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', 
                                                WebkitBackgroundClip: 'text', 
                                                WebkitTextFillColor: 'transparent', 
                                                backgroundClip: 'text' 
                                              }}>
                                                {valorMostrar}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                              {/* Observaciones y Avance General */}
                              <div className="mt-6" style={{ background: '#f8fafc', borderRadius: '12px', padding: '18px 20px', marginTop: '18px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                  {/* Observaciones */}
                                  <div>
                                    <label style={{ fontWeight: 600, color: '#7c3aed', fontSize: '1rem' }}>Observaciones</label>
                                    <textarea
                                      value={editandoObservaciones[`${proyecto.id}_${actividad.id}`] !== undefined ? editandoObservaciones[`${proyecto.id}_${actividad.id}`] : (actividad.observaciones || '')}
                                      onChange={e => handleObservacionChange(proyecto.id, actividad.id, e.target.value)}
                                      style={{ width: '100%', minHeight: '60px', border: '1px solid #d1d5db', borderRadius: '8px', padding: '10px', fontSize: '0.95rem', marginTop: '6px' }}
                                      placeholder="Ingrese observaciones relevantes..."
                                    />
                                    {editandoObservaciones[`${proyecto.id}_${actividad.id}`] !== undefined && (
                                      <button
                                        onClick={() => guardarObservacion(proyecto.id, actividad.id)}
                                        disabled={guardando}
                                        style={{ marginTop: '8px', padding: '7px 18px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.9rem', cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1 }}
                                      >
                                        <FaSave size={12} style={{ marginRight: 6 }} /> {guardando ? 'Guardando...' : 'Guardar Observación'}
                                      </button>
                                    )}
                                  </div>
                                  {/* Avance General */}
                                  <div>
                                    <label style={{ fontWeight: 600, color: '#059669', fontSize: '1rem' }}>% Avance (General)</label>
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={editandoAvanceGeneral[`${proyecto.id}_${actividad.id}`] !== undefined ? editandoAvanceGeneral[`${proyecto.id}_${actividad.id}`] : (actividad.avanceGeneral || '')}
                                      onChange={e => handleAvanceGeneralChange(proyecto.id, actividad.id, e.target.value)}
                                      style={{ width: '100px', border: '1px solid #d1d5db', borderRadius: '8px', padding: '8px', fontSize: '1rem', marginLeft: '10px', marginTop: '6px' }}
                                      placeholder="0-100"
                                    />
                                    {editandoAvanceGeneral[`${proyecto.id}_${actividad.id}`] !== undefined && (
                                      <button
                                        onClick={() => guardarAvanceGeneral(proyecto.id, actividad.id)}
                                        disabled={guardando}
                                        style={{ marginLeft: '12px', padding: '7px 18px', background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.9rem', cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1 }}
                                      >
                                        <FaSave size={12} style={{ marginRight: 6 }} /> {guardando ? 'Guardando...' : 'Guardar % Avance'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Formulario;
