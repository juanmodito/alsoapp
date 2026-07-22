# Dito Orders Portal

A unified Next.js web application for Dito customers to request additional Google Workspace licenses and enterprise software add-ons.

## Features

- **Google Workspace Tenant Authentication**: Authenticates domain ownership via Google Workspace OAuth / domain verification with HttpOnly session cookies.
- **Live Product Catalog**: Fetches real-time products and pricing directly from Google Sheets API v4.
- **Google Reseller Integration**: Fetches active subscriptions and manages seat count adjustments via Google Reseller API v1.
- **Email Notifications**: Generates HTML email order confirmations sent to Dito Operations and Accounts Receivable teams.

## Tech Stack

- **Framework**: Next.js 15 (App Router, Server Components, Route Handlers)
- **Styling**: Tailwind CSS & Vanilla CSS Design Tokens
- **Integrations**: `googleapis` (Google Reseller API v1, Google Sheets API v4), `nodemailer`

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Fill in your authentic Google Service Account credentials (`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_ADMIN_SUBJECT_EMAIL`), Google Sheets Catalog ID (`GOOGLE_SHEETS_SPREADSHEET_ID`), and Nodemailer SMTP settings.

3. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Production Build**:
   ```bash
   npm run build
   npm start
   ```

## Production Docker Deployment

```bash
docker build -t dito-orders-portal .
docker run -p 3000:3000 --env-file .env.local dito-orders-portal
```
# alsoapp
# alsoapp
