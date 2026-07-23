'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Product } from '@/lib/types';
import { Search, Check, ChevronsUpDown, X } from 'lucide-react';

interface ProductComboboxProps {
  products: Product[];
  selectedKey: string;
  onSelect: (productKey: string) => void;
  placeholder?: string;
}

export const ProductCombobox: React.FC<ProductComboboxProps> = ({
  products,
  selectedKey,
  onSelect,
  placeholder = 'Search product or service...'
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedProduct = products.find(
    (p) => p.product_key === selectedKey || p.code === selectedKey
  );

  const filteredProducts = products.filter((p) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.code.toLowerCase().includes(term) ||
      p.product_key.toLowerCase().includes(term) ||
      (p.description && p.description.toLowerCase().includes(term))
    );
  });

  // Unique categories preserving order of products (Active Subscriptions first)
  const categories = Array.from(
    new Set(filteredProducts.map((p) => p.category || 'Software & Services'))
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full h-12 px-4 py-3 bg-white border border-slate-300 hover:border-[#1d7ce7] rounded-xl text-left font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#1d7ce7] shadow-sm flex items-center justify-between gap-2 transition-all cursor-pointer"
      >
        <span className="truncate text-slate-900 font-bold">
          {selectedProduct ? selectedProduct.name : placeholder}
        </span>
        <ChevronsUpDown className="w-4 h-4 text-slate-400 shrink-0" />
      </button>

      {/* Popover Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">

          {/* Search Box */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type to filter products..."
              className="w-full bg-transparent text-sm font-medium text-slate-900 focus:outline-none placeholder:text-slate-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Product List Grouped by Category */}
          <div className="max-h-72 overflow-y-auto p-2 space-y-3">
            {filteredProducts.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 font-medium">
                No matching products found.
              </div>
            ) : (
              categories.map((category) => {
                const categoryProducts = filteredProducts.filter(
                  (p) => (p.category || 'Software & Services') === category
                );
                if (categoryProducts.length === 0) return null;

                const isSubGroup = category === 'Active Subscriptions';

                return (
                  <div key={category} className="space-y-1">
                    <div className="px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-100/70 rounded-lg flex items-center justify-between">
                      <span>{isSubGroup ? 'ACTIVE SUBSCRIPTIONS' : 'ADDITIONAL SOFTWARE & SERVICES'}</span>
                      <span className="text-[10px] font-medium text-slate-400">({categoryProducts.length})</span>
                    </div>
                    {categoryProducts.map((prod, idx) => {
                      const isSelected = prod.product_key === selectedKey || prod.code === selectedKey;
                      return (
                        <div
                          key={`${prod.product_key}_${prod.code}_${idx}`}
                          onClick={() => {
                            onSelect(prod.product_key);
                            setOpen(false);
                            setSearch('');
                          }}
                          className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${isSelected
                              ? 'bg-[#e5f5ff] text-[#133b72] border border-[#b3e0ff]'
                              : 'hover:bg-slate-50 text-slate-700'
                            }`}
                        >
                          <div className="flex flex-col text-left truncate pr-2">
                            <span className="font-bold text-slate-900">{prod.name}</span>
                            {prod.description && (
                              <span className="text-[11px] text-slate-400 font-normal truncate pt-0.5">{prod.description}</span>
                            )}
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-[#1d7ce7] shrink-0 ml-2" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>

          {/* Catalog Count Indicator */}
          <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-400 font-medium text-right">
            Showing {filteredProducts.length} of {products.length} catalog items
          </div>

        </div>
      )}
    </div>
  );
};
