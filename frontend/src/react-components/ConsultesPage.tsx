import React, { useState } from 'react';
import { highlightByGuids } from './visor/ModelInformation';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import DownloadIcon from '@mui/icons-material/Download';

const ConsultesPage: React.FC = () => {
  const [pregunta, setPregunta] = useState('');
  const [resultados, setResultados] = useState<any[]>([]);
  const [sql, setSql] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<'todos' | 'solo-actual'>('todos');
  const [edificioActivo, setEdificioActivo] = useState<string>('');

  // Lista de edificios disponibles
  const buildings = [
    { label: "RAC Advanced", value: "RAC" },
    { label: "That OPEN", value: "TOC" },
    { label: "Albada", value: "ALB" },
    { label: "CQA", value: "CQA" },
    { label: "Mínimo", value: "MIN" },
    { label: "UDIAT", value: "UDI" },
  ];

  const handleDownloadExcel = () => {
    if (!resultados.length) return;
    const worksheet = XLSX.utils.json_to_sheet(resultados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Resultats');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, 'resultats_consulta.xlsx');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResultados([]);
    setSql('');
    try {
      const body: { pregunta: string; edificio?: string } = { pregunta };
      if (scope === 'solo-actual' && edificioActivo) {
        body.edificio = edificioActivo;
      }

      const response = await fetch('/api/consultes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      console.log('[ConsultesPage] Respuesta backend:', data);
      if (!response.ok) throw new Error(data.error || 'Error en la consulta');
      setSql(data.sql);
      setResultados(Array.isArray(data.result) ? data.result : []);
      
      // --- Highlight automático por GUID ---
      const guids = (Array.isArray(data.result) ? data.result : [])
        .map((row: any) => row.guid || row.GlobalId || row.globalid)
        .filter((g: any) => typeof g === 'string' && g.length > 0);
      console.log('[ConsultesPage] GUIDs extraídos:', guids);
      if (guids.length > 0) {
        console.log('[ConsultesPage] Llamando a highlightByGuids...');
        highlightByGuids(guids);
      } else {
        console.log('[ConsultesPage] No hay GUIDs para resaltar');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filtrado según el radio seleccionado
  const resultadosFiltrados = scope === 'solo-actual' && edificioActivo
    ? resultados.filter(r => r.ubicacio && r.ubicacio.substring(0, 3) === edificioActivo)
    : resultados;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header de Consultes */}
      <header style={{
        background: '#007EB0',
        color: '#fff',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #005a7e'
      }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 500 }}>Consultes IA</h1>
        <div style={{ fontSize: '14px', opacity: 0.9 }}>
          Consultes en llenguatge natural
        </div>
      </header>
      
      <div style={{ flex: 1, padding: 32, background: '#f8f9fa', overflow: 'auto' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 12px #0001', padding: 32 }}>
      <h2 style={{ marginBottom: 24 }}>Consultes en llenguatge natural</h2>
      
      <div style={{ marginBottom: 20, display: 'flex', gap: 24, alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
          <input
            type="radio"
            value="todos"
            checked={scope === 'todos'}
            onChange={() => setScope('todos')}
          />
          Tots els edificis
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
          <input
            type="radio"
            value="solo-actual"
            checked={scope === 'solo-actual'}
            onChange={() => setScope('solo-actual')}
          />
          Només edifici específic
        </label>
        {scope === 'solo-actual' && (
          <select
            value={edificioActivo}
            onChange={(e) => setEdificioActivo(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: 4, border: '1px solid #ccc', fontSize: 14 }}
          >
            <option value="">Selecciona edifici</option>
            {buildings.map(building => (
              <option key={building.value} value={building.value}>
                {building.label}
              </option>
            ))}
          </select>
        )}
        {scope === 'solo-actual' && !edificioActivo && (
          <span style={{ color: '#a00', fontSize: 13, marginLeft: 8 }}>Selecciona un edifici</span>
        )}
      </div>
      
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flex: 1, gap: 8 }}>
          <input
            type="text"
            placeholder="Pregunta sobre el modelo..."
            value={pregunta}
            onChange={e => setPregunta(e.target.value)}
            style={{ flex: 1, padding: 12, fontSize: 16, borderRadius: 4, border: '1px solid #ccc' }}
            required
          />
          <button type="submit" disabled={loading} style={{ padding: '12px 20px', fontSize: 16, borderRadius: 4, background: '#007EB0', color: '#fff', border: 'none', cursor: 'pointer' }}>
            {loading ? 'Consultando...' : 'Consulta'}
          </button>
        </form>
        <button
          type="button"
          onClick={handleDownloadExcel}
          disabled={resultadosFiltrados.length === 0}
          title="Descargar Excel"
          style={{
            background: 'none',
            border: 'none',
            cursor: resultados.length > 0 ? 'pointer' : 'not-allowed',
            padding: 8,
            opacity: resultados.length > 0 ? 1 : 0.4,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <DownloadIcon style={{ color: '#007EB0', fontSize: 28 }} />
        </button>
      </div>
      
      {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}
      
      {sql && (
        <div style={{ marginBottom: 16, fontSize: 13, color: '#555', background: '#f3f3f3', padding: 8, borderRadius: 4 }}>
          <b>SQL generado:</b> <code>{sql}</code>
        </div>
      )}
      
      {resultados.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h4 style={{ marginBottom: 12 }}>Resultados ({resultadosFiltrados.length})</h4>
          <div style={{ maxHeight: 500, overflowY: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  {Object.keys(resultados[0])
                    .filter((col) => col.toLowerCase() !== 'guid')
                    .map((col) => (
                      <th key={col} style={{ borderBottom: '2px solid #007EB0', padding: 8, textAlign: 'left', background: '#e3eefd' }}>{col}</th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {resultadosFiltrados.map((row, i) => (
                  <tr key={i}>
                    {Object.entries(row)
                      .filter(([key]) => key.toLowerCase() !== 'guid')
                      .map(([key, val], j) => (
                        <td
                          key={j}
                          style={{ borderBottom: '1px solid #eee', padding: 8, background: val == null ? '#ffcccc' : undefined, color: val == null ? '#a00' : undefined, fontWeight: val == null ? 'bold' : undefined }}
                        >
                          {val == null ? 'null' : String(val)}
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {sql && resultados.length === 0 && !loading && !error && (
        <div style={{ color: '#888', marginTop: 16 }}>Sense resultats.</div>
      )}
        </div>
      </div>
    </div>
  );
};

export default ConsultesPage;
