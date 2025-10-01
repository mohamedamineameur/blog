import { Sequelize } from 'sequelize';

export function setupAssociations(sequelize: Sequelize): void {
  const { User } = sequelize.models;
  const { Category } = sequelize.models;
  const { Article } = sequelize.models;
  const { LikeArticle } = sequelize.models;
  const { CommentArticle } = sequelize.models;

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

  // Association User -> LikeArticle (One-to-Many)
  User.hasMany(LikeArticle, {
    foreignKey: 'userId',
    as: 'LikeArticles'
  });
  LikeArticle.belongsTo(User, {
    foreignKey: 'userId',
    as: 'User'
  });

  // Association Article -> LikeArticle (One-to-Many)
  Article.hasMany(LikeArticle, {
    foreignKey: 'articleId',
    as: 'LikeArticles'
  });
  LikeArticle.belongsTo(Article, {
    foreignKey: 'articleId',
    as: 'Article'
  });

  // Association User -> CommentArticle (One-to-Many)
  User.hasMany(CommentArticle, {
    foreignKey: 'userId',
    as: 'CommentArticles'
  });
  CommentArticle.belongsTo(User, {
    foreignKey: 'userId',
    as: 'User'
  });

  // Association Article -> CommentArticle (One-to-Many)
  Article.hasMany(CommentArticle, {
    foreignKey: 'articleId',
    as: 'CommentArticles'
  });
  CommentArticle.belongsTo(Article, {
    foreignKey: 'articleId',
    as: 'Article'
  });

  // Association CommentArticle -> CommentArticle (Self-referencing for replies)
  CommentArticle.hasMany(CommentArticle, {
    foreignKey: 'parentId',
    as: 'Replies'
  });
  CommentArticle.belongsTo(CommentArticle, {
    foreignKey: 'parentId',
    as: 'Parent'
  });
}
