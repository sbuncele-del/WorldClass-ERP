# Hosting Proposals on proposals.sgbsgroup.co.za

## Overview

This moves the proposals from Vercel's default URL to a branded subdomain:
**`proposals.sgbsgroup.co.za`**

---

## Step 1 — DNS Record (domains.co.za)

Go to your DNS management panel at **domains.co.za** for `sgbsgroup.co.za` and **add one CNAME record**:

| Host | TTL | Type | Priority | Value |
|------|-----|------|----------|-------|
| `proposals.sgbsgroup.co.za` | 3600 | CNAME | 0 | `cname.vercel-dns.com` |

> **Note:** Your wildcard `*.sgbsgroup.co.za` currently points to `sgbsgroup.co.za` (which is `197.221.14.108`). You need an **explicit** `proposals` CNAME to override the wildcard and point to Vercel.

### How to add it:
1. Log into domains.co.za Customer Portal
2. Go to **Manage Services → Domains → sgbsgroup.co.za → Manage DNS Records**
3. In the "Add DNS Record" form:
   - **Host:** `proposals.sgbsgroup.co.za`
   - **TTL:** `3600`
   - **Type:** `CNAME`
   - **Priority:** `0`
   - **Value:** `cname.vercel-dns.com`
4. Click **Add**

---

## Step 2 — Deploy to Vercel

### Option A: Deploy from CLI (if Vercel CLI is installed)

```bash
cd proposals/
vercel --prod
```

### Option B: Fresh deploy (link new project)

```bash
cd proposals/
npx vercel login
npx vercel link    # Create new project or link to existing "sgbs-proposals"
npx vercel --prod
```

---

## Step 3 — Add Custom Domain in Vercel

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Open the **sgbs-proposals** project
3. Go to **Settings → Domains**
4. Add domain: `proposals.sgbsgroup.co.za`
5. Vercel will verify the CNAME record automatically
6. SSL certificate is provisioned automatically (free)

---

## Result — URL Structure

Once deployed, your clients access proposals at:

| URL | What it shows |
|-----|---------------|
| `proposals.sgbsgroup.co.za` | Main proposals portal (all clients) |
| `proposals.sgbsgroup.co.za/motshwane-group/` | Dr Motshwane landing page |
| `proposals.sgbsgroup.co.za/motshwane-group/proposal-dr-motshwane.html` | Full proposal |
| `proposals.sgbsgroup.co.za/motshwane-group/services-checklist-dr-motshwane.html` | Checklist |
| `proposals.sgbsgroup.co.za/property-denvour/` | Property Denvour landing page |
| `proposals.sgbsgroup.co.za/humba/` | HUMBA website proposal |

### Clean URL aliases (via vercel.json rewrites):
| Clean URL | Resolves to |
|-----------|-------------|
| `proposals.sgbsgroup.co.za/motshwane/` | Motshwane landing page |
| `proposals.sgbsgroup.co.za/motshwane/proposal/` | Full proposal |
| `proposals.sgbsgroup.co.za/motshwane/checklist/` | Services checklist |

---

## Professional Communication Flow

When sending a proposal to a client, you send them the branded link:

### Email template:
```
Subject: Professional Services Proposal — [Client Name]

Dear [Client],

Please find your proposal at the link below:

🔗 https://proposals.sgbsgroup.co.za/motshwane-group/

This secure page contains:
  • Full Proposal — scope of services, pricing, and terms
  • Services Checklist — select your services, sign, and return

Should you wish to discuss any aspect of the proposal, 
please don't hesitate to reach out.

Kind regards,
Sibusiso Mavuso
SGBS Group (Pty) Ltd
```

### Why this looks professional:
1. **Branded domain** — `proposals.sgbsgroup.co.za` not `sgbs-proposals.vercel.app`
2. **SSL secured** — green padlock, HTTPS
3. **Landing page** — client sees a polished portal, not a raw file
4. **Two documents** — proposal + checklist, clearly separated
5. **Consistent branding** — navy/gold colour scheme, Playfair Display serif headings
6. **Print-ready** — both HTML documents print cleanly to A4
7. **Mobile responsive** — works on phone, tablet, desktop
8. **Confidential notice** — reference numbers and "prepared exclusively for" messaging

---

## Adding Future Proposals

To add a new client proposal:

1. Create a folder: `proposals/new-client-name/`
2. Add an `index.html` landing page (copy from an existing one)
3. Add proposal files (HTML or PDF)
4. Update `proposals/index.html` to add a new card
5. Deploy: `cd proposals && vercel --prod`

---

## File Structure

```
proposals/
├── index.html                          ← Main portal (all clients)
├── vercel.json                         ← Routing, headers, clean URLs
├── motshwane-group/
│   ├── index.html                      ← Motshwane landing page
│   ├── proposal-dr-motshwane.html      ← Full proposal
│   ├── services-checklist-dr-motshwane.html  ← Checklist
│   └── *.pdf                           ← PDF versions
├── property-denvour/
│   ├── index.html                      ← Property Denvour landing page
│   └── *.pdf                           ← PDF proposal
└── humba/
    ├── index.html                      ← HUMBA landing page
    └── *.pdf                           ← PDF proposal
```
