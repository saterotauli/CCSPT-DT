import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import * as OBC from '@thatopen/components';
import * as OBF from '@thatopen/components-front';

interface ViewPlanProps {
  components: OBC.Components;
  world: OBC.World;
  activeFloor: any | null;
  onViewClosed: () => void;
}

const ViewPlan: React.FC<ViewPlanProps> = ({ components, world, activeFloor, onViewClosed }) => {
  const isInitialized = useRef(false);
  const currentViewId = useRef<string | null>(null);
  const currentPlanView = useRef<any>(null); // Para guardar la referencia a la vista actual
  const clipStyler = useRef<OBF.ClipStyler | null>(null);
  const views = useRef<OBC.Views | null>(null);
  const classifier = useRef<OBC.Classifier | null>(null);
  const finder = useRef<OBC.ItemsFinder | null>(null);
  const fragApi = useRef<OBC.FragmentsManager | null>(null);
  const hider = useRef<OBC.Hider | null>(null);

  useEffect(() => {
    if (!isInitialized.current) {
      // Inicializar componentes
      clipStyler.current = components.get(OBF.ClipStyler);
      clipStyler.current.world = world;
      views.current = components.get(OBC.Views);
      classifier.current = components.get(OBC.Classifier);
      finder.current = components.get(OBC.ItemsFinder);
      fragApi.current = components.get(OBC.FragmentsManager);
      hider.current = components.get(OBC.Hider);
      
      // Configurar estilos siguiendo la documentación oficial
      clipStyler.current.styles.set('Blue', {
        linesMaterial: new LineMaterial({ color: 'black', linewidth: 2 }),
        fillsMaterial: new THREE.MeshBasicMaterial({ color: 'lightblue', side: 2 })
      });
      
      clipStyler.current.styles.set('Red', {
        linesMaterial: new LineMaterial({ color: 'black', linewidth: 3 }),
        fillsMaterial: new THREE.MeshBasicMaterial({ color: 'salmon', side: 2 })
      });
      
      clipStyler.current.styles.set('Green', {
        linesMaterial: new LineMaterial({ color: 'black', linewidth: 2 }),
        fillsMaterial: new THREE.MeshBasicMaterial({ color: 'lightgreen', side: 2 })
      });
      
      // Configurar ItemsFinder para agrupar elementos
      finder.current.create('Walls', [{ categories: [/WALL/] }]);
      finder.current.create('Slabs', [{ categories: [/SLAB/] }]);
      finder.current.create('Columns', [{ categories: [/COLUMN/] }]);
      finder.current.create('Doors', [{ categories: [/DOOR/] }]);
      finder.current.create('Roofs', [{ categories: [/ROOF/] }]);
      finder.current.create('Coverings', [{ categories: [/COVERING/] }]);
      finder.current.create('Windows', [{ categories: [/WINDOW/] }]);
      finder.current.create('Furniture', [{ categories: [/FURNITURE/] }]);
      finder.current.create('Sanitaries', [{ categories: [/SANITARYWARE|PLUMBING|FIXTURE/] }]);
      
      // Configurar clasificaciones dinámicas
      const classificationName = 'FloorPlanGroups';
      classifier.current.setGroupQuery(classificationName, 'Walls', { name: 'Walls' });
      classifier.current.setGroupQuery(classificationName, 'Slabs', { name: 'Slabs' });
      classifier.current.setGroupQuery(classificationName, 'Columns', { name: 'Columns' });
      classifier.current.setGroupQuery(classificationName, 'Doors', { name: 'Doors' });
      classifier.current.setGroupQuery(classificationName, 'Windows', { name: 'Windows' });
      classifier.current.setGroupQuery(classificationName, 'Furniture', { name: 'Furniture' });
      classifier.current.setGroupQuery(classificationName, 'Sanitaries', { name: 'Sanitaries' });
      
      isInitialized.current = true;
    }
  }, [components, world]);

  useEffect(() => {
    if (!activeFloor || !clipStyler.current || !views.current) {
      // Cerrar vista actual si no hay piso activo
      if (currentViewId.current && views.current) {
        views.current.close(currentViewId.current);
        currentViewId.current = null;
        onViewClosed();
      }
      return;
    }

    const createFloorPlanView = async () => {
      try {
        // Cerrar vista anterior si existe
        if (currentViewId.current) {
          views.current!.close(currentViewId.current);
        }

        const floorName = activeFloor.Name?.value || activeFloor.expressID;
        
        // Crear vista usando createFromIfcStoreys siguiendo la documentación
        const [planView] = await views.current!.createFromIfcStoreys({
          storeyNames: [new RegExp(floorName, 'i')],
          world,
          offset: 1
        });

        if (!planView) {
          console.warn(`No se pudo crear vista para el piso: ${floorName}`);
          return;
        }

        planView.helpersVisible = false;
        
        // Obtener la lista de modelos para ocultar elementos
        const models = fragApi.current!.list;
        
        try {
          // Ocultar elementos ROOF y COVERING para mejor visualización
          console.log('⚙️ Ocultando elementos IFCROOF e IFCCOVERING para la vista...');
          
          // Nuevo enfoque: obtenemos TODOS los elementos visibles, excepto ROOFS y COVERINGS
          // y luego usamos isolate() en vez de set()
          const visibleElementsMap: OBC.ModelIdMap = {};
          
          // Procesar cada modelo
          for (const [modelId, model] of models) {
            if (!visibleElementsMap[modelId]) {
              visibleElementsMap[modelId] = new Set();
            }
            
            // Obtener elementos de todas las categorías que no sean ROOF ni COVERING
            const walls = await model.getItemsOfCategories([/IFCWALL/]) || {};
            const slabs = await model.getItemsOfCategories([/IFCSLAB/]) || {};
            const doors = await model.getItemsOfCategories([/IFCDOOR/]) || {};
            const windows = await model.getItemsOfCategories([/IFCWINDOW/]) || {};
            const columns = await model.getItemsOfCategories([/IFCCOLUMN/]) || {};
            const furniture = await model.getItemsOfCategories([/FURNITURE/]) || {};
            const stairs = await model.getItemsOfCategories([/STAIR/]) || {};
            
            // Obtener elementos de recubrimientos y techos para excluirlos
            const coveringItems = await model.getItemsOfCategories([/COVER/]) || {};
            const roofItems = await model.getItemsOfCategories([/ROOF/]) || {};
            
            // Añadir todos los elementos visibles al mapa
            const categoriesToShow = [walls, slabs, doors, windows, columns, furniture, stairs];
            categoriesToShow.forEach(category => {
              Object.values(category).forEach(items => {
                items.forEach((id: number) => {
                  visibleElementsMap[modelId].add(id);
                });
              });
            });
            
            // Contar elementos para el logging
            const totalVisible = visibleElementsMap[modelId].size;
            const coveringCount = Object.values(coveringItems).reduce((sum, arr) => sum + arr.length, 0);
            const roofCount = Object.values(roofItems).reduce((sum, arr) => sum + arr.length, 0);
            
            console.log(`Modelo ${modelId}: ${totalVisible} elementos visibles, ${coveringCount} recubrimientos y ${roofCount} techos excluidos`);
          }
          
          // Usar isolate en lugar de set para mayor efectividad
          if (Object.keys(visibleElementsMap).length > 0 && hider.current) {
            await hider.current.isolate(visibleElementsMap);
            console.log(`✅ Elementos IFCROOF e IFCCOVERING ocultados con éxito usando enfoque isolate()`);
          }
        } catch (error) {
          console.error('Error al procesar modelos:', error);
        }
        
        // Aplicar estilos con ClipStyler siguiendo la documentación
        const classificationName = 'FloorPlanGroups';
        
        // Guardar referencia a la vista actual
        currentPlanView.current = planView;
        
        clipStyler.current!.createFromView(planView, {
          items: {
            Walls: {
              style: 'Blue',
              data: { [classificationName]: ['Walls'] }
            },
            Columns: {
              style: 'Red', 
              data: { [classificationName]: ['Columns'] }
            },
            Doors: {
              style: 'Green',
              data: { [classificationName]: ['Doors'] }
            },
            Windows: {
              style: 'Green',
              data: { [classificationName]: ['Windows'] }
            }
            // Nota: Furniture y Sanitaries NO se incluyen en ClipStyler
            // para que se muestren en 3D completo sin ser cortados
          }
        });

        // Abrir la vista
        views.current!.open(planView.id);
        currentViewId.current = planView.id;

        console.log(`✅ Vista 2D creada para piso: ${floorName}`);
        console.log('=== FIN ANÁLISIS DE ELEMENTOS ===');
      } catch (error) {
        console.error('Error al crear vista 2D:', error);
      }
    };

    createFloorPlanView();
  }, [activeFloor, components, world, onViewClosed]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (currentViewId.current && views.current) {
        views.current.close(currentViewId.current);
      }
    };
  }, []);

  return null; // Este componente no renderiza nada visible
};

export default ViewPlan;