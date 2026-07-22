'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { DitoLogo } from './logo';
import { ShieldCheck, LogOut, ChevronDown, User, RefreshCw } from 'lucide-react';

interface NavbarProps {
  userEmail?: string;
  userDomain?: string;
  onSignOut?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ userEmail, userDomain, onSignOut }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userInitial = userEmail ? userEmail.charAt(0).toUpperCase() : 'U';

  return (
    <header className="w-full bg-white/95 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Left Branding - Plain Logo Without Borders/Shadows */}
        <Link href="/" className="flex items-center gap-3.5 group">
          <DitoLogo height={32} />
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-[#133b72] font-bold text-sm tracking-tight">Orders Portal</span>
            <span className="text-slate-400 text-[11px] font-medium">Additional Licenses & Services</span>
          </div>
        </Link>

        {/* Right Action - Single Borderless User Card */}
        {userEmail ? (
          <div className="relative" ref={dropdownRef}>
            {/* Single User Card Pill (No Borders) */}
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="bg-slate-100/90 hover:bg-slate-200/90 text-slate-800 rounded-2xl px-4 py-2.5 flex items-center gap-3 transition-colors cursor-pointer focus:outline-none"
            >
              {/* User Avatar Circle */}
              <div className="w-8 h-8 rounded-full bg-[#133b72] text-white flex items-center justify-center font-extrabold text-xs shrink-0 shadow-sm">
                {userInitial}
              </div>

              {/* User Details */}
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-slate-900 truncate max-w-[170px]">
                  {userEmail}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {userDomain}
                </span>
              </div>

              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu (No Border) */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl py-2 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Signed in as</p>
                  <p className="text-xs font-bold text-slate-900 truncate">{userEmail}</p>
                </div>

                <div className="p-1 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      if (onSignOut) onSignOut();
                    }}
                    className="w-full px-3 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4 text-[#1d7ce7]" />
                    <span>Switch Account</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      if (onSignOut) onSignOut();
                    }}
                    className="w-full px-3 py-2.5 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Disconnect</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-600 text-xs font-semibold bg-slate-100 px-3.5 py-2 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-[#1d7ce7]" />
            <span>Customer Orders Portal</span>
          </div>
        )}

      </div>
    </header>
  );
};
