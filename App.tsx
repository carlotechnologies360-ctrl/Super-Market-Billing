
import React, { useState, useEffect } from 'react';
import { Product, Sale, ViewState, PaymentMethod, CartItem, RevenuePeriod, Staff, Role, Purchase, SalaryPayment, Supplier, SupplierPayment, StoreSettings, UserRole, ModuleToggles, CurrentUser } from './types';
import * as api from './services/db';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { Billing } from './components/Billing';
import { ReportDetail } from './components/ReportDetail';
import { Navbar } from './components/Navbar';
import { StaffManagement } from './components/StaffManagement';
import { SupplierManagement } from './components/SupplierManagement';
import { BarcodeLabelPrinter } from './components/BarcodeLabelPrinter';
import { Settings } from './components/Settings';
import { Reports } from './components/Reports';
import { Login } from './components/Login';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [view, setView] = useState<ViewState>('login');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  const [reportFilter, setReportFilter] = useState<{
    period: RevenuePeriod;
    startDate?: string;
    endDate?: string;
  }>({ period: 'Daily' });

  // Parallel Data Initializer
  const refreshAllData = async () => {
    try {
      const [p, s, st, r, pur, sup, pay, sett] = await Promise.all([
        api.getProducts(),
        api.getSales(),
        api.getStaff(),
        api.getRoles(),
        api.getPurchases(),
        api.getSuppliers(),
        api.getSupplierPayments(),
        api.getSettings()
      ]);
      
      setProducts(p);
      setSales(s);
      setStaff(st);
      setRoles(r);
      setPurchases(pur);
      setSuppliers(sup);
      setSupplierPayments(pay);
      setSettings(sett);
      return { staff: st, roles: r };
    } catch (err) {
      console.error("API Error:", err);
      return null;
    }
  };

  useEffect(() => {
    const initSession = async () => {
      const data = await refreshAllData();
      
      const savedUser = localStorage.getItem('smartmart_session');
      if (savedUser && data) {
        try {
          const user = JSON.parse(savedUser) as CurrentUser;
          if (user.id === 'SA001') {
            setCurrentUser(user);
            setIsAuthenticated(true);
            setView('dashboard');
          } else {
            const latestStaff = data.staff.find(s => s.id === user.id);
            if (latestStaff && latestStaff.status === 'Active') {
              setCurrentUser(user);
              setIsAuthenticated(true);
              setView(user.role === 'cashier' ? 'billing' : 'dashboard');
            } else {
              handleLogout();
            }
          }
        } catch (e) {
          localStorage.removeItem('smartmart_session');
        }
      }
      setIsInitialLoading(false);
    };

    initSession();
  }, []);

  const handleLogin = (user: CurrentUser) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem('smartmart_session', JSON.stringify(user));
    setView(user.role === 'cashier' ? 'billing' : 'dashboard');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('smartmart_session');
    setView('login');
  };

  const handleAddProduct = async (product: Product) => {
    await api.saveProduct(product);
    setProducts(await api.getProducts());
  };

  const handleDeleteProduct = async (id: string, name: string, sizeName?: string) => {
    await api.deleteProduct(id, name, sizeName);
    setProducts(await api.getProducts());
  };

  const handleCompleteSale = async (items: CartItem[], total: number, method: PaymentMethod, customerName?: string, customerMobile?: string, totalSavings?: number, cashAmount?: number, upiAmount?: number) => {
    const newSale: Sale = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      items,
      totalAmount: total,
      totalSavings: totalSavings,
      paymentMethod: method,
      customerName,
      customerMobile,
      cashAmount,
      upiAmount
    };
    
    await api.saveSale(newSale);

    // Save Customer Details for future auto-fill
    if (customerMobile && customerMobile.length === 10 && customerName) {
      await api.saveCustomer({
        mobile: customerMobile,
        name: customerName,
        lastVisit: new Date().toISOString()
      });
    }
    
    const currentProducts = await api.getProducts();
    for (const soldItem of items) {
      const idx = currentProducts.findIndex(p => p.id === soldItem.id && (p.sizeName || '') === (soldItem.sizeName || ''));
      if (idx !== -1) {
        currentProducts[idx].stock = Math.max(0, currentProducts[idx].stock - soldItem.cartQuantity);
        await api.saveProduct(currentProducts[idx]);
      }
    }
    
    setSales(await api.getSales());
    setProducts(await api.getProducts());
  };

  const handleSaveStaff = async (member: Staff) => {
    await api.saveStaff(member);
    setStaff(await api.getStaff());
  };

  const handleDeleteStaff = async (id: string) => {
    await api.deleteStaff(id);
    setStaff(await api.getStaff());
  };

  const handleSaveSupplier = async (s: Supplier) => {
    await api.saveSupplier(s);
    setSuppliers(await api.getSuppliers());
  };

  const handleDeleteSupplier = async (id: string) => {
    await api.deleteSupplier(id);
    setSuppliers(await api.getSuppliers());
  };

  const handleSaveSupplierPayment = async (p: SupplierPayment) => {
    await api.saveSupplierPayment(p);
    setSupplierPayments(await api.getSupplierPayments());
  };

  const handleSavePurchase = async (p: Purchase) => {
    await api.savePurchase(p);
    setPurchases(await api.getPurchases());
  };

  if (isInitialLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900">
         <div className="relative">
            <div className="w-20 h-20 border-4 border-indigo-500/20 rounded-full"></div>
            <div className="absolute top-0 w-20 h-20 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
         </div>
         <p className="mt-8 text-indigo-400 font-black uppercase tracking-[0.3em] text-xs">Establishing Secure Connection</p>
      </div>
    );
  }

  if (!isAuthenticated || view === 'login' || !settings) {
    return <Login staff={staff} roles={roles} onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <Navbar 
        currentView={view} 
        setView={setView} 
        settings={settings} 
        currentRole={currentUser?.role || 'cashier'} 
        roles={roles}
        staff={staff}
        onLogout={handleLogout}
      />
      
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {view === 'dashboard' && <Dashboard sales={sales} products={products} onViewReport={(p, s, e) => { setReportFilter({period: p, startDate: s, endDate: e}); setView('report_detail'); }} />}
        {view === 'inventory' && <Inventory products={products} onAddProduct={handleAddProduct} onDeleteProduct={handleDeleteProduct} />}
        {view === 'billing' && <Billing products={products} settings={settings} onCompleteSale={handleCompleteSale} />}
        {view === 'suppliers' && (
          <SupplierManagement 
            suppliers={suppliers} purchases={purchases} payments={supplierPayments} products={products} 
            onSaveSupplier={handleSaveSupplier} onDeleteSupplier={handleDeleteSupplier} 
            onSavePayment={handleSaveSupplierPayment} onSavePurchase={handleSavePurchase}
            onUpdatePurchase={async (p) => { await api.updatePurchase(p); refreshAllData(); }}
            onDeletePurchase={async (id) => { await api.deletePurchase(id); refreshAllData(); }}
          />
        )}
        {view === 'staff' && <StaffManagement staff={staff} roles={roles} onSaveStaff={handleSaveStaff} onDeleteStaff={handleDeleteStaff} />}
        {view === 'label_printing' && <BarcodeLabelPrinter products={products} settings={settings} />}
        {view === 'settings' && <Settings settings={settings} roles={roles} currentRole={currentUser?.role || 'cashier'} onSaveSettings={(s) => { api.saveSettings(s); setSettings(s); }} onSaveRole={async (r) => { await api.saveRole(r); refreshAllData(); }} onDeleteRole={async (id) => { await api.deleteRole(id); refreshAllData(); }} onExport={() => {}} onImport={() => {}} />}
        {view === 'reports' && <Reports sales={sales} products={products} purchases={purchases} suppliers={suppliers} staff={staff} salaryPayments={[]} onDeleteProduct={handleDeleteProduct} onViewReport={(p, s, e) => { setReportFilter({period: p, startDate: s, endDate: e}); setView('report_detail'); }} />}
        {view === 'report_detail' && <ReportDetail sales={sales} settings={settings} filter={reportFilter} onUpdateSale={async (s) => { await api.updateSale(s); setSales(await api.getSales()); }} onBack={() => setView('dashboard')} />}
      </main>
    </div>
  );
};

export default App;
