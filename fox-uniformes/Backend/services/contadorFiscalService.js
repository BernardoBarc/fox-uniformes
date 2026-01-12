import ContadorFiscal from '../models/contadorFiscal.js';

export const gerarNumeroFiscalSequencial = async () => {
  const anoAtual = new Date().getFullYear();

  const contador = await ContadorFiscal.findOneAndUpdate(
    { ano: anoAtual },
    { $inc: { sequencial: 1 } },
    {
      new: true,
      upsert: true
    }
  );

  const numeroFormatado = contador.sequencial
    .toString()
    .padStart(6, '0');

  return `NF-${anoAtual}-${numeroFormatado}`;
};

export default {
  gerarNumeroFiscalSequencial
};
