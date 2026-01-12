import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ContadorFiscal from '../models/contadorFiscal.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pasta das notas fiscais
const notasDir = path.join(__dirname, '..', 'notas_fiscais');
if (!fs.existsSync(notasDir)) {
  fs.mkdirSync(notasDir, { recursive: true });
}

/**
 * 🔢 Gera número fiscal REAL (sequencial e persistido)
 * Ex: NF-2026-000001
 */
const gerarNumeroFiscalSequencial = async () => {
  const anoAtual = new Date().getFullYear();

  const contador = await ContadorFiscal.findOneAndUpdate(
    { ano: anoAtual },
    { $inc: { sequencial: 1 } },
    { new: true, upsert: true }
  );

  const sequencialFormatado = contador.sequencial
    .toString()
    .padStart(6, '0');

  return `NF-${anoAtual}-${sequencialFormatado}`;
};

export const gerarNumeroNota = async () => {
  return await gerarNumeroFiscalSequencial();
};

/**
 * 📄 Gera a Nota Fiscal em PDF
 */
export const gerarNotaFiscal = async (dadosNota) => {
  const {
    cliente,
    vendedor,
    itens,
    valorTotal,
    formaPagamento,
    parcelas,
    dataEmissao
  } = dadosNota;

  // 🔥 NUMERAÇÃO FISCAL REAL
  const numeroNota = await gerarNumeroFiscalSequencial();

  const nomeArquivo = `nota_fiscal_${numeroNota}.pdf`;
  const caminhoArquivo = path.join(notasDir, nomeArquivo);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Nota Fiscal ${numeroNota}`,
          Author: 'Fox Uniformes'
        }
      });

      const stream = fs.createWriteStream(caminhoArquivo);
      doc.pipe(stream);

      /* ================= CABEÇALHO ================= */
      doc.fontSize(28)
        .fillColor('#ea580c')
        .text('🦊 FOX UNIFORMES', { align: 'center' });

      doc.fontSize(10)
        .fillColor('#666666')
        .text('Uniformes de Qualidade', { align: 'center' });

      doc.moveDown(1);

      doc.fontSize(16)
        .fillColor('#333333')
        .text('NOTA FISCAL', { align: 'center' });

      doc.fontSize(12)
        .fillColor('#666666')
        .text(`Nº ${numeroNota}`, { align: 'center' });

      doc.moveDown(1);

      const dataFormatada = new Date(dataEmissao).toLocaleString('pt-BR');
      doc.fontSize(10)
        .text(`Data de Emissão: ${dataFormatada}`, { align: 'right' });

      /* ================= CLIENTE ================= */
      doc.moveDown(1);
      doc.fontSize(12).fillColor('#ea580c').text('DADOS DO CLIENTE');
      doc.moveDown(0.5);

      doc.fontSize(10).fillColor('#333333');
      doc.text(`Nome: ${cliente.nome}`);
      doc.text(`CPF: ${cliente.cpf}`);
      doc.text(`Telefone: ${cliente.telefone}`);
      if (cliente.email) doc.text(`Email: ${cliente.email}`);

      doc.moveDown(1);

      /* ================= ITENS ================= */
      doc.fontSize(12).fillColor('#ea580c').text('ITENS DO PEDIDO');
      doc.moveDown(0.5);

      itens.forEach((item) => {
        doc.fontSize(10)
          .fillColor('#333333')
          .text(
            `${item.produtoNome} - ${item.quantidade} x R$ ${item.precoUnitario.toFixed(2)} = R$ ${item.precoTotal.toFixed(2)}`
          );
      });

      doc.moveDown(1);

      /* ================= TOTAL ================= */
      doc.fontSize(12)
        .text(`TOTAL: R$ ${valorTotal.toFixed(2)}`, { align: 'right' });

      doc.fontSize(10)
        .text(`Forma de Pagamento: ${formaPagamento.toUpperCase()}`, { align: 'right' });

      if (parcelas > 1) {
        doc.text(`Parcelas: ${parcelas}x`, { align: 'right' });
      }

      /* ================= RODAPÉ ================= */
      doc.moveDown(2);
      doc.fontSize(8)
        .fillColor('#666666')
        .text(
          'Este documento é uma representação fiscal simplificada.',
          { align: 'center' }
        );

      doc.end();

      stream.on('finish', () => {
        console.log(`✅ Nota fiscal gerada: ${nomeArquivo}`);
        resolve({
          numeroNota,
          caminho: caminhoArquivo,
          nomeArquivo
        });
      });

      stream.on('error', reject);

    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Retorna URL pública da nota fiscal
 */
export const getUrlNotaFiscal = (caminhoCompleto) => {
  const nomeArquivo = path.basename(caminhoCompleto);
  return `/notas_fiscais/${nomeArquivo}`;
};

export default {
  gerarNotaFiscal,
  gerarNumeroNota,
  getUrlNotaFiscal
};
