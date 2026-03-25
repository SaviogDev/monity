import express from 'express';
import cors from 'cors';

import routes from './routes/index.js';
import notFound from './middlewares/notFound.js';
import errorHandler from './middlewares/errorHandler.js';

const app = express();

// ─── Middlewares globais ─────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Rotas ───────────────────────────────────────────────────────────────────

app.use('/api', routes);

// ─── Tratamento de erros (deve ser o último) ──────────────────────────────────

app.use(notFound);
app.use(errorHandler);

export default app;
