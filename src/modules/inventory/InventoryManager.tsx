/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Building, Search, Plus, Trash2, Edit3, ArrowUpRight, 
  ArrowDownLeft, AlertCircle, Barcode, HelpCircle, CheckCircle 
} from 'lucide-react';
import { InventoryProduct } from '../../types';

interface InventoryManagerProps {
  inventory: InventoryProduct[];
  isDarkMode: boolean;
  isAdmin: boolean;
  currentUsername: string;
  onRefreshDB: () => void;
  onLogActivity: (action: string, details: string) => void;
}

export default function InventoryManager({
  inventory,
  isDarkMode,
  isAdmin,
  currentUsername,
  onRefreshDB,
  onLogActivity
}: InventoryManagerProps) {
  
  // Search state
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Selected category filter
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Modal / Creator states
  const [isAddingProduct, setIsAddingProduct] = useState<boolean>(false);
  const [isEditingProduct, setIsEditingProduct] = useState<InventoryProduct | null>(null);

  // Form states
  const [name, setName] = useState<string>('');
  const [sku, setSku] = useState<string>('');
  const [category, setCategory] = useState<string>('Electronics');
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(0);
  const [supplier, setSupplier] = useState<string>('');
  const [barcode, setBarcode] = useState<string>('');

  // Stock In / Stock Out rapid adjusters
  const [adjustingProdId, setAdjustingProdId] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(1);
  const [adjustType, setAdjustType] = useState<'IN' | 'OUT'>('IN');

  // Load product categories dynamically
  const categories = ['All', ...Array.from(new Set(inventory.map(item => item.category)))];

  // Filters logic
  const filteredProducts = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.barcode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenAdd = () => {
    setName('');
    const randomID = Math.floor(1000 + Math.random() * 9000);
    setSku(`SKU-${randomID}`);
    setCategory('Electronics');
    setPurchasePrice(100);
    setSellingPrice(150);
    setQuantity(10);
    setSupplier('Aura Distributors Ltd');
    setBarcode(`8809110${movieRandom()}`);
    setIsAddingProduct(true);
  };

  const movieRandom = () => Math.floor(100 + Math.random() * 900);

  const handleOpenEdit = (p: InventoryProduct) => {
    setIsEditingProduct(p);
    setName(p.name);
    setSku(p.sku);
    setCategory(p.category);
    setPurchasePrice(p.purchasePrice);
    setSellingPrice(p.sellingPrice);
    setQuantity(p.quantity);
    setSupplier(p.supplier);
    setBarcode(p.barcode);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sku.trim() || purchasePrice <= 0 || sellingPrice <= 0) {
      alert("Please enter a valid product name, SKU, and operational price ratings.");
      return;
    }

    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, sku, category, purchasePrice, sellingPrice, quantity, supplier, barcode, createdBy: currentUsername
        })
      });
      const data = await res.json();
      if (data.success) {
        onRefreshDB();
        setIsAddingProduct(false);
        onLogActivity("Register Stock", `Added product '${name}' with initial stock size ${quantity}`);
      } else {
        alert("Unable to save product: " + data.error);
      }
    } catch (err) {
      alert("Billing error during product registration.");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditingProduct) return;

    try {
      const res = await fetch(`/api/inventory/${isEditingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, sku, category, purchasePrice, sellingPrice, quantity, supplier, barcode, createdBy: currentUsername
        })
      });
      const data = await res.json();
      if (data.success) {
        onRefreshDB();
        setIsEditingProduct(null);
        onLogActivity("Modify Product", `Updated item fields for product '${name}'`);
      } else {
        alert("Edit fail: " + data.error);
      }
    } catch (err) {
      alert("Inventory error.");
    }
  };

  const handleDeleteProduct = async (id: string, prodName: string) => {
    if (!isAdmin) {
      alert("Access Denied: Sales Employees do not possess corporate clearance to remove catalog assets.");
      return;
    }

    const confirmAction = window.confirm(`Are you sure you want to permanently delete '${prodName}' from the database catalog? This action will break past POS invoice bindings if stock lines are completely cleared.`);
    if (!confirmAction) return;

    try {
      const res = await fetch(`/api/inventory/${id}?username=${currentUsername}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        onRefreshDB();
        onLogActivity("Remove Product", `Permanently deleted model '${prodName}'`);
      } else {
        alert("Failed to delete stock model: " + data.error);
      }
    } catch (err) {
      alert("Failed to reach server.");
    }
  };

  const handleStockAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProdId) return;

    try {
      const res = await fetch('/api/inventory/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: adjustingProdId,
          type: adjustType,
          amount: adjustAmount,
          createdBy: currentUsername
        })
      });
      const data = await res.json();
      if (data.success) {
        onRefreshDB();
        setAdjustingProdId(null);
        setAdjustAmount(1);
        onLogActivity("Stock Adjustment", `Manually logged Stock-${adjustType} for amount ${adjustAmount}`);
      } else {
        alert("Adjustment failed: " + data.error);
      }
    } catch (err) {
      alert("Failed to communicate inventory fluctuations.");
    }
  };

  return (
    <div className="space-y-6">

      {/* Add / Edit Product Modals */}
      {(isAddingProduct || isEditingProduct) && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 animate-fade-in text-xs">
          <form 
            onSubmit={isAddingProduct ? handleAddSubmit : handleEditSubmit}
            className={`max-w-xl w-full p-6 rounded-2xl border ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <h3 className="text-sm font-black uppercase mb-4 text-blue-500 tracking-tight">
              {isAddingProduct ? "➕ Register New Product Line" : "📝 Edit Product Specifications"}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Skyline Mechanical Keyboard"
                  className={`w-full p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDarkMode ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">SKU identifier *</label>
                <input
                  type="text"
                  required
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g. SKY-KEY-MECH"
                  className={`w-full p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDarkMode ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Category Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={`w-full p-2.5 rounded-lg focus:outline-none ${
                    isDarkMode ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                  }`}
                >
                  <option value="Electronics">Electronics</option>
                  <option value="Computer peripherals">Computer peripherals</option>
                  <option value="Accessories">Accessories</option>
                  <option value="Office Furniture">Office Furniture</option>
                  <option value="General Merchandise">General Merchandise</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Manufacturer Barcode</label>
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="e.g. 8809121903"
                  className={`w-full p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDarkMode ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Purchase Price (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(Number(e.target.value))}
                  className={`w-full p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDarkMode ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Selling Price (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(Number(e.target.value))}
                  className={`w-full p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDarkMode ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Physical Quantity Count *</label>
                <input
                  type="number"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className={`w-full p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDarkMode ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Primary Supplier name</label>
                <input
                  type="text"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="e.g. Sato Manufacturing"
                  className={`w-full p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDarkMode ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                  }`}
                />
              </div>

            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setIsAddingProduct(false);
                  setIsEditingProduct(null);
                }}
                className={`flex-1 py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-705' : 'bg-slate-100 border-slate-350 hover:bg-slate-200'
                }`}
              >
                Cancel
              </button>
              
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl font-black shadow-md shadow-blue-600/35 cursor-pointer text-xs"
              >
                Save Registers
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stock In / Out Adjustment Modal */}
      {adjustingProdId && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 text-xs">
          <form 
            onSubmit={handleStockAdjust}
            className={`max-w-sm w-full p-6 rounded-2xl border ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <h3 className="text-xs font-black uppercase mb-3 text-blue-500">
              ⚡ Rapid Inventory Adjustment
            </h3>

            <p className="text-slate-400 text-[11px] mb-4">
              Apply rapid inbound or outbound quantity updates over: <span className="font-bold text-slate-200">"{inventory.find(i => i.id === adjustingProdId)?.name}"</span>
            </p>

            <div className="space-y-4">
              
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Adjustment Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('IN')}
                    className={`py-2 rounded-lg font-bold border transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                      adjustType === 'IN' 
                        ? 'bg-emerald-600 border-emerald-500 text-white' 
                        : isDarkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-750' : 'bg-slate-100 border-slate-300'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>STOCK-IN</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setAdjustType('OUT')}
                    className={`py-2 rounded-lg font-bold border transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                      adjustType === 'OUT' 
                        ? 'bg-amber-600 border-amber-500 text-white' 
                        : isDarkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-750' : 'bg-slate-100 border-slate-300'
                    }`}
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>STOCK-OUT</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Quantity Amount *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Math.max(1, Number(e.target.value)))}
                  className={`w-full p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDarkMode ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                  }`}
                />
              </div>

            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setAdjustingProdId(null)}
                className={`flex-1 py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                  isDarkMode ? 'bg-slate-800 border-slate-705' : 'bg-slate-101 border-slate-300'
                }`}
              >
                Cancel
              </button>
              
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2 rounded-xl shadow-md cursor-pointer"
              >
                Apply Change
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Controls: Search, Add Product, Category Dropdowns */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-4 ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Custom Category selection */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={`text-xs px-3 py-2 rounded-lg font-bold focus:outline-none border ${
              isDarkMode 
                ? 'bg-slate-950 border-slate-800 text-slate-300' 
                : 'bg-white border-slate-300 text-slate-800'
            }`}
          >
            {categories.map((cat, idx) => (
              <option key={idx} value={cat}>📁 Category: {cat}</option>
            ))}
          </select>

          {/* Search field */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, SKU, or Barcode..."
              className={`text-xs pl-9 pr-4 py-2 rounded-lg focus:outline-none transition-all w-full sm:w-64 ${
                isDarkMode
                  ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:ring-1 focus:ring-blue-500'
                  : 'bg-slate-50 border border-slate-300 text-slate-850 focus:ring-1 focus:ring-blue-500'
              }`}
            />
          </div>
        </div>

        {/* Register stock button */}
        <button
          type="button"
          onClick={handleOpenAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-1.5 cursor-pointer transition-all w-full md:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          <span>Register Product Line</span>
        </button>

      </div>

      {/* Main Inventory Ledger table */}
      <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-205 text-slate-500'} font-bold`}>
                <th className="py-3 px-3">Product Name & Category</th>
                <th className="py-3 px-3">SKU Identifier</th>
                <th className="py-3 px-3">Supplier Name</th>
                <th className="py-3 px-3">Purchase Price</th>
                <th className="py-3 px-3">Selling Unit Price</th>
                <th className="py-3 px-3 text-center">In Stock</th>
                <th className="py-3 px-3">Barcode</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {filteredProducts.map((p) => {
                const isLowStock = p.quantity <= 10;
                
                return (
                  <tr key={p.id} className="hover:bg-slate-800/10">
                    <td className="py-3.5 px-3">
                      <div>
                        <span className={`font-semibold text-xs py-0.5 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                          {p.name}
                        </span>
                        <span className="block text-[10px] text-blue-500 font-bold uppercase mt-0.5 tracking-wider">
                          {p.category}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-[11px] text-slate-350">
                      {p.sku}
                    </td>
                    <td className="py-3.5 px-3 text-slate-400">
                      {p.supplier || "N/A"}
                    </td>
                    <td className="py-3.5 px-3 font-bold text-slate-300">
                      ₹{p.purchasePrice.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-3 font-black text-blue-500">
                      ₹{p.sellingPrice.toFixed(2)}
                    </td>
                    
                    <td className="py-3.5 px-3">
                      <div className="flex flex-col items-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-widest ${
                          isLowStock 
                            ? 'bg-amber-950/40 text-amber-300 border border-amber-800/30' 
                            : 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/30'
                        }`}>
                          {p.quantity} Units
                        </span>
                        {isLowStock && (
                          <span className="text-[9px] text-amber-400 font-bold mt-1 flex items-center gap-0.5 animate-pulse">
                            <AlertCircle className="w-2.5 h-2.5" />
                            <span>Low Stock</span>
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                        <Barcode className="w-4 h-4 text-slate-500 shrink-0" />
                        <span>{p.barcode}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-right space-x-1 whitespace-nowrap">
                      {/* Rapid adjustment shortcut */}
                      <button
                        type="button"
                        onClick={() => {
                          setAdjustingProdId(p.id);
                          setAdjustType('IN');
                        }}
                        className="py-1 px-1.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-bold cursor-pointer inline-flex items-center gap-0.5"
                        title="Stock-In / Stock-Out"
                      >
                        Adjust Stock
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(p)}
                        className="p-1 px-1.5 rounded bg-blue-900/10 hover:bg-blue-900/30 text-blue-400 cursor-pointer inline-flex items-center text-[10px]"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Restricted Delete button */}
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          className="p-1 px-1.5 rounded bg-red-950/35 hover:bg-red-950/70 text-red-400 cursor-pointer inline-flex items-center text-[10px]"
                          title="Trash Stock Line"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredProducts.length === 0 && (
            <p className="text-center py-8 text-xs text-slate-500">
              No product found matching selected filter specifications.
            </p>
          )}
        </div>
      </div>

    </div>
  );
}
