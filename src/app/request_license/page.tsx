import React from 'react';
import { redirect } from 'next/navigation';
import { LicenseRequestForm } from '@/components/license-request-form';
import { UserProfile, Product } from '@/lib/types';
import { getAuthenticatedUserSession } from '@/lib/services/auth-session';
import { getResellerCustomer, fetchLiveProductsFromSheets, listResellerSubscriptions, resolveSkuName } from '@/lib/services/google-reseller';

export const dynamic = 'force-dynamic';

export default async function RequestLicensePage() {
  const { email, domain, authenticated } = await getAuthenticatedUserSession();

  if (!authenticated || !email || !domain) {
    redirect('/api/auth/google/sign_in');
  }

  // Prefetch customer details, catalog & subscriptions concurrently in parallel for maximum speed
  const [customerResult, allProducts, subscriptions] = await Promise.all([
    getResellerCustomer(domain),
    fetchLiveProductsFromSheets(),
    listResellerSubscriptions(domain)
  ]);

  let orgName = domain ? domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1) : 'Organization';
  if (customerResult.success && (customerResult.customer as any)?.postalAddress?.organizationName) {
    orgName = (customerResult.customer as any).postalAddress.organizationName;
  }

  const initialUser: UserProfile = {
    email: email,
    customerDomain: domain,
    organizationName: orgName,
    roles: ['DITOWEB CUSTOMER']
  };

  const initialProducts: Product[] = [];

  // 1. ACTIVE SUBSCRIPTIONS: Customer domain's owned active Reseller subscriptions
  subscriptions.forEach((sub, idx) => {
    const rawSkuName = resolveSkuName(sub.skuId, sub.skuName, allProducts);
    const status = sub.status || 'ACTIVE';

    if (!rawSkuName.toLowerCase().includes('cloud identity') && status === 'ACTIVE') {
      const shortName = rawSkuName
        .replace('Google Workspace', 'GW')
        .replace(' - Archived User', ' Archived User');

      const currentSeats = sub.seats?.numberOfSeats || sub.seats?.maximumNumberOfSeats || sub.seats?.licensedNumberOfSeats || 0;
      const licensedSeats = sub.seats?.licensedNumberOfSeats || 0;
      const isAnnual = sub.plan?.planName === 'ANNUAL' || sub.billingMethod === 'OFFLINE';

      const matched = allProducts.find(p =>
        (p.sku_id && p.sku_id === sub.skuId) ||
        (p.code && p.code === sub.skuId) ||
        (p.name && rawSkuName && p.name.toLowerCase().includes(rawSkuName.toLowerCase().replace('google workspace', '').replace('g suite', '').trim()))
      );

      initialProducts.push({
        product_key: `SUB_${sub.subscriptionId || idx}`,
        name: shortName,
        code: sub.skuId || `SKU_${idx}`,
        description: `${rawSkuName} (${isAnnual ? 'ANNUAL' : 'FLEXIBLE'})`,
        annual_cost: matched ? matched.annual_cost : 0,
        monthly_cost: matched ? matched.monthly_cost : 0,
        daily_cost: matched ? matched.daily_cost : 0,
        annual: isAnnual,
        sku_id: sub.skuId || undefined,
        active: true,
        subscriptionId: sub.subscriptionId || undefined,
        category: "Active Subscriptions",
        currentSeats: currentSeats,
        licensedSeats: licensedSeats
      });
    }
  });

  // 2. SOFTWARE & SERVICES: Available ISV Add-ons & Chrome License Family (Chrome EDU, Chrome Enterprise, Chrome OS Upgrade, AODocs, etc.)
  const isvAndChromeKeywords = ['chrome edu', 'chrome enterprise', 'chrome os', 'chrome education', 'chrome management', 'aodocs', 'pandadoc', 'spanning', 'uberconference', 'virtru', 'zixcorp'];
  const hardwareTerms = ['chromebook', 'chromebox', 'device', 'hardware'];

  const sheetAddons = allProducts.filter(p => {
    const lowerName = p.name.toLowerCase();
    const isHardware = hardwareTerms.some(h => lowerName.includes(h));
    if (isHardware) return false;

    return p.alsoType === 2 ||
      p.category === 'Software & Services' ||
      isvAndChromeKeywords.some(k => lowerName.includes(k));
  });

  const addedCodes = new Set(initialProducts.map(p => p.code));

  sheetAddons.forEach((addon, idx) => {
    const code = addon.code || addon.sku_id || `ISV_${idx}`;
    if (!addedCodes.has(code)) {
      addedCodes.add(code);
      initialProducts.push({
        product_key: addon.product_key || `ISV_${idx}`,
        name: addon.name,
        code: code,
        description: addon.description || `${addon.name} (${addon.annual ? 'ANNUAL' : 'FLEXIBLE'})`,
        annual_cost: addon.annual_cost,
        monthly_cost: addon.monthly_cost,
        daily_cost: addon.daily_cost,
        annual: addon.annual,
        sku_id: addon.sku_id,
        active: true,
        category: "Software & Services",
        currentSeats: 0,
        licensedSeats: 0
      });
    }
  });

  return (
    <LicenseRequestForm
      initialUser={initialUser}
      initialProducts={initialProducts}
    />
  );
}
