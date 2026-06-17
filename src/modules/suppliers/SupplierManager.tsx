/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Building2, Plus, Edit3, Trash2, Tag, Calendar, Smartphone, FileText, 
  Search, ArrowLeftRight, CheckCircle, Package, ArrowUpRight, RotateCcw
} from 'lucide-react';
import { Supplier, PurchaseEntry, InventoryProduct, SmartDeskUser } from '../../types';

interface SupplierManagerProps {
  suppliers: Supplier[];
  purchases: PurchaseEntry[];
  inventory: InventoryProduct[];
  isDarkMode: boolean;
  isAdmin: boolean;
  currentUsername: string;
  onRefreshDB: () => void;
  onLogActivity: (action: string, details: string) => void;
}

interface PurchaseItemInput {
  productId: string;
  name: string;
  quantity: number;
  purchasePrice: number;
  gstRate: number;
}

export default function SupplierManager({
  suppliers,
  purchases,
  inventory,
  isDarkMode,
  isAdmin,
  currentUsername,
  onRefreshDB,
  onLogActivity
}: SupplierManagerProps) {
  
  // Section toggle: 'suppliers-list' | 'add-purchase' | 'purchases-history'
  const [managerTab, setManagerTab] = useState<'suppliers' | 'purchases' | 'new-purchase'>('suppliers');

  // Inline confirmation state for returns to prevent standard window.confirm iframe-blocking
  const [confirmReturnId, setConfirmReturnId] = useState<string | null>(null);

  // Supplier modal/edit state
  const [isAddingSupplier, setIsAddingSupplier] = useState<boolean>(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierName, setSupplierName] = useState<string>('');
  const [supplierMobile, setSupplierMobile] = useState<string>('');
  const [supplierGst, setSupplierGst] = useState<string>('');
  const [supplierAddress, setSupplierAddress] = useState<string>('');
  const [supSearchTerm, setSupSearchTerm] = useState<string>('');

  // Purchase Entry creation state
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItemInput[]>([]);
  const [gstType, setGstType] = useState<'local' | 'interstate'>('local');
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Temporary selectors for adding an item to the purchase requisition list
  const [tempProductId, setTempProductId] = useState<string>('');
  const [tempQty, setTempQty] = useState<number>(1);
  const [tempPrice, setTempPrice] = useState<number>(0);

  // Supplier Save/Edit submit
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) {
      alert("Supplier Name is required.");
      return;
    }

    const payload = {
      name: supplierName,
      mobile: supplierMobile,
      gstNumber: supplierGst,
      address: supplierAddress,
      createdBy: currentUsername
    };

    try {
      const url = editingSupplier 
        ? `/api/suppliers/${editingSupplier.id}` 
        : `/api/suppliers`;
      const method = editingSupplier ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        onRefreshDB();
        onLogActivity(
          editingSupplier ? "Modify Supplier" : "Add Supplier", 
          `Registered/updated supplier '${supplierName}' (GST: ${supplierGst || "N/A"})`
        );
        resetSupplierForm();
      } else {
        alert("Action failed: " + data.error);
      }
    } catch (err) {
      alert("Network failure processing supplier profile.");
    }
  };

  const startEditSupplier = (sup: Supplier) => {
    setEditingSupplier(sup);
    setSupplierName(sup.name);
    setSupplierMobile(sup.mobile);
    setSupplierGst(sup.gstNumber);
    setSupplierAddress(sup.address);
    setIsAddingSupplier(true);
  };

  const resetSupplierForm = () => {
    setEditingSupplier(null);
    setSupplierName('');
    setSupplierMobile('');
    setSupplierGst('');
    setSupplierAddress('');
    setIsAddingSupplier(false);
  };

  // Purchase Form logic
  const handleAddProductToPurchase = () => {
    if (!tempProductId) {
      alert("Please select a physical stock catalog product model.");
      return;
    }

    const matchedProd = inventory.find(p => p.id === tempProductId);
    if (!matchedProd) return;

    if (tempQty <= 0) {
      alert("Quantity must be higher than zero.");
      return;
    }

    const alreadyIdx = purchaseItems.findIndex(item => item.productId === tempProductId);
    if (alreadyIdx !== -1) {
      // update qty
      const copy = [...purchaseItems];
      copy[alreadyIdx].quantity += tempQty;
      copy[alreadyIdx].purchasePrice = tempPrice > 0 ? tempPrice : copy[alreadyIdx].purchasePrice;
      setPurchaseItems(copy);
    } else {
      setPurchaseItems(prev => [
        ...prev,
        {
          productId: matchedProd.id,
          name: matchedProd.name,
          quantity: tempQty,
          purchasePrice: tempPrice > 0 ? tempPrice : matchedProd.purchasePrice,
          gstRate: matchedProd.gstRate !== undefined ? matchedProd.gstRate : 18
        }
      ]);
    }

    // Reset selectors
    setTempProductId('');
    setTempQty(1);
    setTempPrice(0);
  };

  const removeProductFromPurchase = (prodId: string) => {
    setPurchaseItems(prev => prev.filter(i => i.productId !== prodId));
  };

  // Compute live totals for current purchase checkout
  const purchaseSubTotal = purchaseItems.reduce((acc, item) => acc + (item.quantity * item.purchasePrice), 0);
  
  let purchaseCgst = 0;
  let purchaseSgst = 0;
  let purchaseIgst = 0;
  let purchaseGstSum = 0;

  purchaseItems.forEach(item => {
    const rawVal = item.quantity * item.purchasePrice;
    const itemGst = rawVal * (item.gstRate / 100);
    if (gstType === 'local') {
      purchaseCgst += itemGst / 2;
      purchaseSgst += itemGst / 2;
    } else {
      purchaseIgst += itemGst;
    }
    purchaseGstSum += itemGst;
  });

  const purchaseGrandTotal = purchaseSubTotal + purchaseGstSum;

  const handleCheckoutPurchase = async () => {
    if (!selectedSupplierId) {
      alert("Please assign a supplier to this purchase consignment.");
      return;
    }

    if (purchaseItems.length === 0) {
      alert("No inventory products requested for purchase check-in.");
      return;
    }

    const matchedSup = suppliers.find(s => s.id === selectedSupplierId) || { name: "Direct / Cash Buy" };

    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: selectedSupplierId,
          supplierName: matchedSup.name,
          items: purchaseItems,
          subtotal: purchaseSubTotal,
          cgst: purchaseCgst,
          sgst: purchaseSgst,
          igst: purchaseIgst,
          totalAmount: purchaseGrandTotal,
          date: purchaseDate,
          createdBy: currentUsername
        })
      });

      const data = await res.json();
      if (data.success) {
        onRefreshDB();
        onLogActivity(
          "Material Procurement", 
          `Received purchase entry ${data.purchase.purchaseNumber} from '${matchedSup.name}' totaling ₹ ${purchaseGrandTotal.toFixed(2)}`
        );
        alert(`Successfully computed & committed procurement check-in order: ${data.purchase.purchaseNumber}`);
        // Reset states
        setPurchaseItems([]);
        setSelectedSupplierId('');
        setManagerTab('purchases');
      } else {
        alert("Stock receipt failed: " + data.error);
      }
    } catch (err) {
      alert("Network errors logging purchase consignment.");
    }
  };

  const handleReturnPurchaseAction = async (purId: string, pNumber: string, bypassConfirm: boolean = false) => {
    if (!isAdmin) {
      try {
        alert("Permit Denied: Only Admin users can process corporate material returns.");
      } catch (e) {}
      return;
    }

    if (!bypassConfirm) {
      try {
        const conf = window.confirm(`Initiate material return for ${pNumber}? This will deduct stock counts from active inventory registers.`);
        if (!conf) return;
      } catch (e) {
        // Fallback or ignore if blocked in sandboxed iframe environment
      }
    }

    try {
      const res = await fetch(`/api/purchases/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseId: purId, createdBy: currentUsername })
      });
      const data = await res.json();
      if (data.success) {
        onRefreshDB();
        try {
          alert(`Purchase ${pNumber} successfully marked as Returned. Adjusted stockpile levels.`);
        } catch (e) {}
        onLogActivity("Purchase Return Dispatch", `Returned purchase ledger ${pNumber} back to vendor.`);
      } else {
        try {
          alert("Procurement return refund failed: " + data.error);
        } catch (e) {}
      }
    } catch (err) {
      try {
        alert("Network failure Dispatch Return service.");
      } catch (e) {}
    }
  };

  // Filters search lists
  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(supSearchTerm.toLowerCase()) ||
    s.gstNumber.toLowerCase().includes(supSearchTerm.toLowerCase()) ||
    s.mobile.includes(supSearchTerm)
  );

  return (
    <div className="space-y-6">
      
      {/* Tab Selectors */}
      <div className="flex gap-2.5 border-b border-slate-800/20 pb-3">
        <button
          type="button"
          onClick={() => setManagerTab('suppliers')}
          className={`px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
            managerTab === 'suppliers'
              ? 'bg-blue-600 text-white shadow'
              : isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100' : 'text-slate-650 hover:bg-slate-100'
          }`}
        >
          👤 Suppliers Registry ({suppliers.length})
        </button>
        <button
          type="button"
          onClick={() => setManagerTab('purchases')}
          className={`px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
            managerTab === 'purchases'
              ? 'bg-blue-600 text-white shadow'
              : isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100' : 'text-slate-650 hover:bg-slate-100'
          }`}
        >
          📂 Purchase Invoices ({purchases.length})
        </button>
        <button
          type="button"
          onClick={() => setManagerTab('new-purchase')}
          className={`px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1 bg-gradient-to-r from-emerald-600 to-indigo-600 text-white hover:opacity-90 shadow`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Procure New Stock</span>
        </button>
      </div>

      {/* VIEW 1: SUPPLIERS MANAGING */}
      {managerTab === 'suppliers' && (
        <div className="space-y-6">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={supSearchTerm}
                onChange={(e) => setSupSearchTerm(e.target.value)}
                placeholder="Search vendor name, mobile, GSTIN..."
                className={`w-full text-xs pl-9 pr-4 py-2 rounded-lg focus:outline-none transition-all ${
                  isDarkMode
                    ? 'bg-slate-900 border border-slate-800 text-slate-200'
                    : 'bg-white border border-slate-300 text-slate-800'
                }`}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                resetSupplierForm();
                setIsAddingSupplier(true);
              }}
              className="px-4 py-2 text-xs font-black bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 flex items-center gap-1 shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Supplier</span>
            </button>
          </div>

          {/* Supplier Modal Form */}
          {isAddingSupplier && (
            <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'} animate-fade-in`}>
              <h4 className={`text-xs font-bold uppercase mb-4 text-blue-500`}>
                {editingSupplier ? "✐ Modify Supplier Profile Characteristics" : "✦ Enroll New Supply partner"}
              </h4>
              <form onSubmit={handleSaveSupplier} className="grid grid-cols-1 md:grid-cols-4 gap-4 align-end">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Supplier Name *</label>
                  <input
                    type="text"
                    required
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="e.g. Apex Distributors"
                    className={`text-xs px-3 py-2 rounded-lg w-full focus:ring-1 focus:ring-blue-500 focus:outline-none ${
                      isDarkMode ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Mobile number</label>
                  <input
                    type="text"
                    value={supplierMobile}
                    onChange={(e) => setSupplierMobile(e.target.value)}
                    placeholder="e.g. +91 9304859011"
                    className={`text-xs px-3 py-2 rounded-lg w-full focus:ring-1 focus:ring-blue-500 focus:outline-none ${
                      isDarkMode ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">GSTIN Tax Registration</label>
                  <input
                    type="text"
                    value={supplierGst}
                    onChange={(e) => setSupplierGst(e.target.value)}
                    placeholder="e.g. 19AAAAA1111A1Z1"
                    className={`text-xs px-3 py-2 rounded-lg w-full focus:ring-1 focus:ring-blue-500 focus:outline-none ${
                      isDarkMode ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Core Street Address</label>
                  <input
                    type="text"
                    value={supplierAddress}
                    onChange={(e) => setSupplierAddress(e.target.value)}
                    placeholder="Kolkata Industrial Estate, India"
                    className={`text-xs px-3 py-2 rounded-lg w-full focus:ring-1 focus:ring-blue-500 focus:outline-none ${
                      isDarkMode ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div className="md:col-span-4 flex justify-end gap-3.5 border-t border-slate-800/10 pt-3.5">
                  <button
                    type="button"
                    onClick={resetSupplierForm}
                    className="py-2 px-4 rounded-lg text-xs font-bold bg-slate-850 hover:bg-slate-800 text-slate-400 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-2 px-5 rounded-lg text-xs font-black bg-blue-600 text-white hover:bg-blue-750 flex items-center gap-1"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{editingSupplier ? "Commit Updates" : "Save Supplier"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Supplier Table registry */}
          <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-[11px] leading-relaxed">
                <thead>
                  <tr className="border-b border-slate-800/30 font-bold opacity-60 text-slate-400">
                    <th className="py-2.5 px-3">Company Vendor Info</th>
                    <th className="py-2.5 px-3">Contact Number</th>
                    <th className="py-2.5 px-3">GSTIN Registration</th>
                    <th className="py-2.5 px-3">Corporate Location</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/40">
                  {filteredSuppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-850/10 text-slate-200">
                      <td className="py-3 px-3 font-bold text-white text-[12px]">{s.name}</td>
                      <td className="py-3 px-3 text-slate-300">{s.mobile || "N/A"}</td>
                      <td className="py-3 px-3 text-blue-400 font-bold">{s.gstNumber || "Unregistered"}</td>
                      <td className="py-3 px-3 text-slate-400 max-w-xs truncate">{s.address || "N/A"}</td>
                      <td className="py-3 px-3 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => startEditSupplier(s)}
                          className="py-1 px-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold border border-slate-750 cursor-pointer text-[10px]"
                        >
                          Modify
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredSuppliers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 font-semibold italic">
                        No supply partners found matching criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* VIEW 2: PURCHASES REGISTERED INVOICES */}
      {managerTab === 'purchases' && (
        <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <h4 className="text-xs font-extrabold uppercase mb-4 text-blue-500 flex items-center gap-1.5 leading-snug">
            <FileText className="w-4 h-4 text-blue-500" />
            <span>Corporate Procurement Purchase Invoices</span>
          </h4>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-[11px] leading-relaxed">
              <thead>
                <tr className="border-b border-slate-800/30 font-bold opacity-60 text-slate-400">
                  <th className="py-2.5 px-3">Purchase No.</th>
                  <th className="py-2.5 px-3">Receive Date</th>
                  <th className="py-2.5 px-3">Supplier Origin</th>
                  <th className="py-2.5 px-3">Goods check-in Details</th>
                  <th className="py-2.5 px-3">Subtotal</th>
                  <th className="py-2.5 px-3">GST Input Credits</th>
                  <th className="py-2.5 px-3">Total Cost</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/40">
                {purchases.map((p) => {
                  const isReturned = p.status === 'Returned';
                  const gstCollected = (p.cgst || 0) + (p.sgst || 0) + (p.igst || 0);

                  return (
                    <tr key={p.id} className={`hover:bg-slate-850/10 text-slate-200 ${isReturned ? 'italic opacity-60' : ''}`}>
                      <td className="py-3 px-3 font-bold text-blue-500">{p.purchaseNumber}</td>
                      <td className="py-3 px-3 text-slate-400">{p.date}</td>
                      <td className="py-3 px-3 font-semibold text-white">{p.supplierName}</td>
                      <td className="py-3 px-3 text-slate-300 max-w-sm">
                        <div className="space-y-0.5">
                          {p.items?.map((item: any, idx: number) => (
                            <span key={idx} className="inline-block bg-slate-800 text-[9px] px-1 py-0.5 rounded mr-1 whitespace-nowrap text-slate-300 mb-0.5">
                              {item.name} (x{item.quantity} - ₹{item.purchasePrice})
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3">₹{(p.subtotal || 0).toFixed(2)}</td>
                      <td className="py-3 px-3 text-green-400">₹{gstCollected.toFixed(2)}</td>
                      <td className="py-3 px-3 font-extrabold text-blue-400">₹{(p.totalAmount || 0).toFixed(2)}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          isReturned ? 'bg-red-950 text-red-300' : 'bg-emerald-950 text-emerald-300'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {isAdmin && !isReturned && (
                          <div className="flex items-center gap-1.5 justify-end">
                            {confirmReturnId === p.id ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setConfirmReturnId(null);
                                    handleReturnPurchaseAction(p.id, p.purchaseNumber, true);
                                  }}
                                  className="py-1 px-2 rounded bg-red-600 hover:bg-red-700 text-white font-bold cursor-pointer text-[10px] inline-flex items-center gap-1 shadow-sm border border-red-500/30"
                                >
                                  <span>Confirm Return?</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmReturnId(null)}
                                  className="py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer text-[10px] inline-flex items-center"
                                >
                                  <span>Cancel</span>
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmReturnId(p.id)}
                                className="py-1 px-2.5 rounded bg-red-950 hover:bg-red-900 border border-red-900/40 text-red-300 font-bold cursor-pointer text-[10px] inline-flex items-center gap-1"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Return to Supplier</span>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {purchases.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500 font-semibold italic">
                      No purchase entries are historically logged.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: NEW PROCUREMENT WORKFLOW ENTRY */}
      {managerTab === 'new-purchase' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in text-slate-300">
          
          {/* Left Form: Product addition (7 cols) */}
          <div className={`p-5 rounded-xl border lg:col-span-7 xl:col-span-8 flex flex-col space-y-4 ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h4 className="text-xs font-extrabold uppercase text-blue-500 border-b border-slate-850 pb-2">
              Step 1: Check-in Products Requisitions
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Catalog Product Line</label>
                <select
                  value={tempProductId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setTempProductId(id);
                    const match = inventory.find(i => i.id === id);
                    if (match) setTempPrice(match.purchasePrice);
                  }}
                  className={`text-xs px-3 py-2 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDarkMode ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="">-- Choose item lines --</option>
                  {inventory.map(p => (
                    <option key={p.id} value={p.id}>📦 {p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Received stockpile (Qty)</label>
                <input
                  type="number"
                  min={1}
                  value={tempQty}
                  onChange={(e) => setTempQty(Math.max(1, Number(e.target.value)))}
                  className={`text-xs px-3 py-2 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDarkMode ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Purchase unit price (₹)</label>
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={tempPrice}
                  onChange={(e) => setTempPrice(Math.max(0, Number(e.target.value)))}
                  className={`text-xs px-3 py-2 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDarkMode ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="md:col-span-3 flex justify-end">
                <button
                  type="button"
                  onClick={handleAddProductToPurchase}
                  className="px-4 py-2 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white cursor-pointer rounded-lg shadow-sm font-bold flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Commit requisition Line</span>
                </button>
              </div>
            </div>

            {/* List of Committed Items */}
            <div className="border-t border-slate-800/20 pt-4 mt-4">
              <h5 className="text-[10px] uppercase font-black text-slate-400 mb-2.5">Active Consignment Line-items</h5>
              {purchaseItems.length === 0 ? (
                <p className="text-slate-500 text-xs italic text-center py-6">Consignment line list is currently empty.</p>
              ) : (
                <div className="space-y-2">
                  {purchaseItems.map((item, index) => {
                    const rawLine = item.quantity * item.purchasePrice;
                    const gstAmount = rawLine * (item.gstRate / 100);
                    return (
                      <div key={index} className="flex justify-between items-center bg-slate-950/20 p-3 rounded-lg border border-slate-800/40 text-xs text-slate-350">
                        <div>
                          <p className="font-bold text-slate-200">{item.name}</p>
                          <span className="text-[10px] font-mono text-slate-400">
                            Qty: <strong className="text-teal-400">{item.quantity}</strong> &nbsp;|&nbsp; 
                            Procurement: ₹{item.purchasePrice} &nbsp;|&nbsp; 
                            Tax: GST {item.gstRate}% (+₹{gstAmount.toFixed(1)})
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-extrabold text-white">₹{(rawLine + gstAmount).toFixed(2)}</span>
                          <button
                            type="button"
                            onClick={() => removeProductFromPurchase(item.productId)}
                            className="text-slate-500 hover:text-red-400 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Right Form: Checkout details (5 cols) */}
          <div className={`p-5 rounded-xl border lg:col-span-5 xl:col-span-4 flex flex-col justify-between ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`} style={{ minHeight: '390px' }}>
            
            <h4 className="text-xs font-extrabold uppercase text-blue-500 border-b border-slate-805 pb-2 mb-4">
              Step 2: Consignment Checkout
            </h4>

            <div className="space-y-4">
              
              {/* Supplier Dropdown */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Source Supplier Partnership *</label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className={`text-xs px-3 py-2 rounded-lg w-full focus:outline-none ${
                    isDarkMode ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="">-- Choose verified vendor --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>🏢 {s.name} (GST: {s.gstNumber || "None"})</option>
                  ))}
                </select>
              </div>

              {/* Purchase Date */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Incoming Log Date</label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className={`text-xs px-3 py-2 rounded-lg w-full focus:outline-none ${
                    isDarkMode ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* GST Regionalization */}
              <div className="flex justify-between items-center bg-slate-950/25 p-2 rounded-lg border border-slate-800/40 text-xs">
                <span className="text-[10px] font-bold uppercase text-slate-400">GST Jurisdiction</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setGstType('local')}
                    className={`px-2 py-1 text-[9px] font-black rounded ${
                      gstType === 'local' ? 'bg-blue-600 text-white font-black' : 'bg-slate-800 text-slate-400 hover:bg-slate-750'
                    }`}
                  >
                    Local (CGST+SGST)
                  </button>
                  <button
                    type="button"
                    onClick={() => setGstType('interstate')}
                    className={`px-2 py-1 text-[9px] font-black rounded ${
                      gstType === 'interstate' ? 'bg-blue-600 text-white font-black' : 'bg-slate-800 text-slate-400 hover:bg-slate-750'
                    }`}
                  >
                    Outside (IGST)
                  </button>
                </div>
              </div>

              {/* Live calculations block */}
              <div className="space-y-1.5 text-xs text-slate-400 bg-slate-950/30 p-3 rounded-lg">
                <div className="flex justify-between">
                  <span>Goods Subtotal Amount</span>
                  <span className="font-semibold text-slate-200">₹{purchaseSubTotal.toFixed(2)}</span>
                </div>
                {gstType === 'local' ? (
                  <>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>CGST Tax Base (Procured)</span>
                      <span>₹{purchaseCgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>SGST Tax Base (Procured)</span>
                      <span>₹{purchaseSgst.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>IGST Tax Base (Procured)</span>
                    <span>₹{purchaseIgst.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-dashed border-slate-800 pt-1.5 font-extrabold text-blue-500 text-xs">
                  <span>Procurement Bill Cost</span>
                  <span className="font-extrabold text-blue-500">₹{purchaseGrandTotal.toFixed(2)}</span>
                </div>
              </div>

            </div>

            <button
              type="button"
              onClick={handleCheckoutPurchase}
              disabled={purchaseItems.length === 0 || !selectedSupplierId}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black uppercase py-3.5 rounded-xl mt-6 cursor-pointer shadow-lg flex items-center justify-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Checkout Consignment</span>
            </button>

          </div>

        </div>
      )}

    </div>
  );
}
