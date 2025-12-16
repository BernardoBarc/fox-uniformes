import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Criar pasta para notas fiscais se não existir
const notasDir = path.join(__dirname, '..', 'notas_fiscais');
if (!fs.existsSync(notasDir)) {
    fs.mkdirSync(notasDir, { recursive: true });
}

/**
 * Gera uma nota fiscal em PDF
 * @param {Object} dadosNota - Dados para a nota fiscal
 * @returns {Promise<string>} - Caminho do arquivo PDF gerado
 */
export const gerarNotaFiscal = async (dadosNota) => {
    const {
        numeroNota,
        cliente,
        vendedor,
        itens,
        valorTotal,
        formaPagamento,
        parcelas,
        dataEmissao
    } = dadosNota;

    const nomeArquivo = `nota_fiscal_${numeroNota}.pdf`;
    const caminhoArquivo = path.join(notasDir, nomeArquivo);

    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ 
                size: 'A4',
                margin: 50,
                info: {
                    Title: `Nota Fiscal ${numeroNota}`,
                    Author: 'Fox Uniformes',
                }
            });

            const stream = fs.createWriteStream(caminhoArquivo);
            doc.pipe(stream);

            // ========== CABEÇALHO ==========
            // Logo/Nome da empresa
            doc.fontSize(28)
               .fillColor('#ea580c')
               .text('🦊 FOX UNIFORMES', { align: 'center' });
            
            doc.fontSize(10)
               .fillColor('#666666')
               .text('Uniformes de Qualidade', { align: 'center' });

            doc.moveDown(0.5);

            // Linha divisória
            doc.strokeColor('#ea580c')
               .lineWidth(2)
               .moveTo(50, doc.y)
               .lineTo(545, doc.y)
               .stroke();

            doc.moveDown(1);

            // ========== INFORMAÇÕES DA NOTA ==========
            doc.fontSize(16)
               .fillColor('#333333')
               .text('NOTA FISCAL', { align: 'center' });
            
            doc.fontSize(12)
               .fillColor('#666666')
               .text(`Nº ${numeroNota}`, { align: 'center' });

            doc.moveDown(1);

            // Data de emissão
            const dataFormatada = new Date(dataEmissao).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            doc.fontSize(10)
               .fillColor('#666666')
               .text(`Data de Emissão: ${dataFormatada}`, { align: 'right' });

            doc.moveDown(1.5);

            // ========== DADOS DO CLIENTE ==========
            doc.fontSize(12)
               .fillColor('#ea580c')
               .text('DADOS DO CLIENTE');
            
            doc.strokeColor('#dddddd')
               .lineWidth(1)
               .moveTo(50, doc.y + 5)
               .lineTo(545, doc.y + 5)
               .stroke();

            doc.moveDown(0.5);

            doc.fontSize(10)
               .fillColor('#333333');
            
            doc.text(`Nome: ${cliente.nome}`);
            doc.text(`CPF: ${cliente.cpf}`);
            doc.text(`Telefone: ${cliente.telefone}`);
            if (cliente.email) {
                doc.text(`Email: ${cliente.email}`);
            }
            doc.text(`Endereço: ${cliente.rua}, ${cliente.numero} - ${cliente.bairro}`);
            doc.text(`${cliente.cidade} - ${cliente.estado}${cliente.cep ? ` | CEP: ${cliente.cep}` : ''}`);

            doc.moveDown(1.5);

            // ========== ITENS DO PEDIDO ==========
            doc.fontSize(12)
               .fillColor('#ea580c')
               .text('ITENS DO PEDIDO');
            
            doc.strokeColor('#dddddd')
               .lineWidth(1)
               .moveTo(50, doc.y + 5)
               .lineTo(545, doc.y + 5)
               .stroke();

            doc.moveDown(0.5);

            // Cabeçalho da tabela
            const tableTop = doc.y;
            const col1 = 50;   // Produto
            const col2 = 250;  // Qtd
            const col3 = 320;  // Preço Unit
            const col4 = 420;  // Subtotal

            doc.fontSize(9)
               .fillColor('#666666');
            
            doc.text('PRODUTO', col1, tableTop);
            doc.text('QTD', col2, tableTop);
            doc.text('PREÇO UNIT.', col3, tableTop);
            doc.text('SUBTOTAL', col4, tableTop);

            doc.strokeColor('#dddddd')
               .lineWidth(0.5)
               .moveTo(50, doc.y + 15)
               .lineTo(545, doc.y + 15)
               .stroke();

            let yPosition = doc.y + 20;

            // Itens
            doc.fontSize(10)
               .fillColor('#333333');

            itens.forEach((item, index) => {
                const nomeProduto = item.produtoNome || item.produtoId?.name || 'Produto';
                const tamanho = item.tamanho ? ` (${item.tamanho})` : '';
                const categoria = item.categoria ? ` - ${item.categoria}` : '';
                
                doc.text(`${nomeProduto}${tamanho}${categoria}`, col1, yPosition, { width: 190 });
                doc.text(item.quantidade.toString(), col2, yPosition);
                doc.text(`R$ ${item.precoUnitario?.toFixed(2) || (item.preco / item.quantidade).toFixed(2)}`, col3, yPosition);
                doc.text(`R$ ${item.precoTotal?.toFixed(2) || item.preco?.toFixed(2)}`, col4, yPosition);
                
                // Observações do item
                if (item.observacoes) {
                    yPosition += 15;
                    doc.fontSize(8)
                       .fillColor('#666666')
                       .text(`   📝 ${item.observacoes}`, col1, yPosition, { width: 400 });
                    doc.fontSize(10)
                       .fillColor('#333333');
                }

                yPosition += 25;

                // Verificar se precisa nova página
                if (yPosition > 700) {
                    doc.addPage();
                    yPosition = 50;
                }
            });

            doc.y = yPosition;

            // Linha antes do total
            doc.strokeColor('#ea580c')
               .lineWidth(1)
               .moveTo(300, doc.y)
               .lineTo(545, doc.y)
               .stroke();

            doc.moveDown(0.5);

            // ========== TOTAIS ==========
            doc.fontSize(12)
               .fillColor('#333333')
               .text(`Subtotal:`, 300, doc.y, { continued: true, width: 100 })
               .text(`R$ ${valorTotal.toFixed(2)}`, { align: 'right' });

            // Forma de pagamento
            let descricaoPagamento = formaPagamento === 'pix' ? 'PIX' : 'Cartão de Crédito';
            if (formaPagamento === 'cartao' && parcelas > 1) {
                descricaoPagamento += ` (${parcelas}x)`;
            }

            doc.fontSize(10)
               .fillColor('#666666')
               .text(`Forma de Pagamento: ${descricaoPagamento}`, 300, doc.y + 5);

            doc.moveDown(1);

            // Total em destaque
            doc.rect(300, doc.y, 245, 35)
               .fillAndStroke('#ea580c', '#ea580c');

            doc.fontSize(14)
               .fillColor('#ffffff')
               .text('TOTAL:', 310, doc.y - 28, { continued: true })
               .fontSize(18)
               .text(`R$ ${valorTotal.toFixed(2)}`, { align: 'right' });

            doc.fillColor('#333333');
            doc.moveDown(3);

            // ========== DADOS DO VENDEDOR ==========
            if (vendedor) {
                doc.fontSize(10)
                   .fillColor('#666666')
                   .text(`Vendedor: ${vendedor.login || vendedor.nome || 'N/A'}`, 50);
            }

            doc.moveDown(2);

            // ========== RODAPÉ ==========
            const bottomY = 750;
            
            doc.strokeColor('#dddddd')
               .lineWidth(1)
               .moveTo(50, bottomY)
               .lineTo(545, bottomY)
               .stroke();

            doc.fontSize(9)
               .fillColor('#666666')
               .text('Fox Uniformes - Uniformes de Qualidade', 50, bottomY + 10, { align: 'center' });
            
            doc.fontSize(8)
               .text('Este documento é uma representação fiscal simplificada.', 50, bottomY + 25, { align: 'center' });
            
            doc.text('Em caso de dúvidas, entre em contato via WhatsApp.', 50, bottomY + 38, { align: 'center' });

            // Finalizar documento
            doc.end();

            stream.on('finish', () => {
                console.log(`✅ Nota fiscal gerada: ${nomeArquivo}`);
                resolve(caminhoArquivo);
            });

            stream.on('error', (err) => {
                console.error('Erro ao gerar nota fiscal:', err);
                reject(err);
            });

        } catch (error) {
            console.error('Erro ao criar PDF:', error);
            reject(error);
        }
    });
};

/**
 * Gera número único para a nota fiscal
 * @returns {string} - Número da nota fiscal
 */
export const gerarNumeroNota = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `NF${timestamp}${random}`;
};

/**
 * Retorna o caminho relativo para acesso via URL
 * @param {string} caminhoCompleto - Caminho absoluto do arquivo
 * @returns {string} - Caminho relativo para URL
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
