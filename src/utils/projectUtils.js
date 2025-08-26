// Utilidad para comparar tipos de valor de forma flexible
export function comparaTipoValor(ordenLower, tipoLower) {
  if (ordenLower.includes('inicial') && (tipoLower.includes('inicial') || tipoLower.includes('inicia'))) return true;
  if (ordenLower.includes('vigente') && tipoLower.includes('vigente') && !tipoLower.includes('disponible')) return true;
  if (ordenLower.includes('disponible') && tipoLower.includes('disponible')) return true;
  if (ordenLower.includes('cdp') && tipoLower.includes('cdp')) return true;
  if (ordenLower.includes('comprometido') && tipoLower.includes('comprometido')) return true;
  if (ordenLower.includes('obligación') && (tipoLower.includes('obligación') || tipoLower.includes('obligacion'))) return true;
  if (ordenLower.includes('orden') && tipoLower.includes('orden')) return true;
  return false;
}

// Utilidad para obtener los primeros 3 proyectos únicos
export function getProyectosUnicos(proyectos) {
  return Array.from(new Set(proyectos.map(p => p['Proyecto'] || p['PROYECTO'] || p['proyecto'])))
    .filter(nombre => nombre && nombre.trim() !== '')
    .slice(0, 3);
}
