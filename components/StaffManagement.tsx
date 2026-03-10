
import React, { useState, useMemo } from 'react';
import { Staff, Role, SalaryType } from '../types';
import { 
  UserPlus, Edit, Trash2, User, Smartphone, 
  Calendar, BadgeDollarSign, X, CheckCircle2, 
  AlertCircle, Search, UserCheck, UserX, UserMinus, ShieldAlert, ChevronRight, Layers,
  Power, PowerOff, AlertTriangle
} from 'lucide-react';

interface StaffManagementProps {
  staff: Staff[];
  roles: Role[];
  onSaveStaff: (s: Staff) => void;
  onDeleteStaff: (id: string) => void;
}

export const StaffManagement: React.FC<StaffManagementProps> = ({ staff, roles, onSaveStaff, onDeleteStaff }) => {
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Partial<Staff> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null);
  
  const pendingCount = staff.filter(s => s.status === 'Pending').length;
  const [statusFilter, setStatusFilter] = useState<'Active' | 'Inactive' | 'Pending'>(pendingCount > 0 ? 'Pending' : 'Active');

  const handleEditStaff = (member: Staff) => {
    setEditingStaff(member);
    setShowStaffForm(true);
  };

  const handleAddNew = () => {
    setEditingStaff({
      id: `EMP-${Date.now().toString().slice(-4)}`,
      name: '',
      mobile: '',
      roleId: roles.find(r => r.name.toLowerCase() === 'cashier')?.id || 'cashier',
      joiningDate: new Date().toISOString().split('T')[0],
      salaryType: SalaryType.MONTHLY,
      baseSalary: 0,
      status: 'Active'
    });
    setShowStaffForm(true);
  };

  const handleApprove = (member: Staff) => {
    onSaveStaff({ ...member, status: 'Active' });
  };

  const handleStatusToggle = (member: Staff) => {
    const newStatus = member.status === 'Active' ? 'Inactive' : 'Active';
    onSaveStaff({ ...member, status: newStatus });
  };

  const handleReject = (id: string) => {
    const member = staff.find(s => s.id === id);
    if (member) {
      setStaffToDelete(member);
    }
  };

  const handleNameChange = (val: string) => {
    if (!editingStaff) return;
    const cleanedName = val.replace(/[0-9]/g, '');
    setEditingStaff({ ...editingStaff, name: cleanedName });
  };

  const handleMobileChange = (val: string) => {
    if (!editingStaff) return;
    const cleanedMobile = val.replace(/\D/g, '').slice(0, 10);
    setEditingStaff({ ...editingStaff, mobile: cleanedMobile });
  };

  const handleBaseSalaryChange = (val: string) => {
    if (!editingStaff) return;
    const num = parseFloat(val);
    setEditingStaff({ ...editingStaff, baseSalary: isNaN(num) ? 0 : num });
  };

  const filteredStaff = useMemo(() => {
    return staff.filter(s => {
      const matchesStatus = s.status === statusFilter;
      const term = searchTerm.toLowerCase();
      const role = roles.find(r => r.id === s.roleId);
      const roleName = role ? role.name.toLowerCase() : '';

      const matchesSearch = 
        s.name.toLowerCase().includes(term) ||
        s.mobile.includes(term) ||
        s.id.toLowerCase().includes(term) ||
        roleName.includes(term);

      return matchesStatus && matchesSearch;
    });
  }, [staff, statusFilter, searchTerm, roles]);

  const isMobileInvalid = editingStaff?.mobile ? editingStaff.mobile.length > 0 && editingStaff.mobile.length < 10 : false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStaff && editingStaff.name && editingStaff.mobile?.length === 10) {
      onSaveStaff(editingStaff as Staff);
      setShowStaffForm(false);
      setEditingStaff(null);
    }
  };

  const confirmDelete = () => {
    if (staffToDelete) {
      onDeleteStaff(staffToDelete.id);
      setStaffToDelete(null);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col bg-gray-50 overflow-y-auto no-scrollbar">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Staff Management</h1>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Manage team members and status lists</p>
        </div>
        
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full xl:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Search staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 shadow-sm focus:ring-4 focus:ring-blue-100 outline-none bg-white text-slate-900 font-bold"
            />
          </div>

          <div className="flex bg-white p-1 rounded-2xl border border-gray-200 shadow-sm">
             {(['Active', 'Inactive', 'Pending'] as const).map((status) => (
               <button
                 key={status}
                 onClick={() => setStatusFilter(status)}
                 className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative ${
                   statusFilter === status ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'
                 }`}
               >
                 {status}
                 {status === 'Pending' && pendingCount > 0 && (
                   <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[8px] text-white font-black border-2 border-white animate-bounce">
                     {pendingCount}
                   </span>
                 )}
               </button>
             ))}
          </div>

          <button 
            onClick={handleAddNew}
            className="flex items-center justify-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-100 hover:bg-black active:scale-95 transition-all"
          >
            <UserPlus size={18} /> Add Member
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStaff.map((person) => {
          const role = roles.find(r => r.id === person.roleId);
          return (
            <div key={person.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm transition-all relative group">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${person.status === 'Active' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                    <User size={28} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 leading-tight">{person.name}</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{role?.name || 'Staff'}</p>
                  </div>
                </div>
                
                {/* Actions: Always visible */}
                <div className="flex gap-1">
                  <button 
                    onClick={() => handleEditStaff(person)} 
                    className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                    title="Edit Member"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => setStaffToDelete(person)} 
                    className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                    title="Delete Member"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-sm text-slate-500 font-bold">
                  <Smartphone size={16} className="text-slate-300" />
                  <span>{person.mobile}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-500 font-bold">
                  <Calendar size={16} className="text-slate-300" />
                  <span>Joined: {new Date(person.joiningDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-blue-600 font-black">
                  <BadgeDollarSign size={16} className="text-blue-200" />
                  <span>₹{person.baseSalary.toLocaleString()} / {person.salaryType}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50">
                {person.status === 'Pending' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => handleReject(person.id)}
                      className="py-3 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                    >
                      <UserX size={16} /> Reject
                    </button>
                    <button 
                      onClick={() => handleApprove(person)}
                      className="py-3 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-green-100 hover:bg-green-700 transition-colors"
                    >
                      <UserCheck size={16} /> Approve
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => handleStatusToggle(person)}
                    className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                      person.status === 'Active' 
                        ? 'bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600' 
                        : 'bg-green-50 text-green-600 hover:bg-green-600 hover:text-white'
                    }`}
                  >
                    {person.status === 'Active' ? (
                      <><PowerOff size={16} /> Deactivate Member</>
                    ) : (
                      <><Power size={16} /> Reactivate Member</>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        
        {filteredStaff.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-4">
             <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center mx-auto text-slate-300">
               <UserMinus size={40} />
             </div>
             <div>
               <p className="text-xl font-black text-slate-400 uppercase tracking-tighter">No {statusFilter.toLowerCase()} members</p>
               <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-1">Try changing the filters or search term</p>
             </div>
          </div>
        )}
      </div>

      {showStaffForm && editingStaff && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
                {editingStaff.id?.startsWith('REQ') ? 'Approval Details' : editingStaff.name ? 'Edit Member' : 'Add New Member'}
              </h2>
              <button onClick={() => setShowStaffForm(false)} className="p-3 bg-white rounded-full text-slate-400 shadow-sm"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="text" required value={editingStaff.name} 
                      onChange={e => handleNameChange(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-400 rounded-2xl focus:bg-white focus:border-blue-600 outline-none font-bold text-slate-800"
                      placeholder="Enter name"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mobile Number</label>
                  <div className="relative">
                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" inputMode="numeric" required value={editingStaff.mobile} 
                      onChange={e => handleMobileChange(e.target.value)}
                      className={`w-full pl-12 pr-4 py-4 bg-white border-2 rounded-2xl focus:bg-white outline-none font-bold text-slate-800 ${isMobileInvalid ? 'border-red-500' : 'border-gray-400 focus:border-blue-600'}`}
                      placeholder="10-digit number"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Designation</label>
                    <select 
                      value={editingStaff.roleId} 
                      onChange={e => setEditingStaff({...editingStaff, roleId: e.target.value})}
                      className="w-full px-4 py-4 bg-white border-2 border-gray-400 rounded-2xl focus:bg-white focus:border-blue-600 outline-none font-bold text-slate-800 appearance-none"
                    >
                      {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Salary Type</label>
                    <select 
                      value={editingStaff.salaryType} 
                      onChange={e => setEditingStaff({...editingStaff, salaryType: e.target.value as SalaryType})}
                      className="w-full px-4 py-4 bg-white border-2 border-gray-400 rounded-2xl focus:bg-white focus:border-blue-600 outline-none font-bold text-slate-800 appearance-none"
                    >
                      {Object.values(SalaryType).map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Base Salary (₹)</label>
                    <div className="relative">
                      <BadgeDollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        type="number" 
                        value={editingStaff.baseSalary === 0 ? '' : editingStaff.baseSalary} 
                        onChange={e => handleBaseSalaryChange(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-400 rounded-2xl focus:bg-white focus:border-blue-600 outline-none font-bold text-slate-800"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                    <select 
                      value={editingStaff.status} 
                      onChange={e => setEditingStaff({...editingStaff, status: e.target.value as 'Active' | 'Inactive'})}
                      className="w-full px-4 py-4 bg-white border-2 border-gray-400 rounded-2xl focus:bg-white focus:border-blue-600 outline-none font-bold text-slate-800 appearance-none"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowStaffForm(false)} 
                  className="flex-1 py-5 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-slate-600 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-[2] py-5 bg-slate-900 text-white font-black rounded-2xl shadow-2xl hover:bg-black active:scale-95 transition-all uppercase tracking-widest text-[10px]"
                >
                  {editingStaff.id?.startsWith('REQ') ? 'Confirm Details' : 'Save Member Info'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {staffToDelete && (
        <div className="fixed inset-0 z-[110] bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl p-8 text-center animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-2">Delete Member?</h3>
            <p className="text-slate-500 font-bold text-sm mb-8 leading-relaxed">
              Are you sure you want to remove <span className="text-slate-900 font-black">"{staffToDelete.name}"</span>? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setStaffToDelete(null)} 
                className="flex-1 py-4 bg-slate-100 text-slate-400 font-black rounded-2xl uppercase tracking-widest text-[10px] hover:bg-slate-200 hover:text-slate-600 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 py-4 bg-red-600 text-white font-black rounded-2xl shadow-xl shadow-red-100 uppercase tracking-widest text-[10px] hover:bg-red-700 active:scale-95 transition-all"
              >
                Delete Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
