const PDFDocument = require('pdfkit');

function generatePdf(quotation, pricing) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const pageWidth = doc.page.width - 80;

      // Header
      doc.fontSize(18).font('Helvetica-Bold').text('NAVALTECNICA', { align: 'center' });
      doc.fontSize(10).font('Helvetica').text('Quotation / Preventivo', { align: 'center' });
      doc.moveDown(0.5);

      // Linea separatrice
      doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
      doc.moveDown(0.5);

      // Info generali
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text(`Quotation N.: ${quotation.quotation_number}`, 40);
      doc.text(`Date: ${new Date(quotation.created_at).toLocaleDateString('it-IT')}`);
      doc.moveDown(0.3);
      doc.font('Helvetica');
      if (quotation.client_name) {
        doc.text(`Client: ${quotation.client_name}`);
      }
      doc.text(`Location: ${quotation.location_name}`);
      doc.text(`Destination: ${quotation.destination_name}`);
      doc.text(`Client: ${quotation.client_type === 'shipyard' ? 'SHIPYARD' : 'SHIP OWNER'}`);
      if (quotation.hamann_model_name) doc.text(`Hamann Model: ${quotation.hamann_model_name}`);
      if (quotation.dvz_model_name) doc.text(`DVZ Model: ${quotation.dvz_model_name}`);
      doc.moveDown();

      // ===== SEZIONE A: SPARE PARTS =====
      if (quotation.parts && quotation.parts.length > 0) {
        doc.font('Helvetica-Bold').fontSize(11).text('A) SPARE PART LIST');
        doc.moveDown(0.3);

        // Header tabella
        const colX = [40, 220, 310, 370, 430, 490];
        doc.fontSize(8).font('Helvetica-Bold');
        doc.text('Description', colX[0], doc.y);
        doc.text('Part No.', colX[1], doc.y - 10);
        doc.text('Qty', colX[2], doc.y - 10);
        doc.text('Unit Price', colX[3], doc.y - 10);
        doc.text('Total', colX[4], doc.y - 10);
        doc.moveDown(0.3);

        let currentCategory = '';
        let sectionTotal = 0;

        doc.font('Helvetica').fontSize(8);
        for (const part of quotation.parts) {
          if (doc.y > doc.page.height - 80) {
            doc.addPage();
          }

          if (part.category_name !== currentCategory) {
            currentCategory = part.category_name;
            const brandLabel = part.brand_name || '';
            doc.font('Helvetica-Bold').fontSize(8);
            doc.text(`${brandLabel} - ${currentCategory}`, colX[0], doc.y + 4);
            doc.font('Helvetica').fontSize(8);
            doc.moveDown(0.2);
          }

          const total = part.quantity * part.sale_price / (part.quantity || 1);
          const lineTotal = part.sale_price;
          sectionTotal += lineTotal;

          const y = doc.y;
          doc.text(part.part_name, colX[0], y, { width: 175 });
          doc.text(part.part_number, colX[1], y);
          doc.text(String(part.quantity), colX[2], y);
          doc.text(formatCurrency(part.unit_price), colX[3], y);
          doc.text(formatCurrency(lineTotal), colX[4], y);
          doc.moveDown(0.2);
        }

        // Custom parts
        if (quotation.customParts && quotation.customParts.length > 0) {
          for (const part of quotation.customParts) {
            if (doc.y > doc.page.height - 80) doc.addPage();
            const lineTotal = part.sale_price;
            sectionTotal += lineTotal;
            const y = doc.y;
            doc.text(part.description, colX[0], y, { width: 175 });
            doc.text(part.part_number, colX[1], y);
            doc.text(String(part.quantity), colX[2], y);
            doc.text(formatCurrency(part.unit_price), colX[3], y);
            doc.text(formatCurrency(lineTotal), colX[4], y);
            doc.moveDown(0.2);
          }
        }

        doc.moveDown(0.3);
        doc.font('Helvetica-Bold');
        doc.text(`Subtotal A: ${formatCurrency(sectionTotal)}`, colX[3], doc.y);
        doc.font('Helvetica');
        doc.moveDown();
      }

      // ===== SEZIONE B: SERVICE HOURS =====
      if (quotation.services && quotation.services.length > 0) {
        if (doc.y > doc.page.height - 120) doc.addPage();

        doc.font('Helvetica-Bold').fontSize(11).text('B) SERVICE HOURS - ON BOARD');
        doc.moveDown(0.3);
        doc.fontSize(8);

        let sectionTotal = 0;
        for (const svc of quotation.services) {
          const juniorTotal = (svc.junior_people || 0) * (svc.junior_hours || 0) * (svc.junior_rate || 0);
          const seniorTotal = (svc.senior_people || 0) * (svc.senior_hours || 0) * (svc.senior_rate || 0);
          const consumables = svc.consumables || 0;
          const serviceTotal = juniorTotal + seniorTotal + consumables;
          sectionTotal += serviceTotal;

          doc.font('Helvetica-Bold').text(`Service ${svc.service_number}`);
          doc.font('Helvetica');
          if (svc.junior_people > 0) {
            doc.text(`  Junior: ${svc.junior_people} pers. x ${svc.junior_hours}h x ${formatCurrency(svc.junior_rate)}/h = ${formatCurrency(juniorTotal)}`);
          }
          if (svc.senior_people > 0) {
            doc.text(`  Senior: ${svc.senior_people} pers. x ${svc.senior_hours}h x ${formatCurrency(svc.senior_rate)}/h = ${formatCurrency(seniorTotal)}`);
          }
          if (consumables > 0) {
            doc.text(`  Consumables: ${formatCurrency(consumables)}`);
          }
          doc.moveDown(0.2);
        }

        doc.font('Helvetica-Bold');
        doc.text(`Subtotal B: ${formatCurrency(sectionTotal)}`);
        doc.font('Helvetica');
        doc.moveDown();
      }

      // ===== SEZIONE C: TRAVEL AND LODGING =====
      if (quotation.travel && quotation.travel.length > 0) {
        if (doc.y > doc.page.height - 120) doc.addPage();

        doc.font('Helvetica-Bold').fontSize(11).text('C) TRAVEL AND LODGING');
        doc.moveDown(0.3);
        doc.fontSize(8);

        let sectionTotal = 0;
        for (const t of quotation.travel) {
          if (!t.enabled) continue;

          doc.font('Helvetica-Bold').text(`Service ${t.service_number}`);
          doc.font('Helvetica');

          const isAbroad = quotation.location_name !== 'ITALY';
          const dailyRate = isAbroad ? pricing.daily_allowance_abroad : pricing.daily_allowance_italy;
          const halfRate = isAbroad ? pricing.daily_allowance_half_abroad : pricing.daily_allowance_half_italy;

          const kmTotal = (t.km || 0) * pricing.cost_per_km;
          const hoursTotal = (t.travel_hours || 0) * pricing.travel_hour_rate;
          const highwayTotal = (t.highway || 0) * (1 + pricing.highway_surcharge);
          const allowanceTotal = (t.daily_allowance || 0) * dailyRate + (t.daily_allowance_half || 0) * halfRate;
          const extras = (t.rental_car || 0) + (t.flights || 0) + (t.taxi || 0) + (t.parking || 0) + (t.other || 0);
          const serviceTotal = kmTotal + hoursTotal + highwayTotal + allowanceTotal + extras;
          sectionTotal += serviceTotal;

          if (t.km > 0) doc.text(`  KM: ${t.km} x ${formatCurrency(pricing.cost_per_km)} = ${formatCurrency(kmTotal)}`);
          if (t.travel_hours > 0) doc.text(`  Travel Hours: ${t.travel_hours} x ${formatCurrency(pricing.travel_hour_rate)} = ${formatCurrency(hoursTotal)}`);
          if (t.highway > 0) doc.text(`  Highway: ${formatCurrency(highwayTotal)}`);
          if (t.daily_allowance > 0) doc.text(`  Daily Allowance: ${t.daily_allowance} x ${formatCurrency(dailyRate)} = ${formatCurrency(t.daily_allowance * dailyRate)}`);
          if (t.daily_allowance_half > 0) doc.text(`  Half Allowance: ${t.daily_allowance_half} x ${formatCurrency(halfRate)} = ${formatCurrency(t.daily_allowance_half * halfRate)}`);
          if (t.rental_car > 0) doc.text(`  Rental Car: ${formatCurrency(t.rental_car)}`);
          if (t.flights > 0) doc.text(`  Flights: ${formatCurrency(t.flights)}`);
          if (t.taxi > 0) doc.text(`  Taxi: ${formatCurrency(t.taxi)}`);
          if (t.parking > 0) doc.text(`  Parking: ${formatCurrency(t.parking)}`);
          if (t.other > 0) doc.text(`  Other: ${formatCurrency(t.other)}`);
          doc.moveDown(0.2);
        }

        doc.font('Helvetica-Bold');
        doc.text(`Subtotal C: ${formatCurrency(sectionTotal)}`);
        doc.font('Helvetica');
        doc.moveDown();
      }

      // ===== SEZIONE D: WORKSHOP =====
      if (quotation.workshop && quotation.workshop.length > 0) {
        if (doc.y > doc.page.height - 120) doc.addPage();

        doc.font('Helvetica-Bold').fontSize(11).text('D) SERVICE HOURS AND MATERIAL - WORKSHOP');
        doc.moveDown(0.3);
        doc.fontSize(8);

        let sectionTotal = 0;
        for (const w of quotation.workshop) {
          const juniorTotal = (w.junior_people || 0) * (w.junior_hours || 0) * (w.junior_rate || 0);
          const seniorTotal = (w.senior_people || 0) * (w.senior_hours || 0) * (w.senior_rate || 0);
          const consumables = w.consumables || 0;
          const disposals = w.disposals || 0;
          sectionTotal += juniorTotal + seniorTotal + consumables + disposals;

          doc.font('Helvetica-Bold').text(`Service ${w.service_number}`);
          doc.font('Helvetica');
          if (w.junior_people > 0) doc.text(`  Junior: ${w.junior_people} pers. x ${w.junior_hours}h x ${formatCurrency(w.junior_rate)}/h = ${formatCurrency(juniorTotal)}`);
          if (w.senior_people > 0) doc.text(`  Senior: ${w.senior_people} pers. x ${w.senior_hours}h x ${formatCurrency(w.senior_rate)}/h = ${formatCurrency(seniorTotal)}`);
          if (consumables > 0) doc.text(`  Consumables: ${formatCurrency(consumables)}`);
          if (disposals > 0) doc.text(`  Disposals: ${formatCurrency(disposals)}`);
          doc.moveDown(0.2);
        }

        // Workshop materials
        if (quotation.workshopMaterials && quotation.workshopMaterials.length > 0) {
          doc.font('Helvetica-Bold').text('Materials:');
          doc.font('Helvetica');
          for (const m of quotation.workshopMaterials) {
            const total = (m.quantity || 0) * (m.sale_price || 0);
            sectionTotal += total;
            doc.text(`  ${m.description} (${m.part_number}) x${m.quantity} = ${formatCurrency(total)}`);
          }
        }

        doc.font('Helvetica-Bold');
        doc.text(`Subtotal D: ${formatCurrency(sectionTotal)}`);
        doc.font('Helvetica');
        doc.moveDown();
      }

      // ===== RIEPILOGO =====
      if (doc.y > doc.page.height - 150) doc.addPage();

      doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
      doc.moveDown(0.5);

      const totals = calcTotals(quotation, pricing);

      doc.font('Helvetica-Bold').fontSize(10);
      doc.text('SUMMARY', 40);
      doc.moveDown(0.3);
      doc.fontSize(9).font('Helvetica');
      doc.text(`A) Spare Parts:                 ${formatCurrency(totals.partsTotal)}`);
      doc.text(`B) Service Hours On Board:      ${formatCurrency(totals.servicesTotal)}`);
      doc.text(`C) Travel and Lodging:          ${formatCurrency(totals.travelTotal)}`);
      doc.text(`D) Workshop:                    ${formatCurrency(totals.workshopTotal)}`);
      doc.moveDown(0.3);

      doc.font('Helvetica-Bold').fontSize(11);
      doc.text(`TOTAL:                          ${formatCurrency(totals.grandTotal)}`);

      if (quotation.discount_amount > 0) {
        doc.fontSize(9);
        doc.text(`Discount:                       -${formatCurrency(quotation.discount_amount)}`);
        doc.fontSize(11);
        doc.text(`TOTAL (after discount):         ${formatCurrency(totals.grandTotal - quotation.discount_amount)}`);
      }

      doc.moveDown(2);
      doc.fontSize(8).font('Helvetica');
      doc.text('All prices in EUR. This quotation is valid for 30 days.', { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function calcTotals(quotation, pricing) {
  let partsTotal = 0;
  if (quotation.parts) {
    for (const p of quotation.parts) {
      partsTotal += p.sale_price || 0;
    }
  }
  if (quotation.customParts) {
    for (const p of quotation.customParts) {
      partsTotal += p.sale_price || 0;
    }
  }

  let servicesTotal = 0;
  if (quotation.services) {
    for (const s of quotation.services) {
      servicesTotal += (s.junior_people || 0) * (s.junior_hours || 0) * (s.junior_rate || 0);
      servicesTotal += (s.senior_people || 0) * (s.senior_hours || 0) * (s.senior_rate || 0);
      servicesTotal += s.consumables || 0;
    }
  }

  let travelTotal = 0;
  if (quotation.travel) {
    for (const t of quotation.travel) {
      if (!t.enabled) continue;
      const isAbroad = quotation.location_name !== 'ITALY';
      const dailyRate = isAbroad ? pricing.daily_allowance_abroad : pricing.daily_allowance_italy;
      const halfRate = isAbroad ? pricing.daily_allowance_half_abroad : pricing.daily_allowance_half_italy;
      travelTotal += (t.km || 0) * pricing.cost_per_km;
      travelTotal += (t.travel_hours || 0) * pricing.travel_hour_rate;
      travelTotal += (t.highway || 0) * (1 + pricing.highway_surcharge);
      travelTotal += (t.daily_allowance || 0) * dailyRate;
      travelTotal += (t.daily_allowance_half || 0) * halfRate;
      travelTotal += (t.rental_car || 0) + (t.flights || 0) + (t.taxi || 0) + (t.parking || 0) + (t.other || 0);
    }
  }

  let workshopTotal = 0;
  if (quotation.workshop) {
    for (const w of quotation.workshop) {
      workshopTotal += (w.junior_people || 0) * (w.junior_hours || 0) * (w.junior_rate || 0);
      workshopTotal += (w.senior_people || 0) * (w.senior_hours || 0) * (w.senior_rate || 0);
      workshopTotal += w.consumables || 0;
      workshopTotal += w.disposals || 0;
    }
  }
  if (quotation.workshopMaterials) {
    for (const m of quotation.workshopMaterials) {
      workshopTotal += (m.quantity || 0) * (m.sale_price || 0);
    }
  }

  return {
    partsTotal,
    servicesTotal,
    travelTotal,
    workshopTotal,
    grandTotal: partsTotal + servicesTotal + travelTotal + workshopTotal
  };
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(value || 0);
}

module.exports = { generatePdf };
