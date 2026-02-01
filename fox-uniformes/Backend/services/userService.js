import userRepository from "../repository/userRepository.js";

const getUser = async (id) => {
    return await userRepository.getUser(id);
};

const getAllUsers = async () => {
    return await userRepository.getAllUsers();
};

const saveUser = async ({name, login, email, dataNascimento, telefone, endereco, role, password}) => {
    return await userRepository.saveUser({name, login, email, dataNascimento, telefone, endereco, role, password});
};

const updateUser = async (id, {name, login, email, dataNascimento, telefone, endereco, role, password}) => {
    return await userRepository.updateUser(id, {name, login, email, dataNascimento, telefone, endereco, role, password});
};

const deleteUser = async (id) => {
    return await userRepository.deleteUser(id);
};

const findByLogin = async (login) => {
    return await userRepository.findByLogin(login);
}

// Novas funções para reset de senha
const findByEmail = async (email) => {
    return await userRepository.findByEmail(email);
}

const saveResetToken = async (id, token, expires) => {
    return await userRepository.saveResetToken(id, token, expires);
}

const findByResetToken = async (token) => {
    return await userRepository.findByResetToken(token);
}

const updatePassword = async (id, hashedPassword) => {
    return await userRepository.updatePassword(id, hashedPassword);
}

const clearResetToken = async (id) => {
    return await userRepository.clearResetToken(id);
}

const userService = {
    getUser,
    getAllUsers,
    saveUser,
    updateUser,
    deleteUser,
    findByLogin,
    findByEmail,
    saveResetToken,
    findByResetToken,
    updatePassword,
    clearResetToken
};

export default userService;
