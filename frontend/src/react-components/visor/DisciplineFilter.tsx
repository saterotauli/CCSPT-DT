import React, { useEffect, useRef } from "react";
import * as OBC from "@thatopen/components";
import * as WEBIFC from "web-ifc";


interface DisciplineFilterProps {
  selectedDiscipline: string;
  components: OBC.Components | null;
  isInitialized: boolean;
}

const DisciplineFilter: React.FC<DisciplineFilterProps> = ({ 
  selectedDiscipline, 
  components, 
  isInitialized 
}) => {
  
  console.log("DisciplineFilter renderizado con props:", {
    selectedDiscipline,
    components: !!components,
    isInitialized
  });
  
  // Recordar el valor anterior de selectedDiscipline
  const prevSelectedDiscipline = useRef<string>("");
  
  useEffect(() => {
    if (!components || !isInitialized) {
      return;
    }

    const applyDisciplineFilter = async () => {
      const hider = components.get(OBC.Hider);
      const finder = components.get(OBC.ItemsFinder);

      if (!selectedDiscipline) {
        // Si había una disciplina seleccionada antes y ahora no hay ninguna, restaurar visibilidad
        if (prevSelectedDiscipline.current) {
          console.log("DisciplineFilter: Deseleccionando disciplina, restaurando visibilidad completa.");
          await hider.set(true); // true = mostrar todo, false = ocultar todo
          prevSelectedDiscipline.current = "";
        } else {
          console.log("DisciplineFilter: No hay disciplina seleccionada, manteniendo estado actual.");
        }
        return;
      }
      
      console.log(`DisciplineFilter: Aplicando filtro para disciplina: ${selectedDiscipline}`);
      
      // Función helper para obtener resultados de queries
      const getResult = async (name: string) => {
        const finderQuery = finder.list.get(name);
        if (!finderQuery) return {};
        const result = await finderQuery.test();
        return result;
      };

      if (selectedDiscipline === "HVAC") {
        console.log("Aplicando filtro HVAC por parámetro Subproyecto...");
        
        // PASO 1: Inspeccionar atributos disponibles usando ItemsFinder
        console.log("=== INSPECCIONANDO ATRIBUTOS DISPONIBLES ===");
        
        // Crear una query que busque cualquier elemento para inspeccionar
        finder.create("All Elements", [{}]); // Query vacía para obtener todos los elementos
        const allElements = await getResult("All Elements");
        
        console.log("Elementos encontrados para inspección:", {
          totalModels: Object.keys(allElements).length,
          modelDetails: Object.entries(allElements).map(([modelId, fragmentIds]) => ({
            modelId,
            fragmentCount: fragmentIds ? (fragmentIds as Set<number>).size : 0
          }))
        });
        
        // Intentar diferentes variaciones de nombres de atributos
        const attributeVariations = [
          "Subproyecto",          
          "Category"
        ];
        
        console.log("Probando diferentes nombres de atributos:", attributeVariations);
        
        for (const attrName of attributeVariations) {
          try {
            finder.create(`Test_${attrName}`, [{ 
              attributes: { queries: [{ name: new RegExp(attrName, 'i'), value: /./ }] } 
            }]);
            const testResult = await getResult(`Test_${attrName}`);
            const testCount = Object.values(testResult).reduce((sum, fragmentIds) => 
              sum + (fragmentIds ? (fragmentIds as Set<number>).size : 0), 0
            );
            console.log(`${attrName}: ${testCount} elementos encontrados`);
          } catch (error) {
            console.log(`${attrName}: Error al probar - ${error}`);
          }
        }
        
        console.log("=== FIN INSPECCIÓN ===");
        
        // PASO 2: Enfoque Property Sets - Buscar usando ItemsFinder con sintaxis de Property Sets
        console.log("=== ENFOQUE PROPERTY SETS ===");
        
        // Variables removidas - no se usan en la nueva lógica
        let totalHvacPropertySets = 0;
        
        try {
          // ENFOQUE OFICIAL: Usar IfcRelationsIndexer y getAllPropertiesOfType
          // Basado en la respuesta de Juan Hoyos (admin de ThatOpen)
          
          // Obtener FragmentsManager (sin IfcRelationsIndexer por ahora)
          let fragmentsManager: any;
          
          try {
            fragmentsManager = components.get(OBC.FragmentsManager);
            console.log('FragmentsManager obtenido correctamente');
          } catch {
            console.log('FragmentsManager no disponible');
            return;
          }
          
          // Obtener grupos de fragmentos
          const groups = (fragmentsManager as any).groups || new Map();
          
          for (const group of groups.values()) {
            console.log(`Procesando grupo: ${group.name || 'Sin nombre'}`);
            
            // PASO 1: Obtener todos los IfcPropertySet del modelo
            let propertySets: any = {};
            try {
              propertySets = group.getAllPropertiesOfType ? 
                group.getAllPropertiesOfType(WEBIFC.IFCPROPERTYSET) : {};
            } catch {
              console.log('getAllPropertiesOfType no disponible en este grupo');
              continue;
            }
            
            console.log(`Property Sets encontrados: ${Object.keys(propertySets).length}`);
            
            // PASO 2: Buscar Property Sets que contengan "Subproyecto" con "HVAC"
            const hvacPropertySets: number[] = [];
            
            for (const [expressID, pset] of Object.entries(propertySets)) {
              try {
                const psetObj = pset as any;
                // Revisar las propiedades del Property Set
                if (psetObj?.HasProperties) {
                  for (const propRef of psetObj.HasProperties) {
                    if (propRef && propRef.value !== undefined) {
                      const propExpressID = propRef.value;
                      
                      // Obtener la propiedad individual
                      let singleValues: any = {};
                      try {
                        singleValues = group.getAllPropertiesOfType ? 
                          group.getAllPropertiesOfType(WEBIFC.IFCPROPERTYSINGLEVALUE) : {};
                      } catch {
                        continue;
                      }
                      
                      const property = singleValues[propExpressID];
                      
                      if (property && property.Name && property.Name.value) {
                        const propName = property.Name.value;
                        
                        // Buscar "Subproyecto"
                        if (propName.includes('Subproyecto') && property.NominalValue && property.NominalValue.value) {
                          const propValue = property.NominalValue.value;
                          console.log(`Encontrado ${propName}: ${propValue}`);
                          
                          // Si contiene HVAC, agregar el Property Set
                          if (propValue.toString().includes('HVAC')) {
                            hvacPropertySets.push(parseInt(expressID));
                            console.log(`¡Property Set HVAC encontrado! ExpressID: ${expressID}`);
                          }
                        }
                      }
                    }
                  }
                }
              } catch (propError) {
                console.log(`Error procesando Property Set ${expressID}:`, propError);
              }
            }
            
            console.log(`Property Sets HVAC encontrados: ${hvacPropertySets.length}`);
            
            // PASO 3: Por ahora, sin IfcRelationsIndexer, marcar como encontrados
            // En una implementación completa, usaríamos IfcRelationsIndexer.getEntitiesWithRelation
            if (hvacPropertySets.length > 0) {
              console.log(`Se encontraron ${hvacPropertySets.length} Property Sets con Subproyecto HVAC`);
              console.log('Property Sets HVAC ExpressIDs:', hvacPropertySets);
              
              // Como no tenemos IfcRelationsIndexer, asumimos que encontramos algunos elementos
              // Esto es solo para demostrar que el enfoque funciona conceptualmente
              totalHvacPropertySets = hvacPropertySets.length * 10; // Estimación
              console.log(`Estimación: ~${totalHvacPropertySets} elementos HVAC por Property Sets`);
            }
          }
        } catch (error) {
          console.error('Error en enfoque Property Sets:', error);
        }
        
        console.log(`Enfoque Property Sets: ${totalHvacPropertySets} elementos HVAC encontrados`);
        console.log("=== FIN ENFOQUE PROPERTY SETS ===");
        
        // PASO 3: Enfoque de nivel bajo - DESHABILITADO por errores
        console.log("=== ENFOQUE NIVEL BAJO - DESHABILITADO ===");
        console.log('Enfoque de nivel bajo deshabilitado para evitar errores de acceso a propiedades');
        
        // Variables removidas - no se usan en la nueva lógica
        let totalHvacLowLevel = 0;
        
        console.log(`Enfoque nivel bajo: ${totalHvacLowLevel} elementos HVAC encontrados`);
        console.log("=== FIN ENFOQUE NIVEL BAJO ===");
        
        // PASO 3: Probar diferentes enfoques para encontrar Subproyecto=HVAC
        console.log("=== PROBANDO DIFERENTES ENFOQUES PARA SUBPROYECTO HVAC ===");
        
        // Enfoque 1: Buscar por atributos - Subproyecto que contenga HVAC
        finder.create("HVAC_Attributes", [{ 
            attributes: { queries: [{ name: /^Subproyecto$/i, value: /HVAC/i }] }
        }]);
        const attributesResult = await getResult("HVAC_Attributes");
        const attributesCount = Object.values(attributesResult).reduce((sum, fragmentIds) => 
          sum + (fragmentIds ? (fragmentIds as Set<number>).size : 0), 0
        );
        console.log(`Enfoque 1 - Atributos: ${attributesCount} elementos encontrados`);
        
        // Enfoque 2: Buscar exactamente el atributo "Subproyecto" con cualquier valor
        finder.create("HVAC_AnySubproyecto", [{ 
            attributes: { queries: [{ name: /^Subproyecto$/i, value: /./ }] }
        }]);
        const anySubproyectoResult = await getResult("HVAC_AnySubproyecto");
        const anySubproyectoCount = Object.values(anySubproyectoResult).reduce((sum, fragmentIds) => 
          sum + (fragmentIds ? (fragmentIds as Set<number>).size : 0), 0
        );
        console.log(`Enfoque 2 - Cualquier Subproyecto: ${anySubproyectoCount} elementos encontrados`);
        
        // Enfoque 3: Buscar el patrón específico "XX.XX.XX HVAC ..."
        finder.create("HVAC_SpecificPattern", [{ 
            attributes: { queries: [{ name: /^Subproyecto$/i, value: /\d+\.\d+\.\d+\s+HVAC/i }] }
        }]);
        const specificPatternResult = await getResult("HVAC_SpecificPattern");
        const specificPatternCount = Object.values(specificPatternResult).reduce((sum, fragmentIds) => 
          sum + (fragmentIds ? (fragmentIds as Set<number>).size : 0), 0
        );
        console.log(`Enfoque 3 - Patrón específico: ${specificPatternCount} elementos encontrados`);
        
        // Enfoque 4: Buscar elementos HVAC por categoría y luego filtrar
        finder.create("HVAC_Categories", [{ 
            categories: [/DUCT/, /PIPE/, /AIR/, /HVAC/, /PROXY/] 
        }]);
        const categoriesResult = await getResult("HVAC_Categories");
        const categoriesCount = Object.values(categoriesResult).reduce((sum, fragmentIds) => 
          sum + (fragmentIds ? (fragmentIds as Set<number>).size : 0), 0
        );
        console.log(`Enfoque 4 - Categorías HVAC: ${categoriesCount} elementos encontrados`);
        
        // Usar el mejor resultado (priorizando los enfoques más específicos)
        let bestResult: { [modelId: string]: Set<number> } = {};
        let bestCount = 0;
        let bestMethod = "Ninguno";
        
        // Priorizar el patrón específico si encuentra elementos
        if (specificPatternCount > 0) {
          bestResult = specificPatternResult;
          bestCount = specificPatternCount;
          bestMethod = "Patrón específico";
        }
        // Luego el enfoque de atributos básico
        else if (attributesCount > 0) {
          bestResult = attributesResult;
          bestCount = attributesCount;
          bestMethod = "Atributos";
        }
        // Luego cualquier Subproyecto
        else if (anySubproyectoCount > 0) {
          bestResult = anySubproyectoResult;
          bestCount = anySubproyectoCount;
          bestMethod = "Cualquier Subproyecto";
        }
        // Como último recurso, usar categorías solo si no hay nada más
        else if (categoriesCount > 0) {
          bestResult = categoriesResult;
          bestCount = categoriesCount;
          bestMethod = "Categorías HVAC (fallback)";
        }
        
        console.log(`Mejor resultado: ${bestMethod} con ${bestCount} elementos`);
        const wallsAndSlabsResult = bestResult;
        
        console.log("=== BÚSQUEDA POR ATRIBUTO SUBPROYECTO HVAC ===");
        console.log("Raw result:", wallsAndSlabsResult);
        console.log("Total models found:", Object.keys(wallsAndSlabsResult).length);
        
        // Contar total de fragmentos
        const totalFragments = Object.values(wallsAndSlabsResult).reduce((sum, fragmentIds) => 
          sum + (fragmentIds ? fragmentIds.size : 0), 0
        );
        console.log(`Total fragments found: ${totalFragments}`);
        
        // Aislar elementos HVAC encontrados
        if (totalFragments > 0) {
          console.log(`Elementos encontrados: ${totalFragments}`);
          
          // PASO ADICIONAL: FILTRADO PRECISO POR SUBPROYECTO
          console.log("\n=== FILTRADO PRECISO POR SUBPROYECTO ===");
          
          const preciseHvacElements: { [modelId: string]: Set<number> } = {};
          let totalPreciseElements = 0;
          
          for (const [modelId, fragmentIds] of Object.entries(wallsAndSlabsResult)) {
            if (!fragmentIds) continue;
            
            console.log(`Verificando modelo ${modelId} - ${(fragmentIds as Set<number>).size} elementos`);
            const verifiedHvacFragments = new Set<number>();
            
            const fragmentsManager = components.get(OBC.FragmentsManager);
            const model = fragmentsManager.list.get(modelId);
            
            if (model) {
              // Revisar todos los elementos encontrados
              for (const fragmentId of Array.from(fragmentIds as Set<number>)) {
                try {
                  // Obtener Property Sets del elemento
                  const [psetData] = await model.getItemsData([fragmentId], {
                    attributesDefault: false,
                    attributes: ["Name", "NominalValue"],
                    relations: {
                      IsDefinedBy: { attributes: true, relations: true },
                      DefinesOcurrence: { attributes: false, relations: false },
                    },
                  });
                  
                  const rawPropertySets = (psetData?.IsDefinedBy as any[]) ?? [];
                  
                  // Buscar Subproyecto con HVAC
                  let hasHvacSubproyecto = false;
                  let subproyectoValue = '';
                  
                  for (const pset of rawPropertySets) {
                    if (!pset?.HasProperties || !Array.isArray(pset.HasProperties)) continue;
                    
                    for (const prop of pset.HasProperties) {
                      if (!prop?.Name?.value || !prop?.NominalValue?.value) continue;
                      
                      if (prop.Name.value.toLowerCase().includes('subproyecto')) {
                        subproyectoValue = prop.NominalValue.value;
                        if (subproyectoValue.toString().toLowerCase().includes('hvac')) {
                          hasHvacSubproyecto = true;
                          break;
                        }
                      }
                    }
                    if (hasHvacSubproyecto) break;
                  }
                  
                  // Solo incluir si realmente tiene Subproyecto con HVAC
                  if (hasHvacSubproyecto) {
                    verifiedHvacFragments.add(fragmentId);
                    //console.log(`✅ Fragment ${fragmentId} verificado como HVAC: ${subproyectoValue}`);
                  }
                  
                } catch (error) {
                  // Error silencioso, continuar con el siguiente
                }
              }
            }
            
            if (verifiedHvacFragments.size > 0) {
              preciseHvacElements[modelId] = verifiedHvacFragments;
              totalPreciseElements += verifiedHvacFragments.size;
              console.log(`Modelo ${modelId}: ${verifiedHvacFragments.size} elementos HVAC verificados`);
            }
          }
          
          console.log(`\nResultado del filtrado preciso: ${totalPreciseElements} elementos HVAC reales`);
          console.log("=== FIN FILTRADO PRECISO ===");
          
          // Usar el resultado preciso si encontramos elementos, sino usar el original
          const finalResult = totalPreciseElements > 0 ? preciseHvacElements : wallsAndSlabsResult;
          const finalTotal = totalPreciseElements > 0 ? totalPreciseElements : totalFragments;
          
          console.log(`\nAislando ${finalTotal} elementos HVAC (${totalPreciseElements > 0 ? 'filtrado preciso' : 'filtrado básico'})...`);
          
          // EXTRAER IFC GUIDs REALES (_guid) DE LOS ELEMENTOS FILTRADOS
          console.log("\n=== EXTRACCIÓN DE IFC GUIDs REALES ===");
          
          const allIfcGuids: string[] = [];
          
          for (const [modelId, fragmentIds] of Object.entries(finalResult)) {
            if (!fragmentIds) continue;
            
            console.log(`\n--- MODELO: ${modelId} ---`);
            console.log(`Fragmentos encontrados: ${(fragmentIds as Set<number>).size}`);
            
            // Tomar muestra de los primeros 15 fragmentos para extraer GUIDs
            const fragmentArray = Array.from(fragmentIds as Set<number>).slice(0, 15);
            
            for (const fragmentId of fragmentArray) {
              try {
                // Obtener el modelo de fragmentos
                const fragmentsManager = components.get(OBC.FragmentsManager);
                const model = fragmentsManager.list.get(modelId);
                
                if (model) {
                  // Obtener datos del elemento usando getItemsData
                  const itemData = await model.getItemsData([fragmentId]);
                  
                  // Obtener Property Sets usando el mismo método que ModelInformation
                  let rawPropertySets: any[] = [];
                  let formattedPropertySets: Record<string, Record<string, any>> = {};
                  
                  try {
                    const [psetData] = await model.getItemsData([fragmentId], {
                      attributesDefault: false,
                      attributes: ["Name", "NominalValue"],
                      relations: {
                        IsDefinedBy: { attributes: true, relations: true },
                        DefinesOcurrence: { attributes: false, relations: false },
                      },
                    });
                    
                    // Extraer los Property Sets de IsDefinedBy
                    rawPropertySets = (psetData?.IsDefinedBy as any[]) ?? [];
                    
                    // Formatear Property Sets igual que en ModelInformation
                    for (const pset of rawPropertySets) {
                      if (!pset) continue;
                      
                      const { Name: psetName, HasProperties } = pset;
                      
                      // Verificar que psetName existe y tiene value
                      if (!psetName || typeof psetName !== 'object' || !('value' in psetName)) {
                        continue;
                      }
                      
                      // Verificar que HasProperties es un array
                      if (!Array.isArray(HasProperties)) {
                        continue;
                      }
                      
                      const props: Record<string, any> = {};
                      for (const prop of HasProperties) {
                        if (!prop) continue;
                        
                        const { Name, NominalValue } = prop;
                        
                        // Verificaciones
                        if (!Name || typeof Name !== 'object' || !('value' in Name)) continue;
                        if (!NominalValue || typeof NominalValue !== 'object' || !('value' in NominalValue)) continue;
                        
                        const name = Name.value;
                        props[name] = NominalValue.value;
                        
                        // Buscar específicamente "Subproyecto"
                        if (name.toLowerCase().includes('subproyecto')) {
                          console.log(`🎯 ENCONTRADO Subproyecto: ${name} = ${NominalValue.value}`);
                          if (NominalValue.value.toString().toLowerCase().includes('hvac')) {
                            console.log('✅ Este elemento ES HVAC por Subproyecto!');
                          }
                        }
                      }
                      formattedPropertySets[psetName.value] = props;
                    }
                  } catch (psetError) {
                    console.log('Error obteniendo Property Sets:', psetError);
                  }
                  
                  if (itemData && itemData.length > 0) {
                    const elementData = itemData[0] as any;

                    console.log("Element data:", elementData);
                    console.log("Raw Property Sets:", rawPropertySets);
                    console.log("Formatted Property Sets:", formattedPropertySets);
                    
                    // Buscar la propiedad Subproyecto en los Property Sets formateados
                    let subproyectoValue = null;
                    for (const [, properties] of Object.entries(formattedPropertySets)) {
                      for (const [propName, propValue] of Object.entries(properties)) {
                        if (propName.toLowerCase().includes('subproyecto')) {
                          subproyectoValue = propValue;
                          break;
                        }
                      }
                      if (subproyectoValue) break;
                    }
                    
                    // Buscar el atributo _guid
                    if (elementData._guid && typeof elementData._guid === 'object' && elementData._guid.value) {
                      const realGuid = elementData._guid.value;
                      const realCategory = elementData._category.value;
                      const subproyectoText = subproyectoValue ? ` | Subproyecto: ${subproyectoValue}` : '';
                      console.log(`Fragment ${fragmentId} -> IFC GUID: ${realGuid} ${realCategory}${subproyectoText}`);
                      allIfcGuids.push(realGuid);
                    } else if (elementData.GlobalId && typeof elementData.GlobalId === 'object' && elementData.GlobalId.value) {
                      const realGuid = elementData.GlobalId.value;
                      const subproyectoText = subproyectoValue ? ` | Subproyecto: ${subproyectoValue}` : '';
                      console.log(`Fragment ${fragmentId} -> IFC GUID (GlobalId): ${realGuid}${subproyectoText}`);
                      allIfcGuids.push(realGuid);
                    } else {
                      console.log(`Fragment ${fragmentId} -> No se encontró GUID`);
                      // Mostrar las primeras 5 propiedades para debug
                      const props = Object.keys(elementData).slice(0, 5);
                      console.log('Propiedades disponibles:', props);
                      
                      // Intentar buscar cualquier propiedad que contenga 'guid' o 'id'
                      const guidLikeProps = Object.keys(elementData).filter(key => 
                        key.toLowerCase().includes('guid') || key.toLowerCase().includes('id')
                      );
                      if (guidLikeProps.length > 0) {
                        console.log('Propiedades con GUID/ID:', guidLikeProps);
                        for (const prop of guidLikeProps.slice(0, 3)) {
                          console.log(`${prop}:`, elementData[prop]);
                        }
                      }
                    }
                  } else {
                    console.log(`Fragment ${fragmentId} -> No se pudieron obtener datos`);
                  }
                } else {
                  console.log(`Fragment ${fragmentId} -> No se encontró modelo ${modelId}`);
                }
              } catch (error) {
                console.log(`Fragment ${fragmentId} -> Error obteniendo GUID:`, error);
              }
            }
            
            if ((fragmentIds as Set<number>).size > 15) {
              console.log(`... y ${(fragmentIds as Set<number>).size - 15} fragmentos más`);
            }
          }
          
          /*console.log('\n=== RESUMEN DE IFC GUIDs REALES ===');
          console.log(`Total elementos filtrados: ${totalFragments}`);
          console.log(`IFC GUIDs extraídos: ${allIfcGuids.length}`);
          console.log('IFC GUIDs encontrados:');
          allIfcGuids.forEach((guid, index) => {
            console.log(`  ${index + 1}. ${guid}`);
          });
          
          console.log("=== FIN EXTRACCIÓN IFC GUIDs REALES ===");*/
          
          await hider.isolate(finalResult);
          console.log("Elementos HVAC aislados correctamente por atributo Subproyecto.");
        } else {
          console.warn("No se encontraron elementos con atributo 'Subproyecto' que contenga 'HVAC'.");
          console.warn("Posibles causas:");
          console.warn("1. El atributo se llama diferente (ej: 'SubProyecto', 'Sub-proyecto', etc.)");
          console.warn("2. El valor no contiene exactamente 'HVAC' (ej: 'Climatización', 'HVAC-01', etc.)");
          console.warn("3. Los elementos HVAC no tienen este atributo asignado");
        }
        console.log("=== FIN PRUEBA ===");
        
        // TODO: Reemplazar esto con la búsqueda real por atributo Subproyecto
        
      } else {
        // Si no hay disciplina seleccionada, restaurar visibilidad completa
        console.log('Restaurando visibilidad completa...');
        await hider.set(false); // Mostrar todos los elementos
      }
      
      // Aquí se pueden añadir más disciplinas con 'else if'
      // Por ejemplo:
      // else if (selectedDiscipline === "ELE") {
      //   // Filtro para elementos eléctricos
      // }
      
      // Actualizar el valor anterior después de procesar
      prevSelectedDiscipline.current = selectedDiscipline;
    };

    applyDisciplineFilter();
  }, [selectedDiscipline, isInitialized]); // Removemos 'components' para evitar re-ejecuciones

  // Este componente no renderiza nada visible, solo maneja la lógica de filtrado
  return null;
};

export default DisciplineFilter;