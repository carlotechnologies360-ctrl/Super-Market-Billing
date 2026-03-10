
import React, { useState, useMemo } from 'react';
import { Sale, Product, Purchase, SalaryPayment, Supplier, Staff, RevenuePeriod } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { 
  TrendingUp, Package, AlertTriangle, IndianRupee, Calendar, 
  ShoppingCart, Download, ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, Info
} from 'lucide-react';

interface ReportsProps {
  sales: Sale[];
  products: Product[];
  purchases: Purchase[];
  suppliers: Supplier[];
  staff: Staff[];
  salaryPayments: SalaryPayment[];
  onDeleteProduct: (id: string, name: string, sizeName?: string) => void;
  onViewReport: (period: RevenuePeriod, startDate?: string, endDate?: string) => void;
}

type ReportTab = 'sales' | 'stock' | 'purchases';

export const Reports: React.FC<ReportsProps> = ({ 
  sales, 
  products, 
  purchases, 
  suppliers, 
  staff, 
  salaryPayments, 
  onDeleteProduct,
  onViewReport
}) => {
  const [activeTab, setActiveTab] = useState<ReportTab>('sales');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Filter helper
  const filterByDate = (dateStr: string) => {
    if (!dateRange.start || !dateRange.end) return true;
    const date = new Date(dateStr);
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    end.setHours(23, 59, 59);
    return date >= start && date <= end;
  };

  // --- 3.1 SALES REPORTS ---
  const salesStats = useMemo(() => {
    const filtered = sales.filter(s => filterByDate(s.date));
    const total = filtered.reduce((acc, s) => acc + s.totalAmount, 0);
    
    const itemMap: Record<string, number> = {};
    filtered.forEach(s => {
      s.items.forEach(item => {
        itemMap[item.name] = (itemMap[item.name] || 0) + item.cartQuantity;
      });
    });

    const bestSellers = Object.entries(itemMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { total, count: filtered.length, bestSellers, filteredRecords: filtered };
  }, [sales, dateRange]);

  // --- 3.2 STOCK REPORTS ---
  const stockStats = useMemo(() => {
    const totalItems = products.length;
    const lowStock = products.filter(p => p.stock > 0 && p.stock < 50);
    const outOfStock = products.filter(p => p.stock === 0);
    const healthy = totalItems - lowStock.length - outOfStock.length;

    return { 
      totalItems, 
      lowStock, 
      outOfStock,
      pieData: [
        { name: 'Healthy', value: healthy, color: '#22c55e' },
        { name: 'Low Stock', value: lowStock.length, color: '#f59e0b' },
        { name: 'Out of Stock', value: outOfStock.length, color: '#ef4444' }
      ]
    };
  }, [products]);

  // --- 3.3 PURCHASE REPORTS ---
  const purchaseStats = useMemo(() => {
    const filtered = purchases.filter(p => filterByDate(p.date));
    const totalAmount = filtered.reduce((acc, p) => acc + p.totalAmount, 0);
    
    const supplierMap: Record<string, number> = {};
    filtered.forEach(p => {
      const sName = suppliers.find(s => s.id === p.supplierId)?.name || 'Unknown';
      supplierMap[sName] = (supplierMap[sName] || 0) + p.totalAmount;
    });

    return { totalAmount, filtered, supplierBreakdown: Object.entries(supplierMap).map(([name, amount]) => ({ name, amount })) };
  }, [purchases, suppliers, dateRange]);

  // --- DOWNLOAD CSV HANDLER ---
  const handleDownload = () => {
    let csvContent = "";
    let fileName = `SmartMart_${activeTab}_Report`;

    if (activeTab === 'sales') {
      const headers = ["Date", "Bill ID", "Customer Name", "Mobile", "Payment Method", "Total Amount", "Savings"];
      const rows = salesStats.filteredRecords.map(s => [
        new Date(s.date).toLocaleString(),
        s.id,
        s.customerName || "Walk-in",
        s.customerMobile || "N/A",
        s.paymentMethod,
        s.totalAmount.toFixed(2),
        s.totalSavings?.toFixed(2) || "0.00"
      ]);
      csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    } 
    else if (activeTab === 'stock') {
      const headers = ["Product ID", "Name", "Category", "Size", "Unit", "Selling Price", "Stock Level"];
      const rows = products.map(p => [
        p.id,
        p.name,
        p.category,
        p.sizeName || "Standard",
        p.unit,
        p.price.toFixed(2),
        p.stock
      ]);
      csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    }
    else if (activeTab === 'purchases') {
      const headers = ["Date", "Bill ID", "Supplier", "Product", "Quantity", "Unit Cost", "Total Amount"];
      const rows = purchaseStats.filtered.map(p => [
        new Date(p.date).toLocaleDateString(),
        p.id,
        suppliers.find(s => s.id === p.supplierId)?.name || "Unknown",
        p.productName,
        p.quantity,
        p.unitPrice.toFixed(2),
        p.totalAmount.toFixed(2)
      ]);
      csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${fileName}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tabs: { id: ReportTab; label: string; icon: any }[] = [
    { id: 'sales', label: 'Sales', icon: TrendingUp },
    { id: 'stock', label: 'Stock', icon: Package },
    { id: 'purchases', label: 'Purchases', icon: ShoppingCart },
  ];

  return (
    <div className="p-6 h-full bg-gray-50 flex flex-col overflow-y-auto no-scrollbar">
      {/* Header & Range Selection */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Business Reports</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Detailed performance and inventory metrics</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 bg-white p-2 rounded-xl shadow-sm border border-gray-200">
             <Calendar size={18} className="text-gray-400" />
             <input 
               type="date" 
               className="text-xs font-bold outline-none bg-transparent [color-scheme:light]"
               value={dateRange.start}
               onChange={e => setDateRange({...dateRange, start: e.target.value})}
             />
             <span className="text-gray-300">to</span>
             <input 
               type="date" 
               className="text-xs font-bold outline-none bg-transparent [color-scheme:light]"
               value={dateRange.end}
               onChange={e => setDateRange({...dateRange, end: e.target.value})}
             />
          </div>
          <button 
            onClick={handleDownload}
            title={`Download ${activeTab} report`}
            className="p-2 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2 px-4"
          >
             <Download size={20} />
             <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">Download</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 p-1 bg-gray-200/50 rounded-2xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm scale-105' : 'text-gray-500 hover:bg-white/50'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Report Content */}
      <div className="flex-1">
        {activeTab === 'sales' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Total Sales Amount</p>
                  <p className="text-3xl font-black text-gray-800">₹{salesStats.total.toLocaleString()}</p>
               </div>
               <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Total Bills Generated</p>
                  <p className="text-3xl font-black text-gray-800">{salesStats.count}</p>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><TrendingUp size={18} className="text-blue-500" /> Sales Volume Trend</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                       <LineChart data={sales.slice(-7).map(s => ({ date: new Date(s.date).toLocaleDateString(), amt: s.totalAmount }))}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="date" fontSize={10} />
                          <YAxis fontSize={10} />
                          <Tooltip />
                          <Line type="monotone" dataKey="amt" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6' }} />
                       </LineChart>
                    </ResponsiveContainer>
                  </div>
               </div>
               <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><ShoppingCart size={18} className="text-orange-500" /> Best Selling Products</h3>
                  <div className="space-y-4">
                     {salesStats.bestSellers.map((item, idx) => (
                       <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <div className="flex items-center gap-3">
                             <span className="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full font-bold text-xs">{idx+1}</span>
                             <span className="font-bold text-gray-700">{item.name}</span>
                          </div>
                          <span className="font-black text-gray-900">{item.count} units</span>
                       </div>
                     ))}
                     {salesStats.bestSellers.length === 0 && <p className="text-center text-gray-400 py-10">No sales data available</p>}
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'stock' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center">
                  <div className="w-full h-64">
                    <h3 className="font-bold text-gray-800 mb-4">Stock Distribution</h3>
                    <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                          <Pie
                            data={stockStats.pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {stockStats.pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                       </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 text-xs font-bold mt-2">
                       {stockStats.pieData.map(d => (
                         <div key={d.name} className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></div>
                            <span>{d.name} ({d.value})</span>
                         </div>
                       ))}
                    </div>
                  </div>
               </div>
               <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                  <h3 className="font-bold text-red-600 mb-4 flex items-center gap-2"><AlertTriangle size={18} /> Critical Alerts (Low/Out of Stock)</h3>
                  <div className="overflow-y-auto flex-1 max-h-[400px]">
                    <table className="w-full text-left">
                       <thead className="text-[10px] font-black text-gray-400 uppercase border-b bg-gray-50/50">
                          <tr>
                             <th className="p-3">Product</th>
                             <th className="p-3">In Stock</th>
                             <th className="p-3">Status</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y">
                          {[...stockStats.outOfStock, ...stockStats.lowStock].map(p => (
                            <tr key={p.id}>
                               <td className="p-3 text-sm font-bold text-gray-800">{p.name} {p.sizeName}</td>
                               <td className="p-3 text-sm font-black text-gray-900">{p.stock}</td>
                               <td className="p-3">
                                  <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase ${p.stock === 0 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                                    {p.stock === 0 ? 'Out of Stock' : 'Low Stock'}
                                  </span>
                               </td>
                            </tr>
                          ))}
                       </tbody>
                    </table>
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'purchases' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
               <h3 className="font-bold text-gray-800 mb-6">Total Purchase Expenditure: <span className="text-blue-600">₹{purchaseStats.totalAmount.toLocaleString()}</span></h3>
               <div className="overflow-hidden border border-gray-100 rounded-xl">
                 <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                       <tr>
                          <th className="p-4 text-xs font-bold text-gray-500 uppercase">Date</th>
                          <th className="p-4 text-xs font-bold text-gray-500 uppercase">Product</th>
                          <th className="p-4 text-xs font-bold text-gray-500 uppercase">Supplier</th>
                          <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Total Amt</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                       {purchaseStats.filtered.map(p => (
                         <tr key={p.id} className="hover:bg-gray-50">
                            <td className="p-4 text-sm text-gray-600 font-medium">{new Date(p.date).toLocaleDateString()}</td>
                            <td className="p-4 text-sm font-bold text-gray-800">{p.productName}</td>
                            <td className="p-4 text-sm text-gray-600">
                               {suppliers.find(s => s.id === p.supplierId)?.name || 'Unknown'}
                            </td>
                            <td className="p-4 text-sm font-black text-gray-900 text-right">₹{p.totalAmount.toFixed(2)}</td>
                         </tr>
                       ))}
                       {purchaseStats.filtered.length === 0 && (
                         <tr><td colSpan={4} className="p-20 text-center text-gray-400 italic">No purchase records found in this range.</td></tr>
                       )}
                    </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
