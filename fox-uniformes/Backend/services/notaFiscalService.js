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

      /* ================= LOGO E DADOS EMPRESA ================= */
      // Tenta localizar o logo - procura por versões claras/escuro na pasta public
      // Prioriza caminho com base na raiz do processo (deploys) e depois caminhos relativos
      const possibleLogoPaths = [
        path.join(process.cwd(), 'public', 'logoPreto.png'),
        path.join(process.cwd(), 'public', 'logoBranco.png'),
        path.join(__dirname, '..', '..', 'public', 'logoPreto.png'), // raiz/public/logoPreto.png
        path.join(__dirname, '..', '..', 'public', 'logoBranco.png'),
        path.join(__dirname, '..', 'public', 'logoPreto.png'), // Backend/public/logoPreto.png
        path.join(__dirname, '..', 'public', 'logoBranco.png'),
      ];

      let logoFound = null;
      for (const p of possibleLogoPaths) {
        if (fs.existsSync(p)) {
          logoFound = p;
          break;
        }
      }

      if (logoFound) {
        try {
          // Lê imagem como buffer (mais confiável em ambientes onde paths podem variar)
          const imgBuffer = fs.readFileSync(logoFound);
          doc.image(imgBuffer, 50, 30, { width: 100 });
          doc.moveDown(4);
          console.log('[DEBUG] logo da nota fiscal inserida (buffer):', logoFound);
        } catch (imgErr) {
          console.warn('Não foi possível inserir logo na nota fiscal (buffer):', imgErr);
        }
      } else {
        console.warn('Logo não encontrada em paths esperados:', possibleLogoPaths);
      }

      doc.fontSize(14).fillColor('#000').font('Helvetica-Bold').text('FOX UNIFORMES', { align: 'center' });
      doc.fontSize(10).fillColor('#000').font('Helvetica').text('Uniformes de Qualidade', { align: 'center' });
      doc.fontSize(10).fillColor('#000').font('Helvetica').text('CNPJ: 99.999.999/9999-99', { align: 'center' });
      doc.fontSize(10).fillColor('#000').font('Helvetica').text('Rua de maluco, nº 69, Centro, Palmeira das Missões - RS', { align: 'center' });
      doc.fontSize(10).fillColor('#000').font('Helvetica').text('CEP: 99999999', { align: 'center' });
      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
      /* ================= CABEÇALHO ================= */
      doc.moveDown(0.5);
      doc.fontSize(16).fillColor('#000').font('Helvetica-Bold').text('NOTA FISCAL', { align: 'center' });
      doc.fontSize(12).fillColor('#000').font('Helvetica-Bold').text(`Nº ${numeroNota}`, { align: 'center' });
      doc.moveDown(1);
      // Formata a data no fuso de São Paulo para evitar discrepância (ex.: +3 horas)
      const dataFormatada = new Date(dataEmissao).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      doc.fontSize(10).fillColor('#000').font('Helvetica').text(`Data de Emissão: ${dataFormatada}`, { align: 'right' });
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
      /* ================= CLIENTE ================= */
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#000').font('Helvetica-Bold').text('DADOS DO CLIENTE');
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#000').font('Helvetica');
      doc.text(`Nome: ${cliente.nome}`);
      doc.text(`CPF: ${cliente.cpf}`);
      doc.text(`Telefone: ${cliente.telefone}`);
      if (cliente.email) doc.text(`Email: ${cliente.email}`);
      if (cliente.endereco) doc.text(`Endereço: ${cliente.endereco}`);
      if (cliente.cep) doc.text(`CEP: ${cliente.cep}`);
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
      /* ================= ITENS ================= */
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#000').font('Helvetica-Bold').text('ITENS DO PEDIDO');
      doc.moveDown(0.5);
      // Cabeçalho da tabela
      const tableTop = doc.y;
      const col1 = 50, col2 = 250, col3 = 320, col4 = 400, col5 = 480;
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Produto', col1, tableTop, { width: col2 - col1, align: 'left' });
      doc.text('Qtd', col2, tableTop, { width: col3 - col2, align: 'center' });
      doc.text('Unitário', col3, tableTop, { width: col4 - col3, align: 'right' });
      doc.text('Total', col4, tableTop, { width: col5 - col4, align: 'right' });
      doc.moveDown(0.2);
      doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
      // Linhas da tabela
      doc.font('Helvetica');
      let y = doc.y;
      itens.forEach((item) => {
        doc.text(item.produtoNome, col1, y, { width: col2 - col1, align: 'left' });
        doc.text(String(item.quantidade), col2, y, { width: col3 - col2, align: 'center' });
        doc.text(`R$ ${item.precoUnitario.toFixed(2)}`, col3, y, { width: col4 - col3, align: 'right' });
        doc.text(`R$ ${item.precoTotal.toFixed(2)}`, col4, y, { width: col5 - col4, align: 'right' });
        y += 18;
      });
      doc.moveTo(50, y).lineTo(doc.page.width - 50, y).stroke();
      doc.moveDown(1);
      /* ================= TOTAL ================= */
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#000').text(`TOTAL: R$ ${valorTotal.toFixed(2)}`, col4, y + 10, { align: 'right' });
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#000').text(`Forma de Pagamento: ${formaPagamento.toUpperCase()}`, col4, y + 30, { align: 'right' });
      if (parcelas > 1) {
        doc.text(`Parcelas: ${parcelas}x`, col4, y + 45, { align: 'right' });
      }
      /* ================= RODAPÉ ================= */
      doc.moveDown(4);
      doc.fontSize(8).fillColor('#000').font('Helvetica').text('Este documento é uma representação fiscal simplificada.', { align: 'center' });

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
  getUrlNotaFiscal
};
