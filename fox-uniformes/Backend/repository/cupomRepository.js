import Cupom from "../models/cupom.js";

class CupomRepository {
    async save(cupom) {
        const novoCupom = new Cupom(cupom);
        return await novoCupom.save();
    }

    async findAll() {
        return await Cupom.find()
            .populate("criadoPor", "name login")
            .sort({ createdAt: -1 });
    }

    async findById(id) {
        return await Cupom.findById(id)
            .populate("criadoPor", "name login");
    }

    async findByCodigo(codigo) {
        return await Cupom.findOne({ codigo: codigo.toUpperCase() })
            .populate("criadoPor", "name login");
    }

    async findAtivos() {
        return await Cupom.find({ ativo: true })
            .populate("criadoPor", "name login")
            .sort({ createdAt: -1 });
    }

    async update(id, cupomData) {
        return await Cupom.findByIdAndUpdate(id, cupomData, { new: true })
            .populate("criadoPor", "name login");
    }

    async delete(id) {
        return await Cupom.findByIdAndDelete(id);
    }

    async incrementarUso(id, clienteId = null) {
        const cupom = await Cupom.findById(id);
        if (!cupom) return null;

        // Incrementa contador global
        cupom.vezesUsado = (cupom.vezesUsado || 0) + 1;

        // Incrementa contador por cliente
        if (clienteId) {
            cupom.usosPorCliente = cupom.usosPorCliente || [];
            const entry = cupom.usosPorCliente.find(u => String(u.cliente) === String(clienteId));
            if (entry) {
                entry.usos = (entry.usos || 0) + 1;
            } else {
                cupom.usosPorCliente.push({ cliente: clienteId, usos: 1 });
            }
        }

        await cupom.save();
        return cupom;
    }

    async desativar(id) {
        return await Cupom.findByIdAndUpdate(
            id, 
            { ativo: false },
            { new: true }
        );
    }

    async ativar(id) {
        return await Cupom.findByIdAndUpdate(
            id, 
            { ativo: true },
            { new: true }
        );
    }
}

export default new CupomRepository();
