import React, { useEffect, useState, useRef } from 'react';
import * as OBC from '@thatopen/components';

interface ClassificationGroup {
  classification: string;
  group: string;
}

// Este componente replica el ejemplo oficial de ThatOpen
// https://github.com/ThatOpen/engine_components/blob/main/packages/core/src/fragments/Classifier/example.ts
const ClassifierExample: React.FC<{ components: OBC.Components | null }> = ({ components }) => {
  const [selectedGroup, setSelectedGroup] = useState<ClassificationGroup | null>(null);
  const [classifications, setClassifications] = useState<Map<string, Map<string, any>>>(new Map());
  const [isReady, setIsReady] = useState(false);
  
  // Referencias para evitar recreación de funciones
  const classifierRef = useRef<OBC.Classifier | null>(null);
  const fragmentsRef = useRef<OBC.FragmentsManager | null>(null);
  const hiderRef = useRef<OBC.Hider | null>(null);
  const setupDoneRef = useRef(false);
  
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
      top: '80px',
      left: '600px', 
      backgroundColor: 'white', 
      borderRadius: '8px',
      padding: '15px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
      maxHeight: '80vh',
      overflowY: 'auto',
      zIndex: 1000,
      width: '250px'
    }}>
      <div style={{ 
        borderBottom: '1px solid #eee', 
        paddingBottom: '10px',
        marginBottom: '10px',
        fontWeight: 'bold',
        fontSize: '16px'
      }}>
        Classifier Tutorial
      </div>
      
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
          Reset Visibility
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
    </div>
  );
};

export default ClassifierExample;
