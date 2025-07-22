import * as OBC from '@thatopen/components';
import * as THREE from 'three';

/**
 * Interfaz para el mapa de fragmentos a manipular por modelo
 */
interface ModelFragmentsMap {
  [modelId: string]: Set<number>;
}

/**
 * Clase para gestionar los niveles de un edificio BIM (IfcBuildingStorey)
 * Permite operaciones como aislar, colorear u ocultar por nivel.
 */
export class LevelManager {
  private components: OBC.Components;
  private classifier: OBC.Classifier;
  private hider: OBC.Hider;
  private fragmentsManager: OBC.FragmentsManager;
  private currentIsolatedLevel: string | null = null;

  constructor(components: OBC.Components) {
    this.components = components;
    this.classifier = components.get(OBC.Classifier);
    this.hider = components.get(OBC.Hider);
    this.fragmentsManager = components.get(OBC.FragmentsManager);
  }

  /**
   * Inicializa la clasificación de niveles
   * @returns Promise que se resuelve cuando la clasificación está completa
   */
  /**
   * Inicializa la clasificación de niveles
   * @returns Promise que se resuelve cuando la clasificación está completa
   */
  async initialize(): Promise<void> {
    // Exactamente como en el ejemplo
    await this.classifier.byIfcBuildingStorey({ classificationName: "Levels" });
  }

  /**
   * Obtiene los nombres de los niveles disponibles
   * @returns Array con los nombres de los niveles o vacío si no hay niveles
   */
  getLevelNames(): string[] {
    const levelsClassification = this.classifier.list.get("Levels");
    if (!levelsClassification) {
      console.warn("No se encontraron niveles clasificados");
      return [];
    }

    // Manejar diferentes tipos de estructura
    if (levelsClassification instanceof Map) {
      return Array.from(levelsClassification.keys());
    } else if (typeof levelsClassification === 'object') {
      return Object.keys(levelsClassification);
    }

    return [];
  }

  /**
   * Obtiene datos de los niveles para UI
   * @returns Array con objetos para mostrar en UI
   */
  getLevelData(): { Name: { value: string }, expressID: string }[] {
    const levelNames = this.getLevelNames();
    return levelNames.map(name => ({
      Name: { value: name },
      expressID: name, // Usando el nombre como ID único
    }));
  }

  /**
   * Aisla un nivel ocultando todos los demás
   * @param levelName Nombre del nivel a aislar
   * @returns Promise que se resuelve cuando la operación está completa
   */
  async isolateLevel(levelName: string): Promise<void> {
    try {
      console.log(`🔍 Aislando nivel: ${levelName}`);

      // Restaurar visibilidad si hay un nivel aislado
      if (this.currentIsolatedLevel) {
        this.hider.set(true);
        console.log('✅ Visibilidad restaurada');
      }

      // Toggle: si es el mismo nivel, des-aislar y salir
      if (this.currentIsolatedLevel === levelName) {
        this.currentIsolatedLevel = null;
        console.log(`✅ Nivel ${levelName} des-aislado`);
        return;
      }

      const levelsClassification = this.classifier.list.get("Levels");

      if (!levelsClassification) {
        console.error('❌ No se encontró clasificación de niveles.');
        return;
      }

      // 1. Juntar TODOS los fragmentos a ocultar en un solo Set
      const allFragmentsToHide = new Set<number>();
      const allLevels = levelsClassification instanceof Map
        ? Array.from(levelsClassification.entries())
        : Object.entries(levelsClassification);

      for (const [otherLevelName, otherFragments] of allLevels) {
        if (otherLevelName === levelName) continue;

        let idsToProcess: any[] = [];
        if (Array.isArray(otherFragments)) idsToProcess = otherFragments;
        else if (otherFragments instanceof Set) idsToProcess = Array.from(otherFragments);
        else if (typeof otherFragments === 'object' && otherFragments !== null) idsToProcess = Object.keys(otherFragments);

        for (const id of idsToProcess) {
          const numericId = parseInt(String(id), 10);
          if (!isNaN(numericId)) allFragmentsToHide.add(numericId);
        }
      }

      // 2. Crear el mapa de fragmentos a ocultar, agrupados por modelo
      const fragmentsToHide: ModelFragmentsMap = {};
      const fragmentsManager = this.components.get(OBC.FragmentsManager);

      for (const [modelId, model] of fragmentsManager.list) {
        const fragmentsInModelToHide = new Set<number>();
        // Acceso robusto a los fragmentos del modelo (runtime-safe)
        const modelFragments = Array.from((model as any).items || []);
        for (const fragId of modelFragments) {
          const numericId = Number(fragId);
          if (!isNaN(numericId) && allFragmentsToHide.has(numericId)) {
            fragmentsInModelToHide.add(numericId);
          }
        }
        if (fragmentsInModelToHide.size > 0) {
          fragmentsToHide[modelId] = fragmentsInModelToHide;
        }
      }

      // 3. Aplicar ocultación
      if (Object.keys(fragmentsToHide).length > 0) {
        this.hider.set(false, fragmentsToHide);
        this.currentIsolatedLevel = levelName;
        const totalHidden = Object.values(fragmentsToHide).reduce((sum, set) => sum + set.size, 0);
        console.log(`✅ Nivel ${levelName} aislado - ${totalHidden} fragmentos ocultos`);
      } else {
        console.log('⚠️ No hay fragmentos para ocultar para este nivel.');
      }
    } catch (error) {
      console.error('❌ Error fatal al aislar nivel:', error);
    }
  }

  /**
   * Restaura la visibilidad de todos los niveles
   */
  showAllLevels(): void {
    this.hider.set(true);
    this.currentIsolatedLevel = null;
    console.log('✅ Todos los niveles visibles');
  }

  /**
   * Colorea todos los elementos de un nivel con un color específico
   * @param levelName Nombre del nivel a colorear
   * @param color Color en formato hexadecimal (ej: 0xff0000 para rojo)
   */
  colorizeLevel(levelName: string, color: number): void {
    try {
      const levelsClassification = this.classifier.list.get("Levels");
      if (!levelsClassification) {
        console.error('No se encontró clasificación de niveles.');
        return;
      }

      // Obtener los fragmentos del nivel específico
      let levelFragments: any;
      if (levelsClassification instanceof Map) {
        levelFragments = levelsClassification.get(levelName);
      } else {
        levelFragments = levelsClassification[levelName];
      }

      if (!levelFragments) {
        console.error(`No se encontraron fragmentos para el nivel: ${levelName}`);
        return;
      }

      // Procesar los fragmentos según su tipo
      let fragmentsToColorize: number[] = [];
      if (Array.isArray(levelFragments)) {
        fragmentsToColorize = levelFragments.map(id => Number(id)).filter(id => !isNaN(id));
      } else if (levelFragments instanceof Set) {
        fragmentsToColorize = Array.from(levelFragments).map(id => Number(id)).filter(id => !isNaN(id));
      } else if (typeof levelFragments === 'object') {
        fragmentsToColorize = Object.keys(levelFragments).map(id => Number(id)).filter(id => !isNaN(id));
      }

      if (fragmentsToColorize.length > 0) {
        // Iterar sobre cada modelo
        for (const [, model] of this.fragmentsManager.list) {
          // Para cada fragmento en nuestra lista que queremos colorear
          for (const fragId of fragmentsToColorize) {
            // Intentamos obtener el fragmento del modelo actual
            // Nota: usamos cast a any porque la API puede variar
            const fragment = (model as any).getFragment?.(fragId);
            if (fragment) {
              // Guardar color original antes de cambiar
              const originalMaterial = fragment.material;
              if (!fragment.userData) fragment.userData = {};
              if (!fragment.userData.originalMaterial) {
                fragment.userData.originalMaterial = originalMaterial;
              }
              
              // Crear nuevo material con el color deseado
              const material = new THREE.MeshPhongMaterial({
                color: new THREE.Color(color),
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide,
              });
              
              fragment.material = material;
            }
          }
        }
        console.log(`✅ Nivel ${levelName} coloreado (${fragmentsToColorize.length} fragmentos)`);
      } else {
        console.log(`⚠️ No hay fragmentos para colorear en el nivel: ${levelName}`);
      }
    } catch (error) {
      console.error('Error al colorear nivel:', error);
    }
  }

  /**
   * Elimina cualquier color especial aplicado a los elementos
   */
  resetColors(): void {
    try {
      for (const [, model] of this.fragmentsManager.list) {
        // Tratar de obtener todos los fragmentos del modelo
        // Usando 'as any' porque la API puede variar entre versiones
        const fragments = (model as any).getAll?.() || [];
        
        for (const fragment of fragments) {
          if (fragment && fragment.userData && fragment.userData.originalMaterial) {
            fragment.material = fragment.userData.originalMaterial;
            delete fragment.userData.originalMaterial;
          }
        }
      }
      console.log('✅ Colores restablecidos');
    } catch (error) {
      console.error('Error al restablecer colores:', error);
    }
  }
}
