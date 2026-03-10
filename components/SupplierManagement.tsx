
import React, { useState, useMemo } from 'react';
import { Supplier, Purchase, SupplierPayment, Product } from '../types';
import { 
  Users, UserPlus, Phone, MapPin, Package, IndianRupee, 
  History, Wallet, AlertCircle, AlertTriangle, Plus, X, Search, 
  CheckCircle2, ArrowRight, CreditCard, Banknote, ShoppingCart, FilePlus, Info, Edit, Trash2, Eye, ReceiptText,
  FileText, TrendingUp, TrendingDown, ChevronRight, Smartphone, Calendar, Filter
} from 'lucide-react';

interface SupplierManagementProps {
  suppliers: Supplier[];
  purchases: Purchase[];
  payments: SupplierPayment[];
  products: Product[];
  onSaveSupplier: (s: Supplier) => void;
  onDeleteSupplier: (id: string) => void;
  onSavePayment: (p: SupplierPayment) => void;
  onSavePurchase: (p: Purchase) => void;
  onUpdatePurchase: (p: Purchase) => void;
  onDeletePurchase: (id: string) => void;
}

type TabType = 'list' | 'dues' | 'bills' | 'payments';

export const SupplierManagement: React.FC<SupplierManagementProps> = ({ 
  suppliers, 
  purchases, 
  payments, 
  products,
  onSaveSupplier, 
  onDeleteSupplier,
  onSavePayment,
  onSavePurchase,
  onUpdatePurchase,
  onDeletePurchase
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('list');
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Bills (Purchase Order) tab specific filters
  const [billsSearchTerm, setBillsSearchTerm] = useState('');
  const [billsStartDate, setBillsStartDate] = useState('');
  const [billsEndDate, setBillsEndDate] = useState('');
  
  const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier> | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  
  // Ledger view state
  const [viewingLedgerFor, setViewingLedgerFor] = useState<string | null>(null);

  // Purchase management state
  const [isEditingPurchase, setIsEditingPurchase] = useState(false);
  const [editPurchaseData, setEditPurchaseData] = useState<Purchase | null>(null);
  const [purchaseToDelete, setPurchaseToDelete] = useState<Purchase | null>(null);

  // Delete confirmation state
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  // --- Calculations ---
  const supplierStats = useMemo(() => {
    return suppliers.map(supplier => {
      const supplierPurchases = purchases.filter(p => p.supplierId === supplier.id);
      const totalPurchased = supplierPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
      
      const totalPaid = payments
        .filter(p => p.supplierId === supplier.id)
        .reduce((sum, p) => sum + p.amount, 0);
      
      const balance = totalPurchased - totalPaid;

      return {
        ...supplier,
        totalPurchased,
        totalPaid,
        balance,
        purchaseCount: supplierPurchases.length
      };
    });
  }, [suppliers, purchases, payments]);

  const filteredSuppliers = useMemo(() => {
    return supplierStats.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone.includes(searchTerm)
    );
  }, [supplierStats, searchTerm]);

  const totalDues = useMemo(() => 
    supplierStats.reduce((sum, s) => sum + Math.max(0, s.balance), 0), 
  [supplierStats]);

  /**
   * Outstanding Orders Logic (FIFO)
   */
  const outstandingOrders = useMemo(() => {
    if (!viewingLedgerFor) return [];
    
    const stats = supplierStats.find(s => s.id === viewingLedgerFor);
    if (!stats || stats.balance <= 0) return [];

    const supplierPurchases = purchases
      .filter(p => p.supplierId === viewingLedgerFor)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let remainingPaidAmount = stats.totalPaid;
    const result: (Purchase & { outstandingAmount: number })[] = [];

    for (const p of supplierPurchases) {
      if (remainingPaidAmount >= p.totalAmount) {
        remainingPaidAmount -= p.totalAmount;
      } else {
        const paidForThis = remainingPaidAmount;
        remainingPaidAmount = 0;
        result.push({
          ...p,
          outstandingAmount: p.totalAmount - paidForThis
        });
      }
    }

    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [viewingLedgerFor, purchases, supplierStats]);

  // Filtered Purchases for the Bills Tab
  const filteredBills = useMemo(() => {
    let list = [...purchases];

    // Search Filter (Product or Supplier Name)
    if (billsSearchTerm.trim()) {
      const term = billsSearchTerm.toLowerCase();
      list = list.filter(p => {
        const supplier = suppliers.find(s => s.id === p.supplierId);
        return (
          p.productName.toLowerCase().includes(term) ||
          supplier?.name.toLowerCase().includes(term)
        );
      });
    }

    // Custom Date Range Filter
    if (billsStartDate) {
      const start = new Date(billsStartDate);
      start.setHours(0, 0, 0, 0);
      list = list.filter(p => new Date(p.date) >= start);
    }
    if (billsEndDate) {
      const end = new Date(billsEndDate);
      end.setHours(23, 59, 59, 999);
      list = list.filter(p => new Date(p.date) <= end);
    }

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [purchases, suppliers, billsSearchTerm, billsStartDate, billsEndDate]);

  // --- Handlers ---
  const handleAddSupplier = () => {
    setEditingSupplier({
      id: `SUP-${Date.now().toString().slice(-4)}`,
      name: '',
      phone: '',
      address: '',
      productsSupplied: []
    });
    setShowSupplierForm(true);
  };

  const handleEditSupplier = (s: Supplier) => {
    setEditingSupplier(s);
    setShowSupplierForm(true);
  };

  const handleNameChange = (val: string) => {
    if (!editingSupplier) return;
    const cleanedName = val.replace(/[0-9]/g, '');
    setEditingSupplier({ ...editingSupplier, name: cleanedName });
  };

  const handlePhoneChange = (val: string) => {
    if (!editingSupplier) return;
    const cleanedPhone = val.replace(/\D/g, '').slice(0, 10);
    setEditingSupplier({ ...editingSupplier, phone: cleanedPhone });
  };

  const isPhoneInvalid = editingSupplier?.phone ? editingSupplier.phone.length > 0 && editingSupplier.phone.length < 10 : false;
  const isSupplierFormValid = editingSupplier?.name?.trim() && editingSupplier?.phone?.length === 10;

  const handleDeleteClick = (s: Supplier) => {
    setSupplierToDelete(s);
  };

  const confirmDelete = () => {
    if (supplierToDelete) {
      onDeleteSupplier(supplierToDelete.id);
      setSupplierToDelete(null);
    }
  };

  const handlePayNow = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    setShowPaymentForm(true);
  };

  const handleRecordPurchase = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    setShowPurchaseForm(true);
  };

  const submitSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSupplier && isSupplierFormValid) {
      onSaveSupplier(editingSupplier as Supplier);
      setShowSupplierForm(false);
      setEditingSupplier(null);
    }
  };

  const submitPayment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get('amount') as string);
    const method = formData.get('method') as 'Cash' | 'Online';
    const note = formData.get('note') as string;

    if (selectedSupplierId && amount > 0) {
      onSavePayment({
        id: `PAY-${Date.now()}`,
        supplierId: selectedSupplierId,
        amount,
        date: new Date().toISOString(),
        method,
        note
      });
      setShowPaymentForm(false);
      setSelectedSupplierId(null);
    }
  };

  const submitPurchase = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const productName = formData.get('productName') as string;
    const quantity = parseFloat(formData.get('quantity') as string);
    const unitPrice = parseFloat(formData.get('unitPrice') as string);

    if (selectedSupplierId && productName && quantity > 0 && unitPrice > 0) {
      onSavePurchase({
        id: `PUR-${Date.now()}`,
        date: new Date().toISOString(),
        supplierId: selectedSupplierId,
        productName,
        quantity,
        unitPrice,
        totalAmount: quantity * unitPrice
      });
      setShowPurchaseForm(false);
      setSelectedSupplierId(null);
    }
  };

  const handleEditPurchase = (p: Purchase) => {
    setEditPurchaseData({ ...p });
    setIsEditingPurchase(true);
  };

  const submitEditPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (editPurchaseData) {
      onUpdatePurchase({
        ...editPurchaseData,
        totalAmount: editPurchaseData.quantity * editPurchaseData.unitPrice
      });
      setIsEditingPurchase(false);
      setEditPurchaseData(null);
    }
  };

  const confirmDeletePurchase = () => {
    if (purchaseToDelete) {
      onDeletePurchase(purchaseToDelete.id);
      setPurchaseToDelete(null);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col bg-slate-50 overflow-y-auto no-scrollbar">
      {/* Dynamic Summary Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Suppliers Management</h1>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Manage suppliers, inventory replenishment and dues</p>
        </div>

        <div className="bg-orange-600 text-white p-5 rounded-[2rem] shadow-xl shadow-orange-100 flex items-center gap-4 group transition-transform hover:scale-105">
           <div className="p-3 bg-white/20 rounded-2xl">
             <IndianRupee size={28} strokeWidth={3} />
           </div>
           <div>
              <div className="flex items-center gap-2">
                 <p className="text-[10px] font-black uppercase opacity-80 tracking-widest">Net Outstanding Dues</p>
              </div>
              <p className="text-3xl font-black text-white">₹{totalDues.toLocaleString()}</p>
           </div>
        </div>
      </div>

      {/* Modern Tab Bar */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 p-2 bg-slate-200/50 rounded-[1.5rem] w-fit">
        {[
          { id: 'list', label: 'Supplier List', icon: Users },
          { id: 'dues', label: 'Pending Dues', icon: AlertCircle },
          { id: 'bills', label: 'Purchase Order', icon: ReceiptText },
          { id: 'payments', label: 'Payment History', icon: History }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-white text-blue-600 shadow-md ring-1 ring-slate-100' 
                : 'text-slate-500 hover:bg-white/50 hover:text-slate-900'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-6">
        {activeTab === 'list' && (
          <>
            <div className="flex gap-3 mb-6">
               <div className="relative flex-1">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                 <input 
                   type="text" 
                   placeholder="Search by supplier name or phone..."
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                   className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-400 shadow-sm focus:ring-4 focus:ring-blue-100 outline-none bg-white text-slate-900 font-bold"
                 />
               </div>
               <button 
                 onClick={handleAddSupplier}
                 className="flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-black transition-all active:scale-95"
               >
                 <UserPlus size={18} /> Add Supplier
               </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {filteredSuppliers.map(sup => (
                 <div key={sup.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-slate-100 transition-all group">
                    <div className="flex justify-between items-start mb-6">
                       <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Users size={24} />
                          </div>
                          <div>
                            <h3 className="text-lg font-black text-slate-800 leading-tight">{sup.name}</h3>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{sup.id}</p>
                          </div>
                       </div>
                       <div className="flex gap-1">
                          <button onClick={() => handleEditSupplier(sup)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                             <Edit size={18} />
                          </button>
                          <button onClick={() => handleDeleteClick(sup)} className="p-2 text-slate-400 hover:text-red-600 transition-colors">
                             <Trash2 size={18} />
                          </button>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                       <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Bills</p>
                          <p className="font-black text-slate-900">₹{sup.totalPurchased.toLocaleString()}</p>
                       </div>
                       <div className={`p-4 rounded-2xl border ${sup.balance > 0 ? 'bg-red-50 border-red-100 text-red-600' : 'bg-green-50 border-green-100 text-green-700'}`}>
                          <p className="text-[9px] font-black opacity-60 uppercase tracking-widest mb-1">Dues</p>
                          <p className="font-black">₹{sup.balance.toLocaleString()}</p>
                       </div>
                    </div>

                    <div className="space-y-2 mb-6 border-t pt-4 border-slate-50">
                       <div className="flex items-center gap-3 text-xs text-slate-500 font-bold">
                          <Phone size={14} className="text-slate-300" />
                          <span>{sup.phone}</span>
                       </div>
                       <div className="flex items-center gap-3 text-xs text-slate-500 font-bold">
                          <MapPin size={14} className="text-slate-300" />
                          <span className="truncate">{sup.address}</span>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => handleRecordPurchase(sup.id)}
                        className="flex-1 py-3 bg-orange-600 text-white font-black rounded-xl hover:bg-orange-700 transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest shadow-lg shadow-orange-100"
                      >
                         <FilePlus size={16} /> Record Bill
                      </button>
                      <button 
                        onClick={() => handlePayNow(sup.id)}
                        className="flex-1 py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100"
                      >
                         <Wallet size={16} /> Pay Due
                      </button>
                    </div>
                    
                    <button 
                      onClick={() => setViewingLedgerFor(sup.id)}
                      className="w-full mt-2 py-3 bg-slate-900 text-white font-black rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest shadow-lg shadow-slate-100"
                    >
                       <FileText size={16} /> View Orders
                    </button>
                 </div>
               ))}
            </div>
          </>
        )}

        {activeTab === 'dues' && (
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
             <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3">
                   <AlertCircle className="text-orange-500" size={24} strokeWidth={2.5} /> Pending Dues
                </h3>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Payable</p>
                  <p className="text-xl font-black text-orange-600">₹{totalDues.toLocaleString()}</p>
                </div>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                     <tr>
                        <th className="p-6">Supplier Agency</th>
                        <th className="p-6">Purchase Value</th>
                        <th className="p-6">Payments Made</th>
                        <th className="p-6">Current Balance</th>
                        <th className="p-6 text-right">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {supplierStats.filter(s => s.balance > 0).map(s => (
                       <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-6">
                             <p className="font-black text-slate-900 text-base">{s.name}</p>
                             <p className="text-xs text-slate-400 font-bold">{s.phone}</p>
                          </td>
                          <td className="p-6 font-bold text-slate-900">₹{s.totalPurchased.toLocaleString()}</td>
                          <td className="p-6 font-bold text-green-600">₹{s.totalPaid.toLocaleString()}</td>
                          <td className="p-6">
                             <div className="flex flex-col">
                               <span className="text-lg font-black text-red-600">
                                 ₹{s.balance.toLocaleString()}
                               </span>
                               <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">Owed Since First Bill</span>
                             </div>
                          </td>
                          <td className="p-6 text-right">
                             <button 
                               onClick={() => handlePayNow(s.id)}
                               className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                             >
                                Clear Balance
                             </button>
                          </td>
                       </tr>
                     ))}
                  </tbody>
               </table>
             </div>
          </div>
        )}

        {/* Purchase Order (Bills) Tab */}
        {activeTab === 'bills' && (
          <div className="space-y-6">
            {/* Purchase Order Filters */}
            <div className="bg-white p-6 rounded-[2rem] border border-gray-400 shadow-sm space-y-4">
               <div className="flex flex-col lg:flex-row gap-4 items-end">
                  <div className="flex-1 w-full relative">
                     <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-1.5 ml-1">Search Purchase / Supplier</label>
                     <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                           type="text" 
                           placeholder="Search product or agency..."
                           value={billsSearchTerm}
                           onChange={e => setBillsSearchTerm(e.target.value)}
                           className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-400 focus:ring-4 focus:ring-blue-100 outline-none bg-white text-slate-900 font-bold"
                        />
                     </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-3 w-full lg:w-auto">
                     <div className="relative flex-1">
                        <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-1.5 ml-1">From Date</label>
                        <div className="relative">
                           <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                           <input 
                              type="date"
                              value={billsStartDate}
                              onChange={e => setBillsStartDate(e.target.value)}
                              className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-gray-400 focus:border-blue-600 outline-none bg-white font-bold text-slate-800 text-sm [color-scheme:light]"
                           />
                        </div>
                     </div>
                     <div className="relative flex-1">
                        <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-1.5 ml-1">To Date</label>
                        <div className="relative">
                           <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                           <input 
                              type="date"
                              value={billsEndDate}
                              onChange={e => setBillsEndDate(e.target.value)}
                              className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-gray-400 focus:border-blue-600 outline-none bg-white font-bold text-slate-800 text-sm [color-scheme:light]"
                           />
                        </div>
                     </div>
                     <div className="flex flex-col">
                        <label className="block text-[10px] font-black text-transparent select-none mb-1.5 ml-1">Spacer</label>
                        <button 
                           onClick={() => { setBillsSearchTerm(''); setBillsStartDate(''); setBillsEndDate(''); }}
                           className="bg-slate-100 text-slate-400 p-4 rounded-2xl hover:bg-slate-200 transition-colors border border-gray-400 flex items-center justify-center"
                           title="Reset Filters"
                        >
                           <X size={20} />
                        </button>
                     </div>
                  </div>
               </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
               <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3">
                     <ReceiptText className="text-blue-600" size={24} strokeWidth={2.5} /> Purchase Order Records
                  </h3>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Matching</p>
                    <p className="text-xl font-black text-blue-600">{filteredBills.length}</p>
                  </div>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                       <tr>
                          <th className="p-6">Bill Date</th>
                          <th className="p-6">Source Supplier</th>
                          <th className="p-6">Inventory Added</th>
                          <th className="p-6">Qty / Rate</th>
                          <th className="p-6">Total Bill</th>
                          <th className="p-6 text-right">Actions</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {filteredBills.map(p => {
                          const supplier = suppliers.find(s => s.id === p.supplierId);
                          return (
                            <tr key={p.id} className="hover:bg-slate-50/30 transition-colors">
                               <td className="p-6 text-sm text-slate-500 font-bold">{new Date(p.date).toLocaleDateString()}</td>
                               <td className="p-6">
                                  <p className="font-black text-slate-900">{supplier?.name || 'Unknown'}</p>
                               </td>
                               <td className="p-6 font-bold text-slate-700">{p.productName}</td>
                               <td className="p-6">
                                  <span className="text-xs font-bold text-slate-500">{p.quantity} units @ ₹{p.unitPrice.toFixed(2)}</span>
                               </td>
                               <td className="p-6 font-black text-blue-600 text-base">₹{p.totalAmount.toLocaleString()}</td>
                               <td className="p-6 text-right">
                                  <div className="flex justify-end gap-2">
                                    <button onClick={() => handleEditPurchase(p)} className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-gray-400"><Edit size={16} /></button>
                                    <button onClick={() => setPurchaseToDelete(p)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm border border-gray-400"><Trash2 size={16} /></button>
                                  </div>
                               </td>
                            </tr>
                          );
                       })}
                       {filteredBills.length === 0 && (
                         <tr><td colSpan={6} className="p-20 text-center text-slate-300 font-black uppercase text-xs tracking-widest">No matching bills found</td></tr>
                       )}
                    </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}

        {/* Payment History Tab */}
        {activeTab === 'payments' && (
           <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
              <div className="p-8 border-b bg-slate-50/50">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3">
                   <History className="text-green-600" size={24} strokeWidth={2.5} /> Payment History
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                      <tr>
                         <th className="p-6">Transaction Date</th>
                         <th className="p-6">Beneficiary</th>
                         <th className="p-6">Payment Mode</th>
                         <th className="p-6">Reference / Note</th>
                         <th className="p-6 text-right">Amount Cleared</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {payments.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(p => {
                         const supplier = suppliers.find(s => s.id === p.supplierId);
                         return (
                           <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-6 text-sm text-slate-500 font-bold">{new Date(p.date).toLocaleDateString()}</td>
                              <td className="p-6"><p className="font-black text-slate-900">{supplier?.name || 'Unknown'}</p></td>
                              <td className="p-6">
                                 <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 w-fit ${p.method === 'Cash' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {p.method === 'Cash' ? <Banknote size={14} /> : <Smartphone size={14} />} {p.method}
                                 </span>
                              </td>
                              <td className="p-6 text-xs text-slate-400 font-medium italic">{p.note || '-- No Note --'}</td>
                              <td className="p-6 text-right font-black text-slate-900 text-base">₹{p.amount.toLocaleString()}</td>
                           </tr>
                         );
                      })}
                   </tbody>
                </table>
              </div>
           </div>
        )}
      </div>

      {/* Order Statement Modal */}
      {viewingLedgerFor && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
               <div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Outstanding Orders</h3>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-0.5">
                    {suppliers.find(s => s.id === viewingLedgerFor)?.name}
                  </p>
               </div>
               <button onClick={() => setViewingLedgerFor(null)} className="p-3 bg-white rounded-full text-slate-400 hover:text-slate-600 shadow-sm transition-all border border-gray-400"><X size={24} /></button>
            </div>
            <div className="p-0 max-h-[60vh] overflow-y-auto no-scrollbar">
               <table className="w-full text-left">
                  <thead className="bg-slate-50 sticky top-0 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b">
                     <tr>
                        <th className="p-5">Date</th>
                        <th className="p-5">Product Details</th>
                        <th className="p-5 text-right">Total Order</th>
                        <th className="p-5 text-right">Outstanding</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {outstandingOrders.map((order, i) => (
                       <tr key={`${order.id}-${i}`} className="hover:bg-slate-50/30 transition-colors">
                          <td className="p-5 text-xs text-slate-500 font-bold">{new Date(order.date).toLocaleDateString()}</td>
                          <td className="p-5">
                             <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg"><TrendingUp size={14}/></div>
                                <div>
                                   <p className="text-sm font-black text-slate-900">{order.productName}</p>
                                   <p className="text-[10px] text-slate-400 font-bold">{order.quantity} units @ ₹{order.unitPrice.toFixed(2)}</p>
                                </div>
                             </div>
                          </td>
                          <td className="p-5 text-right text-xs font-bold text-slate-400">
                             ₹{order.totalAmount.toFixed(2)}
                          </td>
                          <td className="p-5 text-right font-black text-slate-900">
                             ₹{order.outstandingAmount.toFixed(2)}
                          </td>
                       </tr>
                     ))}
                  </tbody>
               </table>
               {outstandingOrders.length === 0 && (
                  <div className="p-20 text-center flex flex-col items-center gap-4">
                     <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center">
                        <CheckCircle2 size={32} />
                     </div>
                     <div>
                        <p className="font-black text-slate-800 uppercase tracking-tighter">No Dues Outstanding</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">All previous orders have been fully paid</p>
                     </div>
                  </div>
               )}
            </div>
            <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Payable Balance</p>
                  <p className="text-2xl font-black text-slate-800">₹{outstandingOrders.reduce((a,c) => a + c.outstandingAmount, 0).toFixed(2)}</p>
               </div>
               <button onClick={() => setViewingLedgerFor(null)} className="px-10 py-4 bg-slate-900 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">Close View</button>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Form Modal */}
      {showSupplierForm && editingSupplier && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
                 <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Supplier Profile</h2>
                 <button onClick={() => setShowSupplierForm(false)} className="p-3 bg-white rounded-full text-slate-400 hover:text-slate-600 shadow-sm transition-all border border-gray-400"><X size={24}/></button>
              </div>
              <form onSubmit={submitSupplier} className="p-10 space-y-8">
                 <div>
                    <label className="block text-[11px] font-black text-black uppercase tracking-widest mb-2 ml-1">Agency / Supplier Name</label>
                    <input 
                      type="text" required
                      value={editingSupplier.name}
                      onChange={e => handleNameChange(e.target.value)}
                      placeholder="Enter agency name"
                      className="w-full p-4 bg-white border border-gray-400 rounded-2xl focus:bg-white focus:border-blue-600 outline-none font-black text-slate-900 text-lg placeholder:text-slate-300"
                    />
                 </div>
                 <div>
                    <label className="block text-[11px] font-black text-black uppercase tracking-widest mb-2 ml-1">Mobile Contact</label>
                    <input 
                      type="text" inputMode="numeric" required
                      value={editingSupplier.phone}
                      onChange={e => handlePhoneChange(e.target.value)}
                      placeholder="10-digit number"
                      className={`w-full p-4 bg-white border rounded-2xl focus:bg-white outline-none font-black text-slate-900 text-lg placeholder:text-slate-300 ${isPhoneInvalid ? 'border-red-500' : 'border-gray-400 focus:border-blue-600'}`}
                    />
                 </div>
                 <div>
                    <label className="block text-[11px] font-black text-black uppercase tracking-widest mb-2 ml-1">Office / Warehouse Address</label>
                    <textarea 
                      rows={3}
                      value={editingSupplier.address}
                      onChange={e => setEditingSupplier({...editingSupplier, address: e.target.value})}
                      placeholder="Full office address..."
                      className="w-full p-4 bg-white border border-gray-400 rounded-2xl focus:bg-white focus:border-blue-600 outline-none font-black text-slate-900 text-lg placeholder:text-slate-300"
                    />
                 </div>
                 <div className="flex gap-4 pt-4">
                    <button 
                      type="button" 
                      onClick={() => setShowSupplierForm(false)}
                      className="flex-1 py-5 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:text-slate-800 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={!isSupplierFormValid}
                      className={`flex-[2] py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl transition-all active:scale-95 ${isSupplierFormValid ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
                    >
                        Save Supplier
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Payment Form Modal */}
      {showPaymentForm && selectedSupplierId && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 border border-gray-100">
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
                 <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Record Payment</h2>
                 <button onClick={() => setShowPaymentForm(false)} className="p-3 bg-white rounded-full text-slate-400 shadow-sm border border-gray-400"><X size={24}/></button>
              </div>
              <form onSubmit={submitPayment} className="p-10 space-y-8">
                 <div className="p-6 bg-blue-50 border border-blue-100 rounded-[2rem]">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Beneficiary</p>
                    <p className="text-xl font-black text-blue-900">{suppliers.find(s => s.id === selectedSupplierId)?.name}</p>
                 </div>
                 
                 <div>
                    <label className="block text-[11px] font-black text-black uppercase tracking-widest mb-2 ml-1">Amount to Clear (₹)</label>
                    <input 
                      name="amount" type="number" step="0.01" required autoFocus
                      className="w-full p-5 bg-white border border-gray-400 rounded-2xl font-black text-2xl focus:bg-white focus:border-blue-600 outline-none text-slate-900 placeholder:text-slate-300"
                      placeholder="0.00"
                    />
                 </div>

                 <div>
                    <label className="block text-[11px] font-black text-black uppercase tracking-widest mb-3 ml-1">Payment Mode</label>
                    <div className="grid grid-cols-2 gap-3">
                       <label className="flex items-center gap-3 p-4 border border-gray-400 bg-white rounded-2xl cursor-pointer hover:bg-slate-50 hover:border-blue-600 transition-all">
                          <input type="radio" name="method" value="Cash" defaultChecked className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-black uppercase tracking-widest text-slate-900">Cash</span>
                       </label>
                       <label className="flex items-center gap-3 p-4 border border-gray-400 bg-white rounded-2xl cursor-pointer hover:bg-slate-50 hover:border-blue-600 transition-all">
                          <input type="radio" name="method" value="Online" className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-black uppercase tracking-widest text-slate-900">Online</span>
                       </label>
                    </div>
                 </div>

                 <div>
                    <label className="block text-[11px] font-black text-black uppercase tracking-widest mb-2 ml-1">Reference / Note</label>
                    <input 
                      name="note" type="text"
                      className="w-full p-4 bg-white border border-gray-400 rounded-2xl focus:bg-white focus:border-blue-600 outline-none font-black text-slate-900 text-lg placeholder:text-slate-300"
                      placeholder="Trans ID, Chq No, or Remarks"
                    />
                 </div>

                 <button type="submit" className="w-full py-5 bg-green-600 text-white font-black rounded-2xl shadow-xl shadow-green-100 hover:bg-green-700 active:scale-95 transition-all uppercase tracking-widest text-xs">
                    Clear Due Now
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* Purchase Form Modal (Recording New) */}
      {showPurchaseForm && selectedSupplierId && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 border border-gray-100">
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
                 <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Inventory Purchase</h2>
                 <button onClick={() => setShowPurchaseForm(false)} className="p-3 bg-white rounded-full text-slate-400 shadow-sm border border-gray-400"><X size={24}/></button>
              </div>
              <form onSubmit={submitPurchase} className="p-10 space-y-8">
                 <div className="p-6 bg-orange-50 border border-orange-100 rounded-[2.5rem] flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Stock from Agency</p>
                      <p className="text-xl font-black text-orange-900">{suppliers.find(s => s.id === selectedSupplierId)?.name}</p>
                    </div>
                    <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-400">
                      <ShoppingCart className="text-orange-500" size={24} />
                    </div>
                 </div>
                 
                 <div className="space-y-6">
                    <div>
                       <label className="block text-[11px] font-black text-black uppercase tracking-widest mb-2 ml-1">Select Product to Replenish</label>
                       <select name="productName" required className="w-full p-4 bg-white border border-gray-400 rounded-2xl focus:bg-white focus:border-blue-600 outline-none font-black text-slate-900 text-lg appearance-none">
                          <option value="">-- Search Inventory --</option>
                          {products.map(p => (
                            <option key={`${p.id}-${p.sizeName}`} value={`${p.name}${p.sizeName ? ` (${p.sizeName})` : ''}`}>
                              {p.name} {p.sizeName ? `(${p.sizeName})` : ''} - Current: {p.stock} {p.unit}
                            </option>
                          ))}
                       </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div>
                           <label className="block text-[11px] font-black text-black uppercase tracking-widest mb-2 ml-1">Quantity Added</label>
                           <input 
                             name="quantity" type="number" required step="any"
                             className="w-full p-4 bg-white border border-gray-400 rounded-2xl focus:bg-white focus:border-blue-600 outline-none font-black text-slate-900 text-lg placeholder:text-slate-300"
                           />
                       </div>
                       <div>
                           <label className="block text-[11px] font-black text-black uppercase tracking-widest mb-2 ml-1">Unit Cost (₹)</label>
                           <input 
                             name="unitPrice" type="number" required step="0.01"
                             className="w-full p-4 bg-white border border-gray-400 rounded-2xl focus:bg-white focus:border-blue-600 outline-none font-black text-slate-900 text-lg placeholder:text-slate-300"
                           />
                       </div>
                    </div>
                 </div>

                 <button type="submit" className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl shadow-2xl hover:bg-black active:scale-95 transition-all uppercase tracking-widest text-xs">
                    Record Bill & Update Ledger
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* Edit Purchase Modal */}
      {isEditingPurchase && editPurchaseData && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 border border-gray-100">
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
                 <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Edit Purchase Record</h2>
                 <button onClick={() => setIsEditingPurchase(false)} className="p-3 bg-white rounded-full text-slate-400 shadow-sm transition-all border border-gray-400"><X size={24}/></button>
              </div>
              <form onSubmit={submitEditPurchase} className="p-10 space-y-6">
                 <div className="space-y-4">
                    <div>
                       <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-2 ml-1">Product Description</label>
                       <input 
                         type="text" required
                         value={editPurchaseData.productName}
                         onChange={e => setEditPurchaseData({...editPurchaseData, productName: e.target.value})}
                         className="w-full p-4 bg-white border border-gray-400 rounded-2xl focus:bg-white focus:border-blue-600 outline-none font-black text-slate-800"
                       />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div>
                           <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-2 ml-1">Quantity</label>
                           <input 
                             type="number" required step="any"
                             value={editPurchaseData.quantity}
                             onChange={e => setEditPurchaseData({...editPurchaseData, quantity: parseFloat(e.target.value) || 0})}
                             className="w-full p-4 bg-white border border-gray-400 rounded-2xl focus:bg-white focus:border-blue-600 outline-none font-black text-slate-800"
                           />
                       </div>
                       <div>
                           <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-2 ml-1">Unit Cost (₹)</label>
                           <input 
                             type="number" required step="0.01"
                             value={editPurchaseData.unitPrice}
                             onChange={e => setEditPurchaseData({...editPurchaseData, unitPrice: parseFloat(e.target.value) || 0})}
                             className="w-full p-4 bg-white border border-gray-400 rounded-2xl focus:bg-white focus:border-blue-600 outline-none font-black text-slate-800"
                           />
                       </div>
                    </div>
                 </div>

                 <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100 flex justify-between items-center">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">New Total Amount</span>
                    <span className="text-xl font-black text-blue-900">₹{(editPurchaseData.quantity * editPurchaseData.unitPrice).toLocaleString()}</span>
                 </div>

                 <button type="submit" className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 active:scale-95 transition-all uppercase tracking-widest text-xs">
                    Apply Corrections
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* Delete Purchase Confirmation */}
      {purchaseToDelete && (
        <div className="fixed inset-0 z-[110] bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl p-8 text-center animate-in zoom-in-95 border border-gray-100">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-[2rem] flex items-center justify-center mx-auto mb-4 border border-red-200">
                 <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-2">Delete Bill Entry?</h3>
              <p className="text-slate-500 font-bold mb-6 text-sm">Remove entry for <span className="text-slate-900">"{purchaseToDelete.productName}"</span>? This will reduce the supplier's total billed amount.</p>
              <div className="flex gap-3">
                 <button onClick={() => setPurchaseToDelete(null)} className="flex-1 py-4 bg-slate-100 text-slate-400 font-black rounded-2xl uppercase tracking-widest text-[10px] border border-gray-400">Cancel</button>
                 <button onClick={confirmDeletePurchase} className="flex-1 py-4 bg-red-600 text-white font-black rounded-2xl shadow-lg uppercase tracking-widest text-[10px] border border-gray-400">Delete Bill</button>
              </div>
           </div>
        </div>
      )}

      {/* Delete Supplier Confirmation */}
      {supplierToDelete && (
        <div className="fixed inset-0 z-[110] bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl p-8 text-center animate-in zoom-in-95 border border-gray-100">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-[2rem] flex items-center justify-center mx-auto mb-4 border border-red-200">
                 <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-2">Delete Supplier?</h3>
              <p className="text-slate-500 font-bold mb-6">Remove <span className="text-slate-900">"{supplierToDelete.name}"</span>? This will hide their profile from your active list.</p>
              <div className="flex gap-3">
                 <button onClick={() => setSupplierToDelete(null)} className="flex-1 py-4 bg-slate-100 text-slate-400 font-black rounded-2xl uppercase tracking-widest text-[10px] border border-gray-400">Cancel</button>
                 <button onClick={confirmDelete} className="flex-1 py-4 bg-red-600 text-white font-black rounded-2xl shadow-lg uppercase tracking-widest text-[10px] border border-gray-400">Delete</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
