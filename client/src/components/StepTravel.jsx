import { formatCurrency, calcTravelSaleTotal } from '../utils/pricing';

export default function StepTravel({ travel, setTravel, pricing, locationName }) {
  function update(index, field, value) {
    setTravel(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
  }

  const isAbroad = locationName !== 'ITALY';
  const dailyRate = isAbroad ? pricing.daily_allowance_abroad : pricing.daily_allowance_italy;
  const halfRate = isAbroad ? pricing.daily_allowance_half_abroad : pricing.daily_allowance_half_italy;

  return (
    <div className="card">
      <h2>C) Trasferte e Alloggio</h2>

      {travel.map((t, i) => {
        const total = calcTravelSaleTotal(t, pricing, locationName);

        return (
          <div key={i} className="service-block">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4>Service {t.service_number}</h4>
              <label style={{ fontSize: '0.8rem', display: 'flex', gap: '4px', alignItems: 'center' }}>
                <input type="checkbox" checked={t.enabled !== false}
                  onChange={e => update(i, 'enabled', e.target.checked)} />
                Attivo
              </label>
            </div>

            {t.enabled !== false && (
              <>
                <div className="form-grid">
                  <div className="form-group">
                    <label>KM ({formatCurrency(pricing.cost_per_km)}/km)</label>
                    <input type="number" min="0" value={t.km || ''} placeholder="0"
                      onChange={e => update(i, 'km', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="form-group">
                    <label>Ore Viaggio ({formatCurrency(pricing.travel_hour_rate)}/h)</label>
                    <input type="number" min="0" step="0.5" value={t.travel_hours || ''} placeholder="0"
                      onChange={e => update(i, 'travel_hours', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="form-group">
                    <label>Autostrada</label>
                    <input type="number" min="0" step="0.01" value={t.highway || ''} placeholder="0"
                      onChange={e => update(i, 'highway', parseFloat(e.target.value) || 0)} />
                  </div>
                </div>
                <div className="form-grid" style={{ marginTop: '8px' }}>
                  <div className="form-group">
                    <label>Diarie Intere ({formatCurrency(dailyRate)})</label>
                    <input type="number" min="0" value={t.daily_allowance || ''} placeholder="0"
                      onChange={e => update(i, 'daily_allowance', parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="form-group">
                    <label>Mezze Diarie ({formatCurrency(halfRate)})</label>
                    <input type="number" min="0" value={t.daily_allowance_half || ''} placeholder="0"
                      onChange={e => update(i, 'daily_allowance_half', parseInt(e.target.value) || 0)} />
                  </div>
                </div>
                <div className="form-grid" style={{ marginTop: '8px' }}>
                  <div className="form-group">
                    <label>Auto a Noleggio</label>
                    <input type="number" min="0" step="0.01" value={t.rental_car || ''} placeholder="0"
                      onChange={e => update(i, 'rental_car', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="form-group">
                    <label>Voli</label>
                    <input type="number" min="0" step="0.01" value={t.flights || ''} placeholder="0"
                      onChange={e => update(i, 'flights', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="form-group">
                    <label>Taxi</label>
                    <input type="number" min="0" step="0.01" value={t.taxi || ''} placeholder="0"
                      onChange={e => update(i, 'taxi', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="form-group">
                    <label>Parcheggio</label>
                    <input type="number" min="0" step="0.01" value={t.parking || ''} placeholder="0"
                      onChange={e => update(i, 'parking', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="form-group">
                    <label>Altro</label>
                    <input type="number" min="0" step="0.01" value={t.other || ''} placeholder="0"
                      onChange={e => update(i, 'other', parseFloat(e.target.value) || 0)} />
                  </div>
                </div>
                <div style={{ marginTop: '12px', textAlign: 'right', fontWeight: '600' }}>
                  Totale Service {t.service_number}: {formatCurrency(total)}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
