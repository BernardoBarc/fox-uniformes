import cupomRepository from '../repository/cupomRepository.js';
import clienteRepository from '../repository/clienteRepository.js';
import emailService from './emailService.js';

// Criar novo cupom e notificar clientes
const criarCupom = async (cupomData, notificarClientes = true) => {
    // Verificar se código já existe
    const cupomExistente = await cupomRepository.findByCodigo(cupomData.codigo);
    if (cupomExistente) {
        throw new Error('Já existe um cupom com este código');
    }

    const novoCupom = await cupomRepository.save(cupomData);

    // Notificar todos os clientes via WhatsApp e E-mail
    if (notificarClientes) {
        await notificarClientesSobreCupom(novoCupom);
    }

    return novoCupom;
};

// Notificar clientes sobre novo cupom
const notificarClientesSobreCupom = async (cupom) => {
    try {
        const clientes = await clienteRepository.getAllClientes();
        const mensagem = `🎉 *FOX UNIFORMES - CUPOM DE DESCONTO!* 🎉\n\nTemos uma oferta especial para você!\n\n🏷️ *Cupom:* ${cupom.codigo}\n💰 *Desconto:* ${cupom.desconto}%\n${cupom.valorMinimo > 0 ? `📦 *Valor mínimo:* R$ ${cupom.valorMinimo.toFixed(2)}` : ''}\n${cupom.dataValidade ? `📅 *Válido até:* ${new Date(cupom.dataValidade).toLocaleDateString('pt-BR')}` : '✅ *Sem data de validade*'}\n\nAproveite esta oportunidade! 🛍️\n\n_Fox Uniformes - Qualidade que você veste!`;

        let enviados = 0;
        let erros = 0;

        for (const cliente of clientes) {
            // Envio E-mail
            if (cliente.email) {
                try {
                    await emailService.enviarCupom({
                        para: cliente.email,
                        nome: cliente.nome || cliente.razaoSocial || 'Cliente',
                        codigoCupom: cupom.codigo,
                        valorCupom: cupom.valorMinimo || 0,
                        desconto: cupom.desconto || 0,
                        validadeCupom: cupom.dataValidade ? new Date(cupom.dataValidade).toLocaleDateString('pt-BR') : 'Sem data de validade',
                        linkCompra: cupom.linkCompra || '',
                    });
                    enviados++;
                } catch (err) {
                    erros++;
                }
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
const validarCupom = async (codigo, valorPedido, clienteId = null) => {
    const cupom = await cupomRepository.findByCodigo(codigo);
    
    if (!cupom) {
        return { 
            valido: false, 
            mensagem: 'Cupom não encontrado',
            cupom: null 
        };
    }

    const validacao = cupom.isValido(valorPedido, clienteId);
    
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
            valorFinal: valorFinal,
            valorMinimo: cupom.valorMinimo || 0
        }
    };
};

// Aplicar cupom (incrementar uso)
const aplicarCupom = async (cupomId, clienteId = null) => {
    return await cupomRepository.incrementarUso(cupomId, clienteId);
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
