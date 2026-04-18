const axios = require('axios');

const BASE_URL = process.env.RAILWAYS_API_BASE || 'https://indian-railways-data-api.p.rapidapi.com/api/v1';
const API_KEY = process.env.RAPIDAPI_KEY || '';
const API_HOST = process.env.RAPIDAPI_HOST || 'indian-railways-data-api.p.rapidapi.com';

async function request(path, params = {}) {
  const url = `${BASE_URL}${path}`;
  console.log(`🔗 API Request: ${path}`);
  try {
    const resp = await axios.get(url, {
      params,
      headers: {
        'x-rapidapi-host': API_HOST,
        'x-rapidapi-key': API_KEY,
        'User-Agent': 'Railway-Booking-App/1.0'
      },
      timeout: 10000
    });
    console.log(`✅ API Response received from: ${path}`);
    return resp.data;
  } catch (err) {
    const message = err.response ? `${err.response.status} ${err.response.statusText}` : err.message;
    const error = new Error(`Railways API request failed: ${message}`);
    error.cause = err;
    throw error;
  }
}

/**
 * Get train schedule by train number
 * Endpoint: GET /trains/{trainNumber}/schedule
 */
async function getTrainSchedule(trainNumber) {
  if (!trainNumber) throw new Error('trainNumber required');
  return request(`/trains/${encodeURIComponent(trainNumber)}/schedule`);
}

/**
 * Search trains between two stations
 * Endpoint: GET /trains/search
 * Parameters: from (station code/name), to (station code/name), date (optional)
 */
async function searchTrains(from, to, date) {
  if (!from || !to) {
    throw new Error('from and to are required');
  }
  
  const params = {
    from: from.trim(),
    to: to.trim()
  };

  // Add date if provided
  if (date) {
    let dateStr = date;
    if (date instanceof Date) {
      dateStr = date.toISOString().split('T')[0];
    }
    params.date = dateStr;
  }
  
  return request('/trains/search', params);
}

/**
 * Search trains between two stations (alternative endpoint)
 * Endpoint: GET /trainsBetweenStations
 */
async function getTrainsBetweenStations(from, to, date) {
  if (!from || !to) {
    throw new Error('from and to are required');
  }
  
  const params = {
    from: from.trim(),
    to: to.trim()
  };

  if (date) {
    let dateStr = date;
    if (date instanceof Date) {
      dateStr = date.toISOString().split('T')[0];
    }
    params.date = dateStr;
  }
  
  return request('/trainsBetweenStations', params);
}

/**
 * Get train data by train number
 * Endpoint: GET /trains/{trainNumber}
 */
async function getTrainData(trainNumber) {
  if (!trainNumber) throw new Error('trainNumber required');
  return request(`/trains/${encodeURIComponent(trainNumber)}`);
}

/**
 * Get list of all trains
 * Endpoint: GET /trains
 */
async function getTrainList(params = {}) {
  return request('/trains', params);
}

/**
 * Search trains by station codes/names
 * Endpoint: GET /searchTrains
 */
async function advancedSearch(from, to, date) {
  if (!from || !to) {
    throw new Error('from and to are required');
  }
  
  const params = {
    from: from.trim(),
    to: to.trim()
  };

  if (date) {
    let dateStr = date;
    if (date instanceof Date) {
      dateStr = date.toISOString().split('T')[0];
    }
    params.date = dateStr;
  }
  
  return request('/searchTrains', params);
}

module.exports = {
  getTrainSchedule,
  searchTrains,
  getTrainsBetweenStations,
  getTrainData,
  getTrainList,
  advancedSearch,
  request
};
