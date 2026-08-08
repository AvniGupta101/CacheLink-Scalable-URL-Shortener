require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { redisClient, connectRedis } = require('./config/redis');
const shortenRoutes = require('./routes/shorten');
const redirectRoutes = require('./routes/redirect');
const logger = require('./utils/logger');

const app = express();

connectDB();
connectRedis();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api', shortenRoutes);
app.use('/', redirectRoutes);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    await mongoose.connection.close();
    await redisClient.quit();
    logger.info('All connections closed. Exiting.');
    process.exit(0);
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));