/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FileText, TrendingUp, DollarSign, BarChart2, Calendar, Download, 
  Printer, ArrowUpRight, ArrowDownRight, Tag, Activity, Sparkles
} from 'lucide-react';
import { SalesInvoice, PurchaseEntry, Expense, InventoryProduct } from '../../types';

interface ReportsManagerProps {
  sales: SalesInvoice[];
  purchases: PurchaseEntry[];
  expenses: Expense[];
  inventory: InventoryProduct[];
  isDarkMode: boolean;
}

export default function ReportsManager({
  sales,
  purchases,
  expenses,
  inventory,
  isDarkMode
}: ReportsManagerProps) {
  
  // Section index: 'sales' | 'purchases' | 'expenses' | 'gst' | 'profit'
  const [reportTab, setReportTab] = useState<'sales' | 'purchases' | 'expenses' | 'gst' | 'profit'>('profit');

  // Time filter offsets
  const [reportYear, setReportYear] = useState<string>("2026");

  // 1. Core General Computations (Clean, unreturned filters)
  const validSales = sales.filter((s: any) => s.status !== "Returned");
  const validPurchases = purchases.filter((p: any) => p.status !== "Returned");

  // total metrics (overall values)
  const totalSalesRevenue = validSales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalSalesSubtotal = validSales.reduce((acc, s) => acc + s.subtotal, 0);
  const totalSalesGstCollected = validSales.reduce((acc, s) => acc + (s.gstAmount || (s as any).tax || 0), 0);
  
  const totalPurchaseCost = validPurchases.reduce((acc, p) => acc + p.totalAmount, 0);
  const totalPurchaseSubtotal = validPurchases.reduce((acc, p) => acc + p.subtotal, 0);
  const totalPurchaseGstPaid = validPurchases.reduce((acc, p) => {
    const gstVal = (p.cgst || 0) + (p.sgst || 0) + (p.igst || 0);
    return acc + gstVal;
  }, 0);

  const totalExpenseCost = expenses.reduce((acc, e) => acc + e.amount, 0);

  // Cost of goods sold calculation: Sum (Selling Price * units sold) -> No, COGS is procurement cost (Purchase Price * units sold).
  // Let's compute actual COGS for products sold:
  let cogsTotal = 0;
  validSales.forEach(s => {
    s.items.forEach(item => {
      const p = inventory.find(inv => inv.id === item.productId);
      if (p) {
        cogsTotal += (p.purchasePrice * item.quantity);
      } else {
        cogsTotal += (item.price * 0.6) * item.quantity; // default COGS of 60% if product has been since deleted
      }
    });
  });

  // Gross profit & Net profits
  const grossProfit = totalSalesRevenue - cogsTotal;
  const netProfit = totalSalesSubtotal - cogsTotal - totalExpenseCost; // dynamic calculation

  // 2. Tab Specific aggregations:

  // June (Current) & May (Prev) aggregations
  const juneSalesTotal = validSales.filter(s => s.createdAt.includes("-06-")).reduce((sum, s) => sum + s.totalAmount, 0);
  const maySalesTotal = validSales.filter(s => s.createdAt.includes("-05-")).reduce((sum, s) => sum + s.totalAmount, 0);

  const handleTriggerPrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 text-slate-350">
      
      {/* Tab Headings */}
      <div className="flex gap-2 border-b border-slate-805/40 pb-3 flex-wrap">
        <button
          type="button"
          onClick={() => setReportTab('profit')}
          className={`px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
            reportTab === 'profit'
              ? 'bg-blue-600 text-white shadow'
              : isDarkMode ? 'text-slate-400 hover:bg-slate-850 hover:text-white' : 'text-slate-650 hover:bg-slate-50'
          }`}
        >
          📈 Consolidated Profit Ledger
        </button>
        <button
          type="button"
          onClick={() => setReportTab('sales')}
          className={`px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
            reportTab === 'sales'
              ? 'bg-blue-600 text-white shadow'
              : isDarkMode ? 'text-slate-400 hover:bg-slate-850 hover:text-white' : 'text-slate-650 hover:bg-slate-50'
          }`}
        >
          📂 Sales Analytics
        </button>
        <button
          type="button"
          onClick={() => setReportTab('purchases')}
          className={`px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
            reportTab === 'purchases'
              ? 'bg-blue-600 text-white shadow'
              : isDarkMode ? 'text-slate-400 hover:bg-slate-850 hover:text-white' : 'text-slate-650 hover:bg-slate-50'
          }`}
        >
          📦 Purchase Inward Logs
        </button>
        <button
          type="button"
          onClick={() => setReportTab('expenses')}
          className={`px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
            reportTab === 'expenses'
              ? 'bg-blue-600 text-white shadow'
              : isDarkMode ? 'text-slate-400 hover:bg-slate-850 hover:text-white' : 'text-slate-650 hover:bg-slate-50'
          }`}
        >
          📌 Expense Divisions
        </button>
        <button
          type="button"
          onClick={() => setReportTab('gst')}
          className={`px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
            reportTab === 'gst'
              ? 'bg-blue-600 text-white shadow'
              : isDarkMode ? 'text-slate-400 hover:bg-slate-850 hover:text-white' : 'text-slate-650 hover:bg-slate-50'
          }`}
        >
          ✓ GST Tax Ledgers
        </button>
      </div>

      {/* Report Tools header */}
      <div className="flex justify-between items-center bg-slate-950/20 p-4 border border-slate-850/60 rounded-xl">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>Accounting Year:</span>
          <select
            value={reportYear}
            onChange={(e) => setReportYear(e.target.value)}
            className={`font-semibold bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded border border-slate-800 px-2 py-1 text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
          >
            <option value="2026">2026-27 Financial year</option>
            <option value="2025">2025-26 Financial year</option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleTriggerPrintReport}
          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-750 font-bold transition-all flex items-center gap-1.5 cursor-pointer text-xs uppercase shadow-sm"
        >
          <Printer className="w-4 h-4 text-slate-350" />
          <span>General ledger Print</span>
        </button>
      </div>

      {/* VIEW 1: DYNAMIC PROFIT SUMMARY LEDGER */}
      {reportTab === 'profit' && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
            
            {/* Sales Revenue Box */}
            <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-850'} flex flex-col justify-between shadow-sm`}>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Gross Sales Revenue</span>
                <span className="p-1 px-1.5 bg-blue-900/40 text-blue-300 font-black text-[9px] border border-blue-800 rounded">SALES</span>
              </div>
              <strong className="text-xl font-extrabold tracking-tight">
                ₹ {totalSalesRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </strong>
              <div className="text-[10px] text-slate-500 mt-2 flex items-center gap-1 font-mono">
                <span className="text-emerald-500 font-bold">MoM comparison:</span> June ₹{(juneSalesTotal || 0).toFixed(0)} vs May ₹{(maySalesTotal || 0).toFixed(0)}
              </div>
            </div>

            {/* COGS Procurement Box */}
            <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-850'} flex flex-col justify-between shadow-sm`}>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Cost Of Goods Sold</span>
                <span className="p-1 px-1.5 bg-amber-900/40 text-amber-300 font-black text-[9px] border border-amber-800 rounded">COGS</span>
              </div>
              <strong className="text-xl font-extrabold tracking-tight">
                ₹ {cogsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </strong>
              <div className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                Represents direct material procurement values of products issued on sales vouchers.
              </div>
            </div>

            {/* Expenses box */}
            <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-850'} flex flex-col justify-between shadow-sm`}>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Operating Costs</span>
                <span className="p-1 px-1.5 bg-red-900/40 text-red-300 font-black text-[9px] border border-red-800 rounded">OPEX</span>
              </div>
              <strong className="text-xl font-extrabold tracking-tight">
                ₹ {totalExpenseCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </strong>
              <div className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                Includes general store operating divisions (Electricity, Salary bills, Broadband etc).
              </div>
            </div>

          </div>

          {/* Deep Profit breakdown block */}
          <div className={`p-6 rounded-xl border space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h4 className="text-xs font-bold uppercase text-blue-500 flex items-center gap-1.5 select-none leading-none">
              <TrendingUp className="w-4.5 h-4.5 text-blue-500" />
              <span>Consolidated Net Profit Yield statement</span>
            </h4>

            <div className="border border-slate-850/40 rounded-lg overflow-hidden font-mono text-xs text-slate-300">
              
              <div className="grid grid-cols-2 bg-slate-950/20 px-4 py-3 border-b border-slate-850/30 text-slate-400 font-bold uppercase tracking-wider">
                <span>Core Business Dimensions</span>
                <span className="text-right">Ledger Value (₹)</span>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex justify-between border-b border-slate-850/20 pb-2">
                  <span>Gross Sales (Including Tax brackets):</span>
                  <span className="font-semibold text-white">₹{(totalSalesRevenue || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-850/20 pb-2 text-slate-400">
                  <span>Total Sales Ex-Tax Base value:</span>
                  <span>₹{(totalSalesSubtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-850/20 pb-2 text-red-400">
                  <span>Less: Direct Cost of Goods Sold (Procurement Cost):</span>
                  <span>-₹{(cogsTotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-850/20 pb-2 font-bold text-slate-200">
                  <span>Gross Retail Margin yield:</span>
                  <span>₹{((totalSalesSubtotal - cogsTotal) || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-850/20 pb-2 text-red-400">
                  <span>Less: Operational Operating Expenses (OPEX):</span>
                  <span>-₹{(totalExpenseCost || 0).toFixed(2)}</span>
                </div>

                <div className="flex justify-between font-black text-xs text-emerald-400 border-t border-dashed border-slate-800 pt-3">
                  <span>NET ENTERPRISE OPERATIONAL PROFIT:</span>
                  <span className="text-emerald-400 font-extrabold text-sm">₹{(netProfit || 0).toFixed(2)}</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* VIEW 2: SALES ANALYTICS */}
      {reportTab === 'sales' && (
        <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} space-y-4`}>
          <h4 className="text-xs font-black uppercase text-blue-500 select-none">
            📂 Billed Units Sales Analytics
          </h4>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center font-sans">
            <div className="bg-slate-950/25 p-3 rounded-lg border border-slate-850">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Total Invoiced Outward</span>
              <strong className="text-base text-slate-100 font-extrabold font-mono block mt-1">₹{(totalSalesRevenue || 0).toFixed(0)}</strong>
            </div>
            <div className="bg-slate-950/25 p-3 rounded-lg border border-slate-850">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Total Base Turnovers</span>
              <strong className="text-base text-slate-100 font-extrabold font-mono block mt-1">₹{(totalSalesSubtotal || 0).toFixed(0)}</strong>
            </div>
            <div className="bg-slate-950/25 p-3 rounded-lg border border-slate-850">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">GST Pool liabilities</span>
              <strong className="text-base text-slate-100 font-bold font-mono block mt-1">₹{(totalSalesGstCollected || 0).toFixed(0)}</strong>
            </div>
            <div className="bg-slate-950/25 p-3 rounded-lg border border-slate-850">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Unreturned Invoices</span>
              <strong className="text-base text-teal-400 font-extrabold font-mono block mt-1">{validSales.length} bills</strong>
            </div>
          </div>

          <div className="border border-slate-850 rounded-lg overflow-x-auto">
            <table className="w-full text-left font-mono text-[11px] leading-relaxed">
              <thead>
                <tr className="bg-slate-950/20 border-b border-slate-800 text-slate-400 font-bold">
                  <th className="py-2 px-3">Bill No.</th>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Client</th>
                  <th className="py-2 px-3">Turnovers Ex-Tax</th>
                  <th className="py-2 px-3">CGST / SGST</th>
                  <th className="py-2 px-3">IGST Pool</th>
                  <th className="py-2 px-3 text-right">Billed In Rupee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {validSales.map(s => (
                  <tr key={s.id} className="hover:bg-slate-850/10">
                    <td className="py-2 px-3 text-blue-500 font-bold">{s.invoiceNumber}</td>
                    <td className="py-2 px-3 text-slate-400">{s.createdAt.split('T')[0]}</td>
                    <td className="py-2 px-3 font-semibold text-slate-200">{s.customerName}</td>
                    <td className="py-2 px-3">₹{(s.subtotal || 0).toFixed(2)}</td>
                    <td className="py-2 px-3 text-slate-350">
                      {(s.cgst || 0) > 0 ? `₹${(s.cgst || 0).toFixed(1)} + ₹${(s.sgst || 0).toFixed(1)}` : `₹ 0`}
                    </td>
                    <td className="py-2 px-3 text-slate-350">₹{(s.igst || 0).toFixed(2)}</td>
                    <td className="py-2 px-3 text-right font-extrabold text-white">₹{(s.totalAmount || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: PURCHASE INWARD LOGS */}
      {reportTab === 'purchases' && (
        <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} space-y-4`}>
          <h4 className="text-xs font-black uppercase text-blue-500 select-none">
            📂 Procurement Purchase Inward logs
          </h4>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center font-sans">
            <div className="bg-slate-950/25 p-3 rounded-lg border border-slate-850">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Capital Spent cost</span>
              <strong className="text-base text-slate-100 font-extrabold font-mono block mt-1">₹{(totalPurchaseCost || 0).toFixed(0)}</strong>
            </div>
            <div className="bg-slate-950/25 p-3 rounded-lg border border-slate-850">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Purchase Ex-Tax total</span>
              <strong className="text-base text-slate-100 font-extrabold font-mono block mt-1">₹{(totalPurchaseSubtotal || 0).toFixed(0)}</strong>
            </div>
            <div className="bg-slate-950/25 p-3 rounded-lg border border-slate-850">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Input Tax Credits (ITC)</span>
              <strong className="text-base text-teal-400 font-bold font-mono block mt-1">₹{(totalPurchaseGstPaid || 0).toFixed(0)}</strong>
            </div>
            <div className="bg-slate-950/25 p-3 rounded-lg border border-slate-850">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Procured consignments</span>
              <strong className="text-base text-slate-100 font-extrabold font-mono block mt-1">{validPurchases.length} consignments</strong>
            </div>
          </div>

          <div className="border border-slate-850 rounded-lg overflow-x-auto">
            <table className="w-full text-left font-mono text-[11px] leading-relaxed">
              <thead>
                <tr className="bg-slate-950/20 border-b border-slate-800 text-slate-400 font-bold">
                  <th className="py-2 px-3">Procure No.</th>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Supplier Origin</th>
                  <th className="py-2 px-3">Ex-Tax Cost</th>
                  <th className="py-2 px-3">GST Paid (ITC Credited)</th>
                  <th className="py-2 px-3 text-right">Inward Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {validPurchases.map(p => {
                  const inwardGst = (p.cgst || 0) + (p.sgst || 0) + (p.igst || 0);

                  return (
                    <tr key={p.id} className="hover:bg-slate-850/10">
                      <td className="py-2 px-3 text-blue-400 font-bold">{p.purchaseNumber}</td>
                      <td className="py-2 px-3 text-slate-400">{p.date}</td>
                      <td className="py-2 px-3 font-semibold text-slate-200">{p.supplierName}</td>
                      <td className="py-2 px-3">₹{(p.subtotal || 0).toFixed(2)}</td>
                      <td className="py-2 px-3 text-teal-400 font-bold">₹{inwardGst.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-extrabold text-white">₹{(p.totalAmount || 0).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 4: EXPENSE DIVISIONS REPORT */}
      {reportTab === 'expenses' && (
        <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} space-y-4`}>
          <h4 className="text-xs font-black uppercase text-blue-500 select-none">
            📂 store operating Cost divisions
          </h4>

          <div className="space-y-3 font-sans">
            {["Electricity", "Rent", "Salary", "Internet", "Transport", "Maintenance"].map(cat => {
              const totalCat = expenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0);
              const ratio = totalExpenseCost > 0 ? (totalCat / totalExpenseCost) * 100 : 0;

              return (
                <div key={cat} className="space-y-1 bg-slate-950/15 p-3 border border-slate-850 rounded-xl">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-105">📌 {cat} Operating cost</span>
                    <span className="font-extrabold text-slate-200">
                      ₹ {totalCat.toLocaleString('en-IN', { minimumFractionDigits: 2 })} &nbsp;|&nbsp; <span className="text-slate-500 font-normal font-mono text-[10px]">{ratio.toFixed(0)}%</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${ratio}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 5: GST TAX REPORT & LEDGERS */}
      {reportTab === 'gst' && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
            
            {/* Sales Output Tax Pool liability */}
            <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-850'} flex flex-col justify-between shadow-sm`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Active Sales Output GST Liability</span>
                <span className="p-1 px-1.5 bg-red-900/40 text-red-300 font-black text-[9px] border border-red-800 rounded">DEBIT</span>
              </div>
              <strong className="text-xl font-extrabold tracking-tight">
                ₹ {totalSalesGstCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </strong>
              <p className="text-[10px] text-slate-450 leading-relaxed mt-2.5">
                Output taxes collected from consumers. This represents a direct remittance liability towards the government tax department.
              </p>
            </div>

            {/* Input Tax Credit Pool */}
            <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-850'} flex flex-col justify-between shadow-sm`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Input Tax Credit (ITC) balance</span>
                <span className="p-1 px-1.5 bg-teal-900/40 text-teal-300 font-black text-[9px] border border-teal-850 rounded">CREDIT</span>
              </div>
              <strong className="text-xl font-extrabold tracking-tight text-teal-400">
                ₹ {totalPurchaseGstPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </strong>
              <p className="text-[10px] text-slate-450 leading-relaxed mt-2.5">
                Slab offsets collected from procurement receipts. This can be subtracted cleanly from your output liability to minimize cash payments.
              </p>
            </div>

          </div>

          {/* Tax settlement Statement */}
          <div className={`p-6 rounded-xl border space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-805' : 'bg-white border-slate-200'}`}>
            <h4 className="text-xs font-bold uppercase text-blue-500 tracking-wider">
              ✦ Output vs Input Tax ledger Settlement statement
            </h4>

            <div className="border border-slate-850 rounded-lg overflow-hidden font-mono text-xs text-slate-300">
              <div className="grid grid-cols-2 bg-slate-950/20 px-4 py-3 border-b border-slate-850">
                <span className="font-bold uppercase text-slate-455">accounting dimensions</span>
                <span className="text-right font-bold uppercase text-slate-455">liability value (₹)</span>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span>Gross collected CGST (State Share 50%):</span>
                  <span>₹{((totalSalesGstCollected/2) || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span>Gross collected SGST (Central Share 50%):</span>
                  <span>₹{((totalSalesGstCollected/2) || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2 font-bold text-slate-200">
                  <span>Total Output GST liability debit:</span>
                  <span>₹{(totalSalesGstCollected || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2 text-teal-400">
                  <span>Less: Input Tax Credits offsets (ITC from purchases):</span>
                  <span>-₹{(totalPurchaseGstPaid || 0).toFixed(2)}</span>
                </div>

                {/* Final Net Tax remittances */}
                {totalSalesGstCollected >= totalPurchaseGstPaid ? (
                  <div className="flex justify-between font-black text-xs text-red-400 pt-3 border-t border-dashed border-slate-800">
                    <span>NET REMITTANCE CASH GST LIABILITY REMAINING:</span>
                    <span className="text-red-400 font-extrabold text-sm">₹{((totalSalesGstCollected - totalPurchaseGstPaid) || 0).toFixed(2)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between font-black text-xs text-teal-400 pt-3 border-t border-dashed border-slate-800">
                    <span>CARRY-FORWARD EXTRA SURPLUS CREDIT OFFSET BALANCE:</span>
                    <span className="text-teal-400 font-extrabold text-sm">₹{((totalPurchaseGstPaid - totalSalesGstCollected) || 0).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
