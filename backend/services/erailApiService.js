/**
 * Erail.in API Service
 * Free web scraper for Indian Railways data
 * No subscription required, no authentication issues
 */

const Prettify = require("../utils/prettify.js");
const cheerio = require("cheerio");

const prettify = new Prettify();

// User agents for rotating requests
const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
];

/**
 * Get random user agent
 */
function getRandomUserAgent() {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

/**
 * Fetch train details by train number
 * GET /getTrain?trainNo=12345
 */
async function getTrainDetails(trainNo) {
  try {
    if (!trainNo) {
      throw new Error("Train number is required");
    }

    const URL_Train = `https://erail.in/rail/getTrains.aspx?TrainNo=${trainNo}&DataSource=0&Language=0&Cache=true`;
    
    console.log(`📡 Fetching train details: ${trainNo}`);
    const response = await fetch(URL_Train, {
      method: "GET",
      headers: {
        "User-Agent": getRandomUserAgent()
      },
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.text();
    const json = prettify.CheckTrain(data);
    
    console.log(`✅ Train details fetched: ${trainNo}`);
    return json;
  } catch (error) {
    console.error(`❌ Error fetching train details: ${error.message}`);
    return {
      success: false,
      time_stamp: Date.now(),
      data: error.message
    };
  }
}

/**
 * Search trains between two stations
 * GET /betweenStations?from=DELHI&to=MUMBAI
 */
async function searchTrainsBetweenStations(from, to) {
  try {
    if (!from || !to) {
      throw new Error("Both 'from' and 'to' stations are required");
    }

    const URL_Trains = `https://erail.in/rail/getTrains.aspx?Station_From=${from}&Station_To=${to}&DataSource=0&Language=0&Cache=true`;
    
    console.log(`📡 Searching trains: ${from} → ${to}`);
    const response = await fetch(URL_Trains, {
      method: "GET",
      headers: {
        "User-Agent": getRandomUserAgent()
      },
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.text();
    const json = prettify.BetweenStation(data);
    
    if (json.success) {
      console.log(`✅ Found ${json.data.length} trains: ${from} → ${to}`);
    } else {
      console.log(`⚠️ Search failed: ${json.data}`);
    }
    
    return json;
  } catch (error) {
    console.error(`❌ Error searching trains: ${error.message}`);
    return {
      success: false,
      time_stamp: Date.now(),
      data: error.message
    };
  }
}

/**
 * Search trains on specific date
 * GET /getTrainOn?from=DELHI&to=MUMBAI&date=DD-MM-YYYY
 */
async function searchTrainsOnDate(from, to, date) {
  try {
    if (!from || !to || !date) {
      throw new Error("from, to, and date are required (date format: DD-MM-YYYY)");
    }

    // Fetch all trains between stations
    const trainsData = await searchTrainsBetweenStations(from, to);
    
    if (!trainsData.success) {
      return trainsData;
    }

    // Filter by running day
    const arr = [];
    const DD = date.split("-")[0];
    const MM = date.split("-")[1];
    const YYYY = date.split("-")[2];
    const day = prettify.getDayOnDate(DD, MM, YYYY);

    trainsData.data.forEach((ele) => {
      if (ele.train_base.running_days && ele.train_base.running_days[day] == 1) {
        arr.push(ele);
      }
    });

    console.log(`✅ Found ${arr.length} trains running on ${date}`);

    return {
      success: true,
      time_stamp: Date.now(),
      data: arr
    };
  } catch (error) {
    console.error(`❌ Error searching trains on date: ${error.message}`);
    return {
      success: false,
      time_stamp: Date.now(),
      data: error.message
    };
  }
}

/**
 * Get train route/stops
 * GET /getRoute?trainNo=12345
 */
async function getTrainRoute(trainNo) {
  try {
    if (!trainNo) {
      throw new Error("Train number is required");
    }

    // First get train details to get train_id
    let trainData = await getTrainDetails(trainNo);
    
    if (!trainData.success) {
      return trainData;
    }

    const trainId = trainData.data.train_id;
    const URL_Route = `https://erail.in/data.aspx?Action=TRAINROUTE&Password=2012&Data1=${trainId}&Data2=0&Cache=true`;
    
    console.log(`📡 Fetching train route: ${trainNo}`);
    const response = await fetch(URL_Route, {
      method: "GET",
      headers: {
        "User-Agent": getRandomUserAgent()
      },
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.text();
    const json = prettify.GetRoute(data);
    
    console.log(`✅ Train route fetched: ${trainNo} (${json.data.length} stops)`);
    return json;
  } catch (error) {
    console.error(`❌ Error fetching train route: ${error.message}`);
    return {
      success: false,
      time_stamp: Date.now(),
      data: error.message
    };
  }
}

/**
 * Get live station board
 * GET /stationLive?code=DELHI
 */
async function getStationLive(code) {
  try {
    if (!code) {
      throw new Error("Station code is required");
    }

    const URL_Station = `https://erail.in/station-live/${code}?DataSource=0&Language=0&Cache=true`;
    
    console.log(`📡 Fetching live station data: ${code}`);
    const response = await fetch(URL_Station, {
      method: "GET",
      headers: {
        "User-Agent": getRandomUserAgent()
      },
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.text();
    const $ = cheerio.load(data);
    const json = prettify.LiveStation($);
    
    console.log(`✅ Live station data fetched: ${code} (${json.data.length} trains)`);
    return json;
  } catch (error) {
    console.error(`❌ Error fetching live station data: ${error.message}`);
    return {
      success: false,
      time_stamp: Date.now(),
      data: error.message
    };
  }
}

/**
 * Get PNR status
 * GET /pnrstatus?pnr=1234567890
 */
async function getPNRStatus(pnr) {
  try {
    if (!pnr) {
      throw new Error("PNR number is required");
    }

    const URL_PNR = `https://www.confirmtkt.com/pnr-status/${pnr}`;
    
    console.log(`📡 Fetching PNR status: ${pnr}`);
    const response = await fetch(URL_PNR, {
      method: "GET",
      headers: {
        "User-Agent": getRandomUserAgent()
      },
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.text();
    const json = prettify.PnrStatus(data);
    
    console.log(`✅ PNR status fetched: ${pnr}`);
    return json;
  } catch (error) {
    console.error(`❌ Error fetching PNR status: ${error.message}`);
    return {
      success: false,
      time_stamp: Date.now(),
      data: error.message
    };
  }
}

module.exports = {
  getTrainDetails,
  searchTrainsBetweenStations,
  searchTrainsOnDate,
  getTrainRoute,
  getStationLive,
  getPNRStatus
};
