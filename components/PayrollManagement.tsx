
import React, { useMemo } from 'react';
import { Staff, Attendance, SalaryPayment, SalaryType } from '../types';
import { Banknote, TrendingUp, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';

interface PayrollManagementProps {
  staff: Staff[];
  attendance: Attendance[];
  payments: SalaryPayment[];
  onSavePayment: (p: SalaryPayment) => void;
}

export const PayrollManagement: React.FC<PayrollManagementProps> = ({ staff, attendance, payments, onSavePayment }) => {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  const payrollData = useMemo(() => {
    return staff.map(person => {
      // Calculate days present in current month
      const daysPresent = attendance.filter(a => 
        a.staffId === person.id && 
        a.date.startsWith(currentMonth) &&
        a.checkIn
      ).length;

      let calculatedSalary = 0;
      if (person.salaryType === SalaryType.DAILY) {
        calculatedSalary = daysPresent * person.baseSalary;
      } else {
        // Pro-rated monthly? Simple logic: if worked > 0 days, full salary for now
        calculatedSalary = daysPresent > 0 ? person.baseSalary : 0;
      }

      const isPaid = payments.some(p => p.staffId === person.id && p.month === currentMonth && p.status === 'Paid');

      return {
        ...person,
        daysPresent,
        calculatedSalary,
        isPaid
      };
    });
  }, [staff, attendance, payments, currentMonth]);

  const handlePay = (staffId: string, amount: number) => {
    const payment: SalaryPayment = {
      id: `PAY-${staffId}-${currentMonth}`,
      staffId,
      month: currentMonth,
      amount,
      paymentDate: new Date().toISOString(),
      status: 'Paid'
    };
    onSavePayment(payment);
  };

  return (
    <div className="p-6 h-full flex flex-col bg-gray-50 overflow-y-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Payroll & Salary</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Summary for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg border border-gray-100 shadow-sm flex items-center gap-3">
           <Calendar size={18} className="text-blue-500" />
           <span className="font-bold text-gray-700">{currentMonth}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
         <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-blue-600">
            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Total Payout</p>
            <p className="text-2xl font-black text-gray-800">₹{payrollData.reduce((acc, p) => acc + p.calculatedSalary, 0).toLocaleString()}</p>
         </div>
         <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-green-500">
            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Total Paid</p>
            <p className="text-2xl font-black text-green-600">₹{payrollData.filter(p => p.isPaid).reduce((acc, p) => acc + p.calculatedSalary, 0).toLocaleString()}</p>
         </div>
         <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-orange-500">
            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Pending Amount</p>
            <p className="text-2xl font-black text-orange-600">₹{payrollData.filter(p => !p.isPaid).reduce((acc, p) => acc + p.calculatedSalary, 0).toLocaleString()}</p>
         </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Employee</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Salary Type</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase text-center">Days Worked</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Current Earnings</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Status</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payrollData.map(person => (
              <tr key={person.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4">
                   <p className="font-bold text-gray-800">{person.name}</p>
                   <p className="text-[10px] text-gray-400 font-mono">{person.id}</p>
                </td>
                <td className="p-4">
                   <span className="text-sm font-medium text-gray-600">{person.salaryType} (₹{person.baseSalary})</span>
                </td>
                <td className="p-4 text-center">
                   <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-black">
                     {person.daysPresent} Days
                   </span>
                </td>
                <td className="p-4 font-black text-gray-900">₹{person.calculatedSalary.toLocaleString()}</td>
                <td className="p-4">
                   {person.isPaid ? (
                     <span className="flex items-center gap-1 text-green-600 text-sm font-bold">
                       <CheckCircle2 size={16} /> Paid
                     </span>
                   ) : (
                     <span className="flex items-center gap-1 text-orange-600 text-sm font-bold">
                       <AlertCircle size={16} /> Pending
                     </span>
                   )}
                </td>
                <td className="p-4 text-right">
                   {!person.isPaid && person.calculatedSalary > 0 && (
                     <button 
                       onClick={() => handlePay(person.id, person.calculatedSalary)}
                       className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-md transition-all active:scale-95 flex items-center gap-2 ml-auto"
                     >
                       <Banknote size={14} /> Pay Salary
                     </button>
                   )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {payrollData.length === 0 && (
           <div className="p-12 text-center text-gray-400">No staff records to process.</div>
        )}
      </div>
    </div>
  );
};
