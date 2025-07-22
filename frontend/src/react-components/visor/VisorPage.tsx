import React from "react";
import ModelLoader from "./ModelLoader";
import ConsultaBox from "./ConsultaBox";
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

const VisorPage: React.FC = () => {
  const [selectedBuilding, setSelectedBuilding] = React.useState<string>("");

  // Encontrar el archivo del edificio seleccionado
  const selectedBuildingFile = buildings.find(b => b.value === selectedBuilding)?.file || "";

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%' }}>
      {/* Columna izquierda: selección */}
      <div style={{ width: '25%', minWidth: 300, borderRight: '1px solid #e0e0e0', padding: '1rem', boxSizing: 'border-box', background: '#f7f7f7' }}>
        <h4>Edifici</h4>
        <select
          value={selectedBuilding}
          onChange={e => setSelectedBuilding(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', fontSize: '1rem' }}
        >
          <option value="">Tria edifici...</option>
          {buildings.map((b) => (
            <option key={b.value} value={b.value}>{b.label}</option>
          ))}
        </select>
        {/* Caja de consultas justo debajo del selector */}
        <ConsultaBox edificioActivo={selectedBuilding} />
      </div>
      {/* Columna derecha: visor */}
      <div style={{ width: '75%', padding: '0.5rem', boxSizing: 'border-box', background: '#fff' }}>


        {/* Contenedor para el visor 3D - DEBE ESTAR VACÍO */}
        <div id="viewer-container" style={{ width: '100%', height: 'calc(100%)', border: '1px solid #ccc', borderRadius: 8 }}></div>
        
        {/* ModelLoader se encarga de montar el visor 3D en el contenedor */}
        <ModelLoader buildingFile={selectedBuildingFile} />
      </div>
    </div>
  );
};

export default VisorPage;
