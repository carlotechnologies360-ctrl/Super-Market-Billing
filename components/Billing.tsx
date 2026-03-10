
import React, { useState, useEffect, useRef } from 'react';
import { CartItem, PaymentMethod, Product, Customer, HeldBill, StoreSettings } from '../types';
import { Camera } from './Camera';
import { identifyProductsFromImage, readBarcodeFromImage } from '../services/geminiService';
import { getCustomerByMobile, saveHeldBill, getHeldBills, deleteHeldBill } from '../services/db';
import { ScanLine, Trash2, CheckCircle, ShoppingCart, Loader2, Save, Printer, PlayCircle, User, Plus, X, Search, Barcode, Layers, AlertTriangle, TrendingDown, Banknote, Smartphone, ChevronRight, Receipt } from 'lucide-react';

interface VariantQueueItem {
  matches: Product[];
  quantity: number;
  originalName: string;
}

interface BillingProps {
  products: Product[];
  settings: StoreSettings;
  onCompleteSale: (items: CartItem[], total: number, method: PaymentMethod, customerName?: string, customerMobile?: string, totalSavings?: number, cashAmount?: number, upiAmount?: number) => void;
}

export const Billing: React.FC<BillingProps> = ({ products, settings, onCompleteSale }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [scanMode, setScanMode] = useState<'product' | 'barcode'>('product'); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  // Checkout & Customer State
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerName, setCustomerName] = useState('');

  // Mixed Payment Split State
  const [mixedCash, setMixedCash] = useState<string>('');
  const [mixedUpi, setMixedUpi] = useState<string>('');

  // Editing State
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingVal, setEditingVal] = useState<string>('');

  // Manual Input State
  const [manualInput, setManualInput] = useState('');
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number>(-1);
  const manualInputRef = useRef<HTMLInputElement>(null);
  const suggestionsContainerRef = useRef<HTMLDivElement>(null);

  // Selection Queue State for multiple products with multiple variants
  const [variantQueue, setVariantQueue] = useState<VariantQueueItem[]>([]);
  
  // Held Bills State
  const [showHeldBills, setShowHeldBills] = useState(false);
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);

  // Print State
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [lastBillDetails, setLastBillDetails] = useState<{
    items: CartItem[], 
    total: number, 
    id: string, 
    date: string, 
    savings: number,
    paymentMethod: PaymentMethod,
    cashAmount?: number,
    upiAmount?: number
  } | null>(null);

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);
  const totalSavings = cart.reduce((sum, item) => {
    const diff = (item.actualPrice || item.price) - item.price;
    return sum + (diff * item.cartQuantity);
  }, 0);

  // Autopopulate or Clear Customer Name based on Mobile
  useEffect(() => {
    const fetchCustomer = async () => {
      if (customerMobile.length === 10) {
        const existing = await getCustomerByMobile(customerMobile);
        if (existing) {
          setCustomerName(existing.name);
        } else {
          // Reset name if it's a new mobile number (10 digits reached but no match)
          setCustomerName('');
        }
      } else if (customerMobile.length === 0) {
        // Reset name if mobile field is cleared
        setCustomerName('');
      }
    };
    fetchCustomer();
  }, [customerMobile]);

  // Utility to refresh held bills from the async store
  const refreshHeldBills = async () => {
    const bills = await getHeldBills();
    setHeldBills(Array.isArray(bills) ? bills : []);
  };

  useEffect(() => {
    refreshHeldBills();
  }, []);

  useEffect(() => {
    if (showCheckout && paymentMethod === PaymentMethod.MIXED) {
      setMixedCash('');
      setMixedUpi('');
    }
  }, [showCheckout, paymentMethod]);

  useEffect(() => {
    if (selectedSuggestionIndex >= 0 && suggestionsContainerRef.current) {
      const activeElement = suggestionsContainerRef.current.children[selectedSuggestionIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'auto', block: 'nearest' });
      }
    }
  }, [selectedSuggestionIndex]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setManualInput(val);
    setSelectedSuggestionIndex(-1); 

    const query = val.trim().toLowerCase();
    if (query) {
      const matches = products.filter(p => 
        p.id.toLowerCase().startsWith(query) || 
        p.barcode?.toLowerCase().startsWith(query)
      ).sort((a, b) => {
        const aExact = a.id.toLowerCase() === query;
        const bExact = b.id.toLowerCase() === query;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return 0;
      }).slice(0, 15);
      
      setSuggestions(matches);
      if (matches.length > 0) setSelectedSuggestionIndex(0);
    } else {
      setSuggestions([]);
    }
  };

  const selectSuggestion = (product: Product) => {
    addItemsToCart([{ ...product, cartQuantity: 1 }]);
    setManualInput('');
    setSuggestions([]);
    setSelectedSuggestionIndex(-1);
    manualInputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestions.length) {
        e.preventDefault();
        selectSuggestion(suggestions[selectedSuggestionIndex]);
      }
    } else if (e.key === 'Escape') {
      setSuggestions([]);
      setSelectedSuggestionIndex(-1);
    }
  };

  const handleCameraCapture = async (base64: string) => {
    setIsCameraOpen(false);
    setIsProcessing(true);
    setApiError(null);

    try {
      if (scanMode === 'product') {
        const detectedItems = await identifyProductsFromImage(base64, products);
        const finalItemsToAdd: CartItem[] = [];
        const newVariantQueue: VariantQueueItem[] = [];
        
        for (const detected of detectedItems) {
          const matches = products.filter(p => p.name.toLowerCase().trim() === detected.productName.toLowerCase().trim());
          
          if (matches.length === 1) {
            finalItemsToAdd.push({ ...matches[0], cartQuantity: detected.quantity || 1 });
          } else if (matches.length > 1) {
            newVariantQueue.push({
                matches,
                quantity: detected.quantity || 1,
                originalName: detected.productName
            });
          } else {
            const fuzzyMatches = products.filter(p => p.name.toLowerCase().includes(detected.productName.toLowerCase()));
            if (fuzzyMatches.length === 1) {
              finalItemsToAdd.push({ ...fuzzyMatches[0], cartQuantity: detected.quantity || 1 });
            } else if (fuzzyMatches.length > 1) {
              newVariantQueue.push({
                matches: fuzzyMatches,
                quantity: detected.quantity || 1,
                originalName: detected.productName
              });
            }
          }
        }

        if (finalItemsToAdd.length > 0) addItemsToCart(finalItemsToAdd);
        if (newVariantQueue.length > 0) setVariantQueue(newVariantQueue);
      
      } else {
        const barcode = await readBarcodeFromImage(base64);
        if (barcode) {
          const matches = products.filter(p => p.barcode === barcode);
          if (matches.length === 1) {
            addItemsToCart([{ ...matches[0], cartQuantity: 1 }]);
          } else if (matches.length > 1) {
             setVariantQueue([{
                 matches,
                 quantity: 1,
                 originalName: 'Scanned Barcode'
             }]);
          } else {
            alert(`Barcode ${barcode} not found in inventory.`);
          }
        }
      }

    } catch (error: any) {
      console.error(error);
      setApiError("AI processing issue. Please use manual ID entry.");
      setTimeout(() => setApiError(null), 5000);
    } finally {
      setIsProcessing(false);
    }
  };

  const addItemsToCart = (newItems: CartItem[]) => {
    setCart(prev => {
      const updated = [...prev];
      newItems.forEach(newItem => {
        const existingIdx = updated.findIndex(i => 
          i.id === newItem.id && 
          i.name === newItem.name && 
          (i.sizeName || '') === (newItem.sizeName || '')
        );
        
        if (existingIdx > -1) {
          updated[existingIdx].cartQuantity += (newItem.cartQuantity || 1);
        } else {
          updated.push({ ...newItem, cartQuantity: newItem.cartQuantity || 1 });
        }
      });
      return updated;
    });
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
       selectSuggestion(suggestions[selectedSuggestionIndex]);
       return;
    }
    const query = manualInput.trim(); 
    if (!query) return;
    const matches = products.filter(p => p.id.toLowerCase() === query.toLowerCase() || p.barcode === query);
    if (matches.length === 1) {
       addItemsToCart([{ ...matches[0], cartQuantity: 1 }]);
       setManualInput(''); 
       setSuggestions([]);
       setSelectedSuggestionIndex(-1);
    } else if (matches.length > 1) {
       setVariantQueue([{
           matches,
           quantity: 1,
           originalName: query
       }]);
       setManualInput('');
       setSuggestions([]);
       setSelectedSuggestionIndex(-1);
    } else {
      alert("Product not found.");
    }
  };

  const handleVariantSelect = (product: Product) => {
    if (variantQueue.length === 0) return;
    
    const [current, ...rest] = variantQueue;
    addItemsToCart([{ ...product, cartQuantity: current.quantity }]);
    setVariantQueue(rest);
  };

  const handleQtyFocus = (index: number, currentQty: number) => {
    setEditingIndex(index);
    setEditingVal(currentQty.toString());
  };

  const handleQtyChange = (val: string) => {
    if (val.includes('-')) return;
    setEditingVal(val);
    const num = parseFloat(val);
    if (!isNaN(num) && editingIndex !== null) {
       if (num < 0) return;
       setCart(prev => prev.map((item, i) => i === editingIndex ? { ...item, cartQuantity: num } : item));
    }
  };

  const handleQtyBlur = () => {
    setEditingIndex(null);
    setEditingVal('');
    setCart(prev => prev.map((item, i) => {
      if (isNaN(item.cartQuantity) || item.cartQuantity < 0) return { ...item, cartQuantity: 0 };
      return item;
    }));
  };

  const removeItem = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const handleHoldBill = async () => {
    if (cart.length === 0) return;
    const bill: HeldBill = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      customerName,
      customerMobile,
      items: cart
    };
    await saveHeldBill(bill);
    await refreshHeldBills();
    setCart([]);
    setCustomerName('');
    setCustomerMobile('');
    alert("Bill held successfully.");
  };

  const handleResumeBill = async (bill: HeldBill) => {
    setCart(bill.items);
    setCustomerName(bill.customerName || '');
    setCustomerMobile(bill.customerMobile || '');
    await deleteHeldBill(bill.id);
    await refreshHeldBills();
    setShowHeldBills(false);
  };

  const handlePay = () => {
    let cashVal: number | undefined = undefined;
    let upiVal: number | undefined = undefined;

    if (paymentMethod === PaymentMethod.MIXED) {
       cashVal = parseFloat(mixedCash) || 0;
       upiVal = parseFloat(mixedUpi) || 0;
       if (Math.abs((cashVal + upiVal) - cartTotal) > 0.01) {
          alert(`Total split (₹${(cashVal + upiVal).toFixed(2)}) must match bill total (₹${cartTotal.toFixed(2)})`);
          return;
       }
    }

    onCompleteSale(cart, cartTotal, paymentMethod, customerName, customerMobile, totalSavings, cashVal, upiVal);
    
    setLastBillDetails({
      items: [...cart],
      total: cartTotal,
      savings: totalSavings,
      id: `INV-${Date.now().toString().slice(-6)}`,
      date: new Date().toLocaleString(),
      paymentMethod: paymentMethod,
      cashAmount: cashVal,
      upiAmount: upiVal
    });
    
    setCart([]);
    setCustomerName('');
    setCustomerMobile('');
    setShowCheckout(false);
    setShowPrintModal(true);
  };

  const handlePrintConfirm = () => {
    window.print();
    setShowPrintModal(false);
  };

  if (isCameraOpen) {
    return <Camera onCapture={handleCameraCapture} onClose={() => setIsCameraOpen(false)} autoCaptureEnabled={true} />;
  }

  const currentSelection = variantQueue[0];
  const queueSize = variantQueue.length;

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* Top Bar */}
      <div className="bg-white p-4 shadow-sm z-10 border-b space-y-4">
        {apiError && (
          <div className="bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center justify-between animate-in slide-in-from-top duration-300">
             <div className="flex items-center gap-2 font-bold">
               <AlertTriangle size={18} />
               <span>{apiError}</span>
             </div>
             <button onClick={() => setApiError(null)} className="hover:bg-white/20 p-1 rounded">
                <X size={16} />
             </button>
          </div>
        )}

        <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Billing Counter</h1>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{new Date().toDateString()}</p>
            </div>

            <div className="flex-1 max-w-xl mx-6 relative">
                <form onSubmit={handleManualSubmit} className="relative flex gap-2">
                   <div className="relative flex-1">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                          <Search size={20} />
                      </div>
                      <input 
                          ref={manualInputRef}
                          type="text" 
                          value={manualInput}
                          onChange={handleInputChange}
                          onKeyDown={handleKeyDown}
                          placeholder="Type Product ID or Barcode..."
                          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-400 rounded-xl outline-none transition-all text-slate-900 font-black shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          autoFocus
                          autoComplete="off"
                      />
                      
                      {manualInput.trim() && (
                        <div 
                          ref={suggestionsContainerRef}
                          className="absolute top-full left-0 right-0 bg-white shadow-2xl rounded-2xl border border-gray-100 mt-2 z-50 max-h-[400px] overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-top-2 duration-200"
                        >
                          {suggestions.length > 0 ? (
                            suggestions.map((p, idx) => (
                              <div 
                                key={`${p.id}-${idx}`}
                                onMouseEnter={() => setSelectedSuggestionIndex(idx)}
                                onClick={() => selectSuggestion(p)}
                                className={`p-4 cursor-pointer border-b border-gray-50 last:border-0 flex gap-4 items-center transition-all ${
                                  selectedSuggestionIndex === idx 
                                    ? 'bg-blue-600 text-white' 
                                    : 'hover:bg-blue-50 text-slate-900'
                                }`}
                              >
                                 <div className="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100 shadow-inner">
                                    {p.imageUrl ? (
                                      <img src={p.imageUrl} className="w-full h-full object-cover" alt={p.name} />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                                        <ShoppingCart size={16} />
                                      </div>
                                    )}
                                 </div>

                                 <div className="flex-1 flex flex-col min-w-0">
                                   <div className="flex items-center justify-between gap-2">
                                     <span className={`font-black truncate ${selectedSuggestionIndex === idx ? 'text-white' : 'text-slate-900'}`}>
                                       {p.name}
                                     </span>
                                     <span className={`text-[9px] font-mono px-2 py-1 rounded-full ${selectedSuggestionIndex === idx ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                        ID: {p.id}
                                     </span>
                                   </div>
                                   
                                   <div className="flex items-center gap-3 mt-1">
                                      {p.sizeName && (
                                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border uppercase ${
                                          selectedSuggestionIndex === idx 
                                            ? 'bg-blue-500 border-blue-400 text-white' 
                                            : 'bg-blue-50 border-blue-100 text-blue-600'
                                        }`}>
                                          {p.sizeName}
                                        </span>
                                      )}
                                      <span className={`text-sm font-black ${selectedSuggestionIndex === idx ? 'text-white' : 'text-blue-600'}`}>
                                        ₹{p.price.toFixed(2)}
                                      </span>
                                   </div>
                                 </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-10 text-center text-slate-400 flex flex-col items-center gap-3">
                               <AlertTriangle className="text-slate-200" size={40} />
                               <p className="font-bold uppercase tracking-widest text-xs">No matching products</p>
                            </div>
                          )}
                        </div>
                      )}
                   </div>

                   <button 
                     type="button"
                     onClick={() => { setScanMode('barcode'); setIsCameraOpen(true); }}
                     className="px-6 bg-slate-800 text-white rounded-xl flex items-center gap-2 hover:bg-black transition-all active:scale-95 shadow-md font-black uppercase text-xs tracking-widest"
                   >
                     <Barcode size={20} /> <span className="hidden md:inline">Scan</span>
                   </button>
                </form>
            </div>
            
            <div className="flex gap-2">
              <button onClick={() => setShowHeldBills(true)} className="px-5 py-3 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all">
                <PlayCircle size={18} /> Resume ({heldBills.length})
              </button>
              <button onClick={handleHoldBill} className="px-5 py-3 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all">
                <Save size={18} /> Hold
              </button>
            </div>
        </div>
        
        <div className="flex gap-4 bg-slate-50 p-4 rounded-2xl border border-gray-400 w-fit shadow-sm">
           <div className="flex items-center gap-3 px-2">
             <User size={18} className="text-slate-400" />
             <input 
               type="text" 
               inputMode="numeric"
               placeholder="Mobile No." 
               className="bg-transparent text-sm w-44 outline-none text-slate-900 font-black"
               value={customerMobile}
               onChange={(e) => setCustomerMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
               maxLength={10}
             />
           </div>
           <div className="w-px bg-slate-300"></div>
           <input 
             type="text" 
             placeholder="Customer Name" 
             className="bg-transparent text-sm w-64 outline-none text-slate-900 font-black px-2"
             value={customerName}
             onChange={(e) => setCustomerName(e.target.value)}
           />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col p-6 overflow-y-auto no-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-6 animate-in fade-in duration-700">
               <div className="w-32 h-32 bg-slate-100 rounded-[2.5rem] flex items-center justify-center rotate-3 border-2 border-dashed border-slate-200 shadow-inner">
                 <ShoppingCart size={50} strokeWidth={1.5} />
               </div>
               <div className="text-center">
                  <p className="text-xl font-black text-slate-400 uppercase tracking-tighter">Your cart is empty</p>
                  <p className="text-xs font-medium text-slate-300 mt-1 uppercase tracking-widest">Start adding products to begin</p>
               </div>
               <div className="flex gap-4">
                  <button 
                    onClick={() => manualInputRef.current?.focus()}
                    className="bg-white border-2 border-slate-100 text-slate-400 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                  >
                    Enter ID
                  </button>
                  <button 
                    onClick={() => { setScanMode('product'); setIsCameraOpen(true); }}
                    className="bg-blue-600 text-white px-10 py-3 rounded-2xl shadow-xl shadow-blue-100 font-black uppercase text-xs tracking-widest flex items-center space-x-2 hover:bg-blue-700 transition-all active:scale-95"
                  >
                    <ScanLine size={20} />
                    <span>Capture Image</span>
                  </button>
               </div>
            </div>
          ) : (
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
               <table className="w-full text-left border-collapse">
                 <thead className="bg-slate-50/50 border-b border-slate-100">
                   <tr>
                     <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product</th>
                     <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Prices</th>
                     <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantity</th>
                     <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                     <th className="p-5"></th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                   {cart.map((item, idx) => {
                     const itemSaving = ((item.actualPrice || item.price) - item.price) * item.cartQuantity;
                     return (
                       <tr key={`${item.id}-${idx}`} className="hover:bg-blue-50/30 transition-colors group">
                         <td className="p-5">
                           <div className="flex items-center gap-4">
                              <div className="w-14 h-14 rounded-2xl bg-slate-50 overflow-hidden flex-shrink-0 border border-slate-100 shadow-inner transition-transform group-hover:scale-105">
                                 {item.imageUrl && <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.name}/>}
                              </div>
                              <div>
                                 <p className="font-black text-slate-800 text-base leading-tight mb-1">{item.name}</p>
                                 <div className="flex items-center gap-2">
                                   {item.sizeName && (
                                     <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-100 font-black uppercase">
                                       {item.sizeName}
                                     </span>
                                   )}
                                   <span className="text-[9px] text-slate-400 font-mono uppercase tracking-tighter">ID: {item.id}</span>
                                 </div>
                              </div>
                           </div>
                         </td>
                         <td className="p-5">
                            <div className="flex flex-col">
                               <span className="text-xs text-slate-300 line-through font-bold">₹{(item.actualPrice || item.price).toFixed(2)}</span>
                               <span className="text-lg font-black text-slate-800">₹{item.price.toFixed(2)}</span>
                            </div>
                         </td>
                         <td className="p-5">
                            <div className="relative w-24">
                              <input 
                                type="number" 
                                step="any"
                                min="0"
                                className="w-full text-center border-2 border-slate-100 rounded-xl p-3 text-base font-black bg-white text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                                value={editingIndex === idx ? editingVal : item.cartQuantity}
                                onFocus={() => handleQtyFocus(idx, item.cartQuantity)}
                                onChange={(e) => handleQtyChange(e.target.value)}
                                onBlur={handleQtyBlur}
                                onClick={(e) => (e.target as HTMLInputElement).select()}
                              />
                            </div>
                         </td>
                         <td className="p-5">
                            <div className="flex flex-col">
                               <span className="text-lg font-black text-slate-900">₹{(item.price * item.cartQuantity).toFixed(2)}</span>
                               {itemSaving > 0 && (
                                 <span className="text-[10px] font-black text-green-600 flex items-center gap-1 uppercase tracking-tighter">
                                   <TrendingDown size={10} /> Saved ₹{itemSaving.toFixed(2)}
                                 </span>
                               )}
                            </div>
                         </td>
                         <td className="p-5 text-right">
                            <button 
                              onClick={() => removeItem(idx)} 
                              className="text-red-500 hover:text-red-700 p-3 bg-red-50 hover:bg-red-100 rounded-2xl transition-all shadow-sm"
                              title="Remove Item"
                            >
                              <Trash2 size={20} />
                            </button>
                         </td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
            </div>
          )}
        </div>

        <div className="w-96 bg-white border-l border-gray-100 flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
           <div className="p-8 flex-1 overflow-y-auto no-scrollbar">
              <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3 uppercase tracking-tighter">
                 <div className="p-2 bg-blue-600 text-white rounded-xl rotate-3 shadow-lg shadow-blue-100">
                    <ShoppingCart size={20} />
                 </div>
                 Bill Summary
              </h3>
              
              <div className="space-y-5">
                 <div className="flex justify-between text-slate-400 text-xs font-black uppercase tracking-widest">
                    <span>Items</span>
                    <span className="text-slate-900">{cart.reduce((s, i) => s + i.cartQuantity, 0)} units</span>
                 </div>
                 <div className="flex justify-between text-slate-400 text-xs font-black uppercase tracking-widest">
                    <span>Subtotal</span>
                    <span className="text-slate-900">₹{cartTotal.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between items-end text-3xl font-black text-slate-900 border-t-2 border-dashed border-slate-100 pt-6 pb-2">
                    <span className="text-xs uppercase tracking-[0.2em] mb-2 text-slate-400">Total</span>
                    <span>₹{cartTotal.toFixed(2)}</span>
                 </div>

                 {totalSavings > 0 && (
                   <div className="mt-6 p-5 bg-green-50/50 border-2 border-green-100 rounded-[2rem] space-y-4 animate-in slide-in-from-bottom-2">
                      <p className="text-[10px] font-black text-green-800 uppercase tracking-widest flex items-center gap-2">
                        <TrendingDown size={14} /> Saving Details
                      </p>
                      <div className="space-y-3 max-h-48 overflow-y-auto pr-1 no-scrollbar">
                        {cart.map((item, idx) => {
                          const saving = ((item.actualPrice || item.price) - item.price) * item.cartQuantity;
                          if (saving <= 0) return null;
                          return (
                            <div key={`saving-side-${idx}`} className="flex justify-between text-[10px] text-green-700 font-bold uppercase tracking-tight">
                               <div className="flex flex-col truncate mr-2">
                                  <span className="truncate">{item.name}</span>
                                  <span className="opacity-60 text-[8px]">Saved ₹{((item.actualPrice || item.price) - item.price).toFixed(2)} each</span>
                               </div>
                               <span className="flex-shrink-0">₹{saving.toFixed(2)}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-green-100">
                         <span className="text-[10px] font-black text-green-800 uppercase tracking-widest">Total Savings</span>
                         <span className="text-2xl font-black text-green-800">₹{totalSavings.toFixed(2)}</span>
                      </div>
                   </div>
                 )}
              </div>
           </div>
           
           <div className="p-8 bg-slate-50/50 border-t border-slate-100 space-y-4">
              <button 
                onClick={() => { setScanMode('product'); setIsCameraOpen(true); }}
                className="w-full bg-white border-2 border-blue-600 text-blue-600 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-50 hover:bg-blue-50 transition-all flex justify-center items-center gap-3 active:scale-95"
              >
                <ScanLine size={22} /> Capture Image
              </button>
              <button 
                disabled={cart.length === 0}
                onClick={() => setShowCheckout(true)}
                className={`w-full py-5 rounded-2xl font-black text-base uppercase tracking-[0.2em] shadow-2xl transition-all flex justify-center items-center gap-3 active:scale-95 ${cart.length === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'}`}
              >
                <CheckCircle size={22} /> Checkout
              </button>
           </div>
        </div>
      </div>

      {isProcessing && (
        <div className="fixed inset-0 bg-slate-900/40 z-[100] flex flex-col items-center justify-center text-white backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl flex flex-col items-center gap-4">
             <Loader2 size={50} className="animate-spin text-blue-600" />
             <p className="font-black text-slate-800 uppercase tracking-widest text-sm">
                {scanMode === 'barcode' ? 'Reading Barcode' : 'AI Analysis In Progress'}
             </p>
          </div>
        </div>
      )}

      {showHeldBills && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
              <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
                 <h3 className="font-black text-slate-800 uppercase tracking-tighter text-xl">Held Bills</h3>
                 <button onClick={() => setShowHeldBills(false)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={20} /></button>
              </div>
              <div className="p-6 max-h-96 overflow-y-auto no-scrollbar space-y-3">
                 {heldBills.length === 0 && <p className="text-center text-slate-400 py-10 font-bold uppercase text-xs tracking-widest">No bills on hold</p>}
                 {heldBills.map((bill, index) => (
                   <div key={bill.id} className="border-2 border-slate-50 rounded-2xl p-4 hover:border-blue-200 hover:bg-blue-50 cursor-pointer flex justify-between items-center transition-all group" onClick={() => handleResumeBill(bill)}>
                      <div>
                         <p className="font-black text-slate-800">{new Date(bill.timestamp).toLocaleTimeString()}</p>
                         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{bill.customerName || `Customer #${index + 1}`} • {bill.items.length} Items</p>
                      </div>
                      <div className="p-2 bg-blue-100 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <PlayCircle size={24} />
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {variantQueue.length > 0 && currentSelection && (
        <div className="fixed inset-0 z-[110] bg-black/70 flex items-center justify-center p-4 backdrop-blur-md">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
                 <h3 className="font-black text-slate-800 flex items-center gap-3 uppercase tracking-tighter text-xl">
                   <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg">
                      <Layers size={20} />
                   </div>
                   Select Variant
                 </h3>
                 <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-blue-600 bg-blue-100 px-2 py-1 rounded-full uppercase">
                       {queueSize > 1 ? `Item 1 of ${queueSize}` : 'Final Item'}
                    </span>
                    <button onClick={() => setVariantQueue([])} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={20} /></button>
                 </div>
              </div>
              <div className="p-2 max-h-96 overflow-y-auto no-scrollbar">
                 <p className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                   {currentSelection.matches[0]?.name} is available in multiple sizes
                 </p>
                 {currentSelection.matches.map((variant, idx) => (
                   <button 
                     key={`${variant.id}-${variant.sizeName}-${idx}`}
                     onClick={() => handleVariantSelect(variant)}
                     className="w-full flex items-center justify-between p-5 hover:bg-blue-50 border-b last:border-0 border-slate-50 transition-colors group"
                   >
                     <div className="text-left">
                        <p className="font-black text-slate-900 text-lg leading-tight">{variant.sizeName || 'Standard'}</p>
                        <p className="text-sm font-bold text-blue-600 mt-1">₹{variant.price.toFixed(2)}</p>
                     </div>
                     <div className="p-2 rounded-full border border-slate-100 group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:text-white transition-all">
                        <ChevronRight size={20} />
                     </div>
                   </button>
                 ))}
              </div>
              <div className="p-6 bg-blue-50/50 border-t border-blue-100">
                 <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest text-center">
                    Please select the correct weight/size to add to cart
                 </p>
              </div>
           </div>
        </div>
      )}

      {showCheckout && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white w-full max-w-md p-8 rounded-[3rem] shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar">
              <div className="flex justify-between items-start mb-8">
                 <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Checkout</h2>
                 <button onClick={() => setShowCheckout(false)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={20} /></button>
              </div>
              
              <div className="mb-8 p-6 bg-green-50 rounded-[2rem] border-2 border-green-100 flex flex-col items-center">
                <span className="text-green-700 font-black uppercase text-[10px] tracking-[0.2em] mb-2">Total Payable</span>
                <span className="text-5xl font-black text-green-800">₹{cartTotal.toFixed(2)}</span>
              </div>

              <div className="mb-10">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1">Payment Method</label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.values(PaymentMethod).map(method => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`py-5 px-2 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${paymentMethod === method ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100' : 'bg-slate-50 border-slate-50 text-slate-400 hover:border-slate-200'}`}
                    >
                      {method}
                    </button>
                  ))}
                </div>

                {paymentMethod === PaymentMethod.MIXED && (
                   <div className="mt-8 space-y-4 p-6 bg-slate-50 rounded-3xl border border-slate-100 animate-in fade-in slide-in-from-top-2">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center mb-2">Split the collection</p>
                      
                      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm">
                         <div className="w-12 h-12 rounded-2xl bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                            <Banknote size={24} />
                         </div>
                         <div className="flex-1">
                            <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Cash Amount</label>
                            <input 
                               type="number" 
                               value={mixedCash}
                               placeholder="0.00"
                               onChange={e => {
                                  const val = e.target.value;
                                  setMixedCash(val);
                                  const cash = parseFloat(val) || 0;
                                  setMixedUpi(Math.max(0, cartTotal - cash).toFixed(2));
                               }}
                               className="w-full bg-transparent font-black text-xl text-slate-800 outline-none"
                            />
                         </div>
                      </div>

                      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm">
                         <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                            <Smartphone size={24} />
                         </div>
                         <div className="flex-1">
                            <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">UPI Amount</label>
                            <input 
                               type="number" 
                               value={mixedUpi}
                               placeholder="0.00"
                               onChange={e => {
                                  const val = e.target.value;
                                  setMixedUpi(val);
                                  const upi = parseFloat(val) || 0;
                                  setMixedCash(Math.max(0, cartTotal - upi).toFixed(2));
                               }}
                               className="w-full bg-transparent font-black text-xl text-slate-800 outline-none"
                            />
                         </div>
                      </div>

                      <div className="flex justify-between items-center px-2 pt-2 text-[9px] font-black uppercase tracking-widest">
                         <span className="text-slate-400">Total Check:</span>
                         <span className={Math.abs((parseFloat(mixedCash) || 0) + (parseFloat(mixedUpi) || 0) - cartTotal) < 0.01 ? 'text-green-600' : 'text-red-500 animate-pulse'}>
                            ₹{((parseFloat(mixedCash) || 0) + (parseFloat(mixedUpi) || 0)).toFixed(2)}
                         </span>
                      </div>
                   </div>
                )}
              </div>

              <button 
                onClick={handlePay}
                className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-2xl font-black text-base shadow-2xl active:scale-95 transition-all uppercase tracking-[0.2em]"
              >
                Finish Sale
              </button>
           </div>
        </div>
      )}

      {showPrintModal && lastBillDetails && (
        <div className="fixed inset-0 z-[120] bg-slate-900/70 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              {/* Receipt Preview Container */}
              <div className="p-6 bg-slate-50 border-b flex items-center justify-between">
                 <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                    <Receipt size={20} className="text-blue-600" /> Bill Preview
                 </h2>
                 <button onClick={() => setShowPrintModal(false)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><X size={20}/></button>
              </div>

              <div className="p-6 max-h-[60vh] overflow-y-auto no-scrollbar bg-slate-200/50">
                 {/* Visual Bill Representation */}
                 <div className="bg-white shadow-lg p-6 rounded-lg text-black font-mono text-[11px] border border-slate-200 relative">
                    {/* Decorative Receipt Edge */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-[radial-gradient(circle,transparent_40%,#e2e8f0_41%)] bg-[length:10px_10px]"></div>
                    
                    <div className="text-center mb-4 pb-4 border-b border-black/10">
                       <p className="font-black text-sm uppercase tracking-tighter mb-0.5 text-black">{settings.name || 'SMART MART'}</p>
                       <p className="text-[9px] text-black font-bold">{settings.address || 'Address not set'}</p>
                       <p className="text-[9px] text-black font-bold">Ph: {settings.contact || 'Phone not set'}</p>
                    </div>
                    
                    <div className="space-y-1 mb-4 pb-2 border-b border-dashed border-black/20 text-black">
                       <p>Bill No: <span className="font-black">{lastBillDetails.id}</span></p>
                       <p>Date: {lastBillDetails.date}</p>
                       <p>Payment: {lastBillDetails.paymentMethod}</p>
                    </div>

                    <table className="w-full mb-4 text-black">
                       <thead className="border-b border-black/20">
                          <tr className="font-black text-left">
                             <th className="py-1">Items</th>
                             <th className="py-1 text-right">MRP</th>
                             <th className="py-1 text-right">Qty</th>
                             <th className="py-1 text-right">Amt</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-black/10">
                          {lastBillDetails.items.map((item, i) => {
                             const savingPerUnit = (item.actualPrice || item.price) - item.price;
                             const itemTotalSaving = savingPerUnit * item.cartQuantity;
                             return (
                               <tr key={i}>
                                  <td className="py-1.5 font-bold leading-tight text-black">
                                    {item.name} <br/>
                                    <div className="flex flex-col">
                                      {item.sizeName && (
                                        <span className="text-[8px] font-black text-black uppercase tracking-widest">{item.sizeName}</span>
                                      )}
                                      {itemTotalSaving > 0 && (
                                        <span className="text-[8px] font-black text-black uppercase tracking-tighter italic">Saved: ₹{itemTotalSaving.toFixed(2)}</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-1.5 text-right font-bold text-black line-through italic opacity-70">
                                     {item.actualPrice && item.actualPrice > item.price ? `₹${item.actualPrice.toFixed(2)}` : ''}
                                  </td>
                                  <td className="py-1.5 text-right font-black text-black">{item.cartQuantity}</td>
                                  <td className="py-1.5 text-right font-black text-black">{(item.price * item.cartQuantity).toFixed(2)}</td>
                               </tr>
                             );
                          })}
                       </tbody>
                    </table>

                    <div className="space-y-2 pt-2 border-t-2 border-dashed border-black/20 text-black">
                       <div className="flex justify-between font-black text-sm">
                          <span>TOTAL</span>
                          <span>₹{lastBillDetails.total.toFixed(2)}</span>
                       </div>

                       {lastBillDetails.savings > 0 && (
                          <div className="flex justify-between font-black text-[9px] border-t border-black/5 pt-1">
                             <span>TOTAL SAVINGS</span>
                             <span>₹{lastBillDetails.savings.toFixed(2)}</span>
                          </div>
                       )}
                       
                       {lastBillDetails.paymentMethod === PaymentMethod.MIXED && (
                         <div className="text-[9px] font-bold space-y-0.5 pl-2 border-l border-black/20">
                            <div className="flex justify-between"><span>CASH:</span><span>₹{lastBillDetails.cashAmount?.toFixed(2)}</span></div>
                            <div className="flex justify-between"><span>UPI:</span><span>₹{lastBillDetails.upiAmount?.toFixed(2)}</span></div>
                         </div>
                       )}
                    </div>

                    <div className="text-center mt-6 text-black font-bold text-[9px]">
                       <p>*** THANK YOU VISIT AGAIN ***</p>
                    </div>
                 </div>
              </div>
              
              <div className="p-8 space-y-3 bg-white">
                <button 
                   onClick={handlePrintConfirm}
                   className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                   <Printer size={20} /> Print Receipt
                </button>
                <button 
                   onClick={() => setShowPrintModal(false)}
                   className="w-full text-slate-400 font-black py-2 hover:text-slate-600 text-[10px] uppercase tracking-[0.2em] transition-colors"
                >
                   Later
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Printable template */}
      <div id="printable-section" className="hidden print:block fixed inset-0 bg-white z-[200] p-8 text-black top-0 left-0">
         {lastBillDetails && (
            <div className="max-w-md mx-auto font-mono text-xs">
               <div className="text-center mb-6 border-b-2 border-black pb-4">
                  <h1 className="text-xl font-bold uppercase tracking-tighter">{settings.name || 'SMART MART'}</h1>
                  <p>{settings.address || 'Address not set'}</p>
                  <p>Ph: {settings.contact || 'Phone not set'}</p>
               </div>
               
               <div className="border-b border-dashed border-black py-2 mb-2">
                  <p>Bill No: {lastBillDetails.id}</p>
                  <p>Date: {lastBillDetails.date}</p>
                  {customerName && <p>Customer: {customerName}</p>}
                  <p>Mode: {lastBillDetails.paymentMethod}</p>
               </div>

               <table className="w-full text-left mb-4 border-collapse">
                  <thead>
                    <tr className="border-b border-black font-bold">
                       <th className="py-1">Description</th>
                       <th className="py-1 text-right">MRP</th>
                       <th className="py-1 text-right">Qty</th>
                       <th className="py-1 text-right">Amt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastBillDetails.items.map((item, i) => {
                      const savingPerUnit = (item.actualPrice || item.price) - item.price;
                      const itemTotalSaving = savingPerUnit * item.cartQuantity;
                      return (
                        <React.Fragment key={i}>
                          <tr>
                             <td className="pt-2 font-bold text-black">
                               {item.name} {item.sizeName ? `(${item.sizeName})` : ''}
                               {itemTotalSaving > 0 && (
                                 <div className="text-[10px] font-black italic">(Saved: ₹{itemTotalSaving.toFixed(2)})</div>
                               )}
                             </td>
                             <td className="pt-2 text-right font-bold text-black line-through">
                                {item.actualPrice && item.actualPrice > item.price ? `₹${item.actualPrice.toFixed(2)}` : ''}
                             </td>
                             <td className="pt-2 text-right font-black text-black">{item.cartQuantity}</td>
                             <td className="pt-2 text-right font-black text-black">{(item.price * item.cartQuantity).toFixed(2)}</td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
               </table>

               <div className="border-t-2 border-dashed border-black pt-2 mb-4">
                  <div className="flex justify-between font-black text-base text-black">
                     <span>GRAND TOTAL</span>
                     <span>₹{lastBillDetails.total.toFixed(2)}</span>
                  </div>

                  {lastBillDetails.savings > 0 && (
                    <div className="flex justify-between font-black text-sm text-black border-t border-black/10 mt-1 pt-1">
                       <span>TOTAL SAVINGS</span>
                       <span>₹{lastBillDetails.savings.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {lastBillDetails.paymentMethod === PaymentMethod.MIXED && (
                     <div className="mt-2 text-[10px] space-y-1 border-t border-black/10 pt-2 text-black font-bold">
                        <div className="flex justify-between">
                           <span>CASH PAID:</span>
                           <span>₹{lastBillDetails.cashAmount?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                           <span>UPI PAID:</span>
                           <span>₹{lastBillDetails.upiAmount?.toFixed(2)}</span>
                        </div>
                     </div>
                  )}

                  {lastBillDetails.savings > 0 && (
                    <p className="text-[10px] text-center mt-4 uppercase tracking-widest font-black text-black">YOU SAVED MONEY!</p>
                  )}
               </div>

               <div className="text-center mt-10">
                  <p className="font-bold text-black">*** THANK YOU! VISIT AGAIN ***</p>
               </div>
            </div>
         )}
      </div>
    </div>
  );
};
