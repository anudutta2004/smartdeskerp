import React, { useState } from 'react';
import { 
  RotateCcw, Search, Calendar, User, ShoppingBag, ArrowLeftRight, CheckCircle, 
  AlertTriangle, ShieldAlert, Trash2, FileText, BarChart3, Clock, Check, X, Tag
} from 'lucide-react';
import { ReturnRecord, ReplacementRecord, InventoryProduct, SalesInvoice } from '../../types';

interface ReturnsReplacementsManagerProps {
  sales: SalesInvoice[];
  inventory: InventoryProduct[];
  returns: ReturnRecord[];
  replacements: ReplacementRecord[];
  currentUser: { username: string; role: string; name: string };
  isDarkMode: boolean;
  onRefreshDB: () => void;
}

export default function ReturnsReplacementsManager({
  sales = [],
  inventory = [],
  returns = [],
  replacements = [],
  currentUser,
  isDarkMode,
  onRefreshDB
}: ReturnsReplacementsManagerProps) {
  const [activeSubTab, setActiveSubTab] = useState<'create_return' | 'create_replace' | 'history' | 'tracking' | 'reports'>('create_return');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Return Form State
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [returnQuantity, setReturnQuantity] = useState<number>(1);
  const [returnReason, setReturnReason] = useState<string>('Defective Product');
  const [actionChosen, setActionChosen] = useState<string>('Refund');

  // Replacement Form State
  const [replaceInvoiceQuery, setReplaceInvoiceQuery] = useState('');
  const [replaceInvoice, setReplaceInvoice] = useState<SalesInvoice | null>(null);
  const [replaceOldProductId, setReplaceOldProductId] = useState('');
  const [replaceOldQty, setReplaceOldQty] = useState<number>(1);
  const [replaceNewProductId, setReplaceNewProductId] = useState('');
  const [replaceNewQty, setReplaceNewQty] = useState<number>(1);

  // Customer Tracking Search
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  const isAdmin = currentUser.role === 'Admin';

  const clearMessages = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  // 1. Process invoice searches
  const handleSearchInvoice = (type: 'return' | 'replace') => {
    clearMessages();
    const query = type === 'return' ? invoiceSearchQuery.trim() : replaceInvoiceQuery.trim();
    if (!query) {
      setErrorMsg('Please enter an invoice number to search.');
      return;
    }

    const found = sales.find(s => 
      s.invoiceNumber.toLowerCase() === query.toLowerCase() ||
      s.id === query
    );

    if (!found) {
      setErrorMsg(`Invoice "${query}" not found in sales registers.`);
      if (type === 'return') setSelectedInvoice(null);
      else setReplaceInvoice(null);
      return;
    }

    if (type === 'return') {
      setSelectedInvoice(found);
      if (found.items.length > 0) {
        setSelectedProductId(found.items[0].productId);
        setReturnQuantity(1);
      }
    } else {
      setReplaceInvoice(found);
      if (found.items.length > 0) {
        setReplaceOldProductId(found.items[0].productId);
        setReplaceOldQty(1);
      }
      if (inventory.length > 0) {
        setReplaceNewProductId(inventory[0].id);
        setReplaceNewQty(1);
      }
    }
    setSuccessMsg(`Invoice ${found.invoiceNumber} successfully loaded!`);
  };

  // 2. Submit Return Request
  const handleCreateReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!selectedInvoice || !selectedProductId) {
      setErrorMsg('Please load and select an invoice product first.');
      return;
    }

    const item = selectedInvoice.items.find(i => i.productId === selectedProductId);
    if (!item) {
      setErrorMsg('Selected item not found on invoice.');
      return;
    }

    if (returnQuantity <= 0 || returnQuantity > item.quantity) {
      setErrorMsg(`Invalid return quantity. Maximum allowed is ${item.quantity}.`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/returns/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: selectedInvoice.id,
          productId: selectedProductId,
          quantity: returnQuantity,
          returnReason,
          actionChosen,
          createdBy: currentUser.username
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Server rejected returned product submission.');
      }

      setSuccessMsg(`Return record successfully created! Reference: ${data.returnRecord.returnNumber}. Status: ${data.returnRecord.status}`);
      onRefreshDB();
      // Reset form
      setSelectedInvoice(null);
      setInvoiceSearchQuery('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error executing returns API.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Submit Replacement Request
  const handleCreateReplacement = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!replaceInvoice || !replaceOldProductId || !replaceNewProductId) {
      setErrorMsg('Load invoice and map product pairs to generate a replacement log.');
      return;
    }

    const oldItem = replaceInvoice.items.find(i => i.productId === replaceOldProductId);
    if (!oldItem) {
      setErrorMsg('Original item not found on invoice.');
      return;
    }

    if (replaceOldQty <= 0 || replaceOldQty > oldItem.quantity) {
      setErrorMsg(`Invalid old quantity to replace. Maximum sold on invoice is ${oldItem.quantity}.`);
      return;
    }

    const newProd = inventory.find(p => p.id === replaceNewProductId);
    if (!newProd) {
      setErrorMsg('Target replacement product not found in catalog.');
      return;
    }

    if (newProd.quantity < replaceNewQty) {
      setErrorMsg(`Insufficient stock: '${newProd.name}' has only ${newProd.quantity} available.`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/replacements/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: replaceInvoice.id,
          oldProductId: replaceOldProductId,
          oldProductQuantity: replaceOldQty,
          newProductId: replaceNewProductId,
          newProductQuantity: replaceNewQty,
          createdBy: currentUser.username
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Server rejected replacement issuance.');
      }

      setSuccessMsg(`Replacement order successfully filed! Reference: ${data.replacementRecord.replacementNumber}.`);
      onRefreshDB();
      // Reset
      setReplaceInvoice(null);
      setReplaceInvoiceQuery('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred during replacement API submission.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Approve Return Refund (Admins only)
  const handleApproveReturn = async (returnId: string, action: 'Approved' | 'Rejected') => {
    clearMessages();
    setLoading(true);
    try {
      const res = await fetch('/api/returns/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnId,
          action,
          username: currentUser.username
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Approval API failed.');
      }

      setSuccessMsg(`Refund request successfully ${action.toLowerCase()}!`);
      onRefreshDB();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to approve return refund.');
    } finally {
      setLoading(false);
    }
  };

  // 5. Delete Return Record (Admins only)
  const handleDeleteReturn = async (returnId: string) => {
    if (!window.confirm('Are you strictly sure you want to permanently delete this return record? This cannot be undone.')) {
      return;
    }
    clearMessages();
    setLoading(true);
    try {
      const res = await fetch('/api/returns/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnId,
          username: currentUser.username
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Delete API failed.');
      }

      setSuccessMsg('Successfully purged return record logs from databases.');
      onRefreshDB();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to purge return record.');
    } finally {
      setLoading(false);
    }
  };

  // Metrics for Reports
  const todayStr = new Date().toISOString().split('T')[0];
  const thisMonthStr = todayStr.substring(0, 7); // YYYY-MM

  const dailyReturns = returns.filter(r => r.createdAt.startsWith(todayStr));
  const monthlyReturns = returns.filter(r => r.createdAt.substring(0, 7) === thisMonthStr);

  const dailyRefundValue = dailyReturns.reduce((sum, r) => r.status === 'Approved' ? sum + r.totalRefundAmount : sum, 0);
  const monthlyRefundValue = monthlyReturns.reduce((sum, r) => r.status === 'Approved' ? sum + r.totalRefundAmount : sum, 0);

  // Group returns by reason
  const reasonsFreq: Record<string, number> = {};
  returns.forEach(r => {
    reasonsFreq[r.returnReason] = (reasonsFreq[r.returnReason] || 0) + 1;
  });

  // Track customer aggregate returns
  const customerReturnsAggregate: Record<string, { name: string; mobile: string; count: number; value: number }> = {};
  returns.forEach(r => {
    const custKey = r.customerId || r.customerName;
    if (!customerReturnsAggregate[custKey]) {
      customerReturnsAggregate[custKey] = {
        name: r.customerName,
        mobile: r.customerMobile || 'Walk-in',
        count: 0,
        value: 0
      };
    }
    customerReturnsAggregate[custKey].count += 1;
    customerReturnsAggregate[custKey].value += r.totalRefundAmount;
  });

  const filteredCustomerTracking = Object.values(customerReturnsAggregate).filter(c => 
    c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    c.mobile.includes(customerSearchQuery)
  );

  return (
    <div className={`p-6 rounded-2xl border transition-all ${
      isDarkMode 
        ? 'bg-slate-950 border-slate-800 text-slate-100' 
        : 'bg-white border-slate-200 text-slate-800'
    }`} id="returns-replacements-module">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-dashed border-slate-700/50 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-orange-600 text-white">
            <RotateCcw className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Returns & Replacements Registry</h1>
            <p className="text-xs text-slate-400">Manage customer returns, execute item stock replacements, and track resellable vs. damaged stock flows.</p>
          </div>
        </div>

        {/* User Role Quick Signifier */}
        <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full font-bold self-start md:self-auto ${
          isAdmin ? 'bg-red-950/50 text-red-400 border border-red-900/40' : 'bg-blue-950/50 text-blue-400 border border-blue-900/40'
        }`}>
          {isAdmin ? <Clock className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5 text-blue-400" />}
          <span>System Role: {currentUser.role} ({currentUser.name})</span>
        </div>
      </div>

      {/* Global Alerts */}
      {errorMsg && (
        <div className="mb-4 p-4 rounded-lg bg-red-950/40 text-red-400 border border-red-800/40 text-xs flex items-center gap-3" id="returns-error-alert">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="mb-4 p-4 rounded-lg bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 text-xs flex items-center gap-3" id="returns-success-alert">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Primary Sub-Tabs Navigation */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-800 pb-3" id="returns-tab-navigation">
        <button
          onClick={() => { setActiveSubTab('create_return'); clearMessages(); }}
          className={`flex items-center gap-1.5 text-xs font-bold py-2 px-3.5 rounded-lg transition-all ${
            activeSubTab === 'create_return'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'hover:bg-slate-850 text-slate-400 hover:text-white'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Product Return</span>
        </button>

        <button
          onClick={() => { setActiveSubTab('create_replace'); clearMessages(); }}
          className={`flex items-center gap-1.5 text-xs font-bold py-2 px-3.5 rounded-lg transition-all ${
            activeSubTab === 'create_replace'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'hover:bg-slate-850 text-slate-400 hover:text-white'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          <span>Product Replacement</span>
        </button>

        <button
          onClick={() => { setActiveSubTab('history'); clearMessages(); }}
          className={`flex items-center gap-1.5 text-xs font-bold py-2 px-3.5 rounded-lg transition-all ${
            activeSubTab === 'history'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'hover:bg-slate-850 text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Return & Replace History</span>
        </button>

        <button
          onClick={() => { setActiveSubTab('tracking'); clearMessages(); }}
          className={`flex items-center gap-1.5 text-xs font-bold py-2 px-3.5 rounded-lg transition-all ${
            activeSubTab === 'tracking'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'hover:bg-slate-850 text-slate-400 hover:text-white'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Customer Return Tracking</span>
        </button>

        <button
          onClick={() => { setActiveSubTab('reports'); clearMessages(); }}
          className={`flex items-center gap-1.5 text-xs font-bold py-2 px-3.5 rounded-lg transition-all ${
            activeSubTab === 'reports'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'hover:bg-slate-850 text-slate-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Returns Reports & Analysis</span>
        </button>
      </div>

      {/* CORE WORKFLOWS */}

      {/* 1. PRODUCT RETURN ACTION */}
      {activeSubTab === 'create_return' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="returns-step1-pane">
          
          {/* Left panel: Load Invoice */}
          <div className="lg:col-span-5 p-5 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-col gap-4">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Search className="w-4 h-4 text-orange-500" />
              <span>Step 1: Search POS Invoice</span>
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. INV-2026-003"
                value={invoiceSearchQuery}
                onChange={e => setInvoiceSearchQuery(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
              />
              <button
                type="button"
                onClick={() => handleSearchInvoice('return')}
                className="bg-slate-800 hover:bg-slate-700 px-4 rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                Search
              </button>
            </div>

            {selectedInvoice ? (
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 flex flex-col gap-2 text-xs">
                <div className="flex justify-between font-bold border-b border-slate-800 pb-2 text-orange-400">
                  <span>{selectedInvoice.invoiceNumber}</span>
                  <span>₹ {(selectedInvoice.totalAmount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between mt-1 text-slate-400">
                  <span>Customer:</span>
                  <span className="font-semibold text-white">{selectedInvoice.customerName}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Date Issued:</span>
                  <span>{new Date(selectedInvoice.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Operator:</span>
                  <span className="capitalize">{selectedInvoice.createdBy}</span>
                </div>

                <div className="mt-3 font-semibold text-slate-300">Invoice Items purchased:</div>
                <div className="max-h-40 overflow-y-auto divide-y divide-slate-850 pr-1">
                  {selectedInvoice.items.map((it, idx) => (
                    <div 
                      key={it.productId + idx} 
                      className={`py-2 flex items-center justify-between cursor-pointer rounded px-1.5 transition-colors ${
                        selectedProductId === it.productId ? 'bg-orange-950/20 text-orange-400' : 'hover:bg-slate-900'
                      }`}
                      onClick={() => {
                        setSelectedProductId(it.productId);
                        setReturnQuantity(1);
                      }}
                    >
                      <div>
                        <div className="font-bold">{it.name}</div>
                        <div className="text-[10px] text-slate-400">Qty: {it.quantity} × ₹ {it.price}</div>
                      </div>
                      <div className="font-bold">₹ {it.total}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-slate-400 bg-slate-950/20 rounded-lg border border-slate-800/50">
                <FileText className="w-10 h-10 text-slate-600 mb-2" />
                <span className="text-xs">Provide a validated invoice code to load active receipt parameters.</span>
              </div>
            )}
          </div>

          {/* Right panel: Return Specification */}
          <div className="lg:col-span-7 p-5 rounded-xl bg-slate-900/40 border border-slate-800">
            <h2 className="text-sm font-bold flex items-center gap-2 mb-4">
              <RotateCcw className="w-4 h-4 text-orange-400 animate-spin-slow" />
              <span>Step 2: Return & Credit Configuration</span>
            </h2>

            {selectedInvoice && selectedProductId ? (
              <form onSubmit={handleCreateReturn} className="flex flex-col gap-4">
                {/* Product Name Display */}
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Selected Product Line:</div>
                  <div className="text-sm font-black text-orange-400 mt-1">
                    {selectedInvoice.items.find(i => i.productId === selectedProductId)?.name || 'Unknown item'}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Quantity */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Return Quantity:</label>
                    <input
                      type="number"
                      min={1}
                      max={selectedInvoice.items.find(i => i.productId === selectedProductId)?.quantity || 1}
                      value={returnQuantity}
                      onChange={e => setReturnQuantity(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-bold"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Max sold is {selectedInvoice.items.find(i => i.productId === selectedProductId)?.quantity || 0} unit(s).
                    </p>
                  </div>

                  {/* Return Reason */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Return Reason:</label>
                    <select
                      value={returnReason}
                      onChange={e => setReturnReason(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-bold"
                    >
                      <option value="Defective Product">Defective Product (moves to Damaged category)</option>
                      <option value="Damaged Product">Damaged Product (moves to Damaged category)</option>
                      <option value="Expired Product">Expired Product (moves to Damaged category)</option>
                      <option value="Wrong Product Delivered">Wrong Product Delivered (resellable stock increases)</option>
                      <option value="Customer Changed Mind">Customer Changed Mind (resellable stock increases)</option>
                      <option value="Other">Other (assumed damaged stock category)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
                  {/* Action chosen */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Return Action:</label>
                    <select
                      value={actionChosen}
                      onChange={e => setActionChosen(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-3 text-xs text-white focus:outline-none focus:border-orange-500 font-black"
                    >
                      <option value="Refund">Refund (Back to cash/card channel)</option>
                      <option value="Replacement">Replacement item credit</option>
                      <option value="Store Credit">Store Credit voucher</option>
                    </select>
                  </div>

                  {/* Refund estimation logic */}
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Refund/Credit:</span>
                      <span className="text-xl font-extrabold text-white">
                        ₹ {(((selectedInvoice.items.find(i => i.productId === selectedProductId)?.price || 0) * returnQuantity) || 0).toFixed(2)}
                      </span>
                    </div>

                    {/* Permissions indicator */}
                    <div className="mt-1">
                      {((selectedInvoice.items.find(i => i.productId === selectedProductId)?.price || 0) * returnQuantity) > 2000 && !isAdmin ? (
                        <span className="text-[9px] text-yellow-500 flex items-center gap-1 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Requires Admin Approval (Large Refund &gt; ₹2,000)</span>
                        </span>
                      ) : (
                        <span className="text-[9px] text-emerald-500 flex items-center gap-1 font-bold">
                          <Check className="w-3.5 h-3.5" />
                          <span>Within standard approval limit</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submit Return */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition-transform transform active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Executing Return Operations...' : 'Save Return & Update Inventories'}
                </button>
              </form>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 bg-slate-950/20 border border-dashed border-slate-800 rounded-lg">
                <ArrowLeftRight className="w-12 h-12 text-slate-700 mb-2" />
                <span className="text-xs max-w-sm">Load a reference receipt in Step 1 to populate quantities and trigger the credit engines.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. PRODUCT REPLACEMENT ACTION */}
      {activeSubTab === 'create_replace' && (
        <form onSubmit={handleCreateReplacement} className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="replacements-pane">
          
          {/* Load Invoice */}
          <div className="lg:col-span-4 p-5 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-col gap-4">
            <h2 className="text-sm font-bold flex items-center gap-2 text-slate-200">
              <Search className="w-4 h-4 text-orange-500" />
              <span>Step 1: Original Invoice</span>
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. SD-INV-001"
                value={replaceInvoiceQuery}
                onChange={e => setReplaceInvoiceQuery(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
              />
              <button
                type="button"
                onClick={() => handleSearchInvoice('replace')}
                className="bg-slate-800 hover:bg-slate-700 px-4 rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                Search
              </button>
            </div>

            {replaceInvoice ? (
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 flex flex-col gap-2 text-xs">
                <div className="flex justify-between font-bold border-b border-slate-800 pb-2 text-orange-400">
                  <span>{replaceInvoice.invoiceNumber}</span>
                  <span>₹ {(replaceInvoice.totalAmount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between mt-1 text-slate-400">
                  <span>Customer Name:</span>
                  <span className="font-semibold text-white">{replaceInvoice.customerName}</span>
                </div>

                <div className="mt-3 font-semibold text-slate-300">Select Item to Replace:</div>
                <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                  {replaceInvoice.items.map((it, idx) => (
                    <label 
                      key={it.productId + idx}
                      className={`p-2 rounded border cursor-pointer flex items-center justify-between text-[11px] ${
                        replaceOldProductId === it.productId
                          ? 'border-orange-600 bg-orange-950/25 text-orange-400'
                          : 'border-slate-800 bg-slate-950/50 text-slate-300 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="old-product-select"
                          checked={replaceOldProductId === it.productId}
                          onChange={() => {
                            setReplaceOldProductId(it.productId);
                            setReplaceOldQty(1);
                          }}
                          className="text-orange-500 focus:ring-orange-500"
                        />
                        <span>{it.name}</span>
                      </div>
                      <span className="font-extrabold pr-1">Qty: {it.quantity}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-slate-400 bg-slate-950/20 rounded-lg border border-slate-800/50">
                <ShoppingBag className="w-10 h-10 text-slate-600 mb-2" />
                <span className="text-xs text-slate-500">Search for the original sales invoice to start replacement.</span>
              </div>
            )}
          </div>

          {/* Pair mapping / new item selecting */}
          <div className="lg:col-span-8 p-5 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-col gap-4">
            <h2 className="text-sm font-bold flex items-center gap-2 text-slate-200">
              <ArrowLeftRight className="w-4 h-4 text-orange-400" />
              <span>Step 2: Map Replacement Selection</span>
            </h2>

            {replaceInvoice && replaceOldProductId ? (
              <div className="flex flex-col gap-4">
                
                {/* Quantities mapping */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Old product return amount */}
                  <div className="p-4 rounded-lg bg-amber-950/15 border border-amber-900/30 text-xs shadow-sm">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Old Product Refund Credit:</span>
                    <div className="text-sm font-bold text-amber-400 mb-3">
                      {replaceInvoice.items.find(i => i.productId === replaceOldProductId)?.name}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Replacing Qty:</span>
                      <input
                        type="number"
                        min={1}
                        max={replaceInvoice.items.find(i => i.productId === replaceOldProductId)?.quantity || 1}
                        value={replaceOldQty}
                        onChange={e => setReplaceOldQty(Math.max(1, Number(e.target.value)))}
                        className="w-16 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-center font-extrabold text-white"
                      />
                    </div>
                    <div className="mt-3 text-right">
                      <span className="text-slate-400 mr-2 text-[11px]">Subtotal Credit:</span>
                      <span className="font-extrabold text-white text-base">
                        ₹ {(((replaceInvoice.items.find(i => i.productId === replaceOldProductId)?.price || 0) * replaceOldQty) || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* New selection dropdown */}
                  <div className="p-4 rounded-lg bg-blue-950/15 border border-blue-900/30 text-xs shadow-sm">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">New Replacement Product:</span>
                    <select
                      value={replaceNewProductId}
                      onChange={e => setReplaceNewProductId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-bold mb-3"
                    >
                      {inventory.map(prod => (
                        <option key={prod.id} value={prod.id}>
                          {prod.name} (SKU: {prod.sku} | ₹ {prod.sellingPrice} | Qty: {prod.quantity})
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Issuing Qty:</span>
                      <input
                        type="number"
                        min={1}
                        value={replaceNewQty}
                        onChange={e => setReplaceNewQty(Math.max(1, Number(e.target.value)))}
                        className="w-16 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-center font-extrabold text-white"
                      />
                    </div>
                    <div className="mt-3 text-right">
                      <span className="text-slate-400 mr-2 text-[11px]">Subtotal Cost:</span>
                      <span className="font-extrabold text-white text-base">
                        ₹ {(((inventory.find(p => p.id === replaceNewProductId)?.sellingPrice || 0) * replaceNewQty) || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Balance & Price Difference calculation */}
                <div className="p-4 rounded-lg bg-slate-950 border border-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                  <div>
                    <h3 className="font-black text-slate-200">Replacement Accounting Invoice Summary</h3>
                    <p className="text-slate-400 text-[10px] mt-0.5">Calculated as: (New Selection Value) - (Old Return Value)</p>
                  </div>

                  {(() => {
                    const oldVal = (replaceInvoice.items.find(i => i.productId === replaceOldProductId)?.price || 0) * replaceOldQty;
                    const newVal = (inventory.find(p => p.id === replaceNewProductId)?.sellingPrice || 0) * replaceNewQty;
                    const diff = newVal - oldVal;

                    return (
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Pricing Differential:</span>
                        {diff > 0 ? (
                          <span className="text-lg font-black text-red-400">
                            Collect ₹ {(diff || 0).toFixed(2)} from Customer
                          </span>
                        ) : diff < 0 ? (
                          <span className="text-lg font-black text-emerald-400">
                            Refund / Store Credit ₹ {(Math.abs(diff) || 0).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-lg font-black text-white">
                            Even Exchange (₹ 0.00)
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Dispatch replacement */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition-transform transform active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Issuing Replacement Order...' : 'Generate Replacement Record & Update Stock Counts'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 border border-slate-800 rounded-lg">
                <ArrowLeftRight className="w-12 h-12 text-slate-700 mb-2" />
                <span className="text-xs">Select active invoice parameters on the left to activate replacement mappings.</span>
              </div>
            )}
          </div>
        </form>
      )}

      {/* 3. RETURN & REPLACE LOGS VIEW */}
      {activeSubTab === 'history' && (
        <div className="flex flex-col gap-6" id="history-pane">
          
          {/* Returns Table */}
          <div className="p-5 rounded-xl bg-slate-900/30 border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-orange-500" />
                <span>Customer Return Requests Queue</span>
              </h2>
              <span className="text-xs bg-slate-800 text-slate-300 font-bold px-2 py-1 rounded">
                Total Returns Logged: {returns.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-800">
                <thead>
                  <tr className="text-slate-400 font-extrabold bg-slate-950/40">
                    <th className="py-2.5 px-3">Reference / Date</th>
                    <th className="py-2.5 px-3">Original Invoice</th>
                    <th className="py-2.5 px-3">Customer Code</th>
                    <th className="py-2.5 px-3">Returned Item & Qty</th>
                    <th className="py-2.5 px-3">Reason / Action</th>
                    <th className="py-2.5 px-3">Amount Refund</th>
                    <th className="py-2.5 px-3 text-center">Receipt Status</th>
                    <th className="py-2.5 px-3 text-right">System Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {returns.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-500 text-xs">
                        No return records registered in ERP databases.
                      </td>
                    </tr>
                  ) : (
                    returns.map(record => (
                      <tr key={record.id} className="hover:bg-slate-950/40 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-extrabold text-white text-[11px]">{record.returnNumber}</div>
                          <div className="text-[9px] text-slate-500 mt-0.5">
                            {new Date(record.createdAt).toLocaleString()}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-300">
                          {record.invoiceNumber}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-200">{record.customerName}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{record.customerMobile || 'Walk-In'}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-orange-400">{record.productName}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Qty returned: <strong className="text-white">{record.quantity}</strong></div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-slate-300 font-semibold">{record.returnReason}</div>
                          <div className="text-[9px] text-slate-400 mt-0.5 bg-slate-850 px-1 py-0.5 rounded inline-block font-bold">
                            {record.actionChosen}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-extrabold text-white">
                          ₹ {(record.totalRefundAmount || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-1 rounded text-[9px] font-black tracking-wide ${
                            record.status === 'Approved' 
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/30'
                              : record.status === 'Rejected'
                                ? 'bg-red-950 text-red-400 border border-red-900/30'
                                : 'bg-yellow-950 text-yellow-500 border border-yellow-900/30 animate-pulse'
                          }`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            {record.status === 'Pending Approval' && (
                              <>
                                {isAdmin ? (
                                  <>
                                    <button
                                      onClick={() => handleApproveReturn(record.id, 'Approved')}
                                      className="p-1 text-emerald-400 hover:bg-emerald-950/50 rounded transition-colors"
                                      title="Approve Refund"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleApproveReturn(record.id, 'Rejected')}
                                      className="p-1 text-red-400 hover:bg-red-950/50 rounded transition-colors"
                                      title="Reject Refund"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-[9px] text-slate-500 font-bold" title="Employees cannot approve large refunds.">
                                    Pending Admin
                                  </span>
                                )}
                              </>
                            )}

                            {isAdmin ? (
                              <button
                                onClick={() => handleDeleteReturn(record.id)}
                                className="p-1 text-red-500 hover:bg-red-950/40 rounded transition-colors"
                                title="Delete Record permanently"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-600 block pr-2" title="Permission blocked: employee cannot delete.">
                                Blocked
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Replacements Table */}
          <div className="p-5 rounded-xl bg-slate-900/30 border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-orange-500 animate-spin-slow" />
                <span>Product Replacement History</span>
              </h2>
              <span className="text-xs bg-slate-800 text-slate-300 font-bold px-2 py-1 rounded">
                Total Replacements: {replacements.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-800">
                <thead>
                  <tr className="text-slate-400 font-extrabold bg-slate-950/40">
                    <th className="py-2.5 px-3">Replacement Number</th>
                    <th className="py-2.5 px-3">Reference Invoice</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Returned Product Line</th>
                    <th className="py-2.5 px-3">Replacement Issued</th>
                    <th className="py-2.5 px-3">Price Difference</th>
                    <th className="py-2.5 px-3">Operator</th>
                    <th className="py-2.5 px-3 text-right">Date Executed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {replacements.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-500 text-xs">
                        No product replacements logged in this period.
                      </td>
                    </tr>
                  ) : (
                    replacements.map(record => (
                      <tr key={record.id} className="hover:bg-slate-950/40 transition-colors">
                        <td className="py-3 px-3">
                          <span className="font-extrabold text-white text-[11px]">{record.replacementNumber || 'REP-ORD'}</span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-300">
                          {record.invoiceNumber}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-200">
                          {record.customerName}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-red-400">{record.oldProductName}</div>
                          <div className="text-[10px] text-slate-450 mt-0.5">Recalled Qty: {record.oldProductQuantity}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-emerald-400">{record.newProductName}</div>
                          <div className="text-[10px] text-slate-450 mt-0.5">Dispatched Qty: {record.newProductQuantity}</div>
                        </td>
                        <td className="py-3 px-3">
                          {record.priceDifference > 0 ? (
                            <span className="font-extrabold text-red-400">₹ +{(record.priceDifference || 0).toFixed(2)} (Debit)</span>
                          ) : record.priceDifference < 0 ? (
                            <span className="font-extrabold text-emerald-400">₹ -{(Math.abs(record.priceDifference) || 0).toFixed(2)} (Voucher)</span>
                          ) : (
                            <span className="text-slate-400">₹ 0.00 (Even swap)</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-400 capitalize">
                          {record.createdBy}
                        </td>
                        <td className="py-3 px-3 text-slate-500 text-right">
                          {new Date(record.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. CUSTOMER RETURN TRACKING */}
      {activeSubTab === 'tracking' && (
        <div className="p-5 rounded-xl bg-slate-900/30 border border-slate-800" id="returns-tracking-pane">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2">
                <User className="w-4 h-4 text-orange-500" />
                <span>Customer Return & Replacement Tracking Indices</span>
              </h2>
              <p className="text-[11px] text-slate-400">Monitor overall purchase return velocities and customer refund histories across your SMB storefront.</p>
            </div>

            <div className="relative w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="Search customers or mobiles..."
                value={customerSearchQuery}
                onChange={e => setCustomerSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCustomerTracking.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-500 text-xs bg-slate-950/20 border border-slate-850 rounded-xl">
                No matching customer return metrics located in databases.
              </div>
            ) : (
              filteredCustomerTracking.map((cust, idx) => (
                <div 
                  key={idx}
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-850 flex flex-col justify-between hover:border-orange-500/50 transition-colors shadow-sm"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-1.5 rounded bg-orange-950/40 text-orange-400">
                        <User className="w-4 h-4" />
                      </div>
                      <span className="font-extrabold text-white text-xs">{cust.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mb-3">Mobile: {cust.mobile}</div>
                  </div>

                  <div className="border-t border-dashed border-slate-850 pt-2.5 flex items-center justify-between text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold text-slate-500">Return Incidence:</span>
                      <span className="font-bold text-white text-xs">{cust.count} event(s)</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[9px] uppercase font-bold text-slate-500">Refund Value:</span>
                      <span className="font-black text-orange-400 text-xs">₹ {(cust.value || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 5. RETURNS & REPLACEMENTS REPORTS */}
      {activeSubTab === 'reports' && (
        <div className="flex flex-col gap-6" id="returns-reports-pane">
          
          {/* Top Widgets Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="p-4 rounded-xl bg-orange-950/10 border border-orange-900/30 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Daily returns incidence</span>
                <div className="text-2xl font-black text-white mt-1">{dailyReturns.length} <span className="text-xs text-slate-400">Request(s)</span></div>
              </div>
              <span className="text-[9px] text-orange-400 font-bold block mt-3">Disbursed Today: ₹ {(dailyRefundValue || 0).toFixed(2)}</span>
            </div>

            <div className="p-4 rounded-xl bg-orange-950/10 border border-orange-900/30 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Monthly returns speed</span>
                <div className="text-2xl font-black text-white mt-1">{monthlyReturns.length} <span className="text-xs text-slate-400">Request(s)</span></div>
              </div>
              <span className="text-[9px] text-orange-400 font-bold block mt-3">Disbursed June: ₹ {(monthlyRefundValue || 0).toFixed(2)}</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Inventory Replacements</span>
                <div className="text-2xl font-black text-white mt-1">{replacements.length} <span className="text-xs text-slate-400">Swaps</span></div>
              </div>
              <span className="text-[9px] text-slate-400 font-semibold block mt-3">Active exchange accounting verified</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Damaged Stock Count</span>
                <div className="text-2xl font-black text-red-400 mt-1">
                  {inventory.filter(p => p.category === 'Damaged Stock').reduce((sum, p) => sum + p.quantity, 0)} <span className="text-xs text-slate-450">Units</span>
                </div>
              </div>
              <span className="text-[9px] text-slate-400 font-semibold block mt-3">Safely segregated in stockpile categorizations</span>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Reasons Analysis chart representation */}
            <div className="lg:col-span-6 p-5 rounded-xl bg-slate-900/40 border border-slate-800">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-slate-200">
                <BarChart3 className="w-4 h-4 text-orange-400" />
                <span>Return Reasons Root Cause Analysis</span>
              </h3>

              {Object.keys(reasonsFreq).length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Provide returned log registries to render dynamic reasons frequency analysis graphs.
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {Object.entries(reasonsFreq).map(([reason, count], idx) => {
                    const pct = (count / returns.length) * 100;
                    return (
                      <div key={idx} className="text-xs">
                        <div className="flex justify-between items-center font-semibold text-slate-300 mb-1">
                          <span>{reason}</span>
                          <span>{count} returned ({(pct || 0).toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
                          <div 
                            className="bg-orange-500 h-full rounded-full" 
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Restock & Segregation Alerts */}
            <div className="lg:col-span-6 p-5 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-col gap-3">
              <h3 className="text-sm font-bold flex items-center gap-2 text-slate-200">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Damaged Stock Quarantine Controls</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-1">
                Standard operating guidelines require defective, damaged, or expired products to reside strictly inside items marked as category <strong className="text-orange-400">"Damaged Stock"</strong>. Resellable returns (Customer Change Mind / Wrong Delivery) are immediately returned back to circulating physical stockpiles under native inventory rules.
              </p>

              <div className="mt-2 divide-y divide-slate-850 max-h-48 overflow-y-auto pr-1 text-xs">
                {inventory.filter(p => p.category === 'Damaged Stock').length === 0 ? (
                  <div className="py-4 text-slate-500 text-center">
                    No damaged stock items quarantined at this time.
                  </div>
                ) : (
                  inventory.filter(p => p.category === 'Damaged Stock').map(p => (
                    <div key={p.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-extrabold text-slate-200 block">{p.name}</span>
                        <span className="text-[10px] text-slate-450 block mt-0.5">Quarantined SKU: {p.sku} | Supplier: {p.supplier}</span>
                      </div>
                      <span className="text-red-400 font-extrabold bg-red-950/20 px-2 py-0.5 rounded text-[11px] border border-red-900/30">
                        {p.quantity} Units Quarantined
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
