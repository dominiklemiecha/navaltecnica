import { useState, useEffect } from 'react';
import { adminApi, dataApi } from '../services/api';

export default function AdminDestinations() {
  const [destinations, setDestinations] = useState([]);
  const [locations, setLocations] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [newDest, setNewDest] = useState({ name: '', location_id: '', km: '', travel_hours: '', highway_cost: '' });

  useEffect(() => {
    adminApi.getDestinations().then(r => setDestinations(r.data));
    dataApi.getLocations().then(r => setLocations(r.data));
  }, []);

  async function handleAdd() {
    if (!newDest.name.trim() || !newDest.location_id) return;
    try {
      await adminApi.createDestination({
        name: newDest.name.trim(),
        location_id: parseInt(newDest.location_id),
        km: parseFloat(newDest.km) || 0,
        travel_hours: parseFloat(newDest.travel_hours) || 0,
        highway_cost: parseFloat(newDest.highway_cost) || 0
      });
      const r = await adminApi.getDestinations();
      setDestinations(r.data);
      setNewDest({ name: '', location_id: '', km: '', travel_hours: '', highway_cost: '' });
    } catch (err) { alert('Errore: ' + err.message); }
  }

  async function handleSave() {
    try {
      await adminApi.updateDestination(editingId, {
        name: editData.name,
        location_id: parseInt(editData.location_id),
        km: parseFloat(editData.km) || 0,
        travel_hours: parseFloat(editData.travel_hours) || 0,
        highway_cost: parseFloat(editData.highway_cost) || 0
      });
      const r = await adminApi.getDestinations();
      setDestinations(r.data);
      setEditingId(null);
    } catch (err) { alert('Errore: ' + err.message); }
  }

  async function handleDelete(id) {
    if (!confirm('Eliminare questa destinazione?')) return;
    try {
      await adminApi.deleteDestination(id);
      setDestinations(prev => prev.filter(d => d.id !== id));
    } catch (err) { alert('Errore: ' + err.message); }
  }

  function startEdit(dest) {
    setEditingId(dest.id);
    setEditData({ ...dest });
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Destinazioni</h1>
          <p>Gestisci le destinazioni con distanze e costi da Carrara</p>
        </div>
      </div>

      {/* Form nuova destinazione */}
      <div className="card">
        <h2>Aggiungi Destinazione</h2>
        <div className="inline-form">
          <div className="form-group" style={{ flex: 2 }}>
            <label>Nome</label>
            <input value={newDest.name} onChange={e => setNewDest(d => ({ ...d, name: e.target.value }))} placeholder="Es: GENOVA" />
          </div>
          <div className="form-group">
            <label>Location</label>
            <select value={newDest.location_id} onChange={e => setNewDest(d => ({ ...d, location_id: e.target.value }))}>
              <option value="">--</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>KM (A/R)</label>
            <input type="number" value={newDest.km} onChange={e => setNewDest(d => ({ ...d, km: e.target.value }))} placeholder="0" />
          </div>
          <div className="form-group">
            <label>Ore Viaggio</label>
            <input type="number" step="0.1" value={newDest.travel_hours} onChange={e => setNewDest(d => ({ ...d, travel_hours: e.target.value }))} placeholder="0" />
          </div>
          <div className="form-group">
            <label>Autostrada</label>
            <input type="number" step="0.01" value={newDest.highway_cost} onChange={e => setNewDest(d => ({ ...d, highway_cost: e.target.value }))} placeholder="0" />
          </div>
          <button className="btn btn-sm btn-primary" onClick={handleAdd}>+ Aggiungi</button>
        </div>
      </div>

      {/* Tabella destinazioni */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Destinazione</th>
              <th>Location</th>
              <th style={{ textAlign: 'right' }}>KM (A/R)</th>
              <th style={{ textAlign: 'right' }}>Ore Viaggio</th>
              <th style={{ textAlign: 'right' }}>Autostrada</th>
              <th style={{ width: '150px' }}>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {destinations.map(d => (
              <tr key={d.id}>
                {editingId === d.id ? (
                  <>
                    <td className="edit-row" data-label="Destinazione"><input value={editData.name} onChange={e => setEditData(prev => ({ ...prev, name: e.target.value }))} /></td>
                    <td data-label="Location">
                      <select value={editData.location_id} onChange={e => setEditData(prev => ({ ...prev, location_id: e.target.value }))} style={{ padding: '5px', fontSize: '0.83rem' }}>
                        {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                    </td>
                    <td className="edit-row" data-label="KM (A/R)"><input type="number" value={editData.km} onChange={e => setEditData(prev => ({ ...prev, km: e.target.value }))} /></td>
                    <td className="edit-row" data-label="Ore Viaggio"><input type="number" step="0.1" value={editData.travel_hours} onChange={e => setEditData(prev => ({ ...prev, travel_hours: e.target.value }))} /></td>
                    <td className="edit-row" data-label="Autostrada"><input type="number" step="0.01" value={editData.highway_cost} onChange={e => setEditData(prev => ({ ...prev, highway_cost: e.target.value }))} /></td>
                    <td className="actions-cell">
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-sm btn-success" onClick={handleSave}>Salva</button>
                        <button className="btn btn-sm btn-secondary" onClick={() => setEditingId(null)}>Annulla</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td data-label="Destinazione"><strong>{d.name}</strong></td>
                    <td data-label="Location"><span className={`status-badge status-${d.location_name === 'ITALY' ? 'accepted' : d.location_name === 'MEDITERRANEAN' ? 'sent' : 'draft'}`}>{d.location_name}</span></td>
                    <td data-label="KM (A/R)" style={{ textAlign: 'right' }}>{d.km}</td>
                    <td data-label="Ore Viaggio" style={{ textAlign: 'right' }}>{d.travel_hours}</td>
                    <td data-label="Autostrada" style={{ textAlign: 'right' }}>{d.highway_cost}</td>
                    <td className="actions-cell">
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-sm btn-secondary" onClick={() => startEdit(d)}>Modifica</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(d.id)}>Elimina</button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
