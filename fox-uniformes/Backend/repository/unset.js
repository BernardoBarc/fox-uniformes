import mongoose from 'mongoose';
import Pagamento from '../Backend/models/pagamento.js'; // ajuste caminho conforme necessário

const MONGO = process.env.MONGO_URI || 'mongodb://...';

async function run() {
  await mongoose.connect(MONGO);
  const coll = mongoose.connection.collection('pagamentos');

  try {
    // listar índices
    console.log('Índices atuais:', await coll.indexes());

    // tentar dropar índice (ignora erro se não existir)
    try { await coll.dropIndex('externalId_1'); console.log('Índice externalId_1 dropado'); } catch(e) { console.warn('Não foi possível dropar externalId_1 (talvez não exista):', e.message); }

    // criar índice unique + sparse
    await coll.createIndex({ externalId: 1 }, { unique: true, sparse: true });
    console.log('Índice externalId criado como unique + sparse');

    console.log('Índices agora:', await coll.indexes());
  } finally {
    await mongoose.disconnect();
  }
}

run().catch(err => { console.error(err); process.exit(1); });