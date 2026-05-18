const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const isOperationalError = statusCode >= 400 && statusCode < 500;
  const message = isOperationalError
    ? err.message || 'Requisicao invalida'
    : 'Erro interno do servidor';

  console.error(`[Error] ${err.message}`, err.stack || '');

  res.status(statusCode).json({
    success: false,
    message,
  });
};

export default errorHandler;
