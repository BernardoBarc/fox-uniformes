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
    saveCliente,
    updateCliente,
    deleteCliente
};
