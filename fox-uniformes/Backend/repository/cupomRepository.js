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

    async incrementarUso(id) {
        return await Cupom.findByIdAndUpdate(
            id, 
            { $inc: { vezesUsado: 1 } },
            { new: true }
        );
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
