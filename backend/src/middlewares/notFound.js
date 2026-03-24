 /**
 * Middleware para capturar rotas não encontradas (404).
 */
const notFound = (req, res, next) => {
  const error = new Error(`Rota não encontrada: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

export default notFound;
