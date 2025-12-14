import clienteRepository from '../repository/clienteRepository.js';

const getAllClientes = async () => {
    return await clienteRepository.getAllClientes();
};

const getClientesByVendedor = async (vendedorId) => {
    return await clienteRepository.getClientesByVendedor(vendedorId);
};

const getCliente = async (id) => {
    return await clienteRepository.getCliente(id);
};

const saveCliente = async (clienteData) => {
    return await clienteRepository.saveCliente(clienteData);
};

const updateCliente = async (id, clienteData) => {
    return await clienteRepository.updateCliente(id, clienteData);
};

const deleteCliente = async (id) => {
    return await clienteRepository.deleteCliente(id);
};

export default {
    getAllClientes,
    getClientesByVendedor,
    getCliente,
    saveCliente,
    updateCliente,
    deleteCliente
};
