/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  DollarSign, Plus, Trash2, Calendar, FileText, CheckCircle, 
  ArrowDownRight, Sparkles, Filter, Info, Tag, IndianRupee,
  DollarSign as IncIcon, Plus as PlusIcon, Trash2 as TrashIcon, Calendar as CalendarIcon, FileText as FileIcon, CheckCircle as CheckIcon, Sparkles as SparkleIcon, Filter as FilterIcon, Info as InfoIcon, Tag as TagIcon
} from 'lucide-react';
import { Expense } from '../../types';

interface ExpenseManagerUpdateProps {
  expenses: Expense[];
  isDarkMode: boolean;
  isAdmin: boolean;
  currentUsername: string;
  onRefreshDB: () => void;
  onLogActivity: (action: string, details: string) => void;
}

export default function ExpenseManagerUpdate({
  expenses,
  isDarkMode,
  isAdmin,
  currentUsername,
  onRefreshDB,
  onLogActivity
}: ExpenseManagerUpdateProps) {
  
  // Creation States
  const [isAddingExpense, setIsAddingExpense] = useState<boolean>(false);
  const [expenseCategory, setExpenseCategory] = useState<string>('Rent');
  const [expenseAmount, setExpenseAmount] = useState<number>(0);
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expenseDescription, setExpenseDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Month select filter
  const [selectedMonthOffset, setSelectedMonthOffset] = useState<string>('2026-06');

  // Allowed Module 7 Categories
  const expenseCategories = ["Rent", "Salary", "Electricity", "Internet", "Transport", "Maintenance"];

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseAmount <= 0) {
      alert("Expense spent cost must be higher than zero.");
      return;
    }

    setSubmitting(true);
    const payload = {
      category: expenseCategory,
      amount: Number(expenseAmount),
      date: expenseDate,
      description: expenseDescription || `${expenseCategory} Expense payout`,
      createdBy: currentUsername
    };

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        onRefreshDB();
        onLogActivity(
          "Log Store Expense", 
          `Registered ₹ ${payload.amount.toFixed(2)} under ${payload.category} (${payload.description})`
        );
        alert("Expense entry added successfully.");
        // reset form
        setExpenseAmount(0);
        setExpenseDescription('');
        setIsAddingExpense(false);
      } else {
        alert("Save failed: " + data.error);
      }
    } catch (err) {
      alert("Network errors connecting to expense ledger database.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string, cat: string, amt: number) => {
    if (!isAdmin) {
      alert("Access Denied: Only Admins can roll back logs of store operating expenses.");
      return;
    }

    const conf = window.confirm(`Permanently remove this expense log of ₹ ${amt}?`);
    if (!conf) return;

    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ createdBy: currentUsername })
      });
      const data = await res.json();
      if (data.success) {
        onRefreshDB();
        onLogActivity("Remove Store Expense", `Deleted ₹ ${amt} expense record of category ${cat}`);
        alert("Expense entry purged.");
      } else {
        alert("Deletion failed: " + data.error);
      }
    } catch (err) {
      alert("Network error purging operational expense record.");
    }
  };

  // Filter list by selected monthly period
  const filteredList = expenses.filter(e => e.date.startsWith(selectedMonthOffset));

  // Compute total monthly outflows
  const totalOutflow = filteredList.reduce((sum, e) => sum + e.amount, 0);

  // Grouping Category cost summaries dynamically for reporting
  const categoryChartGroup: Record<string, number> = {};
  expenseCategories.forEach(cat => { categoryChartGroup[cat] = 0; });
  filteredList.forEach(e => {
    if (categoryChartGroup[e.category] !== undefined) {
      categoryChartGroup[e.category] += e.amount;
    } else {
      categoryChartGroup[e.category] = e.amount;
    }
  });

  return (
    <div className="space-y-6 text-slate-350">
      
      {/* Top filter and actions block */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Ledger Period month:</span>
          <select
            value={selectedMonthOffset}
            onChange={(e) => setSelectedMonthOffset(e.target.value)}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 ${
              isDarkMode ? 'bg-slate-900 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
            }`}
          >
            {["2026-05", "2026-06", "2026-07"].map(m => (
              <option key={m} value={m}>{new Date(m + "-15").toLocaleString('en-US', { month: 'long', year: 'numeric' })}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => setIsAddingExpense(prev => !prev)}
          className="px-4 py-2 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1 cursor-pointer shadow"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Record Store Expense</span>
        </button>

      </div>

      {/* Expense Addition modal Form */}
      {isAddingExpense && (
        <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'} animate-fade-in`}>
          <h4 className="text-xs font-bold uppercase mb-4 text-blue-500 flex items-center gap-1.5 select-none leading-none">
            <IncIcon className="w-4 h-4 text-blue-500" />
            <span>✦ Log Store Operational Cost Receipt</span>
          </h4>
          <form onSubmit={handleSaveExpense} className="grid grid-cols-1 md:grid-cols-4 gap-4 align-end text-xs">
            
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Cost Division Category *</label>
              <select
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value)}
                className={`text-xs px-3 py-2 rounded-lg w-full focus:outline-none ${
                  isDarkMode ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                }`}
              >
                {expenseCategories.map(cat => (
                  <option key={cat} value={cat}>📌 {cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Spent Outflow Cost (₹) *</label>
              <input
                type="number"
                required
                min={0.01}
                step={0.01}
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(Math.max(0, Number(e.target.value)))}
                className={`text-xs px-3 py-2 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isDarkMode ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Invoice Receipt Date</label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className={`text-xs px-3 py-2 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isDarkMode ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Specific voucher Description</label>
              <input
                type="text"
                value={expenseDescription}
                onChange={(e) => setExpenseDescription(e.target.value)}
                placeholder="e.g. Broadband internet router recharge bill"
                className={`text-xs px-3 py-2 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isDarkMode ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div className="md:col-span-4 flex justify-end gap-3 border-t border-slate-805 pt-3.5">
              <button
                type="button"
                onClick={() => setIsAddingExpense(false)}
                className="py-2 px-4 rounded-lg bg-slate-800 text-slate-405 hover:bg-slate-755 cursor-pointer font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="py-2 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-extrabold flex items-center gap-1 cursor-pointer shadow-lg"
              >
                <CheckIcon className="w-4 h-4" />
                <span>{submitting ? "Tracking cost..." : "Log Store Expense"}</span>
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Grid: Left is list of bills, right is Dynamic Monthly Cost Breakdown report */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 align-start">
        
        {/* Left side: list table of logged vouchers (7 cols) */}
        <div className={`p-5 rounded-xl border lg:col-span-7 xl:col-span-8 ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <h4 className="text-xs font-black uppercase mb-4 text-blue-500 tracking-wider">
            📂 Logged Operating Vouchers
          </h4>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-[11px] leading-relaxed border-collapse">
              <thead>
                <tr className="border-b border-slate-800/20 font-bold text-slate-405 opacity-60">
                  <th className="py-2.5 px-3">Spent Date</th>
                  <th className="py-2.5 px-3">Expense Category</th>
                  <th className="py-2.5 px-3">Details / Purpose</th>
                  <th className="py-2.5 px-3">Billed By</th>
                  <th className="py-2.5 px-3">Amount (₹)</th>
                  {isAdmin && <th className="py-2.5 px-3 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/40">
                {filteredList.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-855/10 text-slate-200">
                    <td className="py-3 px-3 text-slate-400 font-bold whitespace-nowrap">{e.date}</td>
                    <td className="py-3 px-3 font-semibold text-slate-100">
                      <span className="inline-block bg-slate-800 text-[10px] px-2 py-0.5 rounded border border-slate-750 font-sans tracking-wide">
                        📌 {e.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300 max-w-xs truncate" title={e.description}>
                      {e.description}
                    </td>
                    <td className="py-3 px-3 text-slate-450 uppercase text-[10px]">{e.createdBy || "admin"}</td>
                    <td className="py-3 px-3 font-extrabold text-white">₹{e.amount.toFixed(2)}</td>
                    {isAdmin && (
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(e.id, e.category, e.amount)}
                          className="p-1 rounded bg-red-950/20 hover:bg-red-900/40 text-red-400 cursor-pointer"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {filteredList.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="py-8 text-center text-slate-500 font-semibold italic">
                      No expense logs discovered in selected month.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right side: Dynamic Division chart summaries (5 cols) */}
        <div className={`p-5 rounded-xl border lg:col-span-5 xl:col-span-4 space-y-4 ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <h4 className="text-xs font-black uppercase text-blue-500 tracking-wider">
            📊 Monthly Operating Outflow report
          </h4>

          {/* Large Stat Box */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-900/40 font-sans text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Consolidated Outflow Value</span>
            <strong className="text-xl font-extrabold text-blue-400 tracking-tight">
              ₹ {totalOutflow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </strong>
            <p className="text-[9px] text-slate-500 mt-1 uppercase font-bold font-mono">Period: {selectedMonthOffset}</p>
          </div>

          <div className="border-t border-slate-805 pt-3.5 space-y-3 font-sans">
            <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              <span>Cost Center</span>
              <span>Total spent (₹)</span>
            </div>

            {/* Micro Charts Progress metrics bar */}
            {expenseCategories.map((cat) => {
              const categoryAmt = categoryChartGroup[cat] || 0;
              const ratio = totalOutflow > 0 ? (categoryAmt / totalOutflow) * 100 : 0;

              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">📌 {cat}</span>
                    <span className="font-extrabold text-white text-[11px]">
                      ₹ {categoryAmt.toFixed(2)} &nbsp;|&nbsp; <span className="text-slate-500 font-normal font-mono text-[10px]">{ratio.toFixed(0)}%</span>
                    </span>
                  </div>
                  {/* Progress Line */}
                  <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" 
                      style={{ width: `${ratio}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>

    </div>
  );
}
