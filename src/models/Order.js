/**
 * Order Model
 * Follows: Data modeling best practices from DDIA
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');

const Order = sequelize.define(
  'Order',
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
    tableName: 'orders',
    indexes: [
      // TODO: Add indexes for query performance
      // {
      //   fields: ['name'],
      // },
    ],
  }
);

// TODO: Define associations here
// Order.associate = (models) => {
//   Order.belongsTo(models.User, { as: 'user', foreignKey: 'userId' });
// };

module.exports = Order;
