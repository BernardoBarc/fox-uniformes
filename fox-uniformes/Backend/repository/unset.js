import mongoose from 'mongoose';

const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/fox-uniformes';

async function run() {
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
  const coll = mongoose.connection.collection('pagamentos');

  try {
    console.log('Conectado ao Mongo, listando índices atuais...');
    console.log(await coll.indexes());

    // 1) Remover campo externalId null (não apaga documentos)
    try {
      const res = await coll.updateMany({ externalId: null }, { $unset: { externalId: "" } });
      console.log(`updateMany externalId null -> $unset: matched=${res.matchedCount}, modified=${res.modifiedCount}`);
    } catch (e) {
      console.warn('Falha ao remover externalId nulo:', e.message || e);
    }

    // 2) Tentar dropar índice (ignora erro se não existir)
    try {
      await coll.dropIndex('externalId_1');
      console.log('Índice externalId_1 dropado');
    } catch (e) {
      console.warn('Não foi possível dropar externalId_1 (talvez não exista):', e.message || e);
    }

    // 3) criar índice unique + sparse
    try {
      await coll.createIndex({ externalId: 1 }, { unique: true, sparse: true });
      console.log('Índice externalId criado como unique + sparse');
    } catch (e) {
      console.error('Erro ao criar índice externalId:', e.message || e);
      throw e;
    }

    console.log('Índices agora:', await coll.indexes());
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado do Mongo');
  }
}

if (require.main === module) {
  run().catch(err => { console.error('Script falhou:', err); process.exit(1); });
}

export default run;