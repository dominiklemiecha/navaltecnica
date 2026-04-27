import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { dataApi, quotationApi } from '../services/api';
import StepGeneral from '../components/StepGeneral';
import StepParts from '../components/StepParts';
import StepService from '../components/StepService';
import StepTravel from '../components/StepTravel';
import StepWorkshop from '../components/StepWorkshop';
import StepSummary from '../components/StepSummary';

const STEPS = [
  { label: 'Generale', key: 'general' },
  { label: 'Ricambi', key: 'parts' },
  { label: 'Servizio', key: 'service' },
  { label: 'Trasferte', key: 'travel' },
  { label: 'Officina', key: 'workshop' },
  { label: 'Riepilogo', key: 'summary' }
];

const emptyService = (n) => ({
  service_number: n,
  junior_people: 0, junior_hours: 0,
  senior_people: 0, senior_hours: 0,
  consumables: 0
});

const emptyTravel = (n) => ({
  service_number: n, enabled: true,
  km: 0, travel_hours: 0, highway: 0,
  daily_allowance: 0, daily_allowance_half: 0,
  rental_car: 0, flights: 0, taxi: 0, parking: 0, other: 0
});

const emptyWorkshop = (n) => ({
  service_number: n,
  junior_people: 0, junior_hours: 0,
  senior_people: 0, senior_hours: 0,
  consumables: 0, disposals: 0
});

export default function QuotationWizard() {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const isEdit = !!editId;

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  const [editQuotationNumber, setEditQuotationNumber] = useState('');

  // Reference data
  const [locations, setLocations] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [models, setModels] = useState([]);
  const [pricing, setPricing] = useState({});
  const [hamannParts, setHamannParts] = useState([]);
  const [dvzParts, setDvzParts] = useState([]);

  // Form state
  const [general, setGeneral] = useState({
    client_name: '', location_id: '', destination_id: '', client_type: 'shipyard',
    hamann_model_id: '', dvz_model_id: '', num_services: 1
  });

  const [selectedParts, setSelectedParts] = useState({});
  const [customParts, setCustomParts] = useState([]);
  const [services, setServices] = useState([emptyService(1)]);
  const [travel, setTravel] = useState([emptyTravel(1)]);
  const [workshop, setWorkshop] = useState([emptyWorkshop(1)]);
  const [workshopMaterials, setWorkshopMaterials] = useState([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [notes, setNotes] = useState('');

  // Dati derivati
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedDestination, setSelectedDestination] = useState(null);

  // Flag per evitare che gli effect sovrascrivano i dati caricati
  const [dataReady, setDataReady] = useState(false);
  const [editLoaded, setEditLoaded] = useState(false);

  // Load reference data
  useEffect(() => {
    async function load() {
      try {
        const [locRes, modRes, priceRes] = await Promise.all([
          dataApi.getLocations(),
          dataApi.getModels(),
          dataApi.getPricing()
        ]);
        setLocations(locRes.data);
        setModels(modRes.data);
        setPricing(priceRes.data.settings);
        setDataReady(true);
      } catch (err) {
        console.error('Error loading data:', err);
      }
    }
    load();
  }, []);

  // Carica preventivo esistente per modifica
  useEffect(() => {
    if (!editId || !dataReady || editLoaded) return;

    async function loadQuotation() {
      try {
        const { data: q } = await quotationApi.get(editId);
        setEditQuotationNumber(q.quotation_number);

        // Carica destinazioni per la location
        const destRes = await dataApi.getDestinations(q.location_id);
        setDestinations(destRes.data);

        // Set general
        setGeneral({
          client_name: q.client_name || '',
          location_id: String(q.location_id),
          destination_id: String(q.destination_id),
          client_type: q.client_type,
          hamann_model_id: q.hamann_model_id ? String(q.hamann_model_id) : '',
          dvz_model_id: q.dvz_model_id ? String(q.dvz_model_id) : '',
          num_services: q.num_services || 1
        });

        const loc = locations.find(l => l.id === q.location_id);
        setSelectedLocation(loc);
        const dest = destRes.data.find(d => d.id === q.destination_id);
        setSelectedDestination(dest);

        // Carica ricambi dei modelli
        if (q.hamann_model_id) {
          const r = await dataApi.getParts(q.hamann_model_id);
          setHamannParts(r.data);
        }
        if (q.dvz_model_id) {
          const r = await dataApi.getParts(q.dvz_model_id);
          setDvzParts(r.data);
        }

        // Popola quantità ricambi selezionati
        const partsMap = {};
        for (const p of q.parts || []) {
          partsMap[p.spare_part_id] = p.quantity;
        }
        setSelectedParts(partsMap);

        // Custom parts
        setCustomParts((q.customParts || []).map(p => ({
          brand: p.brand || '',
          description: p.description || '',
          part_number: p.part_number || 'NA',
          quantity: p.quantity || 0,
          unit_price: p.unit_price || 0
        })));

        // Services
        if (q.services && q.services.length > 0) {
          setServices(q.services.map(s => ({
            service_number: s.service_number,
            junior_people: s.junior_people || 0,
            junior_hours: parseFloat(s.junior_hours) || 0,
            senior_people: s.senior_people || 0,
            senior_hours: parseFloat(s.senior_hours) || 0,
            consumables: parseFloat(s.consumables) || 0
          })));
        }

        // Travel
        if (q.travel && q.travel.length > 0) {
          setTravel(q.travel.map(t => ({
            service_number: t.service_number,
            enabled: !!t.enabled,
            km: parseFloat(t.km) || 0,
            travel_hours: parseFloat(t.travel_hours) || 0,
            highway: parseFloat(t.highway) || 0,
            daily_allowance: t.daily_allowance || 0,
            daily_allowance_half: t.daily_allowance_half || 0,
            rental_car: parseFloat(t.rental_car) || 0,
            flights: parseFloat(t.flights) || 0,
            taxi: parseFloat(t.taxi) || 0,
            parking: parseFloat(t.parking) || 0,
            other: parseFloat(t.other) || 0
          })));
        }

        // Workshop
        if (q.workshop && q.workshop.length > 0) {
          setWorkshop(q.workshop.map(w => ({
            service_number: w.service_number,
            junior_people: w.junior_people || 0,
            junior_hours: parseFloat(w.junior_hours) || 0,
            senior_people: w.senior_people || 0,
            senior_hours: parseFloat(w.senior_hours) || 0,
            consumables: parseFloat(w.consumables) || 0,
            disposals: parseFloat(w.disposals) || 0
          })));
        }

        // Workshop materials
        setWorkshopMaterials((q.workshopMaterials || []).map(m => ({
          description: m.description || '',
          part_number: m.part_number || '',
          quantity: m.quantity || 0,
          unit_price: parseFloat(m.unit_price) || 0,
          sale_price: parseFloat(m.sale_price) || 0
        })));

        setDiscountAmount(parseFloat(q.discount_amount) || 0);
        setNotes(q.notes || '');
        setEditLoaded(true);
      } catch (err) {
        console.error('Error loading quotation:', err);
        alert('Errore nel caricamento del preventivo');
        navigate('/');
      } finally {
        setLoadingEdit(false);
      }
    }

    loadQuotation();
  }, [editId, dataReady]);

  // Carica destinazioni quando cambia location (solo se non stiamo caricando un edit)
  useEffect(() => {
    if (!general.location_id || (isEdit && !editLoaded)) return;
    dataApi.getDestinations(general.location_id).then(res => setDestinations(res.data));
    const loc = locations.find(l => l.id === parseInt(general.location_id));
    setSelectedLocation(loc);
  }, [general.location_id, locations]);

  // Aggiorna destinazione selezionata
  useEffect(() => {
    if (!general.destination_id) return;
    const dest = destinations.find(d => d.id === parseInt(general.destination_id));
    setSelectedDestination(dest);
    // Auto-compila KM/ore/autostrada nel travel solo per nuovi preventivi
    if (dest && !isEdit) {
      setTravel(prev => prev.map(t => ({
        ...t,
        km: dest.km,
        travel_hours: dest.travel_hours,
        highway: dest.highway_cost
      })));
    }
  }, [general.destination_id, destinations]);

  // Carica ricambi quando cambiano i modelli (solo se non stiamo caricando un edit)
  useEffect(() => {
    if (isEdit && !editLoaded) return;
    if (general.hamann_model_id) {
      dataApi.getParts(general.hamann_model_id).then(res => setHamannParts(res.data));
    } else {
      setHamannParts([]);
    }
  }, [general.hamann_model_id]);

  useEffect(() => {
    if (isEdit && !editLoaded) return;
    if (general.dvz_model_id) {
      dataApi.getParts(general.dvz_model_id).then(res => setDvzParts(res.data));
    } else {
      setDvzParts([]);
    }
  }, [general.dvz_model_id]);

  // Aggiorna numero servizi (solo per nuovi preventivi o dopo il caricamento edit)
  useEffect(() => {
    if (isEdit && !editLoaded) return;
    const n = parseInt(general.num_services) || 1;
    setServices(prev => {
      const arr = [...prev];
      while (arr.length < n) arr.push(emptyService(arr.length + 1));
      return arr.slice(0, n);
    });
    setTravel(prev => {
      const arr = [...prev];
      while (arr.length < n) {
        const t = emptyTravel(arr.length + 1);
        if (selectedDestination) {
          t.km = selectedDestination.km;
          t.travel_hours = selectedDestination.travel_hours;
          t.highway = selectedDestination.highway_cost;
        }
        arr.push(t);
      }
      return arr.slice(0, n);
    });
    setWorkshop(prev => {
      const arr = [...prev];
      while (arr.length < n) arr.push(emptyWorkshop(arr.length + 1));
      return arr.slice(0, n);
    });
  }, [general.num_services]);

  // Salva preventivo (crea o aggiorna)
  async function handleSave() {
    setSaving(true);
    try {
      const locationName = selectedLocation?.name || 'ITALY';

      // Prepara ricambi con prezzi calcolati
      const partsToSave = [];
      for (const [partId, qty] of Object.entries(selectedParts)) {
        if (qty <= 0) continue;
        const allCategories = [...hamannParts, ...dvzParts];
        let foundPart = null;
        let brandName = '';
        for (const cat of allCategories) {
          const p = cat.parts?.find(p => p.id === parseInt(partId));
          if (p) {
            foundPart = p;
            const model = models.find(m => m.id === cat.model_id);
            brandName = model?.brand_name || '';
            break;
          }
        }
        if (!foundPart) continue;

        const surcharge = general.client_type === 'shipyard'
          ? (brandName === 'HAMANN' ? pricing.shipyard_surcharge_hamann : pricing.shipyard_surcharge_dvz)
          : (brandName === 'HAMANN' ? pricing.shipowner_surcharge_hamann : pricing.shipowner_surcharge_dvz);
        const costPct = brandName === 'HAMANN' ? 0.8 : 0.9;

        partsToSave.push({
          spare_part_id: parseInt(partId),
          quantity: qty,
          unit_price: foundPart.list_price,
          sale_price: qty * foundPart.list_price * (1 + surcharge),
          cost_price: qty * foundPart.list_price * costPct
        });
      }

      // Calcola rate per servizi
      const locIncrease = locationName === 'MEDITERRANEAN' ? (pricing.mediterranean_labour_increase || 0.1) :
                          locationName === 'OVERSEAS' ? (pricing.overseas_labour_increase || 0.15) : 0;
      const juniorRate = (pricing.junior_rate || 128) * (1 + locIncrease);
      const seniorRate = (pricing.senior_rate || 152) * (1 + locIncrease);
      const workshopRate = pricing.travel_hour_rate || 102.5;

      const payload = {
        client_name: general.client_name || '',
        location_id: parseInt(general.location_id),
        destination_id: parseInt(general.destination_id),
        client_type: general.client_type,
        hamann_model_id: general.hamann_model_id ? parseInt(general.hamann_model_id) : null,
        dvz_model_id: general.dvz_model_id ? parseInt(general.dvz_model_id) : null,
        num_services: parseInt(general.num_services),
        discount_amount: parseFloat(discountAmount) || 0,
        notes: notes || null,
        parts: partsToSave,
        customParts: customParts.filter(p => p.description && p.quantity > 0).map(p => ({
          ...p,
          sale_price: p.quantity * p.unit_price * (1 + (pricing.shipyard_surcharge_hamann || 0.05)),
          cost_price: p.quantity * p.unit_price * 0.8
        })),
        services: services.map(s => ({ ...s, junior_rate: juniorRate, senior_rate: seniorRate })),
        travel,
        workshop: workshop.map(w => ({ ...w, junior_rate: workshopRate, senior_rate: workshopRate })),
        workshopMaterials: workshopMaterials.filter(m => m.description)
      };

      if (isEdit) {
        await quotationApi.update(editId, payload);
        alert(`Preventivo ${editQuotationNumber} aggiornato!`);
      } else {
        const { data } = await quotationApi.create(payload);
        alert(`Preventivo ${data.quotation_number} creato!`);
      }
      navigate('/');
    } catch (err) {
      console.error('Save error:', err);
      alert('Errore nel salvataggio: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  }

  const hamannModels = models.filter(m => m.brand_name === 'HAMANN');
  const dvzModels = models.filter(m => m.brand_name === 'DVZ');

  if (loadingEdit) {
    return <div className="card"><p>Caricamento preventivo...</p></div>;
  }

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>{isEdit ? `Modifica ${editQuotationNumber}` : 'Nuovo Preventivo'}</h1>
          <p>{isEdit ? 'Modifica i dati del preventivo esistente' : 'Compila i dati per creare un nuovo preventivo'}</p>
        </div>
      </div>

      {/* Wizard Steps */}
      <div className="wizard-steps">
        {STEPS.map((s, i) => (
          <div
            key={s.key}
            className={`wizard-step ${i === step ? 'active' : i < step ? 'completed' : ''}`}
            onClick={() => setStep(i)}
          >
            <span className="step-number">{i + 1}</span>
            {s.label}
          </div>
        ))}
      </div>

      {/* Step Content */}
      {step === 0 && (
        <StepGeneral
          general={general}
          setGeneral={setGeneral}
          locations={locations}
          destinations={destinations}
          hamannModels={hamannModels}
          dvzModels={dvzModels}
        />
      )}

      {step === 1 && (
        <StepParts
          hamannParts={hamannParts}
          dvzParts={dvzParts}
          selectedParts={selectedParts}
          setSelectedParts={setSelectedParts}
          customParts={customParts}
          setCustomParts={setCustomParts}
          clientType={general.client_type}
          pricing={pricing}
          models={models}
          hamannModelId={general.hamann_model_id}
          dvzModelId={general.dvz_model_id}
        />
      )}

      {step === 2 && (
        <StepService
          services={services}
          setServices={setServices}
          pricing={pricing}
          locationName={selectedLocation?.name || 'ITALY'}
        />
      )}

      {step === 3 && (
        <StepTravel
          travel={travel}
          setTravel={setTravel}
          pricing={pricing}
          locationName={selectedLocation?.name || 'ITALY'}
        />
      )}

      {step === 4 && (
        <StepWorkshop
          workshop={workshop}
          setWorkshop={setWorkshop}
          workshopMaterials={workshopMaterials}
          setWorkshopMaterials={setWorkshopMaterials}
          pricing={pricing}
        />
      )}

      {step === 5 && (
        <StepSummary
          general={general}
          selectedParts={selectedParts}
          customParts={customParts}
          services={services}
          travel={travel}
          workshop={workshop}
          workshopMaterials={workshopMaterials}
          discountAmount={discountAmount}
          setDiscountAmount={setDiscountAmount}
          notes={notes}
          setNotes={setNotes}
          pricing={pricing}
          locationName={selectedLocation?.name || 'ITALY'}
          destinationName={selectedDestination?.name || ''}
          hamannParts={hamannParts}
          dvzParts={dvzParts}
          models={models}
          onSave={handleSave}
          saving={saving}
          isEdit={isEdit}
        />
      )}

      {/* Navigation */}
      <div className="btn-group" style={{ justifyContent: 'space-between', marginTop: '20px' }}>
        <button className="btn btn-secondary" onClick={() => step > 0 ? setStep(step - 1) : navigate('/')} >
          {step === 0 ? 'Annulla' : 'Indietro'}
        </button>
        {step < STEPS.length - 1 && (
          <button className="btn btn-primary" onClick={() => setStep(step + 1)}>
            Avanti
          </button>
        )}
      </div>
    </>
  );
}
