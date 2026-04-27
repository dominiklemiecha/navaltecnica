const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Locations
router.get('/locations', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM locations ORDER BY id');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore nel caricamento locations' });
  }
});

// Destinations (filtrabili per location)
router.get('/destinations', async (req, res) => {
  try {
    let query = 'SELECT d.*, l.name as location_name FROM destinations d JOIN locations l ON d.location_id = l.id';
    const params = [];
    if (req.query.location_id) {
      query += ' WHERE d.location_id = ?';
      params.push(req.query.location_id);
    }
    query += ' ORDER BY d.name';
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore nel caricamento destinazioni' });
  }
});

// Brands
router.get('/brands', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM brands ORDER BY id');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore nel caricamento brands' });
  }
});

// Equipment Models (filtrabili per brand)
router.get('/models', async (req, res) => {
  try {
    let query = 'SELECT m.*, b.name as brand_name FROM equipment_models m JOIN brands b ON m.brand_id = b.id';
    const params = [];
    if (req.query.brand_id) {
      query += ' WHERE m.brand_id = ?';
      params.push(req.query.brand_id);
    }
    query += ' ORDER BY b.id, m.name';
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore nel caricamento modelli' });
  }
});

// Spare parts per modello (con categorie)
router.get('/parts/:modelId', async (req, res) => {
  try {
    const [categories] = await pool.execute(
      'SELECT * FROM component_categories WHERE model_id = ? ORDER BY sort_order',
      [req.params.modelId]
    );

    const [parts] = await pool.execute(
      `SELECT sp.*, cc.name as category_name, cc.sort_order as category_sort
       FROM spare_parts sp
       JOIN component_categories cc ON sp.category_id = cc.id
       WHERE cc.model_id = ?
       ORDER BY cc.sort_order, sp.sort_order`,
      [req.params.modelId]
    );

    // Raggruppa per categoria
    const grouped = categories.map(cat => ({
      ...cat,
      parts: parts.filter(p => p.category_id === cat.id)
    }));

    res.json(grouped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore nel caricamento ricambi' });
  }
});

// Pricing settings
router.get('/pricing', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM pricing_settings ORDER BY category, setting_key');
    // Restituisci come oggetto key->value per comodità
    const settings = {};
    const details = [];
    for (const row of rows) {
      settings[row.setting_key] = parseFloat(row.value);
      details.push(row);
    }
    res.json({ settings, details });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore nel caricamento pricing' });
  }
});

module.exports = router;
