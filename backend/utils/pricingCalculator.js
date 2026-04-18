/**
 * Dynamic Ticket Pricing Calculator
 * Calculates ticket prices based on distance between stations
 * Uses a tiered pricing model that scales with distance
 */

/**
 * Base prices per class (for 0-100 km)
 */
const basePrices = {
  "Sleeper": 400,
  "AC 3-Tier": 600,
  "AC 2-Tier": 1000,
  "AC 1-Tier": 1500,
  "First Class": 2000,
};

/**
 * Price multiplier per 100 km
 * This increases as distance increases (non-linear pricing)
 */
function getDistanceMultiplier(distance) {
  if (distance <= 0) return 0;
  if (distance <= 100) return 1.0;
  if (distance <= 200) return 1.2;
  if (distance <= 300) return 1.4;
  if (distance <= 400) return 1.6;
  if (distance <= 500) return 1.8;
  if (distance <= 750) return 2.0;
  if (distance <= 1000) return 2.2;
  if (distance <= 1500) return 2.4;
  if (distance <= 2000) return 2.6;
  return 2.8; // Maximum multiplier for very long distances
}

/**
 * Calculate price for a single passenger ticket
 * @param {number} distance - Distance in kilometers
 * @param {string} travelClass - Passenger travel class (e.g., 'Sleeper', 'AC 2-Tier')
 * @returns {number} - Calculated fare in INR
 */
function calculateTicketPrice(distance, travelClass) {
  if (!distance || distance <= 0) {
    return basePrices[travelClass] || basePrices["Sleeper"];
  }

  const basePrice = basePrices[travelClass] || basePrices["Sleeper"];
  const multiplier = getDistanceMultiplier(distance);
  
  // Calculate fare with dynamic pricing
  const fare = Math.round(basePrice * multiplier);

  // Add convenience charge (fixed)
  const convenienceCharge = 23.60;
  
  return fare + convenienceCharge;
}

/**
 * Calculate total cost for all passengers
 * @param {number} distance - Distance in kilometers
 * @param {Array} passengers - Array of passenger objects with travelClass property
 * @returns {number} - Total cost in INR
 */
function calculateTotalCost(distance, passengers) {
  if (!passengers || passengers.length === 0) {
    return 0;
  }

  return passengers.reduce((total, passenger) => {
    const ticketPrice = calculateTicketPrice(distance, passenger.travelClass);
    return total + ticketPrice;
  }, 0);
}

/**
 * Get price breakdown for a single passenger
 * Useful for showing detailed pricing to users
 * @param {number} distance - Distance in kilometers
 * @param {string} travelClass - Passenger travel class
 * @returns {object} - Breakdown of fare components
 */
function getPriceBreakdown(distance, travelClass) {
  const basePrice = basePrices[travelClass] || basePrices["Sleeper"];
  const multiplier = getDistanceMultiplier(distance);
  const baseFare = Math.round(basePrice * multiplier);
  const convenienceCharge = 23.60;
  const totalFare = baseFare + convenienceCharge;

  return {
    baseFare,
    convenienceCharge,
    totalFare,
    distance,
    travelClass,
    multiplier: multiplier.toFixed(2)
  };
}

/**
 * Estimate price for a range of distances
 * Useful for UI previews
 * @param {number} minDistance - Minimum distance in km
 * @param {number} maxDistance - Maximum distance in km
 * @param {string} travelClass - Travel class
 * @returns {object} - Min and max prices
 */
function getPriceRange(minDistance, maxDistance, travelClass) {
  const minPrice = calculateTicketPrice(minDistance, travelClass);
  const maxPrice = calculateTicketPrice(maxDistance, travelClass);
  
  return {
    minPrice,
    maxPrice,
    travelClass,
    distanceRange: `${minDistance}-${maxDistance} km`
  };
}

/**
 * Get all available classes and their prices for a given distance
 * @param {number} distance - Distance in kilometers
 * @returns {object} - Price for each available class
 */
function getPricesForAllClasses(distance) {
  const pricesByClass = {};
  
  Object.keys(basePrices).forEach(travelClass => {
    pricesByClass[travelClass] = calculateTicketPrice(distance, travelClass);
  });
  
  return pricesByClass;
}

module.exports = {
  calculateTicketPrice,
  calculateTotalCost,
  getPriceBreakdown,
  getPriceRange,
  getPricesForAllClasses,
  basePrices,
  getDistanceMultiplier
};
