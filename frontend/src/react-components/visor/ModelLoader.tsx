import React, { useEffect } from "react";
import * as THREE from "three";
import * as FRAGS from "@thatopen/fragments";
import * as OBC from "@thatopen/components";
import { setupHighlight } from "./ModelInformation";

const ModelLoader: React.FC<{ buildingFile: string }> = ({ buildingFile }) => {
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

    const init = async () => {
      try {
        console.log("Inicializando ModelLoader");
        // Inicialización de Components según el ejemplo exacto
        components = new OBC.Components();

        const worlds = components.get(OBC.Worlds);
        const world = worlds.create<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>();

        world.scene = new OBC.SimpleScene(components);
        world.scene.setup();
        world.scene.three.background = null;

        world.renderer = new OBC.SimpleRenderer(components, container);

        world.camera = new OBC.SimpleCamera(components);
        world.camera.controls.setLookAt(183, 11, -102, 27, -52, -11);

        const fragmentBbox = components.get(OBC.BoundingBoxer);

        components.init();

        const grids = components.get(OBC.Grids);
        grids.create(world);
        
        // Worker setup igual al ejemplo
        const workerUrl = "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
        const fetchedWorker = await fetch(workerUrl);
        const workerText = await fetchedWorker.text();
        const workerFile = new File([new Blob([workerText])], "worker.mjs", { type: "text/javascript" });
        workerURL = URL.createObjectURL(workerFile);
        fragments = new FRAGS.FragmentsModels(workerURL);
        
        // Importante: Eventos de cámara para actualización del modelo
        world.camera.controls.addEventListener("rest", () => fragments?.update(true));
        world.camera.controls.addEventListener("update", () => fragments?.update());

        fragments.models.list.onItemSet.add(({ value: model }) => {
          model.useCamera(world.camera.three);
          world.scene.three.add(model.object);
          // At the end, you tell fragments to update so the model can be seen given
          // the initial camera position
          fragments?.update(true);
        });

        
        /*fragmentBbox.add(model);

        const bbox = fragmentBbox.getMesh();
        fragmentBbox.reset();*/

        //world.camera.controls.fitToSphere(bbox, true);



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
        model = await fragments.load(buffer, { modelId: buildingFile });
        console.log("Modelo cargado correctamente");

        // === LÓGICA DE HIGHLIGHT ===
        // Material dorado para resaltar
        // --- Lógica de highlight modularizada ---
        // Importa setupHighlight desde ModelInformation
        // (debes agregar la importación al inicio del archivo)
        // import { setupHighlight } from "./ModelInformation";
        setupHighlight(container, model, world, fragments);
      } catch (error) {
        console.error("Error durante la inicialización:", error);
      }
    };

    init();

    // Limpieza
    return () => {
      console.log("Limpiando recursos...");
      
    };
  }, [buildingFile]);

  return null;
};

export default ModelLoader;