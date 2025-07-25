import React, { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import * as OBC from '@thatopen/components';

interface ClassificationGroup {
  classification: string;
  group: string;
}

// Este componente replica el ejemplo oficial de ThatOpen
// https://github.com/ThatOpen/engine_components/blob/main/packages/core/src/fragments/Classifier/example.ts
const ClassifierExample: React.FC<{ components: OBC.Components | null }> = ({ components }) => {
  const [selectedGroup, setSelectedGroup] = useState<ClassificationGroup | null>(null);
  const [isCollapsed, setIsCollapsed] = React.useState<boolean>(false);
  const [classifications, setClassifications] = useState<Map<string, Map<string, any>>>(new Map());
  const [isReady, setIsReady] = useState(false);
  const [cameraMode, setCameraMode] = useState<'3D' | '2D'>('3D'); // Por defecto 3D
  
  // Estado para guardar la posición inicial de la cámara
  const [initialCameraPosition, setInitialCameraPosition] = useState<{
    position: THREE.Vector3;
    target: THREE.Vector3;
  } | null>(null);
  
  // Referencias para evitar recreación de funciones
  const classifierRef = useRef<OBC.Classifier | null>(null);
  const fragmentsRef = useRef<OBC.FragmentsManager | null>(null);
  const hiderRef = useRef<OBC.Hider | null>(null);
  const setupDoneRef = useRef(false);
  
  // Función para cambiar entre modo 2D y 3D
  const toggleCameraMode = (mode: '2D' | '3D') => {
    console.log('toggleCameraMode llamado con modo:', mode);
    console.log('isReady:', isReady, 'components:', !!components, 'setupDone:', setupDoneRef.current);
    
    if (!components) {
      console.error('Components no disponible');
      return;
    }
    
    if (!isReady || !setupDoneRef.current) {
      console.error('Componente no está listo aún');
      return;
    }
    
    try {
      const worlds = components.get(OBC.Worlds);
      
      // Buscar el primer mundo disponible
      let world = null;
      if (worlds.list.size > 0) {
        world = worlds.list.values().next().value;
      }
      
      if (!world) {
        console.error('No se encontró ningún mundo disponible. Mundos:', worlds.list.size);
        return;
      }
      
      console.log('Mundo encontrado:', world);
      
      // Verificar que la cámara es OrthoPerspectiveCamera
      const camera = world.camera as OBC.OrthoPerspectiveCamera;
      if (!camera) {
        console.error('La cámara no es OrthoPerspectiveCamera. Cámara:', camera);
        return;
      }
      
      console.log('Cámara encontrada, modo actual:', camera.mode?.id);
      
      // Asegurar que siempre esté en modo ortográfico
      if (camera.projection) {
        camera.projection.set('Orthographic');
      }
      
      // Cambiar modo de navegación
      if (mode === '2D') {
        // Modo Plan: vista superior sin orbitar
        camera.set('Plan');
        console.log('Cambiado a modo 2D (Plan - vista superior)');
        
        // Posicionar cámara en vista cenital (desde arriba)
        try {
          // Usar BoundingBoxer para obtener el bounding box del modelo
          const boxer = components.get(OBC.BoundingBoxer);
          boxer.list.clear();
          boxer.addFromModels();
          const box = boxer.get();
          boxer.list.clear();
          
          if (box) {
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            // Posicionar cámara desde arriba
            const height = Math.max(size.x, size.z) * 1.2; // Altura basada en el tamaño del modelo
            
            // Rotación para alinear con el norte del proyecto
            // CONFIGURACIÓN: Ajusta este ángulo según la orientación de tu norte de proyecto
            // 0 = norte hacia arriba, Math.PI/2 = norte hacia la derecha, Math.PI = norte hacia abajo, etc.
            const northRotation = (-81.01 + 180) * (Math.PI / 180); // Actualmente: 180° (norte hacia abajo)
            
            // Calcular posición de cámara con rotación
            const offsetX = Math.sin(northRotation) * height * 0.1;
            const offsetZ = Math.cos(northRotation) * height * 0.1;
            
            const cameraPosition = new THREE.Vector3(
              center.x + offsetX, 
              center.y + height, 
              center.z + offsetZ
            );
            const target = new THREE.Vector3(center.x, center.y, center.z);
            
            // Usar setLookAt para posicionar la cámara
            camera.controls.setLookAt(
              cameraPosition.x, cameraPosition.y, cameraPosition.z,
              target.x, target.y, target.z,
              true // animate
            );
            
            // Aplicar rotación adicional para orientación del norte
            // Esto rota la vista para alinear con el norte del proyecto
            setTimeout(() => {
              if (camera.three && camera.controls) {
                camera.three.up.set(Math.sin(northRotation), 0, Math.cos(northRotation));
                camera.three.updateProjectionMatrix();
                // Forzar actualización de los controles con delta time
                if (typeof camera.controls.update === 'function') {
                  try {
                    camera.controls.update(0.016); // ~60fps delta time
                  } catch (e) {
                    console.warn('No se pudo actualizar los controles:', e);
                  }
                }
              }
            }, 100);
            
            console.log('Cámara posicionada en vista cenital:', cameraPosition, 'mirando a:', target);
          } else {
            console.warn('No se pudo obtener el bounding box del modelo');
          }
        } catch (error) {
          console.warn('No se pudo posicionar la cámara en vista cenital:', error);
        }
      } else {
        // Modo Orbit: permite orbitar en 3D
        camera.set('Orbit');
        console.log('Cambiado a modo 3D (Orbit - navegación libre)');
        
        // Resetear la rotación del norte (deshacer northRotation)
        camera.three.up.set(0, 1, 0); // Volver al up vector por defecto
        
        // Restaurar la posición inicial de la cámara
        if (initialCameraPosition && camera.controls) {
          try {
            console.log('Restaurando posición inicial de cámara:', initialCameraPosition);
            
            // Usar setLookAt para restaurar la posición inicial con animación
            camera.controls.setLookAt(
              initialCameraPosition.position.x,
              initialCameraPosition.position.y,
              initialCameraPosition.position.z,
              initialCameraPosition.target.x,
              initialCameraPosition.target.y,
              initialCameraPosition.target.z,
              true // animate
            );
            
            console.log('Posición inicial restaurada correctamente');
          } catch (error) {
            console.warn('No se pudo restaurar la posición inicial de la cámara:', error);
          }
        } else {
          console.warn('No hay posición inicial guardada o controles no disponibles');
        }
      }
      
      setCameraMode(mode);
    } catch (error) {
      console.error('Error al cambiar modo de cámara:', error);
    }
  };
  
  // Componente auxiliar para verificar el estado de inicialización
  const checkInitStatus = () => {
    if (!components) return false;
    
    try {
      const fragments = components.get(OBC.FragmentsManager);
      fragmentsRef.current = fragments;
      
      // Verificación segura: comprobamos si el FragmentsManager está inicializado
      // y si tiene al menos un modelo cargado
      const isInitialized = fragments && 
                          fragments.core && 
                          typeof fragments.list === 'object' &&
                          fragments.list.size > 0;
      
      return isInitialized;
    } catch (error) {
      console.warn('Error al verificar estado de inicialización:', error);
      return false;
    }
  };
  
  // Este efecto controla la inicialización segura del componente
  useEffect(() => {
    // Resetear cuando cambien los components (nuevo edificio)
    setupDoneRef.current = false;
    setClassifications(new Map());
    setSelectedGroup(null);
    setInitialCameraPosition(null); // Resetear posición inicial guardada
    
    // Si ya se completó la configuración, no lo hacemos de nuevo
    if (setupDoneRef.current) return;
    
    // Verificamos si está listo para inicializarse
    const ready = checkInitStatus();
    setIsReady(ready);
    
    if (ready && components) {
      try {
        // Inicializamos las referencias
        classifierRef.current = components.get(OBC.Classifier);
        fragmentsRef.current = components.get(OBC.FragmentsManager);
        hiderRef.current = components.get(OBC.Hider);
        
        // Guardar la posición inicial de la cámara también aquí
        const worlds = components.get(OBC.Worlds);
        if (worlds.list.size > 0) {
          const world = worlds.list.values().next().value;
          if (world) {
            const camera = world.camera as OBC.OrthoPerspectiveCamera;
            
            if (camera && camera.three) {
              const currentPosition = camera.three.position.clone();
              const currentTarget = new THREE.Vector3();
              
              if (camera.controls && camera.controls.getTarget) {
                camera.controls.getTarget(currentTarget);
              } else {
                const direction = new THREE.Vector3();
                camera.three.getWorldDirection(direction);
                currentTarget.copy(currentPosition).add(direction.multiplyScalar(10));
              }
              
              setInitialCameraPosition({
                position: currentPosition,
                target: currentTarget
              });
              
              console.log('Posición inicial de cámara guardada (setup inicial):', {
                position: currentPosition,
                target: currentTarget
              });
            }
          }
        }
        
        setupDoneRef.current = true;
        console.log('ClassifierExample: Componentes inicializados correctamente');
      } catch (error) {
        console.error('Error al inicializar ClassifierExample:', error);
      }
    }
    
    // Establecemos un intervalo para verificar el estado de inicialización
    const checkIntervalId = setInterval(() => {
      const currentStatus = checkInitStatus();
      if (currentStatus !== isReady) {
        setIsReady(currentStatus);
        
        // Si pasamos de no-listo a listo, realizamos la configuración
        if (currentStatus && !setupDoneRef.current && components) {
          try {
            classifierRef.current = components.get(OBC.Classifier);
            fragmentsRef.current = components.get(OBC.FragmentsManager);
            hiderRef.current = components.get(OBC.Hider);
            
            // Guardar la posición inicial de la cámara
            const worlds = components.get(OBC.Worlds);
            if (worlds.list.size > 0) {
              const world = worlds.list.values().next().value;
              if (world) {
                const camera = world.camera as OBC.OrthoPerspectiveCamera;
              
              if (camera && camera.three) {
                // Guardar posición y objetivo actuales como posición inicial
                const currentPosition = camera.three.position.clone();
                const currentTarget = new THREE.Vector3();
                
                // Obtener el objetivo actual de los controles si está disponible
                if (camera.controls && camera.controls.getTarget) {
                  camera.controls.getTarget(currentTarget);
                } else {
                  // Fallback: usar la dirección de la cámara
                  const direction = new THREE.Vector3();
                  camera.three.getWorldDirection(direction);
                  currentTarget.copy(currentPosition).add(direction.multiplyScalar(10));
                }
                
                setInitialCameraPosition({
                  position: currentPosition,
                  target: currentTarget
                });
                
                console.log('Posición inicial de cámara guardada:', {
                  position: currentPosition,
                  target: currentTarget
                });
              }
            }
            }
            
            setupDoneRef.current = true;
            console.log('ClassifierExample: Componentes inicializados correctamente (intervalo)');
          } catch (error) {
            console.error('Error al inicializar ClassifierExample:', error);
          }
        }
      }
    }, 1000); // Verificamos cada segundo
    
    return () => {
      // Limpiamos el intervalo al desmontar
      clearInterval(checkIntervalId);
    };
  }, [components, isReady]);
  
  // Efecto para configurar el listener de cambio de modo de navegación
  useEffect(() => {
    if (!isReady || !components || !setupDoneRef.current) return;
    
    try {
      const worlds = components.get(OBC.Worlds);
      
      // Buscar el primer mundo disponible
      let world = null;
      if (worlds.list.size > 0) {
        world = worlds.list.values().next().value;
      }
      
      if (!world) {
        console.warn('No se encontró mundo para configurar listener de modo');
        return;
      }
      
      const camera = world.camera as OBC.OrthoPerspectiveCamera;
      if (!camera || !camera.mode) {
        console.warn('Cámara no soporta cambio de modo para listener');
        return;
      }
      
      // Asegurar que inicie en modo ortográfico
      if (camera.projection) {
        camera.projection.set('Orthographic');
      }
      
      // Configurar listener para cambios de modo de navegación
      const onModeChange = () => {
        const mode = camera.mode.id;
        console.log('Modo de navegación cambiado a:', mode);
        
        // Actualizar estado local basado en el modo
        setCameraMode(mode === 'Plan' ? '2D' : '3D');
        
        // Actualizar grid - en modo Plan (2D) no necesita fade
        try {
          const grids = components.get(OBC.Grids);
          if (grids && grids.list.size > 0) {
            const grid = grids.list.values().next().value;
            if (grid) {
              grid.fade = mode !== 'Plan'; // No fade en modo Plan (2D)
            }
          }
        } catch (error) {
          console.warn('No se pudo actualizar el grid:', error);
        }
      };
      
      // Por ahora no hay listener de cambio de modo disponible
      // El estado se actualizará manualmente en toggleCameraMode
      console.log('Listener de modo configurado (manual)');
      
      // Ejecutar una vez para configurar el estado inicial
      onModeChange();
    } catch (error) {
      console.error('Error al configurar listener de modo:', error);
    }
  }, [isReady, components]);
  
  // Este efecto maneja la creación de clasificaciones solo cuando estamos listos
  useEffect(() => {
    // No procedemos si no está listo o ya se configuró
    if (!isReady || !components || !setupDoneRef.current) return;
    
    const classifier = classifierRef.current;
    const fragments = fragmentsRef.current;
    
    if (!classifier || !fragments) {
      console.warn('ClassifierExample: Referencias no disponibles');
      return;
    }
    
    // Función para manejar cambios en las clasificaciones
    const onClassifierChange = () => {
      if (classifier.list) {
        console.log("Actualizando clasificaciones", Array.from(classifier.list.keys()));
        setClassifications(new Map(classifier.list));
      }
    };
    
    // Función para añadir las clasificaciones por defecto
    const addDefaultGroupings = async () => {
      try {
        console.log("Inicializando clasificaciones por defecto...");
        
        // Creamos las clasificaciones
        //await classifier.byCategory();
        await classifier.byIfcBuildingStorey({ classificationName: "Levels" });
        
        console.log("Clasificaciones creadas:", Array.from(classifier.list.keys()));
        // Actualizar el estado con las nuevas clasificaciones
        setClassifications(new Map(classifier.list));
      } catch (error) {
        console.error("Error al crear clasificaciones:", error);
      }
    };
    
    // Añadir listener para cambios en la clasificación
    if (classifier.list && classifier.list.onItemSet) {
      classifier.list.onItemSet.add(onClassifierChange);
    }
    
    // Crear clasificaciones iniciales
    addDefaultGroupings();
    
    // Limpieza al desmontar
    return () => {
      try {
        // Limpiar todos los listeners
        if (classifier.list && classifier.list.onItemSet) {
          classifier.list.onItemSet.remove(onClassifierChange);
        }
      } catch (error) {
        console.warn("Error al limpiar listeners:", error);
      }
    };
  }, [isReady, components]);

  const resetVisibility = async () => {
    // Usar la referencia en lugar de obtenerlo cada vez
    const hider = hiderRef.current;
    if (!hider) {
      console.warn('Hider no disponible para resetVisibility');
      return;
    }
    
    try {
      await hider.set(true);
      setSelectedGroup(null);
    } catch (error) {
      console.error('Error al resetear visibilidad:', error);
    }
  };

  const handleIsolateGroup = async (classification: string, group: string) => {
    // Usar las referencias en lugar de obtenerlos cada vez
    const classifier = classifierRef.current;
    const hider = hiderRef.current;
    
    if (!classifier || !hider) {
      console.warn('Referencias no disponibles para handleIsolateGroup');
      return;
    }
    
    // Toggle: Si hacemos clic en el mismo nivel ya seleccionado, mostrar todo
    if (selectedGroup?.classification === classification && selectedGroup?.group === group) {
      try {
        await hider.set(true); // Mostrar todo
        setSelectedGroup(null);
      } catch (error) {
        console.error('Error al resetear visibilidad:', error);
      }
      return;
    }

    try {
      // Verificar que classifier.list exista
      if (!classifier.list) {
        console.warn('La lista de clasificación no está disponible');
        return;
      }
      
      // Usar el método oficial para obtener los fragmentos del nivel
      const classificationMap = classifier.list.get(classification);
      if (!classificationMap) {
        console.warn(`Clasificación ${classification} no encontrada`);
        return;
      }
      
      const groupData = classificationMap.get(group);
      if (!groupData) {
        console.warn(`Grupo ${group} no encontrado en clasificación ${classification}`);
        return;
      }
      
      console.log(`Aislando grupo ${group} de clasificación ${classification}...`);
      
      // Obtener el mapa de fragmentos para este nivel
      const levelFragments = await groupData.get();
      
      // Usar la API de Hider para aislar los fragmentos del nivel
      // Esta es la manera recomendada por ThatOpen
      await hider.isolate(levelFragments);
      
      setSelectedGroup({ classification, group });
      console.log(`Grupo ${group} aislado correctamente`);
    } catch (error) {
      console.error('Error al aislar nivel:', error);
    }
  };

  return (
    <div className="bim-panel" style={{ 
      position: 'absolute', 
      top: '10px',
      left: '10px',
      backgroundColor: 'white', 
      borderRadius: '8px',
      padding: isCollapsed ? '10px' : '15px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
      maxHeight: '80vh',
      overflowY: 'auto',
      zIndex: 1000,
      width: isCollapsed ? '40px' : '180px',
      transition: 'all 0.3s ease'
    }}>
      <div style={{ 
        borderBottom: isCollapsed ? 'none' : '1px solid #eee', 
        paddingBottom: isCollapsed ? '0' : '10px',
        marginBottom: isCollapsed ? '0' : '10px',
        fontWeight: 'bold',
        fontSize: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!isCollapsed && <span>Nivells</span>}
          {!isCollapsed && (
            <div style={{ display: 'flex', gap: '2px' }}>
              <button
                onClick={() => toggleCameraMode('3D')}
                disabled={!isReady || !setupDoneRef.current}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  border: '1px solid #007EB0',
                  borderRadius: '4px 0 0 4px',
                  backgroundColor: cameraMode === '3D' ? '#007EB0' : 'transparent',
                  color: cameraMode === '3D' ? 'white' : (!isReady || !setupDoneRef.current) ? '#ccc' : '#007EB0',
                  cursor: (!isReady || !setupDoneRef.current) ? 'not-allowed' : 'pointer',
                  fontWeight: cameraMode === '3D' ? 'bold' : 'normal',
                  opacity: (!isReady || !setupDoneRef.current) ? 0.5 : 1
                }}
                title={(!isReady || !setupDoneRef.current) ? 'Esperando carga del modelo...' : 'Vista 3D (Ortográfica con navegación libre)'}
              >
                3D
              </button>
              <button
                onClick={() => toggleCameraMode('2D')}
                disabled={!isReady || !setupDoneRef.current}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  border: '1px solid #007EB0',
                  borderRadius: '0 4px 4px 0',
                  backgroundColor: cameraMode === '2D' ? '#007EB0' : 'transparent',
                  color: cameraMode === '2D' ? 'white' : (!isReady || !setupDoneRef.current) ? '#ccc' : '#007EB0',
                  cursor: (!isReady || !setupDoneRef.current) ? 'not-allowed' : 'pointer',
                  fontWeight: cameraMode === '2D' ? 'bold' : 'normal',
                  opacity: (!isReady || !setupDoneRef.current) ? 0.5 : 1
                }}
                title={(!isReady || !setupDoneRef.current) ? 'Esperando carga del modelo...' : 'Vista 2D (Superior, sin orbitar)'}
              >
                2D
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '2px',
            color: '#666'
          }}
          title={isCollapsed ? 'Expandir' : 'Colapsar'}
        >
          {isCollapsed ? '📋' : '←'}
        </button>
      </div>
      
      {!isCollapsed && (
        <>
          {/* Panel Section: General */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ 
          fontSize: '14px', 
          fontWeight: 'bold',
          marginBottom: '10px' 
        }}>
          General
        </div>
        <button 
          onClick={resetVisibility} 
          style={{
            padding: '8px 12px',
            backgroundColor: '#f0f0f0',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer',
            width: '100%',
            textAlign: 'left',
            fontWeight: 'normal',
            fontSize: '14px'
          }}
        >
          Tot 
        </button>
      </div>
      
      {/* Panel Section: Groupings */}
      <div>
        <div style={{ 
          fontSize: '14px', 
          fontWeight: 'bold',
          marginBottom: '10px' 
        }}>
          Groupings
        </div>
        
        {/* Tabla de grupos */}
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {Array.from(classifications.entries()).map(([classificationName, groups]) => {
            return Array.from(groups.entries()).map(([groupName]) => (
              <div 
                key={`${classificationName}-${groupName}`}
                style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: '1px solid #f5f5f5'
                }}
              >
                <div style={{ fontSize: '14px' }}>{groupName}</div>
                <button
                  onClick={() => handleIsolateGroup(classificationName, groupName)}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: selectedGroup?.classification === classificationName && 
                                     selectedGroup?.group === groupName ? '#e0e0ff' : 'transparent',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  <span role="img" aria-label="isolate">⬛</span>
                </button>
              </div>
            ));
          })}
        </div>
      </div>
        </>
      )}
    </div>
  );
};

export default ClassifierExample;
