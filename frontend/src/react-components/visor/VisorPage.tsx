import React from "react";
import ModelLoader from "./ModelLoader";
import ConsultaBox from "./ConsultaBox";
import ElementInfoPanel from "./ElementInfoPanel";
import "./visor3d.css";

const buildings = [
  { label: "RAC Advanced", value: "RAC", file: "CCSPT-RAC-M3D-AS.frag" },
  { label: "That OPEN", value: "TOC", file: "CCSPT-TOC-M3D-AS.frag" },
  { label: "Albada", value: "ALB", file: "CCSPT-ALB-M3D-AS.frag" },
  { label: "CQA", value: "CQA", file: "CCSPT-CQA-M3D-AS.frag" },
  { label: "Mínimo", value: "MIN", file: "CCSPT-MIN-M3D-AS.frag" },
  { label: "UDIAT", value: "UDI", file: "CCSPT-UDI-M3D-AS.frag" },
  { label: "VII Centenari", value: "VII", file: "CCSPT-VII-M3D-AS.frag" },  
];

const DISCIPLINES = [
  { code: "HVAC", name: "Climatització", icon: "HVAC.png" },
  { code: "FON", name: "Fontaneria", icon: "FON.png" },
  { code: "GAS", name: "Gasos Medicinals", icon: "GAS.png" },
  { code: "SEG", name: "Seguretat", icon: "SEG.png" },
  { code: "TUB", name: "Tub Pneumàtic", icon: "TUB.png" },
  { code: "SAN", name: "Sanejament", icon: "SAN.png" },
  { code: "ELE", name: "Electricitat", icon: "ELE.png" },
  { code: "TEL", name: "Telecomunicacions", icon: "TEL.png" }
];

const VisorPage: React.FC = () => {
  const [selectedBuilding, setSelectedBuilding] = React.useState<string>("");
  const [selectedDiscipline, setSelectedDiscipline] = React.useState<string>("");
  const [isBuildingDropdownOpen, setIsBuildingDropdownOpen] = React.useState<boolean>(false);
  const [isDisciplineDropdownOpen, setIsDisciplineDropdownOpen] = React.useState<boolean>(false);
  const [consultaHeight, setConsultaHeight] = React.useState<number>(30); // Porcentaje de altura para Consulta IA
  const [isResizing, setIsResizing] = React.useState<boolean>(false);

  // Encontrar el archivo del edificio seleccionado
  const selectedBuildingFile = buildings.find(b => b.value === selectedBuilding)?.file || "";

  // Cerrar dropdowns al hacer clic fuera
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-building-dropdown]')) {
        setIsBuildingDropdownOpen(false);
      }
      if (!target.closest('[data-discipline-dropdown]')) {
        setIsDisciplineDropdownOpen(false);
      }
    };

    if (isBuildingDropdownOpen || isDisciplineDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isBuildingDropdownOpen, isDisciplineDropdownOpen]);

  // Manejo del redimensionado del divisor
  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const container = document.getElementById('central-column');
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const newConsultaHeight = Math.max(20, Math.min(70, ((rect.height - relativeY) / rect.height) * 100));
      
      setConsultaHeight(newConsultaHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing]);

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%' }}>
      {/* Columna izquierda: selección */}
      <div style={{ width: '20%', minWidth: 200, borderRight: '1px solid #e0e0e0', padding: '1rem', boxSizing: 'border-box', background: '#f7f7f7' }}>
        
        {/* Selector de edificio personalizado */}
        <div data-building-dropdown style={{ position: 'relative' }}>
          {/* Botón principal del selector */}
          <div
            onClick={() => setIsBuildingDropdownOpen(!isBuildingDropdownOpen)}
            style={{
              width: '95%',
              padding: '0.5rem',
              fontSize: '1rem',
              border: '1px solid #000',
              borderRadius: '4px',
              backgroundColor: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {selectedBuilding ? (
                <>
                  <span style={{ 
                    fontWeight: 'bold', 
                    color: '#007acc',
                    minWidth: '40px'
                  }}>
                    {selectedBuilding}
                  </span>
                  <span>{buildings.find(b => b.value === selectedBuilding)?.label}</span>
                </>
              ) : (
                <span style={{ color: '#999' }}>Tria edifici...</span>
              )}
            </div>
            <span style={{ fontSize: '0.8rem', color: '#000' }}>▼</span>
          </div>

          {/* Dropdown de opciones */}
          {isBuildingDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: '#fff',
              border: '1px solid #ccc',
              borderTop: 'none',
              borderRadius: '0 0 4px 4px',
              zIndex: 1000,
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {/* Opción vacía */}
              <div
                onClick={() => {
                  setSelectedBuilding("");
                  setIsBuildingDropdownOpen(false);
                }}
                style={{
                  padding: '0.5rem',
                  cursor: 'pointer',
                  borderBottom: '1px solid #eee',
                  color: '#999'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
              >
                Tria edifici...
              </div>
              
              {/* Opciones con códigos */}
              {buildings.map((building) => (
                <div
                  key={building.value}
                  onClick={() => {
                    setSelectedBuilding(building.value);
                    setIsBuildingDropdownOpen(false);
                  }}
                  style={{
                    padding: '0.5rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    borderBottom: '1px solid #eee'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                >
                  <span style={{ 
                    fontWeight: 'bold', 
                    color: '#007acc',
                    minWidth: '40px'
                  }}>
                    {building.value}
                  </span>
                  <span>{building.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selector de disciplina personalizado */}
        <div data-discipline-dropdown style={{ marginTop: '1rem', position: 'relative' }}>
          {/* Botón principal del selector */}
          <div
            onClick={() => setIsDisciplineDropdownOpen(!isDisciplineDropdownOpen)}
            style={{
              width: '95%',
              padding: '0.5rem',
              fontSize: '1rem',
              border: '1px solid #000',
              borderRadius: '4px',
              backgroundColor: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {selectedDiscipline ? (
                <>
                  <img
                    src={`/assets/${DISCIPLINES.find(d => d.code === selectedDiscipline)?.icon}`}
                    alt={selectedDiscipline}
                    style={{ width: 30, height: 30, objectFit: 'contain' }}
                  />
                  <span>{DISCIPLINES.find(d => d.code === selectedDiscipline)?.name}</span>
                </>
              ) : (
                <span style={{ color: '#999' }}>Tria disciplina...</span>
              )}
            </div>
            <span style={{ fontSize: '0.8rem', color: '#000' }}>▼</span>
          </div>

          {/* Dropdown de opciones */}
          {isDisciplineDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: '95%',
              left: 0,
              right: 0,
              backgroundColor: '#fff',
              border: '1px solid #ccc',
              borderTop: 'none',
              borderRadius: '0 0 4px 4px',
              zIndex: 1000,
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {/* Opción vacía */}
              <div
                onClick={() => {
                  setSelectedDiscipline("");
                  setIsDisciplineDropdownOpen(false);
                }}
                style={{
                  padding: '0.5rem',
                  cursor: 'pointer',
                  borderBottom: '1px solid #eee',
                  color: '#999'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
              >
                Tria disciplina...
              </div>
              
              {/* Opciones con iconos */}
              {DISCIPLINES.map((discipline) => (
                <div
                  key={discipline.code}
                  onClick={() => {
                    setSelectedDiscipline(discipline.code);
                    setIsDisciplineDropdownOpen(false);
                  }}
                  style={{
                    padding: '0.5rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    borderBottom: '1px solid #eee'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                >
                  <img
                    src={`/assets/${discipline.icon}`}
                    alt={discipline.code}
                    style={{ width: 20, height: 20, objectFit: 'contain' }}
                  />
                  <span>{discipline.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Columna central: visor */}
      <div 
        id="central-column"
        style={{ 
          width: '60%', 
          padding: '0.5rem', 
          boxSizing: 'border-box', 
          background: '#fff',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Contenedor para el visor 3D */}
        <div style={{ 
          height: `${100 - consultaHeight}%`, 
          display: 'flex', 
          flexDirection: 'column',
          minHeight: '30%'
        }}>
          <div 
            id="viewer-container" 
            style={{ 
              width: '100%', 
              height: '100%', 
              border: '1px solid #ccc', 
              borderRadius: 8 
            }}
          ></div>
          
          {/* ModelLoader se encarga de montar el visor 3D en el contenedor */}
          <ModelLoader 
            buildingFile={selectedBuildingFile}
          />
        </div>

        {/* Divisor redimensionable */}
        <div
          onMouseDown={handleMouseDown}
          style={{
            height: '8px',
            background: isResizing ? '#007acc' : '#e0e0e0',
            cursor: 'row-resize',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            userSelect: 'none'
          }}
        >
          <div style={{
            width: '40px',
            height: '3px',
            background: '#999',
            borderRadius: '2px'
          }}></div>
        </div>

        {/* Contenedor para Consulta IA */}
        <div style={{ 
          height: `${consultaHeight}%`,
          minHeight: '20%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <ConsultaBox edificioActivo={selectedBuilding} />
        </div>
      </div>
      
      {/* Columna derecha: panel de información - siempre visible */}
      <div style={{ 
        width: '20%', 
        minWidth: 300, 
        borderLeft: '1px solid #e0e0e0', 
        background: '#f8f9fa',
        boxSizing: 'border-box'
      }}>
        <ElementInfoPanel 
          isVisible={true}
          onClose={() => {}} // No-op ya que no se puede cerrar
          isIntegrated={true}
        />
      </div>
    </div>
  );
};

export default VisorPage;
