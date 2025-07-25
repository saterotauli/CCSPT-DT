import React, { useEffect, useState } from 'react';

interface IfcBuilding {
  guid: string;
  nom: string;
  codi: string;
}

const IfcBuildingsTable: React.FC = () => {
  const [ifcBuildings, setIfcBuildings] = useState<IfcBuilding[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [form, setForm] = useState<IfcBuilding>({ guid: '', nom: '', codi: '' });
  const [editGuid, setEditGuid] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<IfcBuilding>({ guid: '', nom: '', codi: '' });

  const fetchIfcBuildings = () => {
    setLoading(true);
    fetch('/api/ifcbuildings')
      .then(res => res.json())
      .then((data: IfcBuilding[]) => {
        setIfcBuildings(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchIfcBuildings();
  }, []);

  // Crear
  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    fetch('/api/ifcbuildings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
      .then(() => {
        setForm({ guid: '', nom: '', codi: '' });
        fetchIfcBuildings();
      });
  };

  // Borrar
  const handleDelete = (guid: string) => {
    if (!window.confirm('¿Seguro que quieres borrar este IfcBuilding?')) return;
    fetch(`/api/ifcbuildings/${guid}`, { method: 'DELETE' })
      .then(() => fetchIfcBuildings());
  };

  // Editar
  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    fetch(`/api/ifcbuildings/${editGuid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
      .then(() => {
        setEditGuid(null);
        setEditForm({ guid: '', nom: '', codi: '' });
        fetchIfcBuildings();
      });
  };

  if (loading) return <p>Cargando IfcBuildings...</p>;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header d'Edificis */}
      <header style={{
        background: '#007EB0',
        color: '#fff',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #005a7e'
      }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 500 }}>Gestió d'Edificis</h1>
        <div style={{ fontSize: '14px', opacity: 0.9 }}>
          Administració de models IFC
        </div>
      </header>
      
      <div style={{ flex: 1, padding: 32, background: '#f8f9fa', overflow: 'auto' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 12px #0001', padding: 32 }}>
      {/* Alta */}
      <form onSubmit={handleAdd} style={{ marginBottom: 20 }}>
        <input
          required
          placeholder="GUID"
          value={form.guid}
          onChange={e => setForm({ ...form, guid: e.target.value })}
        />
        <input
          required
          placeholder="Nom"
          value={form.nom}
          onChange={e => setForm({ ...form, nom: e.target.value })}
        />
        <input
          required
          placeholder="Codi"
          value={form.codi}
          onChange={e => setForm({ ...form, codi: e.target.value })}
        />
        <button type="submit">Crear IfcBuilding</button>
      </form>

      <table>
        <thead>
          <tr>
            <th>GUID</th>
            <th>Nom</th>
            <th>Codi</th>
            <th>Accions</th>
          </tr>
        </thead>
        <tbody>
          {ifcBuildings.map((e) => (
            editGuid === e.guid ? (
              <tr key={e.guid}>
                <td>{e.guid}</td>
                <td>
                  <input
                    value={editForm.nom}
                    onChange={ev => setEditForm({ ...editForm, nom: ev.target.value })}
                  />
                </td>
                <td>
                  <input
                    value={editForm.codi}
                    onChange={ev => setEditForm({ ...editForm, codi: ev.target.value })}
                  />
                </td>
                <td>
                  <button onClick={handleEdit} disabled={editForm.nom === (ifcBuildings.find(e => e.guid === editGuid)?.nom ?? '') && editForm.codi === (ifcBuildings.find(e => e.guid === editGuid)?.codi ?? '')}>Guardar</button>
                  <button onClick={() => setEditGuid(null)}>Cancelar</button>
                </td>
              </tr>
            ) : (
              <tr key={e.guid}>
                <td>{e.guid}</td>
                <td>{e.nom}</td>
                <td>{e.codi}</td>
                <td>
                  <button onClick={() => {
                    setEditGuid(e.guid);
                    setEditForm(e);
                  }}>Editar</button>
                  <button onClick={() => handleDelete(e.guid)}>Borrar</button>
                </td>
              </tr>
            )
          ))}
        </tbody>
      </table>
        </div>
      </div>
    </div>
  );
};

export default IfcBuildingsTable;
