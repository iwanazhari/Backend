# 🛒 E-commerce API - Online Store Backend

**Full e-commerce backend with cart, checkout, and order management - Ready in 4-5 days**

---

## 🎯 Business Model

B2C or B2B online store with physical/digital products

### **Revenue Streams:**
- Product sales
- Shipping fees
- Gift cards
- Subscription boxes (recurring orders)

---

## 🚀 Quick Start

```bash
# From project root
cd examples/ecommerce-api

# Copy schema to main prisma folder
cp prisma/*.prisma ../../prisma/

# Copy source files
cp -r src/* ../../src/

# Go back to root
cd ../..

# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database with products
npm run prisma:seed

# Start development
npm run dev

# API running at http://localhost:3000
# Docs at http://localhost:3000/api/docs
```

---

## 📁 File Structure

```
ecommerce-api/
├── prisma/
│   ├── schema.prisma           # Main schema
│   ├── product.prisma          # Product models
│   ├── order.prisma            # Order models
│   └── seed.ts                 # Sample products
│
├── src/
│   ├── controllers/
│   │   ├── ProductController.ts
│   │   ├── CartController.ts
│   │   ├── OrderController.ts
│   │   ├── CheckoutController.ts
│   │   ├── AddressController.ts
│   │   └── ReviewController.ts
│   │
│   ├── services/
│   │   ├── ProductService.ts
│   │   ├── CartService.ts
│   │   ├── OrderService.ts
│   │   ├── CheckoutService.ts
│   │   ├── InventoryService.ts
│   │   └── PaymentService.ts
│   │
│   ├── repositories/
│   │   ├── ProductRepository.ts
│   │   ├── OrderRepository.ts
│   │   └── CartRepository.ts
│   │
│   ├── routes/
│   │   ├── products.routes.ts
│   │   ├── cart.routes.ts
│   │   ├── checkout.routes.ts
│   │   ├── orders.routes.ts
│   │   ├── addresses.routes.ts
│   │   └── reviews.routes.ts
│   │
│   ├── middleware/
│   │   ├── inventory.ts        # Check stock availability
│   │   └── guest-session.ts    # Guest cart support
│   │
│   └── templates/
│       └── emails/
│           ├── order-confirmation.html
│           ├── order-shipped.html
│           └── abandoned-cart.html
│
└── README.md
```

---

## 🗄️ Database Schema

```prisma
// Guest Session (for guest checkout)
model GuestSession {
  id        String   @id @default(uuid())
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  
  cart      Cart?
  
  @@index([token])
}

// Categories
model Category {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique
  description String?
  parentId    String?
  image       String?
  
  parent      Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children    Category[] @relation("CategoryTree")
  products    Product[]
  
  @@index([slug])
  @@index([parentId])
}

// Brands
model Brand {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique
  description String?
  logo        String?
  website     String?
  
  products    Product[]
  
  @@index([slug])
}

// Products
model Product {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique
  description String?
  
  // Pricing
  price       Decimal  @db.Decimal(10, 2)
  compareAtPrice Decimal? @db.Decimal(10, 2)  // Original price (for sales)
  costPerItem  Decimal? @db.Decimal(10, 2)   // Your cost (for profit calculation)
  
  // Inventory
  sku         String?  @unique
  barcode     String?  @unique
  quantity    Int      @default(0)
  trackQuantity Boolean @default(true)
  allowBackorder Boolean @default(false)
  
  // Physical properties
  weight      Decimal? @db.Decimal(10, 2)
  weightUnit String  @default("kg")
  length      Decimal? @db.Decimal(10, 2)
  width       Decimal? @db.Decimal(10, 2)
  height      Decimal? @db.Decimal(10, 2)
  dimensionUnit String @default("cm")
  
  // Status
  status      ProductStatus @default(DRAFT)
  publishedAt DateTime?
  
  // SEO
  metaTitle   String?
  metaDescription String?
  metaKeywords String[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  categoryId  String?
  brandId     String?
  category    Category? @relation(fields: [categoryId], references: [id])
  brand       Brand?    @relation(fields: [brandId], references: [id])
  images      ProductImage[]
  videos      ProductVideo[]
  documents   ProductDocument[]
  variants    ProductVariant[]
  cartItems   CartItem[]
  orderItems  OrderItem[]
  reviews     Review[]
  wishlistItems WishlistItem[]
  
  @@index([slug])
  @@index([categoryId])
  @@index([brandId])
  @@index([status])
  @@index([sku])
}

// Product Images
model ProductImage {
  id        String   @id @default(uuid())
  productId String
  url       String
  altText   String?
  position  Int      @default(0)
  isPrimary Boolean  @default(false)
  
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  @@index([productId])
}

// Product Variants (Size, Color, etc.)
model ProductVariant {
  id        String   @id @default(uuid())
  productId String
  name      String   // e.g., "Size", "Color"
  value     String   // e.g., "XL", "Red"
  price     Decimal? @db.Decimal(10, 2)  // Price override
  sku       String?  @unique
  quantity  Int      @default(0)
  
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  @@index([productId])
}

// Shopping Cart
model Cart {
  id        String   @id @default(uuid())
  
  // Guest or authenticated
  userId    String?
  guestSessionId String?
  guestSession GuestSession? @relation(fields: [guestSessionId], references: [id])
  
  items     CartItem[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([userId])
  @@index([guestSessionId])
}

model CartItem {
  id        String   @id @default(uuid())
  cartId    String
  productId String
  variantId String?
  quantity  Int      @default(1)
  
  cart      Cart     @relation(fields: [cartId], references: [id], onDelete: Cascade)
  product   Product  @relation(fields: [productId], references: [id])
  variant   ProductVariant? @relation(fields: [variantId], references: [id])
  
  @@unique([cartId, productId, variantId])
  @@index([cartId])
}

// Orders
model Order {
  id        String   @id @default(uuid())
  orderNumber String @unique  // Human-readable: ORD-2026-0001
  
  // Customer
  userId    String?
  email     String
  guestToken String?
  
  // Status
  status    OrderStatus @default(PENDING)
  paymentStatus PaymentStatus @default(PENDING)
  fulfillmentStatus FulfillmentStatus @default(UNFULFILLED)
  
  // Pricing
  subtotal  Decimal  @db.Decimal(10, 2)
  tax       Decimal  @default(0) @db.Decimal(10, 2)
  shipping  Decimal  @default(0) @db.Decimal(10, 2)
  discount  Decimal  @default(0) @db.Decimal(10, 2)
  total     Decimal  @db.Decimal(10, 2)
  currency  String   @default("IDR")
  
  // Shipping Address
  shippingAddressId String?
  shippingAddress   Address? @relation(fields: [shippingAddressId], references: [id])
  
  // Billing Address
  billingAddressId String?
  billingAddress   Address? @relation("OrderBilling", fields: [billingAddressId], references: [id])
  
  // Payment
  paymentMethod String?
  paymentIntentId String?
  paidAt      DateTime?
  
  // Shipping
  shippedAt   DateTime?
  deliveredAt DateTime?
  canceledAt  DateTime?
  
  // Notes
  customerNote String?
  internalNote String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  items     OrderItem[]
  
  @@index([orderNumber])
  @@index([userId])
  @@index([status])
  @@index([email])
}

model OrderItem {
  id        String   @id @default(uuid())
  orderId   String
  productId String
  variantId String?
  
  name      String   // Snapshot of product name
  sku       String?  // Snapshot of product SKU
  price     Decimal  @db.Decimal(10, 2)  // Price at purchase
  quantity  Int
  subtotal  Decimal  @db.Decimal(10, 2)
  
  order     Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product   Product @relation(fields: [productId], references: [id])
  variant   ProductVariant? @relation(fields: [variantId], references: [id])
  
  @@index([orderId])
}

// Addresses
model Address {
  id        String   @id @default(uuid())
  userId    String?
  
  firstName String
  lastName  String
  company   String?
  address1  String
  address2  String?
  city      String
  state     String?
  postalCode String
  country   String
  phone     String?
  
  isDefault Boolean  @default(false)
  
  user      User?    @relation(fields: [userId], references: [id])
  orders    Order[]  @relation("OrderShipping")
  billingOrders Order[] @relation("OrderBilling")
  
  @@index([userId])
}

// Reviews
model Review {
  id        String   @id @default(uuid())
  productId String
  userId    String
  
  rating    Int      // 1-5
  title     String?
  comment   String?
  isVerifiedPurchase Boolean @default(false)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  product   Product @relation(fields: [productId], references: [id])
  user      User    @relation(fields: [userId], references: [id])
  
  @@unique([productId, userId])
  @@index([productId])
  @@index([rating])
}

// Wishlist
model Wishlist {
  id        String   @id @default(uuid())
  userId    String   @unique
  
  items     WishlistItem[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model WishlistItem {
  id        String   @id @default(uuid())
  wishlistId String
  productId String
  
  wishlist  Wishlist @relation(fields: [wishlistId], references: [id], onDelete: Cascade)
  product   Product  @relation(fields: [productId], references: [id])
  
  @@unique([wishlistId, productId])
}

// Enums
enum ProductStatus {
  DRAFT
  ACTIVE
  ARCHIVED
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PROCESSING
  PACKED
  SHIPPED
  DELIVERED
  CANCELED
  REFUNDED
}

enum PaymentStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
  PARTIALLY_REFUNDED
}

enum FulfillmentStatus {
  UNFULFILLED
  PARTIALLY_FULFILLED
  FULFILLED
}
```

---

## 🔌 API Endpoints

### **Products**

```typescript
// List products with filtering, sorting, pagination
GET /api/v1/products?category=electronics&brand=samsung&minPrice=1000000&maxPrice=5000000&sort=price_asc&page=1&limit=20

// Get product by slug
GET /api/v1/products/:slug

// Get featured products
GET /api/v1/products/featured

// Get bestsellers
GET /api/v1/products/bestsellers

// Get new arrivals
GET /api/v1/products/new-arrivals

// Search products
GET /api/v1/products/search?q=laptop&category=electronics

// Get related products
GET /api/v1/products/:slug/related
```

### **Cart**

```typescript
// Get cart (guest or authenticated)
GET /api/v1/cart

// Add to cart
POST /api/v1/cart/add
{
  "productId": "xxx",
  "variantId": "yyy", // optional
  "quantity": 2
}

// Update cart item quantity
PUT /api/v1/cart/items/:itemId
{
  "quantity": 3
}

// Remove from cart
DELETE /api/v1/cart/items/:itemId

// Clear cart
DELETE /api/v1/cart/clear

// Merge guest cart to user cart (on login)
POST /api/v1/cart/merge
```

### **Checkout**

```typescript
// Initiate checkout
POST /api/v1/checkout
{
  "email": "customer@example.com",
  "shippingAddressId": "addr_xxx",
  "shippingMethod": "standard", // standard, express, same-day
  "paymentMethod": "midtrans", // midtrans, stripe, cod
  "customerNote": "Please deliver after 5 PM"
}

// Get checkout summary
GET /api/v1/checkout/summary/:checkoutId
```

### **Orders**

```typescript
// Get user orders
GET /api/v1/orders?status=all&page=1&limit=20

// Get order by ID
GET /api/v1/orders/:id

// Get order by order number (guest)
GET /api/v1/orders/track?orderNumber=ORD-2026-0001&email=customer@example.com

// Cancel order (if still pending)
POST /api/v1/orders/:id/cancel
{
  "reason": "Changed my mind"
}

// Request return/refund
POST /api/v1/orders/:id/return
{
  "itemId": "item_xxx",
  "reason": "Defective product",
  "images": ["url1", "url2"]
}
```

### **Addresses**

```typescript
// List addresses
GET /api/v1/addresses

// Create address
POST /api/v1/addresses
{
  "firstName": "John",
  "lastName": "Doe",
  "address1": "123 Main St",
  "city": "Jakarta",
  "postalCode": "12345",
  "country": "ID",
  "phone": "+628123456789",
  "isDefault": true
}

// Update address
PUT /api/v1/addresses/:id

// Delete address
DELETE /api/v1/addresses/:id

// Set as default
PUT /api/v1/addresses/:id/default
```

### **Reviews**

```typescript
// Get product reviews
GET /api/v1/products/:slug/reviews?rating=5&page=1

// Create review (verified purchase only)
POST /api/v1/products/:slug/reviews
{
  "rating": 5,
  "title": "Excellent!",
  "comment": "Great product, fast delivery"
}

// Update own review
PUT /api/v1/reviews/:id

// Delete own review
DELETE /api/v1/reviews/:id
```

### **Wishlist**

```typescript
// Get wishlist
GET /api/v1/wishlist

// Add to wishlist
POST /api/v1/wishlist/add
{
  "productId": "xxx"
}

// Remove from wishlist
DELETE /api/v1/wishlist/remove/:productId

// Move to cart (from wishlist)
POST /api/v1/wishlist/move-to-cart/:productId
```

---

## 💼 Business Logic

### **Cart Management**

```typescript
// CartService.ts

async addToCart(userId: string | null, productId: string, quantity: number, variantId?: string) {
  // 1. Get or create cart
  let cart = await this.getCart(userId);
  
  if (!cart) {
    cart = await this.createCart(userId);
  }
  
  // 2. Check product availability
  const product = await this.productRepository.findById(productId);
  if (!product) {
    throw new NotFoundError('Product not found');
  }
  
  if (product.trackQuantity && product.quantity < quantity && !product.allowBackorder) {
    throw new BadRequestError('Insufficient stock');
  }
  
  // 3. Add or update cart item
  await this.cartRepository.upsertItem(cart.id, productId, quantity, variantId);
  
  // 4. Recalculate totals
  await this.recalculateCart(cart.id);
  
  return this.getCart(userId);
}
```

### **Checkout Flow**

```typescript
// CheckoutService.ts

async initiateCheckout(userId: string | null, data: CheckoutDTO) {
  // 1. Get cart
  const cart = await this.cartRepository.findByUser(userId);
  if (!cart || cart.items.length === 0) {
    throw new BadRequestError('Cart is empty');
  }
  
  // 2. Validate inventory
  for (const item of cart.items) {
    const product = await this.productRepository.findById(item.productId);
    if (product.trackQuantity && product.quantity < item.quantity) {
      throw new BadRequestError(`${product.name} is out of stock`);
    }
  }
  
  // 3. Calculate totals
  const subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.11; // 11% PPN
  const shipping = await this.calculateShipping(data.shippingAddressId, cart);
  const total = subtotal + tax + shipping;
  
  // 4. Create order
  const order = await this.orderRepository.create({
    ...data,
    subtotal,
    tax,
    shipping,
    total,
    items: cart.items
  });
  
  // 5. Clear cart
  await this.cartRepository.clear(cart.id);
  
  // 6. Create payment intent
  const paymentIntent = await this.paymentService.createIntent({
    orderId: order.id,
    amount: total,
    currency: 'IDR',
    paymentMethod: data.paymentMethod
  });
  
  // 7. Send confirmation email
  await this.emailService.sendOrderConfirmation(order);
  
  return { order, paymentIntent };
}
```

### **Inventory Management**

```typescript
// InventoryService.ts

async reserveInventory(orderId: string, items: OrderItem[]) {
  // Reserve stock when order is created
  for (const item of items) {
    await this.productRepository.decrementQuantity(item.productId, item.quantity);
  }
}

async releaseInventory(orderId: string, items: OrderItem[]) {
  // Release stock when order is canceled
  for (const item of items) {
    await this.productRepository.incrementQuantity(item.productId, item.quantity);
  }
}

async checkLowStock(productId: string, threshold: number = 10) {
  const product = await this.productRepository.findById(productId);
  if (product.quantity <= threshold) {
    await this.notificationService.sendLowStockAlert(product);
  }
}
```

### **Order Status Flow**

```typescript
// OrderService.ts

async updateOrderStatus(orderId: string, newStatus: OrderStatus) {
  const order = await this.orderRepository.findById(orderId);
  
  // Status transition validation
  const validTransitions = {
    PENDING: ['CONFIRMED', 'CANCELED'],
    CONFIRMED: ['PROCESSING', 'CANCELED'],
    PROCESSING: ['PACKED', 'CANCELED'],
    PACKED: ['SHIPPED'],
    SHIPPED: ['DELIVERED'],
    DELIVERED: ['REFUNDED'],
    CANCELED: [],
    REFUNDED: []
  };
  
  if (!validTransitions[order.status].includes(newStatus)) {
    throw new BadRequestError(`Cannot transition from ${order.status} to ${newStatus}`);
  }
  
  // Update status
  await this.orderRepository.updateStatus(orderId, newStatus);
  
  // Trigger side effects
  switch (newStatus) {
    case 'CANCELED':
      await this.inventoryService.releaseInventory(orderId, order.items);
      await this.emailService.sendOrderCanceled(order);
      break;
    case 'SHIPPED':
      await this.emailService.sendOrderShipped(order);
      break;
    case 'DELIVERED':
      await this.emailService.sendOrderDelivered(order);
      break;
  }
}
```

---

## 📧 Email Templates

### **Order Confirmation**

```html
Subject: Order Confirmed! #{{orderNumber}}

Hi {{customerName}},

Thank you for your order!

Order Number: {{orderNumber}}
Order Date: {{orderDate}}
Total: {{total}}

Items:
{{#each items}}
- {{name}} x {{quantity}} = {{subtotal}}
{{/each}}

Shipping Address:
{{shippingAddress}}

Estimated Delivery: {{estimatedDelivery}}

Track your order: {{trackingUrl}}

— {{storeName}}
```

### **Abandoned Cart**

```html
Subject: You left something in your cart! 🛒

Hi {{customerName}},

You left these items in your cart:

{{#each items}}
- {{product.name}} x {{quantity}}
{{/each}}

Total: {{total}}

Complete your checkout now:
{{checkoutUrl}}

Items are reserved for 24 hours.

— {{storeName}}
```

---

## 🧪 Sample Data (Seed Script)

```typescript
// prisma/seed.ts

// 1. Create categories
const electronics = await prisma.category.create({
  data: {
    name: 'Electronics',
    slug: 'electronics',
    description: 'Gadgets and electronics'
  }
});

const smartphones = await prisma.category.create({
  data: {
    name: 'Smartphones',
    slug: 'smartphones',
    parentId: electronics.id
  }
});

// 2. Create brands
const samsung = await prisma.brand.create({
  data: {
    name: 'Samsung',
    slug: 'samsung',
    website: 'https://samsung.com'
  }
});

// 3. Create products
await prisma.product.createMany({
  data: [
    {
      name: 'Samsung Galaxy S24 Ultra',
      slug: 'samsung-galaxy-s24-ultra',
      description: 'Latest flagship smartphone',
      price: 19999000,
      compareAtPrice: 21999000,
      costPerItem: 15000000,
      sku: 'SAM-S24U-BLK',
      barcode: '8801234567890',
      quantity: 50,
      status: 'ACTIVE',
      categoryId: smartphones.id,
      brandId: samsung.id,
      weight: 0.23,
      publishedAt: new Date()
    },
    {
      name: 'Samsung Galaxy S24+',
      slug: 'samsung-galaxy-s24-plus',
      description: 'Premium smartphone',
      price: 16999000,
      compareAtPrice: 18999000,
      costPerItem: 12000000,
      sku: 'SAM-S24P-WHT',
      barcode: '8801234567891',
      quantity: 75,
      status: 'ACTIVE',
      categoryId: smartphones.id,
      brandId: samsung.id,
      weight: 0.20,
      publishedAt: new Date()
    }
  ]
});

// 4. Create product images
await prisma.productImage.create({
  data: {
    productId: 'product-id',
    url: 'https://cdn.store.com/products/s24-ultra-1.jpg',
    altText: 'Samsung Galaxy S24 Ultra - Front',
    position: 0,
    isPrimary: true
  }
});

console.log('✅ Seeded 2 categories, 1 brand, 2 products');
```

---

## 🧪 Testing

### **Test Checkout Flow**

```typescript
// tests/integration/checkout.test.ts

describe('Checkout Flow', () => {
  it('should complete checkout successfully', async () => {
    // 1. Create user with cart items
    const user = await createTestUser();
    await addToCart(user.id, productId, 2);
    
    // 2. Initiate checkout
    const response = await request(app)
      .post('/api/v1/checkout')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        email: user.email,
        shippingAddressId: addressId,
        shippingMethod: 'standard',
        paymentMethod: 'midtrans'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.data.order).toBeDefined();
    expect(response.body.data.paymentIntent).toBeDefined();
    
    // 3. Verify cart is cleared
    const cart = await getCart(user.id);
    expect(cart.items.length).toBe(0);
    
    // 4. Verify inventory reserved
    const product = await getProduct(productId);
    expect(product.quantity).toBe(48); // 50 - 2
  });
  
  it('should fail checkout if product out of stock', async () => {
    const user = await createTestUser();
    await addToCart(user.id, productId, 100); // More than available
    
    const response = await request(app)
      .post('/api/v1/checkout')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        email: user.email,
        shippingAddressId: addressId,
        paymentMethod: 'midtrans'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('out of stock');
  });
});
```

---

## 📊 Analytics Queries

### **Sales Dashboard**

```typescript
// Today's sales
const todaySales = await prisma.order.aggregate({
  _sum: { total: true },
  _count: true,
  where: {
    createdAt: {
      gte: startOfDay(new Date()),
      lte: endOfDay(new Date())
    },
    status: { not: 'CANCELED' }
  }
});

// Best selling products (last 30 days)
const bestsellers = await prisma.orderItem.groupBy({
  by: ['productId'],
  _sum: { quantity: true },
  where: {
    order: {
      createdAt: { gte: subDays(new Date(), 30) },
      status: { not: 'CANCELED' }
    }
  },
  orderBy: { _sum: { quantity: 'desc' } },
  take: 10
});

// Revenue by category
const revenueByCategory = await prisma.category.findMany({
  include: {
    products: {
      include: {
        orderItems: {
          where: {
            order: {
              createdAt: { gte: subDays(new Date(), 30) }
            }
          }
        }
      }
    }
  }
});
```

### **Cart Abandonment Rate**

```typescript
const cartsCreated = await prisma.cart.count({
  where: {
    createdAt: { gte: subDays(new Date(), 7) }
  }
});

const ordersCreated = await prisma.order.count({
  where: {
    createdAt: { gte: subDays(new Date(), 7) }
  }
});

const abandonmentRate = ((cartsCreated - ordersCreated) / cartsCreated) * 100;
// Industry average: 70-80%
```

---

## 🚀 Deployment Checklist

- [ ] Configure payment gateway (Midtrans/Stripe)
- [ ] Set up shipping calculator (JNE, J&T, etc.)
- [ ] Configure tax rates (PPN 11%)
- [ ] Set up email templates (SendGrid/Mailgun)
- [ ] Test checkout flow end-to-end
- [ ] Test payment webhook
- [ ] Set up inventory alerts
- [ ] Create product import script (CSV)
- [ ] Set up analytics dashboard
- [ ] Test on mobile devices
- [ ] Load test for flash sales

---

## 💡 Customization Ideas

### **1. Add Discount Codes**

```prisma
model DiscountCode {
  id        String   @id @default(uuid())
  code      String   @unique
  type      DiscountType // PERCENTAGE, FIXED
  value     Decimal  @db.Decimal(10, 2)
  minOrder  Decimal? @db.Decimal(10, 2)
  maxUses   Int?
  usedCount Int      @default(0)
  expiresAt DateTime?
  active    Boolean  @default(true)
}
```

### **2. Add Subscription Boxes**

```prisma
model Subscription {
  id        String   @id @default(uuid())
  userId    String
  frequency SubscriptionFrequency // WEEKLY, MONTHLY
  products  Json     // Selected products
  nextDelivery DateTime
  active    Boolean  @default(true)
}
```

### **3. Add Loyalty Points**

```typescript
// Award points for purchases
const pointsEarned = Math.floor(order.total / 10000); // 1 point per 10K
await prisma.loyaltyPoint.create({
  data: {
    userId: order.userId,
    points: pointsEarned,
    reason: 'purchase',
    orderId: order.id
  }
});

// Redeem points (100 points = 10K discount)
const discount = Math.floor(points / 100) * 10000;
```

---

## 🆘 Troubleshooting

### **Issue: Cart not persisting for guests**

**Solution:**
1. Ensure guest session token is stored in cookie
2. Check session expiry (default: 7 days)
3. Implement cart merge on login

### **Issue: Payment webhook not updating order**

**Solution:**
1. Verify webhook signature
2. Check order number mapping
3. Test with Midtrans sandbox first

### **Issue: Inventory not syncing**

**Solution:**
1. Add database transaction for order creation
2. Implement inventory reservation timeout (15 min)
3. Add cron job to release expired reservations

---

**Next Steps:**

1. Copy files to your project
2. Run migrations
3. Configure payment gateway
4. Add sample products
5. Test checkout flow
6. Launch! 🚀

[Back to Examples →](../README.md)
