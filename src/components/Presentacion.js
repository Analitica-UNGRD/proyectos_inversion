import { getProyectosUnicos } from '../utils/projectUtils';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDatos, getDatosFinancieros } from '../services/spreadsheetApi';
import LoadingIndicator from './LoadingIndicator';
import { FaArrowLeft, FaChartBar, FaDollarSign, FaCalendarAlt, FaChartLine } from 'react-icons/fa';
import './presentacion.css';

const Presentacion = () => {
  const [proyectos, setProyectos] = useState([]);
  const [datosFinancieros, setDatosFinancieros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mesSeleccionado, setMesSeleccionado] = useState('');
  const [mesesDisponibles, setMesesDisponibles] = useState([]);
  const [modoPresentacion, setModoPresentacion] = useState(false);

  useEffect(() => {
    let isMounted = true; // Flag para prevenir memory leaks

    const loadData = async () => {
      try {
        const datos = await getDatos();
        const financiera = await getDatosFinancieros();
        
        if (isMounted) {
          setProyectos(datos.proyectos || []);
          setDatosFinancieros(financiera);
          
          // Extraer meses disponibles de las fechas de corte
          const meses = [...new Set(financiera.map(fila => {
            const fecha = fila['Fecha Corte'] || fila['FECHA_CORTE'] || fila['fecha_corte'];
            if (fecha) {
              const fechaObj = new Date(fecha);
              return fechaObj.getMonth() + 1; // getMonth() devuelve 0-11, necesitamos 1-12
            }
            return null;
          }).filter(mes => mes !== null))].sort((a, b) => a - b);
          
          setMesesDisponibles(meses);
          if (meses.length > 0) {
            setMesSeleccionado(meses[meses.length - 1].toString()); // Seleccionar el mes más reciente por defecto
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    // Cleanup function para prevenir memory leaks
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) return <LoadingIndicator />;
  if (error) return (
    <div className="p-6 text-red-600">Error cargando datos de presentación: {error}</div>
  );

  // Filtrar datos por mes seleccionado
  const datosFiltrados = datosFinancieros.filter(fila => {
    const fecha = fila['Fecha Corte'] || fila['FECHA_CORTE'] || fila['fecha_corte'];
    if (fecha && mesSeleccionado) {
      const fechaObj = new Date(fecha);
      return (fechaObj.getMonth() + 1).toString() === mesSeleccionado;
    }
    return false;
  });

  // Agrupar datos por proyecto usando los datos reales
  const proyectosUnicos = getProyectosUnicos(proyectos); // Solo tomar los primeros 3 proyectos únicos

  const datosPorProyecto = proyectosUnicos.map((nombreProyecto, idx) => {
    // Filtrar datos específicos de este proyecto
    const datosDeEsteProyecto = datosFiltrados.filter(fila => {
      const filaProyecto = fila['Proyecto'] || fila['PROYECTO'] || fila['proyecto'];
      return filaProyecto === nombreProyecto;
    });

    // Si no hay datos específicos, usar una porción de los datos generales
    let datosParaCalcular = datosDeEsteProyecto;
    if (datosParaCalcular.length === 0) {
      // Dividir los datos en 3 grupos para cada proyecto
      const totalFilas = datosFiltrados.length;
      const filasPorProyecto = Math.ceil(totalFilas / 3);
      const inicio = idx * filasPorProyecto;
      const fin = Math.min(inicio + filasPorProyecto, totalFilas);
      datosParaCalcular = datosFiltrados.slice(inicio, fin);
    }

    // Agrupar por tipo de valor para este proyecto específico
    const agrupadosPorTipo = datosParaCalcular.reduce((acc, fila) => {
      const tipo = fila['Tipo de Valor'] || fila['TIPO_VALOR'] || fila['tipo_valor'] || 'Sin tipo';
      if (!acc[tipo]) acc[tipo] = [];
      acc[tipo].push(fila);
      return acc;
    }, {});

    // Calcular totales por tipo para este proyecto específico
    const totales = Object.keys(agrupadosPorTipo).map(tipo => {
      const filasPorTipo = agrupadosPorTipo[tipo];
      const total = filasPorTipo.reduce((sum, fila) => {
        const valor = parseFloat(fila['Valor'] || fila['VALOR'] || fila['valor'] || 0);
        return sum + valor;
      }, 0);
      
      // Obtener el porcentaje de la hoja de cálculo si está disponible
      const porcentajeHoja = filasPorTipo.length > 0 ? 
        parseFloat(filasPorTipo[0]['Porcentaje'] || filasPorTipo[0]['PORCENTAJE'] || filasPorTipo[0]['porcentaje'] || 0) : 0;
      
      return { 
        tipo, 
        total, 
        count: filasPorTipo.length,
        porcentajeHoja: porcentajeHoja
      };
    });

    // Encontrar el BPIN correspondiente
    const filaConBpin = datosParaCalcular.find(fila => fila['BPIN'] || fila['bpin']);
    const bpin = filaConBpin ? (filaConBpin['BPIN'] || filaConBpin['bpin']) : `BPIN-${idx + 1}`;

    return {
      nombre: nombreProyecto,
      bpin: bpin,
      totales: totales
    };
  });

  // Calcular totales generales sumando los valores de todos los proyectos
  const todosLosTipos = new Set();
  datosPorProyecto.forEach(proyecto => {
    proyecto.totales.forEach(tipoTotal => {
      todosLosTipos.add(tipoTotal.tipo);
    });
  });

  const totalesGenerales = Array.from(todosLosTipos).map(tipo => {
    const totalGeneral = datosPorProyecto.reduce((sum, proyecto) => {
      const tipoEnProyecto = proyecto.totales.find(t => t.tipo === tipo);
      return sum + (tipoEnProyecto ? tipoEnProyecto.total : 0);
    }, 0);
    
    const countGeneral = datosPorProyecto.reduce((sum, proyecto) => {
      const tipoEnProyecto = proyecto.totales.find(t => t.tipo === tipo);
      return sum + (tipoEnProyecto ? tipoEnProyecto.count : 0);
    }, 0);

    return {
      tipo,
      total: totalGeneral,
      count: countGeneral
    };
  });

  const formatNumber = (num) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  // Colores específicos para cada proyecto (mismo que en Formulario.js)
  const coloresProyectos = [
    '#3498db', // Azul - Proyecto 1
    '#e67e22', // Naranja - Proyecto 2
    '#16a085'  // Verde/Teal - Proyecto 3
  ];

  // Función para obtener el color según el índice del proyecto
  const getColorProyecto = (index) => {
    return coloresProyectos[index] || '#6b7280'; // Color por defecto si no hay color específico
  };

  // Función para convertir número de mes a nombre
  const getNombreMes = (numeroMes) => {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return meses[numeroMes - 1] || `Mes ${numeroMes}`;
  };

  // Función para obtener los avances físicos acumulados hasta el mes seleccionado
  const getAvancesFisicosAcumulados = () => {
    if (!proyectos || proyectos.length === 0 || !mesSeleccionado) return [];

    const mesNumero = parseInt(mesSeleccionado);
    const mesesHasta = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                       'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
                      .slice(0, mesNumero);

    // Agrupar proyectos físicos usando los primeros 3 proyectos únicos
  const proyectosUnicos = getProyectosUnicos(proyectos);

    return proyectosUnicos.map((nombreProyecto, idx) => {
      // Filtrar actividades de este proyecto
      const actividadesProyecto = proyectos.filter(p => {
        const filaProyecto = p['Proyecto'] || p['PROYECTO'] || p['proyecto'];
        return filaProyecto === nombreProyecto;
      });

      // Si no hay actividades específicas, usar una porción de todas las actividades
      let actividadesParaCalcular = actividadesProyecto;
      if (actividadesParaCalcular.length === 0) {
        const totalActividades = proyectos.length;
        const actividadesPorProyecto = Math.ceil(totalActividades / 3);
        const inicio = idx * actividadesPorProyecto;
        const fin = Math.min(inicio + actividadesPorProyecto, totalActividades);
        actividadesParaCalcular = proyectos.slice(inicio, fin);
      }

      // Calcular el avance mensual para cada actividad
      const actividadesConAvance = actividadesParaCalcular.map(actividad => {
        const avancesPorMes = {};
        let esCualitativo = false;

        // Obtener avances de cada mes hasta el mes seleccionado
        mesesHasta.forEach(mes => {
          const valorMes = actividad[mes.toUpperCase()] || actividad[mes] || '';
          // Determinar si es cualitativo (texto) o cuantitativo (número)
          const esNumero = !isNaN(parseFloat(valorMes)) && isFinite(valorMes);
          if (!esNumero && valorMes && valorMes.toString().trim() !== '') {
            esCualitativo = true;
          }
          avancesPorMes[mes] = valorMes;
        });

        // Si es el primer proyecto (política nacional), tratarlo como cualitativo
        const esPrimerProyecto = idx === 0;
        const tipoCualitativo = esPrimerProyecto || esCualitativo;

        return {
          nombre: actividad['ACTIVIDAD'] || actividad['OBJ'] || actividad['actividad'] || actividad['obj'] || 'Actividad',
          avancesPorMes: avancesPorMes,
          unidadMedida: actividad['Unidad de Medida'] || actividad['UNIDAD_MEDIDA'] || 'Unidades',
          meta2025: actividad['META 2025'] || actividad['META_2025'] || 'N/A',
          esCualitativo: tipoCualitativo
        };
      });

      // Encontrar el BPIN correspondiente
      const actividadConBpin = actividadesParaCalcular.find(act => act['BPIN'] || act['bpin']);
      const bpin = actividadConBpin ? (actividadConBpin['BPIN'] || actividadConBpin['bpin']) : `BPIN-${idx + 1}`;

      return {
        nombre: nombreProyecto,
        bpin: bpin,
        actividades: actividadesConAvance.slice(0, 5) // Limitar a 5 actividades principales
      };
    });
  };

  const avancesFisicos = getAvancesFisicosAcumulados();

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: modoPresentacion 
        ? 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)' 
        : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', 
      padding: modoPresentacion ? '30px' : '24px',
      transition: 'all 0.5s ease'
    }}>
      <div style={{ maxWidth: modoPresentacion ? '1600px' : '1200px', margin: '0 auto' }}>

        {/* Header principal */}
        <div style={{ 
          background: modoPresentacion 
            ? 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)' 
            : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)', 
          color: modoPresentacion ? '#1e293b' : '#1e293b', 
          padding: modoPresentacion ? '48px' : '32px', 
          borderRadius: modoPresentacion ? '24px' : '12px', 
          marginBottom: modoPresentacion ? '48px' : '32px', 
          boxShadow: modoPresentacion 
            ? '0 20px 40px rgba(0,0,0,0.4), 0 0 60px rgba(59, 130, 246, 0.2)' 
            : '0 10px 25px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.6)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          border: modoPresentacion 
            ? '2px solid rgba(59, 130, 246, 0.3)' 
            : '1px solid rgba(148, 163, 184, 0.3)'
        }}>
          {/* Efecto de brillo para modo presentación */}
          {modoPresentacion && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.1), transparent)',
              animation: 'shine 3s infinite',
              pointerEvents: 'none'
            }} />
          )}
          <div>
            <h1 style={{ 
              fontSize: modoPresentacion ? '3.8rem' : '2.5rem', 
              fontWeight: '700', 
              margin: '0 0 8px 0', 
              display: 'flex', 
              alignItems: 'center',
              transition: 'all 0.3s ease',
              backgroundImage: modoPresentacion 
                ? 'linear-gradient(45deg, #1e40af, #3b82f6, #60a5fa)' 
                : 'linear-gradient(45deg, #3b82f6, #1d4ed8, #1e40af)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: modoPresentacion 
                ? 'drop-shadow(0 3px 6px rgba(30, 64, 175, 0.3))' 
                : 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3))',
              letterSpacing: modoPresentacion ? '1px' : 'normal'
            }}>
              <FaChartBar style={{ 
                display: 'inline', 
                marginRight: '16px',
                color: modoPresentacion ? '#1e40af' : '#3b82f6',
                filter: modoPresentacion 
                  ? 'drop-shadow(0 2px 4px rgba(30, 64, 175, 0.4))' 
                  : 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3))'
              }} /> 
              {modoPresentacion ? 'Presentación Ejecutiva' : 'Matriz de Proyectos'}
            </h1>
            <p style={{ 
              fontSize: modoPresentacion ? '1.5rem' : '1.2rem', 
              margin: 0,
              transition: 'all 0.3s ease',
              color: modoPresentacion ? '#475569' : '#334155',
              fontWeight: modoPresentacion ? '500' : '500',
              textShadow: modoPresentacion 
                ? 'none' 
                : '0 1px 2px rgba(0, 0, 0, 0.1)',
              letterSpacing: modoPresentacion ? '0.5px' : 'normal'
            }}>
              {modoPresentacion ? 'Análisis Financiero de Proyectos' : 'Dashboard Ejecutivo - Análisis Financiero'}
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Botón de presentación */}
            <button
              onClick={() => setModoPresentacion(!modoPresentacion)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: modoPresentacion ? '#dc2626' : '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: modoPresentacion 
                  ? '0 4px 12px rgba(220, 38, 38, 0.25)' 
                  : '0 4px 12px rgba(59, 130, 246, 0.25)',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
              }}
              onMouseEnter={(e) => {
                if (!modoPresentacion) {
                  e.target.style.backgroundColor = '#2563eb';
                  e.target.style.transform = 'translateY(-1px)';
                } else {
                  e.target.style.backgroundColor = '#b91c1c';
                  e.target.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!modoPresentacion) {
                  e.target.style.backgroundColor = '#3b82f6';
                  e.target.style.transform = 'translateY(0)';
                } else {
                  e.target.style.backgroundColor = '#dc2626';
                  e.target.style.transform = 'translateY(0)';
                }
              }}
            >
              <FaChartBar />
              {modoPresentacion ? 'Salir Presentación' : 'Modo Presentación'}
            </button>

            {/* Link de vuelta al dashboard (solo si no está en modo presentación) */}
            {!modoPresentacion && (
              <Link to="/" style={{ 
                color: '#334155', 
                textDecoration: 'none', 
                padding: '12px 24px', 
                background: 'rgba(255,255,255,0.9)', 
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.3s ease',
                fontSize: '14px',
                fontWeight: '600',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                border: '1px solid rgba(0, 0, 0, 0.1)'
              }}>
                <FaArrowLeft style={{ marginRight: '8px' }} /> Volver al Dashboard
              </Link>
            )}
          </div>
        </div>

        {/* Selector de mes como botones - Solo visible en modo normal */}
        {!modoPresentacion && (
          <div style={{ 
            background: 'white', 
            borderRadius: '12px', 
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)', 
            padding: '24px', 
            marginBottom: '24px', 
            border: '1px solid #e2e8f0' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <FaCalendarAlt style={{ color: '#2d5a87', marginRight: '12px', fontSize: '1.5rem' }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, color: '#2d3748' }}>Mes de Análisis</h2>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {mesesDisponibles.map(mes => (
              <button
                key={mes}
                onClick={() => setMesSeleccionado(mes.toString())}
                style={{
                  padding: '12px 20px',
                  fontSize: '1rem',
                  border: mesSeleccionado === mes.toString() ? '2px solid #2d5a87' : '2px solid #e2e8f0',
                  borderRadius: '8px',
                  background: mesSeleccionado === mes.toString() ? '#2d5a87' : 'white',
                  color: mesSeleccionado === mes.toString() ? 'white' : '#2d3748',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
              >
                {getNombreMes(mes)}
              </button>
            ))}
          </div>
        </div>
        )}

        {/* Leyenda explicativa - Solo visible en modo normal */}
        {!modoPresentacion && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            border: '1px solid #e2e8f0'
          }}>
          <h3 style={{
            fontSize: '1.1rem',
            fontWeight: 'bold',
            color: '#2d5a87',
            marginBottom: '12px',
            textAlign: 'center'
          }}>
            Información de las Métricas
          </h3>
          <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ textAlign: 'center', flex: 1, minWidth: '200px' }}>
              <div style={{
                width: '60px',
                height: '8px',
                background: 'linear-gradient(to right, #2d5a87, #1a365d)',
                borderRadius: '4px',
                margin: '0 auto 8px'
              }}></div>
              <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                Barra de Progreso
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                % respecto al total
              </div>
            </div>
            <div style={{ textAlign: 'center', flex: 1, minWidth: '200px' }}>
              <div style={{
                backgroundColor: '#f8fafc',
                border: '2px solid #e2e8f0',
                borderRadius: '6px',
                padding: '4px 12px',
                margin: '0 auto 8px',
                width: 'fit-content',
                fontSize: '0.9rem',
                fontWeight: '900'
              }}>
                $1.234.567
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                Valor del Proyecto
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                Monto en COP
              </div>
            </div>
            <div style={{ textAlign: 'center', flex: 1, minWidth: '200px' }}>
              <div style={{
                backgroundColor: '#2d5a87',
                color: 'white',
                border: '2px solid #1a365d',
                borderRadius: '6px',
                padding: '4px 12px',
                margin: '0 auto 8px',
                width: 'fit-content',
                fontSize: '0.9rem',
                fontWeight: '900'
              }}>
                85.5%
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>
                % de la Hoja
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                Porcentaje oficial del proyecto
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Información del período en modo presentación */}
        {modoPresentacion && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '32px',
            marginBottom: '32px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
            border: '2px solid #2d5a87',
            textAlign: 'center'
          }}>
            <h2 style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: '#2d5a87',
              marginBottom: '16px'
            }}>
              Análisis Período: {getNombreMes(parseInt(mesSeleccionado))} 2025
            </h2>
            <p style={{
              fontSize: '1.2rem',
              color: '#6b7280',
              margin: 0
            }}>
              Reporte Ejecutivo de Estado Financiero y Físico de Proyectos
            </p>
          </div>
        )}

        {/* Sección por cada proyecto - Formato horizontal */}
        {datosPorProyecto.map((proyectoFinanciero, proyectoIdx) => {
          const proyectoFisico = avancesFisicos.find(af => af.nombre === proyectoFinanciero.nombre) || null;
          
          return (
            <div 
              key={`proyecto-${proyectoIdx}`}
              style={{
                marginBottom: modoPresentacion ? '64px' : '48px',
                background: 'white',
                borderRadius: modoPresentacion ? '24px' : '16px',
                boxShadow: modoPresentacion 
                  ? '0 20px 40px rgba(0,0,0,0.15), 0 0 30px rgba(0,0,0,0.05)' 
                  : '0 8px 24px rgba(0,0,0,0.1)',
                border: modoPresentacion 
                  ? `3px solid ${getColorProyecto(proyectoIdx)}` 
                  : '1px solid #e2e8f0',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              {/* Header del proyecto */}
              <div style={{
                background: `linear-gradient(135deg, ${getColorProyecto(proyectoIdx)}, ${getColorProyecto(proyectoIdx)}dd)`,
                color: 'white',
                padding: modoPresentacion ? '32px' : '24px',
                textAlign: 'center'
              }}>
                <h2 style={{
                  fontSize: modoPresentacion ? '2.5rem' : '1.8rem',
                  fontWeight: 'bold',
                  margin: '0 0 12px 0'
                }}>
                  {proyectoFinanciero.nombre}
                </h2>
                <p style={{
                  fontSize: modoPresentacion ? '1.3rem' : '1rem',
                  margin: 0,
                  opacity: 0.9
                }}>
                  BPIN: {proyectoFinanciero.bpin}
                </p>
              </div>

              {/* Contenido del proyecto en dos columnas */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: modoPresentacion ? '1fr' : '1fr 1fr',
                gap: modoPresentacion ? '0' : '32px',
                padding: modoPresentacion ? '0' : '32px'
              }}>
                
                {/* Columna Financiera */}
                <div style={{
                  padding: modoPresentacion ? '48px' : '0'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '24px',
                    justifyContent: modoPresentacion ? 'center' : 'flex-start'
                  }}>
                    <FaDollarSign 
                      size={modoPresentacion ? 28 : 24} 
                      style={{ 
                        color: getColorProyecto(proyectoIdx), 
                        marginRight: '12px' 
                      }} 
                    />
                    <h3 style={{
                      fontSize: modoPresentacion ? '2rem' : '1.5rem',
                      fontWeight: 'bold',
                      color: getColorProyecto(proyectoIdx),
                      margin: 0
                    }}>
                      Información Financiera
                    </h3>
                  </div>

                  {totalesGenerales.map((totalTipo, tipoIndex) => {
                    const tipo = totalTipo.tipo;
                    const totalGeneral = totalTipo.total;
                    const proyectoTipo = proyectoFinanciero.totales.find(t => t.tipo === tipo);
                    const valorProyecto = proyectoTipo ? proyectoTipo.total : 0;
                    const porcentaje = totalGeneral ? (valorProyecto / totalGeneral) * 100 : 0;
                    const colores = [
                      'linear-gradient(to right, #2d5a87, #1a365d)',
                      'linear-gradient(to right, #c53030, #9b2c2c)',
                      'linear-gradient(to right, #38a169, #2f855a)',
                      'linear-gradient(to right, #d69e2e, #b7791f)',
                      'linear-gradient(to right, #805ad5, #553c9a)',
                      'linear-gradient(to right, #dd6b20, #c05621)'
                    ];
                    const colorBarra = colores[tipoIndex % colores.length];
                    
                    return (
                      <div key={tipo} style={{ marginBottom: '20px' }}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          marginBottom: '8px' 
                        }}>
                          <span style={{ 
                            fontWeight: '600', 
                            color: '#374151',
                            fontSize: modoPresentacion ? '1.1rem' : '1rem'
                          }}>
                            {tipo}
                          </span>
                          <span style={{ 
                            fontSize: modoPresentacion ? '0.9rem' : '0.8rem', 
                            color: '#9ca3af' 
                          }}>
                            Total: {formatNumber(totalGeneral)}
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ 
                            width: '100%', 
                            background: '#f3f4f6', 
                            borderRadius: '8px', 
                            height: modoPresentacion ? '32px' : '28px', 
                            position: 'relative',
                            overflow: 'hidden'
                          }}>
                            <div
                              style={{ 
                                position: 'absolute', 
                                left: 0, 
                                top: 0, 
                                height: '100%', 
                                borderRadius: '8px', 
                                background: colorBarra,
                                width: `${porcentaje}%`,
                                transition: 'width 0.3s ease'
                              }}
                            ></div>
                            <span style={{
                              position: 'absolute',
                              left: '50%',
                              top: '50%',
                              transform: 'translate(-50%, -50%)',
                              fontSize: modoPresentacion ? '0.9rem' : '0.8rem',
                              fontWeight: 'bold',
                              color: porcentaje > 30 ? '#ffffff' : '#374151',
                              textShadow: porcentaje > 30 ? '0 1px 2px rgba(0,0,0,0.5)' : '0 1px 2px rgba(255,255,255,0.8)',
                              zIndex: 5
                            }}>
                              {porcentaje.toFixed(1)}%
                            </span>
                          </div>
                          
                          <span style={{ 
                            fontSize: modoPresentacion ? '1.1rem' : '1rem', 
                            color: '#1f2937', 
                            fontWeight: '900',
                            minWidth: modoPresentacion ? '200px' : '160px',
                            textAlign: 'right',
                            backgroundColor: '#f8fafc',
                            padding: modoPresentacion ? '8px 16px' : '6px 12px',
                            borderRadius: '8px',
                            border: '2px solid #e2e8f0',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                          }}>
                            {formatNumber(valorProyecto)}
                          </span>
                          
                          {proyectoTipo && proyectoTipo.porcentajeHoja > 0 && (
                            <span style={{ 
                              fontSize: modoPresentacion ? '1.1rem' : '1rem', 
                              color: '#ffffff', 
                              fontWeight: '900',
                              minWidth: modoPresentacion ? '100px' : '80px',
                              textAlign: 'center',
                              backgroundColor: '#2d5a87',
                              padding: modoPresentacion ? '8px 16px' : '6px 12px',
                              borderRadius: '8px',
                              border: '2px solid #1a365d',
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
                            }}>
                              {proyectoTipo.porcentajeHoja.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Columna de Avance Físico */}
                <div style={{
                  padding: modoPresentacion ? '48px' : '0',
                  borderLeft: modoPresentacion ? 'none' : '1px solid #e2e8f0'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '24px',
                    justifyContent: modoPresentacion ? 'center' : 'flex-start'
                  }}>
                    <FaChartLine 
                      size={modoPresentacion ? 28 : 24} 
                      style={{ 
                        color: '#10b981', 
                        marginRight: '12px' 
                      }} 
                    />
                    <h3 style={{
                      fontSize: modoPresentacion ? '2rem' : '1.5rem',
                      fontWeight: 'bold',
                      color: '#10b981',
                      margin: 0
                    }}>
                      Avance Físico
                    </h3>
                  </div>

                  {proyectoFisico && proyectoFisico.actividades.length > 0 ? (
                    proyectoFisico.actividades.map((actividad, actIdx) => (
                      <div 
                        key={actIdx} 
                        style={{ 
                          marginBottom: '24px', 
                          padding: modoPresentacion ? '20px' : '16px', 
                          background: '#f8fafc', 
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0'
                        }}
                      >
                        <h4 style={{
                          fontSize: modoPresentacion ? '1.3rem' : '1.1rem',
                          fontWeight: 'bold',
                          color: '#374151',
                          marginBottom: '16px',
                          textAlign: modoPresentacion ? 'center' : 'left'
                        }}>
                          {actividad.nombre}
                        </h4>

                        {/* Progreso mensual */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: actividad.esCualitativo 
                            ? '1fr'
                            : 'repeat(auto-fit, minmax(120px, 1fr))',
                          gap: '12px'
                        }}>
                          {/* Mostrar avance mensual y acumulado para cuantitativos */}
                          {(() => {
                            let acumulado = 0;
                            const meta = parseFloat(actividad.meta2025) || 0;
                            return Object.entries(actividad.avancesPorMes).map(([mes, valor]) => {
                              if (!valor || valor.toString().trim() === '') return null;
                              const esNumerico = !isNaN(parseFloat(valor)) && isFinite(valor);
                              if (actividad.esCualitativo) {
                                return (
                                  <div key={mes} style={{
                                    padding: modoPresentacion ? '16px' : '12px',
                                    background: 'white',
                                    borderRadius: '8px',
                                    border: '1px solid #d1d5db',
                                    textAlign: 'left'
                                  }}>
                                    <div style={{
                                      fontSize: modoPresentacion ? '0.9rem' : '0.8rem',
                                      fontWeight: 'bold',
                                      color: '#6b7280',
                                      marginBottom: '8px',
                                      textTransform: 'capitalize'
                                    }}>{mes}</div>
                                    <div style={{
                                      fontSize: modoPresentacion ? '1rem' : '0.9rem',
                                      color: '#374151',
                                      lineHeight: '1.5',
                                      wordWrap: 'break-word',
                                      whiteSpace: 'pre-wrap'
                                    }}>{valor}</div>
                                  </div>
                                );
                              } else if (esNumerico) {
                                acumulado += parseFloat(valor);
                                let percent = meta > 0 ? (acumulado / meta) * 100 : 0;
                                let colorBadge = '#e0f2fe', colorText = '#0284c7', borderColor = '#e0e7ef', boxShadow = modoPresentacion ? '0 2px 12px rgba(16, 185, 129, 0.07)' : '0 1px 4px rgba(16, 185, 129, 0.04)';
                                if (percent < 40) {
                                  colorBadge = '#fee2e2'; colorText = '#dc2626'; borderColor = '#fecaca'; boxShadow = '0 2px 12px rgba(220,38,38,0.08)';
                                } else if (percent < 80) {
                                  colorBadge = '#fef9c3'; colorText = '#ca8a04'; borderColor = '#fde68a'; boxShadow = '0 2px 12px rgba(234,179,8,0.08)';
                                } else {
                                  colorBadge = '#d1fae5'; colorText = '#059669'; borderColor = '#6ee7b7'; boxShadow = '0 2px 12px rgba(16,185,129,0.10)';
                                }
                                return (
                                  <div key={mes} style={{
                                    padding: modoPresentacion ? '18px 12px' : '14px 8px',
                                    background: '#fff',
                                    borderRadius: '14px',
                                    border: `2px solid ${borderColor}`,
                                    textAlign: 'center',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow,
                                    minHeight: '110px',
                                    position: 'relative',
                                    transition: 'border 0.2s, box-shadow 0.2s',
                                  }}>
                                    <div style={{
                                      fontSize: modoPresentacion ? '1.05rem' : '0.95rem',
                                      fontWeight: 600,
                                      color: '#64748b',
                                      marginBottom: '6px',
                                      textTransform: 'capitalize',
                                      letterSpacing: '0.5px',
                                    }}>{mes}</div>
                                    <div style={{
                                      fontSize: modoPresentacion ? '2.1rem' : '1.5rem',
                                      fontWeight: 700,
                                      color: '#10b981',
                                      marginBottom: '2px',
                                      lineHeight: 1.1,
                                    }}>{parseFloat(valor).toFixed(1)}</div>
                                    <div style={{
                                      width: '80%',
                                      height: '1.5px',
                                      background: '#e0e7ef',
                                      margin: '6px 0 8px 0',
                                      borderRadius: '1px',
                                    }} />
                                    <div style={{
                                      fontSize: modoPresentacion ? '1.05rem' : '0.92rem',
                                      color: '#334155',
                                      fontWeight: 500,
                                      marginBottom: '2px',
                                    }}>
                                      <span style={{fontWeight:600}}>Acum:</span> {acumulado.toFixed(1)} {actividad.unidadMedida}
                                    </div>
                                    {meta > 0 && (
                                      <span style={{
                                        display: 'inline-block',
                                        background: colorBadge,
                                        color: colorText,
                                        fontWeight: 700,
                                        fontSize: modoPresentacion ? '0.98rem' : '0.85rem',
                                        borderRadius: '8px',
                                        padding: '2px 10px',
                                        marginTop: '2px',
                                        letterSpacing: '0.5px',
                                        border: `1.5px solid ${borderColor}`,
                                        boxShadow: `0 1px 4px ${colorBadge}55`,
                                        transition: 'background 0.2s, color 0.2s',
                                      }}>
                                        {percent.toFixed(1)}%
                                      </span>
                                    )}
                                  </div>
                                );
                              } else {
                                return null;
                              }
                            });
                          })()}
                        </div>

                        {/* Información adicional */}
                        <div style={{
                          marginTop: '12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: modoPresentacion ? '0.9rem' : '0.8rem',
                          color: '#6b7280'
                        }}>
                          <span>Meta 2025: {actividad.meta2025}</span>
                          <span>{actividad.unidadMedida}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      padding: '40px',
                      color: '#6b7280'
                    }}>
                      <FaChartLine style={{ fontSize: '2rem', marginBottom: '12px', opacity: 0.5 }} />
                      <p style={{ margin: 0 }}>No hay datos de avance físico disponibles para este proyecto</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Mensaje si no hay datos */}
        {mesSeleccionado && datosFiltrados.length === 0 && (
          <div style={{ 
            background: 'white', 
            borderRadius: '12px', 
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)', 
            padding: '40px', 
            border: '1px solid #e2e8f0', 
            textAlign: 'center', 
            color: '#718096' 
          }}>
            <FaChartBar style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>No hay datos para {getNombreMes(parseInt(mesSeleccionado))}</h3>
            <p style={{ margin: 0 }}>Seleccione otro mes para ver la información financiera</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Presentacion;