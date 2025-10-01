import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { Op } from 'sequelize';
import { AuthenticatedRequest } from '../middleware/auth';

// Interfaces pour les requêtes
export interface IReqCreateUser {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  isAdmin?: boolean;
}

export interface IReqUpdateUser {
  firstname?: string;
  lastname?: string;
  email?: string;
  password?: string;
  isAdmin?: boolean;
  isEmailVerified?: boolean;
  isBanned?: boolean;
}

export interface IReqVerifyEmail {
  otp: string;
}

export interface IReqChangePassword {
  currentPassword: string;
  newPassword: string;
}

export interface IReqToggleBan {
  isBanned: boolean;
}

export interface IReqUserParams {
  id: string;
}

// Interfaces pour les réponses
export interface IResUser {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  isAdmin: boolean;
  isEmailVerified: boolean;
  isBanned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IResCreateUser {
  success: boolean;
  message: string;
  data: IResUser;
}

export interface IResGetUsers {
  success: boolean;
  data: IResPaginatedResponse<IResUser>;
}

export interface IResGetUser {
  success: boolean;
  data: IResUser;
}

export interface IResUpdateUser {
  success: boolean;
  message: string;
  data: IResUser;
}

export interface IResDeleteUser {
  success: boolean;
  message: string;
}

export interface IResVerifyEmail {
  success: boolean;
  message: string;
}

export interface IResChangePassword {
  success: boolean;
  message: string;
}

export interface IResToggleBan {
  success: boolean;
  message: string;
}

// Interface pour les paramètres de pagination
export interface IReqPaginationParams {
  page: number;
  limit: number;
  search?: string;
  isAdmin?: boolean;
  isEmailVerified?: boolean;
  isBanned?: boolean;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
}

// Interface pour la réponse paginée
export interface IResPaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Générer un OTP de 6 chiffres
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Créer un utilisateur
export const createUser = async (req: Request<IReqUserParams, IResCreateUser, IReqCreateUser>, res: Response<IResCreateUser>): Promise<void> => {
  try {
    const userData: IReqCreateUser = req.body;
    
    // Vérifier si l'email existe déjà
    const existingUser = await User.findOne({ where: { email: userData.email } });
    if (existingUser) {
      res.status(409).json({
        success: false,
        message: 'Un utilisateur avec cet email existe déjà',
        data: {} as IResUser
      });
      return;
    }

    // Hasher le mot de passe
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

    // Générer un OTP pour la vérification d'email
    const userOtp = generateOTP();

    // Créer l'utilisateur
    const newUser = await User.create({
      ...userData,
      password: hashedPassword,
      otp: userOtp,
      isAdmin: userData.isAdmin || false,
      isEmailVerified: false,
      isBanned: false
    });

    // Retourner l'utilisateur sans le mot de passe et l'OTP
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, otp: _otp, ...userResponse } = newUser.toJSON();
    
    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      data: userResponse as IResUser
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Erreur lors de la création de l\'utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
      data: {} as IResUser
    });
  }
};

// Obtenir tous les utilisateurs avec pagination et filtres
export const getUsers = async (req: Request<IReqUserParams, IResGetUsers, IReqPaginationParams>, res: Response<IResGetUsers>): Promise<void> => {
  try {
    const {
      page,
      limit,
      search,
      isAdmin,
      isEmailVerified,
      isBanned,
      sortBy,
      sortOrder
    } = (req as unknown as { validatedQuery?: IReqPaginationParams }).validatedQuery || (req.query as unknown as IReqPaginationParams);

    // Construire les conditions de recherche
    const whereConditions: Record<string, unknown> = {};
    if (search) {
      whereConditions[Op.or as unknown as string] = [
        { firstname: { [Op.like]: `%${search}%` } },
        { lastname: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (isAdmin !== undefined) {
      whereConditions.isAdmin = isAdmin;
    }
    
    if (isEmailVerified !== undefined) {
      whereConditions.isEmailVerified = isEmailVerified;
    }
    
    if (isBanned !== undefined) {
      whereConditions.isBanned = isBanned;
    }

    // Calculer l'offset pour la pagination
    const offset = (page - 1) * limit;

    // Obtenir les utilisateurs avec pagination
    const { count, rows } = await User.findAndCountAll({
      where: whereConditions,
      attributes: { exclude: ['password', 'otp'] },
      order: [[sortBy, sortOrder]],
      limit,
      offset
    });

    const totalPages = Math.ceil(count / limit);

    const response: IResPaginatedResponse<IResUser> = {
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages
      }
    };

    res.status(200).json({
      success: true,
      data: response
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({
      success: false,
      data: { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }
    });
  }
};

// Obtenir un utilisateur par ID
export const getUserById = async (req: Request<IReqUserParams, IResGetUser>, res: Response<IResGetUser>): Promise<void> => {
  try {
    // Pour les routes /me, utiliser l'ID de l'utilisateur authentifié
    const id = req.params.id || (req as unknown as AuthenticatedRequest).user?.id;

    if (!id) {
      res.status(400).json({
        success: false,
        data: {} as IResUser
      });
      return;
    }

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password', 'otp'] }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        data: {} as IResUser
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: user as IResUser
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    res.status(500).json({
      success: false,
      data: {} as IResUser
    });
  }
};

// Mettre à jour un utilisateur
export const updateUser = async (req: Request<IReqUserParams, IResUpdateUser, IReqUpdateUser>, res: Response<IResUpdateUser>): Promise<void> => {
  try {
    // Pour les routes /me, utiliser l'ID de l'utilisateur authentifié
    const id = req.params.id || (req as unknown as AuthenticatedRequest).user?.id;
    const updateData = req.body;

    // Vérifier si l'utilisateur existe
    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé',
        data: {} as IResUser
      });
      return;
    }

    // Si l'email est modifié, vérifier qu'il n'existe pas déjà
    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await User.findOne({ 
        where: { 
          email: updateData.email,
          id: { [Op.ne]: id }
        } 
      });
      
      if (existingUser) {
        res.status(409).json({
          success: false,
          message: 'Un utilisateur avec cet email existe déjà',
          data: {} as IResUser
        });
        return;
      }
    }

    // Si le mot de passe est modifié, le hasher
    if (updateData.password) {
      const saltRounds = 12;
      updateData.password = await bcrypt.hash(updateData.password, saltRounds);
    }

    // Mettre à jour l'utilisateur
    await user.update(updateData);

    // Récupérer l'utilisateur mis à jour sans le mot de passe et l'OTP
    const updatedUser = await User.findByPk(id, {
      attributes: { exclude: ['password', 'otp'] }
    });

    res.status(200).json({
      success: true,
      message: 'Utilisateur mis à jour avec succès',
      data: updatedUser as IResUser
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
      data: {} as IResUser
    });
  }
};

// Supprimer un utilisateur
export const deleteUser = async (req: Request<IReqUserParams, IResDeleteUser>, res: Response<IResDeleteUser>): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
      return;
    }

    await user.destroy();

    res.status(200).json({
      success: true,
      message: 'Utilisateur supprimé avec succès'
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Erreur lors de la suppression de l\'utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Vérifier l'email avec OTP
export const verifyEmail = async (req: Request<IReqUserParams, IResVerifyEmail, IReqVerifyEmail>, res: Response<IResVerifyEmail>): Promise<void> => {
  try {
    // Pour les routes /me, utiliser l'ID de l'utilisateur authentifié
    const id = req.params.id || (req as unknown as AuthenticatedRequest).user?.id;
    const { otp } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
      return;
    }

    if (user.isEmailVerified) {
      res.status(400).json({
        success: false,
        message: 'L\'email est déjà vérifié'
      });
      return;
    }

    if (user.otp !== otp) {
      res.status(400).json({
        success: false,
        message: 'Code OTP invalide'
      });
      return;
    }

    // Marquer l'email comme vérifié et supprimer l'OTP
    await user.update({
      isEmailVerified: true,
      otp: null
    });

    res.status(200).json({
      success: true,
      message: 'Email vérifié avec succès'
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Erreur lors de la vérification de l\'email:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Changer le mot de passe
export const changePassword = async (req: Request<IReqUserParams, IResChangePassword, IReqChangePassword>, res: Response<IResChangePassword>): Promise<void> => {
  try {
    // Pour les routes /me, utiliser l'ID de l'utilisateur authentifié
    const id = req.params.id || (req as unknown as AuthenticatedRequest).user?.id;
    const { currentPassword, newPassword } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
      return;
    }

    // Vérifier le mot de passe actuel
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      res.status(400).json({
        success: false,
        message: 'Mot de passe actuel incorrect'
      });
      return;
    }

    // Hasher le nouveau mot de passe
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Mettre à jour le mot de passe
    await user.update({ password: hashedNewPassword });

    res.status(200).json({
      success: true,
      message: 'Mot de passe changé avec succès'
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Erreur lors du changement de mot de passe:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Bannir/Débannir un utilisateur
export const toggleBanUser = async (req: Request<IReqUserParams, IResToggleBan, IReqToggleBan>, res: Response<IResToggleBan>): Promise<void> => {
  try {
    const { id } = req.params;
    const { isBanned } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
      return;
    }

    await user.update({ isBanned });

    res.status(200).json({
      success: true,
      message: `Utilisateur ${isBanned ? 'banni' : 'débanni'} avec succès`
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Erreur lors du changement de statut de bannissement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};
