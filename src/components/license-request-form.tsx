'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { ProductCombobox } from '@/components/ui/combobox';
import { Product, Subscription, UserProfile } from '@/lib/types';
import {
  Building2,
  AlertCircle,
  Send,
  HelpCircle,
  Calculator,
} from 'lucide-react';

interface LicenseRequestFormProps {
  initialUser: UserProfile;
  initialProducts: Product[];
  initialSubscriptions?: Subscription[];
}

export const LicenseRequestForm: React.FC<LicenseRequestFormProps> = ({
  initialUser,
  initialProducts,
  initialSubscriptions = []
}) => {
  const router = useRouter();

  const [user, setUser] = useState<UserProfile>(initialUser);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(initialSubscriptions);

  const [selectedProductKey, setSelectedProductKey] = useState<string>(
    initialProducts.length > 0 ? initialProducts[0].product_key : ''
  );
  const [licenses, setLicenses] = useState<number>(1);
  const [comments, setComments] = useState<string>('');
  const [confirmed, setConfirmed] = useState<boolean>(false);

  const [costEach, setCostEach] = useState<number | null>(null);
  const [totalCost, setTotalCost] = useState<number | null>(null);
  const [isAnnual, setIsAnnual] = useState<boolean>(false);
  const [isCalculatingPrice, setIsCalculatingPrice] = useState<boolean>(false);
  
  const [loading, setLoading] = useState<boolean>(initialProducts.length === 0);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedSuccess, setSubmittedSuccess] = useState<boolean>(false);

  const selectedProduct = products.find(p => p.product_key === selectedProductKey);

  // Sync state if initial props change and fetch products client-side if missing
  useEffect(() => {
    setUser(initialUser);
    if (initialProducts.length > 0) {
      setProducts(initialProducts);
      if (!selectedProductKey) {
        setSelectedProductKey(initialProducts[0].product_key);
      }
      setLoading(false);
    } else {
      // Fallback client-side catalog fetch
      const fetchCatalog = async () => {
        try {
          const res = await fetch(`/api/products/list?domain=${encodeURIComponent(initialUser.customerDomain)}&email=${encodeURIComponent(initialUser.email)}`);
          if (res.ok) {
            const data = await res.json();
            const activeProds = (data.products || []).filter((p: Product) => p.active);
            setProducts(activeProds);
            if (activeProds.length > 0) {
              setSelectedProductKey(activeProds[0].product_key);
            }
          }
        } catch (err) {
          console.error('[Catalog Fetch Error]', err);
        } finally {
          setLoading(false);
        }
      };
      fetchCatalog();
    }
  }, [initialUser, initialProducts]);

  // Recalculate price when selected product or licenses change
  useEffect(() => {
    if (!selectedProduct) return;

    setIsCalculatingPrice(true);
    setCostEach(null);
    setTotalCost(null);

    async function calculatePrice() {
      try {
        const res = await fetch('/api/products/prorated_cost', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            licenses: licenses,
            product: selectedProduct?.code || selectedProduct?.sku_id || selectedProduct?.product_key,
            domain: user.customerDomain
          })
        });

        if (res.ok) {
          const data = await res.json();
          setCostEach(data.cost);
          setTotalCost(data.total);
          setIsAnnual(!!data.annual);
        } else {
          setCostEach(selectedProduct?.monthly_cost ?? 0);
          setTotalCost((selectedProduct?.monthly_cost ?? 0) * licenses);
          setIsAnnual(!!selectedProduct?.annual);
        }
      } catch (err) {
        setCostEach(selectedProduct?.monthly_cost ?? 0);
        setTotalCost((selectedProduct?.monthly_cost ?? 0) * licenses);
        setIsAnnual(!!selectedProduct?.annual);
      } finally {
        setIsCalculatingPrice(false);
      }
    }

    calculatePrice();
  }, [selectedProductKey, licenses, user.customerDomain]);

  const handleSignOut = () => {
    window.location.href = '/api/auth/google/sign_out';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedProduct) {
      setError('Please select a valid license type.');
      return;
    }

    if (!confirmed) {
      setError('Please confirm your order by checking the confirmation box.');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        user_id: user.email,
        customer_domain: user.customerDomain,
        organization_name: user.organizationName,
        product: selectedProduct.code || selectedProduct.sku_id || selectedProduct.product_key,
        product_name: selectedProduct.name,
        licenses: licenses,
        comments: comments,
        cost_each: costEach,
        total_cost: totalCost
      };

      const res = await fetch('/api/orders/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.errors?.[0] || 'Failed to submit order request');
      }

      setSubmittedSuccess(true);
      router.push(`/thank-you?domain=${encodeURIComponent(user.customerDomain)}&licenses=${licenses}`);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <Navbar userEmail={user.email} userDomain={user.customerDomain} onSignOut={handleSignOut} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="glass-card rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden space-y-8">

          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200/80 pb-6 gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-extrabold text-[#133b72]">License Request Form</h1>
              <p className="text-slate-500 text-sm">
                Order additional Google Workspace licenses and services for your organization.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2 rounded-2xl text-xs font-medium text-slate-600">
              <Building2 className="w-4 h-4 text-[#1d7ce7]" />
              <span>Connected domain: <strong>{user.customerDomain}</strong></span>
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-[#1d7ce7] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-medium text-slate-500">Loading catalog and customer subscriptions...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">

              {/* Account Information Section */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user.email}
                    className="w-full h-12 px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user.organizationName}
                    className="w-full h-12 px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm cursor-not-allowed"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Domain Name
                    </label>
                    <span className="text-slate-400 text-xs hover:text-[#1d7ce7] cursor-pointer" title="Verified Customer Domain">
                      <HelpCircle className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <input
                    type="text"
                    disabled
                    value={user.customerDomain}
                    className="w-full h-12 px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Product Selection & Pricing Section */}
              <div className="bg-[#e5f5ff]/40 border border-[#9adaff]/50 p-6 rounded-2xl space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">

                  {/* Product Dropdown */}
                  <div className="md:col-span-8 space-y-2">
                    <label className="block text-xs font-bold text-[#133b72] uppercase tracking-wider">
                      License Type <span className="text-red-500">*</span>
                    </label>
                    <ProductCombobox
                      products={products}
                      selectedKey={selectedProductKey}
                      onSelect={(key) => setSelectedProductKey(key)}
                    />
                    {selectedProduct && (
                      <p className="text-xs text-slate-500 pt-1">
                        {selectedProduct.description}
                      </p>
                    )}
                  </div>

                  {/* Seat Quantity Input */}
                  <div className="md:col-span-4 space-y-2">
                    <label className="block text-xs font-bold text-[#133b72] uppercase tracking-wider">
                      Number of Seats <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={licenses}
                      onChange={(e) => setLicenses(Math.max(1, parseInt(e.target.value || '1', 10)))}
                      required
                      className="w-full h-12 px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#1d7ce7] shadow-sm"
                    />
                    {selectedProduct && selectedProduct.currentSeats !== undefined && selectedProduct.currentSeats > 0 && (
                      <p className="text-xs text-slate-500 pt-1 flex items-center gap-1 font-medium">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>Current active: <strong className="text-slate-800">{selectedProduct.currentSeats} seats</strong></span>
                        <span className="text-slate-400">({selectedProduct.currentSeats + (licenses || 0)} total after order)</span>
                      </p>
                    )}
                  </div>

                </div>

                {/* Dynamic Price Calculation Widget */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-4">
                    <div className="bg-[#e5f5ff] p-3 rounded-xl text-[#1d7ce7]">
                      <Calculator className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block text-xs text-slate-400 font-semibold uppercase">Price Per Seat</span>
                      <span className="text-lg font-bold text-[#133b72]">
                        {costEach !== null ? `$${costEach.toFixed(2)} ${isAnnual ? 'Annual' : 'Monthly'}` : 'Calculating...'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#133b72] text-white p-4 rounded-xl shadow-md flex items-center justify-between">
                    <div>
                      <span className="block text-xs text-[#9adaff] font-semibold uppercase">Total {isAnnual ? 'Annual' : 'Prorated'} Price</span>
                      <span className="text-xl font-extrabold">
                        {totalCost !== null ? `$${totalCost.toFixed(2)} USD` : '...'}
                      </span>
                    </div>
                    <span className="bg-white/10 text-white text-[11px] px-2.5 py-1 rounded-lg font-medium">
                      {isAnnual ? 'Annual' : 'Prorated'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Order Comments */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Order Comments / Special Instructions
                </label>
                <textarea
                  rows={3}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Add any notes for Dito Accounts Receivable or Operations team..."
                  className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d7ce7] transition-all resize-none shadow-sm"
                />
              </div>

              {/* Error Message Alert */}
              {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-center gap-3 text-xs font-medium animate-in fade-in-50">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* Legal Confirmation Checkbox */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-start gap-3">
                <input
                  type="checkbox"
                  id="confirm-order"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-[#1d7ce7] border-slate-300 rounded focus:ring-[#1d7ce7] cursor-pointer"
                />
                <label htmlFor="confirm-order" className="text-xs text-slate-600 font-medium cursor-pointer leading-relaxed">
                  I understand by checking this box that I am asking Dito to place an order of additional licenses on my organization's behalf and this order may not be reversed.
                </label>
              </div>

              {/* Form Submission Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={submitting || !confirmed}
                  className={`px-8 py-4 rounded-2xl text-sm font-bold flex items-center gap-2.5 transition-all duration-200 shadow-lg cursor-pointer ${confirmed && !submitting
                      ? 'bg-[#4bbdff] hover:bg-[#1d7ce7] text-[#133b72] hover:text-white shadow-[#4bbdff]/30'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    }`}
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                      <span>Submitting Order...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit License Order</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
};
