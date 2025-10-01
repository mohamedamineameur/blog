import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

// Interface pour les attributs de Article
export interface ArticleAttributes {
  id: string;
  userId: string;
  categoryId: string;
  title: string;
  content: string;
  status: 'draft' | 'published' | 'hided';
  createdAt?: Date;
  updatedAt?: Date;
}

// Interface pour les attributs optionnels lors de la création
export type ArticleCreationAttributes = Optional<ArticleAttributes, 'id' | 'createdAt' | 'updatedAt'>;

// Classe du modèle Article
export class Article extends Model<ArticleAttributes, ArticleCreationAttributes> implements ArticleAttributes {
  public id!: string;
  public userId!: string;
  public categoryId!: string;
  public title!: string;
  public content!: string;
  public status!: 'draft' | 'published' | 'hided';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// Fonction d'initialisation du modèle
export function initArticleModel(sequelize: Sequelize): void {
  Article.init(
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
      categoryId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'categories',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT' // Empêche la suppression d'une catégorie si elle a des articles
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [1, 200]
        }
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true
        }
      },
      status: {
        type: DataTypes.ENUM('draft', 'published', 'hided'),
        allowNull: false,
        defaultValue: 'draft',
        validate: {
          isIn: [['draft', 'published', 'hided']]
        }
      }
    },
    {
      sequelize,
      modelName: 'Article',
      tableName: 'articles',
      timestamps: true,
      paranoid: false,
      indexes: [
        {
          fields: ['userId']
        },
        {
          fields: ['categoryId']
        },
        {
          fields: ['status']
        },
        {
          fields: ['createdAt']
        }
      ]
    }
  );
}

export default Article;
