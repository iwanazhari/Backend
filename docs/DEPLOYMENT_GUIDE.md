# 🚀 Deployment Guide

**Complete deployment instructions for AWS, GCP, and DigitalOcean**

---

## 📋 **Table of Contents**

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deploy to AWS](#deploy-to-aws)
3. [Deploy to Google Cloud (GCP)](#deploy-to-google-cloud-gcp)
4. [Deploy to DigitalOcean](#deploy-to-digitalocean)
5. [Database Migration](#database-migration)
6. [Environment Variables](#environment-variables)
7. [Monitoring & Logging](#monitoring--logging)
8. [Troubleshooting](#troubleshooting)

---

## ✅ **Pre-Deployment Checklist**

Before deploying to any cloud provider, ensure:

```
✅ All tests passing (npm run test)
✅ Build successful (npm run build)
✅ .env.example updated with all required variables
✅ Database schema finalized and migrated
✅ Docker image builds successfully
✅ Security scan completed (npm audit)
✅ Rate limiting configured
✅ CORS whitelist updated for production domain
✅ JWT secrets are strong random strings (min 32 chars)
✅ Backup strategy in place
✅ Monitoring/alerting configured
```

---

## 🌐 **Deploy to AWS**

### **Option 1: EC2 (Recommended for Start)**

#### **Step 1: Create EC2 Instance**

```bash
# AWS Console → EC2 → Launch Instance

Configuration:
- AMI: Amazon Linux 2023 or Ubuntu 22.04 LTS
- Instance Type: t3.medium (2 vCPU, 4GB RAM) - minimum
- Storage: 20GB GP3
- Security Group:
  - Port 22 (SSH) - Your IP
  - Port 3000 (HTTP) - 0.0.0.0/0
  - Port 443 (HTTPS) - 0.0.0.0/0
```

#### **Step 2: Connect and Setup**

```bash
# SSH into instance
ssh -i your-key.pem ec2-user@your-instance-ip

# Update system
sudo yum update -y  # Amazon Linux
# OR
sudo apt update && sudo apt upgrade -y  # Ubuntu

# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -  # Amazon Linux
sudo yum install -y nodejs

# OR for Ubuntu
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Docker
sudo yum install -y docker  # Amazon Linux
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# OR for Ubuntu
sudo apt install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

#### **Step 3: Deploy Application**

```bash
# Clone repository
git clone https://github.com/your-repo/backend-starter-kit.git
cd backend-starter-kit

# Install dependencies
npm ci --only=production

# Copy environment file
cp .env.example .env

# Edit .env
nano .env
```

```bash
# .env - Production values
NODE_ENV=production
PORT=3000

DATABASE_URL=postgresql://user:password@rds-endpoint.rds.amazonaws.com:5432/yourdb
REDIS_URL=redis://elasticache-endpoint:6379

JWT_SECRET=your-super-secret-min-32-chars-use-openssl-rand
JWT_REFRESH_SECRET=another-super-secret-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

FRONTEND_URL=https://your-frontend-domain.com
CORS_ORIGINS=https://your-frontend-domain.com,https://www.your-frontend-domain.com

LOG_LEVEL=info
```

#### **Step 4: Setup RDS (PostgreSQL)**

```bash
# AWS Console → RDS → Create Database

Configuration:
- Engine: PostgreSQL 15
- Template: Free tier (for testing) or Production
- DB Instance Class: db.t3.micro (free tier) or db.t3.small
- Storage: 20GB GP2
- Master username: postgres
- Master password: [strong password]
- VPC: Same as EC2
- Public access: No
- Security Group: Allow EC2 security group on port 5432

# After creation, get endpoint:
# your-db.xxxxxx.rds.amazonaws.com:5432
```

#### **Step 5: Setup ElastiCache (Redis)**

```bash
# AWS Console → ElastiCache → Create Cache Cluster

Configuration:
- Engine: Redis
- Version: 7.0
- Node Type: cache.t3.micro (free tier)
- Number of Nodes: 1
- Security Group: Allow EC2 security group on port 6379

# Get endpoint after creation:
# your-redis.xxxxxx.ng.0001.apse1.cache.amazonaws.com:6379
```

#### **Step 6: Run Migrations & Start**

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate:prod

# Build TypeScript
npm run build

# Start with PM2
pm2 start pm2.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Copy and run the command output
```

#### **Step 7: Setup Nginx Reverse Proxy**

```bash
# Install Nginx
sudo yum install -y nginx  # Amazon Linux
sudo systemctl start nginx
sudo systemctl enable nginx

# OR for Ubuntu
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Create Nginx config
sudo nano /etc/nginx/conf.d/backend-starter-kit.conf
```

```nginx
# /etc/nginx/conf.d/backend-starter-kit.conf
upstream backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name your-api-domain.com;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Rate limiting
        limit_req zone=api_limit burst=20 nodelay;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://backend/api/health;
        access_log off;
    }
}
```

```bash
# Test Nginx config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

#### **Step 8: Setup SSL with Let's Encrypt**

```bash
# Install Certbot
sudo amazon-linux-extras install epel -y  # Amazon Linux
sudo yum install -y certbot python3-certbot-nginx

# OR for Ubuntu
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-api-domain.com

# Auto-renewal (already configured by certbot)
sudo certbot renew --dry-run
```

---

### **Option 2: AWS ECS with Fargate (Serverless)**

#### **Step 1: Create Dockerfile**

```dockerfile
# Dockerfile (already included in starter kit)
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY dist ./dist
COPY prisma ./prisma

# Generate Prisma Client
RUN npx prisma generate

# Expose port
EXPOSE 3000

# Start app
CMD ["node", "dist/index.js"]
```

#### **Step 2: Build and Push to ECR**

```bash
# Create ECR repository
aws ecr create-repository --repository-name backend-starter-kit

# Login to ECR
aws ecr get-login-password --region ap-southeast-1 | \
  docker login --username AWS --password-stdin your-account-id.dkr.ecr.ap-southeast-1.amazonaws.com

# Build Docker image
docker build -t backend-starter-kit .

# Tag image
docker tag backend-starter-kit:latest \
  your-account-id.dkr.ecr.ap-southeast-1.amazonaws.com/backend-starter-kit:latest

# Push to ECR
docker push your-account-id.dkr.ecr.ap-southeast-1.amazonaws.com/backend-starter-kit:latest
```

#### **Step 3: Create ECS Task Definition**

```json
// task-definition.json
{
  "family": "backend-starter-kit",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::your-account-id:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "your-account-id.dkr.ecr.ap-southeast-1.amazonaws.com/backend-starter-kit:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "PORT", "value": "3000" }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:ssm:ap-southeast-1:your-account-id:parameter/backend/DATABASE_URL"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:ssm:ap-southeast-1:your-account-id:parameter/backend/JWT_SECRET"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/backend-starter-kit",
          "awslogs-region": "ap-southeast-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

```bash
# Register task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json
```

#### **Step 4: Create ECS Service**

```bash
# Create cluster
aws ecs create-cluster --cluster-name backend-cluster

# Create service
aws ecs create-service \
  --cluster backend-cluster \
  --service-name backend-service \
  --task-definition backend-starter-kit \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=backend,containerPort=3000"
```

---

## ☁️ **Deploy to Google Cloud (GCP)**

### **Option 1: Compute Engine (VM)**

#### **Step 1: Create VM Instance**

```bash
# Using gcloud CLI
gcloud compute instances create backend-starter-kit \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --machine-type=e2-medium \
  --boot-disk-size=20GB \
  --boot-disk-type=pd-balanced \
  --tags=http-server,https-server \
  --zone=asia-southeast1-a

# Create firewall rules
gcloud compute firewall-rules create allow-http \
  --allow tcp:3000 \
  --source-ranges 0.0.0.0/0 \
  --target-tags http-server
```

#### **Step 2: SSH and Setup**

```bash
# SSH into VM
gcloud compute ssh backend-starter-kit --zone=asia-southeast1-a

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Docker
sudo apt install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

#### **Step 3: Deploy Application**

```bash
# Clone and setup (same as AWS EC2)
git clone https://github.com/your-repo/backend-starter-kit.git
cd backend-starter-kit
npm ci --only=production
cp .env.example .env
# Edit .env with production values

# Setup Cloud SQL (PostgreSQL)
# Console → Cloud SQL → Create Instance
# Use private IP or public IP with authorized networks

# Setup Memorystore (Redis)
# Console → Memorystore → Create Instance

# Run migrations and start
npm run prisma:generate
npm run prisma:migrate:prod
npm run build
pm2 start pm2.config.js
pm2 save
pm2 startup
```

#### **Step 4: Setup Cloud Load Balancing**

```bash
# Create health check
gcloud compute health-checks create http backend-health-check \
  --port=3000 \
  --request-path=/api/health

# Create backend service
gcloud compute backend-services create backend-service \
  --load-balancing-scheme=EXTERNAL \
  --protocol=HTTP \
  --port-name=http \
  --health-checks=backend-health-check \
  --global

# Create URL map
gcloud compute url-maps create backend-map \
  --default-service backend-service \
  --global

# Create target HTTP proxy
gcloud compute target-http-proxies create backend-proxy \
  --url-map=backend-map

# Create forwarding rule
gcloud compute forwarding-rules create backend-rule \
  --load-balancing-scheme=EXTERNAL \
  --ports=80 \
  --target-http-proxy=backend-proxy \
  --global
```

#### **Step 5: Setup Cloud CDN (Optional)**

```bash
# Create Cloud CDN backend
gcloud compute backend-services update backend-service \
  --enable-cdn \
  --global
```

---

### **Option 2: Google Cloud Run (Serverless)**

#### **Step 1: Build Docker Image**

```bash
# Build for Cloud Run
docker build -t gcr.io/your-project-id/backend-starter-kit .

# Push to Container Registry
docker push gcr.io/your-project-id/backend-starter-kit
```

#### **Step 2: Deploy to Cloud Run**

```bash
# Deploy
gcloud run deploy backend-starter-kit \
  --image gcr.io/your-project-id/backend-starter-kit \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --concurrency 80 \
  --timeout 300 \
  --set-env-vars NODE_ENV=production,PORT=8080 \
  --set-secrets DATABASE_URL=DATABASE_URL_SECRET:latest,\
JWT_SECRET=JWT_SECRET_SECRET:latest
```

#### **Step 3: Setup Cloud SQL Proxy**

```yaml
# For Cloud Run with Cloud SQL
# Add to Cloud Run configuration:
--add-cloudsql-instances=your-project-id:region:instance-name
```

---

## 🟢 **Deploy to DigitalOcean**

### **Option 1: Droplet (VM)**

#### **Step 1: Create Droplet**

```bash
# Using doctl CLI
doctl compute droplet create backend-starter-kit \
  --image ubuntu-22-04-x64 \
  --size s-2vcpu-4gb \
  --region sgp1 \
  --ssh-keys your-ssh-key-fingerprint \
  --tag-names backend,production

# Create firewall
doctl compute firewall create backend-firewall \
  --inbound-rules "tcp:22,tcp:3000,tcp:443" \
  --droplet-tags backend,production
```

#### **Step 2: SSH and Setup**

```bash
# SSH into droplet
ssh root@your-droplet-ip

# Run setup script
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs
npm install -g pm2
apt install -y docker.io
systemctl start docker
systemctl enable docker
```

#### **Step 3: Deploy Application**

```bash
# Clone and setup
git clone https://github.com/your-repo/backend-starter-kit.git
cd backend-starter-kit
npm ci --only=production
cp .env.example .env

# Setup Managed Database (PostgreSQL)
# DigitalOcean Console → Databases → Create Cluster
# Get connection string and update .env

# Setup Managed Redis
# DigitalOcean Console → Databases → Create Redis Cluster

# Run and start
npm run prisma:generate
npm run prisma:migrate:prod
npm run build
pm2 start pm2.config.js
pm2 save
pm2 startup
```

#### **Step 4: Setup Load Balancer**

```bash
# Create Load Balancer
doctl compute load-balancer create backend-lb \
  --region sgp1 \
  --forwarding-rules "entry_port:80,target_port:3000,entry_protocol:http,target_protocol:http" \
  --health-check "protocol:http,port:3000,path:/api/health" \
  --droplet-tag backend,production
```

#### **Step 5: Setup Docker Swarm (Optional for Clustering)**

```bash
# Initialize swarm on manager
docker swarm init

# Get join token
docker swarm join-token worker

# Join workers
docker swarm join --token TOKEN MANAGER_IP:2377

# Create overlay network
docker network create -d overlay backend-network

# Deploy stack
docker stack deploy -c docker-compose.prod.yml backend
```

---

## 🗄️ **Database Migration**

### **Production Migration**

```bash
# Generate migration (development)
npm run prisma:migrate

# Apply in production
npm run prisma:migrate:prod

# Or manually
npx prisma migrate deploy
```

### **Backup Strategy**

#### **AWS RDS Backup**

```bash
# Enable automated backups (Console → RDS → Backup)
# Retention: 7-30 days
# Backup window: Off-peak hours

# Manual snapshot before migration
aws rds create-db-snapshot \
  --db-instance-identifier your-db \
  --db-snapshot-identifier pre-migration-snapshot
```

#### **GCP Cloud SQL Backup**

```bash
# Create backup
gcloud sql backups create --instance=your-instance

# Schedule automated backups
gcloud sql instances patch your-instance \
  --backup-start-time 02:00 \
  --backup-retention 7
```

#### **DigitalOcean Backup**

```bash
# Enable automated backups (Console → Databases → Settings)
# Daily backups included in managed database
```

---

## 🔐 **Environment Variables**

### **Production .env Template**

```bash
# Server
NODE_ENV=production
PORT=3000

# Database (Managed Service)
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require

# Redis (Managed Service)
REDIS_URL=rediss://user:password@host:6379?ssl=true

# JWT (Use strong random strings!)
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS
FRONTEND_URL=https://your-frontend.com
CORS_ORIGINS=https://your-frontend.com,https://www.your-frontend.com

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/backend-starter-kit/app.log

# Optional
API_KEY_HEADER=X-API-Key
SENTRY_DSN=https://xxx@sentry.io/yyy
```

### **Generate Strong Secrets**

```bash
# Generate JWT_SECRET
openssl rand -base64 32

# Generate JWT_REFRESH_SECRET
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📊 **Monitoring & Logging**

### **PM2 Monitoring**

```bash
# View status
pm2 status

# Monitor in real-time
pm2 monit

# View logs
pm2 logs backend-starter-kit

# Memory usage
pm2 monit --only-memory
```

### **AWS CloudWatch**

```bash
# Create log group
aws logs create-log-group --log-group-name /ecs/backend-starter-kit

# Create metric filter for errors
aws logs put-metric-filter \
  --log-group-name /ecs/backend-starter-kit \
  --filter-name error-count \
  --filter-pattern "ERROR" \
  --metric-transformations metricName=ErrorCount,metricNamespace=Backend,metricValue=1

# Create alarm
aws cloudwatch put-metric-alarm \
  --alarm-name backend-error-alarm \
  --metric-name ErrorCount \
  --namespace Backend \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:region:account:topic-name
```

### **GCP Cloud Monitoring**

```bash
# Create uptime check
gcloud monitoring uptime create backend-uptime \
  --display-name="Backend API Uptime" \
  --resource-type=gce_instance \
  --protocol=http \
  --path=/api/health \
  --port=3000 \
  --check-interval=60s \
  --timeout=10s

# Create alert policy
gcloud alpha monitoring policies create --policy-from-file=alert-policy.json
```

### **DigitalOcean Monitoring**

```bash
# Enable monitoring (included with Droplets)
# Console → Monitoring → Create Alert Policy

# Create alert for CPU
# Metric: CPU Utilization
# Threshold: > 80%
# Window: 5 minutes
# Notify: Email, Slack, PagerDuty
```

### **Application Logging**

```typescript
// src/utils/logger.ts (already configured)
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});
```

---

## 🆘 **Troubleshooting**

### **Common Issues**

#### **1. Database Connection Failed**

```bash
# Check security group allows database port
# AWS: EC2 → Security Groups → Inbound Rules
# GCP: VPC Network → Firewall
# DO: Networking → Firewalls

# Test connection
psql postgresql://user:password@host:5432/dbname

# Check environment variable
echo $DATABASE_URL
```

#### **2. Port Already in Use**

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=3001
```

#### **3. PM2 App Won't Start**

```bash
# Check PM2 logs
pm2 logs backend-starter-kit --err

# Check if build exists
ls -la dist/

# Rebuild if needed
npm run build

# Restart
pm2 restart backend-starter-kit
```

#### **4. High Memory Usage**

```bash
# Check memory
pm2 monit

# Reduce PM2 instances
# Edit pm2.config.js
instances: 2  // Instead of 'max'

# Restart
pm2 restart backend-starter-kit
```

#### **5. SSL Certificate Issues**

```bash
# Renew certificate
sudo certbot renew

# Check Nginx config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## 📞 **Support**

- **Documentation:** `docs/`
- **GitHub Issues:** [Your Repository]
- **Discord:** [Your Discord Link]

---

**Last Updated:** 2026-04-28  
**Version:** 5.0
