import { useState, useEffect } from 'react';
import { adminApi } from '../services/api';

const CATEGORY_LABELS = {
  labour: 'Tariffe Orarie',
  travel: 'Trasferte e Diarie',
  surcharge: 'Ricarichi e Sconti',
  material: 'Materiali e Servizi'
};

export default function AdminPricing() {
  const [settings, setSettings] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.getPricing().then(r => setSettings(r.data));
  }, []);

  async function handleSave(id) {
    setSaving(true);
    try {
      await adminApi.updatePricing(id, parseFloat(editValue));
      setSettings(prev => prev.map(s => s.id === id ? { ...s, value: editValue } : s));
      setEditingId(null);
    } catch (err) {
      alert('Errore: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  // Raggruppa per categoria
  const grouped = {};
  for (const s of settings) {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  }

  function formatValue(key, value) {
    const v = parseFloat(value);
    if (key.includes('rate') || key.includes('cost') || key.includes('allowance') || key.includes('price')) {
      return `${v.toFixed(2)}`;
    }
    if (key.includes('surcharge') || key.includes('increase') || key.includes('discount') || key.includes('pct')) {
      return `${(v * 100).toFixed(0)}%`;
    }
    return v.toString();
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Tariffe e Margini</h1>
          <p>Configura tariffe orarie, diarie, ricarichi e percentuali</p>
        </div>
      </div>

      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="card">
          <h2>{CATEGORY_LABELS[category] || category}</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Parametro</th>
                <th style={{ width: '15%' }}>Chiave</th>
                <th style={{ width: '20%' }}>Valore</th>
                <th style={{ width: '25%' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {items.map(s => (
                <tr key={s.id}>
                  <td><strong>{s.label}</strong></td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#64748b' }}>{s.setting_key}</td>
                  <td>
                    {editingId === s.id ? (
                      <input
                        type="number"
                        step="any"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSave(s.id)}
                        autoFocus
                        className="edit-row"
                        style={{ width: '120px', padding: '6px 8px', border: '1px solid #3b82f6', borderRadius: '6px' }}
                      />
                    ) : (
                      <span style={{ fontWeight: 600 }}>{formatValue(s.setting_key, s.value)}</span>
                    )}
                  </td>
                  <td>
                    {editingId === s.id ? (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-sm btn-success" onClick={() => handleSave(s.id)} disabled={saving}>Salva</button>
                        <button className="btn btn-sm btn-secondary" onClick={() => setEditingId(null)}>Annulla</button>
                      </div>
                    ) : (
                      <button className="btn btn-sm btn-secondary" onClick={() => { setEditingId(s.id); setEditValue(s.value); }}>
                        Modifica
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </>
  );
}
