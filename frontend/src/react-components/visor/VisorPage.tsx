import React from "react";
import ModelLoader from "./ModelLoader";
import ConsultaBox from "./ConsultaBox";
import ElementInfoPanel from "./ElementInfoPanel";
import DisciplineFilter from "./DisciplineFilter";
import * as OBC from "@thatopen/components";
import "./visor3d.css";

const buildings = [
  { label: "RAC Advanced", value: "RAC", file: "CCSPT-RAC-M3D-AS.frag" },
  { label: "That OPEN", value: "TOC", file: "CCSPT-TOC-M3D-AS.frag" },
  { label: "Albada", value: "ALB", file: "CCSPT-ALB-M3D-AS.frag" },
  { label: "CQA", value: "CQA", file: "CCSPT-CQA-M3D-AS.frag" },
  { label: "Mínimo", value: "MIN", file: "CCSPT-MIN-M3D-AS.frag" },
  { label: "UDIAT", value: "UDI", file: "CCSPT-UDI-M3D-AS.frag" },
  { label: "VII Centenari", value: "VII", file: "CCSPT-VII-M3D-AS.frag" },  
];

const DISCIPLINES = [
  { code: "HVAC", name: "Climatització", icon: "HVAC.png" },
  { code: "FON", name: "Fontaneria", icon: "FON.png" },
  { code: "GAS", name: "Gasos Medicinals", icon: "GAS.png" },
  { code: "SEG", name: "Seguretat", icon: "SEG.png" },
  { code: "TUB", name: "Tub Pneumàtic", icon: "TUB.png" },
  { code: "SAN", name: "Sanejament", icon: "SAN.png" },
  { code: "ELE", name: "Electricitat", icon: "ELE.png" },
  { code: "TEL", name: "Telecomunicacions", icon: "TEL.png" }
];

const VisorPage: React.FC = () => {
  const [searchDept, setSearchDept] = React.useState<string>('');
  const [searchScope, setSearchScope] = React.useState<'todos' | 'solo-actual'>('todos');
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const [isSearching, setIsSearching] = React.useState<boolean>(false);
  const [selectedDept, setSelectedDept] = React.useState<string>('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = React.useState<boolean>(false);
  const [selectedBuilding, setSelectedBuilding] = React.useState<string>("");
  const [selectedDiscipline, setSelectedDiscipline] = React.useState<string>("");
  const [isBuildingDropdownOpen, setIsBuildingDropdownOpen] = React.useState<boolean>(false);
  const [isDisciplineDropdownOpen, setIsDisciplineDropdownOpen] = React.useState<boolean>(false);
  const [consultaHeight, setConsultaHeight] = React.useState<number>(30); // Porcentaje de altura para Consulta IA
  const [isResizing, setIsResizing] = React.useState<boolean>(false);
  
  // Estado para los componentes de ThatOpen y su inicialización
  const [components, setComponents] = React.useState<OBC.Components | null>(null);
  const [isInitialized, setIsInitialized] = React.useState<boolean>(false);

  // Encontrar el archivo del edificio seleccionado
  const selectedBuildingFile = buildings.find(b => b.value === selectedBuilding)?.file || "";

  // Cerrar dropdowns y lista de búsqueda al hacer clic fuera
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-building-dropdown]')) {
        setIsBuildingDropdownOpen(false);
      }
      if (!target.closest('[data-discipline-dropdown]')) {
        setIsDisciplineDropdownOpen(false);
      }
      if (!target.closest('[data-search-dept]')) {
        setSearchResults([]);
        setIsSearchDropdownOpen(false);
      }
    };

    if (isBuildingDropdownOpen || isDisciplineDropdownOpen || isSearchDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isBuildingDropdownOpen, isDisciplineDropdownOpen, searchResults.length]);

  // Callback para recibir los componentes desde ModelLoader
  const handleComponentsReady = React.useCallback((comps: OBC.Components | null, initialized: boolean) => {
    console.log("VisorPage: handleComponentsReady ejecutado:", {
      components: !!comps,
      initialized
    });
    setComponents(comps);
    setIsInitialized(initialized);
  }, []);

  // Manejo del redimensionado del divisor
  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const container = document.getElementById('central-column');
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const newConsultaHeight = Math.max(20, Math.min(70, ((rect.height - relativeY) / rect.height) * 100));
      
      setConsultaHeight(newConsultaHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing]);

  // Función para manejar cambios en el input de búsqueda
  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchDept(value);
    
    // Limpiar selección si se modifica el texto
    if (selectedDept && value !== selectedDept) {
      setSelectedDept('');
    }
    
    // No buscar hasta tener al menos 3 caracteres
    if (value.trim().length < 3) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    
    try {
      // Construir URL con parámetros
      let url = `/api/ifcspace/search?departament=${encodeURIComponent(value)}`;
      if (searchScope === 'solo-actual' && selectedBuilding) {
        url += `&edificio=${encodeURIComponent(selectedBuilding)}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) {
        console.error('Error en la búsqueda:', res.status, res.statusText);
        setSearchResults([]);
        return;
      }
      const data = await res.json();
      
      // Extraer departamentos únicos
      const departamentosUnicos = Array.from(
        new Set(data.map((item: any) => item.departament).filter(Boolean))
      ).sort();
      
      setSearchResults(departamentosUnicos);
      
      const scopeText = searchScope === 'solo-actual' && selectedBuilding 
        ? `en edificio ${selectedBuilding}` 
        : 'en tots els edificis';
      console.log(`Resultados de búsqueda para departamento "${value}" ${scopeText} (${data.length} encontrados):`);
      data.forEach((item: any) => {
        console.log(`Codi: ${item.codi}, Dispositiu: ${item.dispositiu ?? 'N/A'}, Edifici: ${item.edifici}`);
      });
    } catch (err) {
      console.error('Error en la búsqueda:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Función para manejar el click en el icono de ojo
  const handleViewClick = async () => {
    if (!selectedDept) return;
    
    try {
      // Obtener todos los elementos del departamento seleccionado
      let url = `/api/ifcspace/search?departament=${encodeURIComponent(selectedDept)}`;
      if (searchScope === 'solo-actual' && selectedBuilding) {
        url += `&edificio=${encodeURIComponent(selectedBuilding)}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) {
        console.error('Error al obtener elementos del departamento:', res.status);
        return;
      }
      const elements = await res.json();
      
      if (elements.length === 0) {
        alert('No se encontraron elementos para este departamento');
        return;
      }
      
      // Extraer edificios únicos de los elementos
      const edificiosEncontrados = Array.from(
        new Set(elements.map((item: any) => item.edifici).filter(Boolean))
      ) as string[];
      
      console.log('Edificios encontrados:', edificiosEncontrados);
      console.log('Edificio actualmente seleccionado:', selectedBuilding);
      
      // Si no hay modelo cargado o hay múltiples edificios, preguntar cuál cargar
      let edificioACargar = '';
      
      if (edificiosEncontrados.length > 1) {
        // Múltiples edificios: preguntar al usuario
        const opciones = edificiosEncontrados.map((ed, i) => `${i + 1}. ${ed}`).join('\n');
        const seleccion = prompt(`Se encontraron elementos en múltiples edificios:\n${opciones}\n\nIngresa el número del edificio que quieres abrir:`);
        const indice = parseInt(seleccion || '0') - 1;
        if (indice >= 0 && indice < edificiosEncontrados.length) {
          edificioACargar = edificiosEncontrados[indice];
        } else {
          alert('Selección inválida');
          return;
        }
      } else {
        edificioACargar = edificiosEncontrados[0];
      }
      
      // Si el edificio a cargar no es el actual, cambiar la selección
      if (edificioACargar !== selectedBuilding) {
        console.log(`Cambiando edificio de ${selectedBuilding} a ${edificioACargar}`);
        setSelectedBuilding(edificioACargar);
        // El modelo se cargará automáticamente por el efecto de ModelLoader
      }
      
      // Filtrar elementos del edificio seleccionado
      const elementosDelEdificio = elements.filter((item: any) => item.edifici === edificioACargar);
      const guids = elementosDelEdificio.map((item: any) => item.guid).filter(Boolean);
      
      console.log(`\n📊 === DATOS DE LA BASE DE DATOS ===`);
      console.log(`Elementos del edificio ${edificioACargar}:`, elementosDelEdificio.length);
      console.log(`GUIDs extraídos:`, guids.length);
      console.log(`Primeros 5 GUIDs de BD:`, guids.slice(0, 5).map((g: any) => `"${g}" (${g?.length || 'null'})`));
      
      // Mostrar algunos elementos completos para debug
      console.log(`Primeros 3 elementos completos:`);
      elementosDelEdificio.slice(0, 3).forEach((elem: any, i: number) => {
        console.log(`  ${i+1}. Codi: "${elem.codi}", GUID: "${elem.guid}" (${elem.guid?.length || 'null'} chars)`);
      });
      
      // Implementar aislamiento real de elementos por GUID
      await isolateElementsByGuids(guids, edificioACargar);
      
    } catch (err) {
      console.error('Error en handleViewClick:', err);
      alert('Error al procesar la visualización');
    }
  };

  // Función para aislar elementos por GUID
  const isolateElementsByGuids = async (guids: string[], edificio: string) => {
    if (!components || !isInitialized) {
      console.warn('Componentes no disponibles para aislamiento');
      return;
    }

    if (guids.length === 0) {
      console.warn('No hay GUIDs para aislar');
      return;
    }

    try {
      console.log(`🔍 Iniciando aislamiento de ${guids.length} elementos en edificio ${edificio}`);
      
      const fragmentsManager = components.get(OBC.FragmentsManager);
      const hider = components.get(OBC.Hider);
      
      if (!fragmentsManager || !hider) {
        console.error('FragmentsManager o Hider no disponibles');
        return;
      }

      // Esperar un poco si el modelo se acaba de cambiar
      if (edificio !== selectedBuilding) {
        console.log('⏳ Esperando a que se cargue el nuevo modelo...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Buscar los elementos por GUID en todos los modelos cargados
      const elementsToIsolate: { [modelId: string]: Set<number> } = {};
      let totalFound = 0;
      
      console.log('🎯 GUIDs a buscar:', guids);
      console.log('📋 Total modelos disponibles:', fragmentsManager.list.size);

      for (const [modelId, model] of fragmentsManager.list) {
        console.log(`\n🔎 === PROCESANDO MODELO: ${modelId} ===`);
        
        try {
          // Usar el método oficial de la documentación: getItemsOfCategories
          console.log(`🔍 Obteniendo elementos IFCSPACE del modelo ${modelId}...`);
          
          let allLocalIds: number[] = [];
          
          try {
            // Usar getItemsOfCategories como en la documentación oficial
            const spaces = await (model as any).getItemsOfCategories([/IFCSPACE/]);
            console.log(`🏠 Resultado getItemsOfCategories IFCSPACE:`, spaces);
            
            // Extraer localIds de todas las categorías encontradas
            if (spaces && typeof spaces === 'object') {
              const spaceIds = Object.values(spaces).flat() as number[];
              console.log(`🏠 LocalIds de espacios encontrados: ${spaceIds.length}`);
              allLocalIds = [...allLocalIds, ...spaceIds];
            }
            
            // También obtener puertas
            const doors = await (model as any).getItemsOfCategories([/IFCDOOR/]);
            console.log(`🚪 Resultado getItemsOfCategories IFCDOOR:`, doors);
            
            if (doors && typeof doors === 'object') {
              const doorIds = Object.values(doors).flat() as number[];
              console.log(`🚪 LocalIds de puertas encontrados: ${doorIds.length}`);
              allLocalIds = [...allLocalIds, ...doorIds];
            }
          } catch (categoryError) {
            console.error(`❌ Error obteniendo categorías en ${modelId}:`, categoryError);
            continue;
          }
          
          console.log(`📊 Total localIds obtenidos en ${modelId}: ${allLocalIds.length}`);
          
          if (allLocalIds.length === 0) {
            console.warn(`⚠️ Modelo ${modelId} no tiene elementos IFCSPACE o IFCDOOR`);
            continue;
          }

          // Ahora usar getItemsData para obtener los atributos de estos elementos
          const modelElements = new Set<number>();
          
          try {
            console.log(`🔍 Obteniendo datos de ${allLocalIds.length} elementos...`);
            
            // Procesar en chunks para evitar sobrecargar
            const CHUNK_SIZE = 100;
            for (let i = 0; i < allLocalIds.length; i += CHUNK_SIZE) {
              const chunk = allLocalIds.slice(i, i + CHUNK_SIZE);
              console.log(`📦 Procesando chunk ${Math.floor(i/CHUNK_SIZE) + 1}/${Math.ceil(allLocalIds.length/CHUNK_SIZE)}`);
              
              try {
                // Usar getItemsData como en la documentación oficial
                const itemsData = await (model as any).getItemsData(chunk, {
                  attributesDefault: true
                });
                
                console.log(`📦 Datos obtenidos para ${itemsData.length} elementos`);
                
                for (let j = 0; j < itemsData.length; j++) {
                  const data = itemsData[j];
                  const localId = chunk[j];
                  
                  // Acceder al GUID como en la documentación
                  const elementGuid = data._guid?.value;
                  
                  // Log algunos GUIDs encontrados para verificar formato
                  if (j < 10 && elementGuid) {
                    console.log(`🔍 Ejemplo GUID encontrado: "${elementGuid}" (longitud: ${elementGuid.length})`);
                  }
                  
                  if (elementGuid && guids.includes(elementGuid)) {
                    modelElements.add(localId);
                    totalFound++;
                    console.log(`✅ ¡ENCONTRADO! GUID "${elementGuid}" -> localId ${localId} en ${modelId}`);
                  }
                  
                  // Si es uno de los primeros elementos, mostrar comparación detallada
                  if (j < 5) {
                    console.log(`🔍 GUID del modelo: "${elementGuid}"`);
                    console.log(`🔍 GUIDs de búsqueda:`, guids.slice(0, 3).map((g: string) => `"${g}" (${g.length})`));
                    console.log(`🔍 ¿Coincide con alguno?`, guids.includes(elementGuid));
                  }
                }
              } catch (chunkError) {
                console.error(`❌ Error procesando chunk:`, chunkError);
              }
            }
          } catch (dataError) {
            console.error(`❌ Error obteniendo datos de elementos:`, dataError);
          }
          
          console.log(`📊 Resumen modelo ${modelId}: ${modelElements.size} elementos encontrados de ${allLocalIds.length} procesados`);
          
          if (modelElements.size > 0) {
            elementsToIsolate[modelId] = modelElements;
            console.log(`✅ Añadido modelo ${modelId} con ${modelElements.size} elementos para aislar`);
          }
          
        } catch (modelError) {
          console.error(`❌ Error buscando en modelo ${modelId}:`, modelError);
        }
      }

      console.log(`\n🎯 === RESUMEN FINAL ===`);
      console.log(`Total elementos encontrados: ${totalFound} de ${guids.length} GUIDs`);
      console.log(`Modelos con elementos:`, Object.keys(elementsToIsolate));
      
      // Mostrar detalles de cada modelo
      for (const [modelId, elements] of Object.entries(elementsToIsolate)) {
        console.log(`📊 Modelo ${modelId}: ${elements.size} elementos -> [${Array.from(elements).slice(0, 5).join(', ')}${elements.size > 5 ? '...' : ''}]`);
      }
      
      if (totalFound === 0) {
        console.error('❌ No se encontraron elementos para aislar');
        alert(`No se encontraron elementos con los GUIDs especificados en el modelo cargado.\n\nGUIDs buscados: ${guids.slice(0, 3).join(', ')}${guids.length > 3 ? '...' : ''}\nVerifica que el modelo correcto esté cargado.`);
        return;
      }

      // Aplicar el aislamiento usando hider.isolate() como en la documentación oficial
      if (Object.keys(elementsToIsolate).length > 0) {
        console.log('\n🔒 === APLICANDO AISLAMIENTO ===');
        console.log('Elementos a aislar por modelo:', elementsToIsolate);
        
        try {
          // Crear ModelIdMap para hider.isolate() como en la documentación
          const modelIdMap: { [modelId: string]: Set<number> } = {};
          
          for (const [modelId, elementsToShow] of Object.entries(elementsToIsolate)) {
            // Usar el modelId del modelo, no el nombre del archivo
            const model = fragmentsManager.list.get(modelId);
            if (!model) {
              console.warn(`Modelo ${modelId} no encontrado`);
              continue;
            }
            
            console.log(`🔍 Preparando aislamiento de ${elementsToShow.size} elementos en modelo ${modelId}...`);
            
            // Añadir al ModelIdMap usando el modelId real del modelo
            const realModelId = (model as any).modelId || modelId;
            modelIdMap[realModelId] = elementsToShow;
            
            console.log(`✅ Añadido al ModelIdMap: ${realModelId} con ${elementsToShow.size} elementos`);
          }
          
          console.log(`🔍 ModelIdMap final:`, Object.keys(modelIdMap).map(id => `${id}: ${modelIdMap[id].size} elementos`));
          
          // Usar hider.isolate() con el ModelIdMap como en la documentación oficial
          console.log('🔍 Llamando a hider.isolate()...');
          await hider.isolate(modelIdMap);
          
          console.log(`✅ Aislamiento completado: ${totalFound} elementos del departamento "${selectedDept}" aislados`);
          
          // Mostrar mensaje de éxito
          alert(`✅ Aislamiento completado\n\n` +
                `Departamento: ${selectedDept}\n` +
                `Edificio: ${edificio}\n` +
                `Elementos aislados: ${totalFound} de ${guids.length}\n` +
                `Modelos afectados: ${Object.keys(elementsToIsolate).length}`);
                
        } catch (isolateError) {
          console.error('❌ Error durante hider.isolate():', isolateError);
          alert(`Error durante el aislamiento: ${isolateError}`);
        }
      } else {
        console.warn('⚠️ No hay elementos para aislar (objeto vacío)');
      }
      
    } catch (error) {
      console.error('❌ Error durante el aislamiento:', error);
      alert(`Error durante el aislamiento: ${error}`);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%' }}>
      {/* Columna izquierda: selección */}
      <div style={{ width: '20%', minWidth: 200, borderRight: '1px solid #e0e0e0', padding: '1rem', boxSizing: 'border-box', background: '#f7f7f7' }}>
        
        {/* Selector de edificio personalizado */}
        <div data-building-dropdown style={{ position: 'relative' }}>
          {/* Botón principal del selector */}
          <div
            onClick={() => setIsBuildingDropdownOpen(!isBuildingDropdownOpen)}
            style={{
              width: '95%',
              padding: '0.5rem',
              fontSize: '1rem',
              border: '1px solid #000',
              borderRadius: '4px',
              backgroundColor: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {selectedBuilding ? (
                <>
                  <span style={{ 
                    fontWeight: 'bold', 
                    color: '#007acc',
                    minWidth: '40px'
                  }}>
                    {selectedBuilding}
                  </span>
                  <span>{buildings.find(b => b.value === selectedBuilding)?.label}</span>
                </>
              ) : (
                <span style={{ color: '#999' }}>Tria edifici...</span>
              )}
            </div>
            <span style={{ fontSize: '0.8rem', color: '#000' }}>▼</span>
          </div>

          {/* Dropdown de opciones */}
          {isBuildingDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: '#fff',
              border: '1px solid #ccc',
              borderTop: 'none',
              borderRadius: '0 0 4px 4px',
              zIndex: 1000,
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {/* Opción vacía */}
              <div
                onClick={() => {
                  setSelectedBuilding("");
                  setIsBuildingDropdownOpen(false);
                }}
                style={{
                  padding: '0.5rem',
                  cursor: 'pointer',
                  borderBottom: '1px solid #eee',
                  color: '#999'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
              >
                Tria edifici...
              </div>
              
              {/* Opciones con códigos */}
              {buildings.map((building) => (
                <div
                  key={building.value}
                  onClick={() => {
                    setSelectedBuilding(building.value);
                    setIsBuildingDropdownOpen(false);
                  }}
                  style={{
                    padding: '0.5rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    borderBottom: '1px solid #eee'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                >
                  <span style={{ 
                    fontWeight: 'bold', 
                    color: '#007acc',
                    minWidth: '40px'
                  }}>
                    {building.value}
                  </span>
                  <span>{building.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selector de disciplina personalizado */}
        
        <div data-discipline-dropdown style={{ marginTop: '1rem', position: 'relative' }}>
          {/* Botón principal del selector */}
          <div
            onClick={() => setIsDisciplineDropdownOpen(!isDisciplineDropdownOpen)}
            style={{
              width: '95%',
              padding: '0.5rem',
              fontSize: '1rem',
              border: '1px solid #000',
              borderRadius: '4px',
              backgroundColor: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {selectedDiscipline ? (
                <>
                  <img
                    src={`/assets/${DISCIPLINES.find(d => d.code === selectedDiscipline)?.icon}`}
                    alt={selectedDiscipline}
                    style={{ width: 30, height: 30, objectFit: 'contain' }}
                  />
                  <span>{DISCIPLINES.find(d => d.code === selectedDiscipline)?.name}</span>
                </>
              ) : (
                <span style={{ color: '#999' }}>Tria disciplina...</span>
              )}
            </div>
            <span style={{ fontSize: '0.8rem', color: '#000' }}>▼</span>
          </div>

          {/* Dropdown de opciones */}
          {isDisciplineDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: '95%',
              left: 0,
              right: 0,
              backgroundColor: '#fff',
              border: '1px solid #ccc',
              borderTop: 'none',
              borderRadius: '0 0 4px 4px',
              zIndex: 1000,
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {/* Opción vacía */}
              <div
                onClick={() => {
                  setSelectedDiscipline("");
                  setIsDisciplineDropdownOpen(false);
                }}
                style={{
                  padding: '0.5rem',
                  cursor: 'pointer',
                  borderBottom: '1px solid #eee',
                  color: '#999'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
              >
                Tria disciplina...
              </div>
              
              {/* Opciones con iconos */}
              {DISCIPLINES.map((discipline) => (
                <div
                  key={discipline.code}
                  onClick={() => {
                    setSelectedDiscipline(discipline.code);
                    setIsDisciplineDropdownOpen(false);
                  }}
                  style={{
                    padding: '0.5rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    borderBottom: '1px solid #eee'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                >
                  <img
                    src={`/assets/${discipline.icon}`}
                    alt={discipline.code}
                    style={{ width: 20, height: 20, objectFit: 'contain' }}
                  />
                  <span>{discipline.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Buscador de espacios por departamento */}
        <div data-search-dept style={{ position: 'relative', marginTop: '1rem' }}>
          {/* Radio buttons para scope */}
          <div style={{ marginBottom: 8, display: 'flex', gap: 16, alignItems: 'center', fontSize: 13 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
              <input
                type="radio"
                value="todos"
                checked={searchScope === 'todos'}
                onChange={() => setSearchScope('todos')}
              />
              Tots els edificis
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
              <input
                type="radio"
                value="solo-actual"
                checked={searchScope === 'solo-actual'}
                onChange={() => setSearchScope('solo-actual')}
                disabled={!selectedBuilding}
              />
              Només edifici actiu
            </label>
            {searchScope === 'solo-actual' && !selectedBuilding && (
              <span style={{ color: '#a00', fontSize: 12, marginLeft: 4 }}>Selecciona un edifici</span>
            )}
          </div>
          
          {/* Botón principal del selector estilo dropdown */}
          <div
            onClick={() => setIsSearchDropdownOpen(!isSearchDropdownOpen)}
            style={{
              width: '95%',
              padding: '0.5rem',
              fontSize: '1rem',
              border: '1px solid #000',
              borderRadius: '4px',
              backgroundColor: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {selectedDept ? (
                <span>{selectedDept}</span>
              ) : (
                <span style={{ color: '#999' }}>Buscar departament...</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {selectedDept && (
                <img
                  src="/assets/view.png"
                  alt="View"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewClick();
                  }}
                  style={{ width: 20, height: 20, opacity: 0.7, cursor: 'pointer' }}
                />
              )}
              <span style={{ fontSize: '0.8rem', color: '#000' }}>▼</span>
            </div>
          </div>

          {/* Dropdown de búsqueda */}
          {isSearchDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: '#fff',
              border: '1px solid #ccc',
              borderTop: 'none',
              borderRadius: '0 0 4px 4px',
              zIndex: 1000,
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              {/* Input de búsqueda dentro del dropdown */}
              <div style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                <input
                  type="text"
                  value={searchDept}
                  onChange={handleSearchChange}
                  placeholder="Mínimo 3 caracteres..."
                  style={{
                    width: '100%',
                    padding: '4px 8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                  autoFocus
                />
              </div>
              
              {/* Resultados */}
              <div>
                {isSearching ? (
                  <div style={{ padding: '8px 12px', color: '#666', fontStyle: 'italic' }}>
                    Buscant...
                  </div>
                ) : searchDept.trim().length >= 3 && searchResults.length === 0 && !selectedDept ? (
                  <div style={{ padding: '8px 12px', color: '#999', fontStyle: 'italic' }}>
                    Sense resultats
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((dept: string, index: number) => (
                    <div
                      key={index}
                      onClick={() => {
                        setSelectedDept(dept);
                        setSearchDept(dept);
                        setIsSearchDropdownOpen(false);
                        setSearchResults([]);
                      }}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        borderBottom: index < searchResults.length - 1 ? '1px solid #eee' : 'none',
                        backgroundColor: selectedDept === dept ? '#f0f8ff' : 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedDept !== dept) {
                          e.currentTarget.style.backgroundColor = '#f5f5f5';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedDept !== dept) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      {dept}
                    </div>
                  ))
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Columna central: visor */}
      <div 
        id="central-column"
        style={{ 
          width: '60%', 
          padding: '0.5rem', 
          boxSizing: 'border-box', 
          background: '#fff',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Contenedor para el visor 3D */}
        <div style={{ 
          height: `${100 - consultaHeight}%`, 
          display: 'flex', 
          flexDirection: 'column',
          minHeight: '30%'
        }}>
          <div 
            id="viewer-container" 
            style={{ 
              width: '100%', 
              height: '100%', 
              border: '1px solid #ccc', 
              borderRadius: 8 
            }}
          ></div>
          
          {/* ModelLoader se encarga de montar el visor 3D en el contenedor */}
          <ModelLoader 
            buildingFile={selectedBuildingFile}
            onComponentsReady={handleComponentsReady}
          />
          
          {/* DisciplineFilter maneja el filtrado por disciplina */}
          <DisciplineFilter 
            selectedDiscipline={selectedDiscipline}
            components={components}
            isInitialized={isInitialized}
          />
        </div>

        {/* Divisor redimensionable */}
        <div
          onMouseDown={handleMouseDown}
          style={{
            height: '8px',
            background: isResizing ? '#007acc' : '#e0e0e0',
            cursor: 'row-resize',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            userSelect: 'none'
          }}
        >
          <div style={{
            width: '40px',
            height: '3px',
            background: '#999',
            borderRadius: '2px'
          }}></div>
        </div>

        {/* Contenedor para Consulta IA */}
        <div style={{ 
          height: `${consultaHeight}%`,
          minHeight: '20%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <ConsultaBox edificioActivo={selectedBuilding} />
        </div>
      </div>
      
      {/* Columna derecha: panel de información - siempre visible */}
      <div style={{ 
        width: '20%', 
        minWidth: 300, 
        borderLeft: '1px solid #e0e0e0', 
        background: '#f8f9fa',
        boxSizing: 'border-box'
      }}>
        <ElementInfoPanel 
          isVisible={true}
          onClose={() => {}} // No-op ya que no se puede cerrar
          isIntegrated={true}
        />
      </div>
    </div>
  );
};

export default VisorPage;
