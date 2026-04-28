/**
 * Motore di calcolo prezzi - replica la logica dell'Excel Navaltecnica
 */

function getSurcharge(clientType, brand, pricing) {
  if (clientType === 'shipyard') {
    return brand === 'HAMANN' ? pricing.shipyard_surcharge_hamann : pricing.shipyard_surcharge_dvz;
  }
  return brand === 'HAMANN' ? pricing.shipowner_surcharge_hamann : pricing.shipowner_surcharge_dvz;
}

function getCostPercentage(brand, pricing) {
  return brand === 'HAMANN' ? (pricing.hamann_cost_pct || 0.8) : (pricing.dvz_cost_pct || 0.9);
}

function getLocationIncrease(locationName, pricing) {
  if (locationName === 'MEDITERRANEAN') return pricing.mediterranean_labour_increase || 0.1;
  if (locationName === 'OVERSEAS') return pricing.overseas_labour_increase || 0.15;
  return 0;
}

function calcPartSalePrice(listPrice, quantity, clientType, brand, pricing) {
  const surcharge = getSurcharge(clientType, brand, pricing);
  return quantity * listPrice * (1 + surcharge);
}

function calcPartCostPrice(listPrice, quantity, brand, pricing) {
  const costPct = getCostPercentage(brand, pricing);
  return quantity * listPrice * costPct;
}

function calcLabourRate(type, locationName, pricing) {
  const baseRate = type === 'junior' ? pricing.junior_rate : pricing.senior_rate;
  const increase = getLocationIncrease(locationName, pricing);
  return baseRate * (1 + increase);
}

function calcTravelSale(travel, pricing, locationName) {
  const isAbroad = locationName !== 'ITALY';
  const dailyRate = isAbroad ? pricing.daily_allowance_abroad : pricing.daily_allowance_italy;
  const halfRate = isAbroad ? pricing.daily_allowance_half_abroad : pricing.daily_allowance_half_italy;
  const extrasMarkup = pricing.various_services_increase || 1.1;

  return {
    km: (travel.km || 0) * pricing.cost_per_km,
    hours: (travel.travel_hours || 0) * pricing.travel_hour_rate,
    highway: (travel.highway || 0) * (1 + pricing.highway_surcharge),
    allowance: (travel.daily_allowance || 0) * dailyRate + (travel.daily_allowance_half || 0) * halfRate,
    extras: ((travel.rental_car || 0) + (travel.flights || 0) + (travel.taxi || 0) +
             (travel.parking || 0) + (travel.other || 0)) * extrasMarkup
  };
}

function calcTravelCost(travel, pricing) {
  const kmCost = (travel.km || 0) * pricing.fuel_cost_per_liter / pricing.km_per_liter;
  const hoursCost = (travel.travel_hours || 0) * pricing.travel_hour_cost;
  const highwayCost = (travel.highway || 0) * pricing.highway_surcharge;
  const allowanceCost = (travel.daily_allowance || 0) * pricing.allowance_cost +
                        (travel.daily_allowance_half || 0) * pricing.half_allowance_cost;
  const extras = (travel.rental_car || 0) + (travel.flights || 0) + (travel.taxi || 0) +
                 (travel.parking || 0) + (travel.other || 0);
  return kmCost + hoursCost + highwayCost + allowanceCost + extras;
}

module.exports = {
  getSurcharge,
  getCostPercentage,
  getLocationIncrease,
  calcPartSalePrice,
  calcPartCostPrice,
  calcLabourRate,
  calcTravelSale,
  calcTravelCost
};
