import pedido from '../models/pedido.js';

const getPedido = async (id) => {
    try {
        return await pedido.findById(id).populate('items.produtoId').populate('vendedorId', 'name login');
    } catch (error) {
        throw new Error(error);
    }
}

const getAllPedidos = async () => {
    try {
        return await pedido.find().populate('items.produtoId').populate('vendedorId', 'name login');
    } catch (error) {
        throw new Error(error);
    }
}

const getPedidosByVendedor = async (vendedorId) => {
    try {
        return await pedido.find({ vendedorId }).populate('items.produtoId').populate('vendedorId', 'name login');
    } catch (error) {
        throw new Error(error);
    }
}

const getPedidosByCliente = async (clienteId) => {
    try {
        return await pedido.find({ clienteId }).populate('items.produtoId').populate('vendedorId', 'name login');
    } catch (error) {
        throw new Error(error);
    }
}

const estimateEntregaISO = (quantidade) => {
    // Regra simples de estimativa:
    // - tempo base de processamento: 2 dias
    // - adiciona 0.1 dia (~2.4h) por peça
    // Ajuste conforme necessidade
    const baseDays = 2;
    const extraDays = quantidade * 0.1; // 0.1 dia por peça
    const totalDays = Math.ceil(baseDays + extraDays);
    const entregaDate = new Date(Date.now() + totalDays * 24 * 60 * 60 * 1000);
    return entregaDate.toISOString();
};

// Adiciona dias úteis a uma data (pula sábados e domingos)
const addBusinessDays = (startDate, days) => {
    const date = new Date(startDate);
    let added = 0;
    while (added < days) {
        date.setDate(date.getDate() + 1);
        const day = date.getDay();
        if (day !== 0 && day !== 6) {
            added++;
        }
    }
    // return midnight of that day
    date.setHours(0,0,0,0);
    return date;
};

// Estima a entrega com base no total de peças do pedido (totalPieces)
const estimateEntregaFromPieces = (totalPieces) => {
    const pieces = Number(totalPieces) || 0;
    // 1.5 hora por peça
    const totalHours = pieces * 1.5;
    // converte em dias úteis (8 horas por dia)
    const daysForWork = totalHours / 8;
    // arredonda para cima dias completos de trabalho
    const roundedWorkDays = Math.ceil(daysForWork || 0);
    // adiciona 1 dia extra para logística/entrega
    const totalBusinessDays = roundedWorkDays + 1;
    // calcula data final pulando fins de semana
    const entregaDate = addBusinessDays(new Date(), totalBusinessDays);
    return entregaDate.toISOString();
};

const savePedido = async ({nomeCliente, clienteId, vendedorId, produtoId, tamanho, quantidade, status, preco, entrega, photo, observacoes, precoOriginal, cupomAplicado, descontoAplicado, items}) => {
    try {
        // Se items foi fornecido, agregamos para calcular quantidade total e preco
        let totalPieces = 0;
        let totalPreco = preco || 0;
        let precoOrig = precoOriginal || 0;

        if (Array.isArray(items) && items.length > 0) {
            totalPieces = items.reduce((acc, it) => acc + (Number(it.quantidade) || 0), 0);
            totalPreco = items.reduce((acc, it) => acc + (Number(it.precoTotal) || 0), 0);
            precoOrig = totalPreco;
        } else {
            totalPieces = Number(quantidade) || 1;
            totalPreco = Number(preco) || 0;
            precoOrig = precoOriginal || totalPreco;
        }

        // Se entrega não foi informada, calcular automaticamente com base no total de peças (soma)
        const entregaFinal = entrega && entrega !== '' ? entrega : estimateEntregaFromPieces(totalPieces || 1);

        const pedidoData = {
            nomeCliente,
            clienteId,
            vendedorId,
            produtoId: produtoId || null,
            tamanho: tamanho || null,
            quantidade: totalPieces,
            items: Array.isArray(items) && items.length > 0 ? items : undefined,
            status,
            preco: totalPreco,
            precoOriginal: precoOrig,
            cupomAplicado,
            descontoAplicado,
            entrega: entregaFinal,
            photo,
            observacoes
        };

        const newPedido = new pedido(pedidoData);
        await newPedido.save();
        return newPedido;
    } catch (error) {
        throw new Error(error);
    }
}

const updatePedido = async (id, updateData) => {
    try {
        const updatedPedido = await pedido.findByIdAndUpdate(id, updateData, {new: true});
        return updatedPedido;
    } catch (error) {
        throw new Error(error);
    }
}

const deletePedido = async (id) => {
    try {
        await pedido.findByIdAndDelete(id);
    } catch (error) {
        throw new Error(error);
    }
}

const pedidoRepository = {
    getPedido,
    getAllPedidos,
    getPedidosByVendedor,
    getPedidosByCliente,
    savePedido,
    updatePedido,
    deletePedido,
    estimateEntregaFromPieces
};

export default pedidoRepository;
