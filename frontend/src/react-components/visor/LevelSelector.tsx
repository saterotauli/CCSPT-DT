import React, { useEffect, useState } from "react";
import { LevelManager } from "./LevelManager";
import * as OBC from "@thatopen/components";

interface LevelSelectorProps {
  components: OBC.Components | null;
  onLevelSelected?: (levelName: string) => void;
}

/**
 * Componente para seleccionar y manipular niveles del edificio BIM (IfcBuildingStorey)
 * Permite aislar, colorear y mostrar todos los niveles
 */
const LevelSelector: React.FC<LevelSelectorProps> = ({ components, onLevelSelected }) => {
  const [levels, setLevels] = useState<string[]>([]);
  const [levelManager, setLevelManager] = useState<LevelManager | null>(null);
  const [currentLevel, setCurrentLevel] = useState<string | null>(null);
  const [colorMode, setColorMode] = useState<boolean>(false);

  // Colores predefinidos para los niveles
  const colors = {
    RED: 0xff0000,
    GREEN: 0x00ff00, 
    BLUE: 0x0000ff,
    YELLOW: 0xffff00,
    ORANGE: 0xffa500,
    PURPLE: 0x800080,
  };

  useEffect(() => {
    if (!components) return;

    const classifier = components.get(OBC.Classifier);
    
    const init = async () => {
      try {
        console.log("Inicializando clasificación de niveles...");
        
        // Exactamente como en el ejemplo que has proporcionado
        await classifier.byIfcBuildingStorey({ classificationName: "Levels" });
        
        // Inicializar el LevelManager después de la clasificación
        const manager = new LevelManager(components);
        setLevelManager(manager);
        
        // Obtener los nombres de niveles
        const levelsClassification = classifier.list.get("Levels");
        let levelNames: string[] = [];
        
        if (levelsClassification instanceof Map) {
          levelNames = Array.from(levelsClassification.keys());
        } else if (typeof levelsClassification === 'object' && levelsClassification) {
          levelNames = Object.keys(levelsClassification);
        }
        
        console.log("Niveles disponibles:", levelNames);
        setLevels(levelNames);
      } catch (error) {
        console.error("Error al inicializar clasificación de niveles:", error);
      }
    };
    
    init();
  }, [components]);

  // Manejar selección de nivel
  const handleLevelSelect = (levelName: string) => {
    if (!levelManager) return;
    
    setCurrentLevel(prevLevel => prevLevel === levelName ? null : levelName);
    
    if (colorMode) {
      // En modo color, aplicamos colores diferentes
      const colorKeys = Object.keys(colors) as Array<keyof typeof colors>;
      const randomColor = colors[colorKeys[Math.floor(Math.random() * colorKeys.length)]];
      levelManager.colorizeLevel(levelName, randomColor);
    } else {
      // En modo normal, aislamos el nivel
      levelManager.isolateLevel(levelName);
    }
    
    // Notificar al componente padre si existe callback
    if (onLevelSelected) {
      onLevelSelected(levelName);
    }
  };

  // Mostrar todos los niveles
  const handleShowAll = () => {
    if (!levelManager) return;
    
    if (colorMode) {
      levelManager.resetColors();
    } else {
      levelManager.showAllLevels();
    }
    
    setCurrentLevel(null);
  };

  // Cambiar modo (aislar/colorear)
  const toggleMode = () => {
    if (!levelManager) return;
    
    // Al cambiar de modo, resetear el estado visual
    if (colorMode) {
      levelManager.resetColors();
    } else {
      levelManager.showAllLevels();
    }
    
    setColorMode(!colorMode);
    setCurrentLevel(null);
  };

  // Estilos para botones
  const buttonStyle: React.CSSProperties = {
    margin: "4px",
    padding: "8px 16px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
  };

  const levelButtonStyle = (isActive: boolean): React.CSSProperties => ({
    ...buttonStyle,
    backgroundColor: isActive ? "#28a745" : "#007bff",
  });

  const modeButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: colorMode ? "#dc3545" : "#17a2b8",
  };

  return (
    <div style={{
      position: "absolute",
      top: "80px",
      right: "180px",
      padding: "10px",
      backgroundColor: "rgba(255, 255, 255, 0.8)",
      borderRadius: "8px",
      boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
      maxWidth: "300px",
      zIndex: 1000,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
        <h3 style={{ margin: "0 0 10px 0" }}>Niveles del Edificio</h3>
        <button 
          style={modeButtonStyle}
          onClick={toggleMode}
        >
          Modo: {colorMode ? "Colorear" : "Aislar"}
        </button>
      </div>
      
      <div style={{ marginBottom: "10px" }}>
        <button 
          style={buttonStyle}
          onClick={handleShowAll}
        >
          Mostrar Todo
        </button>
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", maxHeight: "300px", overflowY: "auto" }}>
        {levels.map(level => (
          <button 
            key={level}
            style={levelButtonStyle(currentLevel === level)}
            onClick={() => handleLevelSelect(level)}
          >
            {level}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LevelSelector;
