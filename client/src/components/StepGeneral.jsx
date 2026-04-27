export default function StepGeneral({ general, setGeneral, locations, destinations, hamannModels, dvzModels }) {
  function update(field, value) {
    setGeneral(prev => {
      const next = { ...prev, [field]: value };
      // Reset destinazione quando cambia location
      if (field === 'location_id') next.destination_id = '';
      return next;
    });
  }

  return (
    <div className="card">
      <h2>Dati Generali</h2>
      <div className="form-grid">
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>Nome Cliente / Azienda</label>
          <input type="text" value={general.client_name || ''} onChange={e => update('client_name', e.target.value)} placeholder="Es: Mario Rossi / Cantiere Navale XYZ" />
        </div>

        <div className="form-group">
          <label>Location</label>
          <select value={general.location_id} onChange={e => update('location_id', e.target.value)}>
            <option value="">-- Seleziona --</option>
            {locations.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Destinazione</label>
          <select value={general.destination_id} onChange={e => update('destination_id', e.target.value)} disabled={!general.location_id}>
            <option value="">-- Seleziona --</option>
            {destinations.map(d => (
              <option key={d.id} value={d.id}>{d.name} ({d.km} km)</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Tipo Cliente</label>
          <select value={general.client_type} onChange={e => update('client_type', e.target.value)}>
            <option value="shipyard">SHIPYARD</option>
            <option value="shipowner">SHIP OWNER</option>
          </select>
        </div>

        <div className="form-group">
          <label>N. Servizi</label>
          <select value={general.num_services} onChange={e => update('num_services', e.target.value)}>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </select>
        </div>

        <div className="form-group">
          <label>Modello HAMANN</label>
          <select value={general.hamann_model_id} onChange={e => update('hamann_model_id', e.target.value)}>
            <option value="">Nessuno</option>
            {hamannModels.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Modello DVZ</label>
          <select value={general.dvz_model_id} onChange={e => update('dvz_model_id', e.target.value)}>
            <option value="">Nessuno</option>
            {dvzModels.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
