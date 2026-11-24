"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Phone,
  Mail,
  Shield,
  Building2,
  UserCheck,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  UserPlus,
  Ban,
  Check,
} from "lucide-react";

interface UserItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "CUSTOMER" | "OWNER" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED";
  propertiesCount?: number;
  bookingsCount?: number;
  joinedDate: string;
  companyName?: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "CUSTOMER" | "OWNER" | "ADMIN">("ALL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New user modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState<"CUSTOMER" | "OWNER" | "ADMIN">("CUSTOMER");
  const [submitting, setSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.success && data.users) {
        setUsers(data.users);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleUpdateRole = async (userId: string, newRole: "CUSTOMER" | "OWNER" | "ADMIN") => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateRole", userId, newRole }),
      });
      const data = await res.json();
      if (data.success && data.users) {
        setUsers(data.users);
        showToast(`User role updated to ${newRole}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggleStatus", userId }),
      });
      const data = await res.json();
      if (data.success && data.users) {
        setUsers(data.users);
        showToast("User status updated successfully");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newName) return;
    try {
      setSubmitting(true);
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createUser",
          name: newName,
          email: newEmail,
          phone: newPhone,
          role: newRole,
        }),
      });
      const data = await res.json();
      if (data.success && data.users) {
        setUsers(data.users);
        setCreateModalOpen(false);
        setNewName("");
        setNewEmail("");
        setNewPhone("");
        showToast(`Added new ${newRole} account successfully!`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    const matchesSearch =
      !search.trim() ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.includes(search);
    return matchesRole && matchesSearch;
  });

  const countCustomer = users.filter((u) => u.role === "CUSTOMER").length;
  const countOwner = users.filter((u) => u.role === "OWNER").length;
  const countAdmin = users.filter((u) => u.role === "ADMIN").length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#123D2B] text-white px-4 py-2.5 rounded-lg shadow-lg text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-[#E8F1D5]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E8E6DF]">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#123D2B] bg-[#E8F1D5] px-2.5 py-1 rounded-md">
            Super Administrator Control
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#123D2B] tracking-tight mt-1.5">
            User & Role Management
          </h1>
          <p className="text-xs sm:text-sm text-[#5E6E65] mt-1">
            Oversee and manage Customers (Residents), Property Owners (PG Partners), and Admins across Stayzy.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadUsers}
            className="p-2.5 rounded-md border border-[#D5D2C7] bg-white text-[#5E6E65] hover:text-[#123D2B] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
            title="Refresh user list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md bg-[#123D2B] text-white text-xs font-bold hover:bg-[#0E2F21] shadow-sm transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-[#E8F1D5]" />
            <span>Create User</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-[#E8E6DF] shadow-xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#7B8B82]">Total Accounts</span>
          <div className="text-2xl font-extrabold text-[#192621]">{users.length}</div>
          <span className="text-[11px] text-[#5E6E65]">Platform-wide profiles</span>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E8E6DF] shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#7B8B82]">Residents / Tenants</span>
            <UserCheck className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-extrabold text-[#123D2B]">{countCustomer}</div>
          <span className="text-[11px] text-[#5E6E65]">Active booking residents</span>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E8E6DF] shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#7B8B82]">Property Owners</span>
            <Building2 className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-2xl font-extrabold text-amber-800">{countOwner}</div>
          <span className="text-[11px] text-[#5E6E65]">Verified PG Landlords</span>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E8E6DF] shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#7B8B82]">Administrators</span>
            <Shield className="w-4 h-4 text-[#123D2B]" />
          </div>
          <div className="text-2xl font-extrabold text-[#123D2B]">{countAdmin}</div>
          <span className="text-[11px] text-[#5E6E65]">Platform super users</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-[#E8E6DF] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Role Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {(
            [
              { id: "ALL", label: `All Users (${users.length})` },
              { id: "CUSTOMER", label: `Residents (${countCustomer})` },
              { id: "OWNER", label: `Property Owners (${countOwner})` },
              { id: "ADMIN", label: `Admins (${countAdmin})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRoleFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                roleFilter === tab.id
                  ? "bg-[#123D2B] text-white shadow-xs"
                  : "bg-[#FAF8F5] text-[#5E6E65] hover:text-[#123D2B] hover:bg-[#F0EDE4]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7B8B82]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone..."
            className="w-full h-9 pl-9 pr-3 rounded-md border border-[#D5D2C7] bg-[#FDFCF9] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#123D2B]"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-[#E8E6DF] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] border-b border-[#E8E6DF] text-[#7B8B82] uppercase text-[10px] font-extrabold tracking-wider">
              <tr>
                <th className="py-3 px-4">User Details</th>
                <th className="py-3 px-4">Current Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Properties / Stays</th>
                <th className="py-3 px-4">Role Action</th>
                <th className="py-3 px-4 text-right">Access Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EDE4]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#7B8B82] text-xs">
                    No users matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isOwner = u.role === "OWNER";
                  const isAdmin = u.role === "ADMIN";
                  const isCustomer = u.role === "CUSTOMER";

                  return (
                    <tr key={u.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                      {/* Name & Contact */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-md flex items-center justify-center font-extrabold text-xs shrink-0 ${
                              isAdmin
                                ? "bg-[#123D2B] text-white"
                                : isOwner
                                ? "bg-amber-100 text-amber-900 border border-amber-300"
                                : "bg-[#E8F1D5] text-[#123D2B]"
                            }`}
                          >
                            {u.name ? u.name[0].toUpperCase() : "U"}
                          </div>
                          <div>
                            <div className="font-extrabold text-[#192621] flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {u.companyName && (
                                <span className="text-[10px] text-[#7B8B82] font-semibold">
                                  ({u.companyName})
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#5E6E65] flex items-center gap-3 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3 opacity-70" />
                                {u.email}
                              </span>
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 opacity-70" />
                                {u.phone}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        {isAdmin && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#123D2B] text-white text-[10px] font-extrabold tracking-wide uppercase shadow-2xs">
                            <Shield className="w-3 h-3" />
                            Super Admin
                          </span>
                        )}
                        {isOwner && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-extrabold tracking-wide uppercase">
                            <Building2 className="w-3 h-3" />
                            Property Owner
                          </span>
                        )}
                        {isCustomer && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#E8F1D5] text-[#123D2B] text-[10px] font-extrabold tracking-wide uppercase">
                            <UserCheck className="w-3 h-3" />
                            Resident
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {u.status === "ACTIVE" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600">
                            Suspended
                          </span>
                        )}
                      </td>

                      {/* Counts */}
                      <td className="py-3.5 px-4 text-xs font-semibold text-[#5E6E65]">
                        {isOwner ? (
                          <span className="font-bold text-[#123D2B]">
                            {u.propertiesCount || 1} PGs Managed
                          </span>
                        ) : isCustomer ? (
                          <span>{u.bookingsCount ?? 1} Stays Booked</span>
                        ) : (
                          <span className="text-[#7B8B82]">Full System Access</span>
                        )}
                      </td>

                      {/* Quick Change Role */}
                      <td className="py-3.5 px-4">
                        <select
                          value={u.role}
                          onChange={(e) => handleUpdateRole(u.id, e.target.value as any)}
                          className="h-8 px-2 rounded-md border border-[#D5D2C7] bg-[#FAF8F5] text-[11px] font-bold text-[#192621] cursor-pointer"
                        >
                          <option value="CUSTOMER">Set: Resident</option>
                          <option value="OWNER">Set: Property Owner</option>
                          <option value="ADMIN">Set: Super Admin</option>
                        </select>
                      </td>

                      {/* Access Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleToggleStatus(u.id)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                            u.status === "ACTIVE"
                              ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                          }`}
                        >
                          {u.status === "ACTIVE" ? "Suspend" : "Reactivate"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E8E6DF] max-w-md w-full p-6 shadow-xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EDE4]">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#123D2B]" />
                <h3 className="text-lg font-extrabold text-[#123D2B]">Create Platform User</h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-[#7B8B82] hover:text-[#192621] text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-[#5E6E65]">Full Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Ramesh Reddy"
                  className="w-full h-10 px-3 rounded-md border border-[#D5D2C7] bg-[#FDFCF9] text-xs font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-[#5E6E65]">Email Address</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="ramesh@pgstays.com"
                  className="w-full h-10 px-3 rounded-md border border-[#D5D2C7] bg-[#FDFCF9] text-xs font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-[#5E6E65]">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+91 98450 12345"
                  className="w-full h-10 px-3 rounded-md border border-[#D5D2C7] bg-[#FDFCF9] text-xs font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-[#5E6E65]">Assign Platform Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-md border border-[#D5D2C7] bg-[#FAF8F5] text-xs font-bold text-[#123D2B] cursor-pointer"
                >
                  <option value="CUSTOMER">Resident (Customer looking for room)</option>
                  <option value="OWNER">Property Owner (PG Partner listing buildings)</option>
                  <option value="ADMIN">Super Admin (Operations & Full Access)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F0EDE4]">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-md border border-[#D5D2C7] text-xs font-bold text-[#5E6E65] hover:bg-[#FAF8F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-md bg-[#123D2B] text-white text-xs font-bold hover:bg-[#0E2F21] shadow-sm disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Save User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
