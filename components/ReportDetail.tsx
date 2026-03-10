
import React, { useState, useMemo, useEffect } from 'react';
import { Sale, RevenuePeriod, PaymentMethod, StoreSettings } from '../types';
import { Search, Printer, Eye, X, ArrowLeft, FileText, Edit2, Banknote, Smartphone, Receipt } from 'lucide-react';

interface ReportDetailProps {
  sales: Sale[];
  settings?: StoreSettings; // Added settings prop for store info on receipt
  filter: {
    period: RevenuePeriod;
    startDate?: string;
    endDate?: string;
  };
  onUpdateSale: (updatedSale: Sale) => void;
  onBack: () => void;
}

export const ReportDetail: React.FC<ReportDetailProps> = ({ sales, settings, filter, onUpdateSale, onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  
  // Edit State
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [editCashAmount, setEditCashAmount] = useState<string>('');
  const [editUpiAmount, setEditUpiAmount] = useState<string>('');

  const filteredSales = useMemo(() => {
    const now = new Date();
    
    const dateFiltered = sales.filter(sale => {
      const saleDate = new Date(sale.date);
      if (filter.period === 'Daily') {
        return saleDate.toDateString() === now.toDateString();
      } else if (filter.period === 'Weekly') {
        const oneWeekAgo = new Date(now);
        oneWeekAgo.setDate(now.getDate() - 7);
        return saleDate >= oneWeekAgo;
      } else if (filter.period === 'Monthly') {
        return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
      } else if (filter.period === 'Custom' && filter.startDate && filter.endDate) {
         const start = new Date(filter.startDate);
         const end = new Date(filter.endDate);
         end.setHours(23, 59, 59);
         return saleDate >= start && saleDate <= end;
      }
      return true;
    });

    return dateFiltered.filter(sale => {
      return (
        sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.customerMobile?.includes(searchTerm)
      );
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, filter, searchTerm]);

  const totalAmount = useMemo(() => filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0), [filteredSales]);

  // When edit mixed is selected, we reset amounts to empty to show placeholders
  useEffect(() => {
    if (isEditingPayment && editingSale && editPaymentMethod === PaymentMethod.MIXED) {
      if (!editCashAmount && !editUpiAmount) {
         setEditCashAmount('');
         setEditUpiAmount('');
      }
    }
  }, [isEditingPayment, editPaymentMethod, editingSale]);

  const handlePrint = () => {
    window.print();
  };

  const openEditPayment = (sale: Sale) => {
     setEditingSale(sale);
     setEditPaymentMethod(sale.paymentMethod);
     setEditCashAmount(sale.cashAmount?.toFixed(2) || '');
     setEditUpiAmount(sale.upiAmount?.toFixed(2) || '');
     setIsEditingPayment(true);
  };

  const handleSavePaymentEdit = () => {
    if (!editingSale) return;

    let cash = 0;
    let upi = 0;

    if (editPaymentMethod === PaymentMethod.MIXED) {
      cash = parseFloat(editCashAmount) || 0;
      upi = parseFloat(editUpiAmount) || 0;
      if (Math.abs((cash + upi) - editingSale.totalAmount) > 0.01) {
        alert(`Split total must match bill total (₹${editingSale.totalAmount.toFixed(2)})`);
        return;
      }
    } else if (editPaymentMethod === PaymentMethod.CASH) {
      cash = editingSale.totalAmount;
      upi = 0;
    } else if (editPaymentMethod === PaymentMethod.UPI) {
      cash = 0;
      upi = editingSale.totalAmount;
    } else if (editPaymentMethod === PaymentMethod.CARD) {
      cash = 0;
      upi = editingSale.totalAmount;
    }

    const updated: Sale = {
      ...editingSale,
      paymentMethod: editPaymentMethod,
      cashAmount: cash,
      upiAmount: upi
    };

    onUpdateSale(updated);
    
    if (selectedSale?.id === editingSale.id) {
       setSelectedSale(updated);
    }
    
    setIsEditingPayment(false);
    setEditingSale(null);
  };

  const getReportTitle = () => {
    switch(filter.period) {
      case 'Daily': return "Today's Sales Report";
      case 'Weekly': return "Last 7 Days Sales Report";
      case 'Monthly': return "This Month's Sales Report";
      case 'Custom': return `Sales Report (${filter.startDate} to ${filter.endDate})`;
      default: return "Sales Report";
    }
  };

  return (
    <div className="p-6 h-full bg-gray-50 flex flex-col overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <button 
           onClick={onBack}
           className="self-start flex items-center gap-2 text-gray-600 hover:text-gray-900 bg-white border border-gray-300 px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
        >
          <ArrowLeft size={18} /> Back to Dashboard
        </button>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <FileText className="text-blue-600" /> {getReportTitle()}
              </h1>
              <p className="text-gray-500 mt-1">
                 Found <span className="font-bold text-gray-900">{filteredSales.length}</span> bills totalling <span className="font-bold text-green-600">₹{totalAmount.toFixed(2)}</span>
              </p>
           </div>

           <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search within report..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 shadow-sm"
              />
           </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-1 overflow-y-auto min-h-[400px]">
         <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
               <tr>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bill No</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                 <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
               {filteredSales.map(sale => (
                 <tr key={sale.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">#{sale.id.slice(-6).toUpperCase()}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(sale.date).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">₹{sale.totalAmount.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          sale.paymentMethod === PaymentMethod.CASH ? 'bg-green-100 text-green-700' :
                          sale.paymentMethod === PaymentMethod.UPI ? 'bg-blue-100 text-blue-700' : 
                          sale.paymentMethod === PaymentMethod.MIXED ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {sale.paymentMethod}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => openEditPayment(sale)}
                            className="text-orange-600 hover:text-orange-800 p-2 hover:bg-orange-100 rounded-full transition-colors"
                            title="Edit Payment Mode"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => setSelectedSale(sale)}
                            className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-100 rounded-full transition-colors"
                            title="View Details"
                          >
                            <Eye size={20} />
                          </button>
                       </div>
                    </td>
                 </tr>
               ))}
               {filteredSales.length === 0 && (
                 <tr>
                   <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No records match the filter criteria.
                   </td>
                 </tr>
               )}
            </tbody>
         </table>
      </div>

      {/* Edit Payment Modal */}
      {isEditingPayment && editingSale && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-gray-800 uppercase tracking-tighter flex items-center gap-2">
                  <Edit2 size={20} className="text-orange-600" /> Correct Payment Mode
                </h2>
                <button onClick={() => setIsEditingPayment(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
              </div>

              <div className="flex justify-between items-center mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Bill Total</span>
                <span className="text-2xl font-black text-gray-800">₹{editingSale.totalAmount.toFixed(2)}</span>
              </div>

              <div className="mb-6">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Select New Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.values(PaymentMethod).map(method => (
                    <button 
                      key={method} 
                      onClick={() => setEditPaymentMethod(method)} 
                      className={`py-3 px-2 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${editPaymentMethod === method ? 'bg-orange-50 border-orange-600 text-orange-700 shadow-sm scale-105' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}
                    >
                      {method}
                    </button>
                  ))}
                </div>

                {editPaymentMethod === PaymentMethod.MIXED && (
                  <div className="mt-6 space-y-4 p-4 bg-orange-50/50 rounded-xl border border-orange-100 animate-in fade-in slide-in-from-top-2">
                     <div className="flex items-center gap-3">
                        <Banknote className="text-orange-600" size={20} />
                        <div className="flex-1">
                           <label className="block text-[9px] font-black text-orange-400 uppercase mb-1">Cash Part</label>
                           <input 
                              type="number" 
                              value={editCashAmount}
                              placeholder="0.00"
                              onChange={e => {
                                 const val = e.target.value;
                                 setEditCashAmount(val);
                                 const cashNum = parseFloat(val) || 0;
                                 setEditUpiAmount(Math.max(0, editingSale.totalAmount - cashNum).toFixed(2));
                              }}
                              className="w-full bg-white border border-orange-200 rounded-lg px-3 py-2 font-black text-gray-900 focus:ring-2 focus:ring-orange-500 outline-none"
                           />
                        </div>
                     </div>

                     <div className="flex items-center gap-3">
                        <Smartphone className="text-orange-600" size={20} />
                        <div className="flex-1">
                           <label className="block text-[9px] font-black text-orange-400 uppercase mb-1">UPI Part</label>
                           <input 
                              type="number" 
                              value={editUpiAmount}
                              placeholder="0.00"
                              onChange={e => {
                                 const val = e.target.value;
                                 setEditUpiAmount(val);
                                 const upiNum = parseFloat(val) || 0;
                                 setEditCashAmount(Math.max(0, editingSale.totalAmount - upiNum).toFixed(2));
                              }}
                              className="w-full bg-white border border-orange-200 rounded-lg px-3 py-2 font-black text-gray-900 focus:ring-2 focus:ring-orange-500 outline-none"
                           />
                        </div>
                     </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setIsEditingPayment(false)}
                  className="flex-1 py-3 text-gray-400 font-bold text-sm hover:text-gray-600"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSavePaymentEdit}
                  className="flex-[2] bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-black text-sm shadow-lg active:scale-95 transition-transform uppercase tracking-widest"
                >
                  Save Corrections
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Synchronized Bill Details Modal (Receipt Style) */}
      {selectedSale && (
        <div className="fixed inset-0 z-[120] bg-slate-900/70 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-6 bg-slate-50 border-b flex items-center justify-between">
                 <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                    <Receipt size={20} className="text-blue-600" /> Bill Preview
                 </h2>
                 <button onClick={() => setSelectedSale(null)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><X size={20}/></button>
              </div>

              <div className="p-6 max-h-[60vh] overflow-y-auto no-scrollbar bg-slate-200/50">
                 {/* Visual Bill Representation */}
                 <div className="bg-white shadow-lg p-6 rounded-lg text-black font-mono text-[11px] border border-slate-200 relative">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-[radial-gradient(circle,transparent_40%,#e2e8f0_41%)] bg-[length:10px_10px]"></div>
                    
                    <div className="text-center mb-4 pb-4 border-b border-black/10">
                       <p className="font-black text-sm uppercase tracking-tighter mb-0.5 text-black">{settings?.name || 'SMART MART'}</p>
                       <p className="text-[9px] text-black font-bold">{settings?.address || 'Address not set'}</p>
                       <p className="text-[9px] text-black font-bold">Ph: {settings?.contact || 'Phone not set'}</p>
                    </div>
                    
                    <div className="space-y-1 mb-4 pb-2 border-b border-dashed border-black/20 text-black">
                       <p>Bill No: <span className="font-black">{selectedSale.id}</span></p>
                       <p>Date: {new Date(selectedSale.date).toLocaleString()}</p>
                       <p>Payment: {selectedSale.paymentMethod}</p>
                       {selectedSale.customerName && <p>Customer: {selectedSale.customerName}</p>}
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
                          {selectedSale.items.map((item, i) => {
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
                          <span>₹{selectedSale.totalAmount.toFixed(2)}</span>
                       </div>

                       {selectedSale.totalSavings !== undefined && selectedSale.totalSavings > 0 && (
                          <div className="flex justify-between font-black text-[9px] border-t border-black/5 pt-1">
                             <span>TOTAL SAVINGS</span>
                             <span>₹{selectedSale.totalSavings.toFixed(2)}</span>
                          </div>
                       )}
                       
                       {selectedSale.paymentMethod === PaymentMethod.MIXED && (
                         <div className="text-[9px] font-bold space-y-0.5 pl-2 border-l border-black/20">
                            <div className="flex justify-between"><span>CASH:</span><span>₹{selectedSale.cashAmount?.toFixed(2)}</span></div>
                            <div className="flex justify-between"><span>UPI:</span><span>₹{selectedSale.upiAmount?.toFixed(2)}</span></div>
                         </div>
                       )}
                    </div>

                    <div className="text-center mt-6 text-black font-bold text-[9px]">
                       <p>*** DUPLICATE COPY ***</p>
                       <p>THANK YOU VISIT AGAIN</p>
                    </div>
                 </div>
              </div>
              
              <div className="p-8 space-y-3 bg-white">
                <button 
                   onClick={handlePrint}
                   className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                   <Printer size={20} /> Print Receipt
                </button>
                <button 
                   onClick={() => setSelectedSale(null)}
                   className="w-full text-slate-400 font-black py-2 hover:text-slate-600 text-[10px] uppercase tracking-[0.2em] transition-colors"
                >
                   Close
                </button>
              </div>
           </div>

           {/* Synchronized Print Template */}
           <div id="printable-section" className="hidden print:block fixed inset-0 bg-white z-[200] p-8 text-black top-0 left-0">
               <div className="max-w-md mx-auto font-mono text-xs">
                   <div className="text-center mb-6 border-b-2 border-black pb-4">
                      <h1 className="text-xl font-bold uppercase tracking-tighter">{settings?.name || 'SMART MART'}</h1>
                      <p>{settings?.address || 'Address not set'}</p>
                      <p>Ph: {settings?.contact || 'Phone not set'}</p>
                   </div>
                   
                   <div className="border-b border-dashed border-black py-2 mb-2">
                      <p>Bill No: {selectedSale.id}</p>
                      <p>Date: {new Date(selectedSale.date).toLocaleString()}</p>
                      {selectedSale.customerName && <p>Customer: {selectedSale.customerName}</p>}
                      <p>Mode: {selectedSale.paymentMethod}</p>
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
                        {selectedSale.items.map((item, i) => {
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
                         <span>₹{selectedSale.totalAmount.toFixed(2)}</span>
                      </div>

                      {selectedSale.totalSavings !== undefined && selectedSale.totalSavings > 0 && (
                        <div className="flex justify-between font-black text-sm text-black border-t border-black/10 mt-1 pt-1">
                           <span>TOTAL SAVINGS</span>
                           <span>₹{selectedSale.totalSavings.toFixed(2)}</span>
                        </div>
                      )}
                      
                      {selectedSale.paymentMethod === PaymentMethod.MIXED && (
                         <div className="mt-2 text-[10px] space-y-1 border-t border-black/10 pt-2 text-black font-bold">
                            <div className="flex justify-between">
                               <span>CASH PAID:</span>
                               <span>₹{selectedSale.cashAmount?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                               <span>UPI PAID:</span>
                               <span>₹{selectedSale.upiAmount?.toFixed(2)}</span>
                            </div>
                         </div>
                      )}

                      {selectedSale.totalSavings !== undefined && selectedSale.totalSavings > 0 && (
                        <p className="text-[10px] text-center mt-4 uppercase tracking-widest font-black text-black">YOU SAVED MONEY!</p>
                      )}
                   </div>

                   <div className="text-center mt-10">
                      <p className="font-bold text-black">*** DUPLICATE COPY ***</p>
                      <p className="font-bold text-black">THANK YOU! VISIT AGAIN</p>
                   </div>
               </div>
           </div>
        </div>
      )}
    </div>
  );
};
