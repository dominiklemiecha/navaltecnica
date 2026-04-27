import { calcLabourRate, formatCurrency } from '../utils/pricing';

export default function StepService({ services, setServices, pricing, locationName }) {
  function update(index, field, value) {
    setServices(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  }

  const juniorRate = calcLabourRate('junior', locationName, pricing);
  const seniorRate = calcLabourRate('senior', locationName, pricing);

  return (
    <div className="card">
      <h2>B) Ore Servizio - A Bordo</h2>
      <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '16px' }}>
        Tariffa oraria: Junior {formatCurrency(juniorRate)}/h - Senior {formatCurrency(seniorRate)}/h
        {locationName !== 'ITALY' && ` (ricarico ${locationName.toLowerCase()})`}
      </p>

      {services.map((svc, i) => {
        const juniorTotal = (svc.junior_people || 0) * (svc.junior_hours || 0) * juniorRate;
        const seniorTotal = (svc.senior_people || 0) * (svc.senior_hours || 0) * seniorRate;
        const serviceTotal = juniorTotal + seniorTotal + (parseFloat(svc.consumables) || 0);

        return (
          <div key={i} className="service-block">
            <h4>Service {svc.service_number}</h4>
            <div className="form-grid">
              <div className="form-group">
                <label>Junior - N. Persone</label>
                <input type="number" min="0" value={svc.junior_people || ''} placeholder="0"
                  onChange={e => update(i, 'junior_people', parseInt(e.target.value) || 0)} />
              </div>
              <div className="form-group">
                <label>Junior - Ore</label>
                <input type="number" min="0" step="0.5" value={svc.junior_hours || ''} placeholder="0"
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
                <input type="number" min="0" value={svc.senior_people || ''} placeholder="0"
                  onChange={e => update(i, 'senior_people', parseInt(e.target.value) || 0)} />
              </div>
              <div className="form-group">
                <label>Senior - Ore</label>
                <input type="number" min="0" step="0.5" value={svc.senior_hours || ''} placeholder="0"
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
                <input type="number" min="0" step="0.01" value={svc.consumables || ''} placeholder="0"
                  onChange={e => update(i, 'consumables', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="form-group">
                <label>Totale Servizio</label>
                <input type="text" readOnly value={formatCurrency(serviceTotal)}
                  style={{ background: '#eef2ff', fontWeight: '600' }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
