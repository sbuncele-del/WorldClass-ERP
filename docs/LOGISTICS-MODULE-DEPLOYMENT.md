# Logistics Module Deployment Guide

## Overview

This document provides instructions for deploying the Logistics Module of WorldClass ERP to AWS. The module includes:

- **Fleet Management**: Vehicle tracking and maintenance
- **Driver Management**: Driver profiles and assignments
- **Trip Management**: Trip planning and execution
- **Load Planning**: Optimal load distribution
- **Fuel Management**: Fuel transactions and reconciliation
- **Document Processing**: OCR-powered document extraction
- **Dashboard**: Real-time logistics metrics

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        AWS Cloud                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────┐     ┌───────────────┐     ┌───────────────┐ │
│  │   S3 Bucket   │     │  EC2 Instance │     │   RDS         │ │
│  │   (Frontend)  │────▶│  (Backend)    │────▶│  PostgreSQL   │ │
│  │               │     │  Port 3000    │     │               │ │
│  └───────────────┘     └───────────────┘     └───────────────┘ │
│         │                     │                                 │
│         └─────────────────────┴─────────────────────────────────│
│                               │                                  │
│                        ┌──────▼──────┐                          │
│                        │  CloudFront │ (Optional - HTTPS/CDN)   │
│                        └─────────────┘                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **EC2 Instance** running (t3.micro or larger)
3. **RDS PostgreSQL** database configured
4. **S3 Bucket** for frontend hosting
5. **Node.js 20+** installed on EC2

## Environment Variables

### Backend (.env)

```bash
# Database
DATABASE_URL=postgresql://user:password@rds-endpoint:5432/worldclass_erp

# Server
PORT=3000
NODE_ENV=production

# JWT
JWT_SECRET=your-secure-jwt-secret-key

# AWS (for document processing)
AWS_REGION=eu-north-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

### Frontend (.env.production)

```bash
VITE_API_URL=http://your-ec2-ip-or-domain
VITE_APP_NAME=WorldClass ERP
VITE_ENVIRONMENT=production
```

## GitHub Actions Deployment

### Required Secrets

Configure these in GitHub → Settings → Secrets and Variables → Actions:

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS IAM access key |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key |
| `EC2_SSH_KEY` | Private SSH key for EC2 access |
| `S3_BUCKET_NAME` | S3 bucket name for frontend |
| `CLOUDFRONT_DISTRIBUTION_ID` | (Optional) CloudFront distribution |

### Deployment Workflow

The deployment is triggered on:
- Push to `main` branch
- Manual trigger via GitHub Actions

To manually deploy:
1. Go to GitHub → Actions → "Deploy to AWS"
2. Click "Run workflow"
3. Select which components to deploy (backend/frontend)
4. Click "Run workflow"

## Manual Deployment

### Deploy Backend

```bash
# On your local machine
cd backend
npm install
npm run build

# Create deployment package
tar -czf backend-deploy.tar.gz dist package.json package-lock.json

# Copy to EC2
scp -i your-key.pem backend-deploy.tar.gz ec2-user@your-ec2-ip:/tmp/

# SSH into EC2
ssh -i your-key.pem ec2-user@your-ec2-ip

# On EC2
cd /var/www/backend
tar -xzf /tmp/backend-deploy.tar.gz
npm install --production

# Restart with PM2
pm2 restart worldclass-erp
```

### Deploy Frontend

```bash
# On your local machine
cd frontend
npm install
VITE_API_URL=http://your-ec2-ip npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name --delete
```

## Logistics API Endpoints

### Dashboard
- `GET /api/logistics/dashboard` - Get logistics dashboard metrics

### Vehicles
- `GET /api/logistics/vehicles` - List all vehicles
- `GET /api/logistics/vehicles/:id` - Get vehicle details
- `POST /api/logistics/vehicles` - Create new vehicle
- `PUT /api/logistics/vehicles/:id` - Update vehicle
- `DELETE /api/logistics/vehicles/:id` - Delete vehicle (soft delete)

### Drivers
- `GET /api/logistics/drivers` - List all drivers
- `GET /api/logistics/drivers/:id` - Get driver details
- `POST /api/logistics/drivers` - Create new driver
- `PUT /api/logistics/drivers/:id` - Update driver
- `DELETE /api/logistics/drivers/:id` - Delete driver (soft delete)

### Trips
- `GET /api/logistics/trips` - List all trips
- `GET /api/logistics/trips/:id` - Get trip details
- `POST /api/logistics/trips` - Create new trip
- `PUT /api/logistics/trips/:id` - Update trip
- `POST /api/logistics/trips/:id/start` - Start a trip
- `POST /api/logistics/trips/:id/complete` - Complete a trip with POD

### Fuel Management
- `GET /api/logistics/fuel` - List fuel transactions
- `POST /api/logistics/fuel` - Create fuel transaction
- `POST /api/logistics/fuel/:id/reconcile` - Reconcile fuel transaction

### Loads
- `GET /api/logistics/loads` - List loads
- `GET /api/logistics/loads/:id` - Get load details
- `POST /api/logistics/loads` - Create load
- `PUT /api/logistics/loads/:id/status` - Update load status

### Maintenance
- `GET /api/logistics/maintenance` - Get maintenance records
- `POST /api/logistics/maintenance` - Create maintenance record

### Document Processing
- `POST /api/logistics/documents/extract` - Extract data from document (OCR)

## Testing the Deployment

### Health Check

```bash
curl http://your-ec2-ip:3000/health
# Expected: {"status":"OK","message":"Server is running"}
```

### Logistics Dashboard

```bash
curl -H "Authorization: Bearer <token>" http://your-ec2-ip:3000/api/logistics/dashboard
```

### Vehicles List

```bash
curl -H "Authorization: Bearer <token>" http://your-ec2-ip:3000/api/logistics/vehicles
```

## Frontend-Backend Integration

The frontend connects to the backend via the `VITE_API_URL` environment variable. The API service (`frontend/src/services/api.service.ts`) handles:

- Adding authentication tokens
- Tenant context headers
- Error handling
- Response parsing

### Logistics Service

A dedicated logistics service (`frontend/src/services/logistics.service.ts`) provides typed API calls:

```typescript
import logisticsService from './services/logistics.service';

// Get dashboard stats
const stats = await logisticsService.getDashboardStats();

// Get vehicles
const { vehicles, total } = await logisticsService.getVehicles({ page: 1, limit: 10 });

// Create a trip
const trip = await logisticsService.createTrip({
  vehicle_id: 'vehicle-uuid',
  driver_id: 'driver-uuid',
  trip_date: '2025-11-30',
  pickup_location: 'Johannesburg',
  delivery_location: 'Cape Town'
});
```

## Troubleshooting

### Backend not responding

```bash
# SSH into EC2
ssh -i your-key.pem ec2-user@your-ec2-ip

# Check PM2 status
pm2 status

# View logs
pm2 logs worldclass-erp --lines 100

# Restart
pm2 restart worldclass-erp
```

### Database connection issues

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1"

# Check if logistics schema exists
psql $DATABASE_URL -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'logistics';"
```

### Frontend API connection issues

1. Check browser console for CORS errors
2. Verify `VITE_API_URL` is correctly set
3. Ensure EC2 security group allows port 3000

## Security Recommendations

1. **Use HTTPS**: Set up CloudFront or an ALB with SSL
2. **Environment Variables**: Use AWS Secrets Manager for sensitive data
3. **Rate Limiting**: Already configured via `express-rate-limit`
4. **CORS**: Configure allowed origins in production

## Monthly Cost Estimate (AWS Free Tier)

| Service | Cost |
|---------|------|
| EC2 t3.micro | $0 (Free Tier) |
| RDS db.t3.micro | $0 (Free Tier) |
| S3 Storage | $0 (5GB Free) |
| Data Transfer | $0 (15GB Free) |
| **Total (First Year)** | **$0/month** |

After Free Tier expires: ~$30-40/month

---

*Last Updated: November 2025*
