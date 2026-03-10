
import React, { useState, useMemo, useRef } from 'react';
import { Product, StoreSettings, UnitType } from '../types';
import { Search, Printer, Tag, Hash, ShoppingBasket, RefreshCw, X, AlertCircle, Lock } from 'lucide-react';

interface BarcodeLabelPrinterProps {
  products: Product[];
  settings: StoreSettings;
}

export const BarcodeLabelPrinter: React.FC<BarcodeLabelPrinterProps> = ({ products, settings }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemMrp, setItemMrp] = useState('');
  const [itemUnit, setItemUnit] = useState<UnitType>(UnitType.KG);
  const [itemQty, setItemQty] = useState('');
  const [itemBarcode, setItemBarcode] = useState('');

  const printRef = useRef<HTMLDivElement>(null);

  // Coding logic: GODHELPUSA (G=0, O=1, D=2, H=3, E=4, L=5, P=6, U=7, S=8, A=9)
  const encodePrice = (val: string) => {
    if (!val) return '';
    const cipher: Record<string, string> = {
      '0': 'G', '1': 'O', '2': 'D', '3': 'H', '4': 'E',
      '5': 'L', '6': 'P', '7': 'U', '8': 'S', '9': 'A', '.': '*'
    };
    return val.split('').map(char => cipher[char] || char).join('');
  };

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    if (val.trim()) {
      const matches = products.filter(p => 
        p.name.toLowerCase().includes(val.toLowerCase()) || 
        p.id.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 5);
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  };

  const selectProduct = (p: Product) => {
    setItemName(p.name + (p.sizeName ? ` (${p.sizeName})` : ''));
    setItemPrice(p.price.toString());
    setItemMrp(p.actualPrice?.toString() || p.price.toString());
    setItemUnit(p.unit);
    setItemBarcode(p.barcode || p.id);
    setSuggestions([]);
    setSearchTerm('');
  };

  const handlePrint = () => {
    window.print();
  };

  const clearForm = () => {
    setItemName('');
    setItemPrice('');
    setItemMrp('');
    setItemQty('');
    setItemBarcode('');
  };

  // Barcode pattern generator logic (SVG lines)
  const renderBarcode = (code: string) => {
    if (!code) return null;
    return (
      <svg viewBox="0 0 100 30" className="w-full h-9" preserveAspectRatio="none">
        <rect width="100%" height="100%" fill="white" />
        {code.split('').map((char, i) => {
          const width = (char.charCodeAt(0) % 3) + 1;
          const x = i * 6;
          return <rect key={i} x={x} y="0" width={width} height="30" fill="black" />;
        })}
      </svg>
    );
  };

  return (
    <div className="p-6 h-full flex flex-col bg-slate-50 overflow-y-auto no-scrollbar">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Manual Label Print</h1>
        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Generate barcodes for loose or unlabeled items</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">
        {/* Input Controls */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
            <div className="relative">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Search Inventory</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder="Quickly pull from stock..."
                  value={searchTerm}
                  onChange={e => handleSearchChange(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white border border-gray-400 rounded-2xl focus:border-blue-600 outline-none font-bold text-slate-800 transition-all"
                />
              </div>
              
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white shadow-2xl rounded-2xl border border-slate-100 mt-2 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  {suggestions.map(p => (
                    <button 
                      key={p.id}
                      onClick={() => selectProduct(p)}
                      className="w-full flex items-center justify-between p-4 hover:bg-blue-50 border-b last:border-0 border-slate-50 transition-colors"
                    >
                      <div className="text-left">
                        <p className="font-black text-slate-800 text-sm">{p.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{p.sizeName || 'Standard'} • ID: {p.id}</p>
                      </div>
                      <span className="font-black text-blue-600">₹{p.price}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Item Name / Title</label>
                <input 
                  type="text"
                  value={itemName}
                  onChange={e => setItemName(e.target.value)}
                  placeholder="e.g. Loose Tomato"
                  className="w-full px-4 py-4 bg-white border border-gray-400 rounded-2xl focus:border-blue-600 outline-none font-black text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">MRP Price (₹)</label>
                <input 
                  type="number"
                  value={itemMrp}
                  onChange={e => setItemMrp(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-4 bg-white border border-gray-400 rounded-2xl focus:border-blue-600 outline-none font-black text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 text-blue-600">Selling Price (₹)</label>
                <input 
                  type="number"
                  value={itemPrice}
                  onChange={e => setItemPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-4 bg-white border border-gray-400 rounded-2xl focus:border-blue-600 outline-none font-black text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Weight / Qty</label>
                <input 
                  type="text"
                  value={itemQty}
                  onChange={e => setItemQty(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-4 bg-white border border-gray-400 rounded-2xl focus:border-blue-600 outline-none font-black text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Unit Type</label>
                <select 
                  value={itemUnit}
                  onChange={e => setItemUnit(e.target.value as UnitType)}
                  className="w-full px-4 py-4 bg-white border border-gray-400 rounded-2xl focus:border-blue-600 outline-none font-black text-slate-900 appearance-none"
                >
                  {Object.values(UnitType).map(u => <option key={u} value={u}>{u.toUpperCase()}</option>)}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Barcode Value</label>
                <input 
                  type="text"
                  value={itemBarcode}
                  onChange={e => setItemBarcode(e.target.value)}
                  placeholder="Unique ID"
                  className="w-full px-4 py-4 bg-white border border-gray-400 rounded-2xl focus:border-blue-600 outline-none font-black text-slate-900"
                />
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button 
                onClick={clearForm}
                className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} /> Reset Form
              </button>
              <button 
                onClick={handlePrint}
                disabled={!itemName || !itemPrice || !itemBarcode}
                className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer size={18} /> Generate & Print
              </button>
            </div>
          </div>

          <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 flex gap-4">
             <div className="p-2 bg-white text-amber-500 rounded-xl h-fit shadow-sm">
               <Lock size={20} />
             </div>
             <div>
                <p className="text-xs font-black text-amber-800 uppercase tracking-widest mb-1">MRP Visibility</p>
                <p className="text-[11px] text-amber-700/80 font-bold leading-relaxed">
                  Both MRP and Selling Price are clearly shown on the label. MRP is shown with a strikethrough for better presentation. Encoded MRP remains at the top right for staff reference.
                </p>
             </div>
          </div>
        </div>

        {/* Live Preview */}
        <div className="flex flex-col items-center justify-center bg-slate-200/50 rounded-[3rem] p-10 border-4 border-dashed border-slate-300">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8">Label Preview (50x25mm)</p>
           
           <div 
             id="printable-section"
             className="bg-white w-[300px] h-[150px] shadow-2xl p-4 flex flex-col justify-between items-start text-black border-2 border-black/5 rounded-sm relative overflow-hidden"
             style={{ 
               fontFamily: 'monospace', 
               pageBreakAfter: 'always',
               boxSizing: 'border-box'
             }}
           >
              <div className="text-center w-full relative">
                 <div className="absolute top-0 right-0 text-[9px] font-black opacity-30 tracking-tight">
                   {encodePrice(itemMrp)}
                 </div>
                 <h3 className="text-xs font-black truncate uppercase tracking-tighter">{settings.name || 'SMART MART'}</h3>
                 <p className="text-[14px] font-black mt-1 leading-tight line-clamp-2">{itemName || 'PRODUCT NAME'}</p>
              </div>

              <div className="w-full text-left py-1 overflow-hidden">
                 {renderBarcode(itemBarcode || '12345678')}
                 <p className="text-[10px] font-bold tracking-[0.1em] mt-0.5 whitespace-nowrap">{itemBarcode || '00000000'}</p>
              </div>

              <div className="w-full flex justify-between items-end border-t border-black/10 pt-1">
                 <div className="text-left flex items-baseline gap-2">
                    <div className="flex items-center gap-1">
                       <span className="text-[7px] font-bold opacity-50 uppercase">MRP:</span>
                       <span className="text-[10px] font-bold line-through">₹{itemMrp || '0.00'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                       <span className="text-[7px] font-bold opacity-50 uppercase">Price:</span>
                       <span className="text-lg font-black leading-none">₹{itemPrice || '0.00'}</span>
                    </div>
                 </div>
                 <div className="text-right">
                    <p className="text-[8px] font-bold opacity-50 uppercase">Qty/Wt</p>
                    <p className="text-sm font-black leading-none">{itemQty || '0'} {itemUnit}</p>
                 </div>
              </div>

              {/* Print styling specifically for this section */}
              <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                  @page { 
                    size: 50mm 25mm;
                    margin: 0;
                  }
                  body * { visibility: hidden; }
                  #printable-section, #printable-section * { visibility: visible; }
                  #printable-section {
                    position: fixed !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 50mm !important;
                    height: 25mm !important;
                    padding: 2mm !important;
                    border: none !important;
                    box-shadow: none !important;
                    margin: 0 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: space-between !important;
                    align-items: flex-start !important;
                    text-align: left !important;
                  }
                  #printable-section .text-center { text-align: center !important; }
                  #printable-section h3 { font-size: 8pt !important; }
                  #printable-section p { font-size: 10pt !important; }
                  #printable-section .text-[7px] { font-size: 5pt !important; }
                  #printable-section .text-[8px] { font-size: 6pt !important; }
                  #printable-section .text-[10px] { font-size: 8pt !important; text-align: left !important; }
                  #printable-section .text-lg { font-size: 12pt !important; }
                  #printable-section .h-9 { height: 5mm !important; width: 80% !important; margin: 0 !important; }
                  #printable-section .opacity-30 { opacity: 0.8 !important; }
                  #printable-section .line-through { text-decoration: line-through !important; }
                  #printable-section .items-baseline { align-items: baseline !important; }
                  #printable-section .flex-row { flex-direction: row !important; }
                  #printable-section .w-full.text-center { width: 100% !important; text-align: center !important; }
                }
              `}} />
           </div>
           
           <div className="mt-8 text-center space-y-2">
              <p className="text-xs font-bold text-slate-500 italic">Actual size will vary based on printer calibration</p>
              <div className="flex gap-4 justify-center">
                 <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase"><Tag size={12}/> Sticker Roll</div>
                 <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase"><Hash size={12}/> Code 128</div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
