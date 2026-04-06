import * as authService from '../services/authService.js';
import User from '../models/User.js';
import { Resend } from 'resend';

// Inicializa o Resend. A chave virá do seu arquivo .env ou do servidor (Render/Railway)
const resend = new Resend(process.env.RESEND_API_KEY);

export const register = async (req, res, next) => {
  try {
    const { name, email, password, inviteCode } = req.body;

    // 1. TRAVA DE SEGURANÇA: Valida o código do convite VIP
    if (inviteCode !== 'MONITY2026') {
      return res.status(401).json({ 
        success: false, 
        message: 'Código de convite inválido ou expirado.' 
      });
    }

    // 2. GERAÇÃO DO CÓDIGO (6 dígitos aleatórios)
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpires = Date.now() + 10 * 60 * 1000; // Expira em 10 minutos

    // 3. Salva no banco (o status isVerified começa como false)
    const result = await authService.register({ 
      name, 
      email, 
      password,
      verificationCode,
      verificationCodeExpires
    });

    // 4. ENVIO DO E-MAIL DE VERDADE COM RESEND
    const { error } = await resend.emails.send({
      from: 'Monity <onboarding@plataformamonity.com.br>',
      to: email,
      subject: 'Seu código de acesso ao Monity 🚀',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <h2 style="color: #2563eb;">Olá, ${name}! Bem-vindo(a) ao Monity.</h2>
          <p>Você foi convidado(a) para acessar a nossa plataforma VIP.</p>
          <p>Seu código de verificação é:</p>
          <div style="background: #f4f4f5; padding: 15px 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <h1 style="letter-spacing: 5px; color: #2563eb; margin: 0;">${verificationCode}</h1>
          </div>
          <p>Este código é válido por 10 minutos.</p>
          <p>Se você não solicitou este acesso, pode ignorar este e-mail em segurança.</p>
        </div>
      `,
    });

    if (error) {
      console.error('Erro ao enviar e-mail pelo Resend:', error);
      // Mesmo se der erro no envio, não quebramos o app, mas o console avisa.
    }

    res.status(201).json({
      success: true,
      message: 'Usuário cadastrado com sucesso. Verifique seu e-mail!',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// --- ROTA DE VERIFICAÇÃO DO CÓDIGO ---
export const verifyEmail = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    
    const user = await User.findOne({
      email,
      verificationCode: code,
      verificationCodeExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Código inválido ou expirado.' 
      });
    }

    // Libera o usuário para o sistema
    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    res.status(200).json({ 
      success: true, 
      message: 'Conta verificada com sucesso! Você já pode fazer o login.' 
    });
  } catch (error) {
    console.error('Erro na verificação:', error);
    res.status(500).json({ success: false, message: 'Erro interno ao validar o código.' });
  }
};

// --- RESTANTE DAS FUNÇÕES (FOTO, LOGIN E PERFIL) ---
export const updateAvatar = async (req, res) => {
  try {
    const { avatarUrl } = req.body;
    const userId = req.user?._id || req.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Não autorizado. ID não encontrado.' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId, 
      { avatarUrl },
      { new: true } 
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
        isVerified: req.user.isVerified,
      },
    },
  });
};

export const updateMe = async (req, res, next) => {
  try {
    const { name } = req.body;
    const result = await authService.updateMe({ userId: req.user._id, name });
    res.status(200).json({ success: true, message: 'Perfil atualizado com sucesso', data: result });
  } catch (err) {
    next(err);
  }
};

export const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.updatePassword({ userId: req.user._id, currentPassword, newPassword });
    res.status(200).json({ success: true, message: 'Senha atualizada com sucesso', data: result });
  } catch (err) {
    next(err);
  }
};