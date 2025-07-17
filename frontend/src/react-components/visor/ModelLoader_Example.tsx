// src/react-components/IFCViewer/components/ModelLoader.tsx

import React, { useEffect, useState } from "react";
import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import Stats from "stats.js";

import { useViewer } from "../../context/ViewerContext";

declare global {
    interface Window {
        __CURRENT_MODEL__?: { model: any; fragments: any };
    }
}

export function ModelLoader({ buildingCode }: { buildingCode: string }) {

    const { components, world, setFragmentModel, isSceneReady, setFragments } = useViewer();

    useEffect(() => {
        if (!isSceneReady || !world.camera || !world.renderer || !world.scene) return;

        let previousModel: any = null;
        let previousFragments: any = null;
        let fragments: any = null;
        let model: any = null;

        const loadModel = async () => {
            try {
                // Verificar nuevamente que la cámara esté lista
                if (!world.camera?.controls) {
                    console.warn("Los controles de la cámara no están disponibles");
                    return;
                }

                const container = document.getElementById("viewer-container")!;

                // Setup Fragments
                const workerUrl = "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
                const fetchedWorker = await fetch(workerUrl);
                const workerText = await fetchedWorker.text();
                const workerFile = new File([new Blob([workerText])], "worker.mjs", {
                    type: "text/javascript",
                });
                const url = URL.createObjectURL(workerFile);
                fragments = new FRAGS.FragmentsModels(url);

                // Load the model first
                const file = await fetch(`/models/CCSPT-${buildingCode}-M3D-AS.frag`);
                const buffer = await file.arrayBuffer();
                model = await fragments.load(buffer, { modelId: "example" });

                // Set up model configuration after loading
                const camera = world.camera?.three;
                if (camera) {
                    model.useCamera(camera as THREE.PerspectiveCamera);
                }

                // Ocultar todos los elementos primero
                

                // Obtener y mostrar solo los elementos IFCSPACE
                const ifcSpaceItems = await model.getItemsOfCategory("IFCSPACE");
                const spaceIds = (
                    await Promise.all(ifcSpaceItems.map((item: any) => item.getLocalId()))
                ).filter((id) => id !== null) as number[];

                if (spaceIds.length > 0) {
                    // Mostrar solo los espacios (cambiado a true)
                    await model.setVisible(spaceIds, true);
                    console.log("Elementos IFCSPACE encontrados y mostrados:", spaceIds.length);
                } else {
                    console.warn("No se encontraron elementos IFCSPACE en el modelo");
                }

                // Añadir el modelo a la escena
                world.scene.three.add(model.object);

                // Actualizar vista para reflejar los cambios
                await fragments.update(true);

                //await model.setVisible([], false);

                // Set the model in the context
                setFragmentModel(model);
                setFragments(fragments);

                // Set up camera to fit the model
                const box = new THREE.Box3().setFromObject(model.object);
                if (world.camera && 'controls' in world.camera && world.camera.controls) {
                    world.camera.controls.fitToBox(box, true);
                }

                // Configurar eventos para actualizar fragmentos
                if (world.camera && 'controls' in world.camera && world.camera.controls) {
                    world.camera.controls.addEventListener("rest", () => fragments.update(true));
                    world.camera.controls.addEventListener("update", () => fragments.update());
                }

            } catch (err) {
                console.error(t.errorLoadingModel, err);
            }
        }

        // Unload previous model if exists
        if (window.__CURRENT_MODEL__) {
            try {
                const { model, fragments } = window.__CURRENT_MODEL__;
                if (model && world.scene.three.children.includes(model.object)) {
                    world.scene.three.remove(model.object);
                }
                // Forzar dispose del modelo
                if (model && typeof model.dispose === 'function') {
                    model.dispose();
                }
                // Forzar dispose de fragments
                if (fragments && typeof fragments.dispose === 'function') {
                    fragments.dispose();
                }
                setFragmentModel(undefined);
                setFragments(undefined);
                // Eliminar referencia global
                window.__CURRENT_MODEL__ = undefined;
            } catch (err) {
                console.warn("Error al descargar el modelo anterior:", err);
            }
        }

        loadModel().then(() => {
            // Guardar referencia global solo del modelo y fragments cargados
            window.__CURRENT_MODEL__ = {
                model,
                fragments
            };
        });

        return () => {
            const statsElement = document.querySelector('.stats');
            if (statsElement) statsElement.remove();
        };
    }, [isSceneReady, buildingCode]);

    // This component doesn't render anything in the UI, it only executes loading logic.
    return null;
}