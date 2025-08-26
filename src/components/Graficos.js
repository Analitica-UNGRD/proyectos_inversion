import { comparaTipoValor } from '../utils/projectUtils';
import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getDatos, getDatosFinancieros } from '../services/spreadsheetApi';
import LoadingIndicator from './LoadingIndicator';
import useLogger from '../hooks/useLogger';
import Chart from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';
// import html2canvas from 'html2canvas'; // Comentado temporalmente
import { 
  FaArrowLeft, 
  FaDownload, 
  FaDollarSign, 
  FaFileInvoiceDollar, 
  FaHandHoldingUsd, 
  FaMoneyBillWave, 
  FaReceipt, 
  FaWallet,
  FaCreditCard,
  FaCalendarAlt,
  FaProjectDiagram,
  FaChartBar
} from 'react-icons/fa';

// Registrar el plugin
Chart.register(ChartDataLabels);

const Graficos = () => {
  const { log } = useLogger();
  // Estados principales
  const [proyectos, setProyectos] = useState([]);
  const [datosFinancieros, setDatosFinancieros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mesesDisponibles, setMesesDisponibles] = useState([]);
  const [añoSeleccionado, setAñoSeleccionado] = useState('2025');
  const [añosDisponibles, setAñosDisponibles] = useState([]);
  
  // Estados para el gráfico principal (estos controlan tanto el gráfico como la sección de datos)
  const [proyectoSeleccionadoGrafico, setProyectoSeleccionadoGrafico] = useState('todos');
  const [mesSeleccionadoGrafico, setMesSeleccionadoGrafico] = useState('');
  
  // Estados para comparación mensual
  const [proyectoSeleccionadoComparacion, setProyectoSeleccionadoComparacion] = useState('todos');
  const [mes1Comparacion, setMes1Comparacion] = useState('');
  const [mes2Comparacion, setMes2Comparacion] = useState('');
  
  const [vistaComparativa, setVistaComparativa] = useState(false);
  const [menuDescargaAbierto, setMenuDescargaAbierto] = useState(false);
  
  const dashboardRef = useRef(null);
  const chartRef = useRef(null);
  const chartComparativoRef = useRef(null);
  const chartMes1Ref = useRef(null);
  const chartMes2Ref = useRef(null);

  useEffect(() => {
    log('graficos_access', 'Usuario accedió a la sección de gráficos');
    
    let isMounted = true;

    const loadData = async () => {
      try {
        const datos = await getDatos();
        const financiera = await getDatosFinancieros();
        
        if (isMounted) {
          setProyectos(datos.proyectos || []);
          setDatosFinancieros(financiera);
          
          // Extraer meses disponibles
          const meses = [...new Set(financiera.map(fila => {
            const fecha = fila['Fecha Corte'] || fila['FECHA_CORTE'] || fila['fecha_corte'];
            if (fecha) {
              const fechaObj = new Date(fecha);
              return fechaObj.getMonth() + 1;
            }
            return null;
          }).filter(mes => mes !== null))].sort((a, b) => a - b);
          
          // Extraer años disponibles
          const años = [...new Set(financiera.map(fila => {
            const fecha = fila['Fecha Corte'] || fila['FECHA_CORTE'] || fila['fecha_corte'];
            if (fecha) {
              const fechaObj = new Date(fecha);
              return fechaObj.getFullYear();
            }
            return null;
          }).filter(año => año !== null))].sort((a, b) => a - b);
          
          setMesesDisponibles(meses);
          setAñosDisponibles(años);
          if (meses.length > 0) {
            const ultimoMes = meses[meses.length - 1].toString();
            const penultimoMes = meses.length > 1 ? meses[meses.length - 2].toString() : ultimoMes;
            
            setMesSeleccionadoGrafico(ultimoMes);
            setMes1Comparacion(penultimoMes);
            setMes2Comparacion(ultimoMes);
          }
          if (años.length > 0) {
            setAñoSeleccionado(años[años.length - 1].toString());
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

    return () => {
      isMounted = false;
    };
  }, []);

  // Cerrar menú de descarga al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuDescargaAbierto && !event.target.closest('[data-menu="descarga"]')) {
        setMenuDescargaAbierto(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuDescargaAbierto]);

  // Función para obtener nombres cortos de proyectos
  const getNombreCortoProyecto = (nombreCompleto) => {
    const mapeoNombres = {
      'Fortalecimiento de la política nacional de gestión del riesgo de desastres mediante la valoración del impacto de la implementación del PNGRD.': 'Fortalecimiento PNGRD',
      'Fortalecimiento de los procesos sociales de participación ciudadana, gestión de conocimientos y saberes y divulgación en el marco del sistema nacional de gestión del riesgo de desastre.': 'Participación Ciudadana - SNGRD',
      'Fortalecimiento financiero del FNGRD orientado al proceso de reasentamiento en el marco de acciones judiciales, relacionados con la ocurrencia de escenarios de riesgo. Murindó.': 'Fortalecimiento Financiero - FNGRD',
      // Variación sin "Murindó" para compatibilidad
      'Fortalecimiento financiero del FNGRD orientado al proceso de reasentamiento en el marco de acciones judiciales, relacionados con la ocurrencia de escenarios de riesgo.': 'Fortalecimiento Financiero - FNGRD'
    };
    
    // Primero buscar coincidencia exacta
    if (mapeoNombres[nombreCompleto]) {
      return mapeoNombres[nombreCompleto];
    }
    
    // Buscar coincidencias parciales con palabras clave más específicas
    const nombreLower = nombreCompleto ? nombreCompleto.toLowerCase() : '';
    
    if (nombreLower.includes('política nacional de gestión del riesgo') && nombreLower.includes('pngrd')) {
      return 'Fortalecimiento PNGRD';
    }
    if (nombreLower.includes('procesos sociales de participación ciudadana') && nombreLower.includes('sistema nacional')) {
      return 'Participación Ciudadana - SNGRD';
    }
    if (nombreLower.includes('fortalecimiento financiero del fngrd') && nombreLower.includes('reasentamiento')) {
      return 'Fortalecimiento Financiero - FNGRD';
    }
    
    // Fallback con nombres anteriores para compatibilidad
    if (nombreLower.includes('fortalecimiento financiero del fngrd')) {
      return 'Fortalecimiento Financiero - FNGRD';
    }
    if (nombreLower.includes('fortalecimiento de los procesos sociales')) {
      return 'Participación Ciudadana - SNGRD';
    }
    if (nombreLower.includes('fortalecimiento de la política nacional')) {
      return 'Fortalecimiento PNGRD';
    }
    
    return nombreCompleto || 'Proyecto';
  };

  // Función auxiliar para verificar si una fila de datos financieros pertenece a un proyecto
  const perteneceAlProyecto = (nombreProyecto, filaProyecto) => {
    // Primero intentar coincidencia exacta
    if (filaProyecto === nombreProyecto) {
      return true;
    }
    
    // Si no coincide exactamente, usar palabras clave específicas
    const proyectoLower = nombreProyecto ? nombreProyecto.toLowerCase() : '';
    const filaLower = filaProyecto ? filaProyecto.toLowerCase() : '';
    
    // Fortalecimiento financiero del FNGRD (con o sin Murindó)
    if (proyectoLower.includes('fortalecimiento financiero del fngrd') && 
        filaLower.includes('fortalecimiento financiero del fngrd')) {
      return true;
    }
    
    // Procesos sociales de participación ciudadana
    if (proyectoLower.includes('procesos sociales de participación ciudadana') && 
        filaLower.includes('procesos sociales de participación ciudadana')) {
      return true;
    }
    
    // Política nacional de gestión del riesgo
    if (proyectoLower.includes('política nacional de gestión del riesgo') && 
        filaLower.includes('política nacional de gestión del riesgo')) {
      return true;
    }
    
    return false;
  };

  // Colores específicos para cada proyecto (inspirados en Looker)
  const coloresProyectos = {
    'Fortalecimiento PNGRD': '#2B4C87',              // Azul oscuro
    'Participación Ciudadana - SNGRD': '#E6B800',    // Amarillo/Dorado
    'Fortalecimiento Financiero - FNGRD': '#5EAE5E'  // Verde
  };

  // Orden fijo para mostrar las tarjetas DE TOTALES (con "Total")
  const ordenTiposTotales = [
    'Apropiación Inicial Total',
    'Apropiación Vigente Total',
    'Apropiación Disponible Total',
    'Total CDP Expedidos',
    'Total Comprometido',
    'Total Obligación',
    'Total Orden de Pago'
  ];

  // Orden para los datos de la izquierda (sin "Total")
  const ordenTiposDatos = [
    'Apropiación Inicial',
    'Apropiación Vigente',
    'Apropiación Disponible',
    'CDP Expedidos',
    'Comprometido',
    'Obligación',
    'Orden de Pago'
  ];

  // Calcular totales para un mes específico (usa el filtro del gráfico)
  const totalesGeneralesEstaticos = (() => {
    // Filtrar por el mes del gráfico principal (mesSeleccionadoGrafico)
    let datosParaTotales = datosFinancieros.filter(fila => {
      const fecha = fila['Fecha Corte'] || fila['FECHA_CORTE'] || fila['fecha_corte'];
      if (fecha && mesSeleccionadoGrafico) {
        const fechaObj = new Date(fecha);
        return (fechaObj.getMonth() + 1).toString() === mesSeleccionadoGrafico;
      }
      return false;
    });
    
    // Los totales NO se filtran por proyecto, solo por mes del gráfico
    
    // Crear un mapa de todos los tipos disponibles con sus totales
    const tiposDisponibles = {};
    datosParaTotales.forEach(fila => {
      const tipo = fila['Tipo de Valor'] || fila['TIPO_VALOR'] || fila['tipo_valor'] || 'Sin tipo';
      const valor = parseFloat(fila['Valor'] || fila['VALOR'] || fila['valor'] || 0);
      
      if (!tiposDisponibles[tipo]) {
        tiposDisponibles[tipo] = 0;
      }
      tiposDisponibles[tipo] += valor;
    });


    // Devolver en el orden fijo, TODOS los elementos incluso si no tienen datos
    const result = ordenTiposTotales.map(tipoOrden => {
      // Buscar el tipo exacto o variaciones
      let tipoEncontrado = null;
      let total = 0;
      
      // Buscar coincidencia exacta primero
      if (tiposDisponibles[tipoOrden]) {
        tipoEncontrado = tipoOrden;
        total = tiposDisponibles[tipoOrden];
      } else {
        // Buscar variaciones del nombre con mayor flexibilidad
        for (const tipoDisponible in tiposDisponibles) {
          const tipoLower = tipoDisponible.toLowerCase().trim();
          const ordenLower = tipoOrden.toLowerCase().trim();
          if (comparaTipoValor(ordenLower, tipoLower)) {
            tipoEncontrado = tipoDisponible;
            total = tiposDisponibles[tipoDisponible];
            break;
          }
        }
      }
      
      // console.log(`Buscando: "${tipoOrden}" -> Encontrado: "${tipoEncontrado}" con valor: ${total}`);
      
      // SIEMPRE retornar el elemento, con el nombre encontrado (o del orden) y el total (puede ser 0)
      return {
        tipo: tipoEncontrado || tipoOrden, // Usar el nombre encontrado o el del orden
        tipoOrden: tipoOrden,
        total: total // Puede ser 0 si no se encontraron datos
      };
    }); // Mostrar TODOS los elementos del orden fijo, incluso con valor 0
    
    
    return result;
  })();

  // Datos filtrados para la sección de datos (usando el mismo filtro que el gráfico)
  const datosFiltradosDatos = datosFinancieros.filter(fila => {
    const fecha = fila['Fecha Corte'] || fila['FECHA_CORTE'] || fila['fecha_corte'];
    if (fecha && mesSeleccionadoGrafico) {
      const fechaObj = new Date(fecha);
      return (fechaObj.getMonth() + 1).toString() === mesSeleccionadoGrafico;
    }
    return false;
  });
  // Datos filtrados para el gráfico principal
  const datosFiltrados = datosFinancieros.filter(fila => {
    const fecha = fila['Fecha Corte'] || fila['FECHA_CORTE'] || fila['fecha_corte'];
    if (fecha && mesSeleccionadoGrafico) {
      const fechaObj = new Date(fecha);
      return (fechaObj.getMonth() + 1).toString() === mesSeleccionadoGrafico;
    }
    return false;
  });

  // Procesar datos por proyecto para la sección de datos (con filtros independientes)
  const proyectosUnicos = Array.from(new Set(proyectos.map(p => p['Proyecto'] || p['PROYECTO'] || p['proyecto'])))
    .filter(nombre => nombre && nombre.trim() !== '')
    .slice(0, 3);

  const datosPorProyectoDatos = proyectosUnicos.map((nombreProyecto, idx) => {
    const datosDeEsteProyecto = datosFiltradosDatos.filter(fila => {
      const filaProyecto = fila['Proyecto'] || fila['PROYECTO'] || fila['proyecto'];
      return perteneceAlProyecto(nombreProyecto, filaProyecto);
    });

    let datosParaCalcular = datosDeEsteProyecto;
    if (datosParaCalcular.length === 0) {
      const totalFilas = datosFiltradosDatos.length;
      const filasPorProyecto = Math.ceil(totalFilas / 3);
      const inicio = idx * filasPorProyecto;
      const fin = Math.min(inicio + filasPorProyecto, totalFilas);
      datosParaCalcular = datosFiltradosDatos.slice(inicio, fin);
    }

    const agrupadosPorTipo = datosParaCalcular.reduce((acc, fila) => {
      const tipo = fila['Tipo de Valor'] || fila['TIPO_VALOR'] || fila['tipo_valor'] || 'Sin tipo';
      if (!acc[tipo]) acc[tipo] = [];
      acc[tipo].push(fila);
      return acc;
    }, {});

    const totales = Object.keys(agrupadosPorTipo).map(tipo => {
      const filasPorTipo = agrupadosPorTipo[tipo];
      const total = filasPorTipo.reduce((sum, fila) => {
        const valor = parseFloat(fila['Valor'] || fila['VALOR'] || fila['valor'] || 0);
        return sum + valor;
      }, 0);
      
      const porcentajeHoja = filasPorTipo.length > 0 ? 
        parseFloat(filasPorTipo[0]['Porcentaje'] || filasPorTipo[0]['PORCENTAJE'] || filasPorTipo[0]['porcentaje'] || 0) : 0;
      
      return { tipo, total, porcentajeHoja };
    });

    const filaConBpin = datosParaCalcular.find(fila => fila['BPIN'] || fila['bpin']);
    const bpin = filaConBpin ? (filaConBpin['BPIN'] || filaConBpin['bpin']) : `BPIN-${idx + 1}`;

    return {
      nombre: nombreProyecto,
      nombreCorto: getNombreCortoProyecto(nombreProyecto),
      bpin: bpin,
      totales: totales
    };
  });

  // Datos filtrados para el gráfico principal (usando filtros independientes)
  const datosFiltradosGrafico = datosFinancieros.filter(fila => {
    const fecha = fila['Fecha Corte'] || fila['FECHA_CORTE'] || fila['fecha_corte'];
    if (fecha && mesSeleccionadoGrafico) {
      const fechaObj = new Date(fecha);
      return (fechaObj.getMonth() + 1).toString() === mesSeleccionadoGrafico;
    }
    return false;
  });

  // Procesar datos por proyecto para el gráfico principal (usando filtros independientes)
  const datosPorProyectoGrafico = proyectosUnicos.map((nombreProyecto, idx) => {
    // Buscar datos que coincidan exactamente O por palabra clave
    const datosDeEsteProyecto = datosFiltradosGrafico.filter(fila => {
      const filaProyecto = fila['Proyecto'] || fila['PROYECTO'] || fila['proyecto'];
      return perteneceAlProyecto(nombreProyecto, filaProyecto);
    });

    let datosParaCalcular = datosDeEsteProyecto;
    if (datosParaCalcular.length === 0) {
      const totalFilas = datosFiltradosGrafico.length;
      const filasPorProyecto = Math.ceil(totalFilas / 3);
      const inicio = idx * filasPorProyecto;
      const fin = Math.min(inicio + filasPorProyecto, totalFilas);
      datosParaCalcular = datosFiltradosGrafico.slice(inicio, fin);
    }

    const agrupadosPorTipo = datosParaCalcular.reduce((acc, fila) => {
      const tipo = fila['Tipo de Valor'] || fila['TIPO_VALOR'] || fila['tipo_valor'] || 'Sin tipo';
      if (!acc[tipo]) acc[tipo] = [];
      acc[tipo].push(fila);
      return acc;
    }, {});

    const totales = Object.keys(agrupadosPorTipo).map(tipo => {
      const filasPorTipo = agrupadosPorTipo[tipo];
      const total = filasPorTipo.reduce((sum, fila) => {
        const valor = parseFloat(fila['Valor'] || fila['VALOR'] || fila['valor'] || 0);
        return sum + valor;
      }, 0);
      
      const porcentajeHoja = filasPorTipo.length > 0 ? 
        parseFloat(filasPorTipo[0]['Porcentaje'] || filasPorTipo[0]['PORCENTAJE'] || filasPorTipo[0]['porcentaje'] || 0) : 0;
      
      return { tipo, total, porcentajeHoja };
    });

    const filaConBpin = datosParaCalcular.find(fila => fila['BPIN'] || fila['bpin']);
    const bpin = filaConBpin ? (filaConBpin['BPIN'] || filaConBpin['bpin']) : `BPIN-${idx + 1}`;

    const nombreCorto = getNombreCortoProyecto(nombreProyecto);

    return {
      nombre: nombreProyecto,
      nombreCorto: nombreCorto,
      bpin: bpin,
      totales: totales
    };
  });

  // Procesar datos por proyecto para el gráfico principal (mantener lógica original)
  const datosPorProyecto = proyectosUnicos.map((nombreProyecto, idx) => {
    const datosDeEsteProyecto = datosFiltrados.filter(fila => {
      const filaProyecto = fila['Proyecto'] || fila['PROYECTO'] || fila['proyecto'];
      return perteneceAlProyecto(nombreProyecto, filaProyecto);
    });

    let datosParaCalcular = datosDeEsteProyecto;
    if (datosParaCalcular.length === 0) {
      const totalFilas = datosFiltrados.length;
      const filasPorProyecto = Math.ceil(totalFilas / 3);
      const inicio = idx * filasPorProyecto;
      const fin = Math.min(inicio + filasPorProyecto, totalFilas);
      datosParaCalcular = datosFiltrados.slice(inicio, fin);
    }

    const agrupadosPorTipo = datosParaCalcular.reduce((acc, fila) => {
      const tipo = fila['Tipo de Valor'] || fila['TIPO_VALOR'] || fila['tipo_valor'] || 'Sin tipo';
      if (!acc[tipo]) acc[tipo] = [];
      acc[tipo].push(fila);
      return acc;
    }, {});

    const totales = Object.keys(agrupadosPorTipo).map(tipo => {
      const filasPorTipo = agrupadosPorTipo[tipo];
      const total = filasPorTipo.reduce((sum, fila) => {
        const valor = parseFloat(fila['Valor'] || fila['VALOR'] || fila['valor'] || 0);
        return sum + valor;
      }, 0);
      
      const porcentajeHoja = filasPorTipo.length > 0 ? 
        parseFloat(filasPorTipo[0]['Porcentaje'] || filasPorTipo[0]['PORCENTAJE'] || filasPorTipo[0]['porcentaje'] || 0) : 0;
      
      return { tipo, total, porcentajeHoja };
    });

    const filaConBpin = datosParaCalcular.find(fila => fila['BPIN'] || fila['bpin']);
    const bpin = filaConBpin ? (filaConBpin['BPIN'] || filaConBpin['bpin']) : `BPIN-${idx + 1}`;

    return {
      nombre: nombreProyecto,
      nombreCorto: getNombreCortoProyecto(nombreProyecto),
      bpin: bpin,
      totales: totales
    };
  });

  // Filtrar datos por proyecto seleccionado PARA GRÁFICO PRINCIPAL
  const datosFiltradosPorProyectoGrafico = proyectoSeleccionadoGrafico === 'todos' 
    ? datosPorProyectoGrafico 
    : datosPorProyectoGrafico.filter(p => p.nombreCorto === proyectoSeleccionadoGrafico);

  // Obtener lista de proyectos únicos para el filtro
  const proyectosDisponibles = [...new Set(datosPorProyectoGrafico.map(p => p.nombreCorto))];

  // Calcular totales consolidados PARA GRÁFICO PRINCIPAL
  const todosLosTiposGrafico = new Set();
  datosFiltradosPorProyectoGrafico.forEach(proyecto => {
    proyecto.totales.forEach(tipoTotal => {
      todosLosTiposGrafico.add(tipoTotal.tipo);
    });
  });

  const totalesConsolidadosGrafico = Array.from(todosLosTiposGrafico).map(tipo => {
    const totalGeneral = datosFiltradosPorProyectoGrafico.reduce((sum, proyecto) => {
      const tipoEnProyecto = proyecto.totales.find(t => t.tipo === tipo);
      return sum + (tipoEnProyecto ? tipoEnProyecto.total : 0);
    }, 0);

    // Obtener el porcentaje promedio
    const porcentajes = datosFiltradosPorProyectoGrafico.map(proyecto => {
      const tipoEnProyecto = proyecto.totales.find(t => t.tipo === tipo);
      return tipoEnProyecto ? tipoEnProyecto.porcentajeHoja : 0;
    }).filter(p => p > 0);
    
    const porcentajePromedio = porcentajes.length > 0 
      ? porcentajes.reduce((a, b) => a + b, 0) / porcentajes.length 
      : 0;

    return {
      tipo,
      total: totalGeneral,
      porcentaje: porcentajePromedio
    };
  });

  // Filtrar datos por proyecto seleccionado (versión simplificada)
  const datosFiltradosPorProyecto = proyectoSeleccionadoGrafico === 'todos' 
    ? datosPorProyecto 
    : datosPorProyecto.filter(p => p.nombreCorto === proyectoSeleccionadoGrafico);

  // Calcular totales consolidados (versión simplificada)
  const todosLosTipos = new Set();
  datosFiltradosPorProyecto.forEach(proyecto => {
    proyecto.totales.forEach(tipoTotal => {
      todosLosTipos.add(tipoTotal.tipo);
    });
  });

  const totalesConsolidados = Array.from(todosLosTipos).map(tipo => {
    const totalGeneral = datosFiltradosPorProyecto.reduce((sum, proyecto) => {
      const tipoEnProyecto = proyecto.totales.find(t => t.tipo === tipo);
      return sum + (tipoEnProyecto ? tipoEnProyecto.total : 0);
    }, 0);

    // Obtener el porcentaje promedio
    const porcentajes = datosFiltradosPorProyecto.map(proyecto => {
      const tipoEnProyecto = proyecto.totales.find(t => t.tipo === tipo);
      return tipoEnProyecto ? tipoEnProyecto.porcentajeHoja : 0;
    }).filter(p => p > 0);
    
    const porcentajePromedio = porcentajes.length > 0 
      ? porcentajes.reduce((a, b) => a + b, 0) / porcentajes.length 
      : 0;

    return {
      tipo,
      total: totalGeneral,
      porcentaje: porcentajePromedio
    };
  });

  // Configuración de colores e iconos SOLO para los totales de arriba (en el orden exacto)
  const tiposConfigTotales = {
    'Apropiación Inicial': { 
      color: '#2563eb', 
      bgColor: '#eff6ff', 
      icon: FaDollarSign 
    },
    'Apropiación Vigente': { 
      color: '#059669', 
      bgColor: '#ecfdf5', 
      icon: FaFileInvoiceDollar 
    },
    'Apropiación Disponible': { 
      color: '#dc2626', 
      bgColor: '#fef2f2', 
      icon: FaWallet 
    },
    'CDP Expedidos': { 
      color: '#7c3aed', 
      bgColor: '#f3e8ff', 
      icon: FaReceipt 
    },
    'Comprometido': { 
      color: '#ea580c', 
      bgColor: '#fff7ed', 
      icon: FaHandHoldingUsd 
    },
    'Obligación': { 
      color: '#0891b2', 
      bgColor: '#f0f9ff', 
      icon: FaMoneyBillWave 
    },
    'Orden de Pago': { 
      color: '#be185d', 
      bgColor: '#fdf2f8', 
      icon: FaCreditCard 
    },
    // Mantener compatibilidad con nombres anteriores
    'Apropiación Inicial Total': { 
      color: '#2563eb', 
      bgColor: '#eff6ff', 
      icon: FaDollarSign 
    },
    'Apropiación Vigente Total': { 
      color: '#059669', 
      bgColor: '#ecfdf5', 
      icon: FaFileInvoiceDollar 
    },
    'Apropiación Disponible Total': { 
      color: '#dc2626', 
      bgColor: '#fef2f2', 
      icon: FaWallet 
    },
    'Total CDP Expedidos': { 
      color: '#7c3aed', 
      bgColor: '#f3e8ff', 
      icon: FaReceipt 
    },
    'Total Comprometido': { 
      color: '#ea580c', 
      bgColor: '#fff7ed', 
      icon: FaHandHoldingUsd 
    },
    'Total Obligación': { 
      color: '#0891b2', 
      bgColor: '#f0f9ff', 
      icon: FaMoneyBillWave 
    },
    'Total Orden de Pago': { 
      color: '#be185d', 
      bgColor: '#fdf2f8', 
      icon: FaCreditCard 
    }
  };

  // Configuración para los datos de la izquierda (diferentes iconos y colores neutros)
  const tiposConfigDatos = {
    'Apropiación Inicial Total': { 
      color: '#4b5563', 
      bgColor: '#f9fafb', 
      icon: FaDollarSign 
    },
    'Apropiación Vigente': { 
      color: '#6b7280', 
      bgColor: '#f3f4f6', 
      icon: FaFileInvoiceDollar 
    },
    'Total CDP Expedidos': { 
      color: '#374151', 
      bgColor: '#f9fafb', 
      icon: FaReceipt 
    },
    'Total Comprometido': { 
      color: '#1f2937', 
      bgColor: '#f3f4f6', 
      icon: FaHandHoldingUsd 
    },
    'Total Obligación': { 
      color: '#111827', 
      bgColor: '#f9fafb', 
      icon: FaMoneyBillWave 
    },
    'Total Orden de Pago': { 
      color: '#0f172a', 
      bgColor: '#f1f5f9', 
      icon: FaCreditCard 
    },
    'Apropiación Disponible': { 
      color: '#64748b', 
      bgColor: '#f8fafc', 
      icon: FaWallet 
    }
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  const getNombreMes = (numeroMes) => {
    const meses = [
      'ene', 'feb', 'mar', 'abr', 'may', 'jun',
      'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
    ];
    return meses[numeroMes - 1] || `mes ${numeroMes}`;
  };

  // Función para obtener la configuración de colores por tipo PARA TOTALES
  const getTipoConfigTotales = (tipoNombre, tipoOrden = null) => {
    // Si tenemos tipoOrden, usarlo primero
    if (tipoOrden && tiposConfigTotales[tipoOrden]) {
      return tiposConfigTotales[tipoOrden];
    }
    
    // Primero intentar coincidencia exacta
    if (tiposConfigTotales[tipoNombre]) {
      return tiposConfigTotales[tipoNombre];
    }
    
    // Luego buscar coincidencias parciales
    const tipoLower = tipoNombre.toLowerCase();
    
    if (tipoLower.includes('apropiación inicial')) {
      return tiposConfigTotales['Apropiación Inicial Total'];
    }
    if (tipoLower.includes('apropiación vigente') && !tipoLower.includes('disponible')) {
      return tiposConfigTotales['Apropiación Vigente'] || tiposConfigTotales['Apropiación Vigente Total'];
    }
    if (tipoLower.includes('disponible')) {
      return tiposConfigTotales['Apropiación Disponible'] || tiposConfigTotales['Apropiación Disponible Total'];
    }
    if (tipoLower.includes('cdp')) {
      return tiposConfigTotales['Total CDP Expedidos'];
    }
    if (tipoLower.includes('comprometido')) {
      return tiposConfigTotales['Total Comprometido'];
    }
    if (tipoLower.includes('obligación')) {
      return tiposConfigTotales['Total Obligación'];
    }
    if (tipoLower.includes('orden de pago')) {
      return tiposConfigTotales['Total Orden de Pago'];
    }
    
    // Configuración por defecto
    return { 
      color: '#6b7280', 
      bgColor: '#f3f4f6', 
      icon: FaDollarSign 
    };
  };

  // Función para obtener la configuración de colores por tipo PARA DATOS DE LA IZQUIERDA
  const getTipoConfigDatos = (tipoNombre) => {
    // Primero intentar coincidencia exacta
    if (tiposConfigDatos[tipoNombre]) {
      return tiposConfigDatos[tipoNombre];
    }
    
    // Luego buscar coincidencias parciales
    const tipoLower = tipoNombre.toLowerCase();
    
    if (tipoLower.includes('apropiación inicial')) {
      return tiposConfigDatos['Apropiación Inicial Total'];
    }
    if (tipoLower.includes('apropiación vigente')) {
      return tiposConfigDatos['Apropiación Vigente'];
    }
    if (tipoLower.includes('cdp')) {
      return tiposConfigDatos['Total CDP Expedidos'];
    }
    if (tipoLower.includes('comprometido')) {
      return tiposConfigDatos['Total Comprometido'];
    }
    if (tipoLower.includes('obligación')) {
      return tiposConfigDatos['Total Obligación'];
    }
    if (tipoLower.includes('orden de pago')) {
      return tiposConfigDatos['Total Orden de Pago'];
    }
    if (tipoLower.includes('disponible')) {
      return tiposConfigDatos['Apropiación Disponible'];
    }
    
    // Configuración por defecto
    return { 
      color: '#6b7280', 
      bgColor: '#f3f4f6', 
      icon: FaDollarSign 
    };
  };

  // Función para descargar diferentes secciones del dashboard
  const descargarSeccion = async (tipoDescarga) => {
    try {
      // Importación dinámica para evitar problemas en el build
      const html2canvas = (await import('html2canvas')).default;
      
      let elemento = null;
      let nombreArchivo = '';
      
      switch (tipoDescarga) {
        case 'dashboard-completo':
          elemento = dashboardRef.current;
          nombreArchivo = `dashboard-completo-${getNombreMes(parseInt(mesSeleccionadoGrafico))}-${añoSeleccionado}`;
          if (proyectoSeleccionadoGrafico !== 'todos') {
            nombreArchivo += `-${proyectoSeleccionadoGrafico.replace(/\s+/g, '-')}`;
          }
          break;
          
        case 'totales-generales':
          // Buscar el contenedor de totales generales
          const totalesContainer = document.querySelector('[data-section="totales-generales"]');
          elemento = totalesContainer;
          nombreArchivo = `totales-generales-${getNombreMes(parseInt(mesSeleccionadoGrafico))}-${añoSeleccionado}`;
          break;
          
        case 'seccion-datos-grafico':
          // Buscar el contenedor de datos y gráfico
          const datosGraficoContainer = document.querySelector('[data-section="datos-grafico"]');
          elemento = datosGraficoContainer;
          nombreArchivo = `analisis-proyectos-${getNombreMes(parseInt(mesSeleccionadoGrafico))}-${añoSeleccionado}`;
          if (proyectoSeleccionadoGrafico !== 'todos') {
            nombreArchivo += `-${proyectoSeleccionadoGrafico.replace(/\s+/g, '-')}`;
          }
          break;
          
        case 'comparacion-meses':
          // Buscar el contenedor de comparación mensual
          const comparacionContainer = document.querySelector('[data-section="comparacion-meses"]');
          elemento = comparacionContainer;
          nombreArchivo = `comparacion-meses`;
          if (mes1Comparacion && mes2Comparacion) {
            nombreArchivo += `-${getNombreMes(parseInt(mes1Comparacion))}-vs-${getNombreMes(parseInt(mes2Comparacion))}-${añoSeleccionado}`;
          }
          if (proyectoSeleccionadoComparacion !== 'todos') {
            nombreArchivo += `-${proyectoSeleccionadoComparacion.replace(/\s+/g, '-')}`;
          }
          break;
          
        case 'graficos-comparacion':
          // Buscar solo los gráficos de comparación
          const graficosContainer = document.querySelector('[data-section="graficos-comparacion"]');
          elemento = graficosContainer;
          nombreArchivo = `graficos-comparacion`;
          if (mes1Comparacion && mes2Comparacion) {
            nombreArchivo += `-${getNombreMes(parseInt(mes1Comparacion))}-vs-${getNombreMes(parseInt(mes2Comparacion))}-${añoSeleccionado}`;
          }
          if (proyectoSeleccionadoComparacion !== 'todos') {
            nombreArchivo += `-${proyectoSeleccionadoComparacion.replace(/\s+/g, '-')}`;
          }
          break;
          
        case 'tabla-comparativa':
          // Buscar solo la tabla comparativa
          const tablaContainer = document.querySelector('[data-section="tabla-comparativa"]');
          elemento = tablaContainer;
          nombreArchivo = `tabla-comparativa`;
          if (mes1Comparacion && mes2Comparacion) {
            nombreArchivo += `-${getNombreMes(parseInt(mes1Comparacion))}-vs-${getNombreMes(parseInt(mes2Comparacion))}-${añoSeleccionado}`;
          }
          if (proyectoSeleccionadoComparacion !== 'todos') {
            nombreArchivo += `-${proyectoSeleccionadoComparacion.replace(/\s+/g, '-')}`;
          }
          break;
          
        default:
          elemento = dashboardRef.current;
          nombreArchivo = `dashboard-${tipoDescarga}`;
      }
      
      if (elemento) {
        const canvas = await html2canvas(elemento, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#f8fafc',
          scrollX: 0,
          scrollY: 0,
          width: elemento.scrollWidth,
          height: elemento.scrollHeight
        });
        
        const link = document.createElement('a');
        link.download = `${nombreArchivo}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
        
        // Cerrar el menú después de descargar
        setMenuDescargaAbierto(false);
      }
    } catch (error) {
      console.error('Error al descargar:', error);
      alert('Error al descargar la imagen. Por favor, intenta de nuevo.');
    }
  };

  // Función para descargar el dashboard completo (mantenemos la original para compatibilidad)
  const descargarDashboard = async () => {
    await descargarSeccion('dashboard-completo');
  };

  // Crear gráfico de barras
  useEffect(() => {
    if (datosFiltradosPorProyectoGrafico.length > 0 && chartRef.current) {
      const ctx = chartRef.current.getContext('2d');
      
      // Destruir gráfico anterior si existe
      if (chartRef.current.chart) {
        chartRef.current.chart.destroy();
      }

      let datasets = [];
      let labels = [];

      if (vistaComparativa) {
        // Vista comparativa eliminada - ahora manejada en sección separada
        labels = datosFiltradosPorProyectoGrafico.map(p => p.nombreCorto);
        datasets = [];
      } else {
        // Vista normal - EJE X: Proyectos, LEYENDA: Tipos de valores
        labels = datosFiltradosPorProyectoGrafico.map(p => p.nombreCorto);
        
        // Crear un dataset por cada tipo de valor ordenado según ordenTiposDatos (sin "Total")
        datasets = ordenTiposDatos.map(tipoOrden => {
          // Buscar el tipo correspondiente en los datos
          let tipoEncontrado = null;
          for (const tipo of todosLosTiposGrafico) {
            const tipoLower = tipo.toLowerCase();
            const ordenLower = tipoOrden.toLowerCase();
            
            if ((ordenLower.includes('inicial') && tipoLower.includes('inicial')) ||
                (ordenLower.includes('vigente') && tipoLower.includes('vigente') && !tipoLower.includes('disponible')) ||
                (ordenLower.includes('disponible') && tipoLower.includes('disponible')) ||
                (ordenLower.includes('cdp') && tipoLower.includes('cdp')) ||
                (ordenLower.includes('comprometido') && tipoLower.includes('comprometido')) ||
                (ordenLower.includes('obligación') && (tipoLower.includes('obligación') || tipoLower.includes('obligacion'))) ||
                (ordenLower.includes('orden') && tipoLower.includes('orden'))) {
              tipoEncontrado = tipo;
              break;
            }
          }
          
          if (!tipoEncontrado) return null;
          
          const config = getTipoConfigTotales(tipoEncontrado, tipoOrden);
          
          const data = datosFiltradosPorProyectoGrafico.map(proyecto => {
            const tipoData = proyecto.totales.find(t => t.tipo === tipoEncontrado);
            return tipoData ? tipoData.total / 1000000 : 0; // Convertir a millones
          });

          return {
            label: tipoOrden,
            data: data,
            backgroundColor: config.color + '80',
            borderColor: config.color,
            borderWidth: 2
          };
        }).filter(dataset => dataset && dataset.data.some(value => value > 0));
        
        // Ordenar proyectos por valor total descendente
        const proyectosConTotal = labels.map((label, index) => {
          const totalProyecto = datasets.reduce((sum, dataset) => sum + (dataset.data[index] || 0), 0);
          return { label, index, total: totalProyecto };
        }).sort((a, b) => b.total - a.total);
        
        // Reordenar labels y datos
        labels = proyectosConTotal.map(p => p.label);
        datasets.forEach(dataset => {
          const newData = proyectosConTotal.map(p => dataset.data[p.index]);
          dataset.data = newData;
        });
      }

      const chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                usePointStyle: true,
                padding: 20,
                font: {
                  size: 12,
                  weight: '600'
                }
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `${context.dataset.label}: ${formatNumber(context.parsed.y * 1000000)}`;
                }
              }
            },
            datalabels: {
              display: true,
              anchor: 'end',
              align: 'top',
              formatter: function(value, context) {
                if (value > 0) {
                  return (value).toFixed(0) + 'M';
                }
                return '';
              },
              font: {
                size: 10,
                weight: 'bold'
              },
              color: function(context) {
                return context.dataset.borderColor;
              }
            }
          },
          scales: {
            x: {
              display: true,
              ticks: {
                maxRotation: 45,
                minRotation: 45,
                font: {
                  size: 10
                }
              }
            },
            y: {
              beginAtZero: true,
              suggestedMax: function(context) {
                const maxValue = Math.max(...context.chart.data.datasets.flatMap(d => d.data));
                return maxValue * 1.2; // Agregar 20% de espacio arriba
              },
              ticks: {
                callback: function(value) {
                  return '$' + value.toLocaleString() + 'M';
                }
              }
            }
          },
          layout: {
            padding: {
              top: 30 // Espacio para los labels de arriba
            }
          }
        }
      });

      chartRef.current.chart = chart;
    }
  }, [datosFiltradosPorProyectoGrafico, totalesConsolidadosGrafico, vistaComparativa, mesesDisponibles, añoSeleccionado]);

  // Crear gráfico de comparación para Mes 1
  useEffect(() => {
    if (mes1Comparacion && chartMes1Ref.current && datosFinancieros.length > 0) {
      const ctx = chartMes1Ref.current.getContext('2d');
      
      // Destruir gráfico anterior si existe
      if (chartMes1Ref.current.chart) {
        chartMes1Ref.current.chart.destroy();
      }

      // Filtrar datos por mes 1
      const datosMes1 = datosFinancieros.filter(fila => {
        const fecha = fila['Fecha Corte'] || fila['FECHA_CORTE'] || fila['fecha_corte'];
        if (fecha) {
          const fechaObj = new Date(fecha);
          return (fechaObj.getMonth() + 1).toString() === mes1Comparacion;
        }
        return false;
      });

      // Aplicar filtro de proyecto si no es "todos"
      let datosFiltradosMes1 = datosMes1;
      if (proyectoSeleccionadoComparacion !== 'todos') {
        const proyectoCompleto = proyectosUnicos.find(nombreCompleto => {
          const nombreCorto = getNombreCortoProyecto(nombreCompleto);
          return nombreCorto === proyectoSeleccionadoComparacion;
        });
        
        if (proyectoCompleto) {
          datosFiltradosMes1 = datosMes1.filter(fila => {
            const filaProyecto = fila['Proyecto'] || fila['PROYECTO'] || fila['proyecto'];
            return perteneceAlProyecto(proyectoCompleto, filaProyecto);
          });
        }
      }

      // Procesar datos por tipo
      const tiposDisponibles = {};
      datosFiltradosMes1.forEach(fila => {
        const tipo = fila['Tipo de Valor'] || fila['TIPO_VALOR'] || fila['tipo_valor'] || 'Sin tipo';
        const valor = parseFloat(fila['Valor'] || fila['VALOR'] || fila['valor'] || 0);
        
        if (!tiposDisponibles[tipo]) {
          tiposDisponibles[tipo] = 0;
        }
        tiposDisponibles[tipo] += valor;
      });

      // Crear datos del gráfico usando el orden fijo
      const labels = [];
      const data = [];
      const backgroundColor = [];
      const borderColor = [];

      ordenTiposDatos.forEach(tipoOrden => {
        // Buscar coincidencia del tipo
        let tipoEncontrado = null;
        let total = 0;
        
        for (const tipoDisponible in tiposDisponibles) {
          const tipoLower = tipoDisponible.toLowerCase();
          const ordenLower = tipoOrden.toLowerCase();
          
          if ((ordenLower.includes('inicial') && tipoLower.includes('inicial')) ||
              (ordenLower.includes('vigente') && tipoLower.includes('vigente') && !tipoLower.includes('disponible')) ||
              (ordenLower.includes('disponible') && tipoLower.includes('disponible')) ||
              (ordenLower.includes('cdp') && tipoLower.includes('cdp')) ||
              (ordenLower.includes('comprometido') && tipoLower.includes('comprometido')) ||
              (ordenLower.includes('obligación') && (tipoLower.includes('obligación') || tipoLower.includes('obligacion'))) ||
              (ordenLower.includes('orden') && tipoLower.includes('orden'))) {
            tipoEncontrado = tipoDisponible;
            total = tiposDisponibles[tipoDisponible];
            break;
          }
        }
        
        if (total > 0) {
          const config = getTipoConfigTotales(tipoEncontrado, tipoOrden);
          labels.push(tipoOrden);
          data.push(total / 1000000); // Convertir a millones
          backgroundColor.push(config.color + '80');
          borderColor.push(config.color);
        }
      });

      const chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: `${getNombreMes(parseInt(mes1Comparacion))} ${añoSeleccionado}`,
            data: data,
            backgroundColor: backgroundColor,
            borderColor: borderColor,
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `${context.label}: ${formatNumber(context.parsed.y * 1000000)}`;
                }
              }
            },
            datalabels: {
              display: true,
              anchor: 'end',
              align: 'top',
              formatter: function(value, context) {
                if (value > 0) {
                  return (value).toFixed(0) + 'M';
                }
                return '';
              },
              font: {
                size: 9,
                weight: 'bold'
              },
              color: function(context) {
                return context.dataset.borderColor[context.dataIndex];
              }
            }
          },
          scales: {
            x: {
              display: true,
              ticks: {
                maxRotation: 45,
                minRotation: 45,
                font: {
                  size: 9
                }
              }
            },
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return '$' + value.toLocaleString() + 'M';
                }
              }
            }
          },
          layout: {
            padding: {
              top: 20
            }
          }
        }
      });

      chartMes1Ref.current.chart = chart;
    }
  }, [mes1Comparacion, proyectoSeleccionadoComparacion, datosFinancieros, añoSeleccionado]);

  // Crear gráfico de comparación para Mes 2
  useEffect(() => {
    if (mes2Comparacion && chartMes2Ref.current && datosFinancieros.length > 0) {
      const ctx = chartMes2Ref.current.getContext('2d');
      
      // Destruir gráfico anterior si existe
      if (chartMes2Ref.current.chart) {
        chartMes2Ref.current.chart.destroy();
      }

      // Filtrar datos por mes 2
      const datosMes2 = datosFinancieros.filter(fila => {
        const fecha = fila['Fecha Corte'] || fila['FECHA_CORTE'] || fila['fecha_corte'];
        if (fecha) {
          const fechaObj = new Date(fecha);
          return (fechaObj.getMonth() + 1).toString() === mes2Comparacion;
        }
        return false;
      });

      // Aplicar filtro de proyecto si no es "todos"
      let datosFiltradosMes2 = datosMes2;
      if (proyectoSeleccionadoComparacion !== 'todos') {
        const proyectoCompleto = proyectosUnicos.find(nombreCompleto => {
          const nombreCorto = getNombreCortoProyecto(nombreCompleto);
          return nombreCorto === proyectoSeleccionadoComparacion;
        });
        
        if (proyectoCompleto) {
          datosFiltradosMes2 = datosMes2.filter(fila => {
            const filaProyecto = fila['Proyecto'] || fila['PROYECTO'] || fila['proyecto'];
            return perteneceAlProyecto(proyectoCompleto, filaProyecto);
          });
        }
      }

      // Procesar datos por tipo
      const tiposDisponibles = {};
      datosFiltradosMes2.forEach(fila => {
        const tipo = fila['Tipo de Valor'] || fila['TIPO_VALOR'] || fila['tipo_valor'] || 'Sin tipo';
        const valor = parseFloat(fila['Valor'] || fila['VALOR'] || fila['valor'] || 0);
        
        if (!tiposDisponibles[tipo]) {
          tiposDisponibles[tipo] = 0;
        }
        tiposDisponibles[tipo] += valor;
      });

      // Crear datos del gráfico usando el orden fijo
      const labels = [];
      const data = [];
      const backgroundColor = [];
      const borderColor = [];

      ordenTiposDatos.forEach(tipoOrden => {
        // Buscar coincidencia del tipo
        let tipoEncontrado = null;
        let total = 0;
        
        for (const tipoDisponible in tiposDisponibles) {
          const tipoLower = tipoDisponible.toLowerCase();
          const ordenLower = tipoOrden.toLowerCase();
          
          if ((ordenLower.includes('inicial') && tipoLower.includes('inicial')) ||
              (ordenLower.includes('vigente') && tipoLower.includes('vigente') && !tipoLower.includes('disponible')) ||
              (ordenLower.includes('disponible') && tipoLower.includes('disponible')) ||
              (ordenLower.includes('cdp') && tipoLower.includes('cdp')) ||
              (ordenLower.includes('comprometido') && tipoLower.includes('comprometido')) ||
              (ordenLower.includes('obligación') && (tipoLower.includes('obligación') || tipoLower.includes('obligacion'))) ||
              (ordenLower.includes('orden') && tipoLower.includes('orden'))) {
            tipoEncontrado = tipoDisponible;
            total = tiposDisponibles[tipoDisponible];
            break;
          }
        }
        
        if (total > 0) {
          const config = getTipoConfigTotales(tipoEncontrado, tipoOrden);
          labels.push(tipoOrden);
          data.push(total / 1000000); // Convertir a millones
          backgroundColor.push(config.color + '80');
          borderColor.push(config.color);
        }
      });

      const chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: `${getNombreMes(parseInt(mes2Comparacion))} ${añoSeleccionado}`,
            data: data,
            backgroundColor: backgroundColor,
            borderColor: borderColor,
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `${context.label}: ${formatNumber(context.parsed.y * 1000000)}`;
                }
              }
            },
            datalabels: {
              display: true,
              anchor: 'end',
              align: 'top',
              formatter: function(value, context) {
                if (value > 0) {
                  return (value).toFixed(0) + 'M';
                }
                return '';
              },
              font: {
                size: 9,
                weight: 'bold'
              },
              color: function(context) {
                return context.dataset.borderColor[context.dataIndex];
              }
            }
          },
          scales: {
            x: {
              display: true,
              ticks: {
                maxRotation: 45,
                minRotation: 45,
                font: {
                  size: 9
                }
              }
            },
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return '$' + value.toLocaleString() + 'M';
                }
              }
            }
          },
          layout: {
            padding: {
              top: 20
            }
          }
        }
      });

      chartMes2Ref.current.chart = chart;
    }
  }, [mes2Comparacion, proyectoSeleccionadoComparacion, datosFinancieros, añoSeleccionado]);

  // Crear gráfico comparativo por meses
  useEffect(() => {
    if (vistaComparativa && chartComparativoRef.current && mesesDisponibles.length > 0) {
      const ctx = chartComparativoRef.current.getContext('2d');
      
      // Destruir gráfico anterior si existe
      if (chartComparativoRef.current.chart) {
        chartComparativoRef.current.chart.destroy();
      }

      // Vista comparativa por meses - EJE X: Tipos de valores, LEYENDA: Meses
      const labels = Array.from(todosLosTipos);
      const datasets = mesesDisponibles.map((mes, mesIdx) => {
        // Filtrar datos por año y mes
        const datosMes = datosFinancieros.filter(fila => {
          const fecha = fila['Fecha Corte'] || fila['FECHA_CORTE'] || fila['fecha_corte'];
          if (fecha) {
            const fechaObj = new Date(fecha);
            return (fechaObj.getMonth() + 1) === mes && fechaObj.getFullYear().toString() === añoSeleccionado;
          }
          return false;
        });

        // Aplicar filtro de proyecto si no es "todos"
        let datosFiltradosMes = datosMes;
        if (proyectoSeleccionadoGrafico !== 'todos') {
          const proyectoCompleto = datosPorProyecto.find(p => p.nombreCorto === proyectoSeleccionadoGrafico);
          if (proyectoCompleto) {
            datosFiltradosMes = datosMes.filter(fila => {
              const filaProyecto = fila['Proyecto'] || fila['PROYECTO'] || fila['proyecto'];
              return filaProyecto === proyectoCompleto.nombre;
            });
          }
        }

        // Procesar datos por tipo para este mes
        const totalesPorTipo = Array.from(todosLosTipos).map(tipo => {
          const filasDelTipo = datosFiltradosMes.filter(fila => {
            const tipoFila = fila['Tipo de Valor'] || fila['TIPO_VALOR'] || fila['tipo_valor'];
            return tipoFila === tipo;
          });
          
          const total = filasDelTipo.reduce((sum, fila) => {
            const valor = parseFloat(fila['Valor'] || fila['VALOR'] || fila['valor'] || 0);
            return sum + valor;
          }, 0);
          
          return total / 1000000; // Convertir a millones
        });

        // Colores diferentes para cada mes
        const coloresMeses = [
          '#1d3557', '#457b9d', '#a8dadc', '#2a9d8f', 
          '#e9c46a', '#f4a261', '#e76f51', '#8b5cf6',
          '#6366f1', '#8b5a2b', '#059669', '#dc2626'
        ];
        
        const colorMes = coloresMeses[mesIdx % coloresMeses.length];
        
        return {
          label: `${getNombreMes(mes).toUpperCase()} ${añoSeleccionado}`,
          data: totalesPorTipo,
          backgroundColor: colorMes + '80',
          borderColor: colorMes,
          borderWidth: 2
        };
      });

      const chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                usePointStyle: true,
                padding: 20,
                font: {
                  size: 12,
                  weight: '600'
                }
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `${context.dataset.label}: ${formatNumber(context.parsed.y * 1000000)}`;
                }
              }
            },
            datalabels: {
              display: true,
              anchor: 'end',
              align: 'top',
              formatter: function(value, context) {
                if (value > 0) {
                  return (value).toFixed(0) + 'M';
                }
                return '';
              },
              font: {
                size: 9,
                weight: 'bold'
              },
              color: function(context) {
                return context.dataset.borderColor;
              }
            }
          },
          scales: {
            x: {
              display: true,
              ticks: {
                maxRotation: 45,
                minRotation: 45,
                font: {
                  size: 10
                }
              }
            },
            y: {
              beginAtZero: true,
              suggestedMax: function(context) {
                const maxValue = Math.max(...context.chart.data.datasets.flatMap(d => d.data));
                return maxValue * 1.2; // Agregar 20% de espacio arriba
              },
              ticks: {
                callback: function(value) {
                  return '$' + value.toLocaleString() + 'M';
                }
              }
            }
          },
          layout: {
            padding: {
              top: 30 // Espacio para los labels de arriba
            }
          }
        }
      });

      chartComparativoRef.current.chart = chart;
    }
  }, [vistaComparativa, mesesDisponibles, añoSeleccionado, proyectoSeleccionadoGrafico, datosFinancieros, todosLosTipos, datosPorProyecto]);

  if (loading) return <LoadingIndicator />;
  if (error) return (
    <div className="p-6 text-red-600">Error cargando datos: {error}</div>
  );

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', 
      padding: '24px' 
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ 
          background: 'white', 
          borderRadius: '12px', 
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)', 
          padding: '24px', 
          marginBottom: '24px', 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative'
        }}>
          {/* Logo UNGRD */}
          <div style={{
            position: 'absolute',
            top: '0px',
            left: '24px',
            zIndex: 10
          }}>
            <img 
              src="/logo-ungrd.svg" 
              alt="Logo UNGRD" 
              style={{
                height: '120px',
                width: 'auto',
                filter: 'drop-shadow(0 4px 15px rgba(0,0,0,0.3)) drop-shadow(0 2px 8px rgba(0,0,0,0.2))',
                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                animation: 'logoFloat 6s ease-in-out infinite'
              }}
            />
          </div>
          <div style={{ marginLeft: '140px' }}>
            <h1 style={{ 
              fontSize: '2rem', 
              fontWeight: 'bold', 
              margin: '0 0 8px 0', 
              color: '#1e293b' 
            }}>
              Dashboard Gráficas
            </h1>
            <p style={{ 
              fontSize: '1rem', 
              margin: 0, 
              color: '#64748b' 
            }}>
              Visualización y análisis gráfico 2023-2026
              {proyectoSeleccionadoGrafico !== 'todos' && ` - ${proyectoSeleccionadoGrafico}`}
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>

            {/* Botón de descarga con menú desplegable */}
            <div style={{ position: 'relative' }} data-menu="descarga">
              <button
                onClick={() => setMenuDescargaAbierto(!menuDescargaAbierto)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
              >
                <FaDownload />
                Descargar
                <span style={{ 
                  marginLeft: '4px', 
                  transform: menuDescargaAbierto ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease'
                }}>
                  v
                </span>
              </button>
              
              {/* Menú desplegable */}
              {menuDescargaAbierto && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                  zIndex: 1000,
                  minWidth: '250px',
                  marginTop: '4px'
                }}>
                  <div style={{ padding: '8px 0' }}>
                    
                    {/* Dashboard completo */}
                    <button
                      onClick={() => descargarSeccion('dashboard-completo')}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 16px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: '#374151',
                        borderBottom: '1px solid #f3f4f6'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      <strong>Dashboard Completo</strong>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                        Toda la información en una imagen
                      </div>
                    </button>
                    
                    {/* Totales generales */}
                    <button
                      onClick={() => descargarSeccion('totales-generales')}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 16px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: '#374151',
                        borderBottom: '1px solid #f3f4f6'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      <strong>Totales Generales</strong>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                        Solo las tarjetas de totales financieros
                      </div>
                    </button>
                    
                    {/* Análisis por proyecto */}
                    <button
                      onClick={() => descargarSeccion('seccion-datos-grafico')}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 16px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: '#374151',
                        borderBottom: '1px solid #f3f4f6'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      <strong>Analisis por Proyecto</strong>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                        Datos + grafico principal con filtros aplicados
                      </div>
                    </button>
                    
                    {/* Comparación completa */}
                    <button
                      onClick={() => descargarSeccion('comparacion-meses')}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 16px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: '#374151',
                        borderBottom: '1px solid #f3f4f6'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      <strong>Comparacion entre Meses</strong>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                        Toda la seccion de comparacion mensual
                      </div>
                    </button>
                    
                    {/* Solo gráficos de comparación */}
                    <button
                      onClick={() => descargarSeccion('graficos-comparacion')}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 16px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: '#374151',
                        borderBottom: '1px solid #f3f4f6'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      <strong>Solo Graficos de Comparacion</strong>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                        Los dos graficos lado a lado
                      </div>
                    </button>
                    
                    {/* Solo tabla comparativa */}
                    <button
                      onClick={() => descargarSeccion('tabla-comparativa')}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 16px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: '#374151'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      <strong>Solo Tabla Comparativa</strong>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                        Unicamente los datos tabulares
                      </div>
                    </button>
                    
                  </div>
                </div>
              )}
            </div>

            {/* Botón volver */}
            <Link 
              to="/" 
              style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#374151', 
                textDecoration: 'none', 
                padding: '8px 16px', 
                background: '#f1f5f9', 
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                transition: 'all 0.3s ease'
              }}
            >
              <FaArrowLeft />
              Volver
            </Link>
          </div>
        </div>

        {/* Dashboard Content */}
        <div ref={dashboardRef} style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
          
          {/* Header para Totales con Filtro de Mes */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '16px',
            paddingBottom: '16px',
            borderBottom: '2px solid #e2e8f0'
          }}>
            <div>
              <h2 style={{ 
                fontSize: '1.5rem', 
                fontWeight: 'bold', 
                margin: 0, 
                color: '#1e293b' 
              }}>
                Totales Financieros
              </h2>
            </div>
          </div>

          {/* Tarjetas de totales generales estáticos - Una sola fila */}
          <div 
            data-section="totales-generales"
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
              gap: '12px', 
              marginBottom: '32px' 
            }}
          >
            {totalesGeneralesEstaticos.map((total, idx) => {
              const config = getTipoConfigTotales(total.tipo, total.tipoOrden);
              const IconComponent = config.icon;
              
              return (
                <div 
                  key={`${total.tipoOrden || total.tipo}-${idx}`}
                  style={{
                    background: config.bgColor,
                    border: `2px solid ${config.color}`,
                    borderRadius: '12px',
                    padding: '16px',
                    position: 'relative',
                    overflow: 'hidden',
                    textAlign: 'center'
                  }}
                >
                  {/* Ícono */}
                  <div style={{
                    color: config.color,
                    fontSize: '24px',
                    marginBottom: '8px',
                    display: 'flex',
                    justifyContent: 'center'
                  }}>
                    <IconComponent />
                  </div>

                  {/* Título */}
                  <h3 style={{
                    fontSize: '10px',
                    fontWeight: '600',
                    color: config.color,
                    margin: '0 0 8px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    lineHeight: '1.2'
                  }}>
                    {total.tipoOrden || total.tipo}
                  </h3>

                  {/* Valor */}
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: '#1e293b'
                  }}>
                    {formatNumber(total.total)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sección de datos */}
          <div 
            data-section="datos-grafico"
            style={{ 
              display: 'grid', 
              gridTemplateColumns: '300px 1fr', 
              gap: '24px', 
              marginBottom: '32px' 
            }}
          >
            
            {/* Panel izquierdo - Datos */}
            <div style={{
              background: '#f8fafc',
              borderRadius: '12px',
              padding: '20px'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#1e293b',
                marginBottom: '16px',
                textAlign: 'center',
                padding: '12px',
                background: 'white',
                borderRadius: '8px'
              }}>
                Datos
              </h3>

              {/* Tarjetas de datos consolidados ordenadas - Simplificado para mostrar totales del mes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {ordenTiposDatos.map((tipoOrden, idx) => { 
                  // Filtrar datos por mes del gráfico principal
                  const datosMes = datosFinancieros.filter(fila => {
                    const fecha = fila['Fecha Corte'] || fila['FECHA_CORTE'] || fila['fecha_corte'];
                    if (fecha && mesSeleccionadoGrafico) {
                      const fechaObj = new Date(fecha);
                      return (fechaObj.getMonth() + 1).toString() === mesSeleccionadoGrafico;
                    }
                    return false;
                  });

                  // Si hay filtro de proyecto aplicado, filtrar también por proyecto
                  let datosFiltrados = datosMes;
                  if (proyectoSeleccionadoGrafico !== 'todos') {
                    // Buscar el nombre completo del proyecto seleccionado
                    const proyectoCompleto = proyectosUnicos.find(nombreCompleto => {
                      const nombreCorto = getNombreCortoProyecto(nombreCompleto);
                      return nombreCorto === proyectoSeleccionadoGrafico;
                    });
                    
                    if (proyectoCompleto) {
                      datosFiltrados = datosMes.filter(fila => {
                        const filaProyecto = fila['Proyecto'] || fila['PROYECTO'] || fila['proyecto'];
                        return perteneceAlProyecto(proyectoCompleto, filaProyecto);
                      });
                    }
                  }

                  // Debug: Ver cuántas tarjetas se están generando y si hay datos
                  // Buscar el tipo exacto en los datos filtrados
                  let tipoEncontrado = null;
                  let totalTipo = 0;
                  let porcentajeTipo = 0;
                  
                  // Buscar coincidencias del tipo ordenado con los tipos disponibles
                  for (const fila of datosFiltrados) {
                    const tipoFila = fila['Tipo de Valor'] || fila['TIPO_VALOR'] || fila['tipo_valor'] || '';
                    const tipoFilaLower = tipoFila.toLowerCase();
                    const ordenLower = tipoOrden.toLowerCase();
                    
                    let coincide = false;
                    if (ordenLower.includes('inicial') && tipoFilaLower.includes('inicial')) coincide = true;
                    else if (ordenLower.includes('vigente') && tipoFilaLower.includes('vigente') && !tipoFilaLower.includes('disponible')) coincide = true;
                    else if (ordenLower.includes('disponible') && tipoFilaLower.includes('disponible')) coincide = true;
                    else if (ordenLower.includes('cdp') && tipoFilaLower.includes('cdp')) coincide = true;
                    else if (ordenLower.includes('comprometido') && tipoFilaLower.includes('comprometido')) coincide = true;
                    else if (ordenLower.includes('obligación') && (tipoFilaLower.includes('obligación') || tipoFilaLower.includes('obligacion'))) coincide = true;
                    else if (ordenLower.includes('orden') && tipoFilaLower.includes('orden')) coincide = true;
                    
                    if (coincide) {
                      if (!tipoEncontrado) {
                        tipoEncontrado = tipoFila;
                      }
                      const valor = parseFloat(fila['Valor'] || fila['VALOR'] || fila['valor'] || 0);
                      totalTipo += valor;
                      
                      // Obtener porcentaje si está disponible
                      const pct = parseFloat(fila['Porcentaje'] || fila['PORCENTAJE'] || fila['porcentaje'] || 0);
                      if (pct > porcentajeTipo) {
                        porcentajeTipo = pct;
                      }
                    }
                  }
                  
                  // Solo mostrar si hay datos
                  if (!tipoEncontrado || totalTipo === 0) {
                    return null;
                  }
                  
                  const config = getTipoConfigDatos(tipoEncontrado);
                  const IconComponent = config.icon;
                  
                  return (
                    <div 
                      key={`datos-${tipoOrden}-${idx}`}
                      style={{
                        background: 'white',
                        border: `2px solid ${config.color}20`,
                        borderRadius: '8px',
                        padding: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                    >
                      <div style={{
                        background: config.bgColor,
                        color: config.color,
                        padding: '8px',
                        borderRadius: '6px',
                        fontSize: '16px'
                      }}>
                        <IconComponent />
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '10px',
                          fontWeight: '600',
                          color: config.color,
                          marginBottom: '4px',
                          textTransform: 'uppercase'
                        }}>
                          {tipoOrden}
                        </div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: 'bold',
                          color: '#1e293b'
                        }}>
                          {formatNumber(totalTipo)}
                        </div>
                        {porcentajeTipo > 0 && (
                          <div style={{
                            background: config.color,
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            display: 'inline-block',
                            marginTop: '4px'
                          }}>
                            {porcentajeTipo.toFixed(2)} %
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }).filter(item => item)}
              </div>
            </div>

            {/* Panel derecho - Gráfico */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #e2e8f0'
            }}>
              {/* Header del gráfico con filtros */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '1px solid #e2e8f0'
              }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#1e293b',
                  margin: 0
                }}>
                  Análisis por Proyecto
                </h3>
                
                {/* Filtros del gráfico */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  
                  {/* Filtro de Proyecto para gráfico */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaProjectDiagram style={{ color: '#dc2626', fontSize: '14px' }} />
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>Proyecto:</span>
                    <button
                      onClick={() => setProyectoSeleccionadoGrafico('todos')}
                      style={{
                        padding: '4px 8px',
                        fontSize: '10px',
                        border: proyectoSeleccionadoGrafico === 'todos' ? '2px solid #dc2626' : '1px solid #e2e8f0',
                        borderRadius: '4px',
                        background: proyectoSeleccionadoGrafico === 'todos' ? '#dc2626' : 'white',
                        color: proyectoSeleccionadoGrafico === 'todos' ? 'white' : '#374151',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Todos
                    </button>
                    {proyectosDisponibles.map(proyecto => (
                      <button
                        key={proyecto}
                        onClick={() => setProyectoSeleccionadoGrafico(proyecto)}
                        style={{
                          padding: '4px 8px',
                          fontSize: '10px',
                          border: proyectoSeleccionadoGrafico === proyecto ? '2px solid #dc2626' : '1px solid #e2e8f0',
                          borderRadius: '4px',
                          background: proyectoSeleccionadoGrafico === proyecto ? '#dc2626' : 'white',
                          color: proyectoSeleccionadoGrafico === proyecto ? 'white' : '#374151',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {proyecto}
                      </button>
                    ))}
                  </div>

                  <div style={{ width: '1px', height: '20px', backgroundColor: '#e2e8f0' }}></div>

                  {/* Filtro de Mes para gráfico */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaCalendarAlt style={{ color: '#dc2626', fontSize: '14px' }} />
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>Mes:</span>
                    {mesesDisponibles.map(mes => (
                      <button
                        key={mes}
                        onClick={() => setMesSeleccionadoGrafico(mes.toString())}
                        style={{
                          padding: '4px 8px',
                          fontSize: '10px',
                          border: mesSeleccionadoGrafico === mes.toString() ? '2px solid #dc2626' : '1px solid #e2e8f0',
                          borderRadius: '4px',
                          background: mesSeleccionadoGrafico === mes.toString() ? '#dc2626' : 'white',
                          color: mesSeleccionadoGrafico === mes.toString() ? 'white' : '#374151',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {getNombreMes(mes).toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ height: '400px', position: 'relative' }}>
                <canvas ref={chartRef}></canvas>
              </div>
            </div>
          </div>

          {/* Sección de Comparación Mensual - SIMPLIFICADA */}
          <div 
            data-section="comparacion-meses"
            style={{ 
              background: 'white', 
              borderRadius: '12px', 
              padding: '24px', 
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
              marginTop: '24px'
            }}
          >
            
            {/* Header de la sección comparativa */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '24px',
              paddingBottom: '16px',
              borderBottom: '2px solid #e2e8f0'
            }}>
              <div>
                <h2 style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: 'bold', 
                  margin: 0, 
                  color: '#1e293b' 
                }}>
                  Comparación entre Meses
                </h2>
                <p style={{ 
                  fontSize: '14px', 
                  margin: '4px 0 0 0', 
                  color: '#64748b' 
                }}>
                  Comparación lado a lado de dos meses específicos
                </p>
              </div>
              
              {/* Filtros de Comparación */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                
                {/* Filtro de Proyecto */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FaProjectDiagram style={{ color: '#8b5cf6', fontSize: '14px' }} />
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>Proyecto:</span>
                  <button
                    onClick={() => setProyectoSeleccionadoComparacion('todos')}
                    style={{
                      padding: '4px 8px',
                      fontSize: '10px',
                      border: proyectoSeleccionadoComparacion === 'todos' ? '2px solid #8b5cf6' : '1px solid #e2e8f0',
                      borderRadius: '4px',
                      background: proyectoSeleccionadoComparacion === 'todos' ? '#8b5cf6' : 'white',
                      color: proyectoSeleccionadoComparacion === 'todos' ? 'white' : '#374151',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Todos
                  </button>
                  {proyectosDisponibles.map(proyecto => (
                    <button
                      key={proyecto}
                      onClick={() => setProyectoSeleccionadoComparacion(proyecto)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '10px',
                        border: proyectoSeleccionadoComparacion === proyecto ? '2px solid #8b5cf6' : '1px solid #e2e8f0',
                        borderRadius: '4px',
                        background: proyectoSeleccionadoComparacion === proyecto ? '#8b5cf6' : 'white',
                        color: proyectoSeleccionadoComparacion === proyecto ? 'white' : '#374151',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {proyecto}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Área de contenido */}
            <div 
              data-section="graficos-comparacion"
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}
            >
              
              {/* Gráfico Mes 1 */}
              <div>
                <div style={{ marginBottom: '12px', textAlign: 'center' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#374151', marginBottom: '8px' }}>
                    Primer Mes
                  </h3>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', flexWrap: 'wrap' }}>
                    {mesesDisponibles.map(mes => (
                      <button
                        key={mes}
                        onClick={() => setMes1Comparacion(mes.toString())}
                        style={{
                          padding: '4px 8px',
                          fontSize: '10px',
                          border: mes1Comparacion === mes.toString() ? '2px solid #059669' : '1px solid #e2e8f0',
                          borderRadius: '4px',
                          background: mes1Comparacion === mes.toString() ? '#059669' : 'white',
                          color: mes1Comparacion === mes.toString() ? 'white' : '#374151',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {getNombreMes(mes).toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ height: '300px', position: 'relative', background: '#f8fafc', borderRadius: '8px', padding: '8px' }}>
                  <canvas ref={chartMes1Ref}></canvas>
                </div>
              </div>

              {/* Gráfico Mes 2 */}
              <div>
                <div style={{ marginBottom: '12px', textAlign: 'center' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#374151', marginBottom: '8px' }}>
                    Segundo Mes
                  </h3>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', flexWrap: 'wrap' }}>
                    {mesesDisponibles.map(mes => (
                      <button
                        key={mes}
                        onClick={() => setMes2Comparacion(mes.toString())}
                        style={{
                          padding: '4px 8px',
                          fontSize: '10px',
                          border: mes2Comparacion === mes.toString() ? '2px solid #dc2626' : '1px solid #e2e8f0',
                          borderRadius: '4px',
                          background: mes2Comparacion === mes.toString() ? '#dc2626' : 'white',
                          color: mes2Comparacion === mes.toString() ? 'white' : '#374151',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {getNombreMes(mes).toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ height: '300px', position: 'relative', background: '#f8fafc', borderRadius: '8px', padding: '8px' }}>
                  <canvas ref={chartMes2Ref}></canvas>
                </div>
              </div>
            </div>

            {/* Tabla de Comparación */}
            <div 
              data-section="tabla-comparativa"
              style={{ 
                marginTop: '24px',
                borderTop: '2px solid #e2e8f0',
                paddingTop: '24px'
              }}
            >
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: 'bold', 
                color: '#1e293b', 
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                Tabla Comparativa
                {proyectoSeleccionadoComparacion !== 'todos' && (
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: 'normal', 
                    color: '#64748b', 
                    display: 'block',
                    marginTop: '4px'
                  }}>
                    {proyectoSeleccionadoComparacion}
                  </span>
                )}
              </h3>
              
              <div style={{ 
                background: '#f8fafc', 
                borderRadius: '8px', 
                padding: '16px',
                overflow: 'auto'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ 
                        padding: '12px', 
                        textAlign: 'left', 
                        fontSize: '14px', 
                        fontWeight: 'bold', 
                        color: '#374151' 
                      }}>
                        Tipo de Valor
                      </th>
                      <th style={{ 
                        padding: '12px', 
                        textAlign: 'right', 
                        fontSize: '14px', 
                        fontWeight: 'bold', 
                        color: '#059669' 
                      }}>
                        {mes1Comparacion ? `${getNombreMes(parseInt(mes1Comparacion))} ${añoSeleccionado}` : 'Mes 1'}
                      </th>
                      <th style={{ 
                        padding: '12px', 
                        textAlign: 'right', 
                        fontSize: '14px', 
                        fontWeight: 'bold', 
                        color: '#dc2626' 
                      }}>
                        {mes2Comparacion ? `${getNombreMes(parseInt(mes2Comparacion))} ${añoSeleccionado}` : 'Mes 2'}
                      </th>
                      <th style={{ 
                        padding: '12px', 
                        textAlign: 'right', 
                        fontSize: '14px', 
                        fontWeight: 'bold', 
                        color: '#7c3aed' 
                      }}>
                        Diferencia
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordenTiposDatos.map((tipoOrden, idx) => {
                      // Calcular valores para mes 1 con filtro de proyecto
                      const valor1 = mes1Comparacion ? (() => {
                        let datosMes1 = datosFinancieros.filter(fila => {
                          const fecha = fila['Fecha Corte'] || fila['FECHA_CORTE'] || fila['fecha_corte'];
                          if (fecha) {
                            const fechaObj = new Date(fecha);
                            return (fechaObj.getMonth() + 1).toString() === mes1Comparacion;
                          }
                          return false;
                        });
                        
                        // Aplicar filtro de proyecto si no es "todos"
                        if (proyectoSeleccionadoComparacion !== 'todos') {
                          const proyectoCompleto = proyectosUnicos.find(nombreCompleto => {
                            const nombreCorto = getNombreCortoProyecto(nombreCompleto);
                            return nombreCorto === proyectoSeleccionadoComparacion;
                          });
                          
                          if (proyectoCompleto) {
                            datosMes1 = datosMes1.filter(fila => {
                              const filaProyecto = fila['Proyecto'] || fila['PROYECTO'] || fila['proyecto'];
                              return perteneceAlProyecto(proyectoCompleto, filaProyecto);
                            });
                          }
                        }
                        
                        const tipoData = datosMes1.filter(fila => {
                          const tipo = fila['Tipo de Valor'] || fila['TIPO_VALOR'] || fila['tipo_valor'] || '';
                          const tipoLower = tipo.toLowerCase();
                          const ordenLower = tipoOrden.toLowerCase();
                          
                          return (ordenLower.includes('inicial') && tipoLower.includes('inicial')) ||
                                 (ordenLower.includes('vigente') && tipoLower.includes('vigente') && !tipoLower.includes('disponible')) ||
                                 (ordenLower.includes('disponible') && tipoLower.includes('disponible')) ||
                                 (ordenLower.includes('cdp') && tipoLower.includes('cdp')) ||
                                 (ordenLower.includes('comprometido') && tipoLower.includes('comprometido')) ||
                                 (ordenLower.includes('obligación') && tipoLower.includes('obligación')) ||
                                 (ordenLower.includes('orden') && tipoLower.includes('orden'));
                        });
                        
                        return tipoData.reduce((sum, fila) => {
                          const valor = parseFloat(fila['Valor'] || fila['VALOR'] || fila['valor'] || 0);
                          return sum + valor;
                        }, 0);
                      })() : 0;
                      
                      // Calcular valores para mes 2 con filtro de proyecto
                      const valor2 = mes2Comparacion ? (() => {
                        let datosMes2 = datosFinancieros.filter(fila => {
                          const fecha = fila['Fecha Corte'] || fila['FECHA_CORTE'] || fila['fecha_corte'];
                          if (fecha) {
                            const fechaObj = new Date(fecha);
                            return (fechaObj.getMonth() + 1).toString() === mes2Comparacion;
                          }
                          return false;
                        });
                        
                        // Aplicar filtro de proyecto si no es "todos"
                        if (proyectoSeleccionadoComparacion !== 'todos') {
                          const proyectoCompleto = proyectosUnicos.find(nombreCompleto => {
                            const nombreCorto = getNombreCortoProyecto(nombreCompleto);
                            return nombreCorto === proyectoSeleccionadoComparacion;
                          });
                          
                          if (proyectoCompleto) {
                            datosMes2 = datosMes2.filter(fila => {
                              const filaProyecto = fila['Proyecto'] || fila['PROYECTO'] || fila['proyecto'];
                              return perteneceAlProyecto(proyectoCompleto, filaProyecto);
                            });
                          }
                        }
                        
                        const tipoData = datosMes2.filter(fila => {
                          const tipo = fila['Tipo de Valor'] || fila['TIPO_VALOR'] || fila['tipo_valor'] || '';
                          const tipoLower = tipo.toLowerCase();
                          const ordenLower = tipoOrden.toLowerCase();
                          
                          return (ordenLower.includes('inicial') && tipoLower.includes('inicial')) ||
                                 (ordenLower.includes('vigente') && tipoLower.includes('vigente') && !tipoLower.includes('disponible')) ||
                                 (ordenLower.includes('disponible') && tipoLower.includes('disponible')) ||
                                 (ordenLower.includes('cdp') && tipoLower.includes('cdp')) ||
                                 (ordenLower.includes('comprometido') && tipoLower.includes('comprometido')) ||
                                 (ordenLower.includes('obligación') && tipoLower.includes('obligación')) ||
                                 (ordenLower.includes('orden') && tipoLower.includes('orden'));
                        });
                        
                        return tipoData.reduce((sum, fila) => {
                          const valor = parseFloat(fila['Valor'] || fila['VALOR'] || fila['valor'] || 0);
                          return sum + valor;
                        }, 0);
                      })() : 0;
                      
                      const diferencia = valor2 - valor1;
                      const config = getTipoConfigTotales('', tipoOrden);
                      
                      return (
                        <tr key={tipoOrden} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ 
                            padding: '12px', 
                            fontSize: '13px', 
                            fontWeight: '600',
                            color: config.color
                          }}>
                            {tipoOrden}
                          </td>
                          <td style={{ 
                            padding: '12px', 
                            textAlign: 'right', 
                            fontSize: '13px',
                            color: '#059669',
                            fontWeight: '500'
                          }}>
                            {formatNumber(valor1)}
                          </td>
                          <td style={{ 
                            padding: '12px', 
                            textAlign: 'right', 
                            fontSize: '13px',
                            color: '#dc2626',
                            fontWeight: '500'
                          }}>
                            {formatNumber(valor2)}
                          </td>
                          <td style={{ 
                            padding: '12px', 
                            textAlign: 'right', 
                            fontSize: '13px',
                            color: diferencia >= 0 ? '#059669' : '#dc2626',
                            fontWeight: 'bold'
                          }}>
                            {diferencia >= 0 ? '+' : ''}{formatNumber(diferencia)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Graficos;