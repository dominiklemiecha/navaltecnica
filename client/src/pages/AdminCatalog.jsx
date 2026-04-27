import { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import { formatCurrency } from '../utils/pricing';

export default function AdminCatalog() {
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [parts, setParts] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [editingPart, setEditingPart] = useState(null);
  const [editData, setEditData] = useState({});
  const [newPart, setNewPart] = useState({ name: '', part_number: '', list_price: '' });
  const [newCategory, setNewCategory] = useState('');
  const [newModel, setNewModel] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.getBrands(),
      adminApi.getModels(),
      adminApi.getPricing()
    ]).then(([b, m, p]) => {
      setBrands(b.data);
      setModels(m.data);
      // Estrai pricing come oggetto key->value
      const pricingMap = {};
      for (const row of p.data) {
        pricingMap[row.setting_key] = parseFloat(row.value);
      }
      setPricing(pricingMap);
      // Seleziona il primo brand di default
      if (b.data.length > 0) {
        setSelectedBrand(String(b.data[0].id));
      }
      setLoading(false);
    });
  }, []);

  // Carica categorie quando cambia modello
  useEffect(() => {
    if (selectedModel) {
      adminApi.getCategories(selectedModel).then(r => setCategories(r.data));
      adminApi.getParts({ model_id: selectedModel }).then(r => setParts(r.data));
    } else {
      setCategories([]);
      setParts([]);
    }
    setSelectedCategory('');
  }, [selectedModel]);

  // Filtra ricambi per categoria se selezionata
  const displayedParts = selectedCategory
    ? parts.filter(p => p.category_id === parseInt(selectedCategory))
    : parts;

  const filteredModels = selectedBrand
    ? models.filter(m => m.brand_id === parseInt(selectedBrand))
    : models;

  // Seleziona primo modello quando cambia brand
  useEffect(() => {
    if (filteredModels.length > 0 && !selectedModel) {
      setSelectedModel(String(filteredModels[0].id));
    } else if (filteredModels.length > 0 && !filteredModels.find(m => String(m.id) === selectedModel)) {
      setSelectedModel(String(filteredModels[0].id));
    }
  }, [selectedBrand, models]);

  // Calcoli costo/margine
  function getBrandName() {
    const brand = brands.find(b => b.id === parseInt(selectedBrand));
    return brand?.name || 'HAMANN';
  }

  function getCostPct() {
    const name = getBrandName();
    return name === 'HAMANN' ? (pricing.hamann_cost_pct || 0.8) : (pricing.dvz_cost_pct || 0.9);
  }

  function getSurcharges() {
    const name = getBrandName();
    return {
      shipyard: name === 'HAMANN' ? (pricing.shipyard_surcharge_hamann || 0.05) : (pricing.shipyard_surcharge_dvz || 0.15),
      shipowner: name === 'HAMANN' ? (pricing.shipowner_surcharge_hamann || 0.20) : (pricing.shipowner_surcharge_dvz || 0.35),
    };
  }

  // CRUD handlers
  async function handleAddModel() {
    if (!newModel.trim() || !selectedBrand) return;
    await adminApi.createModel({ brand_id: parseInt(selectedBrand), name: newModel.trim() });
    const r = await adminApi.getModels();
    setModels(r.data);
    setNewModel('');
  }

  async function handleDeleteModel(id) {
    if (!confirm('Eliminare questo modello e tutti i suoi ricambi?')) return;
    await adminApi.deleteModel(id);
    setModels(prev => prev.filter(m => m.id !== id));
    if (selectedModel === String(id)) setSelectedModel('');
  }

  async function handleAddCategory() {
    if (!newCategory.trim() || !selectedModel) return;
    const maxSort = categories.reduce((max, c) => Math.max(max, c.sort_order || 0), 0);
    await adminApi.createCategory({ model_id: parseInt(selectedModel), name: newCategory.trim(), sort_order: maxSort + 1 });
    adminApi.getCategories(selectedModel).then(r => setCategories(r.data));
    setNewCategory('');
  }

  async function handleDeleteCategory(id) {
    if (!confirm('Eliminare questa categoria e tutti i suoi ricambi?')) return;
    await adminApi.deleteCategory(id);
    setCategories(prev => prev.filter(c => c.id !== id));
    setParts(prev => prev.filter(p => p.category_id !== id));
  }

  async function handleAddPart() {
    const catId = selectedCategory || (categories.length > 0 ? categories[0].id : null);
    if (!newPart.name.trim() || !catId) return;
    const maxSort = parts.filter(p => p.category_id === parseInt(catId)).reduce((max, p) => Math.max(max, p.sort_order || 0), 0);
    await adminApi.createPart({
      category_id: parseInt(catId),
      name: newPart.name.trim(),
      part_number: newPart.part_number || 'NA',
      list_price: parseFloat(newPart.list_price) || 0,
      sort_order: maxSort + 1
    });
    adminApi.getParts({ model_id: selectedModel }).then(r => setParts(r.data));
    setNewPart({ name: '', part_number: '', list_price: '' });
  }

  async function handleSavePart() {
    await adminApi.updatePart(editingPart, {
      category_id: editData.category_id,
      name: editData.name,
      part_number: editData.part_number,
      list_price: parseFloat(editData.list_price) || 0,
      sort_order: editData.sort_order || 0
    });
    setEditingPart(null);
    adminApi.getParts({ model_id: selectedModel }).then(r => setParts(r.data));
  }

  async function handleDeletePart(id) {
    if (!confirm('Eliminare questo ricambio?')) return;
    await adminApi.deletePart(id);
    setParts(prev => prev.filter(p => p.id !== id));
  }

  function startEdit(part) {
    setEditingPart(part.id);
    setEditData({ ...part });
  }

  if (loading) return <div className="card"><p>Caricamento...</p></div>;

  const costPct = getCostPct();
  const surcharges = getSurcharges();
  const brandName = getBrandName();

  // Raggruppa parts per categoria per la visualizzazione
  const partsByCategory = {};
  for (const p of displayedParts) {
    if (!partsByCategory[p.category_name]) partsByCategory[p.category_name] = [];
    partsByCategory[p.category_name].push(p);
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Catalogo Ricambi</h1>
          <p>{parts.length} ricambi nel modello selezionato</p>
        </div>
      </div>

      {/* Filtri */}
      <div className="card">
        <div className="admin-toolbar">
          <div className="form-group" style={{ minWidth: '150px' }}>
            <label>Brand</label>
            <select value={selectedBrand} onChange={e => { setSelectedBrand(e.target.value); setSelectedModel(''); }}>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ minWidth: '220px' }}>
            <label>Modello</label>
            <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)}>
              {filteredModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          {categories.length > 0 && (
            <div className="form-group" style={{ minWidth: '200px' }}>
              <label>Categoria</label>
              <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                <option value="">Tutte ({parts.length})</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({parts.filter(p => p.category_id === c.id).length})</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Info costi brand */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 24px', padding: '12px 0', fontSize: '0.8rem', color: '#64748b', borderTop: '1px solid #f1f5f9', marginTop: '12px' }}>
          <span>Costo acquisto: <strong style={{ color: '#0f172a' }}>{(costPct * 100).toFixed(0)}%</strong> del listino</span>
          <span>Ricarico Shipyard: <strong style={{ color: '#0f172a' }}>+{(surcharges.shipyard * 100).toFixed(0)}%</strong></span>
          <span>Ricarico Ship Owner: <strong style={{ color: '#0f172a' }}>+{(surcharges.shipowner * 100).toFixed(0)}%</strong></span>
        </div>
      </div>

      {/* Gestione modelli e categorie */}
      <div className="admin-cards-row" style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
        <div className="card" style={{ flex: 1 }}>
          <h2>Modelli {brandName}</h2>
          <div className="inline-form" style={{ marginBottom: '8px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <input value={newModel} onChange={e => setNewModel(e.target.value)} placeholder="Nuovo modello..." onKeyDown={e => e.key === 'Enter' && handleAddModel()} />
            </div>
            <button className="btn btn-sm btn-primary" onClick={handleAddModel}>+</button>
          </div>
          <div style={{ maxHeight: '200px', overflow: 'auto' }}>
            {filteredModels.map(m => (
              <div key={m.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '6px 8px', borderRadius: '6px', fontSize: '0.83rem',
                background: selectedModel === String(m.id) ? '#eff6ff' : 'transparent',
                cursor: 'pointer'
              }}
                onClick={() => setSelectedModel(String(m.id))}
              >
                <span style={{ fontWeight: selectedModel === String(m.id) ? 600 : 400 }}>{m.name}</span>
                <button className="btn btn-sm btn-danger" onClick={e => { e.stopPropagation(); handleDeleteModel(m.id); }} style={{ padding: '2px 6px', fontSize: '0.7rem' }}>x</button>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ flex: 1 }}>
          <h2>Categorie {filteredModels.find(m => String(m.id) === selectedModel)?.name || ''}</h2>
          <div className="inline-form" style={{ marginBottom: '8px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Nuova categoria..." onKeyDown={e => e.key === 'Enter' && handleAddCategory()} />
            </div>
            <button className="btn btn-sm btn-primary" onClick={handleAddCategory}>+</button>
          </div>
          <div style={{ maxHeight: '200px', overflow: 'auto' }}>
            {categories.map(c => (
              <div key={c.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '6px 8px', fontSize: '0.83rem'
              }}>
                <span>{c.name} <span style={{ color: '#94a3b8' }}>({parts.filter(p => p.category_id === c.id).length})</span></span>
                <button className="btn btn-sm btn-danger" onClick={() => handleDeleteCategory(c.id)} style={{ padding: '2px 6px', fontSize: '0.7rem' }}>x</button>
              </div>
            ))}
            {categories.length === 0 && <p style={{ color: '#94a3b8', fontSize: '0.8rem', padding: '8px' }}>Nessuna categoria</p>}
          </div>
        </div>
      </div>

      {/* Tabella ricambi */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Form aggiunta rapida */}
        <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <div className="inline-form" style={{ flexWrap: 'wrap', margin: 0, padding: 0, background: 'transparent', border: 'none' }}>
            {categories.length > 0 && !selectedCategory && (
              <div className="form-group" style={{ minWidth: '160px' }}>
                <label>Categoria</label>
                <select id="newPartCat" defaultValue={categories[0]?.id}>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div className="form-group" style={{ flex: 2 }}>
              <label>Nome Ricambio</label>
              <input value={newPart.name} onChange={e => setNewPart(p => ({ ...p, name: e.target.value }))} placeholder="Es: IMPELLER" />
            </div>
            <div className="form-group">
              <label>Codice</label>
              <input value={newPart.part_number} onChange={e => setNewPart(p => ({ ...p, part_number: e.target.value }))} placeholder="Codice" />
            </div>
            <div className="form-group">
              <label>Prezzo Listino</label>
              <input type="number" step="0.01" value={newPart.list_price} onChange={e => setNewPart(p => ({ ...p, list_price: e.target.value }))} placeholder="0.00" />
            </div>
            <button className="btn btn-sm btn-primary" onClick={handleAddPart}>+ Aggiungi</button>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Descrizione</th>
              <th>Codice</th>
              <th style={{ textAlign: 'right' }}>Listino</th>
              <th style={{ textAlign: 'right' }}>Costo ({(costPct*100).toFixed(0)}%)</th>
              <th style={{ textAlign: 'right' }}>Shipyard (+{(surcharges.shipyard*100).toFixed(0)}%)</th>
              <th style={{ textAlign: 'right' }}>Ship Owner (+{(surcharges.shipowner*100).toFixed(0)}%)</th>
              <th style={{ textAlign: 'right' }}>Margine SY</th>
              <th style={{ textAlign: 'right' }}>Margine SO</th>
              <th style={{ width: '120px' }}>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(partsByCategory).map(([catName, catParts]) => (
              <>
                <tr key={`cat-${catName}`} className="category-row">
                  <td colSpan="9" style={{ background: '#eff6ff', color: '#1d4ed8', fontWeight: 600, fontSize: '0.8rem', padding: '8px 14px' }}>
                    {catName}
                  </td>
                </tr>
                {catParts.map(p => {
                  const cost = p.list_price * costPct;
                  const saleShipyard = p.list_price * (1 + surcharges.shipyard);
                  const saleShipowner = p.list_price * (1 + surcharges.shipowner);
                  const marginSY = saleShipyard - cost;
                  const marginSO = saleShipowner - cost;

                  if (editingPart === p.id) {
                    return (
                      <tr key={p.id}>
                        <td className="edit-row"><input value={editData.name} onChange={e => setEditData(d => ({ ...d, name: e.target.value }))} /></td>
                        <td className="edit-row"><input value={editData.part_number} onChange={e => setEditData(d => ({ ...d, part_number: e.target.value }))} style={{ width: '100px' }} /></td>
                        <td className="edit-row"><input type="number" step="0.01" value={editData.list_price} onChange={e => setEditData(d => ({ ...d, list_price: e.target.value }))} style={{ width: '90px' }} /></td>
                        <td colSpan="4" style={{ color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center' }}>Calcolati automaticamente</td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button className="btn btn-sm btn-success" onClick={handleSavePart}>Salva</button>
                            <button className="btn btn-sm btn-secondary" onClick={() => setEditingPart(null)}>X</button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#64748b' }}>{p.part_number}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(p.list_price)}</td>
                      <td style={{ textAlign: 'right', color: '#dc2626' }}>{formatCurrency(cost)}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(saleShipyard)}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(saleShipowner)}</td>
                      <td style={{ textAlign: 'right', color: '#059669', fontWeight: 500 }}>{formatCurrency(marginSY)}</td>
                      <td style={{ textAlign: 'right', color: '#059669', fontWeight: 500 }}>{formatCurrency(marginSO)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button className="btn btn-sm btn-secondary" onClick={() => startEdit(p)}>Modifica</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDeletePart(p.id)}>X</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </>
            ))}
            {displayedParts.length === 0 && (
              <tr><td colSpan="9" style={{ color: '#94a3b8', textAlign: 'center', padding: '32px' }}>Nessun ricambio per questo modello</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
