/**
 * Refresh Token Model
 * For JWT token refresh functionality
 * Follows: Security best practices
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');
const User = require('./User');

const RefreshToken = sequelize.define(
  'RefreshToken',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    token: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: User,
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at',
    },
    revokedAt: {
      type: DataTypes.DATE,
      field: 'revoked_at',
      allowNull: true,
    },
    replacedByToken: {
      type: DataTypes.TEXT,
      field: 'replaced_by_token',
      allowNull: true,
    },
    reason: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Reason for revocation: logout, compromised, replaced',
    },
  },
  {
    tableName: 'refresh_tokens',
    indexes: [
      {
        fields: ['token'],
        unique: true,
      },
      {
        fields: ['user_id'],
      },
      {
        fields: ['expires_at'],
      },
    ],
    hooks: {
      // Auto-expire old tokens
      beforeCreate: (token) => {
        if (!token.expiresAt) {
          token.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        }
      },
    },
  }
);

/**
 * Instance methods
 */
RefreshToken.prototype.isExpired = function () {
  return this.expiresAt < new Date() || this.revokedAt !== null;
};

RefreshToken.prototype.revoke = function (reason = 'logout', replacedByToken = null) {
  this.revokedAt = new Date();
  this.reason = reason;
  this.replacedByToken = replacedByToken;
  return this.save();
};

/**
 * Static methods
 */
RefreshToken.findByToken = async function (token) {
  return this.findOne({
    where: { token },
    include: [{ model: User, as: 'user' }],
  });
};

RefreshToken.revokeUserTokens = async function (userId, reason = 'logout') {
  return this.update(
    {
      revokedAt: new Date(),
      reason,
    },
    {
      where: {
        userId,
        revokedAt: null,
      },
    }
  );
};

RefreshToken.deleteExpired = async function () {
  return this.destroy({
    where: {
      expiresAt: {
        [sequelize.Op.lt]: new Date(),
      },
    },
  });
};

// Relationships
RefreshToken.belongsTo(User, { as: 'user', foreignKey: 'userId' });
User.hasMany(RefreshToken, { as: 'refreshTokens', foreignKey: 'userId' });

module.exports = RefreshToken;
