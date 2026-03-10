
import React from 'react';
import { ViewState, StoreSettings, UserRole, ModuleToggles, Staff, Role } from '../types';
import { 
  LayoutDashboard, 
  ScanBarcode, 
  Package, 
  LogOut, 
  Users, 
  Truck, 
  Settings as SettingsIcon, 
  FileText, 
  Store,
  Lock,
  Printer
} from 'lucide-react';

interface NavbarProps {
  currentView: ViewState;
  setView: (v: ViewState) => void;
  settings: StoreSettings;
  currentRole: UserRole;
  roles: Role[];
  staff: Staff[];
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, setView, settings, currentRole, roles, staff, onLogout }) => {
  const pendingRequestsCount = staff.filter(s => s.status === 'Pending').length;

  const allNavItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', moduleKey: 'dashboard' as keyof ModuleToggles },
    { id: 'billing', icon: ScanBarcode, label: 'Billing Counter', moduleKey: 'billing' as keyof ModuleToggles },
    { id: 'inventory', icon: Package, label: 'Inventory', moduleKey: 'inventory' as keyof ModuleToggles },
    { id: 'suppliers', icon: Truck, label: 'Suppliers', moduleKey: 'suppliers' as keyof ModuleToggles },
    { id: 'staff', icon: Users, label: 'Staff Details', moduleKey: 'staff' as keyof ModuleToggles, hasBadge: true },
    { id: 'reports', icon: FileText, label: 'Reports', moduleKey: 'reports' as keyof ModuleToggles },
    { id: 'label_printing', icon: Printer, label: 'Label Printing', moduleKey: 'label_printing' as keyof ModuleToggles },
    { id: 'settings', icon: SettingsIcon, label: 'Settings', moduleKey: 'settings' as keyof ModuleToggles },
  ];

  const roleData = roles.find(r => r.id === currentRole || r.name.toLowerCase() === currentRole.toLowerCase());

  const navItemsWithStatus = allNavItems.map(item => {
    let isDisabled = false;

    // Super Admin overrides everything
    if (currentRole !== 'super_admin') {
      // 1. Check Global Module Toggle
      if (item.moduleKey && !settings.modules[item.moduleKey]) {
        isDisabled = true;
      }
      // 2. Check Role-Specific Permission
      else if (roleData && item.moduleKey && !roleData.permissions[item.moduleKey as keyof typeof roleData.permissions]) {
        isDisabled = true;
      }
    }

    return { ...item, isDisabled };
  });

  return (
    <nav className="w-64 bg-white border-r border-gray-200 flex flex-col h-full flex-shrink-0 z-20 shadow-[4px_0_10px_rgba(0,0,0,0.02)]">
      <div className="p-6 flex items-center gap-3 border-b border-gray-50">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100 rotate-2">
          <Store size={24} strokeWidth={2.5} />
        </div>
        <div>
          <h2 className="font-black text-slate-800 tracking-tighter leading-none text-lg">SmartMart</h2>
          <p className="text-[9px] text-blue-500 font-black uppercase tracking-widest mt-1">Enterprise POS</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 no-scrollbar">
        {navItemsWithStatus.map(item => {
          const Icon = item.icon;
          const isActive = currentView === item.id || (item.id === 'reports' && currentView === 'report_detail');
          const showBadge = item.hasBadge && pendingRequestsCount > 0 && (currentRole === 'super_admin' || currentRole === 'manager');
          
          return (
            <button
              key={item.id}
              disabled={item.isDisabled}
              onClick={() => !item.isDisabled && setView(item.id as ViewState)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all group relative ${
                item.isDisabled 
                  ? 'opacity-40 grayscale cursor-not-allowed pointer-events-none' 
                  : isActive 
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-100 ring-4 ring-blue-50' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="relative">
                <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-600 transition-colors'} />
                {item.isDisabled && (
                  <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                    <Lock size={8} className="text-slate-400" />
                  </div>
                )}
              </div>
              <span className="flex-1 text-left">{item.label}</span>
              
              {showBadge && !item.isDisabled && (
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black border-2 ${isActive ? 'bg-white text-blue-600 border-blue-500' : 'bg-red-500 text-white border-white'}`}>
                  {pendingRequestsCount}
                </span>
              )}

              {isActive && !showBadge && !item.isDisabled && (
                <div className="absolute right-2 w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
              )}
            </button>
          );
        })}
      </div>

      <div className="p-4 border-t border-gray-100 bg-slate-50/50">
        <div className="mb-4 px-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Active Session</p>
           <p className="text-sm font-black text-slate-800 truncate">{currentRole.replace('_', ' ')}</p>
        </div>
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-red-500 hover:bg-red-50 transition-all group"
        >
          <div className="p-2 bg-red-50 text-red-500 rounded-lg group-hover:bg-red-100 transition-colors">
            <LogOut size={18} />
          </div>
          Sign Out
        </button>
      </div>
    </nav>
  );
};
