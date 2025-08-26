import React, { useEffect, useState } from 'react';
import { getDatos } from '../services/spreadsheetApi';

const DebugDatos = () => {
  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('Cargando datos desde el API...');
        const result = await getDatos();
        console.log('Datos recibidos:', result);
        setDatos(result);
      } catch (err) {
        console.error('Error cargando datos:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return <div className="p-6">Cargando datos...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug de Datos</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Datos de Proyectos */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-600">Datos de Proyectos</h2>
          <div className="text-sm">
            <p className="mb-2"><strong>Total proyectos:</strong> {datos?.proyectos?.length || 0}</p>
            {datos?.proyectos?.length > 0 && (
              <>
                <p className="mb-4"><strong>Columnas disponibles:</strong></p>
                <div className="bg-gray-100 p-3 rounded text-xs mb-4">
                  {Object.keys(datos.proyectos[0]).join(', ')}
                </div>
                <p className="mb-2"><strong>Primer proyecto (ejemplo):</strong></p>
                <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                  {JSON.stringify(datos.proyectos[0], null, 2)}
                </pre>
              </>
            )}
          </div>
        </div>

        {/* Datos Financieros */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-green-600">Datos Financieros (Tabla_Eje_Financiera)</h2>
          <div className="text-sm">
            <p className="mb-2"><strong>Total filas financieras:</strong> {datos?.financiera?.length || 0}</p>
            {datos?.financiera?.length > 0 && (
              <>
                <p className="mb-4"><strong>Columnas esperadas:</strong></p>
                <div className="bg-gray-100 p-3 rounded text-xs mb-4">
                  BPIN, Proyecto, Tipo de Valor, Valor, Porcentaje, Fecha Corte
                </div>
                <p className="mb-4"><strong>Columnas disponibles:</strong></p>
                <div className="bg-gray-100 p-3 rounded text-xs mb-4">
                  {Object.keys(datos.financiera[0]).join(', ')}
                </div>
                <p className="mb-2"><strong>Primera fila financiera (ejemplo):</strong></p>
                <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                  {JSON.stringify(datos.financiera[0], null, 2)}
                </pre>
                
                {/* Verificar proyectos únicos */}
                <p className="mb-2 mt-4"><strong>Proyectos únicos encontrados:</strong></p>
                <div className="bg-blue-50 p-3 rounded text-xs">
                  {[...new Set(datos.financiera.map(fila => 
                    fila['Proyecto'] || fila['PROYECTO'] || fila['proyecto'] || 'Sin proyecto'
                  ))].join(', ')}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Vista completa de todos los datos financieros */}
      {datos?.financiera?.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-purple-600">Todos los Datos Financieros</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto text-sm">
              <thead>
                <tr className="bg-gray-50">
                  {Object.keys(datos.financiera[0]).map(col => (
                    <th key={col} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {datos.financiera.map((fila, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    {Object.values(fila).map((valor, i) => (
                      <td key={i} className="px-3 py-2 whitespace-nowrap text-xs">
                        {valor?.toString() || ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Datos raw completos */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-600">Datos Raw Completos</h2>
        <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
          {JSON.stringify(datos, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default DebugDatos;
