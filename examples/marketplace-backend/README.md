# 🤝 Marketplace Backend - Two-Sided Platform

**Complete marketplace with vendors, customers, commission tracking, and escrow payments - Ready in 5-6 days**

---

## 🎯 Business Model

Two-sided marketplace connecting vendors (sellers) with customers (buyers)

### **Revenue Streams:**
- Commission on sales (5-20%)
- Vendor subscription fees
- Featured listings
- Advertising
- Premium vendor features

### **Example Marketplaces:**
- Tokopedia/Shopee (general merchandise)
- Fiverr/Upwork (services)
- Airbnb (accommodations)
- Grab/Gojek (services & goods)

---

## 🚀 Quick Start

```bash
# From project root
cd examples/marketplace-backend

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

# Seed database
npm run prisma:seed

# Start development
npm run dev

# API running at http://localhost:3000
# Docs at http://localhost:3000/api/docs
```

---

## 📁 File Structure

```
marketplace-backend/
├── prisma/
│   ├── schema.prisma           # Main schema
│   ├── vendor.prisma           # Vendor models
│   ├── commission.prisma       # Commission & payout models
│   └── seed.ts                 # Sample vendors
│
├── src/
│   ├── controllers/
│   │   ├── VendorController.ts
│   │   ├── ProductController.ts
│   │   ├── OrderController.ts
│   │   ├── CommissionController.ts
│   │   ├── PayoutController.ts
│   │   ├── DisputeController.ts
│   │   └── MessageController.ts
│   │
│   ├── services/
│   │   ├── VendorService.ts
│   │   ├── CommissionService.ts
│   │   ├── PayoutService.ts
│   │   ├── EscrowService.ts
│   │   ├── DisputeService.ts
│   │   └── MessagingService.ts
│   │
│   ├── repositories/
│   │   ├── VendorRepository.ts
│   │   ├── CommissionRepository.ts
│   │   └── OrderRepository.ts
│   │
│   ├── routes/
│   │   ├── vendor.routes.ts
│   │   ├── products.routes.ts
│   │   ├── orders.routes.ts
│   │   ├── commission.routes.ts
│   │   ├── payout.routes.ts
│   │   ├── dispute.routes.ts
│   │   └── message.routes.ts
│   │
│   ├── middleware/
│   │   ├── vendor-verification.ts
│   │   ├── escrow.ts
│   │   └── commission.ts
│   │
│   └── templates/
│       └── emails/
│           ├── vendor-approved.html
│           ├── order-placed.html
│           ├── payout-processed.html
│           └── dispute-created.html
│
└── README.md
```

---

## 🗄️ Database Schema

```prisma
// Vendor Applications & Profiles
model Vendor {
  id              String   @id @default(uuid())
  userId          String   @unique
  
  // Business Info
  businessName    String
  businessType    BusinessType // INDIVIDUAL, COMPANY
  taxId           String?
  registrationNumber String?
  
  // Contact
  email           String
  phone           String
  address         String
  city            String
  state           String?
  postalCode      String
  country         String   @default("ID")
  
  // Bank Account (for payouts)
  bankName        String
  bankAccount     String
  bankAccountName String
  
  // Status
  status          VendorStatus @default(PENDING)
  verifiedAt      DateTime?
  rejectedAt      DateTime?
  rejectionReason String?
  
  // Metrics
  totalSales      Decimal  @default(0) @db.Decimal(12, 2)
  totalOrders     Int      @default(0)
  rating          Decimal  @default(0) @db.Decimal(3, 2)
  reviewCount     Int      @default(0)
  responseRate    Decimal  @default(0) @db.Decimal(5, 2) // Percentage
  responseTime    Int?     // Average in hours
  
  // Settings
  commissionRate  Decimal  @default(10) @db.Decimal(5, 2) // Percentage
  autoAcceptOrders Boolean @default(true)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  user            User       @relation(fields: [userId], references: [id])
  verification    VendorVerification?
  products        Product[]
  orders          Order[]
  payouts         Payout[]
  disputes        Dispute[]
  messages        Message[]
  
  @@index([userId])
  @@index([status])
  @@index([email])
}

// Vendor Verification
model VendorVerification {
  id              String   @id @default(uuid())
  vendorId        String   @unique
  
  // Documents
  idCardFront     String   // KTP
  idCardBack      String
  businessLicense String?   // SIUP/NIB
  taxDocument     String?   // NPWP
  
  // Verification
  status          VerificationStatus @default(PENDING)
  reviewedBy      String?
  reviewedAt      DateTime?
  notes           String?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  vendor          Vendor   @relation(fields: [vendorId], references: [id])
  
  @@index([vendorId])
  @@index([status])
}

// Products (extended for marketplace)
model Product {
  id              String   @id @default(uuid())
  vendorId        String
  
  // ... (fields from e-commerce schema)
  name            String
  slug            String   @unique
  description     String?
  price           Decimal  @db.Decimal(10, 2)
  quantity        Int      @default(0)
  
  // Marketplace-specific
  isFeatured      Boolean  @default(false)
  featuredUntil   DateTime?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  vendor          Vendor   @relation(fields: [vendorId], references: [id])
  
  @@index([vendorId])
  @@index([slug])
}

// Orders with Escrow
model Order {
  id              String   @id @default(uuid())
  orderNumber     String   @unique
  
  // Parties
  buyerId         String
  vendorId        String
  
  // Escrow
  escrowStatus    EscrowStatus @default(IN_ESCROW)
  escrowReleasedAt DateTime?
  
  // Commission
  subtotal        Decimal  @db.Decimal(10, 2)
  platformFee     Decimal  @db.Decimal(10, 2)  // Platform commission
  vendorEarnings  Decimal  @db.Decimal(10, 2)  // What vendor gets
  
  // ... (other fields from e-commerce schema)
  status          OrderStatus @default(PENDING)
  total           Decimal  @db.Decimal(10, 2)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  buyer           User     @relation(fields: [buyerId], references: [id])
  vendor          Vendor   @relation(fields: [vendorId], references: [id])
  commission      Commission?
  
  @@index([orderNumber])
  @@index([buyerId])
  @@index([vendorId])
  @@index([escrowStatus])
}

// Commission Tracking
model Commission {
  id              String   @id @default(uuid())
  orderId         String   @unique
  
  // Amounts
  orderTotal      Decimal  @db.Decimal(10, 2)
  commissionRate  Decimal  @db.Decimal(5, 2)  // Percentage
  commissionAmount Decimal @db.Decimal(10, 2) // Platform cut
  vendorEarnings  Decimal  @db.Decimal(10, 2)
  
  // Status
  status          CommissionStatus @default(PENDING)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  order           Order    @relation(fields: [orderId], references: [id])
  payout          Payout?
  
  @@index([orderId])
  @@index([status])
}

// Vendor Payouts
model Payout {
  id              String   @id @default(uuid())
  vendorId        String
  
  // Amount
  amount          Decimal  @db.Decimal(10, 2)
  currency        String   @default("IDR")
  
  // Status
  status          PayoutStatus @default(PENDING)
  
  // Processing
  processedAt     DateTime?
  referenceNumber String?   // Bank transfer reference
  
  // Period
  periodStart     DateTime
  periodEnd       DateTime
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  vendor          Vendor   @relation(fields: [vendorId], references: [id])
  commissions     Commission[]
  
  @@index([vendorId])
  @@index([status])
  @@index([periodStart, periodEnd])
}

// Disputes
model Dispute {
  id              String   @id @default(uuid())
  orderId         String   @unique
  
  // Parties
  raisedBy        String   // buyer or vendor
  raisedByRole    String   // BUYER or VENDOR
  
  // Dispute
  reason          String
  description     String
  images          String[] // URLs
  
  // Resolution
  status          DisputeStatus @default(OPEN)
  resolution      String?
  resolvedBy      String?    // Admin user ID
  resolvedAt      DateTime?
  
  // Refund
  refundAmount    Decimal?   @db.Decimal(10, 2)
  refundType      RefundType? // FULL, PARTIAL, NONE
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  order           Order    @relation(fields: [orderId], references: [id])
  
  @@index([orderId])
  @@index([status])
}

// Messaging System
model Message {
  id              String   @id @default(uuid())
  
  // Participants
  senderId        String
  receiverId      String
  orderId         String?  // Optional: message related to order
  
  // Content
  content         String
  attachments     String[] // URLs
  
  // Status
  isRead          Boolean  @default(false)
  readAt          DateTime?
  
  createdAt       DateTime @default(now())
  
  sender          User     @relation(fields: [senderId], references: [id])
  receiver        User     @relation(fields: [receiverId], references: [id])
  
  @@index([senderId])
  @@index([receiverId])
  @@index([orderId])
}

// Vendor Subscription Plans (optional recurring revenue)
model VendorPlan {
  id              String   @id @default(uuid())
  name            String   // Free, Pro, Premium
  
  // Pricing
  priceMonthly    Decimal  @db.Decimal(10, 2)
  priceYearly     Decimal  @db.Decimal(10, 2)
  
  // Features
  commissionRate  Decimal  @db.Decimal(5, 2)  // Reduced rate for higher tiers
  maxProducts     Int
  maxImages       Int
  featuredListings Boolean @default(false)
  prioritySupport Boolean  @default(false)
  analytics       Boolean  @default(false)
  
  subscriptions   VendorSubscription[]
  
  @@index([name])
}

model VendorSubscription {
  id              String   @id @default(uuid())
  vendorId        String   @unique
  planId          String
  
  status          SubscriptionStatus @default(ACTIVE)
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  vendor          Vendor         @relation(fields: [vendorId], references: [id])
  plan            VendorPlan     @relation(fields: [planId], references: [id])
  
  @@index([vendorId])
  @@index([status])
}

// Enums
enum VendorStatus {
  PENDING
  VERIFIED
  REJECTED
  SUSPENDED
}

enum VerificationStatus {
  PENDING
  IN_REVIEW
  APPROVED
  REJECTED
}

enum EscrowStatus {
  IN_ESCROW
  RELEASED
  REFUNDED
  DISPUTED
}

enum CommissionStatus {
  PENDING
  COMPLETED
  REFUNDED
}

enum PayoutStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

enum DisputeStatus {
  OPEN
  IN_REVIEW
  RESOLVED
  ESCALATED
}

enum RefundType {
  FULL
  PARTIAL
  NONE
}

enum BusinessType {
  INDIVIDUAL
  COMPANY
}

enum SubscriptionStatus {
  ACTIVE
  EXPIRED
  CANCELED
}
```

---

## 🔌 API Endpoints

### **Vendor Management**

```typescript
// Apply to become vendor
POST /api/v1/vendor/apply
{
  "businessName": "My Store",
  "businessType": "COMPANY",
  "email": "vendor@store.com",
  "phone": "+628123456789",
  "address": "123 Main St",
  "city": "Jakarta",
  "postalCode": "12345",
  "bankName": "BCA",
  "bankAccount": "1234567890",
  "bankAccountName": "PT My Store"
}

// Upload verification documents
POST /api/v1/vendor/verification/documents
Content-Type: multipart/form-data
- idCardFront: (file)
- idCardBack: (file)
- businessLicense: (file)
- taxDocument: (file)

// Get vendor dashboard
GET /api/v1/vendor/dashboard

// Update vendor profile
PUT /api/v1/vendor/profile
{
  "businessName": "Updated Store Name",
  "phone": "+628123456789",
  "commissionRate": 8
}

// Get vendor stats
GET /api/v1/vendor/stats

// Get vendor orders
GET /api/v1/vendor/orders?status=processing&page=1

// Get vendor products
GET /api/v1/vendor/products
```

### **Admin: Vendor Verification**

```typescript
// Get pending vendor applications
GET /api/v1/admin/vendors/pending

// Review vendor application
POST /api/v1/admin/vendors/:id/review
{
  "status": "APPROVED", // or "REJECTED"
  "notes": "Documents verified successfully"
}

// Suspend vendor
POST /api/v1/admin/vendors/:id/suspend
{
  "reason": "Policy violation"
}

// Reactivate vendor
POST /api/v1/admin/vendors/:id/reactivate
```

### **Products (Marketplace)**

```typescript
// List all products (from all vendors)
GET /api/v1/products?vendorId=xxx&category=yyy&minPrice=10000&maxPrice=100000

// Vendor creates product
POST /api/v1/vendor/products
{
  "name": "Product Name",
  "price": 99000,
  "quantity": 100,
  "description": "Product description",
  "categoryId": "cat_xxx",
  "images": ["url1", "url2"]
}

// Vendor updates product
PUT /api/v1/vendor/products/:id

// Vendor deletes product
DELETE /api/v1/vendor/products/:id

// Feature a product (paid)
POST /api/v1/vendor/products/:id/feature
{
  "durationDays": 7
}
```

### **Orders with Escrow**

```typescript
// Place order (money goes to escrow)
POST /api/v1/orders
{
  "vendorId": "vendor_xxx",
  "items": [
    {
      "productId": "prod_xxx",
      "quantity": 2
    }
  ],
  "shippingAddressId": "addr_xxx",
  "paymentMethod": "midtrans"
}

// Vendor accepts order
POST /api/v1/vendor/orders/:id/accept

// Vendor rejects order
POST /api/v1/vendor/orders/:id/reject
{
  "reason": "Out of stock"
}

// Update order status (vendor)
POST /api/v1/vendor/orders/:id/ship
{
  "trackingNumber": "JNE123456",
  "courier": "JNE"
}

// Buyer confirms receipt
POST /api/v1/orders/:id/confirm-receipt

// Release escrow to vendor
POST /api/v1/admin/orders/:id/release-escrow
```

### **Commission & Payouts**

```typescript
// Get vendor earnings
GET /api/v1/vendor/earnings?period=last_30_days

// Get commission breakdown
GET /api/v1/vendor/commissions

// Request payout
POST /api/v1/vendor/payouts/request
{
  "amount": 5000000
}

// Get payout history
GET /api/v1/vendor/payouts

// Admin: Process payout
POST /api/v1/admin/payouts/:id/process

// Admin: Get pending payouts
GET /api/v1/admin/payouts/pending
```

### **Disputes**

```typescript
// Buyer raises dispute
POST /api/v1/orders/:id/dispute
{
  "reason": "Product not as described",
  "description": "Received wrong color",
  "images": ["url1", "url2"],
  "refundType": "PARTIAL",
  "refundAmount": 50000
}

// Vendor responds to dispute
POST /api/v1/vendor/disputes/:id/respond
{
  "response": "We apologize for the mistake...",
  "resolution": "We can offer 50% refund"
}

// Admin resolves dispute
POST /api/v1/admin/disputes/:id/resolve
{
  "resolution": "Partial refund approved",
  "refundAmount": 50000,
  "refundType": "PARTIAL"
}

// Get disputes (vendor)
GET /api/v1/vendor/disputes

// Get disputes (admin)
GET /api/v1/admin/disputes
```

### **Messaging**

```typescript
// Get conversations
GET /api/v1/messages/conversations

// Get messages with user
GET /api/v1/messages?withUserId=xxx

// Send message
POST /api/v1/messages
{
  "receiverId": "user_xxx",
  "content": "Hello, is this product available?",
  "orderId": "order_xxx" // optional
}

// Mark as read
PUT /api/v1/messages/:id/read
```

---

## 💼 Business Logic

### **Escrow Payment Flow**

```typescript
// OrderService.ts

async placeOrder(buyerId: string, data: OrderDTO) {
  // 1. Create order with escrow status
  const order = await this.orderRepository.create({
    ...data,
    buyerId,
    escrowStatus: 'IN_ESCROW',
    platformFee: data.subtotal * 0.10, // 10% commission
    vendorEarnings: data.subtotal * 0.90
  });
  
  // 2. Create payment intent (charge buyer)
  const paymentIntent = await this.paymentService.create({
    amount: data.total,
    orderId: order.id
  });
  
  // 3. Money held in escrow (not released to vendor yet)
  await this.escrowService.hold({
    orderId: order.id,
    amount: data.subtotal,
    platformFee: order.platformFee,
    vendorEarnings: order.vendorEarnings
  });
  
  // 4. Create commission record
  await this.commissionRepository.create({
    orderId: order.id,
    orderTotal: data.subtotal,
    commissionRate: 10,
    commissionAmount: order.platformFee,
    vendorEarnings: order.vendorEarnings,
    status: 'PENDING'
  });
  
  return { order, paymentIntent };
}

// Release escrow when buyer confirms receipt
async confirmReceipt(orderId: string, buyerId: string) {
  const order = await this.orderRepository.findById(orderId);
  
  // Verify buyer
  if (order.buyerId !== buyerId) {
    throw new ForbiddenError('Not your order');
  }
  
  // Update order status
  await this.orderRepository.update(orderId, {
    status: 'DELIVERED',
    escrowStatus: 'RELEASED',
    escrowReleasedAt: new Date()
  });
  
  // Release escrow to vendor
  await this.escrowService.release(orderId);
  
  // Update commission status
  await this.commissionRepository.updateByOrderId(orderId, {
    status: 'COMPLETED'
  });
  
  // Notify vendor
  await this.notificationService.sendEscrowReleased(order.vendorId);
}
```

### **Payout Processing**

```typescript
// PayoutService.ts

async processPayouts() {
  // 1. Get all completed commissions (escrow released)
  const completedCommissions = await this.commissionRepository.findMany({
    where: {
      status: 'COMPLETED',
      payoutId: null // Not yet paid out
    }
  });
  
  // 2. Group by vendor
  const vendorEarnings = new Map();
  for (const commission of completedCommissions) {
    const vendorId = commission.order.vendorId;
    if (!vendorEarnings.has(vendorId)) {
      vendorEarnings.set(vendorId, 0);
    }
    vendorEarnings.set(vendorId, vendorEarnings.get(vendorId) + commission.vendorEarnings);
  }
  
  // 3. Create payouts for vendors with minimum threshold
  for (const [vendorId, earnings] of vendorEarnings.entries()) {
    if (earnings >= 100000) { // Minimum payout 100K
      await this.payoutRepository.create({
        vendorId,
        amount: earnings,
        status: 'PENDING',
        periodStart: new Date(),
        periodEnd: new Date()
      });
    }
  }
}

// Admin processes payout
async approvePayout(payoutId: string) {
  const payout = await this.payoutRepository.findById(payoutId);
  
  // 1. Update status
  await this.payoutRepository.update(payoutId, {
    status: 'PROCESSING'
  });
  
  // 2. Initiate bank transfer
  const transfer = await this.bankService.transfer({
    accountNumber: payout.vendor.bankAccount,
    accountName: payout.vendor.bankAccountName,
    amount: payout.amount,
    description: `Marketplace payout ${payout.id}`
  });
  
  // 3. Update with reference number
  await this.payoutRepository.update(payoutId, {
    status: 'COMPLETED',
    processedAt: new Date(),
    referenceNumber: transfer.referenceNumber
  });
  
  // 4. Mark commissions as paid
  await this.commissionRepository.updateByVendor(payout.vendorId, {
    payoutId: payout.id
  });
}
```

### **Dispute Resolution**

```typescript
// DisputeService.ts

async resolveDispute(disputeId: string, adminId: string, resolution: ResolutionDTO) {
  const dispute = await this.disputeRepository.findById(disputeId);
  
  // 1. Update dispute
  await this.disputeRepository.update(disputeId, {
    status: 'RESOLVED',
    resolution: resolution.resolution,
    resolvedBy: adminId,
    resolvedAt: new Date(),
    refundType: resolution.refundType
  });
  
  // 2. Process refund based on resolution
  if (resolution.refundType === 'FULL') {
    // Full refund to buyer from escrow
    await this.escrowService.refund(dispute.orderId, dispute.order.total);
    
    // Update order
    await this.orderRepository.update(dispute.orderId, {
      status: 'REFUNDED',
      escrowStatus: 'REFUNDED'
    });
    
    // Update commission (platform returns fee)
    await this.commissionRepository.updateByOrderId(dispute.orderId, {
      status: 'REFUNDED'
    });
  } else if (resolution.refundType === 'PARTIAL') {
    // Partial refund
    await this.escrowService.partialRefund(
      dispute.orderId,
      resolution.refundAmount
    );
    
    // Release remaining to vendor
    const remaining = dispute.order.total - resolution.refundAmount;
    await this.escrowService.releasePartial(dispute.orderId, remaining);
  } else {
    // No refund - release full amount to vendor
    await this.escrowService.release(dispute.orderId);
  }
  
  // 3. Notify parties
  await this.notificationService.sendDisputeResolved(dispute);
}
```

---

## 💰 Commission Models

### **1. Flat Commission**

```typescript
const commissionRate = 0.10; // 10% for all products
const commission = orderTotal * commissionRate;
const vendorEarnings = orderTotal - commission;
```

### **2. Category-Based Commission**

```typescript
const commissionRates = {
  'electronics': 0.05, // 5%
  'fashion': 0.12,     // 12%
  'services': 0.15,    // 15%
  'digital': 0.08      // 8%
};

const commission = orderTotal * (commissionRates[category] || 0.10);
```

### **3. Tiered Commission (Volume-Based)**

```typescript
const monthlySales = await getVendorMonthlySales(vendorId);

let commissionRate;
if (monthlySales < 10_000_000) {
  commissionRate = 0.12; // 12% for new vendors
} else if (monthlySales < 50_000_000) {
  commissionRate = 0.10; // 10% for growing vendors
} else {
  commissionRate = 0.08; // 8% for top vendors
}

const commission = orderTotal * commissionRate;
```

### **4. Subscription + Reduced Commission**

```typescript
// Vendor subscribes to Pro plan
const subscription = await getVendorSubscription(vendorId);

if (subscription.plan.name === 'Pro') {
  commissionRate = 0.05; // 5% (reduced from 10%)
} else {
  commissionRate = 0.10; // Standard 10%
}
```

---

## 📧 Email Templates

### **Vendor Application Approved**

```html
Subject: Your Vendor Application is Approved! 🎉

Hi {{vendorName}},

Great news! Your vendor application has been approved.

Business Name: {{businessName}}
Commission Rate: {{commissionRate}}%

You can now:
✅ List products
✅ Receive orders
✅ Get paid via escrow

Get started: {{dashboardUrl}}

— Marketplace Team
```

### **Escrow Released**

```html
Subject: Payment Released for Order #{{orderNumber}}

Hi {{vendorName}},

Good news! The escrow for order #{{orderNumber}} has been released.

Order Total: {{orderTotal}}
Platform Fee ({{commissionRate}}%): {{platformFee}}
Your Earnings: {{vendorEarnings}}

This amount will be included in your next payout.

View earnings: {{earningsUrl}}

— Marketplace Team
```

---

## 🧪 Sample Data (Seed Script)

```typescript
// prisma/seed.ts

// 1. Create vendor plans
await prisma.vendorPlan.createMany({
  data: [
    {
      name: 'Free',
      priceMonthly: 0,
      priceYearly: 0,
      commissionRate: 10,
      maxProducts: 50,
      maxImages: 5
    },
    {
      name: 'Pro',
      priceMonthly: 99000,
      priceYearly: 990000,
      commissionRate: 5,
      maxProducts: 500,
      maxImages: 20,
      featuredListings: true,
      analytics: true
    },
    {
      name: 'Premium',
      priceMonthly: 299000,
      priceYearly: 2990000,
      commissionRate: 3,
      maxProducts: -1, // Unlimited
      maxImages: -1,
      featuredListings: true,
      analytics: true,
      prioritySupport: true
    }
  ]
});

// 2. Create verified vendor
const vendor1 = await prisma.vendor.create({
  data: {
    userId: 'user-id-1',
    businessName: 'Tech Store',
    businessType: 'COMPANY',
    email: 'vendor@techstore.com',
    phone: '+628123456789',
    address: '123 Jakarta',
    city: 'Jakarta',
    postalCode: '12345',
    bankName: 'BCA',
    bankAccount: '1234567890',
    bankAccountName: 'PT Tech Store',
    status: 'VERIFIED',
    verifiedAt: new Date(),
    commissionRate: 10,
    verification: {
      create: {
        idCardFront: 'https://cdn.store.com/verification/ktp-1.jpg',
        idCardBack: 'https://cdn.store.com/verification/ktp-2.jpg',
        status: 'APPROVED',
        approvedAt: new Date()
      }
    }
  }
});

// 3. Create products for vendor
await prisma.product.createMany({
  data: [
    {
      vendorId: vendor1.id,
      name: 'Laptop Gaming XYZ',
      slug: 'laptop-gaming-xyz',
      price: 15000000,
      quantity: 20,
      description: 'High-performance gaming laptop'
    },
    {
      vendorId: vendor1.id,
      name: 'Mouse Wireless',
      slug: 'mouse-wireless',
      price: 150000,
      quantity: 100,
      description: 'Ergonomic wireless mouse'
    }
  ]
});

console.log('✅ Seeded 3 vendor plans, 1 verified vendor, 2 products');
```

---

## 📊 Analytics Queries

### **Platform GMV (Gross Merchandise Value)**

```typescript
// Total GMV (last 30 days)
const gmv = await prisma.order.aggregate({
  _sum: { total: true },
  where: {
    createdAt: { gte: subDays(new Date(), 30) },
    status: { not: 'CANCELED' }
  }
});

// Platform Revenue (commission)
const platformRevenue = await prisma.commission.aggregate({
  _sum: { commissionAmount: true },
  where: {
    createdAt: { gte: subDays(new Date(), 30) },
    status: 'COMPLETED'
  }
});
```

### **Top Vendors**

```typescript
const topVendors = await prisma.vendor.findMany({
  orderBy: { totalSales: 'desc' },
  take: 10,
  include: {
    _count: {
      select: { orders: true, products: true }
    }
  }
});
```

### **Vendor Payout Liability**

```typescript
// Unpaid earnings (pending payout)
const pendingEarnings = await prisma.commission.aggregate({
  _sum: { vendorEarnings: true },
  where: {
    status: 'COMPLETED',
    payoutId: null
  }
});

// This is money you owe to vendors
```

---

## 🚀 Deployment Checklist

- [ ] Set up escrow account with payment provider
- [ ] Configure commission rates per category
- [ ] Set up vendor verification workflow
- [ ] Test escrow release flow
- [ ] Configure payout schedule (weekly/bi-weekly)
- [ ] Set up dispute resolution process
- [ ] Create admin dashboard for vendor management
- [ ] Test bank transfer integration for payouts
- [ ] Set up automated tax reporting
- [ ] Create vendor guidelines/TOS

---

## 💡 Customization Ideas

### **1. Add Auction Feature**

```prisma
model Auction {
  id        String   @id @default(uuid())
  productId String   @unique
  startingPrice Decimal
  reservePrice Decimal?
  bidIncrement Decimal
  endsAt    DateTime
  status    AuctionStatus
  
  product   Product  @relation(fields: [productId], references: [id])
  bids      Bid[]
}

model Bid {
  id        String   @id @default(uuid())
  auctionId String
  bidderId  String
  amount    Decimal
  createdAt DateTime @default(now)
}
```

### **2. Add Vendor Analytics**

```typescript
// Dashboard for vendors
GET /api/v1/vendor/analytics

{
  "views": 15420,
  "clicks": 3200,
  "conversionRate": 2.1,
  "revenue": 45000000,
  "topProducts": [...],
  "salesTrend": [...]
}
```

### **3. Add Product Recommendations**

```typescript
// ML-based recommendations
GET /api/v1/products/recommendations?userId=xxx

// Based on:
- Browsing history
- Purchase history
- Similar users
- Trending products
```

---

## 🆘 Troubleshooting

### **Issue: Escrow not releasing**

**Solution:**
1. Check order status (must be DELIVERED)
2. Verify buyer confirmation
3. Check for active disputes

### **Issue: Payout failing**

**Solution:**
1. Verify vendor bank account details
2. Check minimum payout threshold
3. Ensure sufficient platform balance

### **Issue: Commission calculation wrong**

**Solution:**
1. Check vendor's commission rate (may have custom rate)
2. Verify subscription plan discounts
3. Review category-based rates

---

**Next Steps:**

1. Copy files to your project
2. Run migrations
3. Configure payment escrow
4. Set up vendor verification
5. Test order flow end-to-end
6. Launch! 🚀

[Back to Examples →](../README.md)
