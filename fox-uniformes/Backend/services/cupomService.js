import cupomRepository from '../repository/cupomRepository.js';
import clienteRepository from '../repository/clienteRepository.js';

// Função para enviar mensagem WhatsApp (simulada - integrar com Evolution API)
const enviarWhatsApp = async (telefone, mensagem) => {
    const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL;
    const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;

    if (!WHATSAPP_API_URL || !WHATSAPP_API_TOKEN) {
        console.log(`[WhatsApp Simulado] Para: ${telefone}`);
        console.log(`[WhatsApp Simulado] Mensagem: ${mensagem}`);
        return { success: true, simulated: true };
    }

    try {
        const response = await fetch(`${WHATSAPP_API_URL}/message/sendText/fox-uniformes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': WHATSAPP_API_TOKEN
            },
            body: JSON.stringify({
                number: telefone.replace(/\D/g, ''),
                text: mensagem
            })
        });
        return { success: response.ok };
    } catch (error) {
        console.error('Erro ao enviar WhatsApp:', error);
        return { success: false, error };
    }
};

// Criar novo cupom e notificar clientes
const criarCupom = async (cupomData, notificarClientes = true) => {
    // Verificar se código já existe
    const cupomExistente = await cupomRepository.findByCodigo(cupomData.codigo);
    if (cupomExistente) {
        throw new Error('Já existe um cupom com este código');
    }

    const novoCupom = await cupomRepository.save(cupomData);

    // Notificar todos os clientes via WhatsApp
    if (notificarClientes) {
        await notificarClientesSobreCupom(novoCupom);
    }

    return novoCupom;
};

// Notificar clientes sobre novo cupom
const notificarClientesSobreCupom = async (cupom) => {
    try {
        const clientes = await clienteRepository.getAllClientes();
        
        const mensagem = `🎉 *FOX UNIFORMES - CUPOM DE DESCONTO!* 🎉

Temos uma oferta especial para você!

🏷️ *Cupom:* ${cupom.codigo}
💰 *Desconto:* ${cupom.desconto}%
${cupom.valorMinimo > 0 ? `📦 *Valor mínimo:* R$ ${cupom.valorMinimo.toFixed(2)}` : ''}
${cupom.dataValidade ? `📅 *Válido até:* ${new Date(cupom.dataValidade).toLocaleDateString('pt-BR')}` : '✅ *Sem data de validade*'}

Aproveite esta oportunidade! 🛍️

_Fox Uniformes - Qualidade que você veste!_`;

        let enviados = 0;
        let erros = 0;

        for (const cliente of clientes) {
            if (cliente.telefone) {
                const resultado = await enviarWhatsApp(cliente.telefone, mensagem);
                if (resultado.success) {
                    enviados++;
                } else {
                    erros++;
                }
                // Pequeno delay para não sobrecarregar a API
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        console.log(`Notificação de cupom enviada: ${enviados} sucesso, ${erros} erros`);
        return { enviados, erros, total: clientes.length };
    } catch (error) {
        console.error('Erro ao notificar clientes sobre cupom:', error);
        throw error;
    }
};

// Buscar todos os cupons
const getAllCupons = async () => {
    return await cupomRepository.findAll();
};

// Buscar cupons ativos
const getCuponsAtivos = async () => {
    return await cupomRepository.findAtivos();
};

// Buscar cupom por ID
const getCupom = async (id) => {
    return await cupomRepository.findById(id);
};

// Buscar cupom por código
const getCupomByCodigo = async (codigo) => {
    return await cupomRepository.findByCodigo(codigo);
};

// Validar cupom para uso
const validarCupom = async (codigo, valorPedido) => {
    const cupom = await cupomRepository.findByCodigo(codigo);
    
    if (!cupom) {
        return { 
            valido: false, 
            mensagem: 'Cupom não encontrado',
            cupom: null 
        };
    }

    const validacao = cupom.isValido(valorPedido);
    
    if (!validacao.valido) {
        return {
            valido: false,
            mensagem: validacao.mensagem,
            cupom: null
        };
    }

    const valorDesconto = cupom.calcularDesconto(valorPedido);
    const valorFinal = valorPedido - valorDesconto;

    return {
        valido: true,
        mensagem: `Cupom aplicado! Desconto de ${cupom.desconto}%`,
        cupom: {
            _id: cupom._id,
            codigo: cupom.codigo,
            desconto: cupom.desconto,
            valorDesconto: valorDesconto,
            valorFinal: valorFinal
        }
    };
};

// Aplicar cupom (incrementar uso)
const aplicarCupom = async (cupomId) => {
    return await cupomRepository.incrementarUso(cupomId);
};

// Atualizar cupom
const updateCupom = async (id, cupomData) => {
    return await cupomRepository.update(id, cupomData);
};

// Deletar cupom
const deleteCupom = async (id) => {
    return await cupomRepository.delete(id);
};

// Ativar cupom
const ativarCupom = async (id) => {
    return await cupomRepository.ativar(id);
};

// Desativar cupom
const desativarCupom = async (id) => {
    return await cupomRepository.desativar(id);
};

export default {
    criarCupom,
    getAllCupons,
    getCuponsAtivos,
    getCupom,
    getCupomByCodigo,
    validarCupom,
    aplicarCupom,
    updateCupom,
    deleteCupom,
    ativarCupom,
    desativarCupom,
    notificarClientesSobreCupom
};
