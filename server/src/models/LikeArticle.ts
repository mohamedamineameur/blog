import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

// Interface pour les attributs de LikeArticle
export interface LikeArticleAttributes {
  id: string;
  userId: string;
  articleId: string;
  type: 'like' | 'love' | 'care' | 'haha' | 'wow' | 'sad' | 'angry';
  createdAt?: Date;
  updatedAt?: Date;
}

// Interface pour les attributs optionnels lors de la création
export interface LikeArticleCreationAttributes extends Optional<LikeArticleAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

// Classe du modèle LikeArticle
export class LikeArticle extends Model<LikeArticleAttributes, LikeArticleCreationAttributes> implements LikeArticleAttributes {
  public id!: string;
  public userId!: string;
  public articleId!: string;
  public type!: 'like' | 'love' | 'care' | 'haha' | 'wow' | 'sad' | 'angry';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// Fonction d'initialisation du modèle
export function initLikeArticleModel(sequelize: Sequelize): void {
  LikeArticle.init(
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
      type: {
        type: DataTypes.ENUM('like', 'love', 'care', 'haha', 'wow', 'sad', 'angry'),
        allowNull: false,
        validate: {
          isIn: [['like', 'love', 'care', 'haha', 'wow', 'sad', 'angry']]
        }
      }
    },
    {
      sequelize,
      modelName: 'LikeArticle',
      tableName: 'like_articles',
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
          fields: ['type']
        },
        {
          unique: true,
          fields: ['userId', 'articleId'] // Un utilisateur ne peut liker qu'une fois un article
        }
      ]
    }
  );
}

export default LikeArticle;
