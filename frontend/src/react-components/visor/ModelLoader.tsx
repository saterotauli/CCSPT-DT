import React, { useEffect, useState } from "react";
import * as THREE from "three";

import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import { setupHighlight, showElementInfo } from "./ModelInformation";
import FloorSelector from "./FloorSelector";
import ViewPlan from './ViewPlan';
import ClassifierExample from './ClassifierExample';

const ModelLoader: React.FC<{ buildingFile: string }> = ({ buildingFile }) => {

  const [world, setWorld] = useState<OBC.World | null>(null);
  const [floors, setFloors] = useState<any[]>([]);
  const [activeFloor, setActiveFloor] = useState<any | null>(null);
  const [components, setComponents] = useState<OBC.Components | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);


  useEffect(() => {
    const container = document.getElementById("viewer-container");
    if (!container) {
      console.error("No se encontró el contenedor 'viewer-container'");
      return;
    }
    container.innerHTML = "";

    // Guarda referencias para limpieza

    let workerURL: string | null = null;

    let resizeObserver: ResizeObserver | null = null;

    const init = async () => {
      try {
        console.log("Inicializando ModelLoader");
        const componentsInstance = new OBC.Components();
        setComponents(componentsInstance);

        const worlds = componentsInstance.get(OBC.Worlds);
        const worldInstance = worlds.create<
            OBC.SimpleScene,
            OBC.OrthoPerspectiveCamera,
            OBF.PostproductionRenderer
        >();
        setWorld(worldInstance);

        worldInstance.scene = new OBC.SimpleScene(componentsInstance);
        worldInstance.scene.setup();
        worldInstance.scene.three.background = null;

        worldInstance.renderer = new OBF.PostproductionRenderer(componentsInstance, container);
        worldInstance.camera = new OBC.OrthoPerspectiveCamera(componentsInstance);

        componentsInstance.init();

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

        // Configurar ResizeObserver para ajustar automáticamente
        if (container) {
          resizeObserver = new ResizeObserver(updateRendererAndCamera);
          resizeObserver.observe(container);
        }



        const grids = componentsInstance.get(OBC.Grids);
        grids.create(worldInstance);
        
        // Worker setup igual al ejemplo
        const workerUrl = "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
        const fetchedWorker = await fetch(workerUrl);
        const workerText = await fetchedWorker.text();
        const workerFile = new File([new Blob([workerText])], "worker.mjs", { type: "text/javascript" });
        workerURL = URL.createObjectURL(workerFile);
        const fragmentsInstance = componentsInstance.get(OBC.FragmentsManager);
        await fragmentsInstance.init(workerURL);

        setWorld(worldInstance);
        
        // Configurar eventos de cámara siguiendo documentación oficial
        worldInstance.camera.controls.addEventListener("rest", () => {
          if (fragmentsInstance) {
            fragmentsInstance.core.update(true);
          }
        });

        if (!buildingFile) {
          console.log("Ningún edificio seleccionado, no se carga modelo.");
          return;
        }

        // Cargar el modelo arquitectónico (AS.frag)
        const architecturalUrl = `/${buildingFile}`;
        console.log("Cargando modelo arquitectónico desde:", architecturalUrl);
        const archFile = await fetch(architecturalUrl);
        if (!archFile.ok) {
          throw new Error(`Error al cargar el modelo arquitectónico: ${archFile.status}`);
        }
        const archBuffer = await archFile.arrayBuffer();
        console.log("Buffer arquitectónico cargado, tamaño:", archBuffer.byteLength, "bytes");
        await fragmentsInstance.core.load(archBuffer, { modelId: buildingFile });
        console.log("Modelo arquitectónico cargado correctamente");
        
        // Intentar cargar el modelo de instalaciones (ME.frag) si existe
        try {
          // Crear el nombre del archivo para el modelo ME sustituyendo AS.frag por ME.frag
          const mechanicalFile = buildingFile.replace("-AS.frag", "-ME.frag");
          const mechanicalUrl = `/${mechanicalFile}`;
          
          console.log("Intentando cargar modelo de instalaciones desde:", mechanicalUrl);
          const mechFile = await fetch(mechanicalUrl);
          
          if (mechFile.ok) {
            const mechBuffer = await mechFile.arrayBuffer();
            console.log("Buffer de instalaciones cargado, tamaño:", mechBuffer.byteLength, "bytes");
            await fragmentsInstance.core.load(mechBuffer, { modelId: mechanicalFile });
            console.log("Modelo de instalaciones cargado correctamente");
          } else {
            console.log("Modelo de instalaciones no disponible o no encontrado.");
          }
        } catch (error) {
          console.warn("Error al intentar cargar el modelo de instalaciones:", error);
          // Continuamos con la ejecución aunque falle la carga del modelo ME
        }
        
        // Añadir modelos cargados a la escena
        for (const [, model] of fragmentsInstance.list) {
          worldInstance.scene.three.add(model.object);
          model.useCamera(worldInstance.camera.three);
        }
        
        // Actualizar fragmentos
        fragmentsInstance.core.update(true);

        // === LÓGICA DE HIGHLIGHT ===
        if (container) {
          setupHighlight(container, worldInstance, fragmentsInstance);
        }

        const boxer = componentsInstance.get(OBC.BoundingBoxer);

        const getLoadedModelsBoundings = () => {
          // As a good practice, always clean up the boxer list first
          // so no previous boxes added are taken into account
          boxer.list.clear();
          boxer.addFromModels();
          // This computes the merged box of the list.
          const box = boxer.get();
          // As a good practice, always clean up the boxer list after the calculation
          boxer.list.clear();
          return box;
        };

        const box = getLoadedModelsBoundings();
        const sphere = new THREE.Sphere();
        box.getBoundingSphere(sphere);

        // Actualizar manualmente el aspect ratio antes de hacer el fit
        updateRendererAndCamera();

        worldInstance.camera.controls.fitToSphere(sphere, true);

        // Lógica para obtener los planos usando el Classifier
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
        //target.loading = false;
      } catch (error) {
        console.error("Error durante la inicialización:", error);
      }
    };

    init();

    // Limpieza
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
      {isInitialized && world && components && <ViewPlan components={components} world={world} activeFloor={activeFloor} onViewClosed={() => setActiveFloor(null)} />}
      {isInitialized && world && floors.length > 0 && (
        <FloorSelector 
          floors={floors} 
          onViewSelected={(floor: any) => setActiveFloor(floor)} 
        />
      )}
      {isInitialized && components && (
        <ClassifierExample 
          components={components}
        />
      )}
      {isInitialized && (
        <button
          onClick={showElementInfo}
          style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            zIndex: 1001,
            padding: '8px 12px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
          title="Mostrar información del elemento seleccionado"
        >
          Info Elemento
        </button>
      )}
    </>
  );
};

export default ModelLoader;