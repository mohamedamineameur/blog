import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

// Interface pour les attributs de CommentArticle
export interface CommentArticleAttributes {
  id: string;
  userId: string;
  articleId: string;
  content: string;
  parentId?: string | null;
  isApproved: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Interface pour les attributs optionnels lors de la création
export type CommentArticleCreationAttributes = Optional<CommentArticleAttributes, 'id' | 'parentId' | 'isApproved' | 'createdAt' | 'updatedAt'>;

// Classe du modèle CommentArticle
export class CommentArticle extends Model<CommentArticleAttributes, CommentArticleCreationAttributes> implements CommentArticleAttributes {
  public id!: string;
  public userId!: string;
  public articleId!: string;
  public content!: string;
  public parentId!: string | null;
  public isApproved!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// Fonction d'initialisation du modèle
export function initCommentArticleModel(sequelize: Sequelize): void {
  CommentArticle.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      articleId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'articles',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [1, 2000] // Limite de 2000 caractères
        }
      },
      parentId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'comment_articles',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      isApproved: {
        type: DataTypes.BOOLEAN,
        defaultValue: true, // Les commentaires sont approuvés par défaut
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: 'CommentArticle',
      tableName: 'comment_articles',
      timestamps: true,
      paranoid: false,
      indexes: [
        {
          fields: ['userId']
        },
        {
          fields: ['articleId']
        },
        {
          fields: ['parentId']
        },
        {
          fields: ['isApproved']
        },
        {
          fields: ['createdAt']
        }
      ]
    }
  );
}

export default CommentArticle;
