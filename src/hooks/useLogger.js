import { useAuth } from '../contexts/AuthContext';
import { registrarLog } from '../services/spreadsheetApi';

// Hook personalizado para logging automático
export const useLogger = () => {
  const { user } = useAuth();

  const log = async (accion, descripcion) => {
    if (user?.email) {
      try {
        await registrarLog(user.email, accion, descripcion);
      } catch (error) {
        console.error('Error registrando log:', error);
      }
    }
  };

  return { log };
};

export default useLogger;
