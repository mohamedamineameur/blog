import { DataTypes, Model, Optional, Sequelize } from 'sequelize';
import { User } from './User';

export interface SessionAttributes {
  id: string;
  userId: string;
  tokenHash: string;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export type SessionCreationAttributes = Optional<SessionAttributes, 'id' | 'isActive' | 'expiresAt'>;

export class Session extends Model<SessionAttributes, SessionCreationAttributes> implements SessionAttributes {
  public id!: string;
  public userId!: string;
  public tokenHash!: string;
  public ipAddress!: string;
  public userAgent!: string;
  public isActive!: boolean;
  public expiresAt!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initSessionModel(sequelize: Sequelize): typeof Session {
  Session.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      tokenHash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      ipAddress: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      userAgent: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Session',
      tableName: 'sessions',
      timestamps: true,
      indexes: [
        {
          fields: ['tokenHash'],
        },
        {
          fields: ['expiresAt'],
        },
        {
          fields: ['userId'],
        },
      ],
    }
  );

  // Définir les associations
  Session.belongsTo(User, { foreignKey: 'userId', as: 'User' });
  User.hasMany(Session, { foreignKey: 'userId', as: 'Sessions' });

  return Session;
}

export default Session;
