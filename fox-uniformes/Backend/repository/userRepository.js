import user from '../models/users.js';

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

const saveUser = async ({name, login, email, dataNascimento, telefone, endereco, role, password}) => {
    try {
        const newUser = new user({name, login, email, dataNascimento, telefone, endereco, role, password});
        await newUser.save();
        return newUser;
    } catch (error) {
        throw new Error(error);
    }
}
const updateUser = async (id, {name, login, email, dataNascimento, telefone, endereco, role, password}) => {
    try {
        const updatedUser = await user.findByIdAndUpdate(id, {name, login, email, dataNascimento, telefone, endereco, role, password}, {new: true});
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

// Novos métodos para recuperação de senha
const findByEmail = async (email) => {
    try {
        return await user.findOne({ email });
    } catch (error) {
        throw new Error(error);
    }
}

const saveResetToken = async (id, token, expires) => {
    try {
        return await user.findByIdAndUpdate(id, { resetToken: token, resetExpires: expires }, { new: true });
    } catch (error) {
        throw new Error(error);
    }
}

const findByResetToken = async (token) => {
    try {
        return await user.findOne({ resetToken: token, resetExpires: { $gt: new Date() } });
    } catch (error) {
        throw new Error(error);
    }
}

const updatePassword = async (id, hashedPassword) => {
    try {
        return await user.findByIdAndUpdate(id, { password: hashedPassword }, { new: true });
    } catch (error) {
        throw new Error(error);
    }
}

const clearResetToken = async (id) => {
    try {
        return await user.findByIdAndUpdate(id, { resetToken: null, resetExpires: null }, { new: true });
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
    deleteUser,
    findByEmail,
    saveResetToken,
    findByResetToken,
    updatePassword,
    clearResetToken
};

export default userRepository;
