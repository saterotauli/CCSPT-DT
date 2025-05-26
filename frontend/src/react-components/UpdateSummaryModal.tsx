import React from "react";

interface UpdateSummary {
  tipo: 'Espacios' | 'Activos';
  nuevos: number;
  borrados: number;
  modificados: number;
  modificadosArr?: string[];
  nuevosArr?: string[];
  borradosArr?: string[];
}

interface UpdateSummaryModalProps {
  open: boolean;
  resumen: UpdateSummary[];
  actiusProcesados: any[];
  ifcSpaces: any[];
  onConfirm: () => void;
  onCancel: () => void;
}

const UpdateSummaryModal: React.FC<UpdateSummaryModalProps> = ({ open, resumen, actiusProcesados, ifcSpaces, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{ background: 'white', borderRadius: 8, padding: 24, minWidth: 400, maxWidth: 700 }}>
        <h2>Resumen de cambios a aplicar</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
          <thead>
            <tr>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Tipo</th>
              <th style={{ borderBottom: '1px solid #ccc' }}>Nuevos</th>
              <th style={{ borderBottom: '1px solid #ccc' }}>Borrados</th>
              <th style={{ borderBottom: '1px solid #ccc' }}>Procesados</th>
            </tr>
          </thead>
          <tbody>
            {resumen.map((r) => (
              <React.Fragment key={r.tipo}>
                <tr>
                  <td style={{ padding: '8px 0' }}>{r.tipo}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      style={{ fontWeight: 'bold', background: '#fff', border: '1px solid #aaa', borderRadius: 4, cursor: 'pointer', padding: '2px 10px' }}
                      onClick={() => {
                        if (r.tipo === 'Activos' && r.nuevos > 0 && r.nuevosArr && r.nuevosArr.length > 0) {
                          const datos = r.nuevosArr.map((guid: string) => {
                            const actiu = actiusProcesados.find((a: any) => a.guid === guid);
                            return actiu ? { guid: actiu.guid, tipus: actiu.tipus, subtipus: actiu.subtipus, ubicacio: actiu.ubicacio } : { guid, notFound: true };
                          });
                          console.log('Activos nuevos:', datos);
                        } else if (r.tipo === 'Espacios' && r.nuevos > 0 && r.nuevosArr && r.nuevosArr.length > 0) {
                          if (ifcSpaces && Array.isArray(ifcSpaces)) {
                            const espacios = ifcSpaces.filter((h: any) => (r.nuevosArr ?? []).includes(h.guid));
                            console.log('Espacios nuevos:', espacios);
                            if (espacios.length === 0) {
                              console.warn('No se encontraron coincidencias entre ifcSpaces y r.nuevosArr:', r.nuevosArr);
                              console.warn('Primeros ifcSpaces:', ifcSpaces.slice(0, 5));
                            }
                          } else {
                            console.warn('ifcSpaces no está definido correctamente:', ifcSpaces);
                          }
                        }
                      }}
                      title="Mostrar todos los datos en consola"
                    >
                      {r.nuevos}
                    </button>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      style={{ fontWeight: 'bold', background: '#fff', border: '1px solid #aaa', borderRadius: 4, cursor: 'pointer', padding: '2px 10px' }}
                      onClick={() => {
                        if (r.tipo === 'Activos' && r.borrados > 0 && r.borradosArr && r.borradosArr.length > 0) {
                          console.log('Activos borrados:', r.borradosArr);
                        } else if (r.tipo === 'Espacios' && r.borradosArr) {
                          console.log('Espacios borrados:', r.borradosArr);
                        }
                      }}
                      title="Mostrar todos los datos en consola"
                    >
                      {r.borrados}
                    </button>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      style={{ fontWeight: 'bold', background: '#fff', border: '1px solid #aaa', borderRadius: 4, cursor: 'pointer', padding: '2px 10px' }}
                      onClick={() => {
                        if (r.tipo === 'Activos') {
                          console.log('Activos procesados:', actiusProcesados);
                        } else if (r.tipo === 'Espacios') {
                          console.log('Espacios procesados:', ifcSpaces);
                        }
                      }}
                      title="Mostrar todos los datos en consola"
                    >
                      {r.tipo === 'Activos' ? actiusProcesados.length : r.tipo === 'Espacios' ? ifcSpaces.length : r.modificados}
                    </button>
                  </td>
                </tr>
                
              </React.Fragment>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ marginRight: 12 }}>Cancelar</button>
          <button onClick={onConfirm} style={{ background: '#388e3c', color: 'white' }}>Confirmar y actualizar</button>
        </div>
      </div>
    </div>
  );
};

export default UpdateSummaryModal;
