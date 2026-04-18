// backend/routes/train.js
const express = require("express");
const mongoose = require('mongoose');
const Train = require("../models/Train");
const erailApi = require("../services/erailApiService.js");
const pricingCalculator = require("../utils/pricingCalculator.js");
const stationDistance = require("../utils/stationDistance.js");
const router = express.Router();

/**
 * Helper function: Enrich train data with dynamic pricing
 */
function enrichTrainWithPricing(train, fromStation, toStation) {
  // Get distance between stations
  const distance = stationDistance.getDistance(fromStation, toStation) || 500; // Default 500 km if not found
  
  // Calculate prices for all classes
  const pricesForClasses = pricingCalculator.getPricesForAllClasses(distance);
  
  return {
    ...train,
    distance: distance,
    pricing: {
      sleeper: pricesForClasses["Sleeper"] || 0,
      ac3tier: pricesForClasses["AC 3-Tier"] || 0,
      ac2tier: pricesForClasses["AC 2-Tier"] || 0,
      ac1tier: pricesForClasses["AC 1-Tier"] || 0,
      firstClass: pricesForClasses["First Class"] || 0,
      allClasses: pricesForClasses
    }
  };
}

/**
 * 🟢 Add new train
 */
router.post("/", async (req, res) => {
  try {
    const train = new Train(req.body);
    await train.save();
    res.status(201).json({ message: "Train added successfully", train });
  } catch (err) {
    console.error("❌ Error adding train:", err);
    res.status(400).json({ message: "Error adding train", error: err.message });
  }
});

/**
 * 🟢 Get all trains
 */
router.get("/", async (req, res) => {
  try {
    const trains = await Train.find().sort({ date: 1 });
    res.json(trains);
  } catch (err) {
    console.error("❌ Error fetching trains:", err);
    res.status(500).json({ message: "Error fetching trains", error: err.message });
  }
});

/**
 * 🟢 Search trains by 'from', 'to', and 'date' (Database only)
 * This is used in BookingForm.jsx → handleSearch()
 */
router.get("/search", async (req, res) => {
  const { from, to, date } = req.query;
  console.log("Search query params:", { from, to, date });
  try {
    if (!from || !to || !date) {
      return res.status(400).json({ message: "Missing required query parameters" });
    }

    const startDate = new Date(`${date}T00:00:00.000Z`);
    const endDate = new Date(`${date}T23:59:59.999Z`);

    const adjustedStartDate = new Date(startDate.getTime() + startDate.getTimezoneOffset() * 60 * 1000);
    const adjustedEndDate = new Date(endDate.getTime() + endDate.getTimezoneOffset() * 60 * 1000);

    const trains = await Train.find({
      from,
      to,
      date: { $gte: adjustedStartDate, $lte: adjustedEndDate }
    });

    res.json(trains);
  } catch (err) {
    console.error("Error searching trains:", err);
    res.status(500).json({ message: "Error searching trains", error: err.message });
  }
});

/**
 * 🟣 Search live trains by from/to/date (Erail.in scraper)
 * Example: GET /api/trains/live-search?from=Delhi&to=Mumbai&date=03-01-2026
 * Falls back to DB search if erail.in fails
 * Returns enriched data with dynamic pricing based on distance
 */
router.get("/live-search", async (req, res) => {
  let { from, to, date } = req.query;

  if (!from || !to || !date) {
    return res.status(400).json({ message: "from, to, and date query parameters required" });
  }

  try {
    console.log(`🔍 Live train search: ${from} → ${to} on ${date}`);
    
    // Try to convert station names to codes if needed
    const stationCodes = require("../utils/stationCodes.js");
    const fromCode = stationCodes.getStationCode(from) || from; // Use code if found, else use original
    const toCode = stationCodes.getStationCode(to) || to;
    
    console.log(`📝 Converted: ${from} → ${fromCode}, ${to} → ${toCode}`);
    
    // Try erail.in API first
    let liveData = await erailApi.searchTrainsOnDate(fromCode, toCode, date);
    
    if (liveData.success && liveData.data && liveData.data.length > 0) {
      console.log(`✅ Found ${liveData.data.length} trains from erail.in API`);
      // Enrich with pricing
      const enrichedData = liveData.data.map(train => enrichTrainWithPricing(train, from, to));
      return res.json(enrichedData);
    }
    
    // If erail returns no results or fails, fall back to database
    console.log(`📦 Erail API returned no results, falling back to database...`);
    
    const dbResults = await Train.find({
      from: { $regex: from, $options: 'i' },
      to: { $regex: to, $options: 'i' },
      date: {
        $gte: new Date(`${date}T00:00:00.000Z`),
        $lte: new Date(`${date}T23:59:59.999Z`)
      }
    });
    
    console.log(`✅ Fallback: Found ${dbResults.length} trains in database`);
    
    // Enrich with pricing
    const enrichedResults = dbResults.map(train => {
      const trainObj = train.toObject ? train.toObject() : train;
      return enrichTrainWithPricing(trainObj, from, to);
    });
    
    return res.json(enrichedResults);
    
  } catch (err) {
    console.error("❌ Search error:", err.message);
    res.status(500).json({ message: "Error searching trains", error: err.message });
  }
});

/**
 * � Calculate ticket price for a route and travel class
 * Example: GET /api/trains/calculate-price?from=Delhi&to=Mumbai&travelClass=Sleeper
 */
router.get("/calculate-price", (req, res) => {
  const { from, to, travelClass } = req.query;
  
  if (!from || !to) {
    return res.status(400).json({ message: "from and to parameters are required" });
  }
  
  try {
    const distance = stationDistance.getDistance(from, to);
    
    if (!distance || distance <= 0) {
      return res.status(404).json({ 
        message: "Route not found in distance database",
        suggestion: "Please check station names and try again"
      });
    }
    
    const priceBreakdown = pricingCalculator.getPriceBreakdown(distance, travelClass || "Sleeper");
    const pricesForAllClasses = pricingCalculator.getPricesForAllClasses(distance);
    
    res.json({
      from,
      to,
      distance,
      travelClass: travelClass || "Sleeper",
      priceBreakdown,
      allClassPrices: pricesForAllClasses
    });
  } catch (err) {
    console.error("❌ Price calculation error:", err);
    res.status(500).json({ message: "Error calculating price", error: err.message });
  }
});

/**
 * 🟢 Get price range for a route
 * Example: GET /api/trains/price-range?from=Delhi&to=Mumbai
 */
router.get("/price-range", (req, res) => {
  const { from, to } = req.query;
  
  if (!from || !to) {
    return res.status(400).json({ message: "from and to parameters are required" });
  }
  
  try {
    const distance = stationDistance.getDistance(from, to);
    
    if (!distance || distance <= 0) {
      return res.status(404).json({ 
        message: "Route not found in distance database"
      });
    }
    
    const allClasses = pricingCalculator.getPricesForAllClasses(distance);
    const prices = Object.values(allClasses).sort((a, b) => a - b);
    
    res.json({
      from,
      to,
      distance,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      pricesPerClass: allClasses
    });
  } catch (err) {
    console.error("❌ Price range error:", err);
    res.status(500).json({ message: "Error calculating price range", error: err.message });
  }
});
router.get("/live/:trainNumber", async (req, res) => {
  const { trainNumber } = req.params;
  try {
    const data = await erailApi.getTrainDetails(trainNumber);
    res.json(data);
  } catch (err) {
    console.error("❌ Error fetching live train data:", err);
    res.status(500).json({ message: "Error fetching live train data", error: err.message });
  }
});

/**
 * � Get extended train details by train number
 * Example: GET /api/trains/details/12632
 */
router.get("/details/:trainNumber", async (req, res) => {
  try {
    const { trainNumber } = req.params;
    if (!trainNumber) {
      return res.status(400).json({ message: 'Train number is required' });
    }
    console.log(`📡 Fetching extended details for train: ${trainNumber}`);
    const [detailsResult, routeResult] = await Promise.all([
      erailApi.getTrainDetails(trainNumber),
      erailApi.getTrainRoute(trainNumber)
    ]);
    const response = {
      success: detailsResult.success && routeResult.success,
      details: detailsResult.data || {},
      route: routeResult.data || [],
      timestamp: Date.now()
    };
    res.json(response);
  } catch (err) {
    console.error("❌ Error fetching train details:", err);
    res.status(500).json({ message: "Error fetching train details", error: err.message });
  }
});

/**
 * �🟢 Get train by ID
 */
router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid train id' });
    }
    const train = await Train.findById(id);
    if (!train) {
      return res.status(404).json({ message: "Train not found" });
    }
    res.json(train);
  } catch (err) {
    console.error("❌ Error fetching train by ID:", err);
    res.status(500).json({ message: "Error fetching train", error: err.message });
  }
});

/**
 * 🟡 Update train by ID
 */
router.put("/:id", async (req, res) => {
  try {
    const updatedTrain = await Train.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedTrain) {
      return res.status(404).json({ message: "Train not found" });
    }
    res.json({ message: "Train updated successfully", train: updatedTrain });
  } catch (err) {
    console.error("❌ Error updating train:", err);
    res.status(400).json({ message: "Error updating train", error: err.message });
  }
});

/**
 * 🔴 Delete train by ID
 */
router.delete("/:id", async (req, res) => {
  try {
    const deletedTrain = await Train.findByIdAndDelete(req.params.id);
    if (!deletedTrain) {
      return res.status(404).json({ message: "Train not found" });
    }
    res.json({ message: "Train deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting train:", err);
    res.status(400).json({ message: "Error deleting train", error: err.message });
  }
});

module.exports = router;
