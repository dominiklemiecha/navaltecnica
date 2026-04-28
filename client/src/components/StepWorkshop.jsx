import { formatCurrency } from '../utils/pricing';

export default function StepWorkshop({ workshop, setWorkshop, workshopMaterials, setWorkshopMaterials, pricing }) {
  const rate = pricing.travel_hour_rate || 102.5;

  function update(index, field, value) {
    setWorkshop(prev => prev.map((w, i) => i === index ? { ...w, [field]: value } : w));
  }

  function addMaterial() {
    setWorkshopMaterials(prev => [...prev, { description: '', part_number: '', quantity: 1, unit_price: 0, sale_price: 0 }]);
  }

  function updateMaterial(index, field, value) {
    setWorkshopMaterials(prev => prev.map((m, i) => {
      if (i !== index) return m;
      const updated = { ...m, [field]: value };
      if (field === 'quantity' || field === 'unit_price') {
        updated.sale_price = (updated.quantity || 0) * (updated.unit_price || 0) * (pricing.material_increase || 1.25);
      }
      return updated;
    }));
  }

  function removeMaterial(index) {
    setWorkshopMaterials(prev => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="card">
      <h2>D) Officina - Ore e Materiali</h2>
      <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '16px' }}>
        Tariffa oraria officina: {formatCurrency(rate)}/h
      </p>

      {workshop.map((w, i) => {
        const juniorTotal = (w.junior_people || 0) * (w.junior_hours || 0) * rate;
        const seniorTotal = (w.senior_people || 0) * (w.senior_hours || 0) * rate;
        const consMarkup = pricing.consumable_increase || 1.25;
        const dispMarkup = pricing.disposal_increase || 1.25;
        const total = juniorTotal + seniorTotal +
          (parseFloat(w.consumables) || 0) * consMarkup +
          (parseFloat(w.disposals) || 0) * dispMarkup;

        return (
          <div key={i} className="service-block">
            <h4>Service {w.service_number}</h4>
            <div className="form-grid">
              <div className="form-group">
                <label>Junior - N. Persone</label>
                <input type="number" min="0" value={w.junior_people || ''} placeholder="0"
                  onChange={e => update(i, 'junior_people', parseInt(e.target.value) || 0)} />
              </div>
              <div className="form-group">
                <label>Junior - Ore</label>
                <input type="number" min="0" step="0.5" value={w.junior_hours || ''} placeholder="0"
                  onChange={e => update(i, 'junior_hours', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="form-group">
                <label>Subtotale Junior</label>
                <input type="text" readOnly value={formatCurrency(juniorTotal)} style={{ background: '#f8f9fa' }} />
              </div>
            </div>
            <div className="form-grid" style={{ marginTop: '8px' }}>
              <div className="form-group">
                <label>Senior - N. Persone</label>
                <input type="number" min="0" value={w.senior_people || ''} placeholder="0"
                  onChange={e => update(i, 'senior_people', parseInt(e.target.value) || 0)} />
              </div>
              <div className="form-group">
                <label>Senior - Ore</label>
                <input type="number" min="0" step="0.5" value={w.senior_hours || ''} placeholder="0"
                  onChange={e => update(i, 'senior_hours', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="form-group">
                <label>Subtotale Senior</label>
                <input type="text" readOnly value={formatCurrency(seniorTotal)} style={{ background: '#f8f9fa' }} />
              </div>
            </div>
            <div className="form-grid" style={{ marginTop: '8px' }}>
              <div className="form-group">
                <label>Consumabili</label>
                <input type="number" min="0" step="0.01" value={w.consumables || ''} placeholder="0"
                  onChange={e => update(i, 'consumables', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="form-group">
                <label>Smaltimenti</label>
                <input type="number" min="0" step="0.01" value={w.disposals || ''} placeholder="0"
                  onChange={e => update(i, 'disposals', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="form-group">
                <label>Totale Servizio</label>
                <input type="text" readOnly value={formatCurrency(total)}
                  style={{ background: '#eef2ff', fontWeight: '600' }} />
              </div>
            </div>
          </div>
        );
      })}

      {/* Materials */}
      <h3 style={{ marginTop: '20px' }}>Materiali</h3>
      {workshopMaterials.map((m, i) => (
        <div key={i} className="form-grid" style={{ marginBottom: '8px', alignItems: 'end' }}>
          <div className="form-group">
            <label>Descrizione</label>
            <input value={m.description} onChange={e => updateMaterial(i, 'description', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Codice</label>
            <input value={m.part_number} onChange={e => updateMaterial(i, 'part_number', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Qty</label>
            <input type="number" min="0" value={m.quantity || ''} onChange={e => updateMaterial(i, 'quantity', parseInt(e.target.value) || 0)} />
          </div>
          <div className="form-group">
            <label>Prezzo Unit.</label>
            <input type="number" min="0" step="0.01" value={m.unit_price || ''} onChange={e => updateMaterial(i, 'unit_price', parseFloat(e.target.value) || 0)} />
          </div>
          <div className="form-group">
            <label>Vendita</label>
            <input type="text" readOnly value={formatCurrency(m.sale_price)} style={{ background: '#f8f9fa' }} />
          </div>
          <button className="btn btn-sm btn-danger" onClick={() => removeMaterial(i)}>X</button>
        </div>
      ))}
      <button className="btn btn-sm btn-secondary" onClick={addMaterial} style={{ marginTop: '8px' }}>
        + Aggiungi materiale
      </button>
    </div>
  );
}
