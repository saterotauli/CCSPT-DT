import React from 'react';

interface FloorSelectorProps {
  floors: any[];
  onFloorSelected: (floor: any | null) => void;
  onViewModeChange: (mode: '2D' | '3D') => void;
  currentMode: '2D' | '3D';
}

const FloorSelector: React.FC<FloorSelectorProps> = ({ floors, onFloorSelected, onViewModeChange, currentMode }) => {
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
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginBottom: '10px' }}>
        <label style={{ cursor: 'pointer' }}>
          <input
            type="radio"
            value="3D"
            checked={currentMode === '3D'}
            onChange={() => onViewModeChange('3D')}
          /> 3D
        </label>
        <label style={{ cursor: 'pointer' }}>
          <input
            type="radio"
            value="2D"
            checked={currentMode === '2D'}
            onChange={() => onViewModeChange('2D')}
          /> 2D
        </label>
      </div>
      <button onClick={() => onFloorSelected(null)}>Tot</button>
      {floors.length > 0 ? (
        floors.map((floor) => (
          <button key={floor.expressID} onClick={() => onFloorSelected(floor)}>
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
