
import React, { useState } from 'react';
import { StoreSettings, Role, RolePermissions, ModuleToggles, UserRole } from '../types';
import { 
  Store, Shield, Database, Save, Upload, Download, Trash2, 
  Plus, X, Camera, Building2, Phone, MapPin, 
  LayoutDashboard, ScanBarcode, Package, Truck, Users, Settings as SettingsIcon,
  Crown, Lock, Printer, FileText, Edit
} from 'lucide-react';

interface SettingsProps {
  settings: StoreSettings;
  roles: Role[];
  currentRole: UserRole;
  onSaveSettings: (s: StoreSettings) => void;
  onSaveRole: (r: Role) => void;
  onDeleteRole: (id: string) => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

export const Settings: React.FC<SettingsProps> = ({ 
  settings, roles, currentRole, onSaveSettings, onSaveRole, onDeleteRole, onExport, onImport 
}) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [activeSection, setActiveSection] = useState<'store' | 'roles' | 'backup' | 'super_admin'>(currentRole === 'super_admin' ? 'super_admin' : 'store');

  const handleSaveStore = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(localSettings);
    alert("Settings saved successfully!");
  };

  const toggleGlobalModule = (module: keyof ModuleToggles) => {
    const newSettings = {
      ...settings,
      modules: {
        ...settings.modules,
        [module]: !settings.modules[module]
      }
    };
    onSaveSettings(newSettings);
  };

  const toggleRolePermission = (roleId: string, moduleKey: keyof RolePermissions) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;

    const updatedRole: Role = {
      ...role,
      permissions: {
        ...role.permissions,
        [moduleKey]: !role.permissions[moduleKey]
      }
    };
    onSaveRole(updatedRole);
  };

  const togglePermission = (perm: keyof RolePermissions) => {
    if (!editingRole) return;
    setEditingRole({
      ...editingRole,
      permissions: {
        ...editingRole.permissions,
        [perm]: !editingRole.permissions[perm]
      }
    });
  };

  const handleAddNewRole = () => {
    setEditingRole({
      id: `role-${Date.now()}`,
      name: '',
      permissions: {
        dashboard: false, billing: true, inventory: false, suppliers: false, staff: false, reports: false, label_printing: true, settings: false
      }
    });
  };

  const menuItems = [
    { id: 'super_admin', label: 'Module Control', icon: Crown, hidden: currentRole !== 'super_admin' },
    { id: 'store', label: 'Store Details', icon: Store },
    { id: 'roles', label: 'User Roles', icon: Shield },
    { id: 'backup', label: 'Backup & Restore', icon: Database },
  ].filter(i => !i.hidden);

  const modules = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'billing', label: 'Billing', icon: ScanBarcode },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'suppliers', label: 'Suppliers', icon: Truck },
    { id: 'staff', label: 'Staff', icon: Users },
    { id: 'label_printing', label: 'Label Printing', icon: Printer },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="p-6 h-full flex flex-col bg-gray-50 overflow-y-auto no-scrollbar">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Admin Settings</h1>
        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Configure store preferences and user access</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0">
        <div className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden p-2 space-y-1">
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id as any)}
                className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-[10px] uppercase tracking-widest font-black transition-all ${
                  activeSection === item.id 
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' 
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1">
          {activeSection === 'super_admin' && currentRole === 'super_admin' && (
            <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 p-8 animate-in fade-in slide-in-from-left-4">
              <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-50">
                <div className="p-4 bg-amber-100 text-amber-600 rounded-2xl shadow-inner shadow-amber-200/50">
                  <Crown size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Permission Matrix</h2>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Master control for all user roles and modules</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-[2rem] border border-gray-100 shadow-inner bg-slate-50/30">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-100">
                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">App Module</th>
                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Global Toggle</th>
                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Manager</th>
                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Cashier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {modules.map(module => (
                      <tr key={module.id} className="group hover:bg-slate-50 transition-colors">
                        <td className="p-5">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${settings.modules[module.id as keyof ModuleToggles] ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-300'}`}>
                              <module.icon size={20} />
                            </div>
                            <span className="font-black text-slate-800 text-sm uppercase tracking-tight">{module.label}</span>
                          </div>
                        </td>
                        <td className="p-5 text-center">
                          <button 
                            onClick={() => toggleGlobalModule(module.id as keyof ModuleToggles)}
                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all ${settings.modules[module.id as keyof ModuleToggles] ? 'bg-green-500 shadow-md' : 'bg-slate-200'}`}
                          >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${settings.modules[module.id as keyof ModuleToggles] ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </td>
                        <td className="p-5 text-center">
                          <button 
                            onClick={() => toggleRolePermission('manager', module.id as keyof RolePermissions)}
                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all ${roles.find(r => r.id === 'manager')?.permissions[module.id as keyof RolePermissions] ? 'bg-blue-500 shadow-md' : 'bg-slate-200'}`}
                          >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${roles.find(r => r.id === 'manager')?.permissions[module.id as keyof RolePermissions] ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </td>
                        <td className="p-5 text-center">
                          <button 
                            onClick={() => toggleRolePermission('cashier', module.id as keyof RolePermissions)}
                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all ${roles.find(r => r.id === 'cashier')?.permissions[module.id as keyof RolePermissions] ? 'bg-blue-500 shadow-md' : 'bg-slate-200'}`}
                          >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${roles.find(r => r.id === 'cashier')?.permissions[module.id as keyof RolePermissions] ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-8 p-6 bg-amber-50 rounded-3xl border border-amber-100 flex gap-4">
                 <div className="p-2 bg-white text-amber-500 rounded-xl h-fit shadow-sm">
                   <Lock size={20} />
                 </div>
                 <div>
                    <p className="text-xs font-black text-amber-800 uppercase tracking-widest mb-1">Super Admin Note</p>
                    <p className="text-[11px] text-amber-700/80 font-bold leading-relaxed">
                      "Global Toggle" completely disables the module for all staff users. Role-specific toggles control page visibility in the sidebar. Super Admin (ID: SA001) always has full access.
                    </p>
                 </div>
              </div>
            </div>
          )}

          {activeSection === 'store' && (
            <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 p-8">
              <h2 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3 uppercase tracking-tighter">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                  <Store size={22} />
                </div>
                Store Profile
              </h2>
              <form onSubmit={handleSaveStore} className="space-y-8">
                <div className="flex flex-col md:flex-row gap-10">
                   <div className="w-40 h-40 rounded-[2.5rem] bg-slate-50 border-4 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors overflow-hidden group relative shadow-inner">
                      {localSettings.logo ? (
                        <img src={localSettings.logo} className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <Camera className="text-slate-300 mb-1" />
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">UPLOAD LOGO</span>
                        </>
                      )}
                      <input 
                        type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => setLocalSettings({...localSettings, logo: ev.target?.result as string});
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                   </div>
                   <div className="flex-1 space-y-6">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Store Name</label>
                        <div className="relative">
                          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                          <input 
                            type="text" required value={localSettings.name}
                            onChange={e => setLocalSettings({...localSettings, name: e.target.value})}
                            className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-400 rounded-2xl focus:bg-white focus:border-blue-600 outline-none font-black text-slate-800"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Contact Number</label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                          <input 
                            type="text" required value={localSettings.contact}
                            onChange={e => setLocalSettings({...localSettings, contact: e.target.value})}
                            className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-400 rounded-2xl focus:bg-white focus:border-blue-600 outline-none font-black text-slate-800"
                          />
                        </div>
                      </div>
                   </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Store Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-4 text-slate-300" size={18} />
                    <textarea 
                      rows={3} required value={localSettings.address}
                      onChange={e => setLocalSettings({...localSettings, address: e.target.value})}
                      className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-400 rounded-2xl focus:bg-white focus:border-blue-600 outline-none font-bold text-slate-800"
                    />
                  </div>
                </div>
                <button type="submit" className="flex items-center gap-3 bg-slate-900 text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-black active:scale-95 transition-all">
                  <Save size={20} /> Save Changes
                </button>
              </form>
            </div>
          )}

          {activeSection === 'roles' && (
            <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 p-8">
               <div className="flex justify-between items-center mb-8">
                  <h2 className="text-xl font-black text-slate-800 flex items-center gap-3 uppercase tracking-tighter">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                      <Shield size={22} />
                    </div>
                    User Roles
                  </h2>
                  <button 
                    onClick={handleAddNewRole}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all"
                  >
                    <Plus size={18} /> New Role
                  </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {roles.map(role => (
                    <div key={role.id} className="p-6 rounded-[2rem] border border-slate-100 bg-slate-50/50 flex items-center justify-between group hover:bg-white hover:border-blue-100 hover:shadow-xl hover:shadow-slate-100 transition-all">
                       <div>
                          <p className="font-black text-slate-800 text-lg">{role.name}</p>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                             {Object.entries(role.permissions).filter(([_,v]) => v).length} modules active
                          </p>
                       </div>
                       <div className="flex gap-2 transition-all">
                          <button onClick={() => setEditingRole(role)} className="p-3 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all" title="Edit Role"><Edit size={18} /></button>
                          {role.id !== 'owner' && role.id !== 'manager' && role.id !== 'cashier' && (
                            <button onClick={() => onDeleteRole(role.id)} className="p-3 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all" title="Delete Role"><Trash2 size={18} /></button>
                          )}
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeSection === 'backup' && (
            <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 p-8">
              <h2 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3 uppercase tracking-tighter">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                  <Database size={22} />
                </div>
                Data Sync
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="p-8 rounded-[2.5rem] border-2 border-blue-100 bg-blue-50/30 space-y-6">
                    <div className="w-14 h-14 rounded-2xl bg-white text-blue-600 flex items-center justify-center shadow-lg shadow-blue-100">
                       <Download size={28} />
                    </div>
                    <div>
                       <p className="font-black text-slate-800 text-lg">Export Backup</p>
                       <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest leading-relaxed">Safety download of your store database</p>
                    </div>
                    <button onClick={onExport} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all uppercase tracking-widest text-xs">
                       Generate File
                    </button>
                 </div>

                 <div className="p-8 rounded-[2.5rem] border-2 border-orange-100 bg-orange-50/30 space-y-6">
                    <div className="w-14 h-14 rounded-2xl bg-white text-orange-600 flex items-center justify-center shadow-lg shadow-orange-100">
                       <Upload size={28} />
                    </div>
                    <div>
                       <p className="font-black text-slate-800 text-lg">Restore Data</p>
                       <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest leading-relaxed">Overwrite current data with a backup file</p>
                    </div>
                    <label className="block w-full py-5 bg-orange-600 text-white text-center font-black rounded-2xl shadow-xl shadow-orange-100 hover:bg-orange-700 active:scale-95 transition-all cursor-pointer uppercase tracking-widest text-xs">
                       Upload & Sync
                       <input 
                         type="file" className="hidden" accept=".json" 
                         onChange={e => {
                            const file = e.target.files?.[0];
                            if (file && window.confirm("WARNING: This will overwrite ALL existing data. Continue?")) onImport(file);
                         }} 
                       />
                    </label>
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {editingRole && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-md">
           <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
                 <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Edit Role Access</h3>
                 <button onClick={() => setEditingRole(null)} className="p-3 bg-white rounded-full text-slate-400 hover:text-slate-600 shadow-sm transition-all"><X size={24} /></button>
              </div>
              <div className="p-10 space-y-8">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Role Title</label>
                    <input 
                      type="text" value={editingRole.name}
                      onChange={e => setEditingRole({...editingRole, name: e.target.value})}
                      placeholder="e.g. Sales Manager"
                      className="w-full p-4 bg-white border-2 border-gray-400 rounded-2xl focus:bg-white focus:border-blue-600 outline-none font-black text-slate-800"
                    />
                 </div>

                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Module Permissions</label>
                    <div className="grid grid-cols-2 gap-3">
                       {modules.map(perm => (
                         <button
                           key={perm.id}
                           onClick={() => togglePermission(perm.id as any)}
                           className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                             editingRole.permissions[perm.id as keyof RolePermissions]
                               ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' 
                               : 'bg-white border-slate-50 text-slate-400 hover:border-slate-100'
                           }`}
                         >
                            <perm.icon size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{perm.label}</span>
                         </button>
                       ))}
                    </div>
                 </div>

                 <div className="flex gap-4 pt-4">
                    <button onClick={() => setEditingRole(null)} className="flex-1 py-5 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-slate-600 transition-all">Cancel</button>
                    <button 
                      onClick={() => { onSaveRole(editingRole); setEditingRole(null); }}
                      className="flex-[2] py-5 bg-slate-900 text-white font-black rounded-2xl shadow-2xl hover:bg-black active:scale-95 transition-all uppercase tracking-widest text-[10px]"
                    >
                      Update Permissions
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
