const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { generatePdf } = require('../services/pdfGenerator');

const router = express.Router();
router.use(authMiddleware);

// Genera numero preventivo progressivo
async function generateQuotationNumber(connection) {
  const year = new Date().getFullYear();
  const [rows] = await connection.execute(
    "SELECT quotation_number FROM quotations WHERE quotation_number LIKE ? ORDER BY id DESC LIMIT 1",
    [`NT-${year}-%`]
  );
  let next = 1;
  if (rows.length > 0) {
    const last = rows[0].quotation_number;
    next = parseInt(last.split('-')[2]) + 1;
  }
  return `NT-${year}-${String(next).padStart(3, '0')}`;
}

// Lista preventivi
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT q.*, d.name as destination_name, l.name as location_name,
              hm.name as hamann_model_name, dm.name as dvz_model_name
       FROM quotations q
       JOIN destinations d ON q.destination_id = d.id
       JOIN locations l ON q.location_id = l.id
       LEFT JOIN equipment_models hm ON q.hamann_model_id = hm.id
       LEFT JOIN equipment_models dm ON q.dvz_model_id = dm.id
       ORDER BY q.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore nel caricamento preventivi' });
  }
});

// Dettaglio preventivo completo
router.get('/:id', async (req, res) => {
  try {
    const [quotations] = await pool.execute(
      `SELECT q.*, d.name as destination_name, d.km as dest_km, d.travel_hours as dest_travel_hours,
              d.highway_cost as dest_highway_cost, l.name as location_name,
              hm.name as hamann_model_name, dm.name as dvz_model_name
       FROM quotations q
       JOIN destinations d ON q.destination_id = d.id
       JOIN locations l ON q.location_id = l.id
       LEFT JOIN equipment_models hm ON q.hamann_model_id = hm.id
       LEFT JOIN equipment_models dm ON q.dvz_model_id = dm.id
       WHERE q.id = ?`,
      [req.params.id]
    );

    if (quotations.length === 0) {
      return res.status(404).json({ error: 'Preventivo non trovato' });
    }

    const quotation = quotations[0];

    // Carica tutti i dettagli in parallelo
    const [parts] = await pool.execute(
      `SELECT qp.*, sp.name as part_name, sp.part_number, cc.name as category_name,
              b.name as brand_name
       FROM quotation_parts qp
       JOIN spare_parts sp ON qp.spare_part_id = sp.id
       JOIN component_categories cc ON sp.category_id = cc.id
       JOIN equipment_models em ON cc.model_id = em.id
       JOIN brands b ON em.brand_id = b.id
       WHERE qp.quotation_id = ?
       ORDER BY b.id, cc.sort_order, sp.sort_order`,
      [req.params.id]
    );

    const [customParts] = await pool.execute(
      'SELECT * FROM quotation_custom_parts WHERE quotation_id = ?',
      [req.params.id]
    );

    const [services] = await pool.execute(
      'SELECT * FROM quotation_services WHERE quotation_id = ? ORDER BY service_number',
      [req.params.id]
    );

    const [travel] = await pool.execute(
      'SELECT * FROM quotation_travel WHERE quotation_id = ? ORDER BY service_number',
      [req.params.id]
    );

    const [workshop] = await pool.execute(
      'SELECT * FROM quotation_workshop WHERE quotation_id = ? ORDER BY service_number',
      [req.params.id]
    );

    const [workshopMaterials] = await pool.execute(
      'SELECT * FROM quotation_workshop_materials WHERE quotation_id = ?',
      [req.params.id]
    );

    res.json({
      ...quotation,
      parts,
      customParts,
      services,
      travel,
      workshop,
      workshopMaterials
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore nel caricamento preventivo' });
  }
});

// Crea preventivo
router.post('/', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const {
      location_id, destination_id, client_type, client_name,
      hamann_model_id, dvz_model_id, num_services,
      discount_amount, notes,
      parts, customParts, services, travel, workshop, workshopMaterials
    } = req.body;

    const quotation_number = await generateQuotationNumber(connection);

    const [result] = await connection.execute(
      `INSERT INTO quotations (quotation_number, client_name, location_id, destination_id, client_type,
       hamann_model_id, dvz_model_id, num_services, discount_amount, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [quotation_number, client_name || '', location_id, destination_id, client_type,
       hamann_model_id || null, dvz_model_id || null, num_services || 1,
       discount_amount || 0, notes || null]
    );

    const quotationId = result.insertId;

    // Inserisci ricambi
    if (parts && parts.length > 0) {
      for (const p of parts) {
        await connection.execute(
          `INSERT INTO quotation_parts (quotation_id, spare_part_id, quantity, unit_price, sale_price, cost_price)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [quotationId, p.spare_part_id, p.quantity, p.unit_price, p.sale_price, p.cost_price]
        );
      }
    }

    // Inserisci ricambi custom
    if (customParts && customParts.length > 0) {
      for (const p of customParts) {
        await connection.execute(
          `INSERT INTO quotation_custom_parts (quotation_id, brand, description, part_number, quantity, unit_price, sale_price, cost_price)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [quotationId, p.brand || '', p.description || '', p.part_number || 'NA',
           p.quantity || 0, p.unit_price || 0, p.sale_price || 0, p.cost_price || 0]
        );
      }
    }

    // Inserisci servizi
    if (services && services.length > 0) {
      for (const s of services) {
        await connection.execute(
          `INSERT INTO quotation_services (quotation_id, service_number, junior_people, junior_hours, junior_rate,
           senior_people, senior_hours, senior_rate, consumables)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [quotationId, s.service_number, s.junior_people || 0, s.junior_hours || 0, s.junior_rate || 0,
           s.senior_people || 0, s.senior_hours || 0, s.senior_rate || 0, s.consumables || 0]
        );
      }
    }

    // Inserisci trasferte
    if (travel && travel.length > 0) {
      for (const t of travel) {
        await connection.execute(
          `INSERT INTO quotation_travel (quotation_id, service_number, enabled, km, travel_hours, highway,
           daily_allowance, daily_allowance_half, rental_car, flights, taxi, parking, other)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [quotationId, t.service_number, t.enabled !== false ? 1 : 0, t.km || 0, t.travel_hours || 0,
           t.highway || 0, t.daily_allowance || 0, t.daily_allowance_half || 0,
           t.rental_car || 0, t.flights || 0, t.taxi || 0, t.parking || 0, t.other || 0]
        );
      }
    }

    // Inserisci workshop
    if (workshop && workshop.length > 0) {
      for (const w of workshop) {
        await connection.execute(
          `INSERT INTO quotation_workshop (quotation_id, service_number, junior_people, junior_hours, junior_rate,
           senior_people, senior_hours, senior_rate, consumables, disposals)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [quotationId, w.service_number, w.junior_people || 0, w.junior_hours || 0, w.junior_rate || 0,
           w.senior_people || 0, w.senior_hours || 0, w.senior_rate || 0,
           w.consumables || 0, w.disposals || 0]
        );
      }
    }

    // Inserisci materiali workshop
    if (workshopMaterials && workshopMaterials.length > 0) {
      for (const m of workshopMaterials) {
        await connection.execute(
          `INSERT INTO quotation_workshop_materials (quotation_id, description, part_number, quantity, unit_price, sale_price)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [quotationId, m.description || '', m.part_number || '', m.quantity || 0,
           m.unit_price || 0, m.sale_price || 0]
        );
      }
    }

    await connection.commit();
    res.status(201).json({ id: quotationId, quotation_number });
  } catch (err) {
    await connection.rollback();
    console.error('Create quotation error:', err);
    res.status(500).json({ error: 'Errore nella creazione del preventivo' });
  } finally {
    connection.release();
  }
});

// Aggiorna preventivo completo
router.put('/:id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const {
      location_id, destination_id, client_type, client_name,
      hamann_model_id, dvz_model_id, num_services,
      discount_amount, notes,
      parts, customParts, services, travel, workshop, workshopMaterials
    } = req.body;

    const quotationId = parseInt(req.params.id);

    // Aggiorna testata
    await connection.execute(
      `UPDATE quotations SET client_name = ?, location_id = ?, destination_id = ?, client_type = ?,
       hamann_model_id = ?, dvz_model_id = ?, num_services = ?, discount_amount = ?, notes = ?
       WHERE id = ?`,
      [client_name || '', location_id, destination_id, client_type,
       hamann_model_id || null, dvz_model_id || null, num_services || 1,
       discount_amount || 0, notes || null, quotationId]
    );

    // Elimina vecchi dettagli (cascade non basta perché facciamo replace)
    await connection.execute('DELETE FROM quotation_parts WHERE quotation_id = ?', [quotationId]);
    await connection.execute('DELETE FROM quotation_custom_parts WHERE quotation_id = ?', [quotationId]);
    await connection.execute('DELETE FROM quotation_services WHERE quotation_id = ?', [quotationId]);
    await connection.execute('DELETE FROM quotation_travel WHERE quotation_id = ?', [quotationId]);
    await connection.execute('DELETE FROM quotation_workshop WHERE quotation_id = ?', [quotationId]);
    await connection.execute('DELETE FROM quotation_workshop_materials WHERE quotation_id = ?', [quotationId]);

    // Reinserisci tutto
    if (parts && parts.length > 0) {
      for (const p of parts) {
        await connection.execute(
          `INSERT INTO quotation_parts (quotation_id, spare_part_id, quantity, unit_price, sale_price, cost_price)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [quotationId, p.spare_part_id, p.quantity, p.unit_price, p.sale_price, p.cost_price]
        );
      }
    }

    if (customParts && customParts.length > 0) {
      for (const p of customParts) {
        await connection.execute(
          `INSERT INTO quotation_custom_parts (quotation_id, brand, description, part_number, quantity, unit_price, sale_price, cost_price)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [quotationId, p.brand || '', p.description || '', p.part_number || 'NA',
           p.quantity || 0, p.unit_price || 0, p.sale_price || 0, p.cost_price || 0]
        );
      }
    }

    if (services && services.length > 0) {
      for (const s of services) {
        await connection.execute(
          `INSERT INTO quotation_services (quotation_id, service_number, junior_people, junior_hours, junior_rate,
           senior_people, senior_hours, senior_rate, consumables)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [quotationId, s.service_number, s.junior_people || 0, s.junior_hours || 0, s.junior_rate || 0,
           s.senior_people || 0, s.senior_hours || 0, s.senior_rate || 0, s.consumables || 0]
        );
      }
    }

    if (travel && travel.length > 0) {
      for (const t of travel) {
        await connection.execute(
          `INSERT INTO quotation_travel (quotation_id, service_number, enabled, km, travel_hours, highway,
           daily_allowance, daily_allowance_half, rental_car, flights, taxi, parking, other)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [quotationId, t.service_number, t.enabled !== false ? 1 : 0, t.km || 0, t.travel_hours || 0,
           t.highway || 0, t.daily_allowance || 0, t.daily_allowance_half || 0,
           t.rental_car || 0, t.flights || 0, t.taxi || 0, t.parking || 0, t.other || 0]
        );
      }
    }

    if (workshop && workshop.length > 0) {
      for (const w of workshop) {
        await connection.execute(
          `INSERT INTO quotation_workshop (quotation_id, service_number, junior_people, junior_hours, junior_rate,
           senior_people, senior_hours, senior_rate, consumables, disposals)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [quotationId, w.service_number, w.junior_people || 0, w.junior_hours || 0, w.junior_rate || 0,
           w.senior_people || 0, w.senior_hours || 0, w.senior_rate || 0,
           w.consumables || 0, w.disposals || 0]
        );
      }
    }

    if (workshopMaterials && workshopMaterials.length > 0) {
      for (const m of workshopMaterials) {
        await connection.execute(
          `INSERT INTO quotation_workshop_materials (quotation_id, description, part_number, quantity, unit_price, sale_price)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [quotationId, m.description || '', m.part_number || '', m.quantity || 0,
           m.unit_price || 0, m.sale_price || 0]
        );
      }
    }

    await connection.commit();
    res.json({ id: quotationId });
  } catch (err) {
    await connection.rollback();
    console.error('Update quotation error:', err);
    res.status(500).json({ error: 'Errore nell\'aggiornamento del preventivo' });
  } finally {
    connection.release();
  }
});

// Aggiorna stato preventivo
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['draft', 'sent', 'accepted', 'rejected'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Stato non valido' });
    }
    await pool.execute('UPDATE quotations SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore aggiornamento stato' });
  }
});

// Elimina preventivo
router.delete('/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM quotations WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore eliminazione preventivo' });
  }
});

// Genera PDF
router.get('/:id/pdf', async (req, res) => {
  try {
    // Carica il preventivo completo
    const [quotations] = await pool.execute(
      `SELECT q.*, d.name as destination_name, l.name as location_name,
              hm.name as hamann_model_name, dm.name as dvz_model_name
       FROM quotations q
       JOIN destinations d ON q.destination_id = d.id
       JOIN locations l ON q.location_id = l.id
       LEFT JOIN equipment_models hm ON q.hamann_model_id = hm.id
       LEFT JOIN equipment_models dm ON q.dvz_model_id = dm.id
       WHERE q.id = ?`,
      [req.params.id]
    );

    if (quotations.length === 0) {
      return res.status(404).json({ error: 'Preventivo non trovato' });
    }

    const quotation = quotations[0];

    const [parts] = await pool.execute(
      `SELECT qp.*, sp.name as part_name, sp.part_number, cc.name as category_name, b.name as brand_name
       FROM quotation_parts qp
       JOIN spare_parts sp ON qp.spare_part_id = sp.id
       JOIN component_categories cc ON sp.category_id = cc.id
       JOIN equipment_models em ON cc.model_id = em.id
       JOIN brands b ON em.brand_id = b.id
       WHERE qp.quotation_id = ? ORDER BY b.id, cc.sort_order, sp.sort_order`,
      [req.params.id]
    );
    const [customParts] = await pool.execute('SELECT * FROM quotation_custom_parts WHERE quotation_id = ?', [req.params.id]);
    const [services] = await pool.execute('SELECT * FROM quotation_services WHERE quotation_id = ? ORDER BY service_number', [req.params.id]);
    const [travel] = await pool.execute('SELECT * FROM quotation_travel WHERE quotation_id = ? ORDER BY service_number', [req.params.id]);
    const [workshop] = await pool.execute('SELECT * FROM quotation_workshop WHERE quotation_id = ? ORDER BY service_number', [req.params.id]);
    const [workshopMaterials] = await pool.execute('SELECT * FROM quotation_workshop_materials WHERE quotation_id = ?', [req.params.id]);

    quotation.parts = parts;
    quotation.customParts = customParts;
    quotation.services = services;
    quotation.travel = travel;
    quotation.workshop = workshop;
    quotation.workshopMaterials = workshopMaterials;

    // Carica pricing settings
    const [settingsRows] = await pool.execute('SELECT * FROM pricing_settings');
    const pricing = {};
    for (const row of settingsRows) {
      pricing[row.setting_key] = parseFloat(row.value);
    }

    const pdfBuffer = await generatePdf(quotation, pricing);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Preventivo_${quotation.quotation_number}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'Errore generazione PDF' });
  }
});

module.exports = router;
