const requiredEnvVars = ['MONGO_URI'];

const validateEnv = () => {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `❌ Variáveis de ambiente obrigatórias não definidas: ${missing.join(', ')}\n` +
        `   Verifique o arquivo .env baseado no .env.example`
    );
  }
};

export default validateEnv;
