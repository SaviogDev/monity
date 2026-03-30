import 'dotenv/config';
import app from './app.js';
import connectDB from './config/database.js';
import validateEnv from './config/env.js';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  validateEnv();

  await connectDB();

  app.listen(PORT, () => {
    console.log(`\n🚀 Monity API rodando`);
    console.log(`   Ambiente : ${process.env.NODE_ENV}`);
    console.log(`   Porta    : ${PORT}`);
    console.log(`   Health   : http://localhost:${PORT}/api/health\n`);
  });
};

startServer();