/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, Search, Plus, Minus, CreditCard, RotateCcw, 
  Printer, Trash2, CheckCircle, Sparkles, FileText, User, Smartphone, MapPin
} from 'lucide-react';
import { InventoryProduct, Customer, SalesInvoice, SystemSettings } from '../../types';

interface POSBillingProps {
  inventory: InventoryProduct[];
  customers: Customer[];
  salesLogs: SalesInvoice[];
  currentUsername: string;
  isDarkMode: boolean;
  isAdmin: boolean;
  settings: SystemSettings;
  onRefreshDB: () => void;
  onLogActivity: (action: string, details: string) => void;
}

interface CartItem {
  product: InventoryProduct;
  quantity: number;
}

export default function POSBilling({
  inventory,
  customers,
  salesLogs,
  currentUsername,
  isDarkMode,
  isAdmin,
  settings,
  onRefreshDB,
  onLogActivity
}: POSBillingProps) {
  
  // Selection/Input states
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('walk-in');
  
  // Custom Walk-In client metadata fields
  const [walkInName, setWalkInName] = useState<string>('Walk-In Customer');
  const [walkInMobile, setWalkInMobile] = useState<string>('');
  
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [suggestion, setSuggestion] = useState<string>('');
  const [checkoutLoading, setCheckoutLoading] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('UPI'); // UPI is very standard in India
  
  // Tax distribution model: local Intra-State (CGST + SGST) or Inter-State (IGST)
  const [gstType, setGstType] = useState<"local" | "interstate">("local");

  // Printing Receipt modal state
  const [printedInvoice, setPrintedInvoice] = useState<SalesInvoice | null>(null);

  // Sync mobile number when selected registration profile changes
  useEffect(() => {
    if (selectedCustomerId !== 'walk-in') {
      const actualCust = customers.find(c => c.id === selectedCustomerId);
      if (actualCust) {
        setWalkInName(actualCust.name);
        setWalkInMobile(actualCust.mobile);
      }
    } else {
      setWalkInName('Walk-In Customer');
      setWalkInMobile('');
    }
  }, [selectedCustomerId, customers]);

  // Load POS smart recommendations when cart items change
  useEffect(() => {
    if (cart.length === 0) {
      setSuggestion('');
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        const pList = cart.map(item => ({ name: item.product.name, id: item.product.id }));
        const res = await fetch('/api/sales/pos-suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cartItems: pList })
        });
        const data = await res.json();
        if (data.recommendation) {
          setSuggestion(data.recommendation);
        }
      } catch (err) {
        console.warn("Unable to fetch POS recommendation:", err);
      }
    }, 1200);

    return () => clearTimeout(delayDebounce);
  }, [cart]);

  // Calculations: Indian GST models
  const subtotal = cart.reduce((sum, item) => sum + (item.product.sellingPrice * item.quantity), 0);

  // Split calculations
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  let totalGst = 0;

  cart.forEach(item => {
    const itemSubTotal = item.product.sellingPrice * item.quantity;
    const rate = item.product.gstRate !== undefined ? item.product.gstRate : 18; // default 18% GST rate
    const gstVal = itemSubTotal * (rate / 100);
    
    if (gstType === "local") {
      cgstAmount += gstVal / 2;
      sgstAmount += gstVal / 2;
    } else {
      igstAmount += gstVal;
    }
    totalGst += gstVal;
  });

  const grandTotal = subtotal + totalGst;

  // Search filter
  const filteredProducts = inventory.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barcode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (prod: InventoryProduct) => {
    if (prod.quantity <= 0) {
      alert(`Oops! "${prod.name}" has zero physical stock level. Restock first via Inventory.`);
      return;
    }

    setCart(prev => {
      const idx = prev.findIndex(item => item.product.id === prod.id);
      if (idx !== -1) {
        const updatedQty = prev[idx].quantity + 1;
        if (updatedQty > prod.quantity) {
          alert(`Limit reached. Only ${prod.quantity} units are available in physical stock.`);
          return prev;
        }
        const updated = [...prev];
        updated[idx].quantity = updatedQty;
        return updated;
      } else {
        return [...prev, { product: prod, quantity: 1 }];
      }
    });
  };

  const updateCartQty = (prodId: string, amount: number) => {
    setCart(prev => {
      const idx = prev.findIndex(item => item.product.id === prodId);
      if (idx === -1) return prev;
      
      const targetUnit = prev[idx];
      const nextQty = targetUnit.quantity + amount;

      if (nextQty <= 0) {
        return prev.filter(item => item.product.id !== prodId);
      }

      if (nextQty > targetUnit.product.quantity) {
        alert(`Limit reached. Only ${targetUnit.product.quantity} physical units available.`);
        return prev;
      }

      const updated = [...prev];
      updated[idx].quantity = nextQty;
      return updated;
    });
  };

  const removeFromCart = (prodId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== prodId));
  };

  const resetCart = () => {
    setCart([]);
    setSelectedCustomerId('walk-in');
    setWalkInName('Walk-In Customer');
    setWalkInMobile('');
    setSuggestion('');
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert("No products in POS basket.");
      return;
    }

    setCheckoutLoading(true);

    const itemsPayload = cart.map(item => {
      const itemSubTotal = item.product.sellingPrice * item.quantity;
      const rate = item.product.gstRate !== undefined ? item.product.gstRate : 18;
      const gstVal = itemSubTotal * (rate / 100);

      return {
        productId: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.sellingPrice,
        gstRate: rate,
        cgstAmount: gstType === "local" ? gstVal / 2 : 0,
        sgstAmount: gstType === "local" ? gstVal / 2 : 0,
        igstAmount: gstType === "interstate" ? gstVal : 0,
        total: itemSubTotal + gstVal
      };
    });

    try {
      const res = await fetch('/api/sales/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          customerName: walkInName,
          customerMobile: walkInMobile,
          paymentMethod,
          items: itemsPayload,
          subtotal,
          cgst: cgstAmount,
          sgst: sgstAmount,
          igst: igstAmount,
          gstAmount: totalGst,
          totalAmount: grandTotal,
          createdBy: currentUsername
        })
      });

      const data = await res.json();
      if (data.success) {
        onRefreshDB();
        setPrintedInvoice(data.invoice);
        onLogActivity("POS Invoice Issue", `Issued INV to '${walkInName}' (Mobile: ${walkInMobile}) totaling ₹ ${grandTotal.toFixed(2)}`);
        setCart([]);
        setSelectedCustomerId('walk-in');
        setWalkInName('Walk-In Customer');
        setWalkInMobile('');
      } else {
        alert("Server checkout error: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("Network failed during secure POS payment processing.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Processing Invoice returns/refunds
  const handleReturnInvoice = async (invoiceId: string, invNumber: string) => {
    if (!isAdmin) {
      alert("Access Denied: Only Admin/Business owners can issue operational product refunds.");
      return;
    }

    const confirmAction = window.confirm(`Are you sure you want to refund invoice ${invNumber}? All items will be restored into the inventory stockpile.`);
    if (!confirmAction) return;

    try {
      const res = await fetch('/api/sales/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId, createdBy: currentUsername })
      });
      const data = await res.json();
      if (data.success) {
        onRefreshDB();
        alert(`Invoice ${invNumber} successfully returned. Inventory stocks replenished.`);
      } else {
        alert("Refund processing error: " + data.error);
      }
    } catch (err) {
      alert("Failed to reach billing services.");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Checkout Print Receipt Popup */}
      {printedInvoice && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in text-slate-900">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border-2 border-slate-300 font-mono text-[11px] leading-relaxed max-h-[90vh] overflow-y-auto">
            
            {/* Stamp Indicator */}
            <div className={`absolute top-4 right-4 border-2 rounded px-3 py-1 text-xs font-black uppercase rotate-6 ${
              printedInvoice.status === 'Returned' ? 'text-red-600 border-red-600' : 'text-emerald-600 border-emerald-600'
            }`}>
              {printedInvoice.status === 'Returned' ? 'REFUNDED RETURN' : 'PAID IN FULL'}
            </div>

            <div className="text-center space-y-1.5 mb-5">
              <h3 className="font-extrabold text-base tracking-wider text-black uppercase">
                {settings?.companyName || "SMARTDESK ERP LTD"}
              </h3>
              <p className="text-[10px] text-slate-500 whitespace-pre-line leading-snug">
                {settings?.businessAddress || "M G ROAD, SECTOR 5, KOLKATA, INDIA"}
              </p>
              <p className="text-[10px] text-slate-500 font-bold">
                PHONE: {settings?.contactNumber || "+91 9876543210"} &nbsp;|&nbsp; GSTIN: {settings?.gstNumber || "19AAAAA1111A1Z1"}
              </p>
              <div className="border-b border-dashed border-slate-400 my-2"></div>
              <p className="text-xs font-black uppercase text-black">TAX INVOICE RECEIPT</p>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 bg-slate-50 p-2.5 rounded-lg mb-4 text-[10px]">
              <div>
                <span className="text-slate-500 block">INVOICE NO:</span> 
                <span className="font-bold text-black">{printedInvoice.invoiceNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 block">DATE & TIME:</span> 
                <span className="font-bold text-black">{new Date(printedInvoice.createdAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block">CASHIER / EXECUTIVE:</span> 
                <span className="font-bold text-black uppercase">{printedInvoice.createdBy}</span>
              </div>
              <div>
                <span className="text-slate-500 block">PAYMENT METHOD:</span> 
                <span className="font-bold text-black uppercase bg-blue-100 text-blue-800 px-1 rounded">{printedInvoice.paymentMethod}</span>
              </div>
              <div className="col-span-2 border-t border-slate-200 mt-1 pt-1">
                <span className="text-slate-500">BILLED TO:</span> &nbsp;
                <span className="font-bold text-black uppercase">{printedInvoice.customerName}</span>
                {printedInvoice.customerMobile && (
                  <span className="text-blue-600 font-bold ml-1">({printedInvoice.customerMobile})</span>
                )}
              </div>
            </div>

            <div className="border-b border-dashed border-slate-400 my-2"></div>

            {/* Invoiced items list */}
            <div className="space-y-1.5 py-2">
              <div className="grid grid-cols-12 font-bold text-slate-700 pb-1 text-[10px]">
                <span className="col-span-5">PRODUCT DETAIL</span>
                <span className="col-span-2 text-center">QTY</span>
                <span className="col-span-1 text-center">GST%</span>
                <span className="col-span-2 text-right">RATE</span>
                <span className="col-span-2 text-right">TOTAL</span>
              </div>
              
              {printedInvoice.items.map((i, idx) => (
                <div key={idx} className="grid grid-cols-12 text-slate-800 border-b border-dotted border-slate-200 pb-1 align-top">
                  <span className="col-span-5 text-[10px] break-words">{i.name}</span>
                  <span className="col-span-2 text-center text-black font-semibold">{i.quantity}</span>
                  <span className="col-span-1 text-center font-mono text-[9px]">{i.gstRate}%</span>
                  <span className="col-span-2 text-right">₹{Number(i.price).toFixed(2)}</span>
                  <span className="col-span-2 text-right font-bold text-black">₹{Number(i.total).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="border-b border-dashed border-slate-400 my-2"></div>

            {/* Calculations block with local GST details (CGST, SGST, IGST) */}
            <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg text-[10px] text-slate-800">
              <div className="flex justify-between">
                <span>ITEMS SUB-TOTAL:</span>
                <span className="font-semibold text-black">₹{(printedInvoice.subtotal || 0).toFixed(2)}</span>
              </div>
              
              {(printedInvoice.cgst || 0) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>CGST TAX COMPONENT:</span>
                  <span>₹{(printedInvoice.cgst || 0).toFixed(2)}</span>
                </div>
              )}
              {(printedInvoice.sgst || 0) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>SGST TAX COMPONENT:</span>
                  <span>₹{(printedInvoice.sgst || 0).toFixed(2)}</span>
                </div>
              )}
              {(printedInvoice.igst || 0) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>IGST TAX COMPONENT:</span>
                  <span>₹{(printedInvoice.igst || 0).toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>TOTAL ACCUMULATED GST:</span>
                <span className="font-semibold text-black">₹{(printedInvoice.gstAmount || (printedInvoice as any).tax || 0).toFixed(2)}</span>
              </div>

              <div className="flex justify-between font-extrabold text-black text-xs pt-1.5 border-t border-dashed border-slate-300 mt-1">
                <span>NET PAYABLE AMOUNT:</span>
                <span className="text-blue-700">₹{(printedInvoice.totalAmount || 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="border-b border-dashed border-slate-400 my-4"></div>

            <div className="text-center text-[9px] text-slate-500 space-y-1">
              <p>Thank you for shopping with us! Visit again!</p>
              <p>Refunds of pristine merchandise are acceptable as per local refund policies.</p>
              <p className="font-bold text-black">POWERED BY SMARTDESKERP CO. (+91 9876543210)</p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2 px-4 rounded-xl text-[10px] cursor-pointer flex items-center justify-center gap-1.5 border border-slate-300"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Trig Physical Print</span>
              </button>
              
              <button
                type="button"
                onClick={() => setPrintedInvoice(null)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl text-[10px] cursor-pointer flex items-center justify-center shadow-lg"
              >
                Close Bill
              </button>
            </div>

          </div>
        </div>
      )}
      
      {/* Main Grid: Left is Products list, Right is current active Cart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Side: Product Selector Grid (8 Columns) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col space-y-4">
          
          <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h3 className={`font-bold text-sm tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-850'}`}>
              Select Retail Goods
            </h3>
            
            {/* Search Filter input */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Find item, SKU, or Barcode..."
                className={`w-full text-xs pl-9 pr-4 py-2 rounded-lg focus:outline-none transition-all ${
                  isDarkMode
                    ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:ring-1 focus:ring-blue-500'
                    : 'bg-slate-50 border border-slate-300 text-slate-850 focus:ring-1 focus:ring-blue-500'
                }`}
              />
            </div>
          </div>

          {/* Product Items card list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto max-h-[520px] p-0.5">
            {filteredProducts.map((p) => {
              const isLowStock = p.quantity <= 10;
              const isOutOfStock = p.quantity === 0;
              const prodGst = p.gstRate !== undefined ? p.gstRate : 18;

              return (
                <div
                  key={p.id}
                  onClick={() => !isOutOfStock && addToCart(p)}
                  className={`p-4 rounded-xl border flex flex-col justify-between transition-all cursor-pointer shadow-sm relative ${
                    isOutOfStock 
                      ? 'opacity-50 cursor-not-allowed bg-red-950/10 border-red-900/30' 
                      : isDarkMode
                        ? 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:shadow-md'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow'
                  }`}
                >
                  {/* Stock tag */}
                  <div className={`absolute top-2.5 right-2.5 text-[9px] font-black px-1.5 py-0.5 rounded ${
                    isOutOfStock 
                      ? 'bg-red-800 text-red-100 animate-pulse' 
                      : isLowStock 
                        ? 'bg-amber-600/20 text-amber-300 border border-amber-800'
                        : 'bg-emerald-900/40 text-emerald-300 border border-emerald-800'
                  }`}>
                    {isOutOfStock ? "SOLD OUT" : `STK: ${p.quantity}`}
                  </div>

                  <div className="space-y-1 mb-4">
                    <div className="flex gap-1 items-center">
                      <span className="text-[9px] text-blue-500 font-bold uppercase tracking-wide">
                        {p.category}
                      </span>
                      <span className="text-[8px] bg-slate-800 text-slate-300 px-1 rounded font-mono">
                        GST {prodGst}%
                      </span>
                    </div>
                    <h4 className={`font-semibold text-xs leading-snug line-clamp-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                      {p.name}
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400 block">
                      SKU: {p.sku}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-800/20 pt-2.5 mt-auto">
                    <span className="font-extrabold text-blue-600 text-xs">
                      ₹ {p.sellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    
                    <button
                      type="button"
                      disabled={isOutOfStock}
                      className="text-[9px] uppercase font-black bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded cursor-pointer transition-all flex items-center gap-0.5"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Client Registration binding details block */}
          <div className={`p-4 rounded-xl border space-y-3.5 ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-205 text-slate-850'}`}>
            <h4 className="text-xs font-bold flex items-center gap-1.5 uppercase tracking-wide text-blue-500">
              <User className="w-3.5 h-3.5" />
              <span>Link Customer Invoice Parameters</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Customer Selection</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className={`text-xs px-3 py-2 rounded-lg focus:outline-none transition-all w-full ${
                    isDarkMode
                      ? 'bg-slate-950 border border-slate-800 text-slate-200'
                      : 'bg-white border border-slate-300 text-slate-800'
                  }`}
                >
                  <option value="walk-in">✦ Walk-In Client (Manual Inputs)</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>👤 {c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Customer Full Name</label>
                <input
                  type="text"
                  value={walkInName}
                  disabled={selectedCustomerId !== 'walk-in'}
                  onChange={(e) => setWalkInName(e.target.value)}
                  placeholder="Enter name..."
                  className={`text-xs px-3 py-2 rounded-lg focus:outline-none transition-all w-full disabled:opacity-60 ${
                    isDarkMode
                      ? 'bg-slate-950 border border-slate-800 text-slate-200'
                      : 'bg-white border border-slate-300 text-slate-800'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mobile Contact Number</label>
                <div className="relative">
                  <Smartphone className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="tel"
                    value={walkInMobile}
                    disabled={selectedCustomerId !== 'walk-in'}
                    onChange={(e) => setWalkInMobile(e.target.value)}
                    placeholder="Enter 10 digit number..."
                    className={`text-xs pl-8 pr-3 py-2 rounded-lg focus:outline-none transition-all w-full disabled:opacity-60 ${
                      isDarkMode
                        ? 'bg-slate-950 border border-slate-800 text-slate-200'
                        : 'bg-white border border-slate-300 text-slate-800'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Side: Dynamic Cart checkout (4 or 5 columns) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col space-y-4 text-slate-400">
          
          <div className={`p-5 rounded-xl border flex flex-col justify-between ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`} style={{ minHeight: '430px' }}>
            
            <div className="border-b border-dashed pb-3 border-slate-800 flex items-center justify-between">
              <h3 className={`font-black text-sm flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-850'}`}>
                <ShoppingCart className="w-4.5 h-4.5 text-blue-500" />
                <span>Active Basket</span>
              </h3>
              <button
                type="button"
                onClick={resetCart}
                className="text-[9px] uppercase font-bold text-slate-400 hover:text-red-400 transition-all cursor-pointer"
              >
                Clear All
              </button>
            </div>

            {/* Cart Items list */}
            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 space-y-3">
                <div className="w-12 h-12 bg-slate-800/10 rounded-full flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-slate-500" />
                </div>
                <p className="text-[11px] text-slate-400 text-center text-slate-500 leading-normal">
                  Your billing desk basket is empty.<br />Click products on the left side to compile billing.
                </p>
              </div>
            ) : (
              <div className="flex-1 space-y-3 py-3 overflow-y-auto max-h-[230px]">
                {cart.map((item) => {
                  const itemGst = item.product.gstRate !== undefined ? item.product.gstRate : 18;
                  
                  return (
                    <div key={item.product.id} className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold truncate text-[11px] text-slate-200">
                          {item.product.name}
                        </h5>
                        <span className="text-[10px] text-blue-500 font-mono block">
                          ₹{item.product.sellingPrice} + {itemGst}% GST
                        </span>
                      </div>

                      {/* Qty controls */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.product.id, -1)}
                          className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold cursor-pointer transition-all ${
                            isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-650 hover:bg-slate-200'
                          }`}
                        >
                          <Minus className="w-2 h-2" />
                        </button>
                        
                        <span className="font-bold text-center w-5 text-xs text-slate-200">
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() => updateCartQty(item.product.id, 1)}
                          className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold cursor-pointer transition-all ${
                            isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-650 hover:bg-slate-200'
                          }`}
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>

                      <div className="min-w-[65px] text-right">
                        <span className="font-extrabold text-slate-200 text-xs">
                          ₹{(item.product.sellingPrice * item.quantity).toFixed(2)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-slate-500 hover:text-red-400 p-0.5 rounded transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Smart recommendations block */}
            {suggestion && (
              <div className="p-2.5 rounded-lg bg-blue-900/10 border border-blue-900/30 text-[10px] text-slate-300 space-y-0.5 my-1.5">
                <div className="flex items-center gap-1 text-blue-400 font-extrabold uppercase text-[8px] tracking-wider">
                  <Sparkles className="w-3 h-3 text-blue-400 animate-pulse" />
                  <span>Recommendation:</span>
                </div>
                <p className="leading-relaxed italic text-slate-200">"{suggestion}"</p>
              </div>
            )}

            <div className="border-t border-dashed border-slate-800/80 pt-3 space-y-2 mt-auto">
              
              {/* GST Destination Selector */}
              <div className="flex justify-between items-center bg-slate-950/20 p-2 rounded-lg border border-slate-800/50">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-500" />
                  <span>GST Region Code</span>
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setGstType("local")}
                    className={`px-2 py-1 text-[9px] font-bold rounded ${
                      gstType === "local" ? 'bg-blue-600 font-black text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-705'
                    }`}
                  >
                    Local (CGST+SGST)
                  </button>
                  <button
                    type="button"
                    onClick={() => setGstType("interstate")}
                    className={`px-2 py-1 text-[9px] font-bold rounded ${
                      gstType === "interstate" ? 'bg-blue-600 font-black text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-705'
                    }`}
                  >
                    Interstate (IGST)
                  </button>
                </div>
              </div>

              {/* Calculations */}
              <div className="space-y-1.5 text-xs text-slate-400 bg-slate-950/25 p-2 rounded-lg">
                <div className="flex justify-between">
                  <span>Subtotal Amount</span>
                  <span className="font-semibold text-slate-200">₹{subtotal.toFixed(2)}</span>
                </div>
                {gstType === "local" ? (
                  <>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>CGST Component</span>
                      <span className="font-medium">₹{cgstAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>SGST Component</span>
                      <span className="font-medium">₹{sgstAmount.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>IGST Component</span>
                    <span className="font-medium">₹{igstAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[11px]">
                  <span>Total Local GST ({gstType === "local" ? "CGST+SGST" : "IGST"})</span>
                  <span className="font-extrabold text-slate-200">₹{totalGst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs font-extrabold text-blue-500 pt-1 border-t border-dashed border-slate-800">
                  <span>Grand Net Payable</span>
                  <span className="text-sm font-extrabold text-blue-500">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Payment methods picker - UPI is #1 in India! */}
              <div className="grid grid-cols-4 gap-1.5 py-1">
                {['UPI', 'Cash', 'Card', 'NetBanking'].map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-1.5 px-0.5 rounded-lg text-[9px] font-black border uppercase transition-all cursor-pointer text-center ${
                      paymentMethod === method
                        ? 'bg-blue-600 border-blue-500 text-white font-black shadow-sm'
                        : isDarkMode
                          ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                          : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={checkoutLoading || cart.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer text-xs uppercase"
              >
                <CreditCard className="w-4 h-4" />
                <span>
                  {checkoutLoading ? "Recording Order..." : `Release ${paymentMethod} Invoice`}
                </span>
              </button>

            </div>

          </div>

        </div>

      </div>

      {/* Invoice Catalog / Sales History view */}
      <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4.5 h-4.5 text-blue-500" />
            <h3 className={`font-extrabold text-sm tracking-tight uppercase ${isDarkMode ? 'text-white' : 'text-slate-850'}`}>
              Sales Invoice History & Refunds Registry
            </h3>
          </div>
          <span className="text-[10px] bg-blue-900/40 text-blue-300 font-mono font-black border border-blue-800 px-2 py-1 rounded">
            ₹ TOTAL INVOICES IN REGISTRY: {salesLogs.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'} font-bold`}>
                <th className="py-2.5 px-3">Invoice No.</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Customer (Mobile)</th>
                <th className="py-2.5 px-3">Billed By</th>
                <th className="py-2.5 px-3">Total (Rupees)</th>
                <th className="py-2.5 px-3 text-center">Tax Split</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {salesLogs.map((s) => {
                const isReturned = s.status === 'Returned';
                
                return (
                  <tr key={s.id} className={`hover:bg-slate-800/10 ${isReturned ? 'italic opacity-60' : ''}`}>
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-500">
                      {s.invoiceNumber}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {new Date(s.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-200">
                      <div>{s.customerName}</div>
                      {s.customerMobile && (
                        <div className="text-[10px] text-blue-400 font-mono">{s.customerMobile}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 uppercase text-[10px] text-slate-400">
                      {s.createdBy}
                    </td>
                    <td className="py-2.5 px-3 font-extrabold text-slate-100">
                      ₹ {Number(s.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-center text-[10px] font-mono text-slate-400">
                      {(s.cgst || 0) > 0 ? `CGST+SGST: ₹${((s.cgst || 0) + (s.sgst || 0)).toFixed(2)}` : (s.igst || 0) > 0 ? `IGST: ₹${(s.igst || 0).toFixed(2)}` : `₹ 0.00`}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                        isReturned ? 'bg-red-900/30 text-red-300' : 'bg-emerald-900/30 text-emerald-300'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setPrintedInvoice(s)}
                        className="py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-bold transition-all cursor-pointer inline-flex items-center gap-1 border border-slate-750"
                      >
                        <Printer className="w-3 h-3 text-slate-400" />
                        <span>Receipt</span>
                      </button>

                      {isAdmin && !isReturned && (
                        <button
                          type="button"
                          onClick={() => handleReturnInvoice(s.id, s.invoiceNumber)}
                          className="py-1 px-2 rounded bg-red-950/40 hover:bg-red-900/60 text-[10px] text-red-300 font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Return</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {salesLogs.length === 0 && (
            <p className="text-center py-8 text-xs text-slate-500 font-medium">
              No sales invoices found in data logs.
            </p>
          )}
        </div>
      </div>

    </div>
  );
}
