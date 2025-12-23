import pagamentoRepository from '../repository/pagamentoRepository.js';
import Pedido from '../models/pedido.js';
import Cliente from '../models/cliente.js';
import User from '../models/users.js';
import { gerarNotaFiscal, gerarNumeroNota, getUrlNotaFiscal } from './notaFiscalService.js';
import { Resend } from 'resend';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mercadopago, { MercadoPagoConfig, Payment } from 'mercadopago';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração do Mercado Pago (você precisará configurar suas credenciais)
// import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

const MERCADO_PAGO_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN || '';
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || '';
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN || '';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || process.env.APP_URL || 'http://localhost:5000';

// Configuração do Resend (Email)
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'Fox Uniformes <onboarding@resend.dev>';

// Instância Mercado Pago v3+
const mpClient = new MercadoPagoConfig({ accessToken: MERCADO_PAGO_ACCESS_TOKEN });
const paymentInstance = new Payment(mpClient);

// Criar cliente Resend
const createResendClient = () => {
    if (!RESEND_API_KEY) {
        console.log('⚠️ RESEND_API_KEY não configurada. Configure no .env para enviar emails.');
        return null;
    }
    return new Resend(RESEND_API_KEY);
};

const getAllPagamentos = async () => {
    return await pagamentoRepository.getAllPagamentos();
};

const getPagamentoById = async (id) => {
    return await pagamentoRepository.getPagamentoById(id);
};

const getPagamentosByCliente = async (clienteId) => {
    return await pagamentoRepository.getPagamentosByCliente(clienteId);
};

const getPagamentosPendentes = async () => {
    return await pagamentoRepository.getPagamentosPendentes();
};

// Criar pagamento e gerar link
const criarPagamento = async (pagamentoData) => {
    const { clienteId, pedidos, valorTotal, telefone, nomeCliente, metodoPagamento, cardToken, installments, payer } = pagamentoData;
    const cliente = await Cliente.findById(clienteId);
    const emailCliente = cliente?.email;
    // Salvar pagamento no banco
    const pagamento = await pagamentoRepository.savePagamento({
        clienteId,
        pedidos,
        valorTotal,
        status: 'Pendente',
    });
    let linkPagamento = '';
    let pixData = null;
    let cardData = null;
    try {
        if (MERCADO_PAGO_ACCESS_TOKEN && metodoPagamento === 'PIX') {
            // Criação real de pagamento PIX
            pixData = await criarPagamentoPixMercadoPago(pagamento, nomeCliente, valorTotal);
            linkPagamento = null; // Não há link, só QR Code/chave
        } else if (MERCADO_PAGO_ACCESS_TOKEN && metodoPagamento === 'CREDIT_CARD') {
            // Novo fluxo: pagamento com cartão de crédito Mercado Pago
            cardData = await criarPagamentoCartaoMercadoPago(pagamento, nomeCliente, valorTotal, cardToken, installments, payer);
            linkPagamento = null; // Não há link, é direto
        } else {
            linkPagamento = `${FRONTEND_URL}/pagamento/${pagamento._id}`;
        }
        // Atualizar pagamento com o link (se não for PIX/cartão)
        if (linkPagamento) {
            await pagamentoRepository.updatePagamento(pagamento._id, { linkPagamento });
        }
        // Enviar email com instruções de pagamento
        if (emailCliente) {
            if (pixData) {
                await enviarEmailPagamentoPIX(emailCliente, nomeCliente, valorTotal, pixData);
            } else if (cardData) {
                await enviarEmailPagamentoCartao(emailCliente, nomeCliente, valorTotal, cardData);
            } else {
                await enviarEmailPagamento(emailCliente, nomeCliente, valorTotal, linkPagamento);
            }
            await pagamentoRepository.updatePagamento(pagamento._id, { 
                emailEnviado: true,
                emailEnviadoEm: new Date()
            });
        } else if (telefone && WHATSAPP_API_URL && WHATSAPP_API_TOKEN) {
            await enviarWhatsApp(telefone, nomeCliente, valorTotal, linkPagamento);
            await pagamentoRepository.updatePagamento(pagamento._id, { 
                whatsappEnviado: true,
                whatsappEnviadoEm: new Date()
            });
        }
    } catch (error) {
        console.error('Erro ao gerar pagamento:', error);
    }
    return { pagamento, linkPagamento, pixData, cardData };
};

// Criar preferência no Mercado Pago
const criarPreferenciaMercadoPago = async (pagamento, nomeCliente, valorTotal) => {
    // Implementação do Mercado Pago
    // Descomente e configure quando tiver as credenciais

    /*
    const client = new MercadoPagoConfig({ accessToken: MERCADO_PAGO_ACCESS_TOKEN });
    const preference = new Preference(client);

    const preferenceData = {
        items: [{
            id: pagamento._id.toString(),
            title: `Pedido Fox Uniformes - ${nomeCliente}`,
            quantity: 1,
            unit_price: valorTotal,
            currency_id: 'BRL',
        }],
        payer: {
            name: nomeCliente,
        },
        payment_methods: {
            excluded_payment_types: [],
            installments: 12, // Máximo de parcelas
        },
        back_urls: {
            success: `${FRONTEND_URL}/pagamento/sucesso/${pagamento._id}`,
            failure: `${FRONTEND_URL}/pagamento/falha/${pagamento._id}`,
            pending: `${FRONTEND_URL}/pagamento/pendente/${pagamento._id}`,
        },
        auto_return: 'approved',
        external_reference: pagamento._id.toString(),
        notification_url: `${BACKEND_URL}/api/webhook/mercadopago`,
    };

    const response = await preference.create({ body: preferenceData });
    
    await pagamentoRepository.updatePagamento(pagamento._id, { 
        externalId: response.id,
        gatewayResponse: response 
    });

    return response.init_point; // URL de pagamento do Mercado Pago
    */

    // Retorna link temporário enquanto não tem Mercado Pago configurado
    return `${FRONTEND_URL}/pagamento/${pagamento._id}`;
};

// Enviar mensagem via WhatsApp
const enviarWhatsApp = async (telefone, nomeCliente, valorTotal, linkPagamento) => {
    // Formatar telefone (remover caracteres especiais e adicionar código do país)
    const telefoneFormatado = telefone.replace(/\D/g, '');
    const telefoneCompleto = telefoneFormatado.startsWith('55') 
        ? telefoneFormatado 
        : `55${telefoneFormatado}`;

    const mensagem = `🦊 *Fox Uniformes*

Olá ${nomeCliente}! 👋

Seu pedido foi registrado com sucesso! ✅

💰 *Valor Total:* R$ ${valorTotal.toFixed(2)}

Para finalizar, realize o pagamento através do link abaixo:

🔗 ${linkPagamento}

*Formas de pagamento disponíveis:*
• PIX (aprovação instantânea)
• Cartão de Crédito (até 12x)

Após a confirmação do pagamento, iniciaremos a produção do seu pedido.

Dúvidas? Responda esta mensagem! 😊

_Obrigado pela preferência!_`;

    // Se tiver API do WhatsApp configurada, enviar mensagem
    if (WHATSAPP_API_URL && WHATSAPP_API_TOKEN) {
        try {
            // Exemplo usando Evolution API ou similar
            await fetch(`${WHATSAPP_API_URL}/message/sendText`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': WHATSAPP_API_TOKEN,
                },
                body: JSON.stringify({
                    number: telefoneCompleto,
                    text: mensagem,
                }),
            });
            console.log(`WhatsApp enviado para ${telefoneCompleto}`);
        } catch (error) {
            console.error('Erro ao enviar WhatsApp:', error);
        }
    } else {
        // Log para debug quando não tem WhatsApp configurado
        console.log('=== MENSAGEM WHATSAPP (DEBUG) ===');
        console.log(`Para: ${telefoneCompleto}`);
        console.log(mensagem);
        console.log('================================');
    }

    return true;
};

// Enviar link de pagamento via Email (Resend)
const enviarEmailPagamento = async (email, nomeCliente, valorTotal, linkPagamento) => {
    const resend = createResendClient();
    
    if (!resend) {
        console.log('=== EMAIL PAGAMENTO (DEBUG - SEM CONFIGURAÇÃO) ===');
        console.log(`Para: ${email}`);
        console.log(`Cliente: ${nomeCliente}`);
        console.log(`Valor: R$ ${valorTotal.toFixed(2)}`);
        console.log(`Link: ${linkPagamento}`);
        console.log('================================================');
        return true;
    }

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="background-color: #f97316; color: white; padding: 30px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px;">🦊 Fox Uniformes</h1>
            </div>
            <div style="padding: 30px;">
                <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Olá <strong>${nomeCliente}</strong>! 👋</p>
                <p>Seu pedido foi registrado com sucesso! ✅</p>
                
                <div style="background-color: #fff7ed; border: 2px solid #f97316; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">
                    <p style="color: #666; font-size: 14px; margin-bottom: 5px;">Valor Total</p>
                    <p style="color: #f97316; font-size: 32px; font-weight: bold; margin: 0;">R$ ${valorTotal.toFixed(2)}</p>
                </div>
                
                <p style="text-align: center;">Para finalizar, realize o pagamento clicando no botão abaixo:</p>
                
                <p style="text-align: center;">
                    <a href="${linkPagamento}" style="display: inline-block; background-color: #f97316; color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-size: 18px; font-weight: bold; margin: 20px 0;">💳 Realizar Pagamento</a>
                </p>
                
                <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #333; margin-top: 0;">Formas de pagamento disponíveis:</h3>
                    <ul style="color: #666; margin: 0; padding-left: 20px;">
                        <li>PIX (aprovação instantânea)</li>
                        <li>Cartão de Crédito (até 12x)</li>
                    </ul>
                </div>
                
                <p>Após a confirmação do pagamento, iniciaremos a produção do seu pedido.</p>
                <p>Dúvidas? Responda este email! 😊</p>
                <p><em>Obrigado pela preferência!</em></p>
            </div>
            <div style="background-color: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px;">
                <p>🦊 Fox Uniformes - Qualidade e estilo para sua equipe</p>
            </div>
        </div>
    </body>
    </html>
    `;

    try {
        const { data, error } = await resend.emails.send({
            from: EMAIL_FROM,
            to: email,
            subject: `🦊 Fox Uniformes - Link de Pagamento - R$ ${valorTotal.toFixed(2)}`,
            html: htmlContent,
        });

        if (error) {
            console.error('❌ Erro ao enviar email de pagamento:', error);
            return false;
        }

        console.log(`✅ Email de pagamento enviado para ${email} (ID: ${data?.id})`);
        return true;
    } catch (error) {
        console.error('❌ Erro ao enviar email de pagamento:', error);
        return false;
    }
};

// Enviar nota fiscal via Email (Resend)
const enviarNotaFiscalEmail = async (email, nomeCliente, numeroNota, urlNotaFiscal, cpfCliente, caminhoNotaFiscal) => {
    const resend = createResendClient();
    const linkAcompanhamento = `${FRONTEND_URL}/acompanhar`;

    if (!resend) {
        console.log('=== EMAIL NOTA FISCAL (DEBUG - SEM CONFIGURAÇÃO) ===');
        console.log(`Para: ${email}`);
        console.log(`Cliente: ${nomeCliente}`);
        console.log(`Nota: ${numeroNota}`);
        console.log(`URL: ${urlNotaFiscal}`);
        console.log('===================================================');
        return true;
    }

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="background-color: #22c55e; color: white; padding: 30px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px;">✅ Pagamento Confirmado!</h1>
            </div>
            <div style="padding: 30px;">
                <div style="font-size: 48px; text-align: center; margin-bottom: 20px;">🎉</div>
                <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Olá <strong>${nomeCliente}</strong>!</p>
                <p>Seu pagamento foi processado com sucesso e seu pedido já está em produção!</p>
                
                <div style="background-color: #f0fdf4; border: 2px solid #22c55e; border-radius: 10px; padding: 20px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #22c55e;">📄 Nota Fiscal</h3>
                    <p><strong>Número:</strong> ${numeroNota}</p>
                    <p>A nota fiscal pode ser baixada pelo link abaixo.</p>
                </div>
                
                <p style="text-align: center;">
                    <a href="${urlNotaFiscal}" style="display: inline-block; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-size: 16px; font-weight: bold; margin: 10px 5px; background-color: #f97316; color: white;">📥 Baixar Nota Fiscal</a>
                    <a href="${linkAcompanhamento}" style="display: inline-block; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-size: 16px; font-weight: bold; margin: 10px 5px; background-color: #3b82f6; color: white;">📦 Acompanhar Pedido</a>
                </p>
                
                <p style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center;">
                    <strong>Para acompanhar seu pedido, use seu CPF:</strong><br>
                    <span style="font-size: 18px; color: #f97316;">${cpfCliente || 'cadastrado no sistema'}</span>
                </p>
                
                <p>⏳ Em breve você receberá atualizações sobre a entrega.</p>
                <p><em>Obrigado pela confiança! 🧡</em></p>
            </div>
            <div style="background-color: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px;">
                <p>🦊 Fox Uniformes - Qualidade e estilo para sua equipe</p>
            </div>
        </div>
    </body>
    </html>
    `;

    try {
        const emailOptions = {
            from: EMAIL_FROM,
            to: email,
            subject: `✅ Fox Uniformes - Pagamento Confirmado - Nota Fiscal ${numeroNota}`,
            html: htmlContent,
        };

        // Anexar PDF se o caminho existir
        if (caminhoNotaFiscal) {
            const fullPath = path.join(__dirname, '..', caminhoNotaFiscal);
            if (fs.existsSync(fullPath)) {
                const pdfContent = fs.readFileSync(fullPath);
                emailOptions.attachments = [{
                    filename: `nota_fiscal_${numeroNota}.pdf`,
                    content: pdfContent,
                }];
            }
        }

        const { data, error } = await resend.emails.send(emailOptions);

        if (error) {
            console.error('❌ Erro ao enviar email com nota fiscal:', error);
            return false;
        }

        console.log(`✅ Email com nota fiscal enviado para ${email} (ID: ${data?.id})`);
        return true;
    } catch (error) {
        console.error('❌ Erro ao enviar email com nota fiscal:', error);
        return false;
    }
};

// Enviar nota fiscal via WhatsApp
const enviarNotaFiscalWhatsApp = async (telefone, nomeCliente, numeroNota, urlNotaFiscal, cpfCliente) => {
    const telefoneFormatado = telefone.replace(/\D/g, '');
    const telefoneCompleto = telefoneFormatado.startsWith('55') 
        ? telefoneFormatado 
        : `55${telefoneFormatado}`;

    const linkAcompanhamento = `${FRONTEND_URL}/acompanhar`;

    const mensagem = `🦊 *Fox Uniformes*

Olá ${nomeCliente}! 👋

✅ *Pagamento Confirmado!*

Seu pagamento foi processado com sucesso e seu pedido já está em produção! 🎉

📄 *Nota Fiscal:* ${numeroNota}
🔗 ${urlNotaFiscal}

📦 *Acompanhe seu pedido:*
${linkAcompanhamento}
_(Use seu CPF: ${cpfCliente || 'cadastrado'} para consultar)_

⏳ Em breve você receberá atualizações sobre a entrega.

_Obrigado pela confiança!_ 🧡`;

    if (WHATSAPP_API_URL && WHATSAPP_API_TOKEN) {
        try {
            // Enviar mensagem de texto
            await fetch(`${WHATSAPP_API_URL}/message/sendText`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': WHATSAPP_API_TOKEN,
                },
                body: JSON.stringify({
                    number: telefoneCompleto,
                    text: mensagem,
                }),
            });

            // Enviar o PDF como documento (se a API suportar)
            try {
                await fetch(`${WHATSAPP_API_URL}/message/sendMedia`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': WHATSAPP_API_TOKEN,
                    },
                    body: JSON.stringify({
                        number: telefoneCompleto,
                        mediatype: 'document',
                        media: urlNotaFiscal,
                        fileName: `nota_fiscal_${numeroNota}.pdf`,
                        caption: `Nota Fiscal ${numeroNota} - Fox Uniformes`,
                    }),
                });
            } catch (docError) {
                console.log('Nota fiscal enviada apenas como link (API não suporta envio de documento)');
            }

            console.log(`✅ Nota fiscal enviada via WhatsApp para ${telefoneCompleto}`);
        } catch (error) {
            console.error('Erro ao enviar nota fiscal via WhatsApp:', error);
        }
    } else {
        console.log('=== NOTA FISCAL WHATSAPP (DEBUG) ===');
        console.log(`Para: ${telefoneCompleto}`);
        console.log(mensagem);
        console.log(`URL do PDF: ${urlNotaFiscal}`);
        console.log('====================================');
    }

    return true;
};

// Processar webhook de pagamento (Mercado Pago)
const processarWebhookPagamento = async (webhookData) => {
    const { type, data } = webhookData;

    if (type === 'payment') {
        // Buscar detalhes do pagamento no Mercado Pago
        /*
        const client = new MercadoPagoConfig({ accessToken: MERCADO_PAGO_ACCESS_TOKEN });
        const payment = new Payment(client);
        const paymentInfo = await payment.get({ id: data.id });

        const pagamento = await pagamentoRepository.getPagamentoByExternalId(paymentInfo.external_reference);
        
        if (pagamento) {
            let novoStatus = 'Pendente';
            
            switch (paymentInfo.status) {
                case 'approved':
                    novoStatus = 'Aprovado';
                    break;
                case 'rejected':
                    novoStatus = 'Recusado';
                    break;
                case 'cancelled':
                    novoStatus = 'Cancelado';
                    break;
                case 'refunded':
                    novoStatus = 'Reembolsado';
                    break;
            }

            await pagamentoRepository.updatePagamento(pagamento._id, {
                status: novoStatus,
                metodoPagamento: paymentInfo.payment_type_id === 'credit_card' ? 'Cartão de Crédito' : 'PIX',
                parcelas: paymentInfo.installments || 1,
                gatewayResponse: paymentInfo,
                pagamentoConfirmadoEm: novoStatus === 'Aprovado' ? new Date() : null,
            });

            // Se aprovado, atualizar status dos pedidos
            if (novoStatus === 'Aprovado') {
                await atualizarStatusPedidos(pagamento.pedidos, 'Em Progresso');
            }
        }
        */
    }

    return { received: true };
};

// Atualizar status dos pedidos após pagamento
const atualizarStatusPedidos = async (pedidosIds, novoStatus) => {
    for (const pedidoId of pedidosIds) {
        await Pedido.findByIdAndUpdate(pedidoId, { status: novoStatus });
    }
};

// Confirmar pagamento manualmente (para admin)
const confirmarPagamentoManual = async (pagamentoId, metodoPagamento = 'PIX', parcelas = 1) => {
    // Buscar pagamento com dados populados
    const pagamento = await pagamentoRepository.getPagamentoById(pagamentoId);
    
    if (!pagamento) {
        throw new Error('Pagamento não encontrado');
    }

    // Buscar dados completos do cliente
    const cliente = await Cliente.findById(pagamento.clienteId);
    
    // Buscar dados do vendedor (do primeiro pedido)
    let vendedor = null;
    if (pagamento.pedidos && pagamento.pedidos.length > 0) {
        const primeiroPedido = await Pedido.findById(pagamento.pedidos[0]).populate('vendedorId');
        vendedor = primeiroPedido?.vendedorId;
    }

    // Buscar itens dos pedidos
    const pedidosCompletos = await Pedido.find({ 
        _id: { $in: pagamento.pedidos } 
    }).populate('produtoId');

    // Gerar número da nota fiscal
    const numeroNota = gerarNumeroNota();

    // Preparar itens para a nota fiscal
    const itensNota = pedidosCompletos.map(pedido => ({
        produtoNome: pedido.produtoId?.name || 'Produto',
        categoria: pedido.produtoId?.categoria || '',
        tamanho: pedido.produtoId?.tamanho || '',
        quantidade: pedido.quantidade,
        precoUnitario: pedido.preco / pedido.quantidade,
        precoTotal: pedido.preco,
        observacoes: pedido.observacoes || '',
    }));

    // Gerar nota fiscal em PDF
    let caminhoNotaFiscal = null;
    let urlNotaFiscal = null;

    try {
        caminhoNotaFiscal = await gerarNotaFiscal({
            numeroNota,
            cliente: {
                nome: cliente?.nome || 'Cliente',
                cpf: cliente?.cpf || 'Não informado',
                telefone: cliente?.telefone || '',
                email: cliente?.email || '',
                rua: cliente?.rua || '',
                numero: cliente?.numero || '',
                bairro: cliente?.bairro || '',
                cidade: cliente?.cidade || '',
                estado: cliente?.estado || '',
                cep: cliente?.cep || '',
            },
            vendedor: vendedor ? { login: vendedor.login } : null,
            itens: itensNota,
            valorTotal: pagamento.valorTotal,
            formaPagamento: metodoPagamento.toLowerCase(),
            parcelas,
            dataEmissao: new Date(),
        });

        urlNotaFiscal = `${BACKEND_URL}${getUrlNotaFiscal(caminhoNotaFiscal)}`;
        console.log(`✅ Nota fiscal gerada: ${numeroNota}`);
    } catch (error) {
        console.error('Erro ao gerar nota fiscal:', error);
    }

    // Atualizar pagamento com status aprovado e dados da nota fiscal
    const pagamentoAtualizado = await pagamentoRepository.updatePagamento(pagamentoId, {
        status: 'Aprovado',
        metodoPagamento,
        parcelas,
        pagamentoConfirmadoEm: new Date(),
        notaFiscal: {
            numero: numeroNota,
            caminho: caminhoNotaFiscal,
            url: urlNotaFiscal,
            geradaEm: new Date(),
        },
    });

    // Atualizar status dos pedidos para "Em Progresso"
    if (pagamentoAtualizado) {
        await atualizarStatusPedidos(pagamento.pedidos, 'Em Progresso');
    }

    // Enviar nota fiscal via Email (prioridade) ou WhatsApp
    if (cliente?.email && urlNotaFiscal) {
        await enviarNotaFiscalEmail(
            cliente.email,
            cliente.nome,
            numeroNota,
            urlNotaFiscal,
            cliente.cpf,
            caminhoNotaFiscal
        );
    } else if (cliente?.telefone && urlNotaFiscal) {
        // Fallback para WhatsApp se não tiver email
        await enviarNotaFiscalWhatsApp(
            cliente.telefone,
            cliente.nome,
            numeroNota,
            urlNotaFiscal,
            cliente.cpf
        );
    }

    return { pagamento: pagamentoAtualizado, notaFiscal: { numero: numeroNota, url: urlNotaFiscal } };
};

// Confirma pagamento por externalId (usado pelo webhook)
const confirmarPagamentoPorExternalId = async (external_reference, paymentId) => {
    // Busca o pagamento pelo external_reference (que é o _id do pagamento)
    const pagamento = await pagamentoRepository.getPagamentoById(external_reference);
    if (!pagamento) return;
    // Atualiza status
    await pagamentoRepository.updatePagamento(pagamento._id, {
        status: 'Aprovado',
        pagamentoConfirmadoEm: new Date(),
        externalId: paymentId
    });
    // Atualiza status dos pedidos vinculados
    if (pagamento.pedidos && pagamento.pedidos.length > 0) {
        await atualizarStatusPedidos(pagamento.pedidos, 'Em Progresso');
    }
    // Envia nota fiscal por email
    if (pagamento.clienteId) {
        const cliente = await Cliente.findById(pagamento.clienteId);
        if (cliente?.email && pagamento.notaFiscal?.url) {
            await enviarNotaFiscalEmail(
                cliente.email,
                cliente.nome,
                pagamento.notaFiscal.numero,
                pagamento.notaFiscal.url,
                cliente.cpf,
                pagamento.notaFiscal.caminho
            );
        }
    }
};

// Criação de pagamento PIX real Mercado Pago
const criarPagamentoPixMercadoPago = async (pagamento, nomeCliente, valorTotal) => {
    // Docs: https://www.mercadopago.com.br/developers/pt/docs/checkout-api/pix/introduction
    const body = {
        transaction_amount: valorTotal,
        description: `Pedido Fox Uniformes - ${nomeCliente}`,
        payment_method_id: 'pix',
        payer: {
            email: pagamento.clienteId?.email || 'comprador@foxuniformes.com',
            first_name: nomeCliente,
        },
        external_reference: pagamento._id.toString(),
        notification_url: `${BACKEND_URL}/api/webhook/mercadopago`,
    };
    const result = await paymentInstance.create({ body });
    const { id, status, point_of_interaction } = result.body;
    const pixInfo = point_of_interaction?.transaction_data || {};
    // Salva info PIX no pagamento
    await pagamentoRepository.updatePagamento(pagamento._id, {
        externalId: id,
        status: 'Aguardando Pagamento',
        pix: {
            qr_code: pixInfo.qr_code,
            qr_code_base64: pixInfo.qr_code_base64,
            copia_cola: pixInfo.qr_code,
        },
        gatewayResponse: result.body
    });
    return {
        qr_code: pixInfo.qr_code,
        qr_code_base64: pixInfo.qr_code_base64,
        copia_cola: pixInfo.qr_code,
        payment_id: id,
        status,
    };
};

// Novo: criar pagamento com cartão de crédito Mercado Pago
const criarPagamentoCartaoMercadoPago = async (pagamento, nomeCliente, valorTotal, cardToken, installments = 1, payer = {}) => {
    // payer: { email, identification: { type, number }, first_name, last_name }
    if (!cardToken || !payer?.email) {
        throw new Error('Dados do cartão ou pagador incompletos');
    }
    const body = {
        transaction_amount: valorTotal,
        token: cardToken,
        description: `Pedido Fox Uniformes - ${nomeCliente}`,
        installments: installments || 1,
        payment_method_id: 'credit_card',
        payer: {
            email: payer.email,
            identification: payer.identification,
            first_name: payer.first_name || nomeCliente,
            last_name: payer.last_name || '',
        },
        external_reference: pagamento._id.toString(),
        notification_url: `${BACKEND_URL}/api/webhook/mercadopago`,
    };
    const result = await paymentInstance.create({ body });
    const { id, status, status_detail } = result.body;
    // Salva info cartão no pagamento
    await pagamentoRepository.updatePagamento(pagamento._id, {
        externalId: id,
        status: status === 'approved' ? 'Aprovado' : 'Aguardando Pagamento',
        metodoPagamento: 'Cartão de Crédito',
        parcelas: installments || 1,
        gatewayResponse: result.body
    });
    // Se aprovado, atualizar status dos pedidos
    if (status === 'approved') {
        await atualizarStatusPedidos(pagamento.pedidos, 'Em Progresso');
    }
    return {
        payment_id: id,
        status,
        status_detail,
    };
};

// Novo: enviar email de confirmação de pagamento cartão
const enviarEmailPagamentoCartao = async (email, nomeCliente, valorTotal, cardData) => {
    const resend = createResendClient();
    if (!resend) {
        console.log('=== EMAIL CARTÃO (DEBUG - SEM CONFIGURAÇÃO) ===');
        console.log(`Para: ${email}`);
        console.log(`Cliente: ${nomeCliente}`);
        console.log(`Valor: R$ ${valorTotal.toFixed(2)}`);
        console.log(`Status: ${cardData.status}`);
        return true;
    }
    const htmlContent = `
    <html><body style="font-family: Arial, sans-serif;">
    <h2>Pagamento com Cartão de Crédito</h2>
    <p>Olá <b>${nomeCliente}</b>!</p>
    <p>Seu pagamento foi processado.</p>
    <p>Status: <b>${cardData.status}</b></p>
    <p>Valor: <b>R$ ${valorTotal.toFixed(2)}</b></p>
    <p>Assim que o pagamento for confirmado, seu pedido será processado automaticamente.</p>
    <p>Obrigado!</p>
    </body></html>
    `;
    try {
        const { data, error } = await resend.emails.send({
            from: EMAIL_FROM,
            to: email,
            subject: `🦊 Fox Uniformes - Pagamento com Cartão` ,
            html: htmlContent,
        });
        if (error) {
            console.error('❌ Erro ao enviar email cartão:', error);
            return false;
        }
        console.log(`✅ Email cartão enviado para ${email} (ID: ${data?.id})`);
        return true;
    } catch (error) {
        console.error('❌ Erro ao enviar email cartão:', error);
        return false;
    }
};

// Cancelar pagamento
const cancelarPagamento = async (pagamentoId) => {
    return await pagamentoRepository.updatePagamento(pagamentoId, {
        status: 'Cancelado',
    });
};

export default {
    getAllPagamentos,
    getPagamentoById,
    getPagamentosByCliente,
    getPagamentosPendentes,
    criarPagamento,
    processarWebhookPagamento,
    confirmarPagamentoManual,
    cancelarPagamento,
    atualizarStatusPedidos,
    criarPagamentoPixMercadoPago,
    confirmarPagamentoPorExternalId,
};
