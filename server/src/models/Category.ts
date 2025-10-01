import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

// Interface pour les attributs de Category
export interface CategoryAttributes {
  id: string;
  name: string;
  description: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Interface pour les attributs optionnels lors de la création
export type CategoryCreationAttributes = Optional<CategoryAttributes, 'id' | 'createdAt' | 'updatedAt'>;

// Classe du modèle Category
export class Category extends Model<CategoryAttributes, CategoryCreationAttributes> implements CategoryAttributes {
  public id!: string;
  public name!: string;
  public description!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// Fonction d'initialisation du modèle
export function initCategoryModel(sequelize: Sequelize): void {
  Category.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
          len: [1, 100]
        }
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true
        }
      }
    },
    {
      sequelize,
      modelName: 'Category',
      tableName: 'categories',
      timestamps: true,
      paranoid: false, // Pas de suppression douce car jamais supprimé
      indexes: [
        {
          unique: true,
          fields: ['name']
        }
      ]
    }
  );
}

export default Category;
