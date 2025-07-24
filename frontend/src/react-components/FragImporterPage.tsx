import React, { useRef, useState } from "react";
import * as FRAGS from "@thatopen/fragments";
import "./FragImporterPage.css";

import UpdateSummaryModal from "./UpdateSummaryModal";

interface HabitacionIFC {
  codi: string;
  dispositiu?: string;
  edifici?: string;
  planta?: string;
  departament?: string;
  id?: string;
  centre_cost?: string;
  guid?: string;
  area?: number;
}

const FragImporterPage: React.FC = () => {
  // Estados para el modal de resumen
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [updateSummary, setUpdateSummary] = useState<any[]>([]);
  const [status, setStatus] = useState<string>("");
  const [ifcSpaces, setIfcSpaces] = useState<HabitacionIFC[]>([]);
  const [sortColumn, setSortColumn] = useState<keyof HabitacionIFC | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sorting handler
  function handleSort(column: keyof HabitacionIFC) {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  }

  // Calcular codis duplicados para la tabla
  const codiCounts = ifcSpaces.reduce((acc: Record<string, number>, h) => {
    if (h.codi) acc[h.codi] = (acc[h.codi] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    console.log('[FragImporter] Archivo seleccionado:', file.name, 'Tipo:', file.type, 'Tamaño:', file.size);
    
    setStatus("Leyendo archivo...");
    const arrayBuffer = await file.arrayBuffer();
    
    // Detectar el tipo de archivo por extensión
    const fileName = file.name.toLowerCase();
    const isIfcFile = fileName.endsWith('.ifc');
    const isFragFile = fileName.endsWith('.frag');
    
    console.log('[FragImporter] Tipo de archivo detectado:', { isIfcFile, isFragFile });
    
    try {
      let model;
      
      if (isIfcFile) {
        // Por ahora, solo soportamos archivos .frag
        throw new Error('Los archivos IFC no están soportados actualmente. Por favor, usa archivos .frag');
        
      } else if (isFragFile) {
        // Procesar archivo FRAG directamente
        setStatus("Cargando modelo de fragmentos...");
        const workerUrl = "/worker.mjs";
        const fragments = new FRAGS.FragmentsModels(workerUrl);
        
        // Verificar que el worker se inicializó correctamente
        console.log('[FragImporter] FragmentsModels creado:', fragments);
        
        // Cargar el modelo .frag directamente
        model = await fragments.load(arrayBuffer, { modelId: "frag-upload" });
        
      } else {
        throw new Error(`Tipo de archivo no soportado: ${fileName}. Solo se admiten archivos .ifc y .frag`);
      }
      
      // Verificar que el modelo se cargó correctamente
      console.log('[FragImporter] Modelo cargado:', model);
      console.log('[FragImporter] Métodos disponibles en model:', Object.getOwnPropertyNames(Object.getPrototypeOf(model)));
      
      setStatus("Modelo cargado. Extrayendo ifcSpaces...");
      
      // Verificar si el método existe antes de llamarlo
      if (typeof model.getItemsOfCategories !== 'function') {
        throw new Error(`El método getItemsOfCategories no está disponible. Métodos disponibles: ${Object.getOwnPropertyNames(Object.getPrototypeOf(model)).join(', ')}`);
      }
      
      // Obtener los espacios (IFCSPACE)
      console.log('[FragImporter] Obteniendo elementos IFCSPACE...');
      const spacesResult = await model.getItemsOfCategories([/IFCSPACE/]);
      console.log('[FragImporter] Resultado de getItemsOfCategories para IFCSPACE:', spacesResult);
      
      const spaceLocalIds = spacesResult.IFCSPACE || [];
      console.log('[FragImporter] LocalIds de espacios encontrados:', spaceLocalIds);
      
      const spacesData = await model.getItemsData(spaceLocalIds, {
        attributesDefault: true,
        relations: {
          IsDefinedBy: { attributes: true, relations: true }
        }
      });
      console.log('[FragImporter] Datos de espacios obtenidos:', spacesData);
      
      // Logging siguiendo el ejemplo oficial
      spacesData.forEach((space, index) => {
        console.log(`\n=== ESPACIO ${index + 1} ===`);
        
        // 1. Mostrar todos los atributos
        console.log('ATRIBUTOS:', space);
        
        // 2. Mostrar property sets formateados (siguiendo el ejemplo oficial)
        if (space.IsDefinedBy && Array.isArray(space.IsDefinedBy)) {
          const formattedPsets: Record<string, Record<string, any>> = {};
          for (const pset of space.IsDefinedBy) {
            const { Name: psetName, HasProperties } = pset;
            if (!(psetName && 'value' in psetName && Array.isArray(HasProperties))) continue;
            const props: Record<string, any> = {};
            for (const prop of HasProperties) {
              const { Name, NominalValue } = prop;
              if (!(Name && 'value' in Name && NominalValue && 'value' in NominalValue)) continue;
              const name = Name.value;
              const nominalValue = NominalValue.value;
              if (!(name && nominalValue !== undefined)) continue;
              props[name] = nominalValue;
            }
            formattedPsets[psetName.value] = props;
          }
          console.log('PROPERTY SETS:', formattedPsets);
        }
      });




      // Procesar espacios después del logging detallado
      const processedSpaces = spacesData.map((item: any, index: number) => {
        let dispositiu = '';
        let edifici = '';
        let planta = '';
        let zona = '';
        let departament = '';
        let id = '';
        let centre_cost = '';
        let guid = '';
        let area: number | undefined = undefined;
        // 1. Intenta usar el GlobalId directo
        if (item.GlobalId) {
          guid = item.GlobalId;
        } else if (item.globalId) {
          guid = item.globalId;
        } else if (item.guid) {
          guid = item.guid;
        } else if (item._guid && item._guid.value) {
          guid = item._guid.value;
        }
        // 2. Si no, busca en los psets el IfcGUID
        const psets = item.IsDefinedBy as any[] | undefined;
        if (!guid && psets && Array.isArray(psets)) {
          const psetWithGuid = psets.find(pset => pset._guid && pset._guid.value);
          if (psetWithGuid) {
            guid = psetWithGuid._guid.value;
          }
        }
        if (psets && Array.isArray(psets)) {
          for (const pset of psets) {
            const hasProperties = pset.HasProperties;
            if (Array.isArray(hasProperties)) {
              for (const prop of hasProperties) {
                const propName = prop.Name && 'value' in prop.Name ? prop.Name.value : undefined;
                const propValue = prop.NominalValue && 'value' in prop.NominalValue ? prop.NominalValue.value : undefined;
                

                
                if (propName === 'CSPT_FM_HabitacioDispositiu' && propValue) dispositiu = propValue.toString();
                if (propName === 'CSPT_FM_HabitacioEdifici' && propValue) edifici = propValue.toString();
                if (propName === 'CSPT_FM_HabitacioPlanta' && propValue) planta = propValue.toString();
                if (propName === 'CSPT_FM_HabitacioDepartament' && propValue) departament = propValue.toString();
                if (propName === 'CSPT_FM_HabitacioID' && propValue) id = propValue.toString();
                if (propName === 'CSPT_FM_HabitacioCentreCost' && propValue) centre_cost = propValue.toString();
                // Extraer área si existe como propiedad (por nombre 'Área', 'Area', 'Superficie', etc)
                if ((propName === 'Área' || propName === 'Area') && propValue) {
                  const parsed = parseFloat(propValue);
                  if (!isNaN(parsed)) area = Math.round(parsed * 100) / 100;
                }
              }
            }
          }

        }
        // DEBUG: Mostrar el guid extraído para cada espacio
        if (!guid || typeof guid !== 'string' || guid.length !== 22) {
          console.warn('[FragImporter] GUID NO VÁLIDO extraído para espacio:', { Name: item.Name?.value, guid, item });
        } else {
  
        }
        return {
          codi: item.Name?.value || '',
          dispositiu,
          edifici,
          planta,
          zona,
          departament,
          id,
          centre_cost,
          guid,
          area,
        };
      });
      //console.log("Habitaciones extraídas del FRAG:", processedSpaces);
      setIfcSpaces(processedSpaces);
      setStatus("Procesamiento completado.");
    } catch (error: any) {
      console.error('[FragImporter] Error completo:', error);
      console.error('[FragImporter] Stack trace:', error.stack);
      setStatus(`Error: ${error.message || error}`);
    }
  };

  // Función para confirmar actualización
  async function handleConfirmUpdate() {
    setStatus('Actualizando base de datos...');
    try {
      // Actualizar habitaciones
      const habitacionesPayload = ifcSpaces.map(space => ({
        guid: space.guid || '',
        dispositiu: space.dispositiu || '',
        edifici: space.edifici || '',
        planta: space.planta || '',
        departament: space.departament || '',
        id: space.id || '',
        centre_cost: space.centre_cost || '',
        area: typeof space.area === 'number' ? space.area : 0
      }));

      const responseEsp = await fetch('/api/ifcspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ ifcSpaces: habitacionesPayload, confirmDelete: true })
      });

      if (!responseEsp.ok) {
        const errorText = await responseEsp.text();
        throw new Error(`Error al guardar habitaciones (${responseEsp.status}): ${errorText}`);
      }

      setStatus('Habitaciones actualizadas correctamente.');
      setSummaryModalOpen(false);
    } catch (err) {
      console.error('Error completo:', err);
      setStatus('Error actualizando: ' + (err instanceof Error ? err.message : String(err)));
    }
  }


  // Sort the spaces based on current sort settings
  const sortedSpaces = [...ifcSpaces].sort((a, b) => {
    if (!sortColumn) return 0;
    const aVal = a[sortColumn] || '';
    const bVal = b[sortColumn] || '';
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return 0;
  });

  return (
    <div className="frag-table-container">
      <h2>Cargar modelo FRAG</h2>
      <input
        type="file"
        accept=".frag"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      <div style={{ marginTop: 16 }}>{status}</div>
      
      {ifcSpaces.length > 0 && (
        <>
          <button
            className="frag-table-update-btn"
            onClick={async () => {
              setStatus('Calculando cambios pendientes...');
              try {
                const resEsp = await fetch('/api/ifcspace/summary', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(ifcSpaces),
                });
                const summaryEsp = await resEsp.json();
                setUpdateSummary([
                  {
                    tipo: 'Espacios',
                    nuevos: summaryEsp.nuevos,
                    borrados: summaryEsp.borrados,
                    modificados: summaryEsp.modificados,
                    nuevosArr: summaryEsp.guidsNuevos,
                    borradosArr: summaryEsp.guidsDB?.filter((g: string) => !summaryEsp.guidsNuevos?.includes(g)),
                    modificadosArr: summaryEsp.modificadosArr
                  }
                ]);
                setSummaryModalOpen(true);
                setStatus('Cambios pendientes calculados.');
              } catch (err: any) {
                setStatus('Error al calcular los cambios: ' + (err.message || err));
              }
            }}
          >
            Actualizar tabla habitacions en base de datos
          </button>

          <UpdateSummaryModal
            open={summaryModalOpen}
            resumen={updateSummary}
            actiusProcesados={[]}
            ifcSpaces={ifcSpaces}
            onCancel={() => {
              setSummaryModalOpen(false);
              setStatus('Actualización cancelada por el usuario.');
            }}
            onConfirm={handleConfirmUpdate}
          />

          <h3>Habitaciones importadas</h3>
          <table className="habitacions-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('codi')}>Codi</th>
                <th onClick={() => handleSort('edifici')}>Edifici</th>
                <th onClick={() => handleSort('planta')}>Planta</th>
                <th onClick={() => handleSort('departament')}>Departament</th>
                <th onClick={() => handleSort('id')}>ID</th>
                <th onClick={() => handleSort('centre_cost')}>Centre Cost</th>
                <th>GUID</th>
                <th>Area</th>
              </tr>
            </thead>
            <tbody>
              {sortedSpaces.map((h, idx) => {
                const originalIdx = ifcSpaces.findIndex(space => space.guid === h.guid);
                const isDuplicateCodi = h.codi && codiCounts[h.codi] > 1;
                return (
                  <tr key={h.guid || idx}>
                    <td className="c-codi">
                      <input
                        className={`${h.codi ? "cell-editable" : "cell-empty cell-editable"} ${isDuplicateCodi ? "cell-duplicate" : ""}`}
                        value={h.codi || ''}
                        onChange={e => {
                          const newSpaces = [...ifcSpaces];
                          newSpaces[originalIdx] = { ...newSpaces[originalIdx], codi: e.target.value };
                          setIfcSpaces(newSpaces);
                        }}
                      />
                    </td>
                    <td className="c-edifici">
                      <input
                        className={h.edifici ? "cell-editable" : "cell-empty cell-editable"}
                        value={h.edifici || ''}
                        onChange={e => {
                          const newSpaces = [...ifcSpaces];
                          newSpaces[originalIdx] = { ...newSpaces[originalIdx], edifici: e.target.value };
                          setIfcSpaces(newSpaces);
                        }}
                      />
                    </td>
                    <td className="c-planta">
                      <input
                        className={h.planta ? "cell-editable" : "cell-empty cell-editable"}
                        value={h.planta || ''}
                        onChange={e => {
                          const newSpaces = [...ifcSpaces];
                          newSpaces[originalIdx] = { ...newSpaces[originalIdx], planta: e.target.value };
                          setIfcSpaces(newSpaces);
                        }}
                      />
                    </td>
                    <td className="c-departament">
                      <input
                        className={h.departament ? "cell-editable" : "cell-empty cell-editable"}
                        value={h.departament || ''}
                        onChange={e => {
                          const newSpaces = [...ifcSpaces];
                          newSpaces[originalIdx] = { ...newSpaces[originalIdx], departament: e.target.value };
                          setIfcSpaces(newSpaces);
                        }}
                      />
                    </td>
                    <td className="c-id">
                      <input
                        className={h.id ? "cell-editable" : "cell-empty cell-editable"}
                        value={h.id || ''}
                        onChange={e => {
                          const newSpaces = [...ifcSpaces];
                          newSpaces[originalIdx] = { ...newSpaces[originalIdx], id: e.target.value };
                          setIfcSpaces(newSpaces);
                        }}
                      />
                    </td>
                    <td className="c-centre_cost">
                      <input
                        className={h.centre_cost ? "cell-editable" : "cell-empty cell-editable"}
                        value={h.centre_cost || ''}
                        onChange={e => {
                          const newSpaces = [...ifcSpaces];
                          newSpaces[originalIdx] = { ...newSpaces[originalIdx], centre_cost: e.target.value };
                          setIfcSpaces(newSpaces);
                        }}
                      />
                    </td>
                    <td className="c-guid cell-noneditable">{h.guid || ''}</td>
                    <td className="c-area cell-noneditable">{h.area || ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};

export default FragImporterPage;