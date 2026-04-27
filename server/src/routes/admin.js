const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// ===================== DESTINATIONS =====================

router.get('/destinations', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT d.*, l.name as location_name FROM destinations d JOIN locations l ON d.location_id = l.id ORDER BY l.id, d.name'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/destinations', async (req, res) => {
  try {
    const { name, location_id, km, travel_hours, highway_cost } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO destinations (name, location_id, km, travel_hours, highway_cost) VALUES (?, ?, ?, ?, ?)',
      [name, location_id, km || 0, travel_hours || 0, highway_cost || 0]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/destinations/:id', async (req, res) => {
  try {
    const { name, location_id, km, travel_hours, highway_cost } = req.body;
    await pool.execute(
      'UPDATE destinations SET name = ?, location_id = ?, km = ?, travel_hours = ?, highway_cost = ? WHERE id = ?',
      [name, location_id, km || 0, travel_hours || 0, highway_cost || 0, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/destinations/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM destinations WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== EQUIPMENT MODELS =====================

router.get('/models', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT m.*, b.name as brand_name FROM equipment_models m JOIN brands b ON m.brand_id = b.id ORDER BY b.id, m.name'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/models', async (req, res) => {
  try {
    const { brand_id, name } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO equipment_models (brand_id, name) VALUES (?, ?)',
      [brand_id, name]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/models/:id', async (req, res) => {
  try {
    const { brand_id, name } = req.body;
    await pool.execute('UPDATE equipment_models SET brand_id = ?, name = ? WHERE id = ?',
      [brand_id, name, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/models/:id', async (req, res) => {
  try {
    // Elimina a cascata: categorie e ricambi associati
    const [cats] = await pool.execute('SELECT id FROM component_categories WHERE model_id = ?', [req.params.id]);
    for (const cat of cats) {
      await pool.execute('DELETE FROM spare_parts WHERE category_id = ?', [cat.id]);
    }
    await pool.execute('DELETE FROM component_categories WHERE model_id = ?', [req.params.id]);
    await pool.execute('DELETE FROM equipment_models WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== CATEGORIES =====================

router.get('/categories', async (req, res) => {
  try {
    let query = 'SELECT cc.*, em.name as model_name, b.name as brand_name FROM component_categories cc JOIN equipment_models em ON cc.model_id = em.id JOIN brands b ON em.brand_id = b.id';
    const params = [];
    if (req.query.model_id) {
      query += ' WHERE cc.model_id = ?';
      params.push(req.query.model_id);
    }
    query += ' ORDER BY em.id, cc.sort_order';
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const { model_id, name, sort_order } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO component_categories (model_id, name, sort_order) VALUES (?, ?, ?)',
      [model_id, name, sort_order || 0]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/categories/:id', async (req, res) => {
  try {
    const { name, sort_order } = req.body;
    await pool.execute('UPDATE component_categories SET name = ?, sort_order = ? WHERE id = ?',
      [name, sort_order || 0, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM spare_parts WHERE category_id = ?', [req.params.id]);
    await pool.execute('DELETE FROM component_categories WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== SPARE PARTS =====================

router.get('/parts', async (req, res) => {
  try {
    let query = `SELECT sp.*, cc.name as category_name, cc.model_id, em.name as model_name, b.name as brand_name
                 FROM spare_parts sp
                 JOIN component_categories cc ON sp.category_id = cc.id
                 JOIN equipment_models em ON cc.model_id = em.id
                 JOIN brands b ON em.brand_id = b.id`;
    const params = [];
    if (req.query.category_id) {
      query += ' WHERE sp.category_id = ?';
      params.push(req.query.category_id);
    } else if (req.query.model_id) {
      query += ' WHERE cc.model_id = ?';
      params.push(req.query.model_id);
    }
    query += ' ORDER BY cc.sort_order, sp.sort_order';
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/parts', async (req, res) => {
  try {
    const { category_id, name, part_number, list_price, sort_order } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO spare_parts (category_id, name, part_number, list_price, sort_order) VALUES (?, ?, ?, ?, ?)',
      [category_id, name, part_number || 'NA', list_price || 0, sort_order || 0]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/parts/:id', async (req, res) => {
  try {
    const { category_id, name, part_number, list_price, sort_order } = req.body;
    await pool.execute(
      'UPDATE spare_parts SET category_id = ?, name = ?, part_number = ?, list_price = ?, sort_order = ? WHERE id = ?',
      [category_id, name, part_number || 'NA', list_price || 0, sort_order || 0, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/parts/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM spare_parts WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== PRICING SETTINGS =====================

router.get('/pricing', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM pricing_settings ORDER BY category, setting_key');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/pricing/:id', async (req, res) => {
  try {
    const { value } = req.body;
    await pool.execute('UPDATE pricing_settings SET value = ? WHERE id = ?', [value, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== BRANDS =====================

router.get('/brands', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM brands ORDER BY id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
