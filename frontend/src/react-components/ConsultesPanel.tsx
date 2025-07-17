import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';


interface ConsultesPanelProps {
  onSelectGuids?: (guids: string[] | string) => void;
  edificioActual?: string;
}

const ConsultesPanel: React.FC<ConsultesPanelProps> = ({ onSelectGuids, edificioActual }) => {
  const [pregunta, setPregunta] = useState('');
  const [resultados, setResultados] = useState<any[]>([]);
  const [sql, setSql] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  const sortedResultados = useMemo(() => {
    if (!sortColumn) return resultados;
    return [...resultados].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];
      if (!isNaN(Number(aValue)) && !isNaN(Number(bValue))) {
        return sortDirection === 'asc' ? Number(aValue) - Number(bValue) : Number(bValue) - Number(aValue);
      }
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [resultados, sortColumn, sortDirection]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResultados([]);
    setSql('');
    try {
      const response = await fetch('/api/consultes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pregunta })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error en la consulta');
      setSql(data.sql);
      let resultadosFiltrados = Array.isArray(data.result) ? data.result : [];
      // Filtra SIEMPRE por edificio si hay uno cargado
      if (edificioActual) {
        const normalize = (str: string) => str
          .toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita tildes
          .replace(/\s+/g, ' ').trim();
        const edifFiltro = normalize(edificioActual); // edificioActual es el value del modelo
        // Solo aplicar filtro si existe campo edifici o edificio en los resultados
        if (resultadosFiltrados.some((r: any) => r.edifici || r.edificio)) {
          resultadosFiltrados = resultadosFiltrados.filter((r: any) => {
            const edifRaw = r.edifici || r.edificio || '';
            const edif = normalize(edifRaw);
            const match = edif === edifFiltro;
            console.log('[Filtro edificio]', {
              edifRaw,
              edifNormalizado: edif,
              valueSeleccionado: edificioActual,
              valueNormalizado: edifFiltro,
              match
            });
            return match;
          });
        }
      }
      setResultados(resultadosFiltrados);
      // Selección automática múltiple si hay resultados con guid
      if (onSelectGuids && Array.isArray(resultadosFiltrados)) {
        const guids = resultadosFiltrados.map((r: any) => r.guid).filter(Boolean);
        if (guids.length > 0) onSelectGuids(guids);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = () => {
    if (!sortedResultados.length) return;
    const worksheet = XLSX.utils.json_to_sheet(sortedResultados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Resultats');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, 'resultats.xlsx');
  };

  return (
    <div style={{ width: '100%' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          type="text"
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
          placeholder="Ej: Dame todas las puertas cortafuegos del edificio A"
          style={{ flex: 1, padding: 8, fontSize: 15, borderRadius: 4, border: '1px solid #444', background: '#181818', color: '#fff' }}
          required
        />
        <button type="submit" disabled={loading} style={{ padding: '8px 14px', fontSize: 15, borderRadius: 4, background: '#007EB0', color: '#fff', border: 'none', cursor: 'pointer' }}>
          {loading ? 'Consultando...' : 'Consultar'}
        </button>
      </form>
      {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
      {sql && (
        <div style={{ marginBottom: 10, fontSize: 12, color: '#bbb', background: '#181818', padding: 6, borderRadius: 4 }}>
          <b>SQL generado:</b> <code>{sql}</code>
        </div>
      )}
      {sortedResultados.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', marginTop: 4, fontSize: 14 }}>
            <thead>
              <tr>
                {Object.keys(sortedResultados[0])
                  .filter((col) => col.toLowerCase() !== 'guid')
                  .map((col) => (
                    <th
                      key={col}
                      style={{ borderBottom: '2px solid #007EB0', padding: 6, textAlign: 'left', background: '#222', cursor: 'pointer', userSelect: 'none', color: '#fff' }}
                      onClick={() => handleSort(col)}
                    >
                      {col}
                      {sortColumn === col && (
                        <span style={{ marginLeft: 6, fontSize: 11 }}>
                          {sortDirection === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </th>
                  ))}
                {onSelectGuids && (
                  <th style={{ borderBottom: '2px solid #007EB0', padding: 6, background: '#222' }} />
                )}
              </tr>
            </thead>
            <tbody>
              {sortedResultados.map((row, i) => {
                const guid = row.guid;
                return (
                  <tr
                    key={i}
                    style={onSelectGuids && guid ? { cursor: 'pointer', background: '#222' } : undefined}
                    onClick={onSelectGuids && guid ? () => onSelectGuids(guid) : undefined}
                  >
                    {Object.entries(row)
                      .filter(([key]) => key.toLowerCase() !== 'guid')
                      .map(([key, val], j) => (
                        <td
                          key={j}
                          style={{
                            borderBottom: '1px solid #007EB0',
                            padding: 6,
                            background: val == null ? '#ffcccc' : undefined,
                            color: val == null ? '#a00' : '#fff',
                            fontWeight: val == null ? 'bold' : undefined
                          }}
                        >
                          {val == null ? 'null' : String(val)}
                        </td>
                      ))}
                    {onSelectGuids && guid && (
                      <td style={{ padding: 6, textAlign: 'center', width: 32 }}>
                        <span title="Seleccionar en visor" style={{ color: '#ffd700', fontSize: 18, cursor: 'pointer' }} onClick={e => { e.stopPropagation(); onSelectGuids(guid); }}>★</span>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {sql && resultados.length === 0 && !loading && !error && (
        <div style={{ color: '#888', marginTop: 10 }}>Sin resultados.</div>
      )}
    </div>
  );
};

export default ConsultesPanel;
