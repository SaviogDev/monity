import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import financialRoutes from './routes/financialRoutes.js';
import notFound from './middlewares/notFound.js';
import errorHandler from './middlewares/errorHandler.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import alertRoutes from './routes/alertRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', routes);
app.use('/api/financial', financialRoutes);
app.use('/api/invoices', invoiceRoutes);    
app.use('/api/alerts', alertRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;