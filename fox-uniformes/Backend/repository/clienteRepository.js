import Cliente from '../models/cliente.js';

const getAllClientes = async () => {
    return await Cliente.find().populate('vendedorId', 'name login');
};

const getClientesByVendedor = async (vendedorId) => {
    return await Cliente.find({ vendedorId }).populate('vendedorId', 'name login');
};

const getCliente = async (id) => {
    return await Cliente.findById(id).populate('vendedorId', 'name login');
};

const getClienteByCPF = async (cpf) => {
    // Remove formatação do CPF para buscar
    const cpfLimpo = cpf.replace(/\D/g, '');
    
    // Busca o CPF com ou sem formatação
    const cliente = await Cliente.findOne({ 
        $or: [
            { cpf: cpfLimpo },
            { cpf: { $regex: cpfLimpo, $options: 'i' } },
            { cpf: cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') }
        ]
    }).populate('vendedorId', 'name login');
    
    return cliente;
};

const saveCliente = async (clienteData) => {
    const cliente = new Cliente(clienteData);
    return await cliente.save();
};

const updateCliente = async (id, clienteData) => {
    return await Cliente.findByIdAndUpdate(id, clienteData, { new: true });
};

const deleteCliente = async (id) => {
    return await Cliente.findByIdAndDelete(id);
};

export default {
    getAllClientes,
    getClientesByVendedor,
    getCliente,
    getClienteByCPF,
    saveCliente,
    updateCliente,
    deleteCliente
};
