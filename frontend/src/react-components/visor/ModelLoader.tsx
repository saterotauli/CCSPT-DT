import React, { useEffect, useState } from "react";
import * as THREE from "three";

import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import { setupHighlight } from "./ModelInformation";
// import FloorSelector from "./FloorSelector";


interface ModelLoaderProps {
  buildingFile: string; // Nombre del archivo de fragmentos a cargar
  onComponentsReady?: (components: OBC.Components | null, isInitialized: boolean) => void;
}

const ModelLoader: React.FC<ModelLoaderProps> = ({ buildingFile, onComponentsReady }) => {
  // Estado para el mundo 3D
  const [world, setWorld] = useState<OBC.World | null>(null);
  // Estado para los niveles detectados
  const [floors, setFloors] = useState<any[]>([]);
  // Estado para los componentes de ThatOpen
  const [components, setComponents] = useState<OBC.Components | null>(null);
  // Estado para saber si la inicialización ha terminado
  const [isInitialized, setIsInitialized] = useState(false);

  // Efecto principal: inicializa el visor y carga los modelos al montar/cambiar buildingFile
  useEffect(() => {
    // Obtiene el contenedor del visor
    const container = document.getElementById("viewer-container");
    if (!container) {
      console.error("No se encontró el contenedor 'viewer-container'");
      return;
    }
    container.innerHTML = ""; // Limpia el contenedor

    let workerURL: string | null = null;
    let resizeObserver: ResizeObserver | null = null;

    // Función asíncrona de inicialización
    const init = async () => {
      try {
        // 1. Inicialización básica de componentes y escena
        const componentsInstance = new OBC.Components();
        setComponents(componentsInstance);

        // Crea el mundo y la escena principal
        const worlds = componentsInstance.get(OBC.Worlds);
        const worldInstance = worlds.create<
            OBC.SimpleScene,
            OBC.OrthoPerspectiveCamera,
            OBF.PostproductionRenderer
        >();
        setWorld(worldInstance);

        worldInstance.scene = new OBC.SimpleScene(componentsInstance);
        worldInstance.scene.setup();
        worldInstance.scene.three.background = new THREE.Color(0x000000); // Fondo negro

        // Configura el renderer y la cámara
        worldInstance.renderer = new OBF.PostproductionRenderer(componentsInstance, container);
        worldInstance.camera = new OBC.OrthoPerspectiveCamera(componentsInstance);
        
        // Forzar cámara siempre en modo ortográfico
        if (worldInstance.camera.projection) {
          worldInstance.camera.projection.set('Orthographic');
        }

        componentsInstance.init();

        // Ajuste responsivo del visor al tamaño del contenedor
        const updateRendererAndCamera = () => {
          if (worldInstance && worldInstance.renderer && worldInstance.camera && container) {
            worldInstance.renderer.resize();
            const camera = worldInstance.camera.three;
            if (camera instanceof THREE.PerspectiveCamera) {
              camera.aspect = container.clientWidth / container.clientHeight;
              camera.updateProjectionMatrix();
            }
          }
        };

        // Observa cambios de tamaño en el contenedor
        if (container) {
          resizeObserver = new ResizeObserver(updateRendererAndCamera);
          resizeObserver.observe(container);
        }

        // 2. Añade una cuadrícula base
        //const grids = componentsInstance.get(OBC.Grids);
        //grids.create(worldInstance);

        // 3. Inicializa el worker de fragmentos (descarga desde ThatOpen CDN)
        const workerUrl = "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
        const fetchedWorker = await fetch(workerUrl);
        const workerText = await fetchedWorker.text();
        const workerFile = new File([new Blob([workerText])], "worker.mjs", { type: "text/javascript" });
        workerURL = URL.createObjectURL(workerFile);
        const fragmentsInstance = componentsInstance.get(OBC.FragmentsManager);
        await fragmentsInstance.init(workerURL);

        setWorld(worldInstance);

        // 4. Configura eventos de cámara para actualizar la escena tras movimientos
        worldInstance.camera.controls.addEventListener("rest", () => {
          if (fragmentsInstance) {
            fragmentsInstance.core.update(true);
          }
        });

        // ✨ CALLBACK OFICIAL: Se ejecuta cada vez que se añade un modelo
        let expectedModels = 1; // Por defecto, solo arquitectónico
        let loadedModels = 0;
        let setupHighlightCalled = false;
        
        fragmentsInstance.list.onItemSet.add(({ value: model }) => {
          const modelId = (model as any).id || 'modelo-desconocido';
          console.log('🎯 Modelo añadido a la lista:', modelId);
          
          // Añadir modelo a la escena
          model.useCamera(worldInstance.camera.three);
          worldInstance.scene.three.add(model.object);
          fragmentsInstance.core.update(true);
          
          loadedModels++;
          console.log(`📊 Modelos cargados: ${loadedModels}/${expectedModels}`);
          
          // Configurar Hoverer solo cuando todos los modelos esperados estén cargados
          if (loadedModels >= expectedModels && !setupHighlightCalled) {
            console.log('🔧 Todos los modelos cargados - configurando Hoverer...');
            setupHighlight(container, worldInstance, fragmentsInstance);
            setupHighlightCalled = true;
          }
        });

        // 5. Carga el modelo arquitectónico principal (AS.frag)
        if (!buildingFile) {
          console.log("Ningún edificio seleccionado, no se carga modelo.");
          return;
        }
        const architecturalUrl = `/${buildingFile}`;
        const archFile = await fetch(architecturalUrl);
        if (!archFile.ok) {
          throw new Error(`Error al cargar el modelo arquitectónico: ${archFile.status}`);
        }
        const archBuffer = await archFile.arrayBuffer();
        await fragmentsInstance.core.load(archBuffer, { modelId: buildingFile });

        // 6. Intenta cargar el modelo de instalaciones (ME.frag) si existe
        try {
          const mechanicalFile = buildingFile.replace("-AS.frag", "-ME.frag");
          const mechanicalUrl = `/${mechanicalFile}`;
          const mechFile = await fetch(mechanicalUrl);
          if (mechFile.ok) {
            expectedModels = 2; // Ahora esperamos 2 modelos
            console.log('🔧 Modelo de instalaciones encontrado - esperando 2 modelos');
            const mechBuffer = await mechFile.arrayBuffer();
            await fragmentsInstance.core.load(mechBuffer, { modelId: mechanicalFile });
          } else {
            console.log('📝 Solo modelo arquitectónico - esperando 1 modelo');
          }
        } catch (error) {
          console.warn("Error al intentar cargar el modelo de instalaciones:", error);
          console.log('📝 Solo modelo arquitectónico - esperando 1 modelo');
        }

        // 7. Los modelos se añaden automáticamente a la escena via callback onItemSet
        // 8. El sistema de highlight se configura automáticamente cuando todos los modelos estén cargados
        
        // Actualizar fragmentos después de cargar todos los modelos
        fragmentsInstance.core.update(true);

        // 10. Calcula el bounding box de todos los modelos cargados
        const boxer = componentsInstance.get(OBC.BoundingBoxer);
        const getLoadedModelsBoundings = () => {
          boxer.list.clear();
          boxer.addFromModels();
          const box = boxer.get();
          boxer.list.clear();
          return box;
        };
        const box = getLoadedModelsBoundings();
        const sphere = new THREE.Sphere();
        box.getBoundingSphere(sphere);

        // 11. Ajusta la cámara para que enfoque todo el modelo
        updateRendererAndCamera();
        worldInstance.camera.controls.fitToSphere(sphere, true);

        // 12. Clasifica los elementos por niveles (plantas)
        const classifier = componentsInstance.get(OBC.Classifier);
        await classifier.byIfcBuildingStorey({ classificationName: "Levels" });
        const levelsClassification = classifier.list.get("Levels");
        if (levelsClassification) {
          const floorData = [];
          for (const [name] of levelsClassification) {
              floorData.push({
                  Name: { value: name },
                  expressID: name, // Usamos el nombre como ID único para React
              });
          }
          setFloors(floorData);
        }

        setIsInitialized(true);
        
        // Notificar que los componentes están listos
        if (onComponentsReady) {
          onComponentsReady(componentsInstance, true);
        }
      } catch (error) {
        console.error("Error durante la inicialización:", error);
      }
    };

    init();

    // Cleanup: libera recursos y observadores al desmontar el componente
    return () => {
      console.log("Limpiando recursos...");
      resizeObserver?.disconnect();
      if (workerURL) {
        URL.revokeObjectURL(workerURL);
      }
    };
  }, [buildingFile]);

  return (
    <>
      {/* Aquí se pueden añadir otros componentes como el panel de información o el selector de plantas */}
    </>
  );
};

export default ModelLoader;