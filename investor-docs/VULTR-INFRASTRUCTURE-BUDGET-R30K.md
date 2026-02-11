# SiyaBusa ERP - Infrastructure Funding Request
## R30,000 for 3-Month Runway (February - April 2026)

**Document Date:** February 3, 2026  
**Prepared for:** Investor Review  
**Objective:** First paying customer by March 2026 🎉

---

## Current Infrastructure Status

| Component | Current Status | Details |
|-----------|---------------|---------|
| **Server** | ✅ Live on Vultr | Johannesburg datacenter (low latency for SA) |
| **Database** | ✅ PostgreSQL running | Docker container on same server |
| **Backend API** | ✅ 400+ endpoints | Node.js/TypeScript/Express |
| **Frontend** | ✅ Production-ready | React + Vite, served via Nginx |
| **Domain** | ✅ Active | worldclass.co.za / siyabusaerp.co.za |

### Current Vultr Server Specs
| Spec | Value |
|------|-------|
| CPU | 1 vCPU (Intel Xeon Cascadelake) |
| RAM | 2 GB |
| Storage | 55 GB NVMe SSD |
| Location | Johannesburg, South Africa |
| OS | Ubuntu 22.04 LTS |
| **Monthly Cost** | ~$12/month (~R220/month) |

---

## Why Vultr is Good for Production

### ✅ Advantages for South African SaaS

1. **Johannesburg Datacenter** — Sub-20ms latency to SA users
2. **Cost-Effective** — 60-70% cheaper than AWS for similar specs
3. **Simple Pricing** — No hidden egress fees like AWS
4. **Scalable** — Easy to upgrade as we grow
5. **Reliable** — 99.99% SLA, NVMe storage

### Vultr vs AWS Comparison

| Feature | Vultr | AWS (Cape Town) |
|---------|-------|-----------------|
| 2GB RAM, 1 vCPU | $12/mo (R220) | $35/mo (R650) |
| 4GB RAM, 2 vCPU | $24/mo (R440) | $70/mo (R1,300) |
| 8GB RAM, 4 vCPU | $48/mo (R880) | $140/mo (R2,600) |
| Data transfer | 2TB included | Pay per GB (expensive!) |
| Database | Self-managed (free) | RDS adds R1,500+/mo |

**Verdict:** Vultr saves us R3,000-R5,000/month vs AWS while providing:
- Same reliability
- Better SA latency
- Simpler management

---

## Complete Technology Stack & Services

### 1. Hosting & Infrastructure (Vultr) — PRIMARY INVESTMENT

| Service | Spec | Monthly | Purpose |
|---------|------|---------|---------|
| **Main Production** | 8GB/4vCPU | R880 | SiyaBusa ERP application |
| **Database Server** | 4GB/2vCPU | R440 | PostgreSQL dedicated |
| **Additional Apps** | 4GB/2vCPU | R440 | Future apps, client projects |
| **Backup/Staging** | 2GB/1vCPU | R220 | DR + testing environment |
| **Block Storage** | 100GB | R180 | Documents, backups, media |
| **Subtotal** | | **R2,160/mo** | Rounded to R2,000/mo |

*Note: Vultr capacity supports multiple applications beyond SiyaBusa ERP*

### 2. Development & Source Control

| Service | Plan | Monthly | Purpose |
|---------|------|---------|---------|
| **GitHub** | Team (3 users) | R550 | Private repos, Actions CI/CD |
| **GitHub Codespaces** | 60 hours | R400 | Cloud development |
| **Subtotal** | | **R950/mo** | |

### 3. Email & Communication

| Service | Plan | Monthly | Purpose |
|---------|------|---------|---------|
| **Resend** | Pro | R450 | Transactional emails (50K/mo) |
| **Twilio** | Pay-as-go | R400 | SMS notifications (~400 SMS) |
| **Daily.co** | Free tier | R0 | Video meetings (built-in) |
| **Subtotal** | | **R850/mo** | |

### 4. AI Services (xAI Grok Only)

| Service | Plan | Monthly | Purpose |
|---------|------|---------|---------|
| **xAI (Grok)** | API Credits | R800 | Bank categorization, smart queries, AI assistant |
| **Subtotal** | | **R800/mo** | |

*One AI provider handles everything: bank transaction categorization, natural language queries, smart document extraction*

**Why just xAI?** The system has fallback support for multiple providers, but we only need one. xAI (Grok) is cost-effective and powerful enough for our needs.

### 5. Monitoring & Security

| Service | Plan | Monthly | Purpose |
|---------|------|---------|---------|
| **UptimeRobot** | Free | R0 | Uptime monitoring |
| **Let's Encrypt** | Free | R0 | SSL certificates |
| **Cloudflare** | Free | R0 | DDoS protection, CDN |
| **Subtotal** | | **R0/mo** | Using free tiers |

### 6. Domain & DNS

| Service | Plan | Monthly | Purpose |
|---------|------|---------|---------|
| **Domains** | 2 domains | R50 | siyabusaerp.co.za, worldclass.co.za |
| **Subtotal** | | **R50/mo** | |

---

## Detailed 3-Month Budget

### Month 1: February 2026 — Launch Month

#### Infrastructure & Services
| Item | Amount | Notes |
|------|--------|-------|
| **Vultr Main Production** | R880 | 8GB/4vCPU server |
| **Vultr Database** | R440 | 4GB/2vCPU PostgreSQL |
| **Vultr Additional Apps** | R440 | Future apps capacity |
| **Vultr Backup/Staging** | R220 | DR + testing |
| **Block Storage** | R180 | 100GB documents |
| **GitHub Team** | R550 | Source control + CI/CD |
| **GitHub Codespaces** | R400 | Development |
| **Resend Email** | R450 | Transactional emails |
| **Twilio SMS** | R400 | Notifications |
| **xAI (Grok)** | R800 | AI categorization & queries |
| **Domains** | R200 | Annual renewals |
| **Infra Subtotal** | **R4,960** | |

#### Marketing
| Item | Amount | Notes |
|------|--------|-------|
| **LinkedIn Ads** | R2,500 | Lead generation |
| **Google Ads** | R1,500 | Search intent |
| **Content Creation** | R1,000 | Videos, graphics |
| **Marketing Subtotal** | **R5,000** | |

#### Operations
| Item | Amount | Notes |
|------|--------|-------|
| **Transport** | R1,200 | Client meetings, demos |
| **Mobile/Data** | R600 | Business comms |
| **Contingency** | R240 | 5% buffer |
| **Ops Subtotal** | **R2,040** | |

| **MONTH 1 TOTAL** | **R12,000** | |

---

### Month 2: March 2026 — First Client! 🎉

#### Infrastructure & Services
| Item | Amount | Notes |
|------|--------|-------|
| **Vultr Main Production** | R880 | |
| **Vultr Database** | R440 | |
| **Vultr Additional Apps** | R440 | |
| **Vultr Backup/Staging** | R220 | |
| **Block Storage** | R180 | |
| **GitHub Team** | R550 | |
| **Resend Email** | R450 | |
| **Twilio SMS** | R400 | |
| **xAI (Grok)** | R800 | |
| **Infra Subtotal** | **R4,360** | |

#### Marketing
| Item | Amount | Notes |
|------|--------|-------|
| **LinkedIn Ads** | R2,000 | Retargeting |
| **Google Ads** | R1,000 | |
| **First Client Celebration** | R500 | PR announcement |
| **Marketing Subtotal** | **R3,500** | |

#### Operations
| Item | Amount | Notes |
|------|--------|-------|
| **Client Onboarding** | R1,500 | Data migration support |
| **Transport** | R1,200 | Client visits |
| **Mobile/Data** | R600 | |
| **Contingency** | R340 | 5% buffer |
| **Ops Subtotal** | **R3,640** | |

| **MONTH 2 TOTAL** | **R11,500** | |

---

### Month 3: April 2026 — Scale

#### Infrastructure & Services
| Item | Amount | Notes |
|------|--------|-------|
| **Vultr Main Production** | R880 | |
| **Vultr Database** | R440 | |
| **Vultr Additional Apps** | R440 | |
| **Vultr Backup/Staging** | R220 | |
| **Block Storage** | R180 | |
| **GitHub Team** | R550 | |
| **Resend Email** | R450 | |
| **Twilio SMS** | R400 | |
| **xAI (Grok)** | R800 | |
| **Infra Subtotal** | **R4,360** | |

#### Marketing
| Item | Amount | Notes |
|------|--------|-------|
| **LinkedIn Ads** | R1,500 | Maintaining |
| **Google Ads** | R500 | |
| **Marketing Subtotal** | **R2,000** | |

#### Operations
| Item | Amount | Notes |
|------|--------|-------|
| **Transport** | R800 | |
| **Mobile/Data** | R600 | |
| **Contingency** | R240 | 5% buffer |
| **Ops Subtotal** | **R1,640** | |

| **MONTH 3 TOTAL** | **R8,000** | |

*Note: Month 3 has buffer of R1,500 that can roll to Month 4 or cover unexpected costs*

---

## Total Budget Summary

| Category | Feb | Mar | Apr | **3-Month Total** |
|----------|-----|-----|-----|-------------------|
| **Vultr Hosting** | R2,160 | R2,160 | R2,160 | R6,480 |
| **GitHub** | R950 | R550 | R550 | R2,050 |
| **Email (Resend)** | R450 | R450 | R450 | R1,350 |
| **SMS (Twilio)** | R400 | R400 | R400 | R1,200 |
| **AI (xAI Grok)** | R800 | R800 | R800 | R2,400 |
| **Domains** | R200 | R0 | R0 | R200 |
| **Marketing** | R5,000 | R3,500 | R2,000 | R10,500 |
| **Operations** | R2,040 | R3,640 | R1,640 | R7,320 |
| **TOTAL** | **R12,000** | **R11,500** | **R8,000** | **R31,500** |

*Adjusted total: R30,000 (R1,500 buffer absorbed into operations)*

### By Category (3-Month Totals)

| Category | Amount | % of Budget |
|----------|--------|-------------|
| 🖥️ **Infrastructure** (Vultr) | R6,000 | **20%** |
| 💻 **Development** (GitHub) | R2,050 | 7% |
| 📧 **Communications** (Resend + Twilio) | R2,550 | 8.5% |
| 🤖 **AI Services** (xAI Grok only) | R2,400 | **8%** |
| 📢 **Marketing** | R10,500 | 35% |
| 🚗 **Operations** | R6,500 | 21.5% |
| **TOTAL** | **R30,000** | 100% |

---

## Service Details & Why We Need Them

### 🖥️ Vultr Infrastructure (R6,000 over 3 months) — BIGGEST INVESTMENT

| Server | Spec | Purpose |
|--------|------|---------|
| **Main Production** | 8GB/4vCPU | SiyaBusa ERP - handles all customer traffic |
| **Database** | 4GB/2vCPU | Dedicated PostgreSQL for performance |
| **Additional Apps** | 4GB/2vCPU | Future client projects, other apps |
| **Backup/Staging** | 2GB/1vCPU | Disaster recovery + testing |
| **Block Storage** | 100GB | Documents, invoices, reports |

**Why heavy on Vultr?** This infrastructure supports not just SiyaBusa but future apps and client hosting — it's a platform investment.

### 🤖 AI Service (R2,400 over 3 months) — xAI Grok Only

| Feature | What It Does |
|---------|--------------|
| Bank categorization | Auto-categorize thousands of transactions |
| Natural language queries | "Show me all unpaid invoices over R5,000" |
| Smart suggestions | AI recommends GL accounts based on patterns |

**Why just one AI?** The system supports multiple providers (xAI, OpenAI, Anthropic) but falls back automatically. One provider is enough — we chose xAI for cost-effectiveness.

### 📧 Resend Email (R1,350 over 3 months)

| Feature | Benefit |
|---------|---------|
| Transactional emails | Password resets, invoices, notifications |
| 50,000 emails/month | Scales with customers |
| 99.9% deliverability | No spam folder issues |
| Webhook support | Real-time delivery tracking |

### 📱 Twilio SMS (R1,200 over 3 months)

| Feature | Benefit |
|---------|---------|
| Delivery notifications | "Your order #123 is out for delivery" |
| 2FA security | Login verification codes |
| Appointment reminders | Healthcare module integration |
| ~400 SMS/month | ~R1/SMS in SA |

### 💻 GitHub Team (R2,050 over 3 months)

| Feature | Benefit |
|---------|---------|
| Private repositories | Secure source code |
| GitHub Actions | Automated testing & deployment |
| 3 team members | Collaborative development |
| Issue tracking | Bug & feature management |

### 🚗 Operations (R6,500 over 3 months)

| Item | 3-Month Total | Purpose |
|------|---------------|---------|
| **Transport** | R3,200 | Client meetings, demos, networking |
| **Mobile/Data** | R1,800 | Business phone, mobile data |
| **Client Onboarding** | R1,500 | Data migration, setup support |
| **Contingency** | R820 | 5% buffer for unexpected |

---

## Expected Outcomes

### By End of March 2026
- ✅ **First paying customer** onboarded
- ✅ 20+ qualified leads in pipeline
- ✅ 5+ demo meetings conducted
- ✅ Infrastructure proven stable
- ✅ AI features working (categorization, queries)

### Revenue Projection
| Month | Customers | MRR (Monthly Revenue) |
|-------|-----------|----------------------|
| March | 1 | R1,500 |
| April | 2-3 | R3,000 - R4,500 |
| May | 4-5 | R6,000 - R7,500 |

**Break-even:** ~10 customers = R15,000 MRR (covers all costs)

---

## Why This is a Low-Risk Investment

1. **Product is DONE** — 25 modules, 400+ APIs, production deployed
2. **Infrastructure is CHEAP** — Vultr costs 70% less than AWS
3. **Market is READY** — 95,000 SMEs need affordable ERP
4. **Timeline is SHORT** — First customer in 60 days
5. **Amount is SMALL** — R30,000 for 3 months = R10,000/month

---

## The Ask

> **R30,000 to get our first paying customer and prove the market.**

This funds:
- ✅ 3 months of production infrastructure (Vultr)
- ✅ Enterprise AI capabilities (xAI + OpenAI)
- ✅ Professional communications (Resend + Twilio)
- ✅ Development tools (GitHub Team)
- ✅ Targeted marketing to reach SME decision-makers
- ✅ Operational costs to onboard and support customers

**Success metric:** First R1,500 MRR by March 31, 2026.

---

## Infrastructure Scaling Path

As customers grow, infrastructure scales cost-effectively:

| Customers | Vultr Spec | Monthly Cost |
|-----------|------------|--------------|
| 1-10 | 4GB/2vCPU | R880 |
| 10-50 | 8GB/4vCPU | R1,760 |
| 50-100 | 16GB/6vCPU | R3,520 |
| 100+ | Kubernetes cluster | R7,000+ |

**Key:** Each customer pays R1,500+/month, infrastructure costs per customer **decrease** as we scale.

---

## Full Tech Stack Summary

| Layer | Technology | Status |
|-------|------------|--------|
| **Hosting** | Vultr (Johannesburg) | ✅ Live |
| **Backend** | Node.js + TypeScript + Express | ✅ 400+ APIs |
| **Frontend** | React + Vite + TypeScript | ✅ Production |
| **Database** | PostgreSQL 15 | ✅ Running |
| **Cache** | Redis | ✅ Configured |
| **Email** | Resend | 🔄 Ready to activate |
| **SMS** | Twilio | 🔄 Ready to activate |
| **AI** | xAI (Grok) + OpenAI (GPT-4) | ✅ Integrated |
| **Video** | Daily.co | ✅ Built-in |
| **Monitoring** | UptimeRobot + Cloudflare | ✅ Free tier |
| **Source Control** | GitHub | ✅ Active |
| **CI/CD** | GitHub Actions | ✅ Configured |
| **SSL** | Let's Encrypt | ✅ Free |
| **CDN** | Cloudflare | ✅ Free tier |

---

## Contact

**SiyaBusa ERP**  
Website: siyabusaerp.co.za  
Status: Production-ready, deployed on Vultr Johannesburg

*"Enterprise ERP for the rest of us."*
