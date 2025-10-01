import { Sequelize } from 'sequelize';

export function setupAssociations(sequelize: Sequelize): void {
  const { User: userModel } = sequelize.models;
  const { Category: categoryModel } = sequelize.models;
  const { Article: articleModel } = sequelize.models;
  const { LikeArticle: likeArticleModel } = sequelize.models;
  const { CommentArticle: commentArticleModel } = sequelize.models;

  if (!userModel || !articleModel || !categoryModel || !likeArticleModel || !commentArticleModel) {
    throw new Error('Required models not found in sequelize.models');
  }

  // Association User -> Article (One-to-Many)
  userModel.hasMany(articleModel, {
    foreignKey: 'userId',
    as: 'Articles'
  });
  articleModel.belongsTo(userModel, {
    foreignKey: 'userId',
    as: 'User'
  });

  // Association Category -> Article (One-to-Many)
  categoryModel.hasMany(articleModel, {
    foreignKey: 'categoryId',
    as: 'Articles'
  });
  articleModel.belongsTo(categoryModel, {
    foreignKey: 'categoryId',
    as: 'Category'
  });

  // Association User -> LikeArticle (One-to-Many)
  userModel.hasMany(likeArticleModel, {
    foreignKey: 'userId',
    as: 'LikeArticles'
  });
  likeArticleModel.belongsTo(userModel, {
    foreignKey: 'userId',
    as: 'User'
  });

  // Association Article -> LikeArticle (One-to-Many)
  articleModel.hasMany(likeArticleModel, {
    foreignKey: 'articleId',
    as: 'LikeArticles'
  });
  likeArticleModel.belongsTo(articleModel, {
    foreignKey: 'articleId',
    as: 'Article'
  });

  // Association User -> CommentArticle (One-to-Many)
  userModel.hasMany(commentArticleModel, {
    foreignKey: 'userId',
    as: 'CommentArticles'
  });
  commentArticleModel.belongsTo(userModel, {
    foreignKey: 'userId',
    as: 'User'
  });

  // Association Article -> CommentArticle (One-to-Many)
  articleModel.hasMany(commentArticleModel, {
    foreignKey: 'articleId',
    as: 'CommentArticles'
  });
  commentArticleModel.belongsTo(articleModel, {
    foreignKey: 'articleId',
    as: 'Article'
  });

  // Association CommentArticle -> CommentArticle (Self-referencing for replies)
  commentArticleModel.hasMany(commentArticleModel, {
    foreignKey: 'parentId',
    as: 'Replies'
  });
  commentArticleModel.belongsTo(commentArticleModel, {
    foreignKey: 'parentId',
    as: 'Parent'
  });
}
