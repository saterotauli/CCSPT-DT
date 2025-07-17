import React, { useEffect, useState } from "react";
import * as THREE from "three";
import * as FRAGS from "@thatopen/fragments";
import * as OBC from "@thatopen/components";
import { setupHighlight } from "./ModelInformation";

const ModelLoader: React.FC<{ buildingFile: string }> = ({ buildingFile }) => {
  const [fragments, setFragments] = useState<any>(null);
  const [world, setWorld] = useState<any>(null);

  useEffect(() => {
    const container = document.getElementById("viewer-container");
    if (!container) {
      console.error("No se encontró el contenedor 'viewer-container'");
      return;
    }
    container.innerHTML = "";

    // Guarda referencias para limpieza
    let components: OBC.Components | null = null;
    let fragments: FRAGS.FragmentsModels | null = null;
    let workerURL: string | null = null;
    let model: any = null;
    let resizeObserver: ResizeObserver | null = null;

    const init = async () => {
      try {
        console.log("Inicializando ModelLoader");
        // Inicialización de Components según el ejemplo exacto
        components = new OBC.Components();

        const worlds = components.get(OBC.Worlds);
        const worldInstance = worlds.create<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>();

        worldInstance.scene = new OBC.SimpleScene(components);
        worldInstance.scene.setup();
        worldInstance.scene.three.background = null;

        worldInstance.renderer = new OBC.SimpleRenderer(components, container);

        worldInstance.camera = new OBC.SimpleCamera(components);
        worldInstance.camera.controls.setLookAt(183, 11, -102, 27, -52, -11);

        const fragmentBbox = components.get(OBC.BoundingBoxer);

        components.init();

        const updateRendererAndCamera = () => {
          if (worldInstance && worldInstance.renderer && worldInstance.camera) {
            worldInstance.renderer.resize();
            const camera = worldInstance.camera.three;
            if (camera instanceof THREE.PerspectiveCamera) {
              camera.aspect = container.clientWidth / container.clientHeight;
              camera.updateProjectionMatrix();
            }
          }
        };

        // Configurar ResizeObserver para ajustar automáticamente
        resizeObserver = new ResizeObserver(updateRendererAndCamera);
        resizeObserver.observe(container);



        const grids = components.get(OBC.Grids);
        grids.create(worldInstance);
        
        // Worker setup igual al ejemplo
        const workerUrl = "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
        const fetchedWorker = await fetch(workerUrl);
        const workerText = await fetchedWorker.text();
        const workerFile = new File([new Blob([workerText])], "worker.mjs", { type: "text/javascript" });
        workerURL = URL.createObjectURL(workerFile);
        const fragmentsInstance = components.get(OBC.FragmentsManager);
        fragmentsInstance.init(workerURL);
        setFragments(fragmentsInstance);
        setWorld(worldInstance);
        
        // Importante: Eventos de cámara para actualización del modelo
        worldInstance.camera.controls.addEventListener("rest", () => fragmentsInstance?.core.update(true));
        worldInstance.onCameraChanged.add((camera) => {
          for (const [, model] of fragmentsInstance.list) {
            model.useCamera(camera.three);
          }
          fragmentsInstance.core.update(true);
        });

        fragmentsInstance.list.onItemSet.add(({ value: model }) => {
          model.useCamera(worldInstance.camera.three);
          worldInstance.scene.three.add(model.object);
          fragmentsInstance.core.update(true);
        });

        
        



        // Solo cargar el modelo si buildingFile tiene valor
        if (!buildingFile) {
          console.log("Ningún edificio seleccionado, no se carga modelo.");
          return;
        }
        const modelUrl = `/${buildingFile}`;
        console.log("Cargando modelo desde:", modelUrl);
        const file = await fetch(modelUrl);
        if (!file.ok) {
          throw new Error(`Error al cargar el modelo: ${file.status}`);
        }
        const buffer = await file.arrayBuffer();
        console.log("Buffer cargado, tamaño:", buffer.byteLength, "bytes");
        model = await fragmentsInstance.core.load(buffer, { modelId: buildingFile });
        console.log("Modelo cargado correctamente");

        // === LÓGICA DE HIGHLIGHT ===
        setupHighlight(container, model, worldInstance, fragmentsInstance);

        const boxer = components.get(OBC.BoundingBoxer);

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

  return null;

};

export default ModelLoader;