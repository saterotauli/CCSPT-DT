import React, { useState, useRef } from 'react';
import * as FRAGS from '@thatopen/fragments';
import './FragImporterPage.css';

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

interface ActiuIFC {
  guid: string;
  tipus: string;
  subtipus: string;
  edifici: string;
  planta: string;
  zona: string;
  ubicacio: string;
}

const FragImporterPage: React.FC = () => {
  const [searchDept, setSearchDept] = useState<string>('');
  // Estado para el popup de tabla detallada
  const [tablePopupOpen, setTablePopupOpen] = useState(false);
  const [actiusPopupOpen, setActiusPopupOpen] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [ifcSpaces, setIfcSpaces] = useState<HabitacionIFC[]>([]);
  const [ifcDoors, setIfcDoors] = useState<ActiuIFC[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      
      // Obtener puertas (IFCDOOR)
      const doorCategories = await model.getItemsOfCategories([/IFCDOOR/]);
      const doorLocalIds = Object.values(doorCategories).flat();
      console.log('[FragImporter] LocalIds de puertas encontrados:', doorLocalIds);
      
      const doorsData = await model.getItemsData(doorLocalIds, {
        attributesDefault: true,
        relations: {
          IsDefinedBy: { attributes: true, relations: true }
        }
      });
      console.log('[FragImporter] Datos de puertas obtenidos:', doorsData);
      
      // Logging SOLO para puertas (IFCDOOR)
      doorsData.forEach((item: any, index: number) => {
        console.log(`\n=== PUERTA (IFCDOOR) ${index + 1} ===`);
        // 1. Mostrar todos los atributos
        console.log('ATRIBUTOS:', item);
        // 2. Mostrar property sets formateados
        if (item.IsDefinedBy && Array.isArray(item.IsDefinedBy)) {
          const formattedPsets: Record<string, Record<string, any>> = {};
          for (const pset of item.IsDefinedBy) {
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
      const processedSpaces = spacesData.map((item: any) => {
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
      
      // Procesar puertas después del logging detallado
      const processedDoors = doorsData.map((item: any) => {
        let guid = '';
        let tipus = 'IFCDOOR';
        let subtipus = '';
        let edifici = '';
        let planta = '';
        let zona = '';
        let ubicacio = '';
        
        // Extraer GUID
        if (item.GlobalId) {
          guid = item.GlobalId;
        } else if (item.globalId) {
          guid = item.globalId;
        } else if (item.guid) {
          guid = item.guid;
        } else if (item._guid && item._guid.value) {
          guid = item._guid.value;
        }
        
        // Extraer propiedades de los psets
        const psets = item.IsDefinedBy as any[] | undefined;
        if (psets && Array.isArray(psets)) {
          for (const pset of psets) {
            const hasProperties = pset.HasProperties;
            if (Array.isArray(hasProperties)) {
              for (const prop of hasProperties) {
                const propName = prop.Name && 'value' in prop.Name ? prop.Name.value : undefined;
                const propValue = prop.NominalValue && 'value' in prop.NominalValue ? prop.NominalValue.value : undefined;
                
                if (propName === 'CSPT_FM_Subtipus' && propValue) subtipus = propValue.toString();
                if (propName === 'CSPT_FM_HabitacioCodi' && propValue) ubicacio = propValue.toString();
                if (propName === 'CSPT_FM_HabitacioEdifici' && propValue) edifici = propValue.toString();
                if (propName === 'CSPT_FM_HabitacioPlanta' && propValue) planta = propValue.toString();
                if (propName === 'CSPT_FM_HabitacioZona' && propValue) zona = propValue.toString();
              }
            }
          }
        }
        
        // Extraer edifici, planta y zona a partir de ubicacio si tiene el formato esperado
        if (ubicacio && typeof ubicacio === 'string') {
          const parts = ubicacio.split('-');
          if (parts.length >= 3) {
            edifici = parts[0].slice(0, 3);
            planta = parts[1].slice(0, 3);
            zona = parts[2].slice(0, 3);
          }
        }
        return {
          guid: guid || '',
          tipus,
          subtipus,
          edifici,
          planta,
          zona,
          ubicacio
        };
      });
      
      setIfcSpaces(processedSpaces);
      setIfcDoors(processedDoors);
      setStatus(`Procesamiento completado. ${processedSpaces.length} habitaciones y ${processedDoors.length} puertas importadas.`);
    } catch (error: any) {
      console.error('[FragImporter] Error completo:', error);
      console.error('[FragImporter] Stack trace:', error.stack);
      setStatus(`Error: ${error.message || error}`);
    }
  };

  // Función para actualizar base de datos de habitaciones
  async function handleUpdateDatabase() {
    setStatus('Actualizando base de datos...');
    try {
      // Actualizar habitaciones
      const habitacionesPayload = ifcSpaces.map((space: HabitacionIFC) => ({
        guid: space.guid || '',
        codi: space.codi || '',
        edifici: space.edifici || '',
        planta: space.planta || '',
        departament: space.departament || '',
        dispositiu: space.dispositiu || '',
        id: space.id || '',
        centre_cost: space.centre_cost || '',
        area: space.area || 0
      }));

      const responseEsp = await fetch('/api/ifcspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(habitacionesPayload)
      });

      if (!responseEsp.ok) {
        const errorText = await responseEsp.text();
        throw new Error(`Error al guardar habitaciones (${responseEsp.status}): ${errorText}`);
      }

      setStatus('Habitaciones actualizadas correctamente.');
    } catch (err) {
      console.error('Error completo:', err);
      setStatus('Error: ' + (err instanceof Error ? err.message : String(err)));
    }
  }
  
  // Función para actualizar base de datos de actius (puertas)
  async function handleUpdateActius() {
    setStatus('Actualizando tabla actius...');
    try {
      const actiusPayload = ifcDoors.map((door: ActiuIFC) => ({
        guid: door.guid || '',
        tipus: door.tipus || '',
        subtipus: door.subtipus || '',
        edifici: door.edifici || '',
        planta: door.planta || '',
        zona: door.zona || '',
        ubicacio: door.ubicacio || ''
      }));

      const responseActius = await fetch('/api/actius', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actius: actiusPayload })
      });

      if (!responseActius.ok) {
        const errorText = await responseActius.text();
        throw new Error(`Error al guardar actius (${responseActius.status}): ${errorText}`);
      }

      setStatus('Actius actualizados correctamente.');
    } catch (err) {
      console.error('Error completo:', err);
      setStatus('Error: ' + (err instanceof Error ? err.message : String(err)));
    }
  }



  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header de Frag Importer */}
      <header style={{
        background: '#007EB0',
        color: '#fff',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #005a7e'
      }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 500 }}>Importador FRAG</h1>
        <div style={{ fontSize: '14px', opacity: 0.9 }}>
          Carrega i processa models de fragments
        </div>
      </header>
      
      <div style={{ flex: 1, padding: 32, background: '#f8f9fa', overflow: 'auto' }}>
        <div className="frag-table-container" style={{ maxWidth: 1200, margin: '0 auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 12px #0001', padding: 32 }}>
      <h2>Cargar modelo FRAG</h2>
      <input
        type="file"
        accept=".frag"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      <div style={{ marginTop: 16 }}>{status}</div>
      
      {(ifcSpaces.length > 0 || ifcDoors.length > 0) && (
        <>
          <h3>Resumen de elementos importados</h3>
          
          {ifcSpaces.length > 0 && (
            <div style={{ 
              backgroundColor: '#f8f9fa', 
              border: '1px solid #dee2e6', 
              borderRadius: '8px', 
              padding: '20px', 
              marginBottom: '20px' 
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '15px'
              }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#495057' }}>
                  📋 IFCSPACE - {ifcSpaces.length} elementos
                </div>
                <button
                  onClick={() => setTablePopupOpen(true)}
                  style={{
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Ver detalles
                </button>
              </div>
              <div style={{ fontSize: '14px', color: '#6c757d' }}>
                Habitaciones extraídas del archivo FRAG
              </div>
            </div>
          )}
          
          {ifcDoors.length > 0 && (
            <div style={{ 
              backgroundColor: '#f8f9fa', 
              border: '1px solid #dee2e6', 
              borderRadius: '8px', 
              padding: '20px', 
              marginBottom: '20px' 
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '15px'
              }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#495057' }}>
                  🚪 IFCDOOR - {ifcDoors.length} elementos
                </div>
                <button
                  onClick={() => setActiusPopupOpen(true)}
                  style={{
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Ver detalles
                </button>
              </div>
              <div style={{ fontSize: '14px', color: '#6c757d' }}>
                Puertas extraídas del archivo FRAG
              </div>
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '10px' }}>
            {ifcSpaces.length > 0 && (
              <button
                onClick={handleUpdateDatabase}
                style={{
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                Actualizar tabla habitacions
              </button>
            )}
            {ifcDoors.length > 0 && (
              <button
                onClick={handleUpdateActius}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                Actualizar tabla actius
              </button>
            )}
          </div>
        </>
      )}
      
      {tablePopupOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px',
            maxWidth: '95vw',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '1px solid #dee2e6',
              paddingBottom: '10px'
            }}>
              <h3 style={{ margin: 0 }}>Habitaciones importadas ({ifcSpaces.length})</h3>
              <button
                onClick={() => setTablePopupOpen(false)}
                style={{
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                ✕ Cerrar
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5' }}>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Codi</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Edifici</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Planta</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Departament</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>ID</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Centre Cost</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>GUID</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Area</th>
                  </tr>
                </thead>
                <tbody>
                  {ifcSpaces.map((space: HabitacionIFC, index: number) => (
                    <tr key={index}>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>{space.codi}</td>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>{space.edifici}</td>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>{space.planta}</td>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>{space.departament}</td>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>{space.id}</td>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>{space.centre_cost}</td>
                      <td style={{ border: '1px solid #ddd', padding: '4px', fontSize: '10px' }}>{space.guid}</td>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>{space.area}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal popup para tabla de actius */}
      {actiusPopupOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px',
            maxWidth: '95vw',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '1px solid #dee2e6',
              paddingBottom: '10px'
            }}>
              <h3 style={{ margin: 0 }}>Puertas importadas ({ifcDoors.length})</h3>
              <button
                onClick={() => setActiusPopupOpen(false)}
                style={{
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                ✕ Cerrar
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5' }}>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>GUID</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Tipus</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Subtipus</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Edifici</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Planta</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Zona</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>Ubicacio</th>
                  </tr>
                </thead>
                <tbody>
                  {ifcDoors.map((door: ActiuIFC, index: number) => (
                    <tr key={index}>
                      <td style={{ border: '1px solid #ddd', padding: '4px', fontSize: '10px' }}>{door.guid}</td>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>{door.tipus}</td>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>{door.subtipus}</td>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>{door.edifici}</td>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>{door.planta}</td>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>{door.zona}</td>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>{door.ubicacio}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};

export default FragImporterPage;