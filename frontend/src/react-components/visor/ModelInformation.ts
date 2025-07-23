import * as THREE from "three";
import * as FRAGS from "@thatopen/fragments";
import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";

console.log("Panel cargado");

export type HighlightHandlers = {
  onItemSelected?: () => void;
  onItemDeselected?: () => void;
};

// Store the currently selected model and ID
let _model: any = null;
let _localId: number | null = null;
// Store model ID for tracking which model an element belongs to
let _modelId: string | null = null;
// Store fragments manager reference
let _fragments: any = null;

// Sistema de notificaciones para cambios de selección
let selectionChangeCallbacks: (() => void)[] = [];

export function onSelectionChange(callback: () => void) {
  selectionChangeCallbacks.push(callback);
  return () => {
    selectionChangeCallbacks = selectionChangeCallbacks.filter(cb => cb !== callback);
  };
}

export function getCurrentElementId(): string | null {
  if (!_modelId || !_localId) return null;
  return `${_modelId}:${_localId}`;
}

// Variables para evitar notificaciones redundantes
let lastNotifiedLocalId: number | null = null;
let lastNotifiedModelId: string | null = null;

function notifySelectionChange() {
  // Solo notificar si realmente ha cambiado la selección
  if (_localId === lastNotifiedLocalId && _modelId === lastNotifiedModelId) {
    return; // No ha cambiado, no notificar
  }
  
  lastNotifiedLocalId = _localId;
  lastNotifiedModelId = _modelId;
  
  console.log(`Notificando cambio de selección: ${_modelId}:${_localId}`);
  
  selectionChangeCallbacks.forEach(callback => {
    try {
      callback();
    } catch (error) {
      console.error('Error en callback de selección:', error);
    }
  });
}

export function setupHighlight(
  container: HTMLElement,
  world: any, // World with camera/renderer
  fragments: any, // FragmentsModels
  handlers?: HighlightHandlers
) {
  const mouse = new THREE.Vector2();
  
  // Store fragments reference globally for use in other functions
  _fragments = fragments;
  
  // Variables para rastrear elementos seleccionados y hover
  let selectedModel: any = null;
  let selectedModelId: string | null = null;
  let localId: number | null = null;
  let hoveredLocalId: number | null = null;
  let hoveredModel: any = null;
  
  // Verificamos que existan modelos cargados
  if (fragments.list.size === 0) return;

  // Handler para mostrar información en consola
  const logSelectedInfo = async () => {
    try {
      console.log(`[ModelInformation] Elemento seleccionado (Modelo: ${_modelId || 'desconocido'})`);
      
      const name = await getName();
      console.log("Nombre:", name);
      
      const attrs = await getAttributes();
      console.log("Atributos:", attrs);
      
      const rawPsets = await getItemPropertySets();
      const psets = formatItemPsets(rawPsets ?? []);
      console.log("Property Sets:", psets);
    } catch (error) {
      console.error("Error al obtener información del elemento:", error);
    }
  }

  // Material dorado para selección
  const highlightMaterial: FRAGS.MaterialDefinition = {
    color: new THREE.Color("gold"),
    renderedFaces: FRAGS.RenderedFaces.TWO,
    opacity: 1,
    transparent: false,
  };

  // Material azul claro para hover/preselección
  const hoverMaterial: FRAGS.MaterialDefinition = {
    color: new THREE.Color("lightblue"),
    renderedFaces: FRAGS.RenderedFaces.TWO,
    opacity: 0.8,
    transparent: true,
  };

  // Función de raycast para múltiples modelos
  const raycast = async (data: {
    camera: any;
    mouse: THREE.Vector2;
    dom: HTMLElement;
  }) => {
    const results = [];
    for (const [, model] of fragments.list) {
      const result = await model.raycast(data);
      if (result) {
        results.push({ ...result, model });
      }
    }
    
    if (results.length === 0) return null;
    
    // Encontrar el resultado más cercano
    let closestResult = results[0];
    let minDistance = closestResult.distance;
    
    for (let i = 1; i < results.length; i++) {
      if (results[i].distance < minDistance) {
        minDistance = results[i].distance;
        closestResult = results[i];
      }
    }
    
    return closestResult;
  };

  const highlight = async () => {
    if (!localId || !selectedModel) return;
    await selectedModel.highlight([localId], highlightMaterial);
  };

  const resetHighlight = async () => {
    if (!localId || !selectedModel) return;
    await selectedModel.resetHighlight([localId]);
  };
  
  const highlightHover = async () => {
    if (!hoveredLocalId || !hoveredModel) return;
    await hoveredModel.highlight([hoveredLocalId], hoverMaterial);
  };
  
  
  
  // Reset highlights in all models when needed
  const resetAllHighlights = async () => {
    const promises = [];
    for (const [, model] of fragments.list) {
      promises.push(model.resetHighlight());
    }
    await Promise.all(promises);
  };


  
  // Event listener para hover (pointermove)
  container.addEventListener("pointermove", async (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    
    const result = await raycast({
      camera: world.camera.three,
      mouse,
      dom: world.renderer!.three.domElement!,
    });
    
    // Determinar si necesitamos cambiar el hover
    const newHoveredElement = result && result.model ? 
      { localId: result.localId, model: result.model } : null;
    
    const currentHoveredElement = hoveredLocalId && hoveredModel ? 
      { localId: hoveredLocalId, model: hoveredModel } : null;
    
    // Si el elemento hover ha cambiado
    if (!areElementsEqual(newHoveredElement, currentHoveredElement)) {
      // Resetear solo hovers específicos para evitar conflictos con selección
      if (currentHoveredElement) {
        await currentHoveredElement.model.resetHighlight([currentHoveredElement.localId]);
      }
      hoveredLocalId = null;
      hoveredModel = null;
      
      // Aplicar nuevo hover si existe y no es el elemento seleccionado
      if (newHoveredElement && !areElementsEqual(newHoveredElement, { localId, model: selectedModel })) {
        hoveredLocalId = newHoveredElement.localId;
        hoveredModel = newHoveredElement.model;
        await highlightHover();
        //console.log(`Nuevo hover aplicado a elemento ${hoveredLocalId}`);
      }
    }
    
    await fragments?.core.update(true);
  });
  
  // Función helper para comparar elementos
  function areElementsEqual(elem1: any, elem2: any) {
    if (!elem1 && !elem2) return true;
    if (!elem1 || !elem2) return false;
    return elem1.localId === elem2.localId && elem1.model === elem2.model;
  }
  

  
  // Event listener para click (selección)
  container.addEventListener("click", async (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    
    const result = await raycast({
      camera: world.camera.three,
      mouse,
      dom: world.renderer!.three.domElement!,
    });
    
    const promises = [];
    
    if (result && result.model) {
      // Si es el mismo elemento ya seleccionado, no hacer nada
      if (result.localId === localId && result.model === selectedModel) {
        return;
      }
      
      // Resetear solo la selección anterior (no el hover)
      if (selectedModel && localId) {
        await selectedModel.resetHighlight([localId]);
      }
      
      // Resetear solo hovers específicos antes de seleccionar (no usar resetAllHovers aquí)
      if (hoveredLocalId && hoveredModel) {
        await hoveredModel.resetHighlight([hoveredLocalId]);
      }
      hoveredLocalId = null;
      hoveredModel = null;
      
      // Guardar referencia al modelo y al elemento seleccionados
      selectedModel = result.model;
      selectedModelId = result.model.id || 'unknown';
      localId = result.localId;
      
      // Actualizar variables globales para las funciones de información
      _model = selectedModel;
      _localId = localId;
      _modelId = selectedModelId;
      
      // Debug: Mostrar información sobre el modelo seleccionado
      console.log(`Modelo seleccionado: ${selectedModelId}`, selectedModel);
      
      // Aplicar highlight de selección
      await highlight();
      
      // Notificar cambio de selección
      notifySelectionChange();
      
      // Llama al handler externo y muestra info en consola
      handlers?.onItemSelected?.();
      logSelectedInfo();
    } else {
      // Solo deseleccionar si hacemos clic en vacío
      if (selectedModel && localId) {
        await selectedModel.resetHighlight([localId]);
        // También limpiar cualquier hover residual
        if (hoveredLocalId && hoveredModel) {
          await hoveredModel.resetHighlight([hoveredLocalId]);
        }
        selectedModel = null;
        selectedModelId = null;
        localId = null;
        _model = null;
        _localId = null;
        _modelId = null;
        hoveredLocalId = null;
        hoveredModel = null;
        
        // Notificar cambio de selección (deseleccionado)
        notifySelectionChange();
        
        handlers?.onItemDeselected?.();
        console.log('Elemento deseleccionado');
      }
    }
    promises.push(fragments?.core.update(true));
    Promise.all(promises);
  });

  // Devuelve funciones útiles si se quieren usar desde fuera
  return {
    highlight,
    resetHighlight,
    resetAllHighlights,
    getSelectedId: () => localId,
    getSelectedModelId: () => selectedModelId,
  };
}

// === FUNCIONES DE INFORMACIÓN ===
// Devuelven promesas, requieren que _model y _localId estén definidos

// Check if a model ID is for MEP (Mechanical, Electrical, Plumbing)
// Assumes MEP models have 'ME' in their ID
export function isMEPModel(modelId: string | null): boolean {
  return modelId?.includes('-ME') || false;
}

// Special handling for MEP elements
export async function getMEPElementData(model: any, localId: number): Promise<any | null> {
  try {
    console.log('Intentando obtener datos MEP para localId:', localId);
    
    // Usar solo métodos que sabemos que existen
    // Intentar obtener datos básicos usando getItemsData
    const [data] = await model.getItemsData([localId], {
      attributesDefault: true,
      attributes: [],
      relations: {},
    });
    
    console.log('Datos MEP obtenidos:', data);
    
    // Devolver un objeto con la información disponible
    return {
      type: 'MEP Element',
      _guid: { value: data._guid?.value || `MEP_${localId}` },
      localId,
      data
    };
  } catch (e) {
    console.warn('Error obteniendo datos MEP:', e);
    return {
      type: 'MEP Element',
      _guid: { value: `MEP_${localId}` },
      localId,
      data: null
    };
  }
}

export async function getAttributes(attributes?: string[]) {
  if (!_model || !_localId) return null;
  
  try {
    // Usar exactamente el mismo método que en la documentación oficial
    const [data] = await _model.getItemsData([_localId], {
      attributesDefault: !attributes,
      attributes,
    });
    
    // Mostrar información de debug
    if (data._guid && data._guid.value) {
      console.log("GUID del elemento: " + data._guid.value);
    } else {
      console.log("GUID no disponible para este elemento");
    }
    
    console.log("Modelo: " + (_modelId || 'desconocido'));
    return data;
  } catch (error) {
    console.error("Error al obtener atributos:", error);
    return null;
  }
}

export async function getName(): Promise<string | null> {
  try {
    const attributes = await getAttributes(["Name"]);
    if (!attributes) return null;
    
    // Para elementos MEP
    if (isMEPModel(_modelId)) {
      // Primero intentar con el tipo si está disponible
      if (attributes.type && typeof attributes.type === 'string') {
        return `${attributes.type} (MEP)`;
      }
      
      // Luego con categoría o cualquier otra información disponible
      if (attributes.rawInfo && Array.isArray(attributes.rawInfo)) {
        const elementInfo = attributes.rawInfo[0];
        if (elementInfo) {
          if (elementInfo.category) return elementInfo.category;
          if (elementInfo.type) return elementInfo.type;
        }
      }
      
      // Fallback para MEP
      return `MEP Element (${_localId})`;
    }
    
    // Para elementos arquitectónicos
    const Name = attributes.Name;
    if (!(Name && "value" in Name)) {
      // Intentar obtener el nombre de otra fuente si está disponible
      if (attributes.type && typeof attributes.type === 'string') {
        return attributes.type;
      }
      return null;
    }
    
    return Name.value as string;
  } catch (error) {
    console.error("Error al obtener nombre:", error);
    return `Element (${_localId})`; // Siempre devolver algo útil
  }
}

export async function getItemPropertySets(): Promise<any[] | null> {
  if (!_model || !_localId) return null;
  
  try {
    // Usar exactamente el mismo método que en la documentación oficial
    const [data] = await _model.getItemsData([_localId], {
      attributesDefault: false,
      attributes: ["Name", "NominalValue"],
      relations: {
        IsDefinedBy: { attributes: true, relations: true },
        DefinesOcurrence: { attributes: false, relations: false },
      },
    });
    
    return (data.IsDefinedBy as any[]) ?? [];
  } catch (error) {
    console.error("Error al obtener property sets:", error);
    return [];
  }
}

export async function highlightByGuids(guids: string[]) {
  // Verificar que al menos hay modelos para resaltar
  if (!Array.isArray(guids) || guids.length === 0) return;
  
  console.log('[highlightByGuids] Iniciando búsqueda de elementos con GUIDs:', guids);
  
  // Limpia highlights previos en el modelo actualmente seleccionado
  if (_model && typeof _model.resetHighlight === 'function') {
    await _model.resetHighlight();
  } else {
    console.warn('_model no está disponible o no tiene método resetHighlight');
    return;
  }
  
  // DEBUG: Mostrar GUIDs buscados
  console.log('[highlightByGuids] GUIDs buscados:', guids);
  
  const localIdsToHighlight: number[] = [];
  
  try {
    // Obtener elementos de categorías IFCSPACE e IFCDOOR
    const spaces = await _model.getItemsOfCategory('IFCSPACE');
    const doors = await _model.getItemsOfCategory('IFCDOOR');
    const elements = [...spaces, ...doors];
    
    // Procesar cada elemento
    for (const element of elements) {
      try {
        // Obtener localId y GUID del elemento
        const localId = element.localId;
        const guid = element._guid?.value;
        
        // Verificar si el GUID coincide con alguno de los buscados
        if (guid && guids.includes(guid)) {
          localIdsToHighlight.push(localId);
          console.log(`[highlightByGuids] Coincidencia: GUID ${guid}, localId ${localId}`);
        }
      } catch (itemError) {
        // Ignorar errores individuales y continuar con el siguiente item
        console.warn(`[highlightByGuids] Error en item individual:`, itemError);
      }
    }
  } catch (error) {
    console.error("Error al buscar items para resaltar:", error);
  }
  
  console.log('[highlightByGuids] localIds a resaltar:', localIdsToHighlight);
  if (localIdsToHighlight.length > 0) {
    await _model.highlight(localIdsToHighlight, {
      color: new THREE.Color("gold"),
      renderedFaces: FRAGS.RenderedFaces.TWO,
      opacity: 1,
      transparent: false,
    });
  }
}

export function formatItemPsets(rawPsets: any[]): Record<string, Record<string, any>> {
  const result: Record<string, Record<string, any>> = {};
  
  if (!Array.isArray(rawPsets)) {
    console.warn('rawPsets no es un array:', rawPsets);
    return result;
  }
  
  for (const pset of rawPsets) {
    if (!pset) continue;
    
    const { Name: psetName, HasProperties } = pset;
    
    // Verificar que psetName existe y tiene value
    if (!psetName || typeof psetName !== 'object' || !('value' in psetName)) {
      console.warn('psetName inválido:', psetName);
      continue;
    }
    
    // Verificar que HasProperties es un array
    if (!Array.isArray(HasProperties)) {
      console.warn('HasProperties no es un array:', HasProperties);
      continue;
    }
    
    const props: Record<string, any> = {};
    for (const prop of HasProperties) {
      if (!prop) continue;
      
      const { Name, NominalValue } = prop;
      
      // Verificaciones más robustas
      if (!Name || typeof Name !== 'object' || !('value' in Name)) continue;
      if (!NominalValue || typeof NominalValue !== 'object' || !('value' in NominalValue)) continue;
      
      const name = Name.value;
      props[name] = NominalValue.value;
    }
    result[psetName.value] = props;
  }
  return result;
}

/**
 * Resalta todos los elementos cuyo parámetro "Nombre de sistema" coincide con el nombre dado.
 * Utiliza el ItemsFinder de ThatOpen para buscar elementos por atributos.
 */
export async function logAllModelElements() {
  if (!_fragments || _fragments.list.size === 0) {
    console.warn('No hay modelos cargados.');
    return;
  }
  for (const [modelId, model] of _fragments.list) {
    console.log(`\n=== Modelo: ${modelId} ===`);
    if (typeof model.getAllItems !== 'function') {
      console.warn(`El modelo ${modelId} no tiene getAllItems()`);
      continue;
    }
    const allItems = await model.getAllItems();
    console.log(`Total elementos en modelo ${modelId}: ${allItems.length}`);
    // Procesar en chunks para no saturar
    const CHUNK_SIZE = 100;
    for (let i = 0; i < allItems.length; i += CHUNK_SIZE) {
      const chunk = allItems.slice(i, i + CHUNK_SIZE);
      const itemsData = await model.getItemsData(chunk, { attributes: true, psets: false });
      for (const data of itemsData) {
        const guid = data._guid?.value || data.GUID?.value || 'sin guid';
        const category = data.category?.value || data._category?.value || 'sin categoría';
        const name = data.Name?.value || data.name?.value || '';
        console.log({ guid, category, name });
      }
    }
  }
}

export async function highlightSystemByName(systemName: string) {
  console.log("======================================================");
  console.log(`[highlightSystemByName] 🚀 USANDO ITEMSFINDER OFICIAL: ${systemName}`);
  console.log("======================================================");

  if (!_fragments) {
    console.warn('No hay fragments manager disponible para buscar sistemas');
    return;
  }

  try {
    // Obtener el componente ItemsFinder desde fragments manager
    const components = (_fragments as any).components;
    if (!components) {
      console.error('No se puede acceder a components desde fragments manager');
      return;
    }
    
    const finder = components.get(OBC.ItemsFinder);
    if (!finder) {
      console.error('ItemsFinder no está disponible');
      return;
    }
    
    console.log('🔍 Creando query para buscar elementos con "Nombre de sistema":', systemName);
    
    // Crear una query para buscar elementos con el atributo "Nombre de sistema"
    const queryName = `Sistema_${systemName}_${Date.now()}`;
    
    // Según la documentación oficial, crear la query así:
    finder.create(queryName, [
      {
        categories: [/DUCTSEGMENT/, /FLOWTERMINAL/, /FLOWFITTING/, /PIPESEGMENT/, /PIPEFITTING/, /WALL/, /SLAB/, /BEAM/, /COLUMN/],
        attributes: {
          queries: [
            { name: /Nombre de sistema/, value: new RegExp(`^${systemName}$`, 'i') }
          ]
        }
      }
    ]);

    console.log('🔎 Ejecutando query según documentación oficial...');
    
    // Usar el helper function de la documentación
    const getResult = async (name: string) => {
      const finderQuery = finder.list.get(name);
      if (!finderQuery) return {};
      const result = await finderQuery.test();
      return result;
    };
    
    const result = await getResult(queryName);
    console.log('📊 Resultado de la query:', result);
    
    // Extraer los GUIDs de los elementos encontrados
    const matchingGuids: string[] = [];
    
    for (const [modelId, fragmentIds] of Object.entries(result)) {
      console.log(`📁 Modelo ${modelId}: ${Array.isArray(fragmentIds) ? fragmentIds.length : Object.keys(fragmentIds as object).length} elementos`);
      
      // Obtener el modelo
      const model = _fragments.list.get(modelId);
      if (!model) {
        console.warn(`Modelo ${modelId} no encontrado`);
        continue;
      }
      
      // Convertir fragmentIds a array si es necesario
      const idsArray = Array.isArray(fragmentIds) ? fragmentIds : Object.keys(fragmentIds as object).map(Number);
      
      for (const fragmentId of idsArray) {
        try {
          // Obtener datos del elemento para extraer el GUID
          const [data] = await model.getItemsData([fragmentId], {
            attributesDefault: false,
            attributes: ['_guid'],
          });
          
          if (data?._guid?.value) {
            matchingGuids.push(data._guid.value);
            console.log(`✅ Elemento encontrado: ${data._guid.value}`);
          }
        } catch (error) {
          console.warn(`Error obteniendo GUID para fragmentId ${fragmentId}:`, error);
        }
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN DE BÚSQUEDA CON ITEMSFINDER');
    console.log('='.repeat(80));
    console.log(`✅ Elementos que coinciden con "${systemName}": ${matchingGuids.length}`);
    
    if (matchingGuids.length > 0) {
      console.log('🎯 GUIDs a resaltar:', matchingGuids);
      await highlightByGuids(matchingGuids);
    } else {
      console.warn('❌ No se encontraron elementos para el sistema:', systemName);
    }
    
    // Limpiar la query temporal
    finder.list.delete(queryName);
    
    console.log('='.repeat(80));
  } catch (err) {
    console.error('❌ Error buscando elementos del sistema:', err);
  }
}

// === FUNCIÓN SIMPLE PARA MOSTRAR INFORMACIÓN ===
// Crear un panel simple que muestre información del elemento seleccionado
export function showElementInfo() {
  if (!_model || !_localId) {
    alert('Primero selecciona un elemento haciendo clic en el modelo 3D');
    return;
  }

  // Crear un div simple para mostrar la información
  const infoDiv = document.createElement('div');
  infoDiv.id = 'simple-element-info';
  infoDiv.style.cssText = `
    position: fixed;
    top: 50px;
    right: 20px;
    width: 00px;
    max-height: 400px;
    background: white;
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1000;
    overflow-y: auto;
    font-family: Arial, sans-serif;
    font-size: 14px;
  `;

  // Botón para cerrar
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.cssText = `
    position: absolute;
    top: 8px;
    right: 8px;
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: #666;
  `;
  closeBtn.onclick = () => infoDiv.remove();

  infoDiv.appendChild(closeBtn);

  // Título
  const title = document.createElement('h3');
  title.textContent = 'Información del Elemento';
  title.style.marginTop = '0';
  infoDiv.appendChild(title);

  // Contenido de información
  const content = document.createElement('div');
  content.innerHTML = '<p>Cargando información...</p>';
  infoDiv.appendChild(content);

  // Eliminar panel anterior si existe
  const existing = document.getElementById('simple-element-info');
  if (existing) existing.remove();

  // Añadir al DOM
  document.body.appendChild(infoDiv);

  // Cargar información asíncrona
  loadElementInfo(content);
}

// Función para cargar la información del elemento
async function loadElementInfo(container: HTMLElement) {
  try {
    let html = '<div style="line-height: 1.5;">';

    // Obtener nombre
    const name = await getName();
    if (name) {
      html += `<p><strong>Nombre:</strong> ${name}</p>`;
    }

    // Obtener atributos básicos
    const attrs = await getAttributes(['Name', 'Description', 'Tag']);
    if (attrs) {
      html += '<h4>Atributos:</h4><ul>';
      Object.entries(attrs).forEach(([key, value]: [string, any]) => {
        if (value && typeof value === 'object' && 'value' in value) {
          html += `<li><strong>${key}:</strong> ${value.value}</li>`;
        }
      });
      html += '</ul>';
    }

    // Obtener Property Sets
    const rawPsets = await getItemPropertySets();
    if (rawPsets && rawPsets.length > 0) {
      html += '<h4>Property Sets:</h4>';
      try {
        const psets = formatItemPsets(rawPsets);
        Object.entries(psets).forEach(([psetName, props]) => {
          html += `<h5>${psetName}:</h5><ul>`;
          Object.entries(props).forEach(([propName, propValue]) => {
            html += `<li><strong>${propName}:</strong> ${propValue}</li>`;
          });
          html += '</ul>';
        });
      } catch (error) {
        console.warn('Error al formatear property sets:', error);
        html += '<p>Property sets disponibles pero no se pudieron formatear.</p>';
        // Mostrar datos raw como fallback
        html += '<pre>' + JSON.stringify(rawPsets, null, 2) + '</pre>';
      }
    } else {
      html += '<p>No se encontraron Property Sets para este elemento.</p>';
    }

    html += '</div>';
    container.innerHTML = html;
  } catch (error) {
    console.error('Error al cargar información:', error);
    container.innerHTML = '<p style="color: red;">Error al cargar la información del elemento.</p>';
  }
}

// === PANEL DE INFORMACIÓN ===
// Crear panel de información siguiendo el ejemplo oficial de ThatOpen
export function createInformationPanel(model: any) {
  if (!model) {
    console.warn('No se puede crear el panel: modelo no disponible');
    return null;
  }

  // Verificar si ya existe un panel
  const existingPanel = document.getElementById('model-info-panel');
  if (existingPanel) {
    console.log('Panel ya existe, eliminando el anterior');
    existingPanel.remove();
  }

  // Verificar si BUI está disponible
  if (typeof BUI === 'undefined') {
    console.error('BUI no está disponible. Asegúrate de que @thatopen/ui esté importado correctamente.');
    return null;
  }

  // Función para obtener categorías del modelo
  const getCategories = async () => {
    try {
      return await model.getCategories();
    } catch (error) {
      console.error('Error al obtener categorías:', error);
      return [];
    }
  };

  // Función para obtener geometría del elemento seleccionado
  const getItemGeometry = async () => {
    if (!_model || !_localId) return null;
    try {
      const [data] = await _model.getItemsData([_localId], {
        attributesDefault: false,
        attributes: [],
        relations: {},
        geometry: true,
      });
      return data.geometry;
    } catch (error) {
      console.error('Error al obtener geometría:', error);
      return null;
    }
  };

  // Función para obtener nombres de una categoría
  const getNamesFromCategory = async (category: string, unique = false) => {
    if (!_model) return [];
    try {
      const items = await _model.getItemsOfCategory(category);
      const names = [];
      for (const item of items) {
        const [data] = await _model.getItemsData([item.localId], {
          attributesDefault: false,
          attributes: ['Name'],
        });
        if (data.Name && 'value' in data.Name) {
          names.push(data.Name.value);
        }
      }
      return unique ? [...new Set(names)] : names;
    } catch (error) {
      console.error('Error al obtener nombres de categoría:', error);
      return [];
    }
  };

  // Función para obtener estructura espacial
  const getSpatialStructure = async () => {
    if (!_model) return null;
    try {
      const spatialItems = await _model.getItemsOfCategory('IFCBUILDING');
      if (spatialItems.length === 0) return null;
      
      const [building] = spatialItems;
      const [data] = await _model.getItemsData([building.localId], {
        attributesDefault: false,
        attributes: ['Name'],
        relations: {
          IsDecomposedBy: { attributes: true, relations: true },
        },
      });
      return data;
    } catch (error) {
      console.error('Error al obtener estructura espacial:', error);
      return null;
    }
  };

  // Función para obtener elementos del primer nivel
  const getFirstLevelChildren = async () => {
    if (!_model) return null;
    try {
      const structure = await getSpatialStructure();
      if (!structure || !structure.IsDecomposedBy) return null;
      
      const firstLevel = structure.IsDecomposedBy[0];
      if (!firstLevel || !firstLevel.RelatedObjects) return null;
      
      return firstLevel.RelatedObjects.map((obj: any) => obj.localId || obj);
    } catch (error) {
      console.error('Error al obtener elementos del primer nivel:', error);
      return null;
    }
  };

  // Crear el panel usando BUI
  const createPanel = async () => {
    const categories = await getCategories();
    
    const categoriesDropdown = BUI.Component.create<BUI.Dropdown>(
      () => BUI.html`<bim-dropdown name="categories">
        ${categories.map(
          (category: string) => BUI.html`<bim-option label=${category}></bim-option>`,
        )}
      </bim-dropdown>`,
    );

    const [panel, updatePanel] = BUI.Component.create<BUI.PanelSection, any>(
      (_) => {
        const onLogAttributes = async () => {
          const data = await getAttributes();
          if (!data) return;
          console.log('Atributos del elemento:', data);
        };

        const onLogPsets = async () => {
          const data = await getItemPropertySets();
          if (!data) return;
          const panelElement = document.getElementById("model-info-panel");
          const checkbox = panelElement?.querySelector<BUI.Checkbox>('[name="format"]');
          const result = checkbox?.value ? formatItemPsets(data) : data;
          console.log('Property Sets:', result);
        };

        const onLogGeometry = async ({ target }: { target: BUI.Button }) => {
          target.loading = true;
          const data = await getItemGeometry();
          if (!data) {
            target.loading = false;
            return;
          }
          target.loading = false;
          console.log('Geometría del elemento:', data);
        };

        const onNamesFromCategory = async ({ target }: { target: BUI.Button }) => {
          const panelElement = document.getElementById("model-info-panel");
          const [category] = categoriesDropdown.value;
          if (!category) return;
          target.loading = true;
          const checkbox = panelElement?.querySelector<BUI.Checkbox>('[name="unique"]');
          const data = await getNamesFromCategory(category, checkbox?.value);
          target.loading = false;
          console.log(`Nombres de ${category}:`, data);
        };

        const onLogStructure = async ({ target }: { target: BUI.Button }) => {
          target.loading = true;
          const result = await getSpatialStructure();
          console.log('Estructura espacial:', result);
          target.loading = false;
        };

        const onLogLevelItems = async ({ target }: { target: BUI.Button }) => {
          target.loading = true;
          const result = await getFirstLevelChildren();
          if (!result) {
            target.loading = false;
            return;
          }
          const panelElement = document.getElementById("model-info-panel");
          const checkbox = panelElement?.querySelector<BUI.Checkbox>(
            '[name="displayNames"]',
          );
          if (checkbox?.value) {
            const attrs = await _model.getItemsData(result, {
              attributesDefault: false,
              attributes: ["Name"],
            });
            const names = attrs.map((data: any) => {
              if (!("Name" in data && "value" in data.Name)) return null;
              return data.Name.value;
            });
            console.log('Nombres de elementos del primer nivel:', names);
          } else {
            console.log('IDs de elementos del primer nivel:', result);
          }
          target.loading = false;
        };

        const onNameLabelCreated = async (e?: Element) => {
          if (!e) return;
          const label = e as BUI.Label;
          label.textContent = await getName();
        };

        return BUI.html`
          <bim-panel id="model-info-panel" active label="Información del Modelo" class="options-menu">
            <bim-panel-section fixed label="Info">
              <bim-label style="white-space: normal;">💡 Abre la consola del navegador para ver los datos registrados.</bim-label>
            </bim-panel-section>
            <bim-panel-section label="Elemento Seleccionado">
              <bim-label style=${BUI.styleMap({ whiteSpace: "normal", display: _localId ? "none" : "unset" })}>💡 Haz clic en cualquier elemento del visor para activar las opciones de datos.</bim-label>
              <bim-label ${BUI.ref(onNameLabelCreated)} style=${BUI.styleMap({ whiteSpace: "normal", display: !_localId ? "none" : "unset" })}></bim-label>
              <bim-button ?disabled=${!_localId} label="Ver Atributos" @click=${onLogAttributes}></bim-button>
              <div style="display: flex; gap: 0.5rem">
                <bim-button ?disabled=${!_localId} label="Ver Psets" @click=${onLogPsets}></bim-button>
                <bim-checkbox name="format" label="Formatear" inverted checked></bim-checkbox>
              </div>
              <bim-button ?disabled=${!_localId} label="Ver Geometría" @click=${onLogGeometry}></bim-button>
            </bim-panel-section>
            <bim-panel-section label="Categorías">
              ${categoriesDropdown}
              <div style="display: flex; gap: 0.5rem">
                <bim-button label="Ver Nombres" @click=${onNamesFromCategory}></bim-button>
                <bim-checkbox name="unique" label="Únicos" inverted></bim-checkbox>
              </div>
            </bim-panel-section>
            <bim-panel-section label="Estructura Espacial">
              <bim-button label="Ver Estructura" @click=${onLogStructure}></bim-button>
              <div style="display: flex; gap: 0.5rem">
                <bim-button label="Ver Elementos Nivel 1" @click=${onLogLevelItems}></bim-button>
                <bim-checkbox name="displayNames" label="Nombres" inverted></bim-checkbox>
              </div>
            </bim-panel-section>
          </bim-panel>
        `;
      },
      {},
    );

    // Crear botón para dispositivos móviles
    const mobileButton = BUI.Component.create<BUI.PanelSection>(() => {
      const onClick = () => {
        if (panel.classList.contains("options-menu-visible")) {
          panel.classList.remove("options-menu-visible");
        } else {
          panel.classList.add("options-menu-visible");
        }
      };

      return BUI.html`
        <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
          @click=${onClick}>
        </bim-button>
      `;
    });

    // Añadir el botón móvil al DOM
    document.body.appendChild(mobileButton);

    // Retornar tanto el panel como la función de actualización
    return { panel, updatePanel };
  };

  return createPanel();
}
