import React, { useState, useEffect, useRef, useCallback } from "react";
import ModelLoader from "./ModelLoader";
import ConsultaBox from "./ConsultaBox";
import ElementInfoPanel from "./ElementInfoPanel";
import DisciplineFilter from "./DisciplineFilter";
import DropdownSelector from "./components/DropdownSelector";
import ClassifierExample from "./ClassifierExample";
import * as OBC from "@thatopen/components";
import * as THREE from "three";
import * as FRAGS from "@thatopen/fragments";
import "./visor3d.css";
import "./FMPage.css";

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

const FMPage: React.FC = () => {
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
    console.log("FMPage: handleComponentsReady ejecutado:", {
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

  // Funciones para modo ghost basadas en la documentación oficial
  const originalColors = useRef(new Map<any, { color: number; transparent: boolean; opacity: number }>());
  
  const setModelTransparent = useCallback(async () => {
    if (!components || !isInitialized) {
      console.warn('Componentes no disponibles para modo ghost');
      return;
    }
    
    try {
      console.log('👻 Aplicando modo ghost a todos los materiales...');
      
      const fragmentsManager = components.get(OBC.FragmentsManager);
      
      // Obtener todos los materiales de todos los modelos
      const materials = [...fragmentsManager.core.models.materials.list.values()];
      console.log(`🎨 Total materiales encontrados: ${materials.length}`);
      
      for (const material of materials) {
        // Saltar materiales personalizados
        if ((material as any).userData?.customId) continue;
        
        // Guardar colores originales
        let color: number | undefined;
        if ('color' in material) {
          color = (material as any).color.getHex();
        } else if ('lodColor' in material) {
          color = (material as any).lodColor.getHex();
        }
        
        originalColors.current.set(material, {
          color: color || 0xffffff,
          transparent: (material as any).transparent,
          opacity: (material as any).opacity,
        });
        
        // Aplicar modo ghost (menos transparente para mejor visibilidad)
        (material as any).transparent = true;
        (material as any).opacity = 0.2; // Cambiado de 0.05 a 0.2 para menos transparencia
        (material as any).needsUpdate = true;
        
        if ('color' in material) {
          (material as any).color.setColorName('white');
        } else if ('lodColor' in material) {
          (material as any).lodColor.setColorName('white');
        }
      }
      
      console.log(`✅ Modo ghost aplicado a ${originalColors.current.size} materiales`);
      
    } catch (error) {
      console.error('❌ Error aplicando modo ghost:', error);
    }
  }, [components, isInitialized]);
  
  const restoreModelMaterials = useCallback(() => {
    console.log('🔄 Restaurando materiales originales...');
    
    for (const [material, data] of originalColors.current) {
      const { color, transparent, opacity } = data;
      (material as any).transparent = transparent;
      (material as any).opacity = opacity;
      
      if ('color' in material) {
        (material as any).color.setHex(color);
      } else if ('lodColor' in material) {
        (material as any).lodColor.setHex(color);
      }
      
      (material as any).needsUpdate = true;
    }
    
    originalColors.current.clear();
    console.log('✅ Materiales restaurados');
  }, []);

  // Función para limpiar highlights anteriores
  const clearPreviousHighlights = useCallback(async () => {
    if (!components || !isInitialized) {
      console.warn('Componentes no disponibles para limpiar highlights');
      return;
    }

    try {
      const fragmentsManager = components.get(OBC.FragmentsManager);
      
      // Limpiar highlights de todos los modelos
      for (const model of fragmentsManager.list.values()) {
        if (model && typeof (model as any).resetHighlight === 'function') {
          await (model as any).resetHighlight();
          console.log(`✅ Highlight limpiado en modelo ${(model as any).name || model.modelId || 'sin nombre'}`);
        }
      }
      
      console.log('✅ Todos los highlights anteriores limpiados');
      
    } catch (error) {
      console.error('❌ Error limpiando highlights anteriores:', error);
    }
  }, [components, isInitialized]);

  // Función para hacer fit de cámara a elementos seleccionados
  async function fitCameraToSelectedElements(elementsToIsolate: { [modelId: string]: Set<number> }) {
    if (!components || !isInitialized) {
      console.warn('Componentes no disponibles para fit de cámara');
      return;
    }

    try {
      console.log('📷 Ajustando cámara a elementos seleccionados...');
      
      // Usar directamente el fallback que sabemos que funciona
      await fitToSphereFallback(elementsToIsolate);
      
    } catch (error) {
      console.error('❌ Error durante fit de cámara:', error);
    }
  }
  
  // Función fallback usando fitToSphere como en ModelLoader
  async function fitToSphereFallback(_elementsToIsolate: { [modelId: string]: Set<number> }) {
    if (!components || !isInitialized) return;
    
    try {
      console.log('🔄 Usando fallback fitToSphere...');
      
      const world = components.get(OBC.Worlds).list.values().next().value;
      const boxer = components.get(OBC.BoundingBoxer);
      
      if (!world || !world.camera || !boxer) {
        console.warn('Componentes necesarios no disponibles para fallback');
        return;
      }
      
      // Calcular bounding box de todos los modelos (simplificado)
      boxer.list.clear();
      
      // Usar addFromModels() como en ModelLoader para obtener todos los modelos
      boxer.addFromModels();
      
      const box = boxer.get();
      boxer.list.clear();
      
      if (box) {
        const sphere = new THREE.Sphere();
        box.getBoundingSphere(sphere);
        
        // Usar fitToSphere como en ModelLoader
        if (world.camera.controls) {
          world.camera.controls.fitToSphere(sphere, true);
          console.log('✅ Fallback fitToSphere completado');
        } else {
          console.warn('Camera controls no disponibles');
        }
      } else {
        console.warn('No se pudo calcular bounding box');
      }
      
    } catch (error) {
      console.error('❌ Error en fallback fitToSphere:', error);
    }
  }

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

      // Aplicar highlight rojo y modo ghost como en la documentación oficial
      if (Object.keys(elementsToIsolate).length > 0) {
        console.log('\n🔴 === APLICANDO HIGHLIGHT ROJO Y MODO GHOST ===');
        console.log('Elementos a resaltar por modelo:', elementsToIsolate);
        
        try {
          // Primero limpiar cualquier highlight anterior
          console.log('🧹 Limpiando highlights anteriores...');
          await clearPreviousHighlights();
          
          // Luego aplicar modo ghost a todo el modelo
          console.log('👻 Aplicando modo ghost...');
          await setModelTransparent();
          
          // Luego hacer highlight rojo de los elementos seleccionados
          console.log('🔴 Aplicando highlight rojo...');
          
          // Material de highlight rojo como en la documentación oficial
          const redHighlightMaterial = {
            color: new THREE.Color("red"),
            renderedFaces: FRAGS.RenderedFaces.TWO,
            opacity: 1,
            transparent: false,
          };
          
          for (const [modelId, elementsToHighlight] of Object.entries(elementsToIsolate)) {
            const model = fragmentsManager.list.get(modelId);
            if (!model) {
              console.warn(`Modelo ${modelId} no encontrado`);
              continue;
            }
            
            console.log(`🔴 Resaltando ${elementsToHighlight.size} elementos en modelo ${modelId}...`);
            
            // Convertir Set a Array para el highlight
            const elementsArray = Array.from(elementsToHighlight);
            
            // Aplicar highlight rojo usando el método oficial del modelo
            await (model as any).highlight(elementsArray, redHighlightMaterial);
            
            console.log(`✅ Highlight aplicado a ${elementsArray.length} elementos en ${modelId}`);
          }
          
          // Actualizar la vista
          await (fragmentsManager as any).update?.(true) || Promise.resolve();
          
          // Hacer fit de cámara a los elementos seleccionados
          console.log('📷 Ajustando cámara a elementos seleccionados...');
          await fitCameraToSelectedElements(elementsToIsolate);
          
          console.log(`✅ Highlight completado: ${totalFound} elementos del departamento "${selectedDept}" resaltados en rojo`);
          
          // Mostrar mensaje de éxito
          alert(`✅ Highlight completado\n\n` +
                `Departamento: ${selectedDept}\n` +
                `Edificio: ${edificio}\n` +
                `Elementos resaltados: ${totalFound} de ${guids.length}\n` +
                `Modelos afectados: ${Object.keys(elementsToIsolate).length}\n\n` +
                `👻 Modo ghost activado\n🔴 Elementos resaltados en rojo\n📷 Cámara ajustada`);
                
        } catch (highlightError) {
          console.error('❌ Error durante el highlight:', highlightError);
          alert(`Error durante el highlight: ${highlightError}`);
        }
      } else {
        console.warn('⚠️ No hay elementos para resaltar (objeto vacío)');
      }
      
    } catch (error) {
      console.error('❌ Error durante el aislamiento:', error);
      alert(`Error durante el aislamiento: ${error}`);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header del Visor */}
      <header style={{
        background: '#007EB0',
        color: '#fff',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #005a7e'
      }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 500 }}>Visor FM</h1>
        <div style={{ fontSize: '14px', opacity: 0.9 }}>
          Visualitzador de models 3D
        </div>
      </header>
      
      <div className="fm-container" style={{ flex: 1 }}>
      {/* Columna izquierda: selección */}
      <div className="fm-left-column">
        
        {/* Selector de edificio personalizado */}
        <DropdownSelector
          options={buildings.map(b => ({ value: b.value, label: b.label, code: b.value }))}
          value={selectedBuilding}
          onChange={setSelectedBuilding}
          isOpen={isBuildingDropdownOpen}
          onToggle={() => setIsBuildingDropdownOpen(!isBuildingDropdownOpen)}
          placeholder="Tria edifici..."
          dataAttribute="data-building-dropdown"
          renderSelected={(option) => {
            if (option) {
              return (
                <>
                  <span style={{ 
                    fontWeight: 'bold', 
                    color: '#007acc',
                    minWidth: '40px'
                  }}>
                    {option.code}
                  </span>
                  <span>{option.label}</span>
                </>
              );
            }
            return null;
          }}
          renderOption={(option) => (
            <>
              <span style={{ 
                fontWeight: 'bold', 
                color: '#007acc',
                minWidth: '40px'
              }}>
                {option.code}
              </span>
              <span>{option.label}</span>
            </>
          )}
        />

        {/* Selector de disciplina personalizado */}
        <div style={{ marginTop: '1rem' }}>
          <DropdownSelector
            options={DISCIPLINES.map(d => ({ value: d.code, label: d.name, icon: d.icon }))}
            value={selectedDiscipline}
            onChange={setSelectedDiscipline}
            isOpen={isDisciplineDropdownOpen}
            onToggle={() => setIsDisciplineDropdownOpen(!isDisciplineDropdownOpen)}
            placeholder="Tria disciplina..."
            dataAttribute="data-discipline-dropdown"
            renderSelected={(option) => {
              if (option) {
                return (
                  <>
                    <img
                      src={`/assets/${option.icon}`}
                      alt={option.value}
                      style={{ width: 30, height: 30, objectFit: 'contain' }}
                    />
                    <span>{option.label}</span>
                  </>
                );
              }
              return null;
            }}
            renderOption={(option) => (
              <>
                <img
                  src={`/assets/${option.icon}`}
                  alt={option.value}
                  style={{ width: 20, height: 20, objectFit: 'contain' }}
                />
                <span>{option.label}</span>
              </>
            )}
          />
        </div>

        {/* Buscador de espacios por departamento */}
        <div data-search-dept className="fm-search-container">
          {/* Radio buttons para scope */}
          <div className="fm-search-scope">
            <label>
              <input
                type="radio"
                value="todos"
                checked={searchScope === 'todos'}
                onChange={() => setSearchScope('todos')}
              />
              Tots els edificis
            </label>
            <label>
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
            className="fm-search-dropdown-button"
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
                <>
                  <img
                    src="/assets/view.png"
                    alt="View"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewClick();
                    }}
                    style={{ width: 20, height: 20, opacity: 0.7, cursor: 'pointer' }}
                    title="Resaltar departamento (modo ghost + highlight rojo)"
                  />
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await clearPreviousHighlights();
                      restoreModelMaterials();
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '16px',
                      cursor: 'pointer',
                      opacity: 0.7,
                      padding: '2px'
                    }}
                    title="Restaurar vista normal"
                  >
                    🔄
                  </button>
                </>
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
        className="fm-central-column"
      >
        {/* Contenedor para el visor 3D */}
        <div 
          className="fm-3d-container"
          style={{ height: `${100 - consultaHeight}%` }}
        >
          <div 
            id="viewer-container" 
            className="fm-viewer-container"
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
          
          {/* Panel de niveles posicionado relativo a la columna central */}
          {isInitialized && components && (
            <ClassifierExample 
              components={components}
            />
          )}
        </div>

        {/* Divisor redimensionable */}
        <div
          onMouseDown={handleMouseDown}
          className={`fm-resizer ${isResizing ? 'resizing' : ''}`}
        >
          <div className="fm-resizer-handle"></div>
        </div>

        {/* Contenedor para Consulta IA */}
        <div 
          className="fm-consulta-container"
          style={{ height: `${consultaHeight}%` }}
        >
          <ConsultaBox edificioActivo={selectedBuilding} />
        </div>
      </div>
      
      {/* Columna derecha: panel de información - siempre visible */}
      <div className="fm-right-column">
        <ElementInfoPanel 
          isVisible={true}
          onClose={() => {}} // No-op ya que no se puede cerrar
          isIntegrated={true}
        />
      </div>
    </div>
    </div>
  );
};

export default FMPage;
