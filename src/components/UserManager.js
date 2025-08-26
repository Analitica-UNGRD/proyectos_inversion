import React, { useEffect, useState } from 'react';
import LoadingIndicator from './LoadingIndicator';
import { getUsers, addUser, removeUser, setUsers, getConfiguracionEdicion, setMesActivo, verificarEmailAdmin } from '../services/spreadsheetApi';

const UserManager = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsersState] = useState([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [mesActivo, setMesActivoState] = useState('enero');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let isMounted = true;
    loadData(isMounted);
    return () => { isMounted = false; };
  }, []);

  const loadData = async (isMounted = true) => {
    setLoading(true);
    try {
      const res = await getUsers();
      if (isMounted) {
        if (res && res.success && Array.isArray(res.users)) {
          setUsersState(res.users);
        } else {
          setUsersState([]);
        }
      }
      try {
        const cfg = await getConfiguracionEdicion();
        if (isMounted && cfg) {
          setMesActivoState(cfg.mesActivo || cfg.mes_activo || 'enero');
        }
      } catch (err) {
        // ignore
      }
    } catch (err) {
      console.error('Error loading users:', err);
      if (isMounted) setUsersState([]);
    } finally {
      if (isMounted) setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!email || !password) return setMessage('Email y contraseña requeridos');
    setSaving(true);
    setMessage('');
    try {
      const res = await addUser({ email, password });
      if (res && res.success) {
        setMessage('Usuario añadido');
        setEmail('');
        setPassword('');
        await loadData();
      } else {
        setMessage(res.message || 'Error añadiendo usuario');
      }
    } catch (err) {
      setMessage('Error añadiendo usuario');
    } finally {
      setSaving(false);
    }
  };

  // Función para mostrar un modal de confirmación sin usar confirm()
  const customConfirm = (message) => {
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.3)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '9999';
    modal.innerHTML = `
      <div style="background: white; padding: 24px 32px; border-radius: 12px; box-shadow: 0 2px 16px rgba(0,0,0,0.2); text-align: center;">
        <div style="margin-bottom: 18px; font-size: 1.1rem;">${message}</div>
        <button id="confirm-yes" style="margin-right: 16px; padding: 6px 18px; background: #10b981; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">Sí</button>
        <button id="confirm-no" style="padding: 6px 18px; background: #ef4444; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">No</button>
      </div>
    `;
    document.body.appendChild(modal);
    return new Promise((resolve) => {
      modal.querySelector('#confirm-yes').onclick = () => {
        document.body.removeChild(modal);
        resolve(true);
      };
      modal.querySelector('#confirm-no').onclick = () => {
        document.body.removeChild(modal);
        resolve(false);
      };
    });
  };

  const handleRemove = async (emailToRemove) => {
    const confirmed = await customConfirm(`¿Eliminar usuario ${emailToRemove}?`);
    if (!confirmed) return;
    setSaving(true);
    try {
      const res = await removeUser(emailToRemove);
      if (res && res.success) {
        setMessage('Usuario eliminado');
        await loadData();
      } else {
        setMessage(res.message || 'Error eliminando usuario');
      }
    } catch (err) {
      setMessage('Error eliminando usuario');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    // setUsers expects array of {email,password}
    setSaving(true);
    setMessage('');
    try {
      const res = await setUsers(users);
      if (res && res.success) {
        setMessage('Lista de usuarios actualizada');
        await loadData();
      } else {
        setMessage(res.message || 'Error actualizando lista');
      }
    } catch (err) {
      setMessage('Error actualizando lista');
    } finally {
      setSaving(false);
    }
  };

  const handleAdminEmailSave = async () => {
  // Admin email editing removed per request. Use the sheet directly (B2) to change admin.
  setMessage('Edición de correo admin eliminada de la UI. Edítelo directamente en la hoja Configuracion (celda B2).');
  };

  const handleMesSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await setMesActivo(mesActivo);
      if (res && res.success) {
        setMessage('Mes activo actualizado');
      } else {
        setMessage(res.message || 'Error actualizando mes');
      }
    } catch (err) {
      setMessage('Error actualizando mes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingIndicator />;

  return (
    <div style={{ padding: 12 }}>
      <h3>Gestión de Usuarios</h3>
      {message && <div style={{ marginBottom: 8 }}>{message}</div>}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input placeholder="email" value={email} onChange={e => setEmail(e.target.value)} />
        <input placeholder="contraseña" value={password} onChange={e => setPassword(e.target.value)} />
        <button onClick={handleAdd} disabled={saving}>{saving ? '...' : 'Añadir'}</button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <strong>Usuarios en la hoja:</strong>
        <ul>
          {users.map(u => (
            <li key={u.email} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>{u.email} {u.password ? '(tiene contraseña)' : '(sin contraseña)'}</span>
              <button onClick={() => handleRemove(u.email)} style={{ marginLeft: 8 }}>Eliminar</button>
            </li>
          ))}
        </ul>
        <button onClick={handleSaveAll} disabled={saving}>{saving ? '...' : 'Guardar cambios en hoja'}</button>
      </div>

      <div style={{ marginTop: 16 }}>
        <h4>Configuración</h4>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label>Mes activo:</label>
          <select value={mesActivo} onChange={e => setMesActivoState(e.target.value)}>
            {['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <button onClick={handleMesSave} disabled={saving}>{saving ? '...' : 'Guardar'}</button>
        </div>
        <div style={{ marginTop: 8, color: '#666' }}>
          Nota: El correo administrador (celda B2) no se edita desde esta UI; manténgalo en la hoja Configuracion.
        </div>
      </div>
    </div>
  );
};

export default UserManager;
