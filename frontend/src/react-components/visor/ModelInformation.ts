import * as THREE from "three";
import * as FRAGS from "@thatopen/fragments";
import * as BUI from "@thatopen/ui";

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

export function setupHighlight(
  container: HTMLElement,
  world: any, // World with camera/renderer
  fragments: any, // FragmentsModels
  handlers?: HighlightHandlers
) {
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

  // Material dorado para resaltar
  const highlightMaterial: FRAGS.MaterialDefinition = {
    color: new THREE.Color("gold"),
    renderedFaces: FRAGS.RenderedFaces.TWO,
    opacity: 1,
    transparent: false,
  };

  let localId: number | null = null;
  let selectedModel: any = null;
  let selectedModelId: string | null = null;
  _localId = null;
  _model = null;
  _modelId = null;

  const highlight = async () => {
    if (!localId || !selectedModel) return;
    await selectedModel.highlight([localId], highlightMaterial);
  };

  const resetHighlight = async () => {
    if (!localId || !selectedModel) return;
    await selectedModel.resetHighlight([localId]);
  };
  
  // Reset highlights in all models when needed
  const resetAllHighlights = async () => {
    const promises = [];
    for (const [, model] of fragments.list) {
      promises.push(model.resetHighlight());
    }
    await Promise.all(promises);
  };

  const mouse = new THREE.Vector2();
  container.addEventListener("click", async (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    
    // Realizar raycast en todos los modelos cargados
    let bestResult = null;
    let bestDistance = Infinity;
    let resultModel = null;
    let resultModelId = null;

    // Resetear highlight previo en todos los modelos
    await resetAllHighlights();
    
    // Raycast en todos los modelos para encontrar el más cercano
    for (const [modelId, model] of fragments.list) {
      const result = await model.raycast({
        camera: world.camera.three,
        mouse,
        dom: world.renderer!.three.domElement!,
      });
      
      if (result && result.distance < bestDistance) {
        bestResult = result;
        bestDistance = result.distance;
        resultModel = model;
        resultModelId = modelId;
        
        // Debug: Mostrar información sobre el modelo seleccionado
        console.log(`Modelo seleccionado: ${modelId}`, model);
      }
    }
    
    const promises = [];
    
    if (bestResult) {
      // Guardar referencia al modelo y al elemento seleccionados
      selectedModel = resultModel;
      selectedModelId = resultModelId;
      localId = bestResult.localId;
      
      // Actualizar variables globales para las funciones de información
      _model = selectedModel;
      _localId = localId;
      _modelId = selectedModelId;
      
      // Llama al handler externo y muestra info en consola
      handlers?.onItemSelected?.();
      logSelectedInfo();
      promises.push(highlight());
    } else {
      selectedModel = null;
      selectedModelId = null;
      localId = null;
      _model = null;
      _localId = null;
      _modelId = null;
      handlers?.onItemDeselected?.();
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
    width: 300px;
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
