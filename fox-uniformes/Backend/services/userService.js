import userRepository from "../repository/userRepository.js";

const getUser = async (id) => {
    return await userRepository.getUser(id);
};

const getAllUsers = async () => {
    return await userRepository.getAllUsers();
};

const saveUser = async ({name, login, dataNascimento, telefone, endereco, role, password}) => {
    return await userRepository.createUser({name, login, dataNascimento, telefone, endereco, role, password});
};

const updateUser = async (id, {name, login, dataNascimento, telefone, endereco, role, password}) => {
    return await userRepository.updateUser(id, {name, login, dataNascimento, telefone, endereco, role, password});
};

const deleteUser = async (id) => {
    return await userRepository.deleteUser(id);
};

const findByLogin = async (login) => {
    return await userRepository.findByLogin(login);
}

const userService = {
    getUser,
    getAllUsers,
    saveUser,
    updateUser,
    deleteUser,
    findByLogin
};

export default userService;
