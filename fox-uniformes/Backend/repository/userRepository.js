import user from '../models/user.js';

const getUser = async (id) => {
    try {
        return await user.findById(id);
    } catch (error) {
        throw new Error(error);
    }
}

const getAllUsers = async () => {
    try {
        const users = await user.find();
        return users;
    } catch (error) {
        throw new Error(error);
    }
}

const saveUser = async ({name, login, dataNascimento, telefone, endereco, role, password}) => {
    try {
        const newUser = new user({name, login, dataNascimento, telefone, endereco, role, password});
        await newUser.save();
        return newUser;
    } catch (error) {
        throw new Error(error);
    }
}
const updateUser = async (id, {name, login, dataNascimento, telefone, endereco, role, password}) => {
    try {
        const updatedUser = await user.findByIdAndUpdate(id, {name, login, dataNascimento, telefone, endereco, role, password}, {new: true});
        return updatedUser;
    } catch (error) {
        throw new Error(error);
    }
}

const deleteUser = async (id) => {
    try {
        await user.findByIdAndDelete(id);
    } catch (error) {
        throw new Error(error);
    }
}

const findByLogin = async (login) => {
    try {
        return await user.findOne({login});
    } catch (error) {
        throw new Error(error);
    }
}

const userRepository = {
    getUser,
    getAllUsers,
    findByLogin,
    saveUser,
    updateUser,
    deleteUser
};

export default userRepository;
