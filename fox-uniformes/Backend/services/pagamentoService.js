import pagamentoRepository from '../repository/pagamentoRepository.js';
import Pedido from '../models/pedido.js';
import Cliente from '../models/cliente.js';
import User from '../models/users.js';
import { gerarNotaFiscal, gerarNumeroNota, getUrlNotaFiscal } from './notaFiscalService.js';

// Configuração do Mercado Pago (você precisará configurar suas credenciais)
// import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

const MERCADO_PAGO_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN || '';
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || '';
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN || '';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

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
    const { clienteId, pedidos, valorTotal, telefone, nomeCliente } = pagamentoData;

    // Salvar pagamento no banco
    const pagamento = await pagamentoRepository.savePagamento({
        clienteId,
        pedidos,
        valorTotal,
        status: 'Pendente',
    });

    // Gerar link de pagamento
    let linkPagamento = '';
    
    try {
        // Se tiver Mercado Pago configurado, criar preferência de pagamento
        if (MERCADO_PAGO_ACCESS_TOKEN) {
            linkPagamento = await criarPreferenciaMercadoPago(pagamento, nomeCliente, valorTotal);
        } else {
            // Link temporário para página de pagamento interna
            linkPagamento = `${APP_URL}/pagamento/${pagamento._id}`;
        }

        // Atualizar pagamento com o link
        await pagamentoRepository.updatePagamento(pagamento._id, { linkPagamento });

        // Enviar WhatsApp se configurado
        if (telefone && (WHATSAPP_API_URL || true)) {
            await enviarWhatsApp(telefone, nomeCliente, valorTotal, linkPagamento);
            await pagamentoRepository.updatePagamento(pagamento._id, { 
                whatsappEnviado: true,
                whatsappEnviadoEm: new Date()
            });
        }

    } catch (error) {
        console.error('Erro ao gerar link de pagamento:', error);
    }

    return { pagamento, linkPagamento };
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
            success: `${APP_URL}/pagamento/sucesso/${pagamento._id}`,
            failure: `${APP_URL}/pagamento/falha/${pagamento._id}`,
            pending: `${APP_URL}/pagamento/pendente/${pagamento._id}`,
        },
        auto_return: 'approved',
        external_reference: pagamento._id.toString(),
        notification_url: `${APP_URL}/api/webhook/mercadopago`,
    };

    const response = await preference.create({ body: preferenceData });
    
    await pagamentoRepository.updatePagamento(pagamento._id, { 
        externalId: response.id,
        gatewayResponse: response 
    });

    return response.init_point; // URL de pagamento do Mercado Pago
    */

    // Retorna link temporário enquanto não tem Mercado Pago configurado
    return `${APP_URL}/pagamento/${pagamento._id}`;
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

// Enviar nota fiscal via WhatsApp
const enviarNotaFiscalWhatsApp = async (telefone, nomeCliente, numeroNota, urlNotaFiscal, cpfCliente) => {
    const telefoneFormatado = telefone.replace(/\D/g, '');
    const telefoneCompleto = telefoneFormatado.startsWith('55') 
        ? telefoneFormatado 
        : `55${telefoneFormatado}`;

    const linkAcompanhamento = `${APP_URL}/acompanhar`;

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

        urlNotaFiscal = `${APP_URL}${getUrlNotaFiscal(caminhoNotaFiscal)}`;
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

    // Enviar nota fiscal via WhatsApp
    if (cliente?.telefone && urlNotaFiscal) {
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
};
