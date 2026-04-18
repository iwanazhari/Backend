/**
 * Product Model
 * Follows: Data modeling best practices from DDIA
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');

const Product = sequelize.define(
  'Product',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    // TODO: Add your fields here
    // name: {
    //   type: DataTypes.STRING,
    //   allowNull: false,
    //   validate: {
    //     len: { max: 255 },
    //   },
    // },
  },
  {
    tableName: 'products',
    indexes: [
      // TODO: Add indexes for query performance
      // {
      //   fields: ['name'],
      // },
    ],
  }
);

// TODO: Define associations here
// Product.associate = (models) => {
//   Product.belongsTo(models.User, { as: 'user', foreignKey: 'userId' });
// };

module.exports = Product;
