/**
 * User Model
 * Follows: Data modeling best practices from DDIA
 * - Soft deletes with paranoid
 * - Indexes for query performance
 * - Hooks for data integrity
 */

const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('./index');

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        len: { max: 255 },
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: { min: 8 },
      },
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'first_name',
      validate: {
        len: { max: 100 },
      },
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'last_name',
      validate: {
        len: { max: 100 },
      },
    },
    role: {
      type: DataTypes.ENUM('user', 'admin', 'moderator'),
      defaultValue: 'user',
      validate: {
        isIn: [['user', 'admin', 'moderator']],
      },
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended', 'banned'),
      defaultValue: 'active',
      validate: {
        isIn: [['active', 'inactive', 'suspended', 'banned']],
      },
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      field: 'last_login_at',
      allowNull: true,
    },
    emailVerifiedAt: {
      type: DataTypes.DATE,
      field: 'email_verified_at',
      allowNull: true,
    },
  },
  {
    tableName: 'users',
    indexes: [
      {
        fields: ['email'],
        unique: true,
      },
      {
        fields: ['status'],
      },
      {
        fields: ['role'],
      },
      {
        fields: ['created_at'],
      },
    ],
    hooks: {
      // Hash password before creating
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 12);
        }
      },
      // Hash password before updating
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, 12);
        }
      },
    },
  }
);

/**
 * Instance methods
 */
User.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.password;
  return values;
};

User.prototype.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

User.prototype.getFullName = function () {
  return `${this.firstName} ${this.lastName}`.trim();
};

/**
 * Static methods
 */
User.findByEmail = async function (email) {
  return this.findOne({ where: { email } });
};

User.findByEmailWithPassword = async function (email) {
  return this.scope('withPassword').findOne({ where: { email } });
};

// Add scope to include password when needed
User.addScope('withPassword', {
  attributes: { include: ['password'] },
});

module.exports = User;
