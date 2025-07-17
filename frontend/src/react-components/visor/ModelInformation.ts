import * as THREE from "three";
import * as FRAGS from "@thatopen/fragments";

export type HighlightHandlers = {
  onItemSelected?: () => void;
  onItemDeselected?: () => void;
};

let _model: any = null;
let _localId: number | null = null;

export function setupHighlight(
  container: HTMLElement,
  model: any, // FragmentsModel
  world: any, // World with camera/renderer
  fragments: any, // FragmentsModels
  handlers?: HighlightHandlers
) {
  _model = model; // Para acceso desde otras funciones

  // Handler para mostrar información en consola
  const logSelectedInfo = async () => {
    const name = await getName();
    const attrs = await getAttributes();
    const rawPsets = await getItemPropertySets();
    const psets = formatItemPsets(rawPsets ?? []);
    console.log("[ModelInformation] Elemento seleccionado:");
    console.log("Nombre:", name);
    console.log("Atributos:", attrs);
    console.log("Property Sets:", psets);
  }

  // Material dorado para resaltar
  const highlightMaterial: FRAGS.MaterialDefinition = {
    color: new THREE.Color("gold"),
    renderedFaces: FRAGS.RenderedFaces.TWO,
    opacity: 1,
    transparent: false,
  };

  let localId: number | null = null;
  _localId = null;

  const highlight = async () => {
    if (!localId) return;
    await model.highlight([localId], highlightMaterial);
  };

  const resetHighlight = async () => {
    if (!localId) return;
    await model.resetHighlight([localId]);
  };

  const mouse = new THREE.Vector2();
  container.addEventListener("click", async (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    const result = await model.raycast({
      camera: world.camera.three,
      mouse,
      dom: world.renderer!.three.domElement!,
    });
    const promises = [];
    if (result) {
      promises.push(resetHighlight());
      localId = result.localId;
      _localId = result.localId;
      // Llama al handler externo y muestra info en consola
      handlers?.onItemSelected?.();
      logSelectedInfo();
      promises.push(highlight());
    } else {
      promises.push(resetHighlight());
      localId = null;
      _localId = null;
      handlers?.onItemDeselected?.();
    }
    promises.push(fragments?.core.update(true));
    Promise.all(promises);
  });

  // Devuelve funciones útiles si se quieren usar desde fuera
  return {
    highlight,
    resetHighlight,
    getSelectedId: () => localId,
  };
}

// === FUNCIONES DE INFORMACIÓN ===
// Devuelven promesas, requieren que _model y _localId estén definidos

export async function getAttributes(attributes?: string[]): Promise<any | null> {
  if (!_model || !_localId) return null;
  const [data] = await _model.getItemsData([_localId], {
    attributesDefault: !attributes,
    attributes,
  });

  console.log("GUID del elemento: "+data._guid.value);
  return data;
}

export async function getName(): Promise<string | null> {
  const attributes = await getAttributes(["Name"]);
  const Name = attributes?.Name;
  if (!(Name && "value" in Name)) return null;
  return Name.value as string;
}

export async function getItemPropertySets(): Promise<any[] | null> {
  if (!_model || !_localId) return null;
  const [data] = await _model.getItemsData([_localId], {
    attributesDefault: false,
    attributes: ["Name", "NominalValue"],
    relations: {
      IsDefinedBy: { attributes: true, relations: true },
      DefinesOcurrence: { attributes: false, relations: false },
    },
  });
  return (data.IsDefinedBy as any[]) ?? [];
}

export async function highlightByGuids(guids: string[]) {
  if (!_model) return;
  if (!Array.isArray(guids) || guids.length === 0) return;
  
  // Limpia highlights previos
  if (typeof _model.resetHighlight === 'function') {
    await _model.resetHighlight();
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
        const guid = element._guid.value;
        
        // Verificar si el GUID coincide con alguno de los buscados
        if (guids.includes(guid)) {
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
  for (const pset of rawPsets) {
    const { Name: psetName, HasProperties } = pset;
    if (!("value" in psetName && Array.isArray(HasProperties))) continue;
    const props: Record<string, any> = {};
    for (const prop of HasProperties) {
      const { Name, NominalValue } = prop;
      if (!("value" in Name && "value" in NominalValue)) continue;
      const name = Name.value;
      props[name] = NominalValue.value;
    }
    result[psetName.value] = props;
  }
  return result;
}
