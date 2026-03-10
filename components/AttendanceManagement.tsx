
import React, { useState, useMemo } from 'react';
import { Staff, Attendance, Role } from '../types';
import { LogIn, LogOut, Clock, Calendar, CheckCircle2, Search, History } from 'lucide-react';

interface AttendanceManagementProps {
  staff: Staff[];
  attendance: Attendance[];
  onSaveAttendance: (a: Attendance) => void;
  onDeleteAttendance: (id: string) => void;
}

export const AttendanceManagement: React.FC<AttendanceManagementProps> = ({ staff, attendance, onSaveAttendance, onDeleteAttendance }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'daily' | 'history'>('daily');

  const activeStaff = useMemo(() => staff.filter(s => s.status === 'Active'), [staff]);

  const dailyRecords = useMemo(() => {
    return attendance.filter(a => a.date === selectedDate);
  }, [attendance, selectedDate]);

  const handleAction = (staffId: string) => {
    const existing = dailyRecords.find(a => a.staffId === staffId);
    if (!existing) {
      // Check In
      const record: Attendance = {
        id: `${staffId}-${selectedDate}`,
        staffId,
        date: selectedDate,
        checkIn: new Date().toISOString()
      };
      onSaveAttendance(record);
    } else if (!existing.checkOut) {
      // Check Out
      onSaveAttendance({ ...existing, checkOut: new Date().toISOString() });
    }
  };

  const filteredStaff = activeStaff.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-6 h-full flex flex-col bg-gray-50 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Daily Attendance</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Mark present/absent for {new Date(selectedDate).toDateString()}</p>
        </div>
        
        <div className="flex bg-white rounded-lg shadow-sm p-1 border border-gray-100">
           <button 
             onClick={() => setViewMode('daily')}
             className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'daily' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
           >
             Today
           </button>
           <button 
             onClick={() => setViewMode('history')}
             className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'history' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
           >
             Log History
           </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6">
         <div className="flex-1 min-w-[300px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search staff..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 w-full border border-gray-200 rounded-lg shadow-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
         </div>
         <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100">
            <Calendar size={18} className="text-gray-400" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-transparent font-bold text-gray-700 outline-none [color-scheme:light]"
            />
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredStaff.map(person => {
          const record = dailyRecords.find(a => a.staffId === person.id);
          const isCheckIn = !!record?.checkIn;
          const isCheckOut = !!record?.checkOut;

          return (
            <div key={person.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-all">
              <div className="mb-4">
                 <h3 className="font-bold text-gray-900">{person.name}</h3>
                 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{person.id}</p>
              </div>

              <div className="space-y-3 mb-6">
                 <div className="flex items-center justify-between text-xs font-bold p-2 bg-gray-50 rounded-lg border border-gray-100">
                    <span className="text-gray-400 uppercase">IN</span>
                    <span className={isCheckIn ? 'text-blue-600' : 'text-gray-300'}>
                       {isCheckIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </span>
                 </div>
                 <div className="flex items-center justify-between text-xs font-bold p-2 bg-gray-50 rounded-lg border border-gray-100">
                    <span className="text-gray-400 uppercase">OUT</span>
                    <span className={isCheckOut ? 'text-orange-600' : 'text-gray-300'}>
                       {isCheckOut ? new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </span>
                 </div>
              </div>

              {isCheckOut ? (
                <div className="w-full py-3 bg-green-50 text-green-600 rounded-xl font-bold flex items-center justify-center gap-2 border border-green-100">
                  <CheckCircle2 size={20} /> Shift Done
                </div>
              ) : (
                <button 
                  onClick={() => handleAction(person.id)}
                  className={`w-full py-3 rounded-xl font-bold shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 ${isCheckIn ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                >
                  {isCheckIn ? (
                    <><LogOut size={18} /> Check Out</>
                  ) : (
                    <><LogIn size={18} /> Check In</>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
