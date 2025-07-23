import React, { useState, useEffect } from 'react';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';
import { getName, getAttributes, getItemPropertySets, formatItemPsets, onSelectionChange, getCurrentElementId, highlightSystemByName } from './ModelInformation';

interface ElementInfoPanelProps {
  isVisible: boolean;
  onClose: () => void;
  isIntegrated?: boolean;
}

const ElementInfoPanel: React.FC<ElementInfoPanelProps> = ({ isVisible, onClose, isIntegrated = false }) => {
  const [elementInfo, setElementInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lastLoadedElement, setLastLoadedElement] = useState<string | null>(null);

  // Función para verificar si el elemento tiene "Nombre de sistema"
  const hasSystemName = (elementInfo: any): boolean => {
    if (!elementInfo) {
      console.log('hasSystemName: No elementInfo');
      return false;
    }
    
    console.log('hasSystemName: Checking elementInfo:', elementInfo);
    
    // Convertir todo el objeto a string y buscar "Nombre de sistema"
    const elementString = JSON.stringify(elementInfo);
    console.log('hasSystemName: Element as string contains "Nombre de sistema":', elementString.includes('Nombre de sistema'));
    
    if (elementString.includes('Nombre de sistema')) {
      console.log('hasSystemName: Found "Nombre de sistema" in element data!');
      return true;
    }
    
    // También buscar variaciones
    if (elementString.includes('nombre de sistema') || elementString.includes('NOMBRE DE SISTEMA')) {
      console.log('hasSystemName: Found system name variation in element data!');
      return true;
    }
    
    console.log('hasSystemName: Not found anywhere');
    return false;
  };

  // Función para obtener el valor del "Nombre de sistema"
  const getSystemName = (elementInfo: any): string | null => {
    if (!elementInfo) return null;
    
    // Convertir todo el objeto a string y buscar el patrón
    const elementString = JSON.stringify(elementInfo);
    
    // Buscar patrón "Nombre de sistema":"valor"
    const match = elementString.match(/"Nombre de sistema"\s*:\s*"([^"]+)"/i);
    if (match && match[1]) {
      console.log('getSystemName: Found system name:', match[1]);
      return match[1];
    }
    
    // Buscar otros patrones posibles
    const match2 = elementString.match(/"nombre de sistema"\s*:\s*"([^"]+)"/i);
    if (match2 && match2[1]) {
      console.log('getSystemName: Found system name (lowercase):', match2[1]);
      return match2[1];
    }
    
    console.log('getSystemName: No system name found');
    return null;
  };

  // Función para manejar el clic en "Ver Sistema"
  const handleViewSystem = async () => {
    const systemName = getSystemName(elementInfo);
    if (systemName) {
      console.log('Ver sistema:', systemName);
      await highlightSystemByName(systemName);
    }
  };

  const loadElementInfo = async () => {
    try {
      // Obtener ID único del elemento actual
      const elementId = getCurrentElementId();
      
      // Si no hay elemento seleccionado, limpiar
      if (!elementId) {
        setElementInfo(null);
        setLastLoadedElement(null);
        return;
      }
      
      // Si es el mismo elemento, no recargar
      if (elementId === lastLoadedElement && elementInfo) {
        console.log('Elemento ya cargado, evitando recarga innecesaria');
        return;
      }
      
      setLoading(true);
      
      const name = await getName();
      const attrs = await getAttributes();
      const rawPsets = await getItemPropertySets();
      const psets = formatItemPsets(rawPsets ?? []);
      
      setElementInfo({
        name,
        attributes: attrs,
        propertySets: psets
      });
      
      setLastLoadedElement(elementId);
      console.log(`Información cargada para elemento: ${elementId}`);
    } catch (error) {
      console.error("Error al cargar información del elemento:", error);
      setElementInfo(null);
      setLastLoadedElement(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isVisible) {
      loadElementInfo();
    }
  }, [isVisible]);
  
  // Escuchar cambios en la selección para actualizar la información
  useEffect(() => {
    if (isVisible) {
      const unsubscribe = onSelectionChange(() => {
        console.log('Selección cambiada, actualizando panel...');
        loadElementInfo();
      });
      
      return unsubscribe;
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <aside style={{
      position: isIntegrated ? 'relative' : 'fixed',
      top: isIntegrated ? 'auto' : 0,
      right: isIntegrated ? 'auto' : 0,
      width: isIntegrated ? '100%' : 320,
      height: isIntegrated ? '100%' : '100vh',
      background: '#fff',
      borderLeft: isIntegrated ? 'none' : '1px solid #e0e0e0',
      zIndex: isIntegrated ? 'auto' : 1000,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: isIntegrated ? 'none' : '-2px 0 8px rgba(0,0,0,0.1)'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#f8f9fa'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <InfoIcon style={{ color: '#007EB0', fontSize: 20 }} />
          <h3 style={{ 
            margin: 0, 
            fontSize: 16, 
            fontWeight: 600, 
            color: '#333' 
          }}>
            Informació Element
          </h3>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseOver={e => (e.currentTarget.style.background = '#e3f2fd')}
          onMouseOut={e => (e.currentTarget.style.background = 'none')}
        >
          <CloseIcon style={{ fontSize: 18, color: '#666' }} />
        </button>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        padding: '20px',
        overflowY: 'auto'
      }}>
        {loading ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: 100,
            color: '#666'
          }}>
            Carregant...
          </div>
        ) : elementInfo ? (
          <div>
            {/* Element Name */}
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ 
                margin: '0 0 8px 0', 
                fontSize: 14, 
                fontWeight: 600, 
                color: '#007EB0',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Nom
              </h4>
              <p style={{ 
                margin: 0, 
                fontSize: 16, 
                fontWeight: 500, 
                color: '#333',
                wordBreak: 'break-word'
              }}>
                {elementInfo.name || 'Sense nom'}
              </p>
            </div>

            {/* Botón Ver Sistema - solo si el elemento tiene "Nombre de sistema" */}
            {hasSystemName(elementInfo) && (
              <div style={{ marginBottom: 24 }}>
                {/* Mostrar el nombre del sistema */}
                <div style={{
                  width: '100%',
                  marginBottom: 8,
                  padding: '6px 0',
                  fontWeight: 600,
                  color: '#007EB0',
                  fontSize: 15,
                  textAlign: 'center',
                  wordBreak: 'break-word',
                  background: '#eaf6fb',
                  borderRadius: 4
                }}>
                  {getSystemName(elementInfo)}
                </div>
                <button
                  onClick={handleViewSystem}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: '#007EB0',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#005a8b';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#007EB0';
                  }}
                >
                  🔍 Ver Sistema
                </button>
              </div>
            )}

            {/* Attributes */}
            {elementInfo.attributes && Object.keys(elementInfo.attributes).length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ 
                  margin: '0 0 12px 0', 
                  fontSize: 14, 
                  fontWeight: 600, 
                  color: '#007EB0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Atributs
                </h4>
                <div style={{ 
                  background: '#f8f9fa', 
                  borderRadius: 6, 
                  padding: 12,
                  border: '1px solid #e9ecef'
                }}>
                  {Object.entries(elementInfo.attributes).map(([key, value]: [string, any]) => (
                    <div key={key} style={{ 
                      marginBottom: 8, 
                      fontSize: 13,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start'
                    }}>
                      <span style={{ 
                        fontWeight: 500, 
                        color: '#666',
                        marginRight: 8,
                        minWidth: '40%'
                      }}>
                        {key}:
                      </span>
                      <span style={{ 
                        color: '#333',
                        wordBreak: 'break-word',
                        textAlign: 'right'
                      }}>
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Property Sets */}
            {elementInfo.propertySets && Object.keys(elementInfo.propertySets).length > 0 && (
              <div>
                <h4 style={{ 
                  margin: '0 0 12px 0', 
                  fontSize: 14, 
                  fontWeight: 600, 
                  color: '#007EB0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Property Sets
                </h4>
                {Object.entries(elementInfo.propertySets).map(([psetName, properties]: [string, any]) => (
                  <div key={psetName} style={{ 
                    marginBottom: 16,
                    background: '#f8f9fa',
                    borderRadius: 6,
                    border: '1px solid #e9ecef',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      background: '#e9ecef',
                      padding: '8px 12px',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#495057'
                    }}>
                      {psetName}
                    </div>
                    <div style={{ padding: 12 }}>
                      {Object.entries(properties).map(([propName, propValue]: [string, any]) => (
                        <div key={propName} style={{ 
                          marginBottom: 6, 
                          fontSize: 12,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start'
                        }}>
                          <span style={{ 
                            fontWeight: 500, 
                            color: '#666',
                            marginRight: 8,
                            minWidth: '45%'
                          }}>
                            {propName}:
                          </span>
                          <span style={{ 
                            color: '#333',
                            wordBreak: 'break-word',
                            textAlign: 'right',
                            fontSize: 11
                          }}>
                            {typeof propValue === 'object' ? JSON.stringify(propValue) : String(propValue)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* No data message */}
            {(!elementInfo.attributes || Object.keys(elementInfo.attributes).length === 0) &&
             (!elementInfo.propertySets || Object.keys(elementInfo.propertySets).length === 0) && (
              <div style={{
                textAlign: 'center',
                color: '#666',
                fontSize: 14,
                marginTop: 40
              }}>
                No hi ha informació disponible per aquest element
              </div>
            )}
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            color: '#666',
            fontSize: 14,
            marginTop: 40
          }}>
            Selecciona un element per veure la seva informació
          </div>
        )}
      </div>
    </aside>
  );
};

export default ElementInfoPanel;
