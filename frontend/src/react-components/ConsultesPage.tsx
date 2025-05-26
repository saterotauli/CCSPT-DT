// Declaración global para compatibilidad con Web Speech API en TypeScript
// Evita error: Cannot find name 'SpeechRecognitionEvent'
declare global {
  interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
  }
}

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const ConsultesPage: React.FC = () => {
  const [pregunta, setPregunta] = useState('');
  const [resultados, setResultados] = useState<any[]>([]);
  const [sql, setSql] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Función para manejar el clic en la cabecera
  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  // Ordenar los resultados según la columna y dirección
  const sortedResultados = React.useMemo(() => {
    if (!sortColumn) return resultados;
    return [...resultados].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];
      // Orden numérico si ambos son números
      if (!isNaN(Number(aValue)) && !isNaN(Number(bValue))) {
        return sortDirection === 'asc' ? Number(aValue) - Number(bValue) : Number(bValue) - Number(aValue);
      }
      // Orden alfabético
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
      setResultados(Array.isArray(data.result) ? data.result : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para descargar Excel
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
    <div style={{ maxWidth: 700, margin: '32px auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 12px #0001', padding: 32 }}>
      <h2 style={{ marginBottom: 24 }}>Consultes en llenguatge natural</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <input
          type="text"
          placeholder="Ex: Dame todas las puertas cortafuegos del edificio A"
          value={pregunta}
          onChange={e => setPregunta(e.target.value)}
          style={{ flex: 1, padding: 10, fontSize: 16, borderRadius: 4, border: '1px solid #ccc' }}
          required
        />
        <button
          type="button"
          aria-label="Hablar"
          style={{ padding: '10px', fontSize: 20, borderRadius: 4, background: '#fff', color: '#1976d2', border: '1px solid #1976d2', cursor: 'pointer' }}
          onClick={() => {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SpeechRecognition) {
              alert('Tu navegador no soporta reconocimiento de voz.');
              return;
            }
            const recognition = new SpeechRecognition();
            recognition.lang = 'ca-ES';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;
            function normalizaEdificios(text: string): string {
              return text
                .replace(/\bce cu a\b/gi, 'CQA')
                .replace(/\bc q a\b/gi, 'CQA')
                .replace(/\bcua\b/gi, 'CQA')
                .replace(/\bcèqua\b/gi, 'CQA');
            }
            recognition.onresult = (event: SpeechRecognitionEvent) => {
              if (event.results && event.results[0] && event.results[0][0]) {
                let voiceText = event.results[0][0].transcript;
                voiceText = normalizaEdificios(voiceText);
                setPregunta(voiceText);
              }
            };

            recognition.onerror = (event: any) => {
              alert('Error en el reconocimiento de voz: ' + event.error);
            };
            recognition.start();
          }}
        >🎤</button>
        <button type="submit" disabled={loading} style={{ padding: '10px 20px', fontSize: 16, borderRadius: 4, background: '#1976d2', color: '#fff', border: 'none', cursor: 'pointer' }}>
          {loading ? 'Consultant...' : 'Consultar'}
        </button>
      </form>
      {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}
      {sql && (
        <div style={{ marginBottom: 16, fontSize: 13, color: '#555', background: '#f3f3f3', padding: 8, borderRadius: 4 }}>
          <b>SQL generat:</b> <code>{sql}</code>
        </div>
      )}
      {sortedResultados.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <button
            onClick={handleDownloadExcel}
            style={{ marginBottom: 10, padding: '8px 18px', borderRadius: 4, background: '#1976d2', color: '#fff', border: 'none', cursor: 'pointer', float: 'right' }}
          >
            Descargar Excel
          </button>
          <table style={{ borderCollapse: 'collapse', width: '100%', marginTop: 8 }}>
            <thead>
              <tr>
                {Object.keys(sortedResultados[0])
                  .filter((col) => col.toLowerCase() !== 'guid')
                  .map((col) => (
                    <th
                      key={col}
                      style={{ borderBottom: '2px solid #1976d2', padding: 8, textAlign: 'left', background: '#e3eefd', cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleSort(col)}
                    >
                      {col}
                      {sortColumn === col && (
                        <span style={{ marginLeft: 6, fontSize: 12 }}>
                          {sortDirection === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {sortedResultados.map((row, i) => (
                <tr key={i}>
                  {Object.entries(row)
                    .filter(([key]) => key.toLowerCase() !== 'guid')
                    .map(([key, val], j) => (
                      <td
  key={j}
  style={{
    borderBottom: '1px solid #eee',
    padding: 8,
    background: val == null ? '#ffcccc' : undefined,
    color: val == null ? '#a00' : undefined,
    fontWeight: val == null ? 'bold' : undefined
  }}
>
  {val == null ? 'null' : String(val)}
</td>
                    ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {sql && resultados.length === 0 && !loading && !error && (
        <div style={{ color: '#888', marginTop: 16 }}>Sense resultats.</div>
      )}
    </div>
  );
};

export default ConsultesPage;
