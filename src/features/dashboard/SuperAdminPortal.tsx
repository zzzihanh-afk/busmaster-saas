import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { dbStore } from '../../services/dbStore';
import { Tenant, TenantStatus, Profile } from '../../types';
import { DatabaseConsoleModal } from '../database/DatabaseConsoleModal';
import {
  ShieldCheck,
  Building2,
  Users,
  Bus,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  ArrowRight,
  TrendingUp,
  FileText,
  Search,
  ExternalLink,
  Plus,
  UserCheck,
  Shield,
  Trash2,
  Database,
} from 'lucide-react';

export const SuperAdminPortal: React.FC = () => {
  const { switchTenant, setPortal, switchProfile } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>(dbStore.getTenants());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDatabaseModal, setShowDatabaseModal] = useState(false);

  // Company Admins Management Modal State
  const [selectedCompanyForAdmins, setSelectedCompanyForAdmins] = useState<Tenant | null>(null);
  const [allProfiles, setAllProfiles] = useState<Profile[]>(dbStore.getProfiles());
  const [newAdmin, setNewAdmin] = useState({
    full_name: '',
    email: '',
    phone: '',
  });

  // New Company Registration Form State
  const [newCompany, setNewCompany] = useState({
    name: '',
    slug: '',
    owner_name: '',
    email: '',
    phone: '',
    address: '',
    trade_license: '',
  });

  const allBuses = dbStore.getBuses();
  const allBookings = dbStore.getBookings();

  useEffect(() => {
    const unsub = dbStore.subscribe(() => {
      setTenants(dbStore.getTenants());
      setAllProfiles(dbStore.getProfiles());
    });
    return unsub;
  }, []);

  const handleStatusChange = (id: string, newStatus: TenantStatus) => {
    dbStore.updateTenantStatus(id, newStatus);
    setTenants(dbStore.getTenants());
  };

  const handleJumpToCompany = (tenantId: string) => {
    switchTenant(tenantId);
    setPortal('company_owner');
  };

  const handleCreateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.name || !newCompany.owner_name || !newCompany.phone) {
      alert('Please fill in required fields');
      return;
    }
    const slug =
      newCompany.slug ||
      newCompany.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const newTenant: Tenant = {
      id: 't-' + Date.now(),
      name: newCompany.name,
      slug: slug,
      owner_name: newCompany.owner_name,
      email: newCompany.email || `${slug}@operator.bd`,
      phone: newCompany.phone,
      address: newCompany.address || 'Dhaka, Bangladesh',
      trade_license: newCompany.trade_license || 'TRAD/DNCC/' + Math.floor(100000 + Math.random() * 900000),
      status: 'active',
      settings: {
        currency: 'BDT',
        currency_symbol: '৳',
        timezone: 'Asia/Dhaka',
        cancellation_allowed: true,
        refund_percentage: 85,
        primary_color: '#2563eb',
        secondary_color: '#3b82f6',
      },
    };
    dbStore.saveTenant(newTenant);
    setTenants(dbStore.getTenants());
    setShowAddModal(false);
    setNewCompany({
      name: '',
      slug: '',
      owner_name: '',
      email: '',
      phone: '',
      address: '',
      trade_license: '',
    });
  };

  // Appoint Company Admin (Super Admin exclusive authority)
  const handleAppointCompanyAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyForAdmins || !newAdmin.full_name || !newAdmin.email) return;

    const adminProfile: Profile = {
      id: 'p-cadmin-' + Date.now(),
      tenant_id: selectedCompanyForAdmins.id,
      full_name: newAdmin.full_name,
      email: newAdmin.email,
      phone: newAdmin.phone,
      role: 'company_admin',
      is_active: true,
      created_at: new Date().toISOString(),
    };

    dbStore.saveProfile(adminProfile);
    setAllProfiles(dbStore.getProfiles());
    setNewAdmin({ full_name: '', email: '', phone: '' });

    dbStore.addAuditLog({
      tenant_id: selectedCompanyForAdmins.id,
      actor_id: 'p-super-01',
      actor_name: 'Tariqul Islam',
      actor_role: 'super_admin',
      action: 'APPOINT_COMPANY_ADMIN',
      entity_type: 'COMPANY_ADMIN',
      entity_id: adminProfile.id,
      details: {
        company: selectedCompanyForAdmins.name,
        appointed_admin: adminProfile.full_name,
        email: adminProfile.email,
      },
    });
  };

  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.owner_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.phone.includes(searchQuery);
    const matchesStatus = selectedStatus === 'all' || t.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Platform Health */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden border border-purple-800/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-800/60 border border-purple-700/50 text-xs font-semibold text-purple-200 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              BUSMASTER GLOBAL COMMAND CENTER
    </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Platform Administration
            </h1>
            <p className="text-sm text-purple-200 max-w-xl mt-1">
              Complete oversight of all independent bus companies, cross-tenant operational metrics, system compliance, and portal authority.
            </p>
  </div>
          <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
            <button
              onClick={() => setShowDatabaseModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-purple-200 hover:text-white border border-purple-500/30 font-medium text-sm rounded-xl shadow-md transition cursor-pointer"
            >
              <Database className="w-4 h-4 text-purple-400" />
              Database & Cloud Sync
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-blue-500/25 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Onboard New Operator
            </button>
</div>
        </div>
      </div>

      {/* High-Level Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Operators
            </span>
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
              <Building2 className="w-5 h-5" />
    </div>
  </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            {tenants.length}
  </div>
          <span className="text-xs text-emerald-600 font-medium">100% Isolated Tenancy</span>
</div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Fleet Registered
            </span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Bus className="w-5 h-5" />
    </div>
  </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            {allBuses.length} Buses
  </div>
          <span className="text-xs text-slate-500">Across all operators</span>
</div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Platform Bookings
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-5 h-5" />
    </div>
  </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            {allBookings.length}
  </div>
          <span className="text-xs text-emerald-600 font-medium">Segment inventory validated</span>
</div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Platform Uptime
            </span>
            <div className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
    </div>
  </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            99.98%
          </div>
          <span className="text-xs text-emerald-600 font-medium">PostgreSQL RLS Active</span>
        </div>
      </div>

      {/* Registered Bus Operators Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Registered Transport Operators
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Independent bus companies using BUSMASTER multi-tenant infrastructure
            </p>
  </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search operator or owner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 w-48 sm:w-64"
              />
    </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
  </div>
</div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4">Company Name</th>
                <th className="py-3 px-4">Owner & Contact</th>
                <th className="py-3 px-4">Trade License</th>
                <th className="py-3 px-4">Buses / Trips</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Administrative Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {filteredTenants.map((t) => {
                const companyBuses = allBuses.filter((b) => b.tenant_id === t.id);
                const companyBookings = allBookings.filter((b) => b.tenant_id === t.id);
                const companyAdmins = allProfiles.filter(
                  (p) => p.tenant_id === t.id && p.role === 'company_admin'
                );

                return (
                  <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-sm border border-blue-200 dark:border-blue-800">
                          {t.name.charAt(0)}
          </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            {t.name}
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({t.slug})
                            </span>
            </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {t.address || 'Bangladesh'}
                          </span>
          </div>
        </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {t.owner_name}
        </div>
                      <div className="text-[11px] text-slate-500 font-mono">{t.phone}</div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      {t.trade_license || 'TRAD/DNCC/PENDING'}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {companyBuses.length} Buses
        </div>
                      <div className="text-[11px] text-slate-500">
                        {companyBookings.length} Bookings
        </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          t.status === 'active' || t.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : t.status === 'pending'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-1.5">
                      {/* Super Admin Appoint Company Admin Option */}
                      <button
                        onClick={() => setSelectedCompanyForAdmins(t)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 text-xs font-semibold border border-indigo-300 dark:border-indigo-800 transition cursor-pointer"
                        title="Manage and Appoint Company Administrators (Super Admin Exclusive)"
                      >
                        <Users className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Admins ({companyAdmins.length})</span>
                      </button>

                      {/* Super Admin Direct Jump to Company */}
                      <button
                        onClick={() => handleJumpToCompany(t.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900 text-xs font-semibold border border-purple-300 dark:border-purple-800 transition cursor-pointer"
                        title="Enter company dashboard as Super Admin"
                      >
                        <span>Open Portal</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      {/* Approval / Suspension Controls */}
                      {t.status === 'pending' && (
                        <button
                          onClick={() => handleStatusChange(t.id, 'active')}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium transition cursor-pointer"
                        >
                          Approve
                        </button>
                      )}

                      {t.status === 'approved' && (
                        <button
                          onClick={() => handleStatusChange(t.id, 'active')}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium transition cursor-pointer"
                        >
                          Activate
                        </button>
                      )}

                      {(t.status === 'active' || t.status === 'approved') && (
                        <button
                          onClick={() => handleStatusChange(t.id, 'suspended')}
                          className="px-2 py-1 bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-300 rounded text-xs font-medium transition cursor-pointer"
                        >
                          Suspend
                        </button>
                      )}

                      {t.status === 'suspended' && (
                        <button
                          onClick={() => handleStatusChange(t.id, 'active')}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium transition cursor-pointer"
                        >
                          Reactivate
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: SUPER ADMIN APPOINT COMPANY ADMINISTRATORS */}
      {selectedCompanyForAdmins && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  Appoint Company Administrators
                </h3>
                <p className="text-[11px] text-slate-500">
                  Company: <span className="font-bold text-slate-800 dark:text-slate-200">{selectedCompanyForAdmins.name}</span>
                </p>
</div>
              <button
                onClick={() => setSelectedCompanyForAdmins(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
    </div>

            {/* Governance Policy Notice */}
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900 rounded-lg text-indigo-900 dark:text-indigo-200 text-[11px] leading-relaxed">
              <strong>Super Admin Authority Rule:</strong> A company may operate with multiple Company Administrators. Only the BUSMASTER Super Admin has the platform authority to appoint or revoke Company Administrators.
    </div>

            {/* Existing Appointed Admins List */}
            <div className="space-y-2">
              <span className="font-semibold block text-slate-700 dark:text-slate-300">
                Current Appointed Admins:
              </span>
              <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-40 overflow-y-auto bg-slate-50 dark:bg-slate-900 rounded-lg p-2 border border-slate-200 dark:border-slate-700">
                {allProfiles
                  .filter((p) => p.tenant_id === selectedCompanyForAdmins.id && (p.role === 'company_admin' || p.role === 'company_owner'))
                  .map((adm) => (
                    <div key={adm.id} className="py-2 flex items-center justify-between text-xs gap-2">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{adm.full_name}</span>
                        <span className="text-[10px] text-slate-400 block">{adm.email} • {adm.phone}</span>
        </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 uppercase">
                          {adm.role.replace('_', ' ')}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            switchProfile(adm.id);
                            setSelectedCompanyForAdmins(null);
                          }}
                          className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] cursor-pointer shadow transition"
                          title="Switch persona & log in as this administrator"
                        >
                          Login as Admin
                        </button>
        </div>
      </div>
                  ))}
</div>
    </div>

            {/* Form to Appoint New Company Admin */}
            <form onSubmit={handleAppointCompanyAdmin} className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-900 dark:text-white block">
                + Appoint New Company Admin to {selectedCompanyForAdmins.name}
              </span>

              <div>
                <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                  Admin Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sultana Parvin"
                  value={newAdmin.full_name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, full_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none"
                />
</div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="admin@operator.bd"
                    value={newAdmin.email}
                    onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none"
                  />
  </div>
                <div>
                  <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                    Mobile Contact *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+880 1711-..."
                    value={newAdmin.phone}
                    onChange={(e) => setNewAdmin({ ...newAdmin, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono focus:outline-none"
                  />
  </div>
</div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedCompanyForAdmins(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded shadow cursor-pointer"
                >
                  Appoint Company Admin
                </button>
</div>
            </form>
  </div>
</div>
      )}

      {/* Add Company Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Onboard Bus Company
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Instantiate isolated multi-tenant workspace with database isolation
            </p>

            <form onSubmit={handleCreateCompany} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Company Legal Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shyamoli NR Travels"
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
</div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Owner Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Ghosh"
                    value={newCompany.owner_name}
                    onChange={(e) => setNewCompany({ ...newCompany, owner_name: e.target.value })}
                    className="w-full mt-1 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
  </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Mobile Phone *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+880 1711-..."
                    value={newCompany.phone}
                    onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })}
                    className="w-full mt-1 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
  </div>
</div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Business Address
                </label>
                <input
                  type="text"
                  placeholder="Sayedabad / Gabtoli, Dhaka"
                  value={newCompany.address}
                  onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })}
                  className="w-full mt-1 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
</div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow transition"
                >
                  Create & Activate Company
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Database Console Modal */}
      <DatabaseConsoleModal
        isOpen={showDatabaseModal}
        onClose={() => setShowDatabaseModal(false)}
      />
    </div>
  );
};
