import { formatCurrency, getSurcharge, getCostPercentage, calcLabourRate, calcLabourCostRate, calcTravelSaleTotal, calcTravelCostTotal } from '../utils/pricing';

export default function StepSummary({
  general, selectedParts, customParts, services, travel, workshop, workshopMaterials,
  discountAmount, setDiscountAmount, notes, setNotes,
  pricing, locationName, destinationName,
  hamannParts, dvzParts, models,
  onSave, saving, isEdit
}) {
  // Calcola totale ricambi (vendita + costo)
  let partsTotal = 0;
  let partsCost = 0;
  const allCategories = [...hamannParts, ...dvzParts];
  for (const [partId, qty] of Object.entries(selectedParts)) {
    if (qty <= 0) continue;
    for (const cat of allCategories) {
      const p = cat.parts?.find(p => p.id === parseInt(partId));
      if (p) {
        const model = models.find(m => m.id === cat.model_id);
        const brandName = model?.brand_name || 'HAMANN';
        const surcharge = getSurcharge(general.client_type, brandName, pricing);
        const costPct = getCostPercentage(brandName, pricing);
        partsTotal += qty * p.list_price * (1 + surcharge);
        partsCost += qty * p.list_price * costPct;
        break;
      }
    }
  }
  // Custom parts
  for (const p of customParts) {
    if (p.quantity > 0 && p.unit_price > 0) {
      partsTotal += p.quantity * p.unit_price * (1 + (pricing.shipyard_surcharge_hamann || 0.05));
      partsCost += p.quantity * p.unit_price * (pricing.hamann_cost_pct || 0.8);
    }
  }

  // Calcola totale servizi (vendita + costo)
  const juniorRate = calcLabourRate('junior', locationName, pricing);
  const seniorRate = calcLabourRate('senior', locationName, pricing);
  const juniorCostRate = calcLabourCostRate('junior', pricing);
  const seniorCostRate = calcLabourCostRate('senior', pricing);
  let servicesTotal = 0;
  let servicesCost = 0;
  for (const s of services) {
    const jrH = (s.junior_people || 0) * (s.junior_hours || 0);
    const srH = (s.senior_people || 0) * (s.senior_hours || 0);
    servicesTotal += jrH * juniorRate + srH * seniorRate + (parseFloat(s.consumables) || 0);
    servicesCost += jrH * juniorCostRate + srH * seniorCostRate + (parseFloat(s.consumables) || 0);
  }

  // Calcola totale trasferte (vendita + costo)
  let travelTotal = 0;
  let travelCost = 0;
  for (const t of travel) {
    if (t.enabled === false) continue;
    travelTotal += calcTravelSaleTotal(t, pricing, locationName);
    travelCost += calcTravelCostTotal(t, pricing);
  }

  // Calcola totale officina (vendita + costo)
  const workshopRate = pricing.travel_hour_rate || 102.5;
  const consMarkup = pricing.consumable_increase || 1.25;
  const dispMarkup = pricing.disposal_increase || 1.25;
  let workshopTotal = 0;
  let workshopCost = 0;
  for (const w of workshop) {
    const jrH = (w.junior_people || 0) * (w.junior_hours || 0);
    const srH = (w.senior_people || 0) * (w.senior_hours || 0);
    const cons = parseFloat(w.consumables) || 0;
    const disp = parseFloat(w.disposals) || 0;
    workshopTotal += jrH * workshopRate + srH * workshopRate +
      cons * consMarkup + disp * dispMarkup;
    workshopCost += jrH * seniorCostRate + srH * seniorCostRate + cons + disp;
  }
  for (const m of workshopMaterials) {
    const base = (m.quantity || 0) * (m.unit_price || 0);
    workshopTotal += base * (pricing.material_increase || 1.25);
    workshopCost += base;
  }

  const grandTotal = partsTotal + servicesTotal + travelTotal + workshopTotal;
  const grandCost = partsCost + servicesCost + travelCost + workshopCost;
  const discount = parseFloat(discountAmount) || 0;
  const finalTotal = grandTotal - discount;
  const margin = finalTotal - grandCost;
  const marginPct = finalTotal > 0 ? (margin / finalTotal) * 100 : 0;

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

      <div className="card" style={{ background: '#fff8e1', borderLeft: '4px solid #f59e0b' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          Margine <span style={{ fontSize: '0.7rem', fontWeight: 'normal', color: '#92400e', background: '#fde68a', padding: '2px 8px', borderRadius: '4px' }}>uso interno — non incluso nel PDF</span>
        </h2>
        <table className="summary-table">
          <tbody>
            <tr>
              <td className="label">Costo Materiale e Ricambi</td>
              <td className="value">{formatCurrency(partsCost)}</td>
            </tr>
            <tr>
              <td className="label">Costo Service</td>
              <td className="value">{formatCurrency(servicesCost)}</td>
            </tr>
            <tr>
              <td className="label">Costo Diarie e Rimborsi</td>
              <td className="value">{formatCurrency(travelCost)}</td>
            </tr>
            <tr>
              <td className="label">Costo Produzione</td>
              <td className="value">{formatCurrency(workshopCost)}</td>
            </tr>
            <tr className="total-row">
              <td className="label">COSTO TOTALE</td>
              <td className="value">{formatCurrency(grandCost)}</td>
            </tr>
            <tr className="total-row" style={{ color: margin >= 0 ? '#047857' : '#b91c1c' }}>
              <td className="label">MARGINE {discount > 0 ? '(post-sconto)' : ''}</td>
              <td className="value">{formatCurrency(margin)} ({marginPct.toFixed(1)}%)</td>
            </tr>
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
