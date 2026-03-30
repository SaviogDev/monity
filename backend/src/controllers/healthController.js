import mongoose from 'mongoose';

/**
 * GET /api/health
 * Verifica se o servidor e a conexão com o banco estão operacionais.
 */
export const healthCheck = (req, res) => {
  const dbStatus = mongoose.connection.readyState;

  // readyState: 0 = desconectado, 1 = conectado, 2 = conectando, 3 = desconectando
  const dbStatusMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

  res.status(200).json({
    success: true,
    message: 'Monity API está no ar 🚀',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatusMap[dbStatus] ?? 'unknown',
    },
  });
};