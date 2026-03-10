
import React, { useState } from 'react';
import { UserRole, CurrentUser, Staff, Role, SalaryType } from '../types';
import { Smartphone, Lock, Eye, EyeOff, Loader2, LogIn, Store, ShieldCheck, AlertCircle, UserPlus, User, ChevronLeft, RefreshCw, CheckCircle2 } from 'lucide-react';
import { saveStaff, getStaffByMobile } from '../services/db';

// TIP: Add your partner's mobile number to this list to give them Master Admin access
const MASTER_ADMIN_NUMBERS = ['9999999999']; 
const MASTER_ADMIN_PIN = '1234';

interface LoginProps {
  staff: Staff[];
  roles: Role[];
  onLogin: (user: CurrentUser) => void;
}

export const Login: React.FC<LoginProps> = ({ staff, roles, onLogin }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [mobile, setMobile] = useState('');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [roleId, setRoleId] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Forgot Password specific state
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [foundStaffMember, setFoundStaffMember] = useState<Staff | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      // 1. Check for Master Admins (Hardcoded list)
      if (MASTER_ADMIN_NUMBERS.includes(mobile) && pin === MASTER_ADMIN_PIN) {
        onLogin({ 
          id: 'SA001', 
          name: mobile === '9999999999' ? 'Super Admin' : 'Partner Admin', 
          role: 'super_admin', 
          mobile: mobile 
        });
        setIsLoading(false);
        return;
      }

      // 2. Staff Login (Database-driven)
      const foundStaff = staff.find(s => s.mobile === mobile);
      
      if (foundStaff) {
        if (foundStaff.status === 'Pending') {
          setError('Your registration is pending approval from the Admin.');
        } else if (foundStaff.status === 'Inactive') {
          setError('This account is inactive. Contact Admin.');
        } else if (pin === (foundStaff.pin || '1234')) {
          let userRole: UserRole = 'cashier';
          const roleData = roles.find(r => r.id === foundStaff.roleId);
          
          // Map roles to permission levels
          const roleNameLower = roleData?.name.toLowerCase() || '';
          if (roleNameLower.includes('admin') || roleNameLower.includes('owner')) {
            userRole = 'super_admin';
          } else if (roleNameLower.includes('manager')) {
            userRole = 'manager';
          }

          onLogin({ id: foundStaff.id, name: foundStaff.name, role: userRole, mobile: foundStaff.mobile });
        } else {
          setError('Invalid PIN code. Please try again.');
        }
      } else {
        setError('Mobile number not found.');
      }
      setIsLoading(false);
    }, 1000);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      const exists = staff.some(s => s.mobile === mobile);
      if (exists) {
        setError('This mobile number is already registered.');
        setIsLoading(false);
        return;
      }

      const newStaff: Staff = {
        id: `REQ-${Date.now().toString().slice(-4)}`,
        name,
        mobile,
        roleId: roleId || roles.find(r => r.name.toLowerCase() === 'cashier')?.id || 'cashier',
        pin,
        status: 'Pending',
        joiningDate: new Date().toISOString().split('T')[0],
        salaryType: SalaryType.MONTHLY,
        baseSalary: 0
      };

      saveStaff(newStaff);
      setSuccess('Registration request sent! Please wait for Admin approval.');
      setMode('login');
      setIsLoading(false);
      setName('');
      setMobile('');
      setPin('');
    }, 1200);
  };

  const handleForgotVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Added async/await to setTimeout callback to fix Promise assignability error on line 130
    setTimeout(async () => {
      if (MASTER_ADMIN_NUMBERS.includes(mobile)) {
        setError('Master Admin credentials cannot be changed via this portal.');
        setIsLoading(false);
        return;
      }

      // Await the async database call to get a Staff object instead of a Promise
      const staffMember = await getStaffByMobile(mobile);
      if (staffMember) {
        setFoundStaffMember(staffMember);
        setForgotStep(2);
        setPin('');
      } else {
        setError('Mobile number not found in our records.');
      }
      setIsLoading(false);
    }, 800);
  };

  const handleForgotReset = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      if (!foundStaffMember) return;

      if (foundStaffMember.name.toLowerCase().trim() !== name.toLowerCase().trim()) {
        setError('Verification failed. The name provided does not match our records.');
        setIsLoading(false);
        return;
      }

      const updatedStaff = {
        ...foundStaffMember,
        pin: pin
      };
      saveStaff(updatedStaff);
      
      setSuccess('PIN reset successful! You can now log in with your new PIN.');
      setMode('login');
      setForgotStep(1);
      setFoundStaffMember(null);
      setName('');
      setPin('');
      setIsLoading(false);
    }, 1200);
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4">
      <div className="fixed top-0 left-0 w-full h-1/3 bg-blue-600 rounded-b-[4rem] z-0"></div>
      
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="p-8 pb-4 text-center">
          <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-200 rotate-3">
             <Store size={32} strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tighter">SmartMart</h1>
          <p className="text-slate-400 font-medium text-sm">
            {mode === 'login' ? 'Enterprise Billing & Inventory' : mode === 'register' ? 'Join our store team' : 'Reset Security PIN'}
          </p>
        </div>

        <div className="p-8 pt-2">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 animate-in slide-in-from-top-2">
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
              <p className="text-xs font-bold leading-tight">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-100 rounded-2xl flex items-start gap-3 text-green-600 animate-in slide-in-from-top-2">
              <CheckCircle2 size={20} className="flex-shrink-0 mt-0.5" />
              <p className="text-xs font-bold leading-tight">{success}</p>
            </div>
          )}

          {mode === 'forgot' ? (
            <form onSubmit={forgotStep === 1 ? handleForgotVerify : handleForgotReset} className="space-y-4">
              {forgotStep === 1 ? (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Registered Mobile</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <Smartphone size={18} />
                      </div>
                      <input 
                        type="text" inputMode="numeric" required value={mobile}
                        onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="Enter mobile number"
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-gray-400 rounded-2xl focus:bg-white focus:border-blue-600 outline-none transition-all font-bold text-slate-800"
                      />
                    </div>
                  </div>
                  <button 
                    type="submit"
                    disabled={isLoading || mobile.length < 10}
                    className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95 ${
                      isLoading || mobile.length < 10 ? 'bg-slate-100 text-slate-300' : 'bg-blue-600 text-white shadow-blue-100'
                    }`}
                  >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Find Account'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                     <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Account Found</p>
                     <p className="text-sm font-bold text-blue-900">{foundStaffMember?.name}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Verify Full Name</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <User size={18} />
                      </div>
                      <input 
                        type="text" required value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Enter your registered name"
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-gray-400 rounded-2xl focus:bg-white focus:border-blue-600 outline-none transition-all font-bold text-slate-800"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Set New PIN</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <Lock size={18} />
                      </div>
                      <input 
                        type={showPin ? "text" : "password"}
                        inputMode="numeric" required value={pin}
                        onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="••••"
                        className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border-2 border-gray-400 rounded-2xl focus:bg-white focus:border-blue-600 outline-none transition-all font-black text-xl tracking-[0.5em] text-slate-800"
                      />
                      <button 
                        type="button" onClick={() => setShowPin(!showPin)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                      >
                        {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <button 
                    type="submit"
                    disabled={isLoading || !name || pin.length < 4}
                    className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95 ${
                      isLoading || !name || pin.length < 4 ? 'bg-slate-100 text-slate-300' : 'bg-blue-600 text-white shadow-blue-100'
                    }`}
                  >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <><RefreshCw size={18} /> Update PIN</>}
                  </button>
                </div>
              )}
            </form>
          ) : (
            <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
              {mode === 'register' && (
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <User size={18} />
                    </div>
                    <input 
                      type="text" required value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-gray-400 rounded-2xl focus:bg-white focus:border-blue-600 outline-none transition-all font-bold text-slate-800"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mobile Number</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Smartphone size={18} />
                  </div>
                  <input 
                    type="text" inputMode="numeric" required value={mobile}
                    onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit number"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-gray-400 rounded-2xl focus:bg-white focus:border-blue-600 outline-none transition-all font-bold text-slate-800"
                  />
                </div>
              </div>

              {mode === 'register' && (
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Applying As</label>
                  <select 
                    required value={roleId}
                    onChange={e => setRoleId(e.target.value)}
                    className="w-full px-4 py-3.5 bg-slate-50 border-2 border-gray-400 rounded-2xl focus:bg-white focus:border-blue-600 outline-none transition-all font-bold text-slate-800 appearance-none shadow-sm"
                  >
                    <option value="">Select Role</option>
                    {roles.filter(r => r.name.toLowerCase() !== 'owner').map(role => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <div className="flex justify-between items-center ml-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {mode === 'login' ? 'Security PIN' : 'Set 4-Digit PIN'}
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock size={18} />
                  </div>
                  <input 
                    type={showPin ? "text" : "password"}
                    inputMode="numeric" required value={pin}
                    onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="••••"
                    className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border-2 border-gray-400 rounded-2xl focus:bg-white focus:border-blue-600 outline-none transition-all font-black text-xl tracking-[0.5em] text-slate-800 shadow-sm"
                  />
                  <button 
                    type="button" onClick={() => setShowPin(!showPin)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600"
                  >
                    {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit"
                disabled={isLoading || mobile.length < 10 || pin.length < 4 || (mode === 'register' && !name)}
                className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95 ${
                  isLoading || mobile.length < 10 || pin.length < 4 || (mode === 'register' && !name)
                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'
                }`}
              >
                {isLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  mode === 'login' ? <><LogIn size={18} /> Sign In</> : <><UserPlus size={18} /> Send Request</>
                )}
              </button>
            </form>
          )}

          <div className="mt-6 flex flex-col items-center gap-3">
            {mode === 'login' ? (
              <>
                <button 
                  onClick={() => { setMode('register'); setSuccess(null); setError(null); }}
                  className="text-blue-600 font-bold text-xs hover:underline"
                >
                  New partner or employee? Create a request
                </button>
                <button 
                  type="button" 
                  onClick={() => { setMode('forgot'); setForgotStep(1); setError(null); setSuccess(null); }}
                  className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors"
                >
                  Forgot PIN?
                </button>
              </>
            ) : (
              <button 
                onClick={() => { setMode('login'); setForgotStep(1); setFoundStaffMember(null); setSuccess(null); setError(null); }}
                className="text-slate-500 font-bold text-xs flex items-center gap-1 hover:text-slate-800"
              >
                <ChevronLeft size={14} /> Back to Login
              </button>
            )}
            
             <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-2">
                <ShieldCheck size={14} className="text-green-500" />
                Secure Enterprise Connection
             </div>
          </div>
        </div>
      </div>
      
      <div className="fixed bottom-6 text-center text-[10px] font-bold text-blue-100 uppercase tracking-widest z-10 pointer-events-none opacity-50">
         Admin Mobiles: {MASTER_ADMIN_NUMBERS.join(', ')} | PIN: {MASTER_ADMIN_PIN}
      </div>
    </div>
  );
};
