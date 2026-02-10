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
    // workStartHour pode ser decimal (e.g. 8.5 == 08:30)
    const hour = Math.floor(workStartHour);
    const minutes = Math.round((workStartHour - hour) * 60);
    date.setHours(hour, minutes, 0, 0);
    return date;
};

// Ajusta para o início do dia útil atual (workStartHour) se antes do horário
const startOfBusinessDay = (d, workStartHour = 9) => {
    const date = new Date(d);
    const hour = Math.floor(workStartHour);
    const minutes = Math.round((workStartHour - hour) * 60);
    date.setHours(hour, minutes, 0, 0);
    return date;
};

// Helper: retorna os turnos (intervalos) de trabalho para um dia específico
const getWorkShiftsForDay = (date, morningStart = 8.5, morningEnd = 12, afternoonStart = 13.5, afternoonEnd = 18) => {
    const day = new Date(date);
    const ms = (h) => {
        const hour = Math.floor(h);
        const minutes = Math.round((h - hour) * 60);
        const d = new Date(day);
        d.setHours(hour, minutes, 0, 0);
        return d;
    };

    return [
        { start: ms(morningStart), end: ms(morningEnd) },
        { start: ms(afternoonStart), end: ms(afternoonEnd) }
    ];
};

// Adiciona horas úteis a uma data, respeitando janela diária com dois turnos e pulando finais de semana
const addBusinessTime = (startDate, hoursToAdd, morningStart = 8.5, morningEnd = 12, afternoonStart = 13.5, afternoonEnd = 18) => {
    let remaining = Number(hoursToAdd) || 0;
    if (remaining <= 0) return new Date(startDate);

    let current = new Date(startDate);

    // Avança para o próximo horário válido dentro dos turnos do dia
    const advanceToNextValid = () => {
        // se não for dia útil, ir para próximo dia útil e primeiro turno
        if (!isBusinessDay(current)) {
            current = nextBusinessDayStart(current, morningStart);
            return;
        }

        const shifts = getWorkShiftsForDay(current, morningStart, morningEnd, afternoonStart, afternoonEnd);

        // se antes do primeiro turno
        if (current < shifts[0].start) {
            current = new Date(shifts[0].start);
            return;
        }

        // se entre turnos, pular para inicio do segundo turno
        if (current >= shifts[0].end && current < shifts[1].start) {
            current = new Date(shifts[1].start);
            return;
        }

        // se após o último turno, ir para próximo dia útil primeiro turno
        if (current >= shifts[1].end) {
            current = nextBusinessDayStart(current, morningStart);
            return;
        }

        // se já está dentro de um turno, permanecer
    };

    // inicializar current para dentro de um turno válido
    advanceToNextValid();

    while (remaining > 0) {
        if (!isBusinessDay(current)) {
            current = nextBusinessDayStart(current, morningStart);
            continue;
        }

        const shifts = getWorkShiftsForDay(current, morningStart, morningEnd, afternoonStart, afternoonEnd);
        let inShift = null;

        if (current >= shifts[0].start && current < shifts[0].end) inShift = shifts[0];
        else if (current >= shifts[1].start && current < shifts[1].end) inShift = shifts[1];
        else {
            // not in a shift -> advance to next valid
            advanceToNextValid();
            continue;
        }

        const availableMs = inShift.end - current;
        const availableHours = Math.max(0, availableMs / (1000 * 60 * 60));

        if (availableHours <= 0) {
            // mover para próximo período
            current = new Date(inShift.end.getTime());
            continue;
        }

        const take = Math.min(availableHours, remaining);
        current = new Date(current.getTime() + take * 60 * 60 * 1000);
        remaining -= take;

        // se ainda resta, precisamos avançar para o próximo turno/dia
        if (remaining > 0) {
            // se estivermos no primeiro turno, pular para segundo turno do mesmo dia
            if (inShift === shifts[0]) {
                current = new Date(shifts[1].start.getTime());
            } else {
                // se já estava no segundo turno, avançar para próximo dia útil primeiro turno
                current = nextBusinessDayStart(current, morningStart);
            }
        }
    }

    return current;
};

// Ajusta uma data para o próximo horário dentro dos turnos de trabalho que seja >= da data fornecida.
// Garante dia útil e que a hora esteja dentro de um dos dois turnos (matutino ou vespertino).
const alignToBusinessWindowAtOrAfter = (date, morningStart = 8.5, morningEnd = 12, afternoonStart = 13.5, afternoonEnd = 18) => {
    let d = new Date(date);

    while (true) {
        if (!isBusinessDay(d)) {
            d = nextBusinessDayStart(d, morningStart);
            continue;
        }

        const shifts = getWorkShiftsForDay(d, morningStart, morningEnd, afternoonStart, afternoonEnd);
        const first = shifts[0];
        const second = shifts[1];

        if (d < first.start) {
            return new Date(first.start);
        }

        if (d >= first.start && d < first.end) {
            return d;
        }

        if (d >= first.end && d < second.start) {
            return new Date(second.start);
        }

        if (d >= second.start && d < second.end) {
            return d;
        }

        // d >= second.end -> carry overflow to next business day
        const overflowMs = d.getTime() - second.end.getTime();
        d = nextBusinessDayStart(d, morningStart);
        d = new Date(d.getTime() + overflowMs);
        // loop continua
    }
};

// Estima a entrega com base no total de peças do pedido (totalPieces)
const estimateEntregaFromPieces = (totalPieces) => {
    const pieces = Number(totalPieces) || 0;
    // 2.5 horas por peça
    const totalHours = pieces * 2.5;

    // Determina o início da produção: se agora estiver fora do expediente, começa no próximo dia útil no primeiro turno
    const now = new Date();
    let start = new Date(now);

    if (!isBusinessDay(start)) {
        start = nextBusinessDayStart(start, 8.5);
    } else {
        const shifts = getWorkShiftsForDay(start, 8.5, 12, 13.5, 18);
        if (start < shifts[0].start) {
            start = new Date(shifts[0].start);
        } else if (start >= shifts[1].end) {
            start = nextBusinessDayStart(start, 8.5);
        }
        // if between shifts and before afternoon start, start will be advanced by addBusinessTime
    }

    // calcula fim da produção em HORAS ÚTEIS (contando apenas turnos)
    const productionEnd = addBusinessTime(start, totalHours, 8.5, 12, 13.5, 18);

    // Em seguida, adicionar 24 HORAS ÚTEIS (24 horas de trabalho) antes da entrega
    const postProductionEnd = addBusinessTime(productionEnd, 24, 8.5, 12, 13.5, 18);

    // Garantir que a data final esteja dentro de um turno (alinha se necessário)
    const entregaDate = alignToBusinessWindowAtOrAfter(postProductionEnd, 8.5, 12, 13.5, 18);
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

        // Antes: calculava entrega mesmo para pedidos pendentes. Agora só calcular se já houver entrega informada
        // const entregaFinal = entrega && entrega !== '' ? entrega : estimateEntregaFromPieces(totalPieces || 1);
        // Não calcular entrega aqui se o pedido for criado com status 'Pendente'
        let entregaFinal = entrega && entrega !== '' ? entrega : undefined;

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

// Calcula e seta a data de entrega baseada nos itens do pedido — usada quando admin aceita o pedido
const calcularEAtualizarEntrega = async (pedidoId) => {
    try {
        const p = await pedido.findById(pedidoId);
        if (!p) throw new Error('Pedido não encontrado');
        const totalPieces = Array.isArray(p.items) && p.items.length > 0 ? p.items.reduce((acc, it) => acc + (Number(it.quantidade) || 0), 0) : (Number(p.quantidade) || 1);
        const entregaEstim = estimateEntregaFromPieces(totalPieces || 1);
        p.entrega = entregaEstim;
        await p.save();
        return p;
    } catch (err) {
        throw new Error(err);
    }
};

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
    estimateEntregaFromPieces,
    calcularEAtualizarEntrega
};

export default pedidoRepository;
