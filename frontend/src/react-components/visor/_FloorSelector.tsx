import React from 'react';

interface FloorSelectorProps {
  floors: any[];
  onViewSelected: (floor: any | null) => void;
}

const FloorSelector: React.FC<FloorSelectorProps> = ({ floors, onViewSelected }) => {
  const style: React.CSSProperties = {
    position: 'absolute',
    top: '80px',
    right: '20px',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: '10px',
    borderRadius: '5px',
    border: '1px solid #ccc',
  };

  return (
    <div style={style}>
      <h4 style={{ margin: '0 0 10px 0' }}>Views</h4>
      <button onClick={() => onViewSelected(null)}>3D View</button>
      {floors.length > 0 ? (
        floors.map((floor) => (
          <button key={floor.expressID} onClick={() => onViewSelected(floor)}>
            {floor.Name?.value || `Nivel ${floor.expressID}`}
          </button>
        ))
      ) : (
        <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>No se encontraron niveles.</p>
      )}
    </div>
  );
};

export default FloorSelector;
