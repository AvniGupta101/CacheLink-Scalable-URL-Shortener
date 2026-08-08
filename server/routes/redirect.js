const express = require('express');
const Url = require('../models/Url');
const { redisClient } = require('../config/redis');

const router = express.Router();

const CACHE_TTL_SECONDS = 60 * 60 * 24; // 24 hours

router.get('/:shortCode', async (req, res) => {
  const { shortCode } = req.params;

  try {
    // 1. Check Redis first
    const cachedUrl = await redisClient.get(`shortUrl:${shortCode}`);

    if (cachedUrl) {
      // cache HIT — skip MongoDB entirely
      console.log('CACHE HIT');
      Url.updateOne({ shortCode }, { $inc: { clicks: 1 } }).catch((err) =>
        console.error('Click increment failed:', err.message)
      );
      return res.redirect(302, cachedUrl);
    }
    console.log('CACHE MISS');
    // 2. Cache MISS — fall back to MongoDB
    const urlDoc = await Url.findOne({ shortCode });

    if (!urlDoc) {
      return res.status(404).json({ error: 'Short URL not found' });
    }

    // 3. Populate cache for next time (write-back)
    await redisClient.setEx(`shortUrl:${shortCode}`, CACHE_TTL_SECONDS, urlDoc.longUrl);
    Url.updateOne({ shortCode }, { $inc: { clicks: 1 } }).catch((err) =>
      console.error('Click increment failed:', err.message)
    );
    return res.redirect(302, urlDoc.longUrl);
  } catch (err) {
    console.error('Redirect error:', err.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;