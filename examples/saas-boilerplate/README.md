# 📊 SaaS Boilerplate - Subscription-Based Platform

**Build a production-ready SaaS platform with recurring billing in 3-4 days**

---

## 🎯 Business Model

Subscription-based software with tiered pricing (Free/Pro/Enterprise)

### **Revenue Streams:**
- Monthly/Yearly subscriptions
- Usage-based overages
- Additional team seats
- Premium support upgrades

---

## 🚀 Quick Start

```bash
# From project root
cd examples/saas-boilerplate

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

# Seed database with sample data
npm run prisma:seed

# Start development
npm run dev

# API running at http://localhost:3000
# Docs at http://localhost:3000/api/docs
```

---

## 📁 File Structure

```
saas-boilerplate/
├── prisma/
│   ├── schema.prisma           # Main schema (merge with existing)
│   ├── subscription.prisma     # Subscription models
│   └── seed.ts                 # Sample data
│
├── src/
│   ├── controllers/
│   │   ├── SubscriptionController.ts
│   │   ├── UsageController.ts
│   │   ├── TeamController.ts
│   │   └── WebhookController.ts
│   │
│   ├── services/
│   │   ├── SubscriptionService.ts
│   │   ├── UsageService.ts
│   │   ├── TeamService.ts
│   │   └── PaymentService.ts
│   │
│   ├── repositories/
│   │   ├── SubscriptionRepository.ts
│   │   ├── UsageRepository.ts
│   │   └── TeamRepository.ts
│   │
│   ├── routes/
│   │   ├── subscription.routes.ts
│   │   ├── usage.routes.ts
│   │   ├── team.routes.ts
│   │   └── webhook.routes.ts
│   │
│   ├── middleware/
│   │   └── subscription.ts     # Check active subscription
│   │
│   └── templates/
│       └── emails/
│           ├── subscription-confirmation.html
│           ├── payment-failed.html
│           └── trial-ending.html
│
└── README.md
```

---

## 🗄️ Database Schema

### **Core Models**

```prisma
// User (already in main schema)
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  password      String
  firstName     String
  lastName      String?
  role          Role     @default(USER)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  subscription  Subscription?
  team          Team?
  teamMemberships TeamMember[]
}

// Subscription Tiers
model SubscriptionTier {
  id              String   @id @default(uuid())
  name            String   // Free, Pro, Enterprise
  slug            String   @unique
  priceMonthly    Decimal  @db.Decimal(10, 2)
  priceYearly     Decimal  @db.Decimal(10, 2)
  currency        String   @default("USD")
  
  // Limits
  maxTeamMembers  Int      @default(1)
  maxApiCalls     Int      @default(1000)
  maxStorageGB    Decimal  @default(1.0)
  
  // Features
  features        Json     // { analytics: true, api: true, support: "email" }
  
  subscriptions   Subscription[]
  
  @@unique([slug, currency])
}

// Active Subscriptions
model Subscription {
  id              String   @id @default(uuid())
  userId          String   @unique
  tierId          String
  status          SubscriptionStatus @default(TRIAL)
  
  // Billing
  billingCycle    BillingCycle @default(MONTHLY)
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  
  // Payment
  paymentMethodId String?
  lastPaymentDate DateTime?
  nextPaymentDate DateTime?
  lastPaymentAmount Decimal? @db.Decimal(10, 2)
  
  // Trial
  trialStart      DateTime?
  trialEnd        DateTime?
  trialConverted  Boolean  @default(false)
  
  // Cancellation
  canceledAt      DateTime?
  cancelReason    String?
  endsAt          DateTime?  // Access until this date
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  user            User             @relation(fields: [userId], references: [id])
  tier            SubscriptionTier @relation(fields: [tierId], references: [id])
  usage           Usage?
  payments        Payment[]
  
  @@index([userId])
  @@index([status])
  @@index([currentPeriodEnd])
}

// Usage Tracking
model Usage {
  id              String   @id @default(uuid())
  subscriptionId  String   @unique
  
  // Current period usage
  apiCalls        Int      @default(0)
  storageUsed     Decimal  @default(0.0) @db.Decimal(10, 2)
  teamMembers     Int      @default(1)
  
  // Period
  periodStart     DateTime
  periodEnd       DateTime
  
  // Overage
  overageCharges  Decimal  @default(0.0) @db.Decimal(10, 2)
  
  updatedAt       DateTime @updatedAt
  
  subscription    Subscription @relation(fields: [subscriptionId], references: [id])
  
  @@index([subscriptionId])
}

// Payment Methods
model PaymentMethod {
  id              String   @id @default(uuid())
  userId          String
  provider        String   // stripe, paypal
  providerId      String   // pm_xxxxx
  type            String   // card, bank_account
  last4           String?
  brand           String?  // visa, mastercard
  expMonth        Int?
  expYear         Int?
  isDefault       Boolean  @default(false)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  user            User      @relation(fields: [userId], references: [id])
  payments        Payment[]
  
  @@index([userId])
}

// Payment History
model Payment {
  id              String   @id @default(uuid())
  subscriptionId  String
  paymentMethodId String?
  
  amount          Decimal  @db.Decimal(10, 2)
  currency        String   @default("USD")
  status          PaymentStatus
  
  // Provider
  provider        String
  providerId      String   // pi_xxxxx (Stripe)
  providerData    Json?    // Full response from provider
  
  // Invoice
  invoiceUrl      String?
  invoiceNumber   String?
  
  // Type
  paymentType     PaymentType @default(SUBSCRIPTION)
  description     String?
  
  // Dates
  paidAt          DateTime?
  failedAt        DateTime?
  
  createdAt       DateTime @default(now())
  
  subscription    Subscription  @relation(fields: [subscriptionId], references: [id])
  paymentMethod   PaymentMethod? @relation(fields: [paymentMethodId], references: [id])
  
  @@index([subscriptionId])
  @@index([status])
  @@index([createdAt])
}

// Team Management
model Team {
  id              String   @id @default(uuid())
  name            String
  slug            String   @unique
  ownerId         String   @unique
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  owner           User          @relation(fields: [ownerId], references: [id])
  members         TeamMember[]
  
  @@index([slug])
}

model TeamMember {
  id              String   @id @default(uuid())
  teamId          String
  userId          String   @unique
  role            TeamRole @default(MEMBER)
  
  invitedAt       DateTime @default(now())
  joinedAt        DateTime?
  
  team            Team   @relation(fields: [teamId], references: [id])
  user            User   @relation(fields: [userId], references: [id])
  
  @@index([teamId])
  @@index([userId])
}

// Enums
enum SubscriptionStatus {
  TRIAL
  ACTIVE
  PAST_DUE
  CANCELED
  EXPIRED
}

enum BillingCycle {
  MONTHLY
  YEARLY
}

enum PaymentStatus {
  PENDING
  SUCCEEDED
  FAILED
  REFUNDED
}

enum PaymentType {
  SUBSCRIPTION
  USAGE
  ONE_TIME
  REFUND
}

enum TeamRole {
  OWNER
  ADMIN
  MEMBER
}
```

---

## 🔌 API Endpoints

### **Subscription Management**

```typescript
// Upgrade/Downgrade subscription
POST /api/v1/subscription/upgrade
{
  "tierSlug": "pro",
  "billingCycle": "monthly", // or "yearly"
  "paymentMethodId": "pm_xxxxx"
}

// Cancel subscription
POST /api/v1/subscription/cancel
{
  "reason": "too_expensive" // optional
}

// Resume canceled subscription (during grace period)
POST /api/v1/subscription/resume

// Get current subscription
GET /api/v1/subscription/current

// Get available tiers
GET /api/v1/subscription/tiers

// Switch billing cycle
POST /api/v1/subscription/billing-cycle
{
  "cycle": "yearly"
}
```

### **Usage Tracking**

```typescript
// Track API call
POST /api/v1/usage/track
{
  "type": "api_call",
  "quantity": 1,
  "metadata": {
    "endpoint": "/api/v1/users",
    "method": "GET"
  }
}

// Get current usage
GET /api/v1/usage/current

// Get usage history
GET /api/v1/usage/history?period=last_3_months
```

### **Team Management**

```typescript
// Invite team member
POST /api/v1/team/invite
{
  "email": "member@company.com",
  "role": "member" // or "admin"
}

// Accept invitation
POST /api/v1/team/invite/accept
{
  "token": "xxxxx"
}

// Remove team member
DELETE /api/v1/team/members/:userId

// Update member role
PUT /api/v1/team/members/:userId/role
{
  "role": "admin"
}

// Get team members
GET /api/v1/team/members

// Leave team
POST /api/v1/team/leave
```

### **Payment Methods**

```typescript
// Add payment method
POST /api/v1/payment-methods
{
  "provider": "stripe",
  "cardToken": "tok_visa" // from Stripe.js
}

// List payment methods
GET /api/v1/payment-methods

// Set default payment method
PUT /api/v1/payment-methods/:id/default

// Remove payment method
DELETE /api/v1/payment-methods/:id
```

### **Webhooks (Provider)**

```typescript
// Stripe webhook
POST /api/v1/webhooks/stripe
{
  "type": "invoice.payment_succeeded",
  "data": { ... }
}

// Handle payment failures
POST /api/v1/webhooks/stripe
{
  "type": "invoice.payment_failed",
  "data": { ... }
}
```

---

## 💼 Business Logic

### **Subscription Flow**

```typescript
// 1. User signs up → Auto-create FREE tier subscription
POST /api/v1/auth/register
→ SubscriptionService.createFreeTier(userId)

// 2. User upgrades to PRO
POST /api/v1/subscription/upgrade
→ SubscriptionService.upgrade({
  userId,
  tierSlug: 'pro',
  billingCycle: 'monthly',
  paymentMethodId
})
→ PaymentService.createPaymentIntent()
→ SubscriptionService.activate()

// 3. Track usage
POST /api/v1/usage/track
→ UsageService.track({
  subscriptionId,
  type: 'api_call',
  quantity: 1
})
→ Check limits → Alert if > 80%

// 4. End of billing cycle
→ SubscriptionService.renew()
→ PaymentService.charge()
→ UsageService.reset()
```

### **Usage Limits & Overage**

```typescript
// Check if within limits
UsageService.checkLimits(subscriptionId) {
  const usage = await this.getUsage(subscriptionId);
  const tier = await this.getTier(subscriptionId);
  
  if (usage.apiCalls > tier.maxApiCalls) {
    // Option 1: Block
    throw new LimitExceededError('API call limit exceeded');
    
    // Option 2: Allow with overage charges
    const overage = usage.apiCalls - tier.maxApiCalls;
    const overageCharge = overage * 0.001; // $0.001 per call
    await this.addOverageCharge(subscriptionId, overageCharge);
  }
}
```

### **Dunning Management (Failed Payments)**

```typescript
// Payment failed → Retry logic
PaymentService.handleFailedPayment(subscriptionId) {
  // Day 1: First failure
  // Send email: "Payment failed - please update card"
  
  // Day 3: First retry
  // Retry charge
  
  // Day 5: Second failure
  // Send email: "Second attempt failed"
  
  // Day 7: Third retry
  // Retry charge
  
  // Day 10: Final failure
  // Downgrade to FREE tier
  // Send email: "Subscription canceled due to non-payment"
}
```

---

## 📧 Email Templates

### **Trial Ending Soon**

```html
Subject: Your trial ends in {{daysLeft}} days

Hi {{firstName}},

Your {{tierName}} trial is ending soon. You have {{daysLeft}} days left.

Current usage:
- API Calls: {{apiCalls}} / {{maxApiCalls}}
- Team Members: {{teamMembers}} / {{maxTeamMembers}}
- Storage: {{storageUsed}}GB / {{maxStorageGB}}GB

To continue enjoying {{tierName}} features, update your payment method:

[Update Payment Method]

Questions? Reply to this email.

— The Team
```

### **Payment Failed**

```html
Subject: Payment failed for {{productName}}

Hi {{firstName}},

We were unable to process your payment of {{amount}}.

Reason: {{failureReason}}

Please update your payment method to avoid service interruption:

[Update Payment Method]

Your subscription will be paused in {{daysUntilPause}} days if payment is not received.

— The Team
```

---

## 🧪 Sample Data (Seed Script)

```typescript
// prisma/seed.ts

// 1. Create subscription tiers
await prisma.subscriptionTier.createMany({
  data: [
    {
      name: 'Free',
      slug: 'free',
      priceMonthly: 0,
      priceYearly: 0,
      maxTeamMembers: 1,
      maxApiCalls: 1000,
      maxStorageGB: 1,
      features: {
        analytics: false,
        api: true,
        support: 'community',
        customDomain: false
      }
    },
    {
      name: 'Pro',
      slug: 'pro',
      priceMonthly: 29,
      priceYearly: 290,
      maxTeamMembers: 5,
      maxApiCalls: 100000,
      maxStorageGB: 10,
      features: {
        analytics: true,
        api: true,
        support: 'email',
        customDomain: true
      }
    },
    {
      name: 'Enterprise',
      slug: 'enterprise',
      priceMonthly: 99,
      priceYearly: 990,
      maxTeamMembers: 100,
      maxApiCalls: 1000000,
      maxStorageGB: 100,
      features: {
        analytics: true,
        api: true,
        support: 'priority',
        customDomain: true,
        sla: true,
        dedicatedManager: true
      }
    }
  ]
});

// 2. Create sample users with subscriptions
const user1 = await prisma.user.create({
  data: {
    email: 'free@example.com',
    password: '$2b$10$...',
    firstName: 'Free',
    lastName: 'User',
    subscription: {
      create: {
        tierId: 'free-tier-id',
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    }
  }
});

const user2 = await prisma.user.create({
  data: {
    email: 'pro@example.com',
    password: '$2b$10$...',
    firstName: 'Pro',
    lastName: 'User',
    subscription: {
      create: {
        tierId: 'pro-tier-id',
        status: 'ACTIVE',
        billingCycle: 'YEARLY',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        trialConverted: true
      }
    }
  }
});

console.log('✅ Seeded 3 subscription tiers and 2 sample users');
```

---

## 🧪 Testing

### **Test Subscription Flow**

```typescript
// tests/integration/subscription.test.ts

describe('Subscription Flow', () => {
  it('should upgrade from Free to Pro', async () => {
    // 1. Create user with Free tier
    const user = await createTestUser({ tier: 'free' });
    
    // 2. Upgrade to Pro
    const response = await request(app)
      .post('/api/v1/subscription/upgrade')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        tierSlug: 'pro',
        billingCycle: 'monthly',
        paymentMethodId: 'pm_test'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.data.subscription.tier.name).toBe('Pro');
    expect(response.body.data.subscription.status).toBe('ACTIVE');
  });
  
  it('should track usage and alert at 80%', async () => {
    const user = await createTestUser({ tier: 'pro' });
    
    // Make 80,000 API calls (80% of 100,000 limit)
    for (let i = 0; i < 80000; i++) {
      await trackUsage(user.subscriptionId, 'api_call');
    }
    
    // Should trigger alert
    const alerts = await prisma.alert.findMany({
      where: { subscriptionId: user.subscriptionId }
    });
    
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].type).toBe('USAGE_THRESHOLD');
  });
});
```

---

## 📊 Analytics Queries

### **MRR (Monthly Recurring Revenue)**

```typescript
// Get current MRR
const mrr = await prisma.subscription.aggregate({
  _sum: {
    lastPaymentAmount: true
  },
  where: {
    status: { in: ['ACTIVE', 'TRIAL'] },
    currentPeriodEnd: { gte: new Date() }
  }
});
```

### **Churn Rate**

```typescript
// Monthly churn rate
const lastMonth = new Date();
lastMonth.setMonth(lastMonth.getMonth() - 1);

const canceledLastMonth = await prisma.subscription.count({
  where: {
    status: 'CANCELED',
    canceledAt: { gte: lastMonth }
  }
});

const totalCustomers = await prisma.subscription.count({
  where: {
    status: { in: ['ACTIVE', 'TRIAL'] }
  }
});

const churnRate = (canceledLastMonth / totalCustomers) * 100;
```

### **Usage Trends**

```typescript
// API calls per day (last 30 days)
const usageTrend = await prisma.usage.groupBy({
  by: ['periodStart'],
  _sum: { apiCalls: true },
  where: {
    periodStart: { gte: lastMonth }
  },
  orderBy: { periodStart: 'asc' }
});
```

---

## 🚀 Deployment Checklist

- [ ] Set up Stripe account + get API keys
- [ ] Configure webhook endpoints
- [ ] Test payment flow in test mode
- [ ] Set up email templates (SendGrid/Mailgun)
- [ ] Configure usage tracking limits
- [ ] Test dunning management (failed payments)
- [ ] Set up analytics dashboard
- [ ] Create pricing page (frontend)
- [ ] Add FAQ section
- [ ] Test on production environment

---

## 💡 Customization Ideas

### **1. Add Annual Discount**
```typescript
const yearlyDiscount = 0.17; // 17% off (equivalent to 2 months free)
const yearlyPrice = monthlyPrice * 12 * (1 - yearlyDiscount);
```

### **2. Add Usage-Based Pricing**
```typescript
// Base tier + usage overage
const basePrice = 29;
const overageRate = 0.001; // $0.001 per API call
const totalUsage = 150000;
const includedUsage = 100000;
const overage = totalUsage - includedUsage;
const overageCharge = overage * overageRate;
const totalBill = basePrice + overageCharge; // $79
```

### **3. Add Referral Program**
```typescript
// Give $10 credit for each referral
await prisma.credit.create({
  data: {
    userId,
    amount: 10,
    reason: 'referral',
    referralUserId: referredUserId
  }
});
```

---

## 🆘 Troubleshooting

### **Issue: Webhook not firing**

**Solution:**
1. Check Stripe webhook endpoint URL
2. Verify webhook signature in middleware
3. Use Stripe CLI for local testing:
   ```bash
   stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe
   ```

### **Issue: Usage not tracking**

**Solution:**
1. Ensure `UsageService.track()` is called in every controller
2. Check database connection
3. Verify subscription ID is passed correctly

### **Issue: Payment failed but subscription still active**

**Solution:**
1. Implement webhook handler for `invoice.payment_failed`
2. Add retry logic with exponential backoff
3. Set up automated dunning emails

---

**Next Steps:**

1. Copy files to your project
2. Run migrations
3. Configure Stripe keys
4. Test payment flow
5. Launch! 🚀

[Back to Examples →](../README.md)
