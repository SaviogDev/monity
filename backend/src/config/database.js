import mongoose from 'mongoose';

export default async function connectDB() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error('MONGO_URI não definida no arquivo .env');
  }

  try {
    await mongoose.connect(mongoUri);

    console.log('✅ MongoDB conectado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao conectar no MongoDB:', error.message);
    throw error;
  }
}