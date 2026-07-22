import { google } from 'googleapis';
import { getGoogleAuth } from './google-reseller';

const GMAIL_SEND_SCOPE = ['https://www.googleapis.com/auth/gmail.send'];

export interface EmailPayload {
  customerEmail: string;
  customerDomain: string;
  productName: string;
  productCode?: string;
  skuCode?: string;
  licenses: number;
  totalPrice: number;
  isAnnual?: boolean;
  comments?: string;
}

export async function sendOrderConfirmationEmail(payload: EmailPayload) {
  const adminEmail = process.env.GOOGLE_ADMIN_SUBJECT_EMAIL || 'michelle@reseller.ditoweb.com';
  const recipients = process.env.NOTIFICATION_EMAIL_TO
    ? `${process.env.NOTIFICATION_EMAIL_TO}, ${payload.customerEmail}`
    : `ar@ditoweb.com, ops@ditoweb.com, ${payload.customerEmail}`;

  const subject = `[Order Request] ${payload.licenses} License(s) requested for ${payload.customerDomain}`;
  const licenseType = payload.isAnnual ? 'Annual Commitment' : 'Monthly Flexible';
  const formattedTotal = `$${payload.totalPrice.toFixed(2)} USD`;
  const codeVal = payload.productCode || payload.skuCode;
  const skuSubtitle = codeVal ? `<div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px; color: #64748b; margin-top: 2px;">SKU: ${codeVal}</div>` : '';

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <style>
          body {
            margin: 0;
            padding: 40px 20px;
            background-color: #f8fafc;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
          }
          .main-content {
            margin: 0 auto;
            max-width: 600px;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04);
            background-color: #ffffff;
          }
          .header-banner {
            background-color: #ffffff;
            padding: 24px 28px;
            border-bottom: 2px solid #163D5C;
            display: flex;
            align-items: center;
          }
          .img-logo {
            height: 40px;
            width: auto;
          }
          .app-name {
            margin-left: 1.25rem;
            font-size: 1.3em;
            font-weight: 800;
            color: #153c5b;
            line-height: 1.2;
          }
          .app-name span {
            color: #64748b;
            font-size: 0.75em;
            font-weight: 500;
            display: block;
            margin-top: 2px;
          }
          .content-padding {
            padding: 32px 28px;
            background-color: #ffffff;
          }
          .intro-card {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 16px 20px;
            margin-bottom: 24px;
            font-size: 14px;
            color: #334155;
          }
          .table {
            border-collapse: separate;
            border-spacing: 0;
            width: 100%;
            font-size: 14px;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            overflow: hidden;
          }
          .tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .tr:nth-child(odd) {
            background-color: #ffffff;
          }
          .td {
            vertical-align: middle;
            border-bottom: 1px solid #e2e8f0;
            padding: 14px 18px;
            color: #334155;
          }
          .tr:last-child .td {
            border-bottom: none;
          }
          .td-label {
            font-weight: 700;
            width: 32%;
            color: #1e293b;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.02em;
          }
          .footer-bar {
            background-color: #f8fafc;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
          }
        </style>
      </head>
      <body>
        <div class="main-content">
          <div class="header-banner">
            <img class="img-logo" src="https://www.ditoweb.com/wp-content/uploads/2021/11/Dito-Logo_Navigation-Bar-96x45-1.png" alt="Dito" />
            <div class="app-name">
              Orders Portal
              <span>Additional Licenses & Services</span>
            </div>
          </div>
          
          <div class="content-padding">
            <div class="intro-card">
              An order request for <strong>${payload.customerDomain}</strong> has been processed successfully.
            </div>
            
            <table class="table">
              <tbody>
                <tr class="tr">
                  <td class="td td-label">Requested By</td>
                  <td class="td" style="font-weight: 500; color: #0f172a;">${payload.customerEmail}</td>
                </tr>
                <tr class="tr">
                  <td class="td td-label">Product</td>
                  <td class="td">
                    <div style="font-weight: 700; color: #0f172a; font-size: 15px;">${payload.productName}</div>
                    ${skuSubtitle}
                  </td>
                </tr>
                <tr class="tr">
                  <td class="td td-label">New Licenses</td>
                  <td class="td"><strong style="color: #1d7ce7; font-size: 15px;">+${payload.licenses} Seats</strong></td>
                </tr>
                <tr class="tr">
                  <td class="td td-label">Invoice Total</td>
                  <td class="td"><strong style="color: #153c5b; font-size: 16px;">${formattedTotal}</strong></td>
                </tr>
                <tr class="tr">
                  <td class="td td-label">Billing Plan</td>
                  <td class="td" style="font-weight: 500;">${licenseType}</td>
                </tr>
                <tr class="tr">
                  <td class="td td-label">Status</td>
                  <td class="td">
                    <span style="display: inline-block; background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 9999px;">Processed</span>
                  </td>
                </tr>
                <tr class="tr">
                  <td class="td td-label">Comments</td>
                  <td class="td" style="color: #475569; font-style: italic;">${payload.comments || 'None'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="footer-bar">
            © ${new Date().getFullYear()} Dito, LLC. All rights reserved. • Accounts Receivable (ar@ditoweb.com)
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const auth = getGoogleAuth(GMAIL_SEND_SCOPE, adminEmail);
    const gmail = google.gmail({ version: 'v1', auth });

    const messageParts = [
      `From: "Dito Orders Portal" <${adminEmail}>`,
      `To: ${recipients}`,
      `Subject: ${subject}`,
      `Content-Type: text/html; charset=utf-8`,
      `MIME-Version: 1.0`,
      ``,
      htmlContent
    ];

    const rawMessage = messageParts.join('\n');
    const encodedMessage = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    console.log(`[GMAIL API] Order confirmation email sent successfully for ${payload.customerDomain} (ID: ${res.data.id})`);
    return { success: true, messageId: res.data.id };
  } catch (error: any) {
    console.error(`[GMAIL API ERROR] Failed to send order email for ${payload.customerDomain}:`, error.message);
    return { success: false, error: error.message };
  }
}
