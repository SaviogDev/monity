/**
 * Middleware de tratamento de erros centralizado.
 * Deve ser registrado por último no app.js.
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  console.error(`[Error] ${err.message}`, isProduction ? '' : err.stack);

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Erro interno do servidor',
    ...(isProduction ? {} : { stack: err.stack }),
  });
};

export default errorHandler;
