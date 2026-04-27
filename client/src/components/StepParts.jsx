import { formatCurrency, getSurcharge } from '../utils/pricing';

export default function StepParts({
  hamannParts, dvzParts, selectedParts, setSelectedParts,
  customParts, setCustomParts, clientType, pricing, models,
  hamannModelId, dvzModelId
}) {
  function setQty(partId, qty) {
    setSelectedParts(prev => ({ ...prev, [partId]: Math.max(0, parseInt(qty) || 0) }));
  }

  function addCustomPart() {
    setCustomParts(prev => [...prev, { brand: 'HAMANN', description: '', part_number: 'NA', quantity: 0, unit_price: 0 }]);
  }

  function updateCustomPart(index, field, value) {
    setCustomParts(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  }

  function removeCustomPart(index) {
    setCustomParts(prev => prev.filter((_, i) => i !== index));
  }

  function renderPartsTable(categories, brandName) {
    if (!categories || categories.length === 0) return null;

    const surcharge = getSurcharge(clientType, brandName, pricing);

    return (
      <div className="card" key={brandName}>
        <h2>{brandName}</h2>
        <table className="parts-table">
          <thead>
            <tr>
              <th style={{ width: '35%' }}>Descrizione</th>
              <th style={{ width: '15%' }}>Codice</th>
              <th style={{ width: '12%' }}>Listino</th>
              <th style={{ width: '10%' }}>Qty</th>
              <th style={{ width: '14%' }}>Vendita Unit.</th>
              <th style={{ width: '14%' }}>Totale</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => (
              <>
                <tr key={`cat-${cat.id}`} className="category-row">
                  <td colSpan="6">{cat.name}</td>
                </tr>
                {cat.parts?.map(part => {
                  const qty = selectedParts[part.id] || 0;
                  const saleUnit = part.list_price * (1 + surcharge);
                  const total = qty * saleUnit;
                  return (
                    <tr key={part.id}>
                      <td data-label="Descrizione">{part.name}</td>
                      <td data-label="Codice">{part.part_number}</td>
                      <td data-label="Listino" className="price">{formatCurrency(part.list_price)}</td>
                      <td data-label="Quantita">
                        <input
                          type="number"
                          min="0"
                          value={qty || ''}
                          onChange={e => setQty(part.id, e.target.value)}
                          placeholder="0"
                        />
                      </td>
                      <td data-label="Vendita Unit." className="price">{formatCurrency(saleUnit)}</td>
                      <td data-label="Totale" className="price"><strong>{qty > 0 ? formatCurrency(total) : '-'}</strong></td>
                    </tr>
                  );
                })}
              </>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const hasAnyParts = hamannParts.length > 0 || dvzParts.length > 0;

  return (
    <>
      {!hasAnyParts && (
        <div className="card">
          <p style={{ color: '#999', textAlign: 'center' }}>
            Seleziona almeno un modello HAMANN o DVZ nel passo precedente per vedere i ricambi.
          </p>
        </div>
      )}

      {renderPartsTable(hamannParts, 'HAMANN')}
      {renderPartsTable(dvzParts, 'DVZ')}

      {/* Custom parts */}
      <div className="card">
        <h2>Accessori / Ricambi Extra</h2>
        {customParts.map((p, i) => (
          <div key={i} className="form-grid" style={{ marginBottom: '8px', alignItems: 'end' }}>
            <div className="form-group">
              <label>Descrizione</label>
              <input value={p.description} onChange={e => updateCustomPart(i, 'description', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Codice</label>
              <input value={p.part_number} onChange={e => updateCustomPart(i, 'part_number', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Qty</label>
              <input type="number" min="0" value={p.quantity || ''} onChange={e => updateCustomPart(i, 'quantity', parseInt(e.target.value) || 0)} />
            </div>
            <div className="form-group">
              <label>Prezzo Unit.</label>
              <input type="number" min="0" step="0.01" value={p.unit_price || ''} onChange={e => updateCustomPart(i, 'unit_price', parseFloat(e.target.value) || 0)} />
            </div>
            <button className="btn btn-sm btn-danger" onClick={() => removeCustomPart(i)}>X</button>
          </div>
        ))}
        <button className="btn btn-sm btn-secondary" onClick={addCustomPart}>+ Aggiungi ricambio</button>
      </div>
    </>
  );
}
