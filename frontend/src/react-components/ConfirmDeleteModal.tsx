import React from "react";

interface ConfirmDeleteModalProps {
  open: boolean;
  habitacionesAEliminar: any[];
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ open, habitacionesAEliminar, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{ background: 'white', borderRadius: 8, padding: 24, minWidth: 350, maxWidth: 600 }}>
        <h2>Confirmar eliminación de habitaciones</h2>
        <p>Se van a borrar las siguientes habitaciones de la base de datos:</p>
        <ul style={{ maxHeight: 200, overflowY: 'auto' }}>
          {habitacionesAEliminar.map((h, idx) => (
            <li key={h.guid || idx}>
              {h.codi ? <b>{h.codi}</b> : null} {h.guid ? <span style={{ color: '#888', fontSize: 12 }}>({h.guid})</span> : null}
            </li>
          ))}
        </ul>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
          <button onClick={onCancel} style={{ marginRight: 12 }}>Cancelar</button>
          <button onClick={onConfirm} style={{ background: '#d32f2f', color: 'white' }}>Confirmar borrado</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;
