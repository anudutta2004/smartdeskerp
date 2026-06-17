/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Settings, Building2, Shield, Eye, ShieldAlert, Sparkles, 
  Activity, CheckCircle, RefreshCw, Smartphone, Key, Lock, Palette
} from 'lucide-react';
import { SystemSettings, SmartDeskUser, ActivityLog } from '../../types';

interface SystemSettingsManagerProps {
  settings: SystemSettings;
  users: SmartDeskUser[];
  logs: ActivityLog[];
  isDarkMode: boolean;
  isAdmin: boolean;
  currentUsername: string;
  onRefreshDB: () => void;
  onLogActivity: (action: string, details: string) => void;
}

export default function SystemSettingsManager({
  settings,
  users,
  logs,
  isDarkMode,
  isAdmin,
  currentUsername,
  onRefreshDB,
  onLogActivity
}: SystemSettingsManagerProps) {
  
  // Section index: 'general' | 'users' | 'activity'
  const [settingsTab, setSettingsTab] = useState<'general' | 'users' | 'activity'>('general');

  // General settings state
  const [compName, setCompName] = useState<string>(settings?.companyName || "SmartDesk ERP Ltd");
  const [logoTextVal, setLogoTextVal] = useState<string>(settings?.logoText || "SD");
  const [logoBg, setLogoBg] = useState<string>(settings?.logoBgColor || "#3B82F6");
  const [businessGst, setBusinessGst] = useState<string>(settings?.gstNumber || "");
  const [businessAddr, setBusinessAddr] = useState<string>(settings?.businessAddress || "");
  const [contactPhone, setContactPhone] = useState<string>(settings?.contactNumber || "");
  const [invPrefix, setInvPrefix] = useState<string>(settings?.invoicePrefix || "SD-INV");
  const [updatingSettings, setUpdatingSettings] = useState<boolean>(false);

  // Administrative password reset states (Only for Admins)
  const [targetResetUser, setTargetResetUser] = useState<string>('');
  const [newResetPassword, setNewResetPassword] = useState<string>('');
  const [resubmittingPass, setResubmittingPass] = useState<boolean>(false);

  const handleUpdateGeneralSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingSettings(true);

    const payload = {
      companyName: compName,
      logoText: logoTextVal,
      logoBgColor: logoBg,
      gstNumber: businessGst,
      businessAddress: businessAddr,
      contactNumber: contactPhone,
      invoicePrefix: invPrefix,
      createdBy: currentUsername
    };

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        onRefreshDB();
        onLogActivity("System Settings Modify", `Adjusted brand metadata profile and active billing parameters.`);
        alert("System settings committed to database successfully.");
      } else {
        alert("Commit failed: " + data.error);
      }
    } catch (err) {
      alert("Offline network delay saving parameters.");
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetResetUser) {
      alert("Please choose a target user account first.");
      return;
    }
    if (!newResetPassword.trim() || newResetPassword.length < 5) {
      alert("Password must contain at minimum 5 characters.");
      return;
    }

    setResubmittingPass(true);

    try {
      const matchedUser = users.find(u => u.username === targetResetUser);
      if (!matchedUser) return;

      const res = await fetch(`/api/users/${matchedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...matchedUser,
          password: newResetPassword,
          createdBy: currentUsername
        })
      });

      const data = await res.json();
      if (data.success) {
        onRefreshDB();
        onLogActivity("Security Override", `Administrative override password update issued for user '${targetResetUser}'`);
        alert(`Credentials for '${targetResetUser}' updated successfully.`);
        setNewResetPassword('');
        setTargetResetUser('');
      } else {
        alert("Override failed: " + data.error);
      }
    } catch (err) {
      alert("Network errors connecting to authentication database.");
    } finally {
      setResubmittingPass(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-350">
      
      {/* Navigation sub-bar */}
      <div className="flex gap-2 border-b border-slate-805/40 pb-3">
        <button
          type="button"
          onClick={() => setSettingsTab('general')}
          className={`px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
            settingsTab === 'general'
              ? 'bg-blue-600 text-white shadow'
              : isDarkMode ? 'text-slate-400 hover:bg-slate-850 hover:text-white' : 'text-slate-650 hover:bg-slate-50'
          }`}
        >
          ⚙ Enterprise Profile & Brackets
        </button>
        <button
          type="button"
          onClick={() => setSettingsTab('users')}
          className={`px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
            settingsTab === 'users'
              ? 'bg-blue-600 text-white shadow'
              : isDarkMode ? 'text-slate-400 hover:bg-slate-850 hover:text-white' : 'text-slate-650 hover:bg-slate-50'
          }`}
        >
          🛡 Password Resets & Credentials
        </button>
        <button
          type="button"
          onClick={() => setSettingsTab('activity')}
          className={`px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
            settingsTab === 'activity'
              ? 'bg-blue-600 text-white shadow'
              : isDarkMode ? 'text-slate-400 hover:bg-slate-850 hover:text-white' : 'text-slate-650 hover:bg-slate-50'
          }`}
        >
          📂 System Operational Logs
        </button>
      </div>

      {/* SECTION 1: ENTERPRISE INFO */}
      {settingsTab === 'general' && (
        <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <h4 className="text-xs font-black uppercase mb-4 text-blue-500 select-none">
            ⚙ Modify corporate meta tags
          </h4>

          <form onSubmit={handleUpdateGeneralSettings} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Business Name */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-405 mb-1">Trading Company / Billed Name *</label>
                <input
                  type="text"
                  required
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  placeholder="e.g. SmartDesk ERP Ltd"
                  className={`px-3 py-2 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDarkMode ? 'bg-slate-950 border border-slate-800 text-yellow-100' : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* Invoice prefix */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-405 mb-1">Invoice Prefix Series *</label>
                <input
                  type="text"
                  required
                  value={invPrefix}
                  onChange={(e) => setInvPrefix(e.target.value.toUpperCase().trim())}
                  placeholder="e.g. SD-INV"
                  className={`px-3 py-2 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDarkMode ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* Logo initials */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-405 mb-1">Visual Initials Logo text *</label>
                <input
                  type="text"
                  required
                  maxLength={4}
                  value={logoTextVal}
                  onChange={(e) => setLogoTextVal(e.target.value.toUpperCase())}
                  placeholder="e.g. SD"
                  className={`px-3 py-2 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDarkMode ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* Logo background color styling picker */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-450 mb-1 flex items-center gap-1">
                  <Palette className="w-3 h-3 text-blue-500" />
                  <span>Logo Badge Background Color</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={logoBg}
                    onChange={(e) => setLogoBg(e.target.value)}
                    className="w-10 h-8 rounded border p-0.5 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={logoBg}
                    onChange={(e) => setLogoBg(e.target.value)}
                    className={`px-3 py-1.5 rounded-lg w-full font-mono focus:outline-none ${
                      isDarkMode ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* GST number */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-405 mb-1">Corporate GSTIN Number</label>
                <input
                  type="text"
                  value={businessGst}
                  onChange={(e) => setBusinessGst(e.target.value.toUpperCase())}
                  placeholder="e.g. 19AAAAA1111A1Z1"
                  className={`px-3 py-2 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDarkMode ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* Contact Phone */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-405 mb-1">Enterprise Voice line number</label>
                <div className="relative">
                  <Smartphone className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="e.g. +91 9876543210"
                    className={`px-3 pl-8 py-2 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isDarkMode ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Street Address */}
              <div className="md:col-span-2">
                <label className="block text-[10px] uppercase font-bold text-slate-405 mb-1">Principal Business Street location Address</label>
                <textarea
                  rows={2}
                  value={businessAddr}
                  onChange={(e) => setBusinessAddr(e.target.value)}
                  placeholder="e.g. SECTOR-5, SALT LAKE, KOLKATA, WEST BENGAL..."
                  className={`px-3 py-2 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDarkMode ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                />
              </div>

            </div>

            <div className="flex justify-end pt-4 border-t border-slate-805/30 mt-6">
              <button
                type="submit"
                disabled={updatingSettings || !isAdmin}
                className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs cursor-pointer shadow-lg flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{updatingSettings ? "Saving Settings..." : "Commit Profile Changes"}</span>
              </button>
            </div>
          </form>

        </div>
      )}

      {/* SECTION 2: PASSWORD OVERRIDES */}
      {settingsTab === 'users' && (
        <div className={`p-6 rounded-xl border max-w-xl ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <h4 className="text-xs font-black uppercase text-red-500 flex items-center gap-1.5 mb-2 leading-none">
            <ShieldAlert className="w-4.5 h-4.5 text-red-500" />
            <span>Administrative Security bypass & Password overrides</span>
          </h4>
          <p className="text-[10px] text-slate-500 mb-4 select-none leading-snug">
            Security bypass panel. Choose any team member account below, select a secure key, and reset credentials instantly.
          </p>

          {!isAdmin ? (
            <p className="p-4 rounded-xl text-center text-red-400 font-bold bg-red-950/20 text-xs uppercase select-none tracking-wide">
              Access Restricted: Only Principal Admin Managers can trigger master credential overrides.
            </p>
          ) : (
            <form onSubmit={handleAdminResetPassword} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Tag User Account Profile</label>
                <select
                  required
                  value={targetResetUser}
                  onChange={(e) => setTargetResetUser(e.target.value)}
                  className={`text-xs px-3 py-2 rounded-lg w-full focus:outline-none ${
                    isDarkMode ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-950'
                  }`}
                >
                  <option value="">-- Choose User profile --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.username}>👤 {u.name} ({u.username} - {u.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">New Secure Override Password</label>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={newResetPassword}
                    onChange={(e) => setNewResetPassword(e.target.value)}
                    placeholder="Enter 5+ characters password..."
                    className={`text-xs pl-8 pr-3 py-2 rounded-lg w-full focus:outline-none ${
                      isDarkMode ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-950'
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={resubmittingPass || !targetResetUser}
                className="w-full py-2.5 rounded-xl bg-red-650 hover:bg-red-700 text-white font-extrabold uppercase text-xs flex items-center justify-center gap-1 shadow cursor-pointer transition-all disabled:opacity-40"
              >
                <Key className="w-3.5 h-3.5 text-white" />
                <span>{resubmittingPass ? "Committing override keys..." : "Issue Password override"}</span>
              </button>
            </form>
          )}

        </div>
      )}

      {/* SECTION 3: SYSTEM AUDIT LOGGER */}
      {settingsTab === 'activity' && (
        <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-blue-500 animate-pulse" />
            <h4 className="text-xs font-black uppercase text-blue-500 select-none">
              📂 REAL-TIME AUDIT LOGGER
            </h4>
          </div>

          <div className="overflow-y-auto max-h-[400px] border border-slate-850 rounded-lg">
            <div className="divide-y divide-slate-850/60 font-mono text-[10px] leading-relaxed">
              
              <div className="grid grid-cols-12 bg-slate-950/20 px-3.5 py-2 text-slate-450 font-bold uppercase select-none">
                <span className="col-span-3">Timestamp Log</span>
                <span className="col-span-2">User</span>
                <span className="col-span-2 text-center">Division</span>
                <span className="col-span-5">Audit description metadata</span>
              </div>

              {logs.map((log) => (
                <div key={log.id} className="grid grid-cols-12 px-3.5 py-2.5 hover:bg-slate-850/15 text-slate-300">
                  <span className="col-span-3 text-slate-500">{new Date(log.timestamp).toLocaleString()}</span>
                  <span className="col-span-2 uppercase font-semibold text-slate-200">{log.user}</span>
                  <span className="col-span-2 text-center text-blue-400 font-bold uppercase">{log.action}</span>
                  <p className="col-span-5 text-slate-305 leading-tight">{log.details}</p>
                </div>
              ))}

              {logs.length === 0 && (
                <p className="text-center py-6 text-slate-500 italic select-none">
                  No system auditing entries registered in the db stream.
                </p>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
