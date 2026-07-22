'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { ShieldAlert, ArrowLeft, Mail } from 'lucide-react';

export default function SignInErrorPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between">
      <Navbar />

      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <div className="glass-card rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-2xl relative overflow-hidden">
          
          <div className="w-20 h-20 bg-rose-100 border border-rose-200 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold text-[#133b72]">Domain Not Authorized</h1>
            <p className="text-slate-600 text-sm max-w-md mx-auto leading-relaxed">
              Your email domain is not currently registered as an active customer in Dito’s Google Reseller console.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500 max-w-md mx-auto space-y-2">
            <p>If you believe this is an error or would like to become a Dito reseller customer, please contact our accounts team:</p>
            <div className="flex items-center justify-center gap-2 text-[#1d7ce7] font-semibold text-sm">
              <Mail className="w-4 h-4" />
              <a href="mailto:ar@ditoweb.com" className="hover:underline">ar@ditoweb.com</a>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1d7ce7] hover:bg-[#133b72] text-white font-semibold rounded-xl text-sm transition-all duration-200 shadow-md"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Sign In</span>
            </Link>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
