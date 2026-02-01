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
  try {
    // Normaliza dados de entrada e aplica defaults
    const cliente = dadosNota.cliente || {};
    const itensInput = dadosNota.itens || [];
    const valorTotal = typeof dadosNota.valorTotal === 'number' ? dadosNota.valorTotal : (Number(dadosNota.valorTotal) || 0);
    const formaPagamento = (dadosNota.formaPagamento || '').toString();
    const parcelas = Number(dadosNota.parcelas) || 0;
    const dataEmissaoRaw = dadosNota.dataEmissao ? new Date(dadosNota.dataEmissao) : new Date();

    // Se já veio um número de nota use-o, caso contrário gera sequencial
    const numeroNota = dadosNota.numeroNota ? dadosNota.numeroNota : await gerarNumeroFiscalSequencial();

    // Normaliza itens para o formato esperado pelo template
    const itens = itensInput.map((it) => {
      const produtoNome = it.produtoNome || (it.produto && (it.produto.name || it.produto.title)) || it.name || 'Produto';
      const quantidade = Number(it.quantidade ?? it.qtd ?? it.qty ?? 1);
      const precoUnitario = Number(it.precoUnitario ?? it.preco ?? (it.produto && it.produto.preco) ?? 0) || 0;
      const precoTotal = Number(it.precoTotal ?? (precoUnitario * quantidade)) || (precoUnitario * quantidade);
      return { produtoNome, quantidade, precoUnitario, precoTotal };
    });

    const nomeArquivo = `nota_fiscal_${numeroNota}.pdf`;
    const caminhoArquivo = path.join(notasDir, nomeArquivo);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        const stream = fs.createWriteStream(caminhoArquivo);
        doc.pipe(stream);

        // ------- LOGO (centralizado) -------
        const possibleLogoPaths = [
          path.join(process.cwd(), 'public', 'logoPreto.png'),
          path.join(process.cwd(), 'public', 'logoBranco.png'),
          path.join(__dirname, '..', '..', 'public', 'logoPreto.png'),
          path.join(__dirname, '..', '..', 'public', 'logoBranco.png'),
          path.join(__dirname, '..', 'public', 'logoPreto.png'),
          path.join(__dirname, '..', 'public', 'logoBranco.png'),
        ];

        let logoFound = null;
        for (const p of possibleLogoPaths) {
          if (fs.existsSync(p)) { logoFound = p; break; }
        }

        if (logoFound) {
          try {
            const imgBuffer = fs.readFileSync(logoFound);
            const imgWidth = 100;
            const x = (doc.page.width - imgWidth) / 2;
            doc.image(imgBuffer, x, 30, { width: imgWidth });
          } catch (imgErr) {
            console.warn('Não foi possível inserir logo na nota fiscal (buffer):', imgErr);
          }
        }

        // Cabeçalho com nome da empresa centralizado e informações da nota à direita
        doc.moveDown(4);
        doc.fontSize(18).font('Helvetica-Bold').text('FOX UNIFORMES', { align: 'center' });
        doc.moveDown(0.5);

        // Linha divisória
        doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
        doc.moveDown(0.5);

        // Título da nota e número / data
        const dataFormatada = dataEmissaoRaw.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        doc.fontSize(20).font('Helvetica-Bold').text('NOTA FISCAL', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica').text(`Nº ${numeroNota}`, { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(10).text(`Data de Emissão: ${dataFormatada}`, { align: 'center' });
        doc.moveDown(0.8);

        // Dados do emitente (à esquerda abaixo do título)
        doc.fontSize(10).font('Helvetica-Bold').text('DADOS DO EMITENTE');
        doc.moveDown(0.3);
        doc.font('Helvetica').fontSize(10).text('FOX UNIFORMES');
        doc.text('CNPJ: 99.999.999/9999-99');
        doc.text('Rua de maluco, nº 69, Centro – Palmeira das Missões / RS');
        doc.text('CEP: 99999-999');

        doc.moveDown(0.8);
        doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
        doc.moveDown(0.5);

        // Dados do cliente
        doc.fontSize(12).font('Helvetica-Bold').text('DADOS DO CLIENTE');
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica');
        doc.text(`Nome: ${cliente.nome || 'Cliente'}`);
        if (cliente.cpf) doc.text(`CPF: ${cliente.cpf}`);
        if (cliente.telefone) doc.text(`Telefone: ${cliente.telefone}`);
        if (cliente.email) doc.text(`Email: ${cliente.email}`);
        if (cliente.endereco) doc.text(`Endereço: ${cliente.endereco}`);
        if (cliente.cep) doc.text(`CEP: ${cliente.cep}`);

        doc.moveDown(0.5);
        doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
        doc.moveDown(0.5);

        // Tabela de itens
        doc.fontSize(12).font('Helvetica-Bold').text('ITENS DO PEDIDO');
        doc.moveDown(0.4);

        const tableTop = doc.y;
        const col1 = 40;
        const col2 = 320;
        const col3 = 420;
        const col4 = 490;

        // Cabeçalho
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Produto', col1, tableTop, { width: col2 - col1 });
        doc.text('Qtd', col2, tableTop, { width: col3 - col2, align: 'center' });
        doc.text('Unitário', col3, tableTop, { width: col4 - col3, align: 'right' });
        doc.text('Total', col4, tableTop, { width: doc.page.width - col4 - 40, align: 'right' });

        // Linha separadora
        doc.moveTo(40, doc.y + 12).lineTo(doc.page.width - 40, doc.y + 12).stroke();

        // Linhas
        doc.font('Helvetica').fontSize(10);
        let y = doc.y + 18;
        itens.forEach((item) => {
          doc.text(item.produtoNome, col1, y, { width: col2 - col1 });
          doc.text(String(item.quantidade), col2, y, { width: col3 - col2, align: 'center' });
          doc.text(`R$ ${item.precoUnitario.toFixed(2)}`, col3, y, { width: col4 - col3, align: 'right' });
          doc.text(`R$ ${item.precoTotal.toFixed(2)}`, col4, y, { width: doc.page.width - col4 - 40, align: 'right' });
          y += 18;
        });

        doc.moveTo(40, y).lineTo(doc.page.width - 40, y).stroke();
        doc.moveDown(1);

        // Totais (direita)
        const totalsX = col3;
        doc.fontSize(12).font('Helvetica-Bold').text(`TOTAL: R$ ${valorTotal.toFixed(2)}`, totalsX, y + 8, { align: 'right' });
        doc.fontSize(10).font('Helvetica').text(`Forma de Pagamento: ${formaPagamento.toUpperCase()}`, totalsX, y + 28, { align: 'right' });
        if (parcelas > 1) doc.text(`Parcelas: ${parcelas}x`, totalsX, y + 44, { align: 'right' });

        // Rodapé
        doc.moveDown(6);
        doc.fontSize(9).font('Helvetica').text('Este documento é uma representação fiscal simplificada. Pagamento confirmado. Agradecemos pela preferência.', { align: 'center' });

        doc.end();

        stream.on('finish', () => {
          resolve({ numeroNota, caminho: caminhoArquivo, nomeArquivo });
        });

        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  } catch (error) {
    throw error;
  }
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
