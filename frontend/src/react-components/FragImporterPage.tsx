import React, { useRef, useState } from "react";
//import * as OBC from "@thatopen/components";
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
  // Nuevo estado para el modal de resumen
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [updateSummary, setUpdateSummary] = useState<any[]>([]);

  const [actiusProcesados, setActiusProcesados] = useState<any[]>([]);
  
  
  const [status, setStatus] = useState<string>("");
  const [ifcSpaces, setIfcSpaces] = useState<HabitacionIFC[]>([]);
  const [sortColumn, setSortColumn] = useState<keyof HabitacionIFC | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sorting handler
  function handleSort(column: keyof HabitacionIFC) {
    setSortColumn((prev: keyof HabitacionIFC | null) => {
      if (prev === column) {
        setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'));
        return column;
      } else {
        setSortDirection('asc');
        return column;
      }
    });
  }

  // Calcular codis duplicados para la tabla
  const codiCounts = ifcSpaces.reduce((acc: Record<string, number>, h) => {
    if (h.codi) acc[h.codi] = (acc[h.codi] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("Leyendo archivo...");
    const arrayBuffer = await file.arrayBuffer();
    setStatus("Convirtiendo a .frag...");
    const serializer = new FRAGS.IfcImporter();
    serializer.wasm = { absolute: true, path: "https://unpkg.com/web-ifc@0.0.68/" };
    
    try {
      setStatus("Cargando modelo de fragmentos...");
      // 1. Inicializar FragmentsModels con el worker
      const workerUrl = "/worker.mjs";
      const fragments = new FRAGS.FragmentsModels(workerUrl);
      // 2. Cargar el modelo .frag (usando el archivo cargado)
      const model = await fragments.load(arrayBuffer, { modelId: "frag-upload" });
      setStatus("Modelo cargado. Extrayendo ifcSpaces...");
      // 3. Obtener los espacios (IFCSPACE)
      const spaces = await model.getItemsOfCategory("IFCSPACE");

      // 3b. Obtener las puertas (IFCDOOR)
      const doors = await model.getItemsOfCategory("IFCDOOR");
      const doorLocalIds = (
        await Promise.all(doors.map((item: any) => item.getLocalId()))
      ).filter((id: number | null) => id !== null) as number[];
      const doorData = await model.getItemsData(doorLocalIds, {
        attributesDefault: true,
        relations: {
          IsDefinedBy: { attributes: true, relations: true },
          IsTypedBy: { attributes: true, relations: true }
        }
      });

      // Procesar y mostrar solo guid, tipus y subtipus para puertas
      const puertasProcesadas = doorData.map((obj: any) => {
  let guid = obj.GlobalId || obj.globalId || obj.guid;
  if (!guid && obj.IsDefinedBy) {
    const psetWithGuid = obj.IsDefinedBy.find((pset: any) => pset._guid && pset._guid.value);
    if (psetWithGuid) guid = psetWithGuid._guid.value;
  }
  const tipus = "IFCDOOR";
  let subtipus = undefined;
  let ubicacio = undefined;
  let from_room = undefined;
  let to_room = undefined;
  let marca = undefined;

  if (obj.IsDefinedBy) {
    for (const pset of obj.IsDefinedBy) {
      if (Array.isArray(pset.HasProperties)) {
        for (const prop of pset.HasProperties) {
          const propName = prop.Name && 'value' in prop.Name ? prop.Name.value : undefined;
          const propValue = prop.NominalValue && 'value' in prop.NominalValue ? prop.NominalValue.value : undefined;
          if (!subtipus && (propName === 'CSPT_FM_Subtipus' || propName === 'subtipus')) subtipus = propValue;
          if (!ubicacio && (propName === 'CSPT_FM_HabitacioCodi' || propName === 'ubicacio')) ubicacio = propValue;
          if (!from_room && propName === 'FromRoom') from_room = propValue;
          if (!to_room && propName === 'ToRoom') to_room = propValue;
          if (!marca && propName === 'Marca') marca = propValue;
        }
      }
    }
  }

  // Si quieres buscar en IsTypedBy, como en sanitarios, añade aquí la lógica

  return { guid, tipus, subtipus, ubicacio, from_room, to_room, marca };
});

// Para actius
const actiusPuertas = puertasProcesadas.map(({ guid, tipus, subtipus, ubicacio }) => ({ guid, tipus, subtipus, ubicacio }));

// Para ifcdoor
const ifcDoors = puertasProcesadas.map(({ guid, from_room, to_room }) => ({ guid, from_room, to_room }));

// Para ifcdoor_fire: solo puertas con subtipus==='PortaTallafoc' y marca
const ifcDoorFire = puertasProcesadas
  .filter(p => p.subtipus === 'PortaTallafoc' && p.marca)
  .map(({ guid, marca }) => ({ guid, marca }));


      // Array para tabla ifcdoor_fire (limpio, sin subtipus ni marca)
      

      // 3c. Obtener los sanitarios (IFCSANITARYTERMINAL)
      const sanitaryTerminals = await model.getItemsOfCategory("IFCSANITARYTERMINAL");
      const sanitaryLocalIds = (
        await Promise.all(sanitaryTerminals.map((item: any) => item.getLocalId()))
      ).filter((id: number | null) => id !== null) as number[];
      const sanitaryData = await model.getItemsData(sanitaryLocalIds, {
        attributesDefault: true,
        relations: {
          IsDefinedBy: { attributes: true, relations: true },
          IsTypedBy: { attributes: true, relations: true }
        }
      });
      const sanitariosProcesados = sanitaryData.map((obj: any) => {
        let guid = obj.GlobalId || obj.globalId || obj.guid;
        if (!guid && obj.IsDefinedBy) {
          const psetWithGuid = obj.IsDefinedBy.find((pset: any) => pset._guid && pset._guid.value);
          if (psetWithGuid) guid = psetWithGuid._guid.value;
        }
        const tipus = "IFCSANITARYTERMINAL";
        let subtipus = undefined;
        let ubicacio = undefined;
        if (obj.IsDefinedBy) {
          for (const pset of obj.IsDefinedBy) {
            if (Array.isArray(pset.HasProperties)) {
              for (const prop of pset.HasProperties) {
                const propName = prop.Name && 'value' in prop.Name ? prop.Name.value : undefined;
                const propValue = prop.NominalValue && 'value' in prop.NominalValue ? prop.NominalValue.value : undefined;
                if (propName === 'CSPT_FM_Subtipus') {
                  subtipus = propValue;
                }
                if (propName === 'CSPT_FM_HabitacioCodi') {
                  ubicacio = propValue;
                }
              }
            }
          }
        }
        if (!subtipus && obj.IsTypedBy && obj.IsTypedBy.RelatingType && Array.isArray(obj.IsTypedBy.RelatingType.HasPropertySets)) {
          for (const typePset of obj.IsTypedBy.RelatingType.HasPropertySets) {
            if (Array.isArray(typePset.HasProperties)) {
              for (const prop of typePset.HasProperties) {
                const propName = prop.Name && 'value' in prop.Name ? prop.Name.value : undefined;
                const propValue = prop.NominalValue && 'value' in prop.NominalValue ? prop.NominalValue.value : undefined;
                if (propName === 'CSPT_FM_Subtipus') {
                  subtipus = propValue;
                }
                if (propName === 'CSPT_FM_HabitacioCodi' && !ubicacio) {
                  ubicacio = propValue;
                }
              }
            }
          }
        }
        return { guid, tipus, subtipus, ubicacio };
      });
      
      console.log('PUERTAS PROCESADAS:', puertasProcesadas);
      console.log('SANITARIOS PROCESADOS:', sanitariosProcesados);
      
      // Unir puertas y sanitarios 
      const allActius = [...puertasProcesadas, ...sanitariosProcesados];
      setActiusProcesados(allActius);
      
      // 4. Procesar espacios y extraer atributos
      const spaceLocalIds = spaces.map((item: any) => item._localId).filter((id: number | null) => id !== null);
      const spaceData = await model.getItemsData(spaceLocalIds, {
        attributesDefault: true,
        relations: {
          IsDefinedBy: { attributes: true, relations: true },
          IsTypedBy: { attributes: true, relations: true }
        }
      });
      const processedSpaces = spaceData.map((item: any) => {
        let dispositiu = '';
        let edifici = '';
        let planta = '';
        let departament = '';
        let id = '';
        let centre_cost = '';
        let guid = '';
        let area: number | undefined = undefined;
        const psets = item.IsDefinedBy as any[] | undefined;
        if (psets && Array.isArray(psets)) {
          // Buscar Guid en _guid.value del primer pset que lo tenga
          const psetWithGuid = psets.find(pset => pset._guid && pset._guid.value);
          if (psetWithGuid) {
            guid = psetWithGuid._guid.value;
          }
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
        return {
          codi: item.Name?.value || '',
          dispositiu,
          edifici,
          planta,
          departament,
          id,
          centre_cost,
          guid,
          area
        };
      });
      //console.log("Habitaciones extraídas del FRAG:", processedSpaces);
      setIfcSpaces(processedSpaces);
      setStatus("Procesamiento completado.");
    } catch (error: any) {
      setStatus(`Error: ${error.message || error}`);
    }
  };

  // También agrega esta función de diagnóstico antes de handleConfirmUpdate:

async function testHabitacionesAPI() {
  try {
    console.log('Probando endpoint de habitaciones...');
    
    // Prueba con un objeto simple
    const testData = [{
      guid: 'test-guid-123',
      codi: 'TEST-001',
      edifici: 'Edificio Test',
      planta: '1',
      departament: 'Test Dept',
      dispositiu: 'Test Device',
      id: 'TEST001',
      centre_cost: '1000',
      area: 25.5
    }];

    const response = await fetch('/api/ifcspace', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    console.log('Test response status:', response.status);
    const responseText = await response.text();
    console.log('Test response:', responseText);

    if (!response.ok) {
      console.error('Test failed:', responseText);
    } else {
      console.log('Test successful');
    }
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Reemplaza la función handleConfirmUpdate con esta versión corregida:

async function handleConfirmUpdate() {
  setStatus('Actualizando base de datos...');
  try {
    // Determina los valores comunes de tipus, subtipus y ubicacio
    let tipusComun = null;
    let subtipusComun = null;
    let ubicacioComun = null;
    if (actiusProcesados.length > 0) {
      tipusComun = actiusProcesados[0].tipus;
      subtipusComun = actiusProcesados[0].subtipus;
      ubicacioComun = actiusProcesados[0].ubicacio;
      // Verifica si todos los activos tienen el mismo valor para cada campo
      for (const a of actiusProcesados) {
        if (a.tipus !== tipusComun) tipusComun = null;
        if (a.subtipus !== subtipusComun) subtipusComun = null;
        if (a.ubicacio !== ubicacioComun) ubicacioComun = null;
      }
    }

    // Crea el array de activos solo con los campos especiales
    const actiusOptim = actiusProcesados.map(a => {
      const obj: any = { ...a };
      if (tipusComun !== null) delete obj.tipus;
      if (subtipusComun !== null) delete obj.subtipus;
      if (ubicacioComun !== null) delete obj.ubicacio;
      return obj;
    });

    // Construye el payload optimizado
    const payload: any = { actius: actiusOptim };
    if (tipusComun !== null) payload.tipus = tipusComun;
    if (subtipusComun !== null) payload.subtipus = subtipusComun;
    if (ubicacioComun !== null) payload.ubicacio = ubicacioComun;

    // Log para depuración
    console.log('Payload optimizado a subir:', payload);

    // Subir al backend
    const responseActius = await fetch('/api/actius', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    if (!responseActius.ok) {
      let errorMsg = 'Error al guardar actius en el backend';
      try {
        const errorData = await responseActius.json();
        errorMsg += ': ' + (errorData.error || JSON.stringify(errorData));
      } catch {}
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    setStatus('Actius actualizados correctamente.');

    // --- ACTUALIZAR HABITACIONES ---
    // Mapear los datos de ifcSpaces al formato esperado por la API
    const habitacionesPayload = ifcSpaces.map(space => ({
      guid: space.guid || '', // OBLIGATORIO
      // codi NO se envía, lo genera la base de datos
      dispositiu: space.dispositiu || '', // OBLIGATORIO
      edifici: space.edifici || '',       // OBLIGATORIO
      planta: space.planta || '',         // OBLIGATORIO
      departament: space.departament || '', // OBLIGATORIO
      id: space.id || '',                 // OBLIGATORIO
      centre_cost: space.centre_cost || '', // OBLIGATORIO
      area: typeof space.area === 'number' ? space.area : 0 // OBLIGATORIO
    }));

    console.log('Enviando habitaciones:', habitacionesPayload);
    console.log('Número de habitaciones a enviar:', habitacionesPayload.length);

    const responseEsp = await fetch('/api/ifcspace', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ ifcSpaces: habitacionesPayload, confirmDelete: true })
    });

    console.log('Response status habitaciones:', responseEsp.status);
    console.log('Response headers habitaciones:', responseEsp.headers);

    const responseText = await responseEsp.text();
    console.log('Response text habitaciones:', responseText);

    if (!responseEsp.ok) {
      let errorMsg = `Error al guardar habitaciones en el backend (${responseEsp.status})`;
      try {
        const errorData = JSON.parse(responseText);
        errorMsg += ': ' + (errorData.error || JSON.stringify(errorData));
      } catch {
        errorMsg += ': ' + responseText;
      }
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Intentar parsear la respuesta exitosa
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log('Response data habitaciones:', responseData);
    } catch {
      console.log('Response no es JSON válido, pero fue exitosa');
    }

    setStatus('Actius y habitaciones actualizados correctamente.');
    setSummaryModalOpen(false);
  } catch (err) {
    console.error('Error completo:', err);
    setStatus('Error actualizando actius, espacios o puertas cortafuego: ' + (err instanceof Error ? err.message : String(err)));
  }
}

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
      {/* Mostrar tabla de ifcSpaces si existen */}
      {ifcSpaces.length > 0 && (
        <>
           <button
             className="frag-table-update-btn"
             onClick={async () => {
               setStatus('Calculando cambios pendientes...');
               try {
                 // 1. Obtener resumen de cambios para espacios
                 const resEsp = await fetch('/api/ifcspace/summary', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify(ifcSpaces),
                 });
                 const summaryEsp = await resEsp.json();
                 // 2. Obtener resumen de cambios para activos
                 const resAct = await fetch('/api/actius/summary', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify(actiusProcesados),
                 });
                 const summaryAct = await resAct.json();

                 // 3. Preparar resumen para el modal
                 setUpdateSummary([
                   {
                     tipo: 'Espacios',
                     nuevos: summaryEsp.nuevos,
                     borrados: summaryEsp.borrados,
                     modificados: summaryEsp.modificados,
                     nuevosArr: summaryEsp.guidsNuevos,
                     borradosArr: summaryEsp.guidsDB?.filter((g: string) => !summaryEsp.guidsNuevos?.includes(g)),
                     modificadosArr: summaryEsp.modificadosArr
                   },
                   {
                     tipo: 'Activos',
                     nuevos: summaryAct.nuevos,
                     borrados: summaryAct.borrados,
                     modificados: summaryAct.modificados,
                     nuevosArr: summaryAct.guidsNuevos,
                     borradosArr: summaryAct.guidsDB?.filter((g: string) => !summaryAct.guidsNuevos?.includes(g)),
                     modificadosArr: summaryAct.modificadosArr
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
            actiusProcesados={actiusProcesados}
            ifcSpaces={ifcSpaces}
            onCancel={() => {
              setSummaryModalOpen(false);
               setStatus('Actualización cancelada por el usuario.');
             }}
             onConfirm={handleConfirmUpdate}
           />
          <h3>Habitaciones extraídas del FRAG</h3>
          <table className="frag-table">
            <thead>
              <tr>
                <th className="c-guid" onClick={() => handleSort('guid')} style={{cursor:'pointer'}}>
                  Guid {sortColumn === 'guid' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="c-codi" onClick={() => handleSort('codi')} style={{cursor:'pointer'}}>
                  Codi {sortColumn === 'codi' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="c-edifici" onClick={() => handleSort('edifici')} style={{cursor:'pointer'}}>
                  Edifici {sortColumn === 'edifici' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="c-planta" onClick={() => handleSort('planta')} style={{cursor:'pointer'}}>
                  Planta {sortColumn === 'planta' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="c-departament" onClick={() => handleSort('departament')} style={{cursor:'pointer'}}>
                  Departament {sortColumn === 'departament' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="c-dispositiu" onClick={() => handleSort('dispositiu')} style={{cursor:'pointer'}}>
                  Dispositiu {sortColumn === 'dispositiu' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="c-habitacioid" onClick={() => handleSort('id')} style={{cursor:'pointer'}}>
                  ID {sortColumn === 'id' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="c-centre_cost" onClick={() => handleSort('centre_cost')} style={{cursor:'pointer'}}>
                  CCost {sortColumn === 'centre_cost' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="c-area" onClick={() => handleSort('area')} style={{cursor:'pointer'}}>
                  Área(m²) {sortColumn === 'area' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                </th>
              </tr>
            </thead>
            <tbody>
              {[...ifcSpaces]
                .map((h, idx) => ({ ...h, _idx: idx }))
                .sort((a, b) => {
                  if (!sortColumn) return a._idx - b._idx;
                  let valA = a[sortColumn];
                  let valB = b[sortColumn];
                  // For undefined/null values, treat as empty string/zero
                  if (valA === undefined || valA === null) valA = '';
                  if (valB === undefined || valB === null) valB = '';
                  if (typeof valA === 'number' && typeof valB === 'number') {
                    return sortDirection === 'asc' ? valA - valB : valB - valA;
                  }
                  return sortDirection === 'asc'
                    ? String(valA).localeCompare(String(valB), undefined, { numeric: true })
                    : String(valB).localeCompare(String(valA), undefined, { numeric: true });
                })
                .map((h, idx) => {
                const isCodiDuplicate = h.codi && codiCounts[h.codi] > 1;
                return (
                  <tr key={h.guid || idx}>
                    <td className={"c-guid " + (h.guid ? "cell-noneditable" : "cell-empty")}>{h.guid || ''}</td>
                    <td className={"c-codi " + ((!h.codi ? "cell-empty " : "") + (isCodiDuplicate ? "cell-codi-duplicate" : "cell-noneditable"))}>{h.codi || ''}</td>
                    <td className="c-edifici">
                      <input
                        className={h.edifici ? "cell-editable" : "cell-empty cell-editable"}
                        value={h.edifici || ''}
                        onChange={e => {
                          const newIfcSpaces = [...ifcSpaces];
                          const newEdifici = e.target.value;
                          const codi = [newEdifici, newIfcSpaces[idx].planta || '', newIfcSpaces[idx].id || ''].filter(Boolean).join('-');
                          newIfcSpaces[idx] = { ...newIfcSpaces[idx], edifici: newEdifici, codi };
                          setIfcSpaces(newIfcSpaces);
                        }}
                      />
                    </td>
                    <td className="c-planta">
                      <input
                        className={h.planta ? "cell-editable" : "cell-empty cell-editable"}
                        value={h.planta || ''}
                        onChange={e => {
                          const newIfcSpaces = [...ifcSpaces];
                          const newPlanta = e.target.value;
                          newIfcSpaces[idx] = { ...newIfcSpaces[idx], planta: newPlanta, codi: [newIfcSpaces[idx].edifici || '', newPlanta, newIfcSpaces[idx].id || ''].filter(Boolean).join('-') };
                          setIfcSpaces(newIfcSpaces);
                        }}
                      />
                    </td>
                    <td className="c-departament">
                      <input
                        className={h.departament ? "cell-editable" : "cell-empty cell-editable"}
                        value={h.departament || ''}
                        onChange={e => {
                          const newIfcSpaces = [...ifcSpaces];
                          newIfcSpaces[idx] = { ...newIfcSpaces[idx], departament: e.target.value };
                          setIfcSpaces(newIfcSpaces);
                        }}
                      />
                    </td>
                    <td className="c-dispositiu">
                      <input
                        className={h.dispositiu ? "cell-editable" : "cell-empty cell-editable"}
                        value={h.dispositiu || ''}
                        onChange={e => {
                          const newIfcSpaces = [...ifcSpaces];
                          newIfcSpaces[idx] = { ...newIfcSpaces[idx], dispositiu: e.target.value };
                          setIfcSpaces(newIfcSpaces);
                        }}
                      />
                    </td>
                    <td className="c-habitacioid">
                      <input
                        className={h.id ? "cell-editable" : "cell-empty cell-editable"}
                        value={h.id || ''}
                        onChange={e => {
                          const newIfcSpaces = [...ifcSpaces];
                          const newId = e.target.value;
                          newIfcSpaces[idx] = { ...newIfcSpaces[idx], id: newId, codi: [newIfcSpaces[idx].edifici || '', newIfcSpaces[idx].planta || '', newId].filter(Boolean).join('-') };
                          setIfcSpaces(newIfcSpaces);
                        }}
                      />
                    </td>
                    <td className="c-centre_cost">
                      <input
                        className={h.centre_cost ? "cell-editable" : "cell-empty cell-editable"}
                        value={h.centre_cost || ''}
                        onChange={e => {
                          const newIfcSpaces = [...ifcSpaces];
                          newIfcSpaces[idx] = { ...newIfcSpaces[idx], centre_cost: e.target.value };
                          setIfcSpaces(newIfcSpaces);
                        }}
                      />
                    </td>
                    <td className={"c-area " + (h.area === undefined || h.area === null || isNaN(Number(h.area)) ? "cell-empty cell-readonly" : "cell-readonly") }>
                      {typeof h.area === 'number' && !isNaN(h.area) ? h.area.toFixed(2) : ''}
                    </td>
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