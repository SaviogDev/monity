import * as authService from '../services/authService.js';

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const result = await authService.register({ name, email, password });

    res.status(201).json({
      success: true,
      message: 'Usuário cadastrado com sucesso',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// Função para atualizar a foto de perfil
export const updateAvatar = async (req, res) => {
  try {
    const { avatarUrl } = req.body;
    
    // O seu middleware "auth" provavelmente coloca o ID do usuário em req.userId ou req.user._id
    const userId = req.user?._id || req.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Não autorizado. ID não encontrado.' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId, 
      { avatarUrl },
      { new: true } // Retorna o usuário já atualizado
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }

    res.status(200).json({ success: true, avatarUrl: updatedUser.avatarUrl });
  } catch (error) {
    console.error('Erro ao atualizar avatar:', error);
    res.status(500).json({ success: false, message: 'Erro interno ao salvar a foto de perfil.' });
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });

    res.status(200).json({
      success: true,
      message: 'Login realizado com sucesso',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const getMe = (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
      },
    },
  });
};

export const updateMe = async (req, res, next) => {
  try {
    const { name } = req.body;

    const result = await authService.updateMe({
      userId: req.user._id,
      name,
    });

    res.status(200).json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const result = await authService.updatePassword({
      userId: req.user._id,
      currentPassword,
      newPassword,
    });

    res.status(200).json({
      success: true,
      message: 'Senha atualizada com sucesso',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};