/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Phone, Mail, Globe, MapPin, Building } from 'lucide-react';

interface FooterProps {
  onNavigate?: (tab: string) => void;
  isAdmin?: boolean;
}

export default function Footer({ onNavigate, isAdmin }: FooterProps) {
  return (
    <footer className="mt-auto bg-slate-900 text-slate-400 border-t border-slate-800 text-xs py-10 px-8 shrink-0">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Info Column */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center font-black text-white text-[10px]">
              S
            </div>
            <span className="font-extrabold text-white text-sm tracking-tight">SmartDeskERP © 2026</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-400">
            Professional business management engine built for retail, wholesale, trading agents, and small distributors. Self-hosted and optimized for offline SMB agility. No active subscriptions needed.
          </p>
        </div>

        {/* Contact info column */}
        <div className="space-y-2">
          <h4 className="font-bold text-slate-200 text-xs tracking-wider uppercase">Contact Support</h4>
          <ul className="space-y-2 text-[11px]">
            <li className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>+91 9876543210</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>support@smartdeskerp.com</span>
            </li>
            <li className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>www.smartdeskerp.com</span>
            </li>
          </ul>
        </div>

        {/* Location column */}
        <div className="space-y-2">
          <h4 className="font-bold text-slate-200 text-xs tracking-wider uppercase font-sans">Business HQ Address</h4>
          <div className="flex items-start gap-2 text-[11px]">
            <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              M G Road, Sector 5,<br />Kolkata, West Bengal, 700091<br />India
            </span>
          </div>
        </div>

        {/* Quick Links Column */}
        <div className="space-y-2">
          <h4 className="font-bold text-slate-200 text-xs tracking-wider uppercase">Quick Actions</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
            <button
              onClick={() => onNavigate?.('dashboard')}
              className="text-left text-slate-400 hover:text-white transition-all underline cursor-pointer"
            >
              Dashboard
            </button>
            <button
              onClick={() => onNavigate?.('inventory')}
              className="text-left text-slate-400 hover:text-white transition-all underline cursor-pointer"
            >
              Inventory
            </button>
            <button
              onClick={() => onNavigate?.('sales')}
              className="text-left text-slate-400 hover:text-white transition-all underline cursor-pointer"
            >
              POS Billing
            </button>
            <button
              onClick={() => onNavigate?.('customers')}
              className="text-left text-slate-400 hover:text-white transition-all underline cursor-pointer"
            >
              Customers
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => onNavigate?.('reports')}
                  className="text-left text-slate-400 hover:text-white transition-all underline cursor-pointer"
                >
                  Reports
                </button>
                <button
                  onClick={() => onNavigate?.('expenses')}
                  className="text-left text-slate-400 hover:text-white transition-all underline cursor-pointer"
                >
                  Expenses
                </button>
              </>
            )}
          </div>
        </div>

      </div>

      <div className="max-w-7xl mx-auto border-t border-slate-800 mt-8 pt-4 flex flex-col md:flex-row items-center justify-between text-[11px] text-slate-500">
        <span>SmartDeskERP core v5.1 LTS — Signed under client-side execution licenses.</span>
        <span>Secure Session Matrix active • 100% self-contained database</span>
      </div>
    </footer>
  );
}
