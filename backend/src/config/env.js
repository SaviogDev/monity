const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'];

export default function validateEnv() {
  const missingVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Variáveis de ambiente ausentes: ${missingVars.join(', ')}`
    );
  }
}