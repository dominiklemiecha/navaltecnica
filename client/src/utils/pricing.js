/**
 * Logica di calcolo prezzi lato client (per preview in tempo reale)
 * Replica la stessa logica del backend pricingEngine.js
 */

export function getSurcharge(clientType, brandName, pricing) {
  if (clientType === 'shipyard') {
    return brandName === 'HAMANN' ? pricing.shipyard_surcharge_hamann : pricing.shipyard_surcharge_dvz;
  }
  return brandName === 'HAMANN' ? pricing.shipowner_surcharge_hamann : pricing.shipowner_surcharge_dvz;
}

export function getCostPercentage(brandName, pricing) {
  return brandName === 'HAMANN' ? (pricing.hamann_cost_pct || 0.8) : (pricing.dvz_cost_pct || 0.9);
}

export function getLocationIncrease(locationName, pricing) {
  if (locationName === 'MEDITERRANEAN') return pricing.mediterranean_labour_increase || 0.1;
  if (locationName === 'OVERSEAS') return pricing.overseas_labour_increase || 0.15;
  return 0;
}

export function calcPartSalePrice(listPrice, quantity, clientType, brandName, pricing) {
  const surcharge = getSurcharge(clientType, brandName, pricing);
  return quantity * listPrice * (1 + surcharge);
}

export function calcPartCostPrice(listPrice, quantity, brandName, pricing) {
  const costPct = getCostPercentage(brandName, pricing);
  return quantity * listPrice * costPct;
}

export function calcLabourRate(type, locationName, pricing) {
  const baseRate = type === 'junior' ? pricing.junior_rate : pricing.senior_rate;
  const increase = getLocationIncrease(locationName, pricing);
  return baseRate * (1 + increase);
}

export function calcWorkshopRate(pricing) {
  // Workshop usa travel_hour_rate come base
  return pricing.travel_hour_rate || 102.5;
}

export function calcTravelSaleTotal(travel, pricing, locationName) {
  const isAbroad = locationName !== 'ITALY';
  const dailyRate = isAbroad ? pricing.daily_allowance_abroad : pricing.daily_allowance_italy;
  const halfRate = isAbroad ? pricing.daily_allowance_half_abroad : pricing.daily_allowance_half_italy;

  return (travel.km || 0) * pricing.cost_per_km +
    (travel.travel_hours || 0) * pricing.travel_hour_rate +
    (travel.highway || 0) * (1 + pricing.highway_surcharge) +
    (travel.daily_allowance || 0) * dailyRate +
    (travel.daily_allowance_half || 0) * halfRate +
    (travel.rental_car || 0) + (travel.flights || 0) +
    (travel.taxi || 0) + (travel.parking || 0) + (travel.other || 0);
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(value || 0);
}
