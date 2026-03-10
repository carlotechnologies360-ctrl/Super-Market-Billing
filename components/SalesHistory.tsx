
import React, { useState, useMemo } from 'react';
import { Sale, PaymentMethod } from '../types';
import { Search, Printer, Eye, X } from 'lucide-react';

interface SalesHistoryProps {
  sales: Sale[];
}

export const SalesHistory: React.FC<SalesHistoryProps> = ({ sales }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const matchesSearch = 
        sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.customerMobile?.includes(searchTerm);

      return matchesSearch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, searchTerm]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 h-full bg-gray-50 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Bills History</h1>
          <p className="text-sm text-gray-500 mt-1">Complete transaction log</p>
        </div>
        
        {/* Search */}
        <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search Bill No, Mobile, Name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 shadow-sm"
            />
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
                 <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">#{sale.id.slice(-6).toUpperCase()}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(sale.date).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">₹{sale.totalAmount.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{sale.paymentMethod}</td>
                    <td className="px-6 py-4 text-right">
                       <button 
                         onClick={() => setSelectedSale(sale)}
                         className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-full"
                         title="View Details"
                       >
                         <Eye size={20} />
                       </button>
                    </td>
                 </tr>
               ))}
               {filteredSales.length === 0 && (
                 <tr>
                   <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No bills found.</td>
                 </tr>
               )}
            </tbody>
         </table>
      </div>

      {/* Detail Modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                 <h3 className="font-bold text-gray-800">Bill Details #{selectedSale.id.slice(-6).toUpperCase()}</h3>
                 <button onClick={() => setSelectedSale(null)}><X size={24} className="text-gray-400 hover:text-gray-600" /></button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                 <div className="flex justify-between mb-4 text-sm text-gray-500">
                    <span>Date: {new Date(selectedSale.date).toLocaleString()}</span>
                    <span>Mode: {selectedSale.paymentMethod}</span>
                 </div>

                 {selectedSale.customerName && (
                    <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
                       <p className="text-xs text-blue-600 font-bold uppercase mb-1">Customer</p>
                       <p className="text-sm font-medium text-blue-900">{selectedSale.customerName} {selectedSale.customerMobile ? `(${selectedSale.customerMobile})` : ''}</p>
                    </div>
                 )}
                 
                 <div className="border rounded-lg overflow-hidden mb-4">
                    <table className="w-full text-left">
                       <thead className="bg-gray-50 border-b border-gray-100">
                          <tr>
                            <th className="p-3 text-xs font-medium text-gray-500">Item</th>
                            <th className="p-3 text-xs font-medium text-gray-500 text-right">Qty</th>
                            <th className="p-3 text-xs font-medium text-gray-500 text-right">Total</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100">
                          {selectedSale.items.map((item, i) => {
                             const diff = (item.actualPrice || item.price) - item.price;
                             const itemSavings = diff * item.cartQuantity;
                             return (
                               <tr key={i}>
                                 <td className="p-3 text-sm">
                                   <p className="font-medium text-gray-800">{item.name}</p>
                                   {(item.sizeName || item.selectedVariant) && <p className="text-xs text-blue-600 font-bold bg-blue-50 inline-block px-1 rounded mt-0.5">{item.sizeName || item.selectedVariant}</p>}
                                   {itemSavings > 0 && <p className="text-[10px] text-green-600 font-bold mt-1">Saved ₹{itemSavings.toFixed(2)}</p>}
                                 </td>
                                 <td className="p-3 text-sm text-right text-gray-800">{item.cartQuantity}</td>
                                 <td className="p-3 text-sm text-right font-medium text-gray-800">₹{(item.price * item.cartQuantity).toFixed(2)}</td>
                               </tr>
                             );
                          })}
                       </tbody>
                    </table>
                 </div>

                 <div className="space-y-1 pt-4 border-t">
                    <div className="flex justify-between items-center text-xl font-bold text-gray-900">
                        <span>Total Amount</span>
                        <span>₹{selectedSale.totalAmount.toFixed(2)}</span>
                    </div>

                    {selectedSale.paymentMethod === PaymentMethod.MIXED && (
                       <div className="mt-2 text-xs font-bold text-gray-600 space-y-1 border-l-2 border-blue-200 pl-3">
                          <div className="flex justify-between">
                             <span>Cash Collected:</span>
                             <span>₹{selectedSale.cashAmount?.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                             <span>UPI Collected:</span>
                             <span>₹{selectedSale.upiAmount?.toFixed(2)}</span>
                          </div>
                       </div>
                    )}

                    {selectedSale.totalSavings !== undefined && selectedSale.totalSavings > 0 && (
                      <div className="flex justify-between items-center text-sm font-bold text-green-600 mt-2">
                          <span>Total Savings</span>
                          <span>₹{selectedSale.totalSavings.toFixed(2)}</span>
                      </div>
                    )}
                 </div>
              </div>

              <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                 <button 
                   onClick={handlePrint}
                   className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
                 >
                   <Printer size={18} /> Print Bill
                 </button>
              </div>
           </div>

           {/* Hidden Print Template */}
           <div id="printable-section" className="hidden print:block fixed inset-0 bg-white z-[100] p-8 text-black top-0 left-0">
               <div className="max-w-md mx-auto font-mono text-xs">
                   <div className="text-center mb-6 border-b-2 border-black pb-4">
                      <h1 className="text-xl font-bold uppercase tracking-tighter">SMART MART</h1>
                      <p>123, Supermarket Road, Mumbai</p>
                      <p>Ph: +91 98765 43210</p>
                   </div>
                   
                   <div className="border-b border-dashed border-black py-2 mb-2">
                      <p>Bill No: {selectedSale.id}</p>
                      <p>Date: {new Date(selectedSale.date).toLocaleString()}</p>
                      {selectedSale.customerName && <p>Customer: {selectedSale.customerName}</p>}
                      <p>Mode: {selectedSale.paymentMethod}</p>
                   </div>

                   <table className="w-full text-left mb-4">
                      <thead>
                        <tr className="border-b border-black font-bold">
                           <th className="py-1">Description</th>
                           <th className="py-1 text-right">Qty</th>
                           <th className="py-1 text-right">Amt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSale.items.map((item, i) => {
                           const diff = (item.actualPrice || item.price) - item.price;
                           const itemSavings = diff * item.cartQuantity;
                           return (
                            <React.Fragment key={i}>
                              <tr>
                                 <td className="pt-2 font-bold">{item.name} {(item.sizeName || item.selectedVariant) ? `(${item.sizeName || item.selectedVariant})` : ''}</td>
                                 <td className="pt-2 text-right">{item.cartQuantity}</td>
                                 <td className="pt-2 text-right">{(item.price * item.cartQuantity).toFixed(2)}</td>
                              </tr>
                              {itemSavings > 0 && (
                                <tr>
                                  <td colSpan={3} className="text-[10px] italic pb-1">
                                    (Saved: ₹{itemSavings.toFixed(2)})
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                           );
                        })}
                      </tbody>
                   </table>

                   <div className="border-t-2 border-dashed border-black pt-2 mb-4">
                      <div className="flex justify-between font-black text-sm">
                         <span>GRAND TOTAL</span>
                         <span>₹{selectedSale.totalAmount.toFixed(2)}</span>
                      </div>

                      {selectedSale.paymentMethod === PaymentMethod.MIXED && (
                        <div className="mt-2 text-[10px] space-y-1 border-t border-black/10 pt-2">
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
                        <div className="mt-2 pt-2 border-t border-black/10">
                          <div className="flex justify-between font-bold">
                             <span>TOTAL SAVINGS</span>
                             <span>₹{selectedSale.totalSavings.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                   </div>

                   <div className="text-center mt-12">
                      <p className="font-bold">*** DUPLICATE COPY ***</p>
                      <p className="mt-1">Thanks for shopping!</p>
                   </div>
               </div>
           </div>
        </div>
      )}
    </div>
  );
};
