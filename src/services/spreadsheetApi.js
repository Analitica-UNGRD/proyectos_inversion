
import axios from 'axios';
// URL del Google Apps Script (actualizado por el usuario)
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyT4WNOfaNbgq-eh9qtMk2aTEK-LMpZ6uC8anwr_kh8_3PmZ5RC_OISMHFYJyottIkwng/exec';

// Actualiza la columna % Avance (columna U) en la hoja Principal
export async function actualizarAvanceGeneral(proyectoId, actividadId, valor) {
  try {
    const params = new URLSearchParams({
      action: 'updateAvanceGeneral',
      proyectoId: proyectoId,
      actividadId: actividadId,
      valor: valor
    });
    const res = await fetch(`${SCRIPT_URL}?${params}`);
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Error actualizando avance general:', error);
    throw error;
  }
}
// Actualiza la columna Observaciones (columna X) en la hoja Principal
export async function actualizarObservacion(proyectoId, actividadId, observacion) {
  try {
    const params = new URLSearchParams({
      action: 'updateObservacion',
      proyectoId: proyectoId,
      actividadId: actividadId,
      observacion: observacion
    });
    const res = await fetch(`${SCRIPT_URL}?${params}`);
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Error actualizando observación:', error);
    throw error;
  }
}

// Guarda una nueva fila financiera en la hoja Tabla_Eje_Financiera
export async function guardarDatosFinanciera(datos) {
  try {
    // Convertir datos a JSON y codificarlos para la URL
    const datosJSON = JSON.stringify(datos);
    const res = await fetch(`${SCRIPT_URL}?action=guardarFinanciera&datos=${encodeURIComponent(datosJSON)}`);
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Error guardando datos financieros:', error);
    throw error;
  }
}

export async function getDatos() {
  const res = await axios.get(SCRIPT_URL);
  return res.data;
}

export async function guardarDatos(tipo, datos) {
  const res = await axios.post(SCRIPT_URL, { tipo, datos });
  return res.data;
}

export async function saveDataToSpreadsheet(datos) {
  return await guardarDatos('proyecto', datos);
}

// Nuevas funciones para control de edición usando GET para evitar CORS
export async function getConfiguracionEdicion() {
  try {
    // Usar GET con parámetros para evitar CORS
    const res = await fetch(`${SCRIPT_URL}?action=getConfig`);
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Error obteniendo configuración:', error);
    return { mesActivo: 'enero', activo: true };
  }
}

export async function setMesActivo(mes) {
  try {
    // Usar GET con parámetros para evitar CORS
    const res = await fetch(`${SCRIPT_URL}?action=setMes&mes=${encodeURIComponent(mes)}`);
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Error configurando mes activo:', error);
    throw error;
  }
}

export async function actualizarAvanceMensual(proyectoId, actividadId, mes, valor) {
  try {
    // Usar GET con parámetros para evitar CORS
    const params = new URLSearchParams({
      action: 'updateAvance',
      proyectoId: proyectoId,
      actividadId: actividadId,
      mes: mes,
      valor: valor
    });
    const res = await fetch(`${SCRIPT_URL}?${params}`);
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Error actualizando avance:', error);
    throw error;
  }
}

export async function obtenerNombresReales() {
  try {
    const res = await fetch(`${SCRIPT_URL}?action=getNombres`);
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Error obteniendo nombres reales:', error);
    throw error;
  }
}

export async function verificarEmailAdmin(email) {
  try {
    const res = await fetch(`${SCRIPT_URL}?action=verificarAdmin&email=${encodeURIComponent(email)}`);
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Error verificando email admin:', error);
    throw error;
  }
}

// Obtener lista de usuarios desde la hoja Configuracion (A4:A100 = emails, B4:B100 = passwords)
export async function getUsers() {
  // Intentar JSONP primero para evitar bloqueos CORS si el webapp no devuelve cabeceras CORS
  try {
    const callbackName = 'cb' + Math.floor(Math.random() * 1000000);
    const url = `${SCRIPT_URL}?action=getUsers&callback=${callbackName}`;
    const text = await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      let timer = setTimeout(() => {
        // timeout
        cleanup();
        reject(new Error('JSONP timeout'));
      }, 6000);

      function cleanup() {
        clearTimeout(timer);
        try { delete window[callbackName]; } catch (e) {}
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      window[callbackName] = function(data) {
        cleanup();
        resolve(JSON.stringify(data));
      };

      script.onerror = function(e) {
        cleanup();
        reject(e || new Error('JSONP script error'));
      };

      script.src = url;
      document.head.appendChild(script);
    });

    return JSON.parse(text);
  } catch (errJsonp) {
    console.warn('JSONP attempt failed for getUsers:', errJsonp);
    // Intentar fetch directo como último recurso
    try {
      const res = await fetch(`${SCRIPT_URL}?action=getUsers`);
      const data = await res.json();
      return data;
    } catch (error) {
      console.error('Error obteniendo usuarios via fetch tras JSONP fallido:', error);
      return { success: false, users: [] };
    }
  }
}

// Reemplazar lista completa de usuarios en la hoja Configuracion
export async function setUsers(users) {
  try {
  // Usar GET con parámetros para evitar CORS preflight
  const params = new URLSearchParams({ action: 'setUsers', users: JSON.stringify(users) });
  const res = await fetch(`${SCRIPT_URL}?${params.toString()}`);
  const data = await res.json();
  return data;
  } catch (error) {
    console.error('Error seteando usuarios:', error);
    // Intentar JSONP como fallback
    try {
      const callbackName = 'cb' + Math.floor(Math.random() * 1000000);
      const url = `${SCRIPT_URL}?action=setUsers&users=${encodeURIComponent(JSON.stringify(users))}&callback=${callbackName}`;
      const text = await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        window[callbackName] = function(data) {
          resolve(JSON.stringify(data));
          delete window[callbackName];
          document.head.removeChild(script);
        };
        script.onerror = function(e) { reject(e); };
        script.src = url;
        document.head.appendChild(script);
        setTimeout(() => reject(new Error('JSONP timeout')), 5000);
      });
      return JSON.parse(text);
    } catch (err) {
      console.error('JSONP fallback failed for setUsers:', err);
      return { success: false };
    }
  }
}

// Añadir un solo usuario (leer-modificar-escribir en Apps Script)
export async function addUser(user) {
  try {
  const params = new URLSearchParams({ action: 'addUser', user: JSON.stringify(user), email: user.email || '', password: user.password || '' });
  const res = await fetch(`${SCRIPT_URL}?${params.toString()}`);
  const data = await res.json();
  return data;
  } catch (error) {
    console.error('Error añadiendo usuario:', error);
    // JSONP fallback
    try {
      const callbackName = 'cb' + Math.floor(Math.random() * 1000000);
      const url = `${SCRIPT_URL}?action=addUser&user=${encodeURIComponent(JSON.stringify(user))}&email=${encodeURIComponent(user.email||'')}&password=${encodeURIComponent(user.password||'')}&callback=${callbackName}`;
      const text = await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        window[callbackName] = function(data) {
          resolve(JSON.stringify(data));
          delete window[callbackName];
          document.head.removeChild(script);
        };
        script.onerror = function(e) { reject(e); };
        script.src = url;
        document.head.appendChild(script);
        setTimeout(() => reject(new Error('JSONP timeout')), 5000);
      });
      return JSON.parse(text);
    } catch (err) {
      console.error('JSONP fallback failed for addUser:', err);
      return { success: false };
    }
  }
}

// Eliminar usuario por email
export async function removeUser(email) {
  try {
  const params = new URLSearchParams({ action: 'removeUser', email });
  const res = await fetch(`${SCRIPT_URL}?${params.toString()}`);
  const data = await res.json();
  return data;
  } catch (error) {
    console.error('Error removiendo usuario:', error);
    // JSONP fallback
    try {
      const callbackName = 'cb' + Math.floor(Math.random() * 1000000);
      const url = `${SCRIPT_URL}?action=removeUser&email=${encodeURIComponent(email)}&callback=${callbackName}`;
      const text = await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        window[callbackName] = function(data) {
          resolve(JSON.stringify(data));
          delete window[callbackName];
          document.head.removeChild(script);
        };
        script.onerror = function(e) { reject(e); };
        script.src = url;
        document.head.appendChild(script);
        setTimeout(() => reject(new Error('JSONP timeout')), 5000);
      });
      return JSON.parse(text);
    } catch (err) {
      console.error('JSONP fallback failed for removeUser:', err);
      return { success: false };
    }
  }
}

export async function getDatosFinancieros() {
  try {
    const datos = await getDatos();
    return datos.financiera || [];
  } catch (error) {
    console.error('Error obteniendo datos financieros:', error);
    throw error;
  }
}

// Obtener proyectos únicos para los selectores
export async function obtenerProyectosUnicos() {
  try {
    const res = await fetch(`${SCRIPT_URL}?action=getProyectosUnicos`);
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Error obteniendo proyectos únicos:', error);
    throw error;
  }
}

// Obtener BPINs únicos para los selectores
export async function obtenerBPINsUnicos() {
  try {
    const res = await fetch(`${SCRIPT_URL}?action=getBPINsUnicos`);
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Error obteniendo BPINs únicos:', error);
    throw error;
  }
}

// Obtener tipos de valores únicos para los selectores
export async function obtenerTiposValorUnicos() {
  try {
    const res = await fetch(`${SCRIPT_URL}?action=getTiposValorUnicos`);
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Error obteniendo tipos de valor únicos:', error);
    throw error;
  }
}

// Verificar credenciales de acceso general al sistema
export async function verificarCredencialesAcceso(email, password) {
  try {
    const res = await fetch(`${SCRIPT_URL}?action=verificarAcceso&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`);
    const data = await res.json();
    
    // Si el login es exitoso, registrar el log
    if (data.success) {
      await registrarLog(email, 'LOGIN', 'Inicio de sesión exitoso');
    }
    
    return data;
  } catch (error) {
    console.error('Error verificando credenciales de acceso:', error);
    return { success: false, message: 'Error de conexión' };
  }
}

// Registrar actividad en la hoja de Logs
export async function registrarLog(email, accion, descripcion) {
  try {
    const params = new URLSearchParams({
      action: 'registrarLog',
      email: email,
      accion: accion,
      descripcion: descripcion || ''
    });

    const response = await fetch(`${SCRIPT_URL}?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Error registrando log');
    }

    return data;
  } catch (error) {
    console.error('Error en registrarLog:', error);
    return { success: false, message: error.message };
  }
}

// Función para obtener logs recientes
export async function obtenerLogsRecientes(limite = 20) {
  try {
    const params = new URLSearchParams({
      action: 'obtenerLogs',
      limite: limite.toString()
    });

    const response = await fetch(`${SCRIPT_URL}?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Error obteniendo logs');
    }

    return data.logs || [];
  } catch (error) {
    console.error('Error en obtenerLogsRecientes:', error);
    throw error;
  }
}

// Obtener configuración general del sistema (envía action=getConfig por compatibilidad)
export async function getSystemConfig() {
  try {
    const res = await fetch(`${SCRIPT_URL}?action=getConfig`);
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Error obteniendo configuración del sistema:', error);
    throw error;
  }
}

// Establecer un valor de configuración del sistema (por ejemplo: version)
export async function setSystemConfig(key, value) {
  try {
    const params = new URLSearchParams({
      action: 'setConfig',
      key: key,
      value: value
    });

    const res = await fetch(`${SCRIPT_URL}?${params.toString()}`);
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Error estableciendo configuración del sistema:', error);
    throw error;
  }
}

// Convenience helper to set system version
export async function setSystemVersion(version) {
  return await setSystemConfig('version', version);
}