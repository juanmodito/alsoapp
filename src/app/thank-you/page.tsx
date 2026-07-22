'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { CheckCircle, ArrowLeft, Building2, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

function ThankYouContent() {
  const searchParams = useSearchParams();
  const domain = searchParams.get('domain') || 'your domain';
  const licenses = searchParams.get('licenses') || '1';

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <Navbar userDomain={domain} />

      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <div className="glass-card rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-2xl relative overflow-hidden">
          
          <div className="w-20 h-20 bg-emerald-100 border border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold text-[#133b72]">Order Request Submitted!</h1>
            <p className="text-slate-600 text-base max-w-md mx-auto">
              Your request for <strong className="text-[#133b72]">+{licenses} additional seat(s)</strong> for <strong className="text-[#133b72]">{domain}</strong> has been received.
            </p>
          </div>

          <div className="bg-[#e5f5ff]/60 border border-[#9adaff]/50 p-6 rounded-2xl max-w-md mx-auto text-left space-y-3 text-xs text-slate-600">
            <div className="flex items-center gap-2 font-bold text-[#133b72] text-sm pb-1 border-b border-slate-200">
              <ShieldCheck className="w-4 h-4 text-[#1d7ce7]" />
              <span>Order Summary</span>
            </div>
            <div className="flex justify-between">
              <span>Customer Domain:</span>
              <strong className="text-slate-900">{domain}</strong>
            </div>
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded">Processed</span>
            </div>
            <div className="flex justify-between">
              <span>Receipt Notification:</span>
              <span className="text-slate-700">Sent to AR & Primary Contact</span>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/request_license"
              className="w-full sm:w-auto px-6 py-3 bg-[#1d7ce7] hover:bg-[#133b72] text-white font-semibold rounded-xl text-sm transition-all duration-200 shadow-md flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to License Request Form</span>
            </Link>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-white text-sm font-medium">
        Loading Order Confirmation...
      </div>
    }>
      <ThankYouContent />
    </Suspense>
  );
}
