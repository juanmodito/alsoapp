<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Strict Prohibition of Mock & Hardcoded Data & Pricing

- **NO Mock or Hardcoded Data/Pricing**: NEVER hardcode mock user credentials, email addresses, domain names, mock products, prices, or dummy fallback numbers anywhere in backend routes, components, or services.
- **Strict Real Data**: Always require authentic runtime data from real request parameters, authentic authentication sessions, live Google Sheets API, or official Google Reseller API responses.
- **No Dummy Fallbacks**: If data or pricing is missing, invalid, or unauthenticated, return proper error states (e.g. 401 Unauthorized, 404 Not Found) or redirect to the authentic login flow rather than returning dummy or mock fallback data.
