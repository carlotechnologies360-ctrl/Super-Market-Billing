
import React, { useMemo, useState, useEffect } from 'react';
import { Sale, Product, PaymentMethod, RevenuePeriod } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, AlertTriangle, IndianRupee, Calendar, Filter, FileText, Smartphone, CreditCard, Banknote, Wallet } from 'lucide-react';

interface DashboardProps {
  sales: Sale[];
  products: Product[];
  onViewReport: (period: RevenuePeriod, start?: string, end?: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ sales, products, onViewReport }) => {
  const [now, setNow] = useState(new Date());

  // Date Filtering State
  const [revenuePeriod, setRevenuePeriod] = useState<RevenuePeriod>('Daily');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Auto-refresh timer for date changes
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000); 
    return () => clearInterval(timer);
  }, []);

  // Filter Sales based on selection
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const saleDate = new Date(sale.date);
      
      if (revenuePeriod === 'Daily') {
         return saleDate.toDateString() === now.toDateString();
      } else if (revenuePeriod === 'Weekly') {
         const oneWeekAgo = new Date(now);
         oneWeekAgo.setDate(now.getDate() - 7);
         return saleDate >= oneWeekAgo;
      } else if (revenuePeriod === 'Monthly') {
         return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
      } else if (revenuePeriod === 'Custom' && customStartDate && customEndDate) {
         const start = new Date(customStartDate);
         const end = new Date(customEndDate);
         end.setHours(23, 59, 59); // End of day
         return saleDate >= start && saleDate <= end;
      }
      return false; // Default safe fallback
    });
  }, [sales, now, revenuePeriod, customStartDate, customEndDate]);

  const stats = useMemo(() => {
    // Total Sales (Revenue)
    const totalRevenue = filteredSales.reduce((acc, sale) => acc + sale.totalAmount, 0);
    
    // Orders Count
    const orderCount = filteredSales.length;

    // Split Revenue by Payment Method - Accounting for MIXED (Cash + UPI)
    let cashTotal = 0;
    let upiTotal = 0;
    let cardTotal = 0;

    filteredSales.forEach(s => {
      if (s.paymentMethod === PaymentMethod.CASH) {
        cashTotal += s.totalAmount;
      } else if (s.paymentMethod === PaymentMethod.UPI) {
        upiTotal += s.totalAmount;
      } else if (s.paymentMethod === PaymentMethod.CARD) {
        cardTotal += s.totalAmount;
      } else if (s.paymentMethod === PaymentMethod.MIXED) {
        // Correctly split mixed payments into their respective buckets
        cashTotal += (s.cashAmount || 0);
        upiTotal += (s.upiAmount || 0);
      }
    });

    // Low Stock (Critical < 50) - Always based on current product state
    const lowStockItems = products.filter(p => p.stock < 50);

    // Top Selling - Based on filtered period
    const productCounts: Record<string, number> = {};
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        productCounts[item.name] = (productCounts[item.name] || 0) + item.cartQuantity;
      });
    });

    const topProducts = Object.entries(productCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { totalRevenue, orderCount, cashTotal, upiTotal, cardTotal, lowStockItems, topProducts };
  }, [filteredSales, products]);

  // Chart Data - Aggregated based on view
  const chartData = useMemo(() => {
    const dataMap: Record<string, number> = {};
    
    filteredSales.forEach(sale => {
      let key = '';
      const d = new Date(sale.date);
      
      if (revenuePeriod === 'Daily') {
         // For Daily, group by Hour
         key = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
         // For others, group by Date
         key = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      }
      
      dataMap[key] = (dataMap[key] || 0) + sale.totalAmount;
    });

    return Object.entries(dataMap).map(([name, amount]) => ({
      name,
      amount
    }));
  }, [filteredSales, revenuePeriod]);

  return (
    <div className="p-6 space-y-6 pb-24 h-full bg-gray-50 overflow-y-auto no-scrollbar">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
             Sales Overview: {revenuePeriod}
          </p>
        </div>

        {/* Date Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white p-1 rounded-lg shadow-sm border border-gray-200">
             <Filter size={16} className="text-gray-400 ml-2" />
             <select 
               value={revenuePeriod} 
               onChange={(e) => setRevenuePeriod(e.target.value as RevenuePeriod)}
               className="bg-transparent border-none text-gray-900 text-sm font-medium rounded-lg focus:ring-0 block p-2 outline-none cursor-pointer"
             >
               <option value="Daily">Daily (Today)</option>
               <option value="Weekly">Weekly (Last 7 Days)</option>
               <option value="Monthly">Monthly (Current Month)</option>
               <option value="Custom">Custom Range</option>
             </select>

             {revenuePeriod === 'Custom' && (
               <div className="flex gap-2 items-center px-2 border-l border-gray-100 ml-1">
                 <input 
                   type="date" 
                   className="p-1 border border-gray-300 rounded text-xs bg-white text-gray-900 [color-scheme:light]" 
                   onChange={e => setCustomStartDate(e.target.value)} 
                 />
                 <span className="text-gray-400">-</span>
                 <input 
                   type="date" 
                   className="p-1 border border-gray-300 rounded text-xs bg-white text-gray-900 [color-scheme:light]" 
                   onChange={e => setCustomEndDate(e.target.value)} 
                 />
               </div>
             )}
          </div>
          
          <button 
             onClick={() => onViewReport(revenuePeriod, customStartDate, customEndDate)}
             className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 shadow-sm transition-all active:scale-95"
          >
             <FileText size={18} />
             Detailed Report
          </button>
        </div>
      </div>

      {/* Main Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Sales</span>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
               <IndianRupee size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-800">₹{stats.totalRevenue.toLocaleString()}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm font-semibold uppercase tracking-wider">No of Bills</span>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
               <TrendingUp size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-800">{stats.orderCount}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Total Payment Collection</span>
            <div className="p-2 bg-green-50 rounded-lg text-green-600">
               <Wallet size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-800">
            ₹{stats.totalRevenue.toLocaleString()}
          </p>
        </div>

        <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 ${stats.lowStockItems.length > 0 ? 'border-l-red-500 bg-red-50' : 'border-l-gray-300'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`${stats.lowStockItems.length > 0 ? 'text-red-700' : 'text-gray-500'} text-sm font-semibold uppercase tracking-wider`}>Low Stock Items</span>
            <div className={`p-2 rounded-lg ${stats.lowStockItems.length > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
               <AlertTriangle size={20} />
            </div>
          </div>
          <p className={`text-3xl font-bold ${stats.lowStockItems.length > 0 ? 'text-red-700' : 'text-gray-800'}`}>
            {stats.lowStockItems.length}
          </p>
        </div>
      </div>

      {/* Payment Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
           <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0">
              <Banknote size={24} />
           </div>
           <div>
              <p className="text-sm text-gray-500 font-medium">Cash Collection</p>
              <p className="text-xl font-bold text-gray-800">₹{stats.cashTotal.toLocaleString()}</p>
           </div>
        </div>
        
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
           <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <Smartphone size={24} />
           </div>
           <div>
              <p className="text-sm text-gray-500 font-medium">UPI / Digital</p>
              <p className="text-xl font-bold text-gray-800">₹{stats.upiTotal.toLocaleString()}</p>
           </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
           <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
              <CreditCard size={24} />
           </div>
           <div>
              <p className="text-sm text-gray-500 font-medium">Card Payments</p>
              <p className="text-xl font-bold text-gray-800">₹{stats.cardTotal.toLocaleString()}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-6 text-gray-800">Sales Trend ({revenuePeriod})</h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-6 text-gray-800 flex items-center gap-2">
            <Calendar size={18} /> 
            Top Selling
          </h2>
          <div className="space-y-4">
            {stats.topProducts.map((prod, idx) => (
              <div key={idx} className="flex justify-between items-center border-b border-gray-50 pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                    {idx + 1}
                  </div>
                  <span className="font-medium text-gray-700">{prod.name}</span>
                </div>
                <span className="font-bold text-gray-900">{prod.count} sold</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
