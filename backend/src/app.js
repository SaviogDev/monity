import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import financialRoutes from './routes/financialRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import financingRoutes from './routes/financingRoutes.js';
import goalRoutes from './routes/goalRoutes.js';

// --- NOVAS IMPORTAÇÕES ---
import transactionRoutes from './routes/transactionRoutes.js';
import importRoutes from './routes/importRoutes.js';

import notFound from './middlewares/notFound.js';
import errorHandler from './middlewares/errorHandler.js';
import { startCronJobs } from './cron/index.js'; 

const app = express();

app.use(cors());
app.use(express.json());

// --- REGISTRO DE ROTAS ---
app.use('/api', routes);
app.use('/api/financial', financialRoutes);
app.use('/api/invoices', invoiceRoutes);    
app.use('/api/alerts', alertRoutes);
app.use('/api/financings', financingRoutes);
app.use('/api/goals', goalRoutes);

// --- NOVAS ROTAS ---
app.use('/api/transactions', transactionRoutes);
app.use('/api/import', importRoutes);

startCronJobs();

// Os middlewares de erro devem sempre ser os últimos! (Já estava certinho)
app.use(notFound);
app.use(errorHandler);

export default app;