const express = require('express');
const router = express.Router();
const stationUtil = require('../utils/stationCodes');

/**
 * GET /api/stations/search?query=...  - returns matching stations (name + code)
 */
router.get('/search', (req, res) => {
  try {
    const q = (req.query.query || req.query.q || '').toLowerCase().trim();
    if (!q) return res.json([]);

    const all = stationUtil.getAllStations(); // [{name,code}, ...]

    // score: startsWith -> high, includes -> medium, code match -> high
    const matches = all
      .map(s => ({
        name: s.name,
        code: s.code,
        score: s.name.toLowerCase().startsWith(q) ? 2 : (s.name.toLowerCase().includes(q) ? 1 : 0)
      }))
      .filter(s => s.score > 0 || s.code.toLowerCase().startsWith(q) || s.code.toLowerCase() === q)
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .slice(0, 20)
      .map(({ name, code }) => ({ name, code }));

    return res.json(matches);
  } catch (err) {
    console.error('Stations search error:', err);
    res.status(500).json({ message: 'Error searching stations', error: err.message });
  }
});

module.exports = router;
