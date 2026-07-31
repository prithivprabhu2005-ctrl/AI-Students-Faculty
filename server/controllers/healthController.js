const mongoose = require('mongoose');

exports.getHealth = async (req, res) => {
  try {
    const memory = process.memoryUsage();
    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? 'CONNECTED' : dbState === 2 ? 'CONNECTING' : 'DISCONNECTED';

    res.json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(process.uptime())}s`,
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: dbStatus,
        name: mongoose.connection.name || 'edubot_db'
      },
      memoryUsage: {
        rss: `${(memory.rss / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB`
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'DOWN', message: error.message });
  }
};
