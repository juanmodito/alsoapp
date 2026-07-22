'use client';

import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="py-6 text-center text-xs text-[#9adaff]/60 border-t border-white/5 w-full mt-auto">
      <p>© {new Date().getFullYear()} Dito, LLC. All rights reserved.</p>
    </footer>
  );
};
