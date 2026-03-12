# SiyaBusa ERP - Real Monthly Operating Budget

## March 2026 — Actual Costs

---

## What We're Actually Paying Right Now

### Infrastructure (R130/month)

| Service | Plan | Monthly | Notes |
|:--------|:-----|--------:|:------|
| **Vultr VPS** | 2GB RAM, 1 vCPU, 55GB SSD (JHB) | R115 | Runs everything: Node.js, PostgreSQL, Redis, Nginx |
| **Domain** | siyabusaerp.co.za | R15 | ~R180/year |
| **SSL (Let's Encrypt)** | Auto-renew | R0 | Free |
| **Subtotal** | | **R130** | |

### SaaS Services (R340/month currently)

| Service | Plan | Monthly | Notes |
|:--------|:-----|--------:|:------|
| **GitHub** | Pro/Team | R190 | Code hosting, CI/CD, Codespaces |
| **Resend** | Free tier | R0 | 3,000 emails/month — enough for now |
| **Daily.co** | Free tier | R0 | 2,000 participant minutes/month |
| **AI (Groq)** | Free tier | R0 | Llama 3 — fast, free, good quality |
| **Codespace** | Monthly usage | R150 | Dev environment (varies) |
| **Subtotal** | | **R340** | |

### Current Total: R470/month

---

## Phase 1 Budget — First 10 Customers (1–100 users)

When we start getting paying customers, these services need upgrading:

| Service | Plan | Monthly | When |
|:--------|:-----|--------:|:-----|
| **Vultr VPS** | 4GB RAM, 2 vCPU, 80GB SSD | R230 | At 20+ users |
| **Vultr Auto-Backup** | Weekly snapshots | R45 | Immediately (data safety) |
| **Domain** | siyabusaerp.co.za | R15 | Ongoing |
| **GitHub** | Team | R190 | Ongoing |
| **Resend** | Pro (50K emails) | R380 | At 20+ users |
| **Daily.co** | Free → Scale when needed | R0–550 | When video usage grows |
| **Claude API (Haiku 3.5)** | Pay-as-you-go | R95–190 | Optional — Groq is free |
| **Codespace** | Dev environment | R150 | Ongoing |
| **Subtotal** | | **R1,105–R1,750** | |

### Revenue vs Cost (Phase 1)

| Customers | Users | MRR | Infra Cost | Profit |
|:----------|:------|:----|:-----------|:-------|
| 1 (founding) | 10 | R1,499 | R470 | R1,029 |
| 3 (founding) | 30 | R4,497 | R1,200 | R3,297 |
| 5 (founding) | 50 | R7,495 | R1,400 | R6,095 |
| 10 (mixed) | 80 | R12,000 | R1,750 | R10,250 |

---

## Phase 2 Budget — Growth (100–500 users)

| Service | Plan | Monthly | Notes |
|:--------|:-----|--------:|:------|
| **Vultr VPS** | 8GB RAM, 4 vCPU, 160GB | R760 | Handles 200+ concurrent |
| **Vultr Managed DB** | PostgreSQL dedicated | R570 | Separate DB for reliability |
| **Vultr Auto-Backup** | Daily snapshots | R150 | Critical data protection |
| **Domain + SSL** | Same | R15 | |
| **GitHub** | Team | R190 | |
| **Resend** | Business (100K emails) | R950 | Scale with users |
| **Daily.co** | Scale plan | R550 | $29/mo |
| **Claude API (Haiku)** | Pay-as-you-go | R475 | ~13K queries/month |
| **Monitoring** | Uptime Robot or similar | R0–100 | Free tier available |
| **Codespace** | Dev environment | R150 | |
| **Subtotal** | | **~R3,910** | |

### Revenue vs Cost (Phase 2)

| Customers | Users | MRR | Infra Cost | Profit |
|:----------|:------|:----|:-----------|:-------|
| 15 | 150 | R44,850 | R3,500 | R41,350 |
| 25 | 250 | R74,750 | R3,910 | R70,840 |
| 50 | 500 | R149,500 | R4,500 | R145,000 |

---

## Phase 3 Budget — Scale (500+ users)

| Service | Plan | Monthly | Notes |
|:--------|:-----|--------:|:------|
| **Vultr/Cloud** | Multiple VPS or cluster | R3,000+ | Load balanced |
| **Managed PostgreSQL** | High-availability | R2,000 | Primary + replica |
| **Redis Managed** | Dedicated | R380 | Session cache + queues |
| **Resend** | Enterprise | R1,900 | 500K+ emails |
| **Daily.co** | Business | R1,900 | Unlimited |
| **Claude API** | Higher usage | R1,900 | Premium model if needed |
| **CDN** | Vultr/Cloudflare | R0–500 | Static assets |
| **Backups** | Geo-redundant | R500 | Cross-region |
| **Monitoring** | Paid (Sentry/similar) | R500 | Error tracking |
| **Subtotal** | | **~R12,580** | |

At this point, 500+ users at R299/user = R149,500+ MRR. Infra is <10% of revenue.

---

## AI Provider Strategy

Priority order (already coded in ai-agent.service.ts):

| Priority | Provider | Cost | Best For |
|:---------|:---------|:-----|:---------|
| 1st | **Groq** (Llama 3) | FREE | Day-to-day queries, reports, lookups |
| 2nd | **Claude Haiku 3.5** | ~R95–190/mo | Better quality when Groq isn't enough |
| 3rd | **Claude Sonnet 4** | ~R475–950/mo | Complex analysis, financial insights |
| Fallback | **OpenAI GPT-4** | ~R950+/mo | Alternative if Anthropic has issues |

**Recommendation:** Start with Groq (free). Add Claude Haiku when customers request better AI quality.

### Claude API Credits Reference

| Monthly Spend | Haiku Queries | Per User (10 users) |
|:-------------|:--------------|:--------------------|
| R95 ($5) | ~2,600 | ~260/user |
| R190 ($10) | ~5,300 | ~530/user |
| R475 ($25) | ~13,300 | ~1,330/user |
| R950 ($50) | ~26,600 | ~2,660/user |

---

## Cost Per User Summary

| Phase | Users | Total Infra | Cost/User/Month | Price/User | Margin |
|:------|:------|:------------|:----------------|:-----------|:-------|
| Now | 10 | R470 | R47 | R150* | 69% |
| Phase 1 | 50 | R1,400 | R28 | R150–299 | 81–91% |
| Phase 2 | 250 | R3,910 | R16 | R299 | 95% |
| Phase 3 | 500 | R12,580 | R25 | R299 | 92% |

*Founding Member rate: R1,499 ÷ 10 = R150/user

---

## Payment Summary — What We Pay Today

| To | For | Monthly |
|:---|:----|--------:|
| Vultr | VPS hosting (JHB) | R115 |
| Registrar | siyabusaerp.co.za domain | R15 |
| GitHub | Code hosting + Codespaces | R340 |
| **Total** | | **R470** |

Everything else is on free tiers. First founding member covers 3x our costs.

---

*Updated March 2026. All ZAR amounts at ~R19/$1 USD.*
