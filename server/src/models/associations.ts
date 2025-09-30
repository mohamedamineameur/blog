import { Sequelize } from 'sequelize';

export function setupAssociations(sequelize: Sequelize): void {
  const { User } = sequelize.models;
  const { Category } = sequelize.models;
  const { Article } = sequelize.models;

  // Association User -> Article (One-to-Many)
  User.hasMany(Article, {
    foreignKey: 'userId',
    as: 'Articles'
  });
  Article.belongsTo(User, {
    foreignKey: 'userId',
    as: 'User'
  });

  // Association Category -> Article (One-to-Many)
  Category.hasMany(Article, {
    foreignKey: 'categoryId',
    as: 'Articles'
  });
  Article.belongsTo(Category, {
    foreignKey: 'categoryId',
    as: 'Category'
  });
}
