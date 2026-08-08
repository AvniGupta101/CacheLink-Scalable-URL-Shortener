const express = require('express');
const { nanoid } = require('nanoid');
const validator = require('validator');
const Url = require('../models/Url');
const { shortenLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');

const router = express.Router();

router.post('/shorten', shortenLimiter, async (req, res) => {
  try {
    const { longUrl } = req.body;

    if (!longUrl || typeof longUrl !== 'string') {
      return res.status(400).json({ error: 'longUrl is required and must be a string' });
    }
    if (!validator.isURL(longUrl, { require_protocol: true, protocols: ['http', 'https'] })) {
      return res.status(400).json({ error: 'Invalid URL format — must include http:// or https://' });
}

    if (longUrl.length > 2048) {
      return res.status(400).json({ error: 'URL exceeds maximum length of 2048 characters' });
    }

    const shortCode = nanoid(7);
    const newUrl = new Url({ longUrl, shortCode });
    await newUrl.save();

    const shortUrl = `${req.protocol}://${req.get('host')}/${shortCode}`;
    logger.info(`Short URL created: ${shortCode}`);

    res.status(201).json({ shortCode, shortUrl, longUrl });
  } catch (err) {
    logger.error(`Error creating short URL: ${err.message}`);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;