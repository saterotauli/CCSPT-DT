// Utilidad para validar consultas SQL generadas
// Aquí puedes agregar funciones para comprobar la validez y seguridad de las consultas

export function isValidSQL(query: string): boolean {
  // TODO: Implementar validaciones reales
  return query.trim().toLowerCase().startsWith('select');
}
