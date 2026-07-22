# Dito Orders Portal

> A unified Next.js web application for Dito Google Workspace customers to manage active subscriptions, calculate prorated seat pricing, and submit license order requests.

---

## 🏗️ Architecture Overview

The application is built as a single, unified **Next.js (App Router)** application running in Node.js server memory. It eliminates external proxy middleware and multi-tier REST API overhead by executing Google APIs directly within Next.js Server Components and Route Handlers.

```mermaid
flowchart TD
    User([Customer Browser]) <-->|HttpOnly Session Cookie| NextApp[Next.js 15 App Router]
    
    subgraph Server Side Logic
        NextApp -->|Direct Node.js Prefetching| ResellerSvc[Google Reseller API v1]
        NextApp -->|Live Catalog Sync| SheetsSvc[Google Sheets API v4]
        NextApp -->|Order Dispatch| GmailSvc[Google Gmail API v1]
    end

    ResellerSvc <-->|Subscriptions & Seats| GoogleAPI[Google Workspace APIs]
    SheetsSvc <-->|Product Catalog Sheet| GoogleSheets[GCP Google Sheets]
    GmailSvc <-->|HTML Notifications| AdminInbox[Operations & AR Team]
```

### Key Technical Pillars

1. **Server-Side Data Prefetching & Parallel Execution**:
   - [`src/app/request_license/page.tsx`](file:///Users/juan/Documents/Apps/also/src/app/request_license/page.tsx) prefetches customer details, active Reseller subscriptions, and live product catalog data concurrently using `Promise.all()`, delivering instant SSR form rendering (~500ms).

2. **Tenant Domain Isolation & Security**:
   - Security enforced via [`src/lib/services/domain-auth.ts`](file:///Users/juan/Documents/Apps/also/src/lib/services/domain-auth.ts). Requests are strictly validated against the authenticated user's Google Workspace domain. URL query parameter impersonation is blocked.

3. **Google Reseller & Sheets Integration**:
   - [`src/lib/services/google-reseller.ts`](file:///Users/juan/Documents/Apps/also/src/lib/services/google-reseller.ts) manages Google Workspace Customer details, lists active subscriptions, updates seat counts, and syncs live product pricing from the master Google Sheet catalog.

4. **Automated Order Dispatch via Gmail API**:
   - [`src/lib/services/mailer.ts`](file:///Users/juan/Documents/Apps/also/src/lib/services/mailer.ts) formats HTML email receipts and sends them natively via Google Gmail API v1 using Service Account domain-wide delegation (`GOOGLE_ADMIN_SUBJECT_EMAIL`).

---

## 📁 Directory Structure

```text
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/            # Sign in, Sign out, Account Login & Context Handlers
│   │   │   ├── products/        # Live Products List & Prorated Cost Calculator API
│   │   │   ├── subscriptions/   # Active Customer Subscriptions API
│   │   │   └── orders/          # Order Submission API (Seat Increments + Email)
│   │   ├── request_license/     # License Request Form (Server Component)
│   │   ├── sign_in_error/       # Login / Domain Error Screen
│   │   ├── thank-you/           # Order Success Confirmation Screen
│   │   ├── globals.css          # Core Styling Tokens & Custom Glassmorphism CSS
│   │   ├── layout.tsx           # Global App Shell & Metadata
│   │   └── page.tsx             # Login Landing Page
│   ├── components/
│   │   ├── ui/combobox.tsx      # Accessible Product Search & Filter Dropdown
│   │   ├── license-request-form.tsx # Interactive License Form & Price Calculator
│   │   ├── navbar.tsx           # Header Navigation & User Session Menu
│   │   ├── footer.tsx           # Official Copyright & Footer Links
│   │   └── logo.tsx             # Dito SVG Logo Component
│   └── lib/
│       ├── services/
│       │   ├── auth-session.ts  # HttpOnly Cookie Session Reader
│       │   ├── domain-auth.ts   # Tenant Domain Validation Helper
│       │   ├── google-reseller.ts # Google Reseller v1 & Sheets v4 Service
│       │   └── mailer.ts        # Gmail API v1 Email Notification Service
│       └── types.ts             # Shared TypeScript Interfaces (Product, Subscription, Order)
├── public/                      # Static Brand Assets (Logos, Favicons, Previews)
├── Dockerfile                   # Multi-Stage Production Dockerfile for GCP Cloud Run
├── next.config.js               # Next.js Production Configuration (output: 'standalone')
├── tailwind.config.ts           # Tailwind CSS Configuration
└── .env.example                 # Sanitized Environment Variable Template
```

---

## 🔑 Environment Configuration

Create a `.env.local` file in the root directory by copying `.env.example`:

```bash
cp .env.example .env.local
```

### Required Variables

| Environment Variable | Description | Example |
| :--- | :--- | :--- |
| `PORT` | Application server port | `3000` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | GCP Service Account Email | `also-production@dito-also-production.iam.gserviceaccount.com` |
| `GOOGLE_ADMIN_SUBJECT_EMAIL` | Google Workspace Reseller Admin Email | `michelle@reseller.ditoweb.com` |
| `GOOGLE_PRIVATE_KEY` | GCP Service Account Private Key (RSA) | `"-----BEGIN PRIVATE KEY-----\n..."` |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Master Catalog Google Sheet ID | `1mTUa44Wun2YHIbCT7D7VYa1NWcfYuddLpJgBSHHjGTA` |
| `NOTIFICATION_EMAIL_TO` | Order Notification Recipients (Comma-separated) | `ar@ditoweb.com,ops@ditoweb.com` |
| `ALLOWED_ORIGINS` | Allowed CORS Origins | `http://localhost:3000` |

---

## 🚀 Running Locally

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

3. **Local Flow Verification**:
   - Navigate to `http://localhost:3000/`.
   - Click **Sign In with Google**.
   - Input test email (e.g., `juan@demo.ditoweb.com`).
   - Verify redirection to `/request_license` and confirm catalog options populate cleanly in the dropdown.

---

## 🐳 Production Deployment (GCP Cloud Run / Docker)

The application includes an optimized multi-stage `Dockerfile` configured for **Next.js Standalone Mode** (`node server.js`), resulting in a lightweight container footprint (<150MB).

### 1. Build Production Container locally
```bash
docker build -t dito-orders-portal .
```

### 2. Run Container locally
```bash
docker run -p 8080:8080 --env-file .env.local dito-orders-portal
```

### 3. Deploy to GCP Cloud Run
```bash
# Push container to GCP Container / Artifact Registry
gcr.io/dito-also-production/dito-orders-portal:latest

# Deploy to Cloud Run
gcloud run deploy dito-orders-portal \
  --image gcr.io/dito-also-production/dito-orders-portal:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_ADMIN_SUBJECT_EMAIL="michelle@reseller.ditoweb.com",GOOGLE_SHEETS_SPREADSHEET_ID="1mTUa44Wun2YHIbCT7D7VYa1NWcfYuddLpJgBSHHjGTA"
```

---

## 🛠️ Maintenance & Operations Guide

### 1. Updating Product Catalog & Pricing
Product catalog options and pricing are managed live via Google Sheets (no code deployment required).

- **Google Sheet Tab**: `PRODUCTS` (Range: `PRODUCTS!A1:Z500`)
- **Columns Structure**:
  - `Column 3 (D)`: Price (numeric string, e.g., `30.00`)
  - `Column 4 (E)`: Billing Type (`1` for Monthly, `0` for Annual)
  - `Column 5 (F)`: Product Display Name
  - `Column 10 (K)`: Product Code / SKU Key
  - `Column 11 (L)`: Description
  - `Column 12 (M)`: Google SKU ID

### 2. Updating Google API Authorization Scopes
If additional Google Workspace Reseller or Admin SDK permissions are needed, update `RESELLER_SCOPES` and `SPREADSHEET_SCOPES` in [`src/lib/services/google-reseller.ts`](file:///Users/juan/Documents/Apps/also/src/lib/services/google-reseller.ts#L6-L8).

### 3. Monitoring & Troubleshooting Logs
All server operations emit formatted JSON logs:
- `[SHEETS API]`: Google Sheets catalog sync events.
- `[RESELLER API ERROR]`: Reseller API status & authentication issues.
- `[GMAIL API]`: Order notification email dispatch logs.
