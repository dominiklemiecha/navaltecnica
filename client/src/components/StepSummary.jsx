import { formatCurrency, getSurcharge, calcLabourRate, calcTravelSaleTotal } from '../utils/pricing';

export default function StepSummary({
  general, selectedParts, customParts, services, travel, workshop, workshopMaterials,
  discountAmount, setDiscountAmount, notes, setNotes,
  pricing, locationName, destinationName,
  hamannParts, dvzParts, models,
  onSave, saving, isEdit
}) {
  // Calcola totale ricambi
  let partsTotal = 0;
  const allCategories = [...hamannParts, ...dvzParts];
  for (const [partId, qty] of Object.entries(selectedParts)) {
    if (qty <= 0) continue;
    for (const cat of allCategories) {
      const p = cat.parts?.find(p => p.id === parseInt(partId));
      if (p) {
        const model = models.find(m => m.id === cat.model_id);
        const brandName = model?.brand_name || 'HAMANN';
        const surcharge = getSurcharge(general.client_type, brandName, pricing);
        partsTotal += qty * p.list_price * (1 + surcharge);
        break;
      }
    }
  }
  // Custom parts
  for (const p of customParts) {
    if (p.quantity > 0 && p.unit_price > 0) {
      partsTotal += p.quantity * p.unit_price * (1 + (pricing.shipyard_surcharge_hamann || 0.05));
    }
  }

  // Calcola totale servizi
  const juniorRate = calcLabourRate('junior', locationName, pricing);
  const seniorRate = calcLabourRate('senior', locationName, pricing);
  let servicesTotal = 0;
  for (const s of services) {
    servicesTotal += (s.junior_people || 0) * (s.junior_hours || 0) * juniorRate;
    servicesTotal += (s.senior_people || 0) * (s.senior_hours || 0) * seniorRate;
    servicesTotal += parseFloat(s.consumables) || 0;
  }

  // Calcola totale trasferte
  let travelTotal = 0;
  for (const t of travel) {
    if (t.enabled === false) continue;
    travelTotal += calcTravelSaleTotal(t, pricing, locationName);
  }

  // Calcola totale officina
  const workshopRate = pricing.travel_hour_rate || 102.5;
  let workshopTotal = 0;
  for (const w of workshop) {
    workshopTotal += (w.junior_people || 0) * (w.junior_hours || 0) * workshopRate;
    workshopTotal += (w.senior_people || 0) * (w.senior_hours || 0) * workshopRate;
    workshopTotal += parseFloat(w.consumables) || 0;
    workshopTotal += parseFloat(w.disposals) || 0;
  }
  for (const m of workshopMaterials) {
    workshopTotal += (m.quantity || 0) * (m.unit_price || 0) * (pricing.material_increase || 1.25);
  }

  const grandTotal = partsTotal + servicesTotal + travelTotal + workshopTotal;
  const discount = parseFloat(discountAmount) || 0;
  const finalTotal = grandTotal - discount;

  return (
    <>
      <div className="card">
        <h2>Riepilogo Preventivo</h2>

        <div style={{ marginBottom: '16px', fontSize: '0.85rem', color: '#666', display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
          {general.client_name && <span><strong>Cliente:</strong> {general.client_name}</span>}
          <span><strong>Destinazione:</strong> {destinationName}</span>
          <span><strong>Tipo:</strong> {general.client_type === 'shipyard' ? 'SHIPYARD' : 'SHIP OWNER'}</span>
          <span><strong>Location:</strong> {locationName}</span>
        </div>

        <table className="summary-table">
          <tbody>
            <tr>
              <td className="label">A) Materiale e Ricambi</td>
              <td className="value">{formatCurrency(partsTotal)}</td>
            </tr>
            <tr>
              <td className="label">B) Attivita in Service</td>
              <td className="value">{formatCurrency(servicesTotal)}</td>
            </tr>
            <tr>
              <td className="label">C) Diarie e Rimborsi</td>
              <td className="value">{formatCurrency(travelTotal)}</td>
            </tr>
            <tr>
              <td className="label">D) Attivita in Produzione</td>
              <td className="value">{formatCurrency(workshopTotal)}</td>
            </tr>
            <tr className="total-row">
              <td className="label">TOTALE</td>
              <td className="value">{formatCurrency(grandTotal)}</td>
            </tr>
            {discount > 0 && (
              <>
                <tr className="discount-row">
                  <td className="label">Sconto</td>
                  <td className="value">-{formatCurrency(discount)}</td>
                </tr>
                <tr className="total-row">
                  <td className="label">TOTALE SCONTATO</td>
                  <td className="value">{formatCurrency(finalTotal)}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Sconto e Note</h2>
        <div className="form-grid">
          <div className="form-group">
            <label>Sconto (EUR)</label>
            <input type="number" min="0" step="0.01" value={discountAmount || ''} placeholder="0"
              onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)} />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Note</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows="3" style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem', resize: 'vertical' }} />
          </div>
        </div>
      </div>

      <div className="btn-group" style={{ justifyContent: 'center' }}>
        <button className="btn btn-success" onClick={onSave} disabled={saving} style={{ padding: '14px 40px', fontSize: '1rem' }}>
          {saving ? 'Salvataggio...' : (isEdit ? 'Aggiorna Preventivo' : 'Salva Preventivo')}
        </button>
      </div>
    </>
  );
}
