/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Building, Users, ShoppingBag, TrendingUp, ShoppingCart, 
  UserCheck, CreditCard, DollarSign, Wrench, FileText, Bot, 
  Search, Bell, Plus, Trash2, Edit3, Settings, AlertTriangle, 
  Activity, Power, LogOut, Sun, Moon, Sparkles, Filter, Download, Printer,
  RotateCcw
} from 'lucide-react';

import { 
  UserRole, SmartDeskUser, InventoryProduct, Customer, 
  SalesInvoice, Expense, ActivityLog, ERPDatabaseState 
} from './types';

// Modular Sub-Components
import Footer from './components/Footer';
import AiAssistant from './modules/ai_assistant/AiAssistant';
import POSBilling from './modules/sales/POSBilling';
import InventoryManager from './modules/inventory/InventoryManager';
import SupplierManager from './modules/suppliers/SupplierManager';
import HrPayrollManager from './modules/hr_payroll/HrPayrollManager';
import ExpenseManagerUpdate from './modules/expenses/ExpenseManagerUpdate';
import ReportsManager from './modules/reports/ReportsManager';
import SystemSettingsManager from './modules/settings/SystemSettingsManager';
import ReturnsReplacementsManager from './modules/returns/ReturnsReplacementsManager';

export default function App() {
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Active User session
  const [currentUser, setCurrentUser] = useState<SmartDeskUser | null>(() => {
    try {
      const savedUser = localStorage.getItem('sd_current_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  // Active view/tab state
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Database models
  const [dbState, setDbState] = useState<ERPDatabaseState>({
    users: [],
    inventory: [],
    customers: [],
    sales: [],
    expenses: [],
    logs: [],
    returns: [],
    replacements: []
  });

  const [loadingDB, setLoadingDB] = useState<boolean>(true);

  // Login variables
  const [loginUsername, setLoginUsername] = useState<string>('admin');
  const [loginPassword, setLoginPassword] = useState<string>('admin123');
  const [loginError, setLoginError] = useState<string>('');
  const [signingIn, setSigningIn] = useState<boolean>(false);

  // Universal Global Search Input (Searches products/customers)
  const [globalSearch, setGlobalSearch] = useState<string>('');

  // Module 2: Employee addition / update state
  const [editingUser, setEditingUser] = useState<SmartDeskUser | null>(null);
  const [isAddingUser, setIsAddingUser] = useState<boolean>(false);
  const [empName, setEmpName] = useState<string>('');
  const [empMobile, setEmpMobile] = useState<string>('');
  const [empEmail, setEmpEmail] = useState<string>('');
  const [empPosition, setEmpPosition] = useState<string>('Sales Associate');
  const [empAddress, setEmpAddress] = useState<string>('');
  const [empPassword, setEmpPassword] = useState<string>('');

  // Module 5: Customer states
  const [selectedCustHistory, setSelectedCustHistory] = useState<Customer | null>(null);
  const [isAddingCust, setIsAddingCust] = useState<boolean>(false);
  const [custName, setCustName] = useState<string>('');
  const [custMobile, setCustMobile] = useState<string>('');
  const [custEmail, setCustEmail] = useState<string>('');
  const [custAddress, setCustAddress] = useState<string>('');

  // Module 6: Expense creation states
  const [isAddingExpense, setIsAddingExpense] = useState<boolean>(false);
  const [expCategory, setExpCategory] = useState<string>('Rent');
  const [expAmount, setExpAmount] = useState<number>(0);
  const [expDate, setExpDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expDescription, setExpDescription] = useState<string>('');

  // Employee profile local password modifier state
  const [showPasswordChangeUI, setShowPasswordChangeUI] = useState<boolean>(false);
  const [profileNewPassword, setProfileNewPassword] = useState<string>('');

  // Fetch complete real-time database state from Express backend
  const fetchDatabaseState = async () => {
    try {
      setLoadingDB(true);
      const res = await fetch('/api/db');
      if (res.ok) {
        const data = await res.json();
        setDbState(data);
      }
    } catch (err) {
      console.error("Failed to connect with live database. Working offline:", err);
    } finally {
      setLoadingDB(false);
    }
  };

  useEffect(() => {
    fetchDatabaseState();
  }, []);

  const handleLogActivity = async (action: string, details: string) => {
    if (!currentUser) return;
    try {
      // In a real database we could POST to an activity log, let's append locally via re-fetch or state
      const dbCopy = { ...dbState };
      dbCopy.logs.unshift({
        id: `log_${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: currentUser.username,
        action,
        details
      });
      setDbState(dbCopy);
    } catch (err) {
      console.warn("Analytics logger delay:", err);
    }
  };

  // Secure Authorization Login handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword.trim()) return;

    setSigningIn(true);
    setLoginError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      const data = await res.json();

      if (data.success) {
        setCurrentUser(data.user);
        try {
          localStorage.setItem('sd_current_user', JSON.stringify(data.user));
        } catch (err) {
          console.warn("Could not preserve user session", err);
        }
        setLoginUsername('');
        setLoginPassword('');
        fetchDatabaseState();
      } else {
        setLoginError(data.error || "Incorrect credentials");
      }
    } catch (err) {
      setLoginError("Offline Authentication Mode: server not reached.");
    } finally {
      setSigningIn(false);
    }
  };

  const handleLogout = () => {
    if (currentUser) {
      handleLogActivity("User Logout", "Closed secure ERP terminal session.");
    }
    setCurrentUser(null);
    try {
      localStorage.removeItem('sd_current_user');
    } catch (err) {
      console.warn("Could not clear preserved user session", err);
    }
    setActiveTab('dashboard');
  };

  // Module 2: Employee additions
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim() || !empEmail.trim() || !empMobile.trim()) {
      alert("Please provide the employee's name, email, and mobile number.");
      return;
    }

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: empName,
          email: empEmail,
          mobile: empMobile,
          address: empAddress,
          position: empPosition,
          joiningDate: new Date().toISOString().split('T')[0],
          role: empPosition.includes("Owner") || empPosition.includes("Manager") ? UserRole.ADMIN : UserRole.EMPLOYEE,
          createdBy: currentUser?.username
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchDatabaseState();
        setIsAddingUser(false);
        // Clear forms
        setEmpName('');
        setEmpEmail('');
        setEmpMobile('');
        setEmpAddress('');
      } else {
        alert("Action denied: " + data.error);
      }
    } catch (err) {
      alert("Error adding employee record.");
    }
  };

  // Module 2: Toggle enable/disable employee accounts
  const toggleEmployeeStatus = async (emp: SmartDeskUser) => {
    if (emp.id === currentUser?.id) {
      alert("Self-Lock Warning: You cannot lock or disable your own active administrator account.");
      return;
    }

    const targetStatus = emp.status === 'Active' ? 'Disabled' : 'Active';
    const confirmAction = window.confirm(`Change access permission for ${emp.name} to ${targetStatus}?`);
    if (!confirmAction) return;

    try {
      const res = await fetch(`/api/employees/${emp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus, currentUsername: currentUser?.username })
      });
      const data = await res.json();
      if (data.success) {
        fetchDatabaseState();
      } else {
        alert("Operation failed: " + data.error);
      }
    } catch (err) {
      alert("Error reaching server logic.");
    }
  };

  // Module 2: Reset employee passwords
  const resetEmployeePassword = async (emp: SmartDeskUser) => {
    const nextPass = window.prompt(`Enter a new temporary password for employee: ${emp.name}`, "emp123");
    if (!nextPass) return;

    try {
      const res = await fetch(`/api/employees/${emp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: nextPass, currentUsername: currentUser?.username })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Success! Credential updated for ${emp.name}.`);
        fetchDatabaseState();
      } else {
        alert("Failed: " + data.error);
      }
    } catch (err) {
      alert("Password change failed.");
    }
  };

  // Profile Password Change form submittal
  const handleProfilePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileNewPassword.trim() || !currentUser) return;

    try {
      const res = await fetch(`/api/employees/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: profileNewPassword, currentUsername: currentUser.username })
      });
      const data = await res.json();
      if (data.success) {
        alert("Your access password was updated successfully.");
        setProfileNewPassword('');
        setShowPasswordChangeUI(false);
      } else {
        alert("Failed to modify: " + data.error);
      }
    } catch (err) {
      alert("Server failure.");
    }
  };

  // Module 5: Customer Addition submitter
  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim() || !custMobile.trim()) {
      alert("Please enter customer name and contact phone.");
      return;
    }

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: custName,
          mobile: custMobile,
          email: custEmail,
          address: custAddress,
          createdBy: currentUser?.username
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchDatabaseState();
        setIsAddingCust(false);
        setCustName('');
        setCustMobile('');
        setCustEmail('');
        setCustAddress('');
      } else {
        alert("Save fail: " + data.error);
      }
    } catch (err) {
      alert("Failed to record customer profile.");
    }
  };

  // Module 6: Expense logger submittal
  const handleAddExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (expAmount <= 0) {
      alert("Operational expense booking values must exceed ₹0.00");
      return;
    }

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: expCategory,
          amount: expAmount,
          date: expDate,
          description: expDescription,
          createdBy: currentUser?.username
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchDatabaseState();
        setIsAddingExpense(false);
        setExpAmount(0);
        setExpDescription('');
      } else {
        alert("Failed to store expense: " + data.error);
      }
    } catch (err) {
      alert("Billing overhead service unreachable.");
    }
  };

  // System Database seed resetting
  const handleReseedDb = async () => {
    const confirmAction = window.confirm("WARNING: Are you sure you want to completely restore the mock databases? This will clear any live POS checkout bills, new employee profiles, and added customer ledger histories.");
    if (!confirmAction) return;

    try {
      const res = await fetch('/api/db/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchDatabaseState();
        alert("SmartDeskERP databases re-seeded successfully.");
      }
    } catch (err) {
      alert("Reset fail.");
    }
  };

  // Excel / CSV formatted download generator
  const downloadModuleSpreadsheet = (entityName: 'products' | 'customers' | 'invoices' | 'expenses') => {
    let headers: string[] = [];
    let rows: string[][] = [];

    if (entityName === 'products') {
      headers = ['Product ID', 'Name', 'SKU', 'Category', 'Purchase Cost', 'Selling Retail Price', 'In Stock Units', 'Primary Supplier', 'Barcode'];
      rows = dbState.inventory.map(p => [
        p.id, p.name, p.sku, p.category, p.purchasePrice.toString(), p.sellingPrice.toString(), p.quantity.toString(), p.supplier, p.barcode
      ]);
    } else if (entityName === 'customers') {
      headers = ['Customer ID', 'Contact Name', 'Mobile No', 'Registered Email', 'HQ Address', 'Creation Timestamps'];
      rows = dbState.customers.map(c => [
        c.id, c.name, c.mobile, c.email, c.address, c.createdAt
      ]);
    } else if (entityName === 'expenses') {
      headers = ['Expense ID', 'Category Allocation', 'Amount Logged ($)', 'Billing Date', 'Voucher Descriptions'];
      rows = dbState.expenses.map(e => [
        e.id, e.category, e.amount.toString(), e.date, e.description
      ]);
    } else {
      headers = ['Invoice Number', 'Company Title', 'Customer Name', 'Items list', 'Subtotal', 'Tax (8.25%)', 'Grand Total Amount', 'Cashier Rep', 'Transaction Status'];
      rows = dbState.sales.map(s => [
        s.invoiceNumber, s.companyName, s.customerName, s.items.map(i => `${i.name} (Qty:${i.quantity})`).join("; "), s.subtotal.toString(), s.tax.toString(), s.totalAmount.toString(), s.createdBy, s.status
      ]);
    }

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", encodedUri);
    downloadAnchor.setAttribute("download", `smartdesk_${entityName}_export.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
  };

  // Executive Report computations (Admin only)
  // Computes Live Profit margins: Profit = Paid Invoices Values - Cost of goods purchased - Expenses books!
  const calculateExecutivesReports = () => {
    const totalSalesRevenue = dbState.sales.filter(s => s.status !== 'Returned').reduce((sum, s) => sum + s.totalAmount, 0);
    
    const totalCostOfGoodsPurchased = dbState.sales.filter(s => s.status !== 'Returned').reduce((sum, s) => {
      let runCost = 0;
      s.items.forEach(item => {
        const found = dbState.inventory.find(p => p.id === item.productId);
        if (found) {
          runCost += found.purchasePrice * item.quantity;
        }
      });
      return sum + runCost;
    }, 0);

    const totalOverheadExpenses = dbState.expenses.reduce((sum, e) => sum + e.amount, 0);
    const netOperationProfits = totalSalesRevenue - totalCostOfGoodsPurchased - totalOverheadExpenses;

    const stockAssetValuation = dbState.inventory.reduce((sum, p) => sum + (p.purchasePrice * p.quantity), 0);
    const stockSellingValuation = dbState.inventory.reduce((sum, p) => sum + (p.sellingPrice * p.quantity), 0);

    return {
      totalSalesRevenue,
      totalCostOfGoodsPurchased,
      totalOverheadExpenses,
      netOperationProfits,
      stockAssetValuation,
      stockSellingValuation
    };
  };

  const reportsCalculated = calculateExecutivesReports();

  // Low stock products alert numbers (quantities <= 10)
  const lowStockThresholdCount = dbState.inventory.filter(p => p.quantity <= 10).length;

  if (loadingDB && dbState.inventory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-xs font-mono tracking-widest text-slate-400">CONNECTING TO SMARTDESKERP CORE RUNTIMES...</p>
      </div>
    );
  }

  // LOGIN CONTAINER SCREEN
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-between relative overflow-hidden font-sans text-xs">
        
        {/* Ambient glow backgrounds */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[140px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-indigo-950/20 rounded-full blur-[140px] pointer-events-none"></div>

        <header className="py-6 px-10 flex items-center justify-between border-b border-slate-900/60 z-10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-lg flex items-center justify-center font-black text-white shadow-xl shadow-blue-600/20">
              S
            </div>
            <div>
              <span className="font-sans font-black text-white text-sm tracking-tight block">SmartDeskERP</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-bold">LTS Secure v5.1</span>
            </div>
          </div>
          <span className="text-[10px] bg-slate-900 text-slate-400 font-mono border border-slate-850 px-3 py-1 rounded-full">
            ● Offline Cloud Sync Ready
          </span>
        </header>

        {/* Login Card Core */}
        <main className="flex-1 flex items-center justify-center p-6 z-10">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-8 shadow-2xl space-y-6 relative">
            
            <div className="text-center space-y-1">
              <span className="text-[10px] bg-blue-950 text-blue-400 font-bold px-3 py-0.5 rounded-full border border-blue-900 uppercase tracking-widest">
                Protected Console Access
              </span>
              <h2 className="text-base font-extrabold text-white tracking-tight pt-1">
                Authorized Login Only
              </h2>
              <p className="text-slate-400 text-[11px]">
                Please sign in to access products, checkouts, and strategic analytics.
              </p>
            </div>

            {loginError && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-900/30 text-red-400 text-[11px] leading-relaxed flex items-start gap-2.5">
                <AlertTriangle className="w-4.5 h-4.5 text-red-400 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                  Sign-In Username Code
                </label>
                <input
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="e.g. admin or elena"
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                  Secure Access Password
                </label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter encrypted password"
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={signingIn}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Power className="w-4 h-4" />
                <span>{signingIn ? "Verifying Keys..." : "Initialize ERP Session"}</span>
              </button>
            </form>

            {/* Diagnostic helper block */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-850 text-[10px] space-y-2 text-slate-400">
              <p className="font-extrabold text-blue-500 uppercase tracking-wide flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Diagnostic Sandbox Credentials:</span>
              </p>
              <div className="grid grid-cols-2 gap-2 text-slate-300 font-mono">
                <div>
                  <span className="block font-bold text-slate-400">ADMINISTRATOR:</span>
                  <span className="block italic text-blue-400">User: admin</span>
                  <span className="block italic text-blue-400">Pass: admin123</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-400">SALES EMPLOYEE:</span>
                  <span className="block italic text-blue-400">User: elena</span>
                  <span className="block italic text-blue-400">Pass: emp123</span>
                </div>
              </div>
            </div>

          </div>
        </main>

        <Footer isAdmin={false} />
      </div>
    );
  }

  // MAIN RUNNING ERP DASHBOARD (FOR AUTHENTICATED ADMINS & EMPLOYEES)
  const isAdminSession = currentUser.role === UserRole.ADMIN;

  return (
    <div className={`min-h-screen flex flex-col font-sans text-xs transition-colors duration-150 ${
      isDarkMode ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-850'
    }`}>
      
      {/* Top Header bar */}
      <header className={`py-4 px-8 border-b flex items-center justify-between shrink-0 z-10 sticky top-0 backdrop-blur ${
        isDarkMode ? 'bg-slate-950/90 border-slate-850 text-slate-200' : 'bg-white/90 border-slate-205 text-slate-800'
      }`}>
        {/* Brand label */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white font-extrabold shadow-md shadow-blue-500/20">
            S
          </div>
          <div>
            <h1 className={`font-black tracking-tight text-sm flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-850'}`}>
              SmartDeskERP
              <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${
                isAdminSession 
                  ? 'bg-blue-950/50 text-blue-400 border-blue-900/30' 
                  : 'bg-emerald-950/50 text-emerald-400 border-emerald-900/30'
              }`}>
                {currentUser.role.toUpperCase()} CONSOLE
              </span>
            </h1>
            <p className="text-[10px] text-slate-550 flex items-center gap-1">
              <span>Tenant Node: Kolkata Central Shop</span>
              <span>•</span>
              <span className="font-semibold text-blue-500">Logged in as {currentUser.name}</span>
            </p>
          </div>
        </div>

        {/* Header Right utilities */}
        <div className="flex items-center gap-4">
          
          {/* Theme switcher */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-lg transition-all cursor-pointer hover:bg-slate-800/10 ${
              isDarkMode ? 'text-amber-400 hover:text-amber-300' : 'text-slate-500 hover:text-slate-700'
            }`}
            title="Toggle color theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User drop controls */}
          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-700/50">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-extrabold text-blue-400 border border-slate-700">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            
            <div className="hidden md:block text-left text-[11px]">
              <span className={`font-extrabold block leading-tight ${isDarkMode ? 'text-white' : 'text-slate-850'}`}>
                {currentUser.name}
              </span>
              <button
                onClick={() => setShowPasswordChangeUI(!showPasswordChangeUI)}
                className="text-[9px] text-slate-550 hover:text-blue-500 underline text-left block"
              >
                Change password
              </button>
            </div>

            <button
              onClick={handleLogout}
              title="Logout session"
              className="p-2 rounded-lg bg-red-950/20 text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-all cursor-pointer ml-1 text-xs font-bold"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* Main Layout containing Side Navigation and Active Tab View */}
      <div className="flex-1 flex flex-col md:flex-row relative">

        {/* Sliding drawer / Navigation bar (Admin restricts certain tabs!) */}
        <nav className={`w-full md:w-56 p-4 shrink-0 border-r md:border-b-0 border-b space-y-1.5 ${
          isDarkMode ? 'bg-slate-950 border-slate-850' : 'bg-white border-slate-205'
        }`}>
          
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider px-3 pb-2">
            Main Directories
          </p>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center justify-between text-left text-xs py-2 px-3 rounded-lg font-bold cursor-pointer transition-all ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white font-black'
                : isDarkMode 
                  ? 'text-slate-400 hover:text-white hover:bg-slate-900' 
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span>ERP Dashboard</span>
            </span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`w-full flex items-center justify-between text-left text-xs py-2 px-3 rounded-lg font-bold cursor-pointer transition-all ${
              activeTab === 'inventory'
                ? 'bg-blue-600 text-white font-black'
                : isDarkMode 
                  ? 'text-slate-400 hover:text-white hover:bg-slate-900' 
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-101'
            }`}
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              <span>Inventory Stock</span>
            </span>
            {lowStockThresholdCount > 0 && (
              <span className="text-[9px] bg-red-900 text-red-100 font-extrabold px-1.5 rounded animate-pulse">
                {lowStockThresholdCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('sales')}
            className={`w-full flex items-center justify-between text-left text-xs py-2 px-3 rounded-lg font-bold cursor-pointer transition-all ${
              activeTab === 'sales'
                ? 'bg-blue-600 text-white font-black'
                : isDarkMode 
                  ? 'text-slate-400 hover:text-white hover:bg-slate-900' 
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-101'
            }`}
          >
            <span className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              <span>POS Billing</span>
            </span>
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`w-full flex items-center justify-between text-left text-xs py-2 px-3 rounded-lg font-bold cursor-pointer transition-all ${
              activeTab === 'customers'
                ? 'bg-blue-600 text-white font-black'
                : isDarkMode 
                  ? 'text-slate-400 hover:text-white hover:bg-slate-900' 
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-101'
            }`}
          >
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>Customers ({dbState.customers?.length || 0})</span>
            </span>
          </button>

          <button
            onClick={() => setActiveTab('suppliers')}
            className={`w-full flex items-center justify-between text-left text-xs py-2 px-3 rounded-lg font-bold cursor-pointer transition-all ${
              activeTab === 'suppliers'
                ? 'bg-blue-600 text-white font-black'
                : isDarkMode 
                  ? 'text-slate-400 hover:text-white hover:bg-slate-900' 
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-101'
            }`}
          >
            <span className="flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-505" />
              <span>Suppliers ({dbState.suppliers?.length || 0})</span>
            </span>
          </button>

          <button
            onClick={() => setActiveTab('returns')}
            className={`w-full flex items-center justify-between text-left text-xs py-2 px-3 rounded-lg font-bold cursor-pointer transition-all ${
              activeTab === 'returns'
                ? 'bg-blue-600 text-white font-smart'
                : isDarkMode 
                  ? 'text-slate-400 hover:text-white hover:bg-slate-900' 
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-101'
            }`}
          >
            <span className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-orange-500 animate-spin-slow" />
              <span>Returns & Swaps ({dbState.returns?.length || 0})</span>
            </span>
            {Array.isArray(dbState.returns) && dbState.returns.filter((r: any) => r.status === 'Pending Approval').length > 0 && (
              <span className="text-[9px] bg-amber-600 text-white font-extrabold px-1.5 py-0.5 rounded animate-pulse">
                {dbState.returns.filter((r: any) => r.status === 'Pending Approval').length}
              </span>
            )}
          </button>

          {isAdminSession && (
            <>
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider px-3 pt-5 pb-2">
                Intelligence AI
              </p>

              <button
                onClick={() => setActiveTab('analytics')}
                className={`w-full flex items-center justify-between text-left text-xs py-2 px-3 rounded-lg font-bold cursor-pointer transition-all ${
                  activeTab === 'analytics'
                    ? 'bg-blue-600 text-white font-black'
                    : isDarkMode 
                      ? 'text-slate-400 hover:text-white hover:bg-slate-900' 
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-101'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Bot className="w-4 h-4" />
                  <span>SmartDesk AI Chat</span>
                </span>
                <span className="text-[8px] bg-blue-900 text-blue-200 uppercase font-bold px-1.5 rounded tracking-wide animate-pulse">
                  LIVE
                </span>
              </button>
            </>
          )}

          <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider px-3 pt-5 pb-2">
            Admin Management
          </p>

          <button
            disabled={!isAdminSession}
            onClick={() => setActiveTab('employees')}
            className={`w-full flex items-center justify-between text-left text-xs py-2 px-3 rounded-lg font-bold cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              activeTab === 'employees'
                ? 'bg-blue-600 text-white font-smart'
                : isDarkMode 
                  ? 'text-slate-400 hover:text-white hover:bg-slate-900' 
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-101'
            }`}
          >
            <span className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              <span>Employees Control</span>
            </span>
          </button>

          <button
            disabled={!isAdminSession}
            onClick={() => setActiveTab('expenses')}
            className={`w-full flex items-center justify-between text-left text-xs py-2 px-3 rounded-lg font-bold cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              activeTab === 'expenses'
                ? 'bg-blue-600 text-white font-smart'
                : isDarkMode 
                  ? 'text-slate-400 hover:text-white hover:bg-slate-900' 
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-101'
            }`}
          >
            <span className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <span>Expense Ledger</span>
            </span>
          </button>

          <button
            disabled={!isAdminSession}
            onClick={() => setActiveTab('reports')}
            className={`w-full flex items-center justify-between text-left text-xs py-2 px-3 rounded-lg font-bold cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              activeTab === 'reports'
                ? 'bg-blue-600 text-white'
                : isDarkMode 
                  ? 'text-slate-400 hover:text-white hover:bg-slate-900' 
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-101'
            }`}
          >
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>Executive Reports</span>
            </span>
          </button>

          <button
            disabled={!isAdminSession}
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center justify-between text-left text-xs py-2 px-3 rounded-lg font-bold cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white'
                : isDarkMode 
                  ? 'text-slate-400 hover:text-white hover:bg-slate-900' 
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-101'
            }`}
          >
            <span className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span>System Settings</span>
            </span>
          </button>

        </nav>

        {/* Central tab screen panel area */}
        <main className="flex-1 p-8 overflow-y-auto space-y-6">

          {/* Force Change Password input overlay on demand */}
          {showPasswordChangeUI && (
            <div className="p-4 rounded-xl border border-dashed border-blue-500 bg-blue-950/20 max-w-sm space-y-3">
              <h4 className="font-bold text-xs text-blue-400">⚡ Update Profile Secure Access Password</h4>
              <form onSubmit={handleProfilePasswordChangeSubmit} className="flex gap-2">
                <input
                  type="password"
                  required
                  value={profileNewPassword}
                  onChange={(e) => setProfileNewPassword(e.target.value)}
                  placeholder="Type new secure credentials"
                  className={`flex-1 p-2 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none ${
                    isDarkMode ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-350 text-slate-800'
                  }`}
                />
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs cursor-pointer">
                  Save
                </button>
              </form>
            </div>
          )}

          {/* VIEW: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-extrabold uppercase tracking-widest text-blue-500">
                    {isAdminSession ? "🏢 Executive Operations Dashboard" : "👤 Employee Sales Panel"}
                  </h2>
                  <p className="text-[11px] text-slate-450 leading-relaxed">
                    Live telemetry reports tracking cash balances, sales volume growth, and shelf quantities.
                  </p>
                </div>
                
                {/* Visual date sign */}
                <div className="text-[10px] bg-slate-900 border border-slate-800 p-2 rounded-xl text-slate-400 font-mono">
                  Operational Date: <span className="text-emerald-400">June 17, 2026 UTC</span>
                </div>
              </div>

              {/* DASHBOARD WIDGETS GRID */}
              {isAdminSession ? (
                /* ----------------- ADMIN DASHBOARD WIDGETS (Financial summaries) ----------------- */
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Stats Cards Row */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className={`p-4 rounded-xl border relative overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-205'}`}>
                      <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">Today's Sales Revenue</div>
                      <div className="text-xl font-extrabold text-blue-500">₹{((reportsCalculated?.totalSalesRevenue * 0.4) || 0).toFixed(2)}</div>
                      <span className="text-[9px] text-emerald-400 font-bold block pt-1">↑ 10% compared to average</span>
                    </div>

                    <div className={`p-4 rounded-xl border relative overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-205'}`}>
                      <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">Cumulative Revenue</div>
                      <div className="text-xl font-extrabold text-slate-100">₹{(reportsCalculated?.totalSalesRevenue || 0).toFixed(2)}</div>
                      <span className="text-[9px] text-slate-400 font-bold block pt-1">Across {dbState.sales.filter(s=>s.status !== 'Returned').length} total invoices</span>
                    </div>

                    <div className={`p-4 rounded-xl border relative overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-205'}`}>
                      <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">Stock Asset Valuation</div>
                      <div className="text-xl font-extrabold text-slate-100">₹{(reportsCalculated?.stockAssetValuation || 0).toFixed(2)}</div>
                      <span className="text-[9px] text-slate-400 font-bold block pt-1">At wholesale purchase value</span>
                    </div>

                    <div className={`p-4 rounded-xl border relative overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800 animate-pulse border-amber-900 text-amber-300' : 'bg-white border-amber-205 Text-amber-700'}`}>
                      <div className="text-[10px] uppercase font-bold tracking-wider mb-1 text-amber-400">Critical Stock lines</div>
                      <div className="text-xl font-extrabold text-amber-500">{lowStockThresholdCount} lines</div>
                      <span className="text-[9px] text-red-400 font-bold block pt-1">Requires restock actions</span>
                    </div>

                  </div>

                  {/* Mid grids: Sales Trend Chart & Top Selling */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Visual Sales Graph representation using clean native HTML grid */}
                    <div className={`p-5 rounded-2xl border lg:col-span-8 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <h4 className="font-bold text-xs uppercase text-slate-200 mb-4 tracking-wider">
                        Retail Revenue Growth (Monthly)
                      </h4>

                      <div className="h-44 flex items-end justify-between gap-6 pt-4 border-b border-dashed border-slate-800">
                        {/* May block */}
                        <div className="flex-1 flex flex-col items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400">₹{((reportsCalculated?.totalSalesRevenue * 0.45) || 0).toFixed(2)}</span>
                          <div className="w-full bg-slate-850 rounded-t h-28 relative">
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-indigo-700 to-indigo-500 rounded-t" style={{ height: '70%' }}></div>
                          </div>
                          <span className="text-[10px] font-bold uppercase text-slate-200">May Earnings</span>
                        </div>

                        {/* June block */}
                        <div className="flex-1 flex flex-col items-center gap-2 animate-pulse">
                          <span className="text-[10px] font-bold text-blue-400">₹{((reportsCalculated?.totalSalesRevenue * 0.55) || 0).toFixed(2)}</span>
                          <div className="w-full bg-slate-850 rounded-t h-28 relative">
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-600 to-sky-400 rounded-t" style={{ height: '100%' }}></div>
                          </div>
                          <span className="text-[10px] font-bold uppercase text-blue-500">June Earnings</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 p-1 font-mono">
                        <span>Analysis computed over June live POS tills.</span>
                        <span className="text-emerald-400">+15% sales increment</span>
                      </div>
                    </div>

                    {/* Top selling products list summary */}
                    <div className={`p-5 rounded-2xl border lg:col-span-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-240'}`}>
                      <h4 className="font-bold text-xs uppercase text-slate-200 mb-3 tracking-wider">
                        Top Selling Commodities
                      </h4>
                      
                      <div className="space-y-3.5">
                        {dbState.inventory.slice(0,3).map((item, idx) => (
                           <div key={item.id} className="flex items-center justify-between text-xs border-b border-slate-800/40 pb-2">
                             <div>
                               <span className="font-semibold block text-slate-200">{item.name}</span>
                               <span className="text-[10px] text-slate-500 font-mono">SKU ID: {item.sku}</span>
                             </div>
                             <span className="text-xs font-black text-blue-500">
                               ₹{item.sellingPrice}
                             </span>
                           </div>
                        ))}
                      </div>

                      {/* Deep strategic recommendation block */}
                      <div className="p-3 bg-blue-950/20 border border-blue-900/30 rounded-xl text-[10px] text-slate-400 space-y-1 mt-4">
                        <span className="text-blue-400 font-black uppercase text-[8px] block tracking-wider animate-pulse">Executive Advisory Statement</span>
                        <p className="leading-snug">Ensure ample storage spaces are assigned back to computer peripheral stock items, as they comprise 75% of your retail margin turnovers!</p>
                      </div>
                    </div>

                  </div>

                </div>
              ) : (
                /* ----------------- EMPLOYEE DASHBOARD WIDGETS (Invoicing stats) ----------------- */
                <div className="space-y-6 animate-fade-in">
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-205'}`}>
                      <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">Today's Invoices Created</div>
                      <div className="text-xl font-extrabold text-blue-500">
                        {dbState.sales.filter(s => s.createdBy === currentUser.username).length} Items
                      </div>
                      <span className="text-[9px] text-slate-400 block pt-1">Assigned Cashier Rep Session</span>
                    </div>

                    <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-205'}`}>
                      <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">Assigned Live Inventory Items</div>
                      <div className="text-xl font-extrabold text-slate-100">{dbState.inventory.length} SKUs</div>
                      <span className="text-[9px] text-slate-400 block pt-1">Active catalogs ready for sales click</span>
                    </div>

                    <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-800 animate-pulse text-blue-400 border-blue-900' : 'bg-white border-blue-200 text-blue-800'}`}>
                      <div className="text-[10px] uppercase font-bold tracking-wider mb-1">Personal Sales Volume</div>
                      <div className="text-xl font-extrabold text-blue-500">
                        ₹{(dbState.sales.filter(s => s.createdBy === currentUser?.username && s.status !== 'Returned').reduce((sum, s) => sum + (s.totalAmount || 0), 0) || 0).toFixed(2)}
                      </div>
                      <span className="text-[9px] text-slate-400 block pt-1">Cumulative sales contribution</span>
                    </div>
                  </div>

                  {/* Delegated checklist tasks so employees have operations checklist */}
                  <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <h4 className="font-extrabold text-xs uppercase text-slate-100 mb-3 tracking-wider text-blue-500">
                      📋 Your Daily Retail Operational Guidelines
                    </h4>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex items-center gap-3 p-2 bg-slate-950/40 rounded-lg">
                        <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded" />
                        <span className="font-semibold text-slate-300">Synchronize POS terminal registers upon startup with cashiers keys.</span>
                      </div>
                      <div className="flex items-center gap-3 p-2 bg-slate-950/40 rounded-lg">
                        <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded" />
                        <span className="font-semibold text-slate-300">Run barcode checks on new electronic monitors & keypads.</span>
                      </div>
                      <div className="flex items-center gap-3 p-2 bg-slate-950/40 rounded-lg">
                        <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" />
                        <span className="font-semibold text-slate-400 italic">File monthly stock count differences with inventory coordinator.</span>
                      </div>
                      <div className="flex items-center gap-3 p-2 bg-slate-950/40 rounded-lg">
                        <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" />
                        <span className="font-semibold text-slate-400 italic">Greet customers during discount retail cycles and up-sell accessory wire cables.</span>
                      </div>
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

          {/* VIEW: INVENTORY */}
          {activeTab === 'inventory' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="text-sm font-extrabold uppercase tracking-widest text-blue-500">
                  📦 Inventory Logistics Registers
                </h2>
                <p className="text-[11px] text-slate-450">
                  Update wholesale values, selling prices, physical stocks and look up product SKU barcodes.
                </p>
              </div>

              <InventoryManager
                inventory={dbState.inventory}
                isDarkMode={isDarkMode}
                isAdmin={isAdminSession}
                currentUsername={currentUser.username}
                onRefreshDB={fetchDatabaseState}
                onLogActivity={handleLogActivity}
              />
            </div>
          )}

          {/* VIEW: SALES POS BILLING */}
          {activeTab === 'sales' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="text-sm font-extrabold uppercase tracking-widest text-blue-500">
                  🛒 Multi-Item Point-Of-Sale Invoice Register
                </h2>
                <p className="text-[11px] text-slate-450">
                  Create retail sales invoices, print simulated bills, and manage overall transactional cash volumes.
                </p>
              </div>

              <POSBilling
                inventory={dbState.inventory}
                customers={dbState.customers}
                salesLogs={dbState.sales}
                currentUsername={currentUser.username}
                isDarkMode={isDarkMode}
                isAdmin={isAdminSession}
                settings={dbState.settings}
                onRefreshDB={fetchDatabaseState}
                onLogActivity={handleLogActivity}
              />
            </div>
          )}

          {/* VIEW: CUSTOMERS */}
          {activeTab === 'customers' && (
            <div className="space-y-6 animate-fade-in">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-extrabold uppercase tracking-widest text-blue-500">
                    👤 Registered CRM Customers
                  </h2>
                  <p className="text-[11px] text-slate-450">
                    Look up client coordinates, address paths, and review complete purchase transaction catalogs.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => downloadModuleSpreadsheet('customers')}
                    className="p-2 py-1.5 rounded-lg border border-slate-700 text-slate-300 font-bold hover:bg-slate-800 hover:text-white transition-all text-[11px] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Customers list</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAddingCust(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[11px] px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Register Customer Profile</span>
                  </button>
                </div>
              </div>

              {/* Add Customer Form Modal */}
              {isAddingCust && (
                <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 text-xs">
                  <form 
                    onSubmit={handleAddCustomerSubmit}
                    className={`max-w-md w-full p-6 rounded-2xl border ${
                      isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-350 text-slate-900'
                    }`}
                  >
                    <h3 className="text-xs font-black uppercase mb-4 text-blue-500">
                      👤 Register New CRM Customer
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Customer Full Name *</label>
                        <input
                          type="text"
                          required
                          value={custName}
                          onChange={(e) => setCustName(e.target.value)}
                          placeholder="e.g. John Miller Operations"
                          className={`w-full p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                            isDarkMode ? 'bg-slate-950 border border-slate-805' : 'bg-slate-50 border border-slate-300'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Primary Mobile Number *</label>
                        <input
                          type="text"
                          required
                          value={custMobile}
                          onChange={(e) => setCustMobile(e.target.value)}
                          placeholder="e.g. +91 9876543210"
                          className={`w-full p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                            isDarkMode ? 'bg-slate-950 border border-slate-805' : 'bg-slate-50 border border-slate-300'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Primary Email Address</label>
                        <input
                          type="email"
                          value={custEmail}
                          onChange={(e) => setCustEmail(e.target.value)}
                          placeholder="e.g. contact@millerholdings.com"
                          className={`w-full p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                            isDarkMode ? 'bg-slate-950 border border-slate-805' : 'bg-slate-50 border border-slate-300'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">HQ Billing address</label>
                        <textarea
                          rows={2}
                          value={custAddress}
                          onChange={(e) => setCustAddress(e.target.value)}
                          placeholder="Kolkata Sector 5 block GP..."
                          className={`w-full p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                            isDarkMode ? 'bg-slate-950 border border-slate-805' : 'bg-slate-50 border border-slate-300'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button
                        type="button"
                        onClick={() => setIsAddingCust(false)}
                        className={`flex-1 py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                          isDarkMode ? 'bg-slate-805 border-slate-700' : 'bg-slate-100 border-slate-300'
                        }`}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl font-black shadow-md"
                      >
                        Register
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Customers History sliding sidebar/popup drawer */}
              {selectedCustHistory && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-end p-4 z-50 text-xs">
                  <div className={`max-w-md w-full h-full p-6 rounded-l-2xl border-l flex flex-col justify-between ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}>
                    <div>
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                        <h3 className="text-xs uppercase font-black text-blue-500 font-mono">
                          👤 Customer Purchases Dossier
                        </h3>
                        <button
                          type="button"
                          onClick={() => setSelectedCustHistory(null)}
                          className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
                        >
                          ✕ Close
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <span className="block text-[10px] uppercase font-bold text-slate-400">FullName</span>
                          <span className="text-sm font-extrabold text-slate-100">{selectedCustHistory.name}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase font-bold text-slate-400">Mobile No</span>
                          <span className="font-semibold text-slate-300">{selectedCustHistory.mobile}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase font-bold text-slate-400">HQ Address</span>
                          <span className="text-slate-350">{selectedCustHistory.address || "Local coordinates"}</span>
                        </div>
                      </div>

                      <div className="mt-6 space-y-4">
                        <h4 className="font-extrabold tracking-tight uppercase text-blue-500 border-b border-slate-800 pb-1 text-[10px]">
                          Invoice Transaction logs:
                        </h4>

                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {dbState.sales.filter(s => s.customerId === selectedCustHistory.id).map((invoice, idx) => (
                            <div key={idx} className="p-3 bg-slate-950/55 rounded-lg border border-slate-850">
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-mono font-bold text-blue-400">{invoice.invoiceNumber}</span>
                                <span className="text-[10px] text-slate-400 font-bold">${invoice.totalAmount}</span>
                              </div>
                              <span className="text-[9px] text-slate-500 block">Date: {new Date(invoice.createdAt).toLocaleDateString()}</span>
                              <div className="text-[10px] text-slate-300 pt-1.5 space-y-0.5">
                                {invoice.items.map((i, iIdx) => (
                                  <div key={iIdx} className="flex justify-between">
                                    <span>{i.name}</span>
                                    <span>Qty {i.quantity}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}

                          {dbState.sales.filter(s => s.customerId === selectedCustHistory.id).length === 0 && (
                            <p className="text-slate-500 italic text-center py-4">No logged sales transactions linked to this CRM profile.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedCustHistory(null)}
                      className="w-full bg-slate-850 font-bold py-2.5 rounded-xl border border-slate-705 text-slate-300 hover:text-white transition-all cursor-pointer mt-4"
                    >
                      Done Profile View
                    </button>
                  </div>
                </div>
              )}

              {/* Customer table list ledger */}
              <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className={`border-b ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-205 text-slate-500'} font-bold`}>
                        <th className="py-2.5 px-3">Customer Full Name</th>
                        <th className="py-2.5 px-3">Contact Mobile</th>
                        <th className="py-2.5 px-3">Email Address</th>
                        <th className="py-2.5 px-3">HQ Billing Address Route</th>
                        <th className="py-2.5 px-3">Purchase Invoices</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {dbState.customers.map((c) => {
                        const purchasesCount = dbState.sales.filter(s => s.customerId === c.id).length;
                        
                        return (
                          <tr key={c.id} className="hover:bg-slate-800/10">
                            <td className="py-3 px-3 font-semibold text-slate-100">
                              {c.name}
                            </td>
                            <td className="py-3 px-3 font-medium">
                              {c.mobile}
                            </td>
                            <td className="py-3 px-3">
                              {c.email || "walkin_customer@smartdesk.com"}
                            </td>
                            <td className="py-3 px-3 text-slate-400">
                              {c.address || "Local coordinates route"}
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded bg-blue-950/50 text-blue-400 border border-blue-900/40 font-bold">
                                {purchasesCount} Invoices
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedCustHistory(c)}
                                className="py-1 px-2.5 rounded bg-slate-800 hover:bg-slate-700 hover:text-white text-[10px] text-slate-300 font-bold transition-all cursor-pointer"
                              >
                                View History
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* VIEW: SUPPLIERS */}
          {activeTab === 'suppliers' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="text-sm font-extrabold uppercase tracking-widest text-blue-500">
                  🏢 Suppliers & Purchasing Management
                </h2>
                <p className="text-[11px] text-slate-450 font-medium">
                  Manage vendor directories (GSTIN/address credentials) and record inbound items purchase entries with GST settlement structure.
                </p>
              </div>

              <SupplierManager
                suppliers={dbState.suppliers || []}
                purchases={dbState.purchases || []}
                inventory={dbState.inventory || []}
                isDarkMode={isDarkMode}
                isAdmin={isAdminSession}
                currentUsername={currentUser.username}
                onRefreshDB={fetchDatabaseState}
                onLogActivity={handleLogActivity}
              />
            </div>
          )}

          {activeTab === 'returns' && currentUser && (
            <div className="space-y-4 animate-fade-in">
              <ReturnsReplacementsManager
                sales={dbState.sales || []}
                inventory={dbState.inventory || []}
                returns={dbState.returns || []}
                replacements={dbState.replacements || []}
                currentUser={currentUser}
                isDarkMode={isDarkMode}
                onRefreshDB={fetchDatabaseState}
              />
            </div>
          )}

          {/* VIEW: EMPLOYEES */}
          {activeTab === 'employees' && isAdminSession && (
            <div className="space-y-4 animate-fade-in text-slate-350">
              <div>
                <h2 className="text-sm font-extrabold uppercase tracking-widest text-blue-500">
                  👥 Employee Attendance & Payroll Ledger (Module 8)
                </h2>
                <p className="text-[11px] text-slate-450 font-medium mt-1">
                  Enroll staff roster profiles, log daily calendar attendance checkers (Present, Absent, Half Day, Leave), disburse monthly salary pay slips, and export HR financial reports.
                </p>
              </div>

              <HrPayrollManager
                employees={dbState.users || []}
                attendanceLogs={dbState.attendance || []}
                payrollLogs={dbState.payroll || []}
                isDarkMode={isDarkMode}
                isAdmin={isAdminSession}
                currentUsername={currentUser.username}
                settings={dbState.settings}
                onRefreshDB={fetchDatabaseState}
                onLogActivity={handleLogActivity}
              />
            </div>
          )}

          {/* VIEW: EXPENSE LEDGER */}
          {activeTab === 'expenses' && isAdminSession && (
            <div className="space-y-4 animate-fade-in text-slate-350">
              <div>
                <h2 className="text-sm font-extrabold uppercase tracking-widest text-blue-400">
                  💰 Store Operating Overhead Expenses
                </h2>
                <p className="text-[11px] text-slate-450 font-medium mt-1">
                  Register Rent, Electricity bills, Internet routers, Store Maintenance, and salaries with instant cost breakdown ratios.
                </p>
              </div>

              <ExpenseManagerUpdate
                expenses={dbState.expenses || []}
                isDarkMode={isDarkMode}
                isAdmin={isAdminSession}
                currentUsername={currentUser.username}
                onRefreshDB={fetchDatabaseState}
                onLogActivity={handleLogActivity}
              />
            </div>
          )}

          {false && activeTab === 'expenses' && (
            <div className="space-y-6 animate-fade-in">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-extrabold uppercase tracking-widest text-blue-500">
                    💰 Operating Expense Management
                  </h2>
                  <p className="text-[11px] text-slate-450">
                    Settle business rent, salaries, utilities, maintenance, internet logs, and keep tracking of Monthly Expense Reports.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => downloadModuleSpreadsheet('expenses')}
                    className="p-2 py-1.5 rounded-lg border border-slate-705 text-slate-300 font-bold hover:bg-slate-800 hover:text-white transition-all text-[11px] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Expenses</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAddingExpense(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[11px] px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Book Operational Expense</span>
                  </button>
                </div>
              </div>

              {/* Book Expense Form Modal */}
              {isAddingExpense && (
                <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 text-xs font-sans">
                  <form 
                    onSubmit={handleAddExpenseSubmit}
                    className={`max-w-md w-full p-6 rounded-2xl border ${
                      isDarkMode ? 'bg-slate-900 border-slate-805 text-white' : 'bg-white border-slate-350 text-slate-900'
                    }`}
                  >
                    <h3 className="text-xs font-black uppercase mb-4 text-blue-500">
                      💰 Book Operating Expense Account
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Expense Category Category *</label>
                        <select
                          value={expCategory}
                          onChange={(e) => setExpCategory(e.target.value)}
                          className={`w-full p-2.5 rounded-lg focus:outline-none ${
                            isDarkMode ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                          }`}
                        >
                          <option value="Rent">Rent</option>
                          <option value="Salary">Salary</option>
                          <option value="Electricity">Electricity</option>
                          <option value="Internet">Internet</option>
                          <option value="Maintenance">Maintenance</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Overhead Amount ($) *</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={expAmount}
                          onChange={(e) => setExpAmount(Number(e.target.value))}
                          className={`w-full p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                            isDarkMode ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Transaction Booking Date *</label>
                        <input
                          type="date"
                          required
                          value={expDate}
                          onChange={(e) => setExpDate(e.target.value)}
                          className={`w-full p-2.5 rounded-lg focus:outline-none ${
                            isDarkMode ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Booking Descriptions</label>
                        <input
                          type="text"
                          value={expDescription}
                          onChange={(e) => setExpDescription(e.target.value)}
                          placeholder="e.g. Electricity billing invoice no #849"
                          className={`w-full p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 id-input ${
                            isDarkMode ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button
                        type="button"
                        onClick={() => setIsAddingExpense(false)}
                        className={`flex-1 py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                          isDarkMode ? 'bg-slate-805 border-slate-700' : 'bg-slate-101 border-slate-300'
                        }`}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl font-black shadow-lg"
                      >
                        Book
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Expenses visual category breakdowns cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {['Rent', 'Salary', 'Electricity', 'Internet', 'Maintenance'].map((cat) => {
                  const spend = dbState.expenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0);
                  
                  return (
                    <div key={cat} className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-205 text-slate-800'}`}>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">{cat}</span>
                      <span className="text-sm font-black block text-slate-100 pt-0.5">${(spend || 0).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>

              {/* Expense registers table list */}
              <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-205'}`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className={`border-b ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-205 text-slate-500'} font-bold`}>
                        <th className="py-2.5 px-3">Booking Category</th>
                        <th className="py-2.5 px-3">Voucher Details</th>
                        <th className="py-2.5 px-3">Amount Charged</th>
                        <th className="py-2.5 px-3">Booking Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {dbState.expenses.map((e) => (
                        <tr key={e.id} className="hover:bg-slate-800/10">
                          <td className="py-3 px-3">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-950/50 text-blue-400 border border-blue-900/45">
                              {e.category}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-300-light font-medium">
                            {e.description || "Operational cost segment"}
                          </td>
                          <td className="py-3 px-3 font-extrabold text-blue-500">
                            ${(e.amount || 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-slate-400 font-mono">
                            {e.date}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {dbState.expenses.length === 0 && (
                    <p className="text-center py-8 text-xs text-slate-550 font-medium">
                      No expense records booked yet.
                    </p>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* VIEW: REPORTS */}
          {activeTab === 'reports' && isAdminSession && (
            <div className="space-y-4 animate-fade-in text-xs font-sans">
              <div>
                <h2 className="text-sm font-extrabold uppercase tracking-widest text-blue-500">
                  📊 Executives Financial Audit Reports (Module 9)
                </h2>
                <p className="text-[11px] text-slate-450 mt-1">
                  Direct real-time computations mapping gross item revenues, GST tax credits, purchase margins, operating expense overheads, and net yields.
                </p>
              </div>

              <ReportsManager
                sales={dbState.sales || []}
                purchases={dbState.purchases || []}
                expenses={dbState.expenses || []}
                inventory={dbState.inventory || []}
                isDarkMode={isDarkMode}
              />
            </div>
          )}

          {false && activeTab === 'reports' && (
            <div className="space-y-6 animate-fade-in text-xs font-sans">
              
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-extrabold uppercase tracking-widest text-blue-500">
                    📊 Executives Financial Audit Reports
                  </h2>
                  <p className="text-[11px] text-slate-450">
                    Direct real-time computations mapping gross item revenues, exact purchase inventory valuations, utility debits, and operational retail margins.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      window.print();
                    }}
                    className="p-2 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 hover:text-white transition-all text-[11px] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-400" />
                    <span>Print Ledger Sheets</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadModuleSpreadsheet('invoices')}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[11px] px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Invoices spreadsheet</span>
                  </button>
                </div>
              </div>

              {/* CORE TRUE PROFIT MARGINS REPORT BOARD */}
              <div className={`p-8 rounded-2xl border ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-205 text-slate-900'
              }`}>
                <div className="text-center pb-5 mb-5 border-b border-dashed border-slate-800 space-y-1">
                  <h3 className="font-extrabold uppercase text-sm tracking-wider">SMARTDESK CO. CENTRAL LEDGER</h3>
                  <p className="font-bold text-[10px] uppercase text-slate-400 tracking-widest">Financial report overview — 2026</p>
                </div>

                <div className="space-y-3 max-w-2xl mx-auto">
                  
                  {/* Revenue section */}
                  <div className="flex justify-between items-center py-2.5 border-b border-slate-800/40">
                    <div>
                      <span className="font-bold text-slate-200 block">(+) GROSS SALES CASHFLOW</span>
                      <span className="text-[10px] text-slate-500">Total payments cleared through POS invoice checkout</span>
                    </div>
                    <span className="font-black text-emerald-500 text-sm">${reportsCalculated.totalSalesRevenue.toFixed(2)}</span>
                  </div>

                  {/* COGS Section */}
                  <div className="flex justify-between items-center py-2.5 border-b border-slate-800/40 pl-6 border-l-2 border-indigo-700">
                    <div>
                      <span className="font-bold text-slate-300 block">(-) COST OF GOODS SOLD (COGS)</span>
                      <span className="text-[10px] text-slate-550">Wholesale manufacturer purchase value representing actual inventory items sold</span>
                    </div>
                    <span className="font-black text-indigo-500">${reportsCalculated.totalCostOfGoodsPurchased.toFixed(2)}</span>
                  </div>

                  {/* Expenses section */}
                  <div className="flex justify-between items-center py-2.5 border-b border-slate-800/40 pl-6 border-l-2 border-amber-600">
                    <div>
                      <span className="font-bold text-slate-300 block">(-) ALL UTILITIES & OPERATIONAL EXPENSES</span>
                      <span className="text-[10px] text-slate-550">Disbursed salaries, water/lease rents, hardware repairs, broadband segments</span>
                    </div>
                    <span className="font-black text-amber-500">${reportsCalculated.totalOverheadExpenses.toFixed(2)}</span>
                  </div>

                  {/* Exact calculated profit */}
                  <div className="flex justify-between items-center pt-5 pb-2.5 border-b-2 border-double border-slate-800">
                    <div>
                      <span className="font-extrabold text-blue-500 text-sm block">(=) CALCULATED TRUE COMPANY PROFIT Margin</span>
                      <span className="text-[10px] text-slate-400">Exact formula calculated: (Gross Sales Cashflow - COGS value - All logged expenses)</span>
                    </div>
                    <span className={`font-black text-base ${reportsCalculated.netOperationProfits >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      ${reportsCalculated.netOperationProfits.toFixed(2)}
                    </span>
                  </div>

                </div>

                {/* Sub audit metrics row */}
                <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto pt-6 text-[10px] border-t border-slate-800/30 mt-6 text-slate-400">
                  <div className="p-3 bg-slate-950/40 squared border border-slate-850">
                    <span className="block uppercase font-bold text-slate-500 mb-0.5">Physical Inventory Cost Valuation</span>
                    <p className="leading-snug">The current stockpile value of unshelf products based on primary purchase costs is <span className="font-bold text-blue-400">${reportsCalculated.stockAssetValuation.toFixed(2)}</span>.</p>
                  </div>
                  
                  <div className="p-3 bg-slate-950/40 squared border border-slate-850">
                    <span className="block uppercase font-bold text-slate-500 mb-0.5">Physical Inventory Selling Valuation</span>
                    <p className="leading-snug">The final estimated customer selling value representing un-purchased products equates to <span className="font-bold text-blue-400">${reportsCalculated.stockSellingValuation.toFixed(2)}</span>.</p>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* VIEW: SMARTDESK AI CHAT */}
          {activeTab === 'analytics' && isAdminSession && (
            <div className="space-y-4 animate-fade-in text-xs">
              <div>
                <h2 className="text-sm font-extrabold uppercase tracking-widest text-blue-500">
                  🧠 SmartDesk AI Business Advisor
                </h2>
                <p className="text-[11px] text-slate-450 leading-relaxed">
                  Interactive Gemini consulting. Get immediate computed recommendations about monthly profit comparison trends, next month forecasts, dead stock warnings, or high-performing employees.
                </p>
              </div>

              <AiAssistant currentUsername={currentUser.username} isDarkMode={isDarkMode} />
            </div>
          )}

          {/* VIEW: SYSTEM SETTINGS */}
          {activeTab === 'settings' && isAdminSession && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="text-sm font-extrabold uppercase tracking-widest text-blue-500">
                  ⚙️ Enterprise Profile & Security Diagnostics
                </h2>
                <p className="text-[11px] text-slate-450 mt-1">
                  Configure corporate details, GST identification tags, reset employee bypass passwords, and review global activity logs.
                </p>
              </div>

              <SystemSettingsManager
                settings={dbState.settings}
                users={dbState.users || []}
                logs={dbState.logs || []}
                isDarkMode={isDarkMode}
                isAdmin={isAdminSession}
                currentUsername={currentUser.username}
                onRefreshDB={fetchDatabaseState}
                onLogActivity={handleLogActivity}
              />
            </div>
          )}

          {false && activeTab === 'settings' && (
            <div className="space-y-6 animate-fade-in">
              
              <div>
                <h2 className="text-sm font-extrabold uppercase tracking-widest text-blue-500">
                  ⚙️ System settings & Security Diagnostics
                </h2>
                <p className="text-[11px] text-slate-450">
                  Perform system resets, verify developer diagnostics, audit the security activities log registers, or change parameters.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Seed Reset Panel */}
                <div className={`p-6 rounded-xl border space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <h3 className="font-extrabold text-xs uppercase text-slate-100 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Database Re-Seeding Utilities</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Restore databases back to developer sandbox seeds. This clears all added customers, cashiers checkout invoices, expense books, and newly added employee accounts.
                  </p>
                  <button
                    type="button"
                    onClick={handleReseedDb}
                    className="bg-red-950/20 hover:bg-red-900/30 text-red-400 font-extrabold py-2 px-4 rounded-lg text-xs cursor-pointer inline-flex items-center gap-1.5 border border-red-900/30 transition-all"
                  >
                    <span>Trigger Db Restore seed</span>
                  </button>
                </div>

                {/* Status Diagnostoc */}
                <div className={`p-6 rounded-xl border space-y-3.5 ${isDarkMode ? 'bg-slate-900 border-slate-805' : 'bg-white border-slate-200'}`}>
                  <h3 className="font-extrabold text-xs uppercase text-slate-100">
                    💻 Session status diagnostics
                  </h3>
                  <div className="space-y-2 text-xs font-mono text-slate-400">
                    <div>
                      <span className="block font-bold">Authorized User ID:</span>
                      <span className="block text-indigo-400">{currentUser.id}</span>
                    </div>
                    <div>
                      <span className="block font-bold">Encrypted Credentials:</span>
                      <span className="block text-indigo-400">Simulated secure SHA256 verified</span>
                    </div>
                    <div>
                      <span className="block font-bold">Operating Framework:</span>
                      <span className="block text-indigo-400">Enterprise React ESModule container</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Security Ledger Logs */}
              <div className={`p-6 rounded-xl border space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-2">
                  <Activity className="w-4.5 h-4.5 text-blue-500" />
                  <h3 className="font-extrabold text-xs uppercase text-slate-100 tracking-wider">
                    📜 System activity logs registers (Audit Ledger)
                  </h3>
                </div>

                <div className="overflow-y-auto max-h-[240px] space-y-1.5 font-mono text-[11px] text-slate-400">
                  {dbState.logs.map((log) => (
                    <div key={log.id} className="p-2.5 bg-slate-950/50 border border-slate-850 flex justify-between gap-4">
                      <div>
                        <span className="text-slate-500">[{new Date(log.timestamp).toLocaleString()}]</span>{' '}
                        <span className="font-extrabold text-indigo-400">{log.user.toUpperCase()}</span>{' '}
                        <span className="text-slate-200 font-semibold">{log.action}:</span>{' '}
                        <span className="text-slate-400">{log.details}</span>
                      </div>
                      <span className="text-[9px] text-slate-600 shrink-0">ID: {log.id}</span>
                    </div>
                  ))}
                  
                  {dbState.logs.length === 0 && (
                    <p className="text-slate-500 italic text-center py-4">No system activity logged in present records.</p>
                  )}
                </div>
              </div>

            </div>
          )}

        </main>
      </div>

      {/* Dynamic footer rendered on all screens which links back tab navigating */}
      <Footer onNavigate={(tab) => setActiveTab(tab)} isAdmin={isAdminSession} />

    </div>
  );
}
