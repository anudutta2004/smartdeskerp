/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Users, UserCheck, CreditCard, Plus, Calendar, DollarSign, 
  Trash2, Search, Printer, CheckCircle, Award, Percent, ChevronRight 
} from 'lucide-react';
import { SmartDeskUser, AttendanceRecord, PayrollRecord, SystemSettings } from '../../types';

interface HrPayrollManagerProps {
  employees: SmartDeskUser[];
  attendanceLogs: AttendanceRecord[];
  payrollLogs: PayrollRecord[];
  isDarkMode: boolean;
  isAdmin: boolean;
  currentUsername: string;
  settings: SystemSettings;
  onRefreshDB: () => void;
  onLogActivity: (action: string, details: string) => void;
}

export default function HrPayrollManager({
  employees,
  attendanceLogs,
  payrollLogs,
  isDarkMode,
  isAdmin,
  currentUsername,
  settings,
  onRefreshDB,
  onLogActivity
}: HrPayrollManagerProps) {
  
  // Tabs: 'employees' | 'attendance' | 'payroll'
  const [hrTab, setHrTab] = useState<'employees' | 'attendance' | 'payroll'>('employees');

  // Employee creation/mod states
  const [isAddingEmp, setIsAddingEmp] = useState<boolean>(false);
  const [editingEmp, setEditingEmp] = useState<SmartDeskUser | null>(null);
  const [empUsername, setEmpUsername] = useState<string>('');
  const [empPassword, setEmpPassword] = useState<string>('');
  const [empName, setEmpName] = useState<string>('');
  const [empMobile, setEmpMobile] = useState<string>('');
  const [empEmail, setEmpEmail] = useState<string>('');
  const [empPosition, setEmpPosition] = useState<string>('Sales Associate');
  const [empSalary, setEmpSalary] = useState<number>(25000); // 25,000 INR default monthly salary
  const [empBank, setEmpBank] = useState<string>('');
  const [empAddress, setEmpAddress] = useState<string>('');

  // Daily Attendance Picker & marking logs state
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceStatuses, setAttendanceStatuses] = useState<Record<string, "Present" | "Absent" | "Half Day" | "Leave">>({});
  const [savingAttendance, setSavingAttendance] = useState<boolean>(false);

  // Payroll / Pay slip distribution states
  const [isPayingSalary, setIsPayingSalary] = useState<boolean>(false);
  const [selectedPayUser, setSelectedPayUser] = useState<SmartDeskUser | null>(null);
  const [payMonth, setPayMonth] = useState<string>("June 2026");
  const [payBonus, setPayBonus] = useState<number>(0);
  const [payDeductions, setPayDeductions] = useState<number>(0);
  const [submittingPay, setSubmittingPay] = useState<boolean>(false);

  // Printed Pay Slip popups
  const [printedSlip, setPrintedSlip] = useState<PayrollRecord | null>(null);

  // Handle Employee Adding/Edits -> synchronizes into DB `/api/auth/register` (POST) or `/api/users/:id` (PUT)
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empUsername.trim() || !empName.trim()) {
      alert("Employee Username and Name fields cannot be empty.");
      return;
    }

    const payload = {
      username: empUsername.toLowerCase().trim(),
      password: empPassword || "sd123456", // default safe bypass password
      name: empName,
      role: 'Employee' as const,
      mobile: empMobile,
      email: empEmail,
      position: empPosition,
      baseSalary: Number(empSalary),
      bankAccount: empBank,
      address: empAddress
    };

    try {
      const url = editingEmp ? `/api/users/${editingEmp.id}` : `/api/auth/register`;
      const method = editingEmp ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success || data.user) {
        onRefreshDB();
        onLogActivity(
          editingEmp ? "Modified Employee Profile" : "Created Employee Profile", 
          `Registered staff username '${payload.username}' (${payload.position})`
        );
        resetEmployeeForm();
      } else {
        alert("Action error: " + (data.error || "Internal mismatch. Username might already exist."));
      }
    } catch (err) {
      alert("Failed to communicate with HR authentication endpoints.");
    }
  };

  const startEditEmployee = (emp: SmartDeskUser) => {
    setEditingEmp(emp);
    setEmpUsername(emp.username);
    setEmpPassword(''); // don't push old hashes back to screen
    setEmpName(emp.name);
    setEmpMobile(emp.mobile || '');
    setEmpEmail(emp.email || '');
    setEmpPosition(emp.position || 'Sales Associate');
    setEmpSalary(emp.baseSalary || 20000);
    setEmpBank(emp.bankAccount || '');
    setEmpAddress(emp.address || '');
    setIsAddingEmp(true);
  };

  const resetEmployeeForm = () => {
    setEditingEmp(null);
    setEmpUsername('');
    setEmpPassword('');
    setEmpName('');
    setEmpMobile('');
    setEmpEmail('');
    setEmpPosition('Sales Associate');
    setEmpSalary(25000);
    setEmpBank('');
    setEmpAddress('');
    setIsAddingEmp(false);
  };

  // Mark all Attendance records at once
  const handleLoadAttendanceList = () => {
    const list: Record<string, "Present" | "Absent" | "Half Day" | "Leave"> = {};
    employees.forEach(emp => {
      const logged = attendanceLogs.find(a => a.employeeId === emp.username && a.date === selectedDate);
      list[emp.username] = logged ? logged.status : "Present";
    });
    setAttendanceStatuses(list);
  };

  React.useEffect(() => {
    handleLoadAttendanceList();
  }, [selectedDate, employees, attendanceLogs]);

  const handleUpdateStatusSingle = (user: string, status: "Present" | "Absent" | "Half Day" | "Leave") => {
    setAttendanceStatuses(prev => ({ ...prev, [user]: status }));
  };

  const handleSaveAttendanceAll = async () => {
    setSavingAttendance(true);
    const recordsPayload = Object.entries(attendanceStatuses).map(([empId, status]) => {
      const emp = employees.find(e => e.username === empId);
      return {
        employeeId: empId,
        employeeName: emp ? emp.name : empId,
        status
      };
    });

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: recordsPayload,
          date: selectedDate,
          createdBy: currentUsername
        })
      });

      const data = await res.json();
      if (data.success) {
        onRefreshDB();
        alert(`Attendance ledger for date ${selectedDate} marked successfully.`);
        onLogActivity("Track Attendance", `Saved workspace attendance cards on ${selectedDate}`);
      } else {
        alert("Attendance save failed: " + data.error);
      }
    } catch (err) {
      alert("Offline network delay processing attendance register.");
    } finally {
      setSavingAttendance(false);
    }
  };

  // Salary Release Payroll posting logic
  const startPaySalary = (emp: SmartDeskUser) => {
    setSelectedPayUser(emp);
    setPayBonus(0);
    setPayDeductions(0);
    setIsPayingSalary(true);
  };

  const handleCreatePayRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayUser) return;

    setSubmittingPay(true);
    const base = Number(selectedPayUser.baseSalary || 20000);
    
    try {
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedPayUser.username,
          employeeName: selectedPayUser.name,
          month: payMonth,
          baseSalary: base,
          bonus: Number(payBonus),
          deductions: Number(payDeductions),
          status: "Paid" as const,
          createdBy: currentUsername
        })
      });

      const data = await res.json();
      if (data.success) {
        onRefreshDB();
        onLogActivity("Disburse Payroll Slip", `Disbursed ₹ ${(base + payBonus - payDeductions).toFixed(2)} salary payload to ${selectedPayUser.name} for ${payMonth}`);
        alert(`Disbursement successful! Salary receipts archived.`);
        setIsPayingSalary(false);
        setSelectedPayUser(null);
      } else {
        alert("Disbursement error: " + data.error);
      }
    } catch (err) {
      alert("Network errors recording bank payment receipt.");
    } finally {
      setSubmittingPay(false);
    }
  };

  const handleModifyPayrollStatus = async (payId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/payroll/${payId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, createdBy: currentUsername })
      });
      const data = await res.json();
      if (data.success) {
        onRefreshDB();
        alert(`Payroll record ${payId} marked as ${newStatus}.`);
      } else {
        alert("Record change failed: " + data.error);
      }
    } catch (err) {
      alert("Failed to communicate with HR Ledger database.");
    }
  };

  return (
    <div className="space-y-6 text-slate-350">
      
      {/* Printed Pay-Slip Modal overlay */}
      {printedSlip && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in text-slate-900">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-slate-300 font-mono text-xs leading-relaxed">
            
            <div className="text-center space-y-1.5 border-b pb-4 mb-4">
              <h3 className="font-extrabold text-sm tracking-widest text-black uppercase">
                {settings?.companyName || "SMARTDESK ERP LTD"}
              </h3>
              <p className="text-[10px] text-slate-500 whitespace-pre-line leading-relaxed">
                {settings?.businessAddress || "KOLKATA INDUSTRIAL ZONE, KOLKATA, INDIA"}
              </p>
              <p className="text-[10px] font-extrabold tracking-wider bg-slate-900 text-white py-1 px-1.5 rounded uppercase mt-2 inline-block">
                SALARY PAY SLIP SLIP
              </p>
            </div>

            <div className="grid grid-cols-2 gap-y-2 bg-slate-50 p-3 rounded-lg mb-4 text-[10px] border">
              <div>
                <span className="text-slate-400 block uppercase font-bold text-[8px]">Employee Name:</span>
                <strong className="text-black text-xs uppercase">{printedSlip.employeeName}</strong>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-bold text-[8px]">Period month:</span>
                <strong className="text-black text-xs uppercase">{printedSlip.month}</strong>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-bold text-[8px]">Employee ID Reference:</span>
                <strong className="text-black uppercase">{printedSlip.employeeId}</strong>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-bold text-[8px]">Disbursed Date:</span>
                <strong className="text-black uppercase">{printedSlip.paymentDate || "N/A"}</strong>
              </div>
            </div>

            {/* Financial Ledger values */}
            <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
              <div className="grid grid-cols-2 bg-slate-100 text-[10px] font-black border-b p-2">
                <span>HEAD DEPOSIT / DEDUCT</span>
                <span className="text-right">EARNING / LOSS (₹)</span>
              </div>
              
              <div className="p-2 space-y-1.5 text-[11px] text-slate-700">
                <div className="flex justify-between">
                  <span>Standard Base Contract Salary:</span>
                  <span className="font-bold text-black">₹{printedSlip.baseSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Corporate Performance Bonuses:</span>
                  <span className="font-bold">+₹{printedSlip.bonus.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-red-600 border-b pb-1.5">
                  <span>Unpaid Absences Deductions:</span>
                  <span className="font-bold">-₹{printedSlip.deductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                
                <div className="flex justify-between font-extrabold text-black pt-1.5 text-xs">
                  <span>NET WORKSPACE DISBURSAL:</span>
                  <span className="text-blue-700">₹{printedSlip.netPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <div className="text-center text-[10px] bg-blue-50 text-blue-900 font-extrabold rounded-lg py-2 border border-blue-100 mb-4 uppercase">
              PAYMENT STATUS: {printedSlip.status} IN FULL
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 bg-slate-100 hover:bg-slate-200 rounded-xl py-2 px-3 text-[10px] font-extrabold border border-slate-300 cursor-pointer flex items-center justify-center gap-1 text-slate-800"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Print Copy</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintedSlip(null)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2 px-3 text-[10px] font-extrabold cursor-pointer"
              >
                Close Receipt
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Navigation Headers */}
      <div className="flex gap-2 border-b border-slate-800/10 pb-3">
        <button
          type="button"
          onClick={() => setHrTab('employees')}
          className={`px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
            hrTab === 'employees'
              ? 'bg-blue-600 text-white shadow'
              : isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100' : 'text-slate-650 hover:bg-slate-100'
          }`}
        >
          👤 Employee Directory ({employees.length})
        </button>
        <button
          type="button"
          onClick={() => setHrTab('attendance')}
          className={`px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
            hrTab === 'attendance'
              ? 'bg-blue-600 text-white shadow'
              : isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100' : 'text-slate-650 hover:bg-slate-100'
          }`}
        >
          ✓ Mark Attendance Ledger
        </button>
        <button
          type="button"
          onClick={() => setHrTab('payroll')}
          className={`px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
            hrTab === 'payroll'
              ? 'bg-blue-600 text-white shadow'
              : isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100' : 'text-slate-650 hover:bg-slate-100'
          }`}
        >
          💳 Payroll Ledger & Salary Slips ({payrollLogs.length})
        </button>
      </div>

      {/* VIEW 1: STAFF DIRECTORY */}
      {hrTab === 'employees' && (
        <div className="space-y-6">
          
          {isAdmin && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  resetEmployeeForm();
                  setIsAddingEmp(true);
                }}
                className="px-4 py-2 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1 shadow cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Onboard New Colleague</span>
              </button>
            </div>
          )}

          {isAddingEmp && (
            <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'} animate-fade-in`}>
              <h4 className="text-xs font-bold uppercase mb-4 text-blue-500">
                {editingEmp ? "✐ Update Staff Member Profile details" : "✦ Onboard Workspace Staff Personnel"}
              </h4>
              <form onSubmit={handleSaveEmployee} className="grid grid-cols-1 md:grid-cols-4 gap-4 align-end text-xs">
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Username Login Keyword *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingEmp}
                    value={empUsername}
                    onChange={(e) => setEmpUsername(e.target.value)}
                    placeholder="e.g. rohit (no spaces)"
                    className={`px-3 py-2 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 ${
                      isDarkMode ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">
                    {editingEmp ? "Set New Password (Optional)" : "Default bypass Password *"}
                  </label>
                  <input
                    type="password"
                    required={!editingEmp}
                    value={empPassword}
                    onChange={(e) => setEmpPassword(e.target.value)}
                    placeholder={editingEmp ? "Leave empty to retain" : "e.g. pass123"}
                    className={`px-3 py-2 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isDarkMode ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    placeholder="e.g. Rohit Kumar"
                    className={`px-3 py-2 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isDarkMode ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Contact Mobile *</label>
                  <input
                    type="tel"
                    required
                    value={empMobile}
                    onChange={(e) => setEmpMobile(e.target.value)}
                    placeholder="e.g. +91 9803857102"
                    className={`px-3 py-2 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isDarkMode ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Email address</label>
                  <input
                    type="email"
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value)}
                    placeholder="e.g. rohit@gmail.com"
                    className={`px-3 py-2 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isDarkMode ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Assigned Designation</label>
                  <input
                    type="text"
                    value={empPosition}
                    onChange={(e) => setEmpPosition(e.target.value)}
                    placeholder="e.g. Billing Executive"
                    className={`px-3 py-2 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isDarkMode ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Fixed Base Salary (₹ / Mo) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={empSalary}
                    onChange={(e) => setEmpSalary(Number(e.target.value))}
                    className={`px-3 py-2 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isDarkMode ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Bank Disbursal Account Info</label>
                  <input
                    type="text"
                    value={empBank}
                    onChange={(e) => setEmpBank(e.target.value)}
                    placeholder="SBI A/C: 304259104 IFSC: SBIN00291"
                    className={`px-3 py-2 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isDarkMode ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div className="md:col-span-4 flex justify-end gap-3 border-t border-slate-805 pt-3.5">
                  <button
                    type="button"
                    onClick={resetEmployeeForm}
                    className="py-2 px-4 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-750 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-2 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{editingEmp ? "Save Updates" : "Commit Onboard"}</span>
                  </button>
                </div>

              </form>
            </div>
          )}

          {/* Employee Grid lists */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {employees.map((emp) => (
              <div
                key={emp.id}
                className={`p-5 rounded-2xl border flex flex-col justify-between shadow-sm relative ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-850'
                }`}
              >
                {/* ID Tag */}
                <div className="absolute top-4 right-4 bg-blue-900/40 text-blue-300 border border-blue-800 font-mono text-[9px] px-1.5 py-0.5 rounded">
                  USER: {emp.username}
                </div>

                <div className="space-y-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center border border-blue-600/20">
                      <Users className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-100 uppercase">{emp.name}</h4>
                      <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wide">{emp.position || "Staff Executive"}</p>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-slate-400 bg-slate-950/20 p-2.5 rounded-lg font-mono">
                    <p className="text-[11px] truncate">📞 Mobile: <strong className="text-slate-200">{emp.mobile || "N/A"}</strong></p>
                    <p className="text-[11px] truncate">✉ Email: <span className="text-slate-200">{emp.email || "N/A"}</span></p>
                    <p className="text-[11px] truncate">🏦 Bank AC: <span className="text-slate-300 font-bold">{emp.bankAccount || "N/A"}</span></p>
                    <p className="text-[11px] text-slate-100">💰 Fixed Salary: <strong className="text-emerald-400 font-extrabold">₹ {Number(emp.baseSalary || 20000).toLocaleString('en-IN')}</strong>/Mo</p>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex gap-2 border-t border-slate-800/10 pt-3 mt-4 justify-end">
                    <button
                      type="button"
                      onClick={() => startEditEmployee(emp)}
                      className="py-1 px-3 text-[10px] font-black rounded bg-slate-800 text-slate-350 hover:bg-slate-700 transition-all border border-slate-750 cursor-pointer"
                    >
                      Modify Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => startPaySalary(emp)}
                      className="py-1 px-3 text-[10px] font-black rounded bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:opacity-90 transition-all cursor-pointer shadow-sm"
                    >
                      Disburse Pay
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      )}

      {/* VIEW 2: MARK DAILY ATTENDANCE LEDGER */}
      {hrTab === 'attendance' && (
        <div className={`p-6 rounded-xl border space-y-6 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-850 pb-4">
            <div>
              <h3 className={`font-extrabold text-sm uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-850'}`}>
                Workspace Staff Attendance Cards
              </h3>
              <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                Select a target operational calendar date, adjust staffs daycards, and commit values to system history.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Ledger Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg focus:outline-none ${
                  isDarkMode ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-350 text-slate-900'
                }`}
              />
            </div>
          </div>

          {/* List of staffs with radio toggles */}
          <div className="space-y-3.5">
            {employees.map((emp) => {
              const activeStatus = attendanceStatuses[emp.username] || "Present";

              return (
                <div
                  key={emp.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950/20 border border-slate-850 hover:border-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center">
                      <UserCheck className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <h5 className="font-extrabold text-xs text-white uppercase">{emp.name}</h5>
                      <span className="text-[9px] text-slate-500 uppercase tracking-wide font-bold">{emp.position}</span>
                    </div>
                  </div>

                  {/* Operational Daycard Radios */}
                  <div className="flex gap-2 flex-wrap">
                    {(['Present', 'Absent', 'Half Day', 'Leave'] as const).map((opt) => {
                      const optColors: Record<string, string> = {
                        Present: 'bg-emerald-600 text-white font-black hover:bg-emerald-700',
                        Absent: 'bg-red-600 text-white font-black hover:bg-red-700',
                        'Half Day': 'bg-amber-600 text-white font-black hover:bg-amber-700',
                        Leave: 'bg-blue-600 text-white font-black hover:bg-blue-700'
                      };

                      const isSelected = activeStatus === opt;

                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleUpdateStatusSingle(emp.username, opt)}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all cursor-pointer ${
                            isSelected 
                              ? optColors[opt] 
                              : isDarkMode ? 'bg-slate-850 hover:bg-slate-800 text-slate-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-705'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-850/60">
            <button
              type="button"
              onClick={handleSaveAttendanceAll}
              disabled={savingAttendance || employees.length === 0}
              className="px-6 py-2.5 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white uppercase rounded-xl flex items-center gap-1.5 shadow"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{savingAttendance ? "Saving Daily Ledger..." : "Commit Daily Attendance Ledger"}</span>
            </button>
          </div>

        </div>
      )}

      {/* VIEW 3: PAYROLL LEDGER & SLIPS */}
      {hrTab === 'payroll' && (
        <div className="space-y-6">
          
          {/* Pay Slip Distribution Dialog box */}
          {isPayingSalary && selectedPayUser && (
            <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'} animate-fade-in`}>
              <h4 className="text-xs font-bold uppercase mb-4 text-emerald-500">
                💸 Disburse Monthly Pay slip : {selectedPayUser.name}
              </h4>
              <form onSubmit={handleCreatePayRecord} className="grid grid-cols-1 md:grid-cols-4 gap-4 align-end text-xs">
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Contract Base Salary</label>
                  <input
                    type="text"
                    disabled
                    value={`₹ ${selectedPayUser.baseSalary || 20000}`}
                    className={`px-3 py-2 rounded-lg w-full disabled:opacity-70 ${
                      isDarkMode ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Tax Period month</label>
                  <select
                    value={payMonth}
                    onChange={(e) => setPayMonth(e.target.value)}
                    className={`px-3 py-2 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isDarkMode ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  >
                    {["May 2026", "June 2026", "July 2026", "August 2026"].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Performance Bonus addition (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={payBonus}
                    onChange={(e) => setPayBonus(Math.max(0, Number(e.target.value)))}
                    className={`px-3 py-2 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isDarkMode ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Unpaid Deductions / Loss of pay (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={payDeductions}
                    onChange={(e) => setPayDeductions(Math.max(0, Number(e.target.value)))}
                    className={`px-3 py-2 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isDarkMode ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div className="md:col-span-4 flex justify-between items-center border-t border-slate-805 pt-4">
                  <div className="text-xs font-black">
                    Calculated Net Disbursal Amount: &nbsp;
                    <span className="text-emerald-400 text-sm font-extrabold font-mono">
                      ₹ {((selectedPayUser.baseSalary || 20000) + payBonus - payDeductions).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsPayingSalary(false);
                        setSelectedPayUser(null);
                      }}
                      className="py-2 px-4 rounded-lg bg-slate-805 text-slate-450 hover:bg-slate-800 cursor-pointer"
                    >
                      Cancel Pay
                    </button>
                    <button
                      type="submit"
                      disabled={submittingPay}
                      className="py-2 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold flex items-center gap-1.5 cursor-pointer shadow-lg"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{submittingPay ? "Paying..." : "Approve & Pay Salary"}</span>
                    </button>
                  </div>
                </div>

              </form>
            </div>
          )}

          {/* Payroll records ledger table */}
          <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h4 className="text-xs font-bold uppercase mb-4 text-blue-500 select-none">
              📂 Disbursed Employee salary slates
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-[11px] leading-relaxed">
                <thead>
                  <tr className="border-b border-slate-800/30 font-bold opacity-60 text-slate-405">
                    <th className="py-2.5 px-3">Disbursal Ref.</th>
                    <th className="py-2.5 px-3">Recipient Staff</th>
                    <th className="py-2.5 px-3 uppercase text-center">Period Month</th>
                    <th className="py-2.5 px-3">Bank Base Pay</th>
                    <th className="py-2.5 px-3 text-green-400 font-bold">Bonuses</th>
                    <th className="py-2.5 px-3 text-red-500 font-bold">Deductions</th>
                    <th className="py-2.5 px-3">Disbursed Total</th>
                    <th className="py-2.5 px-3 text-center">Receipt Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/40">
                  {payrollLogs.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-855/10 text-slate-200">
                      <td className="py-3 px-3 text-blue-500 font-bold">{p.id}</td>
                      <td className="py-3 px-3 uppercase font-semibold text-white">{p.employeeName}</td>
                      <td className="py-3 px-3 text-center font-bold text-slate-300">{p.month}</td>
                      <td className="py-3 px-3">₹{p.baseSalary.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-3 text-green-400">+₹{p.bonus.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-3 text-red-400">-₹{p.deductions.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-3 font-extrabold text-blue-400">₹{p.netPaid.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-950 text-emerald-300">
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setPrintedSlip(p)}
                          className="py-1 px-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-750 font-bold cursor-pointer text-[10px]"
                        >
                          View Pay Slip
                        </button>
                      </td>
                    </tr>
                  ))}
                  {payrollLogs.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500 font-semibold italic">
                        No corporate salary disbursals discovered in ledger archives.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
