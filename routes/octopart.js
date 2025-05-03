const express = require('express');
const router = express.Router();
const { searchPart } = require('../services/nexarApi');

router.get('/search', async (req, res) => {
  const mpn = req.query.part;
  if (!mpn) return res.status(400).json({ error: 'Missing part parameter' });

  try {
    const data = await searchPart(mpn);
    res.json(data);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Nexar API failed' });
  }
});

module.exports = router;
