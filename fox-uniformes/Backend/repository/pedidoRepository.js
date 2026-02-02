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

// Adiciona dias úteis preservando o horário/hora do startDate
const addBusinessDaysKeepTime = (startDate, days) => {
    const date = new Date(startDate);
    let added = 0;
    while (added < days) {
        date.setDate(date.getDate() + 1);
        const day = date.getDay();
        if (day !== 0 && day !== 6) {
            added++;
        }
    }
    // preserva horas, minutos, segundos e ms do startDate
    return date;
};

// Retorna se o dia é útil (segunda a sexta)
const isBusinessDay = (d) => {
    const day = d.getDay();
    return day !== 0 && day !== 6;
};

// Retorna a próxima data útil (sem horário) iniciando às workStartHour
const nextBusinessDayStart = (d, workStartHour = 9) => {
    const date = new Date(d);
    // move para próximo dia
    date.setDate(date.getDate() + 1);
    // avança até dia útil
    while (!isBusinessDay(date)) date.setDate(date.getDate() + 1);
    date.setHours(workStartHour, 0, 0, 0);
    return date;
};

// Ajusta para o início do dia útil atual (workStartHour) se antes do horário
const startOfBusinessDay = (d, workStartHour = 9) => {
    const date = new Date(d);
    date.setHours(workStartHour, 0, 0, 0);
    return date;
};

// Adiciona horas úteis a uma data, respeitando janela diária (workStartHour..workEndHour) e pulando finais de semana
const addBusinessTime = (startDate, hoursToAdd, workStartHour = 9, workEndHour = 18) => {
    let remaining = Number(hoursToAdd) || 0;
    if (remaining <= 0) return new Date(startDate);

    let current = new Date(startDate);

    // Se não for dia útil, avançar para próximo dia útil às workStartHour
    if (!isBusinessDay(current)) {
        current = nextBusinessDayStart(current, workStartHour);
    }

    // Se antes do horário de trabalho, ajustar para início do expediente
    const todayStart = new Date(current);
    todayStart.setHours(workStartHour, 0, 0, 0);
    const todayEnd = new Date(current);
    todayEnd.setHours(workEndHour, 0, 0, 0);

    if (current < todayStart) {
        current = new Date(todayStart);
    } else if (current >= todayEnd) {
        // inicia no próximo dia útil às 09:00
        current = nextBusinessDayStart(current, workStartHour);
    }

    while (remaining > 0) {
        // garante limites do dia atual
        const endOfToday = new Date(current);
        endOfToday.setHours(workEndHour, 0, 0, 0);

        const availableMs = endOfToday - current;
        const availableHours = Math.max(0, availableMs / (1000 * 60 * 60));

        if (availableHours <= 0) {
            // avança para próximo dia útil
            current = nextBusinessDayStart(current, workStartHour);
            continue;
        }

        const take = Math.min(availableHours, remaining);
        current = new Date(current.getTime() + take * 60 * 60 * 1000);
        remaining -= take;

        // se ainda resta, avançar para próximo dia útil às workStartHour
        if (remaining > 0) {
            current = nextBusinessDayStart(current, workStartHour);
        }
    }

    return current;
};

// Estima a entrega com base no total de peças do pedido (totalPieces)
const estimateEntregaFromPieces = (totalPieces) => {
    const pieces = Number(totalPieces) || 0;
    // 2.5 horas por peça
    const totalHours = pieces * 2.5;
    // janela de trabalho: 09:00 - 18:00 (9 horas por dia úteis)
    const workDayHours = 9;

    // Determina o início da produção: se agora estiver fora do expediente, começa no próximo dia útil às 09:00
    const now = new Date();
    let start = new Date(now);

    // se hoje não for dia útil -> próximo dia útil às 09:00
    if (!isBusinessDay(start)) {
        start = nextBusinessDayStart(start, 9);
    } else {
        // hoje é dia útil -> checar horário
        const todayStart = new Date(start);
        todayStart.setHours(9,0,0,0);
        const todayEnd = new Date(start);
        todayEnd.setHours(18,0,0,0);

        if (start < todayStart) {
            start = todayStart;
        } else if (start >= todayEnd) {
            // inicia no próximo dia útil às 09:00
            start = nextBusinessDayStart(start, 9);
        }
    }

    // Se não houver peças (0), considerar 0 horas de produção -> entrega = próximo dia útil + 1 dia logístico
    const productionEnd = addBusinessTime(start, totalHours, 9, 18);

    // adicionar 1 dia útil para logística/entrega preservando horário do fim de produção
    const entregaDate = addBusinessDaysKeepTime(productionEnd, 1);
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
