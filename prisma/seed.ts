/**
 * Database Seed Script
 * Populates database with initial data for development and testing
 *
 * Usage:
 *   npm run prisma:seed
 *   npx prisma db seed
 */

import { PrismaClient, Role, UserStatus, ProductStatus, OrderStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Hash password
 */
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Create user with role
 */
async function createUser({
  email,
  password,
  firstName,
  lastName,
  role,
  status,
}: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  status: UserStatus;
}) {
  const hashedPassword = await hashPassword(password);

  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role,
      status,
      emailVerifiedAt: new Date(),
    },
  });
}

/**
 * Create sample product
 */
async function createProduct(data: {
  name: string;
  description?: string;
  price: number;
  stock?: number;
  status?: ProductStatus;
  userId: string;
}) {
  return prisma.product.create({
    data: {
      name: data.name,
      description: data.description,
      price: data.price,
      stock: data.stock ?? 100,
      status: data.status ?? ProductStatus.PUBLISHED,
      userId: data.userId,
    },
  });
}

// ============================================
// SEED FUNCTIONS
// ============================================

/**
 * Seed users
 */
async function seedUsers() {
  console.log('📦 Seeding users...');

  // Admin user
  const admin = await createUser({
    email: 'admin@example.com',
    password: 'Admin123!',
    firstName: 'Admin',
    lastName: 'User',
    role: Role.ADMIN,
    status: UserStatus.ACTIVE,
  });
  console.log(`  ✅ Admin user: ${admin.email}`);

  // Moderator user
  const moderator = await createUser({
    email: 'moderator@example.com',
    password: 'Mod123!',
    firstName: 'Moderator',
    lastName: 'User',
    role: Role.MODERATOR,
    status: UserStatus.ACTIVE,
  });
  console.log(`  ✅ Moderator user: ${moderator.email}`);

  // Regular users
  const users = await Promise.all([
    createUser({
      email: 'user1@example.com',
      password: 'User123!',
      firstName: 'John',
      lastName: 'Doe',
      role: Role.USER,
      status: UserStatus.ACTIVE,
    }),
    createUser({
      email: 'user2@example.com',
      password: 'User123!',
      firstName: 'Jane',
      lastName: 'Smith',
      role: Role.USER,
      status: UserStatus.ACTIVE,
    }),
    createUser({
      email: 'user3@example.com',
      password: 'User123!',
      firstName: 'Bob',
      lastName: 'Wilson',
      role: Role.USER,
      status: UserStatus.ACTIVE,
    }),
  ]);

  console.log(`  ✅ Created ${users.length} regular users`);

  // Inactive user (for testing)
  const inactiveUser = await createUser({
    email: 'inactive@example.com',
    password: 'User123!',
    firstName: 'Inactive',
    lastName: 'User',
    role: Role.USER,
    status: UserStatus.INACTIVE,
  });
  console.log(`  ✅ Inactive user: ${inactiveUser.email}`);

  return { admin, moderator, users };
}

/**
 * Seed products
 */
async function seedProducts(users: any[]) {
  console.log('📦 Seeding products...');

  const adminUser = users[0];

  const products = await Promise.all([
    createProduct({
      name: 'Laptop Pro 15"',
      description: 'High-performance laptop for professionals',
      price: 1299.99,
      stock: 50,
      status: ProductStatus.PUBLISHED,
      userId: adminUser.id,
    }),
    createProduct({
      name: 'Wireless Mouse',
      description: 'Ergonomic wireless mouse',
      price: 49.99,
      stock: 200,
      status: ProductStatus.PUBLISHED,
      userId: adminUser.id,
    }),
    createProduct({
      name: 'Mechanical Keyboard',
      description: 'RGB mechanical keyboard with Cherry MX switches',
      price: 149.99,
      stock: 75,
      status: ProductStatus.PUBLISHED,
      userId: adminUser.id,
    }),
    createProduct({
      name: 'USB-C Hub',
      description: '7-in-1 USB-C hub with HDMI, USB 3.0, and SD card reader',
      price: 79.99,
      stock: 150,
      status: ProductStatus.PUBLISHED,
      userId: adminUser.id,
    }),
    createProduct({
      name: 'Monitor 27" 4K',
      description: 'Ultra HD 4K monitor with IPS panel',
      price: 399.99,
      stock: 30,
      status: ProductStatus.PUBLISHED,
      userId: adminUser.id,
    }),
    createProduct({
      name: 'Webcam 1080p',
      description: 'Full HD webcam with microphone',
      price: 89.99,
      stock: 100,
      status: ProductStatus.PUBLISHED,
      userId: adminUser.id,
    }),
    createProduct({
      name: 'Desk Lamp',
      description: 'LED desk lamp with adjustable brightness',
      price: 39.99,
      stock: 120,
      status: ProductStatus.PUBLISHED,
      userId: adminUser.id,
    }),
    createProduct({
      name: 'Office Chair',
      description: 'Ergonomic office chair with lumbar support',
      price: 299.99,
      stock: 25,
      status: ProductStatus.PUBLISHED,
      userId: adminUser.id,
    }),
    createProduct({
      name: 'Standing Desk',
      description: 'Electric standing desk with memory presets',
      price: 599.99,
      stock: 15,
      status: ProductStatus.PUBLISHED,
      userId: adminUser.id,
    }),
    createProduct({
      name: 'Noise Cancelling Headphones',
      description: 'Premium wireless headphones with ANC',
      price: 349.99,
      stock: 60,
      status: ProductStatus.PUBLISHED,
      userId: adminUser.id,
    }),
  ]);

  console.log(`  ✅ Created ${products.length} products`);

  // Create draft product (for testing)
  const draftProduct = await createProduct({
    name: 'Draft Product',
    description: 'This product is in draft status',
    price: 99.99,
    stock: 0,
    status: ProductStatus.DRAFT,
    userId: adminUser.id,
  });
  console.log(`  ✅ Created draft product: ${draftProduct.name}`);

  return products;
}

/**
 * Seed API keys (for testing API access)
 */
async function seedApiKeys(users: any[]) {
  console.log('📦 Seeding API keys...');

  // Note: API keys should be hashed in production
  // This is for development/testing only

  const adminUser = users[0];

  const apiKey = await prisma.apiKey.create({
    data: {
      name: 'Development Key',
      key: 'dev_api_key_123456789012345678901234567890',
      keyPrefix: 'dev_key_',
      userId: adminUser.id,
      permissions: ['read', 'write', 'delete'],
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      permissions: true,
    },
  });

  console.log(`  ✅ Created API key: ${apiKey.name} (${apiKey.keyPrefix}...)`);
  console.log(`     ⚠️  Raw key: dev_api_key_123456789012345678901234567890`);

  return { apiKey };
}

/**
 * Main seed function
 */
async function main() {
  console.log('🌱 Starting database seed...\n');

  try {
    // Seed users
    const { admin, moderator, users } = await seedUsers();
    console.log();

    // Seed products
    const products = await seedProducts(users);
    console.log();

    // Seed API keys
    const { apiKey } = await seedApiKeys(users);
    console.log();

    // Summary
    console.log('============================================');
    console.log('✅ Database seeding completed successfully!');
    console.log('============================================\n');

    console.log('📊 Summary:');
    console.log(`  - Users: ${users.length + 3} (1 admin, 1 moderator, ${users.length} users, 1 inactive)`);
    console.log(`  - Products: ${products.length + 1} (${products.length} published, 1 draft)`);
    console.log(`  - API Keys: 1\n`);

    console.log('🔐 Test Credentials:');
    console.log('  Admin:');
    console.log('    Email: admin@example.com');
    console.log('    Password: Admin123!');
    console.log('  User:');
    console.log('    Email: user1@example.com');
    console.log('    Password: User123!\n');

    console.log('🔑 API Key (Development):');
    console.log('    Key: dev_api_key_123456789012345678901234567890');
    console.log('    Prefix: dev_key_...\n');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run seed
main();
