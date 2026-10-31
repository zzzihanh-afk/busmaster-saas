import React from 'react';
import { useAuth, PortalType } from '../../features/auth/AuthContext';
import { dbStore } from '../../services/dbStore';
import {
  ShieldAlert,
  Building2,
  Ticket,
  UserCheck,
  Truck,
  Eye,
  HelpCircle,
  Globe,
  ChevronDown,
  Sparkles,
  Users,
} from 'lucide-react';

export const PortalSwitcher: React.FC = () => {
  const {
    activePortal,
    setPortal,
    isSuperAdmin,
    isCompanyOwner,
    canAccessPortal,
    availableTenants,
    tenant,
    switchTenant,
    switchProfile,
    profile,
  } = useAuth();

  const companyAdmins = tenant
    ? dbStore
        .getProfiles()
        .filter(
          (p) =>
            p.tenant_id === tenant.id &&
            (p.role === 'company_admin' || p.role === 'company_owner')
        )
    : [];

  const portals: { id: PortalType; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'super_admin',
      label: 'Super Admin Portal',
      icon: <ShieldAlert className="w-4 h-4 text-purple-500" />,
      desc: 'Central Platform Control',
    },
    {
      id: 'company_owner',
      label: 'Company Owner / Admin',
      icon: <Building2 className="w-4 h-4 text-emerald-500" />,
      desc: 'Fleet, Routes, Finances & Operations',
    },
    {
      id: 'counter_agent',
      label: 'Counter POS Terminal',
      icon: <Ticket className="w-4 h-4 text-blue-500" />,
      desc: 'Fast Bus Counter Ticket Booking',
    },
    {
      id: 'counter_manager',
      label: 'Counter Manager',
      icon: <UserCheck className="w-4 h-4 text-indigo-500" />,
      desc: 'Cash Sessions & Shift Audit',
    },
    {
      id: 'driver',
      label: 'Driver Portal',
      icon: <Truck className="w-4 h-4 text-amber-500" />,
      desc: 'Trip Manifests & Departures',
    },
    {
      id: 'supervisor',
      label: 'Supervisor Portal',
      icon: <Eye className="w-4 h-4 text-teal-500" />,
      desc: 'Passenger Verification & Boarding',
    },
    {
      id: 'support',
      label: 'Support Portal',
      icon: <HelpCircle className="w-4 h-4 text-rose-500" />,
      desc: 'Complaints & Inquiries',
    },
    {
      id: 'customer',
      label: 'Public Booking Site',
      icon: <Globe className="w-4 h-4 text-cyan-500" />,
      desc: 'Online Passenger Booking',
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 bg-slate-900 text-slate-100 p-2.5 rounded-xl border border-slate-800 shadow-md">
      {/* Scope Indicator Badge */}
      <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 rounded-lg text-xs font-medium border border-slate-700">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-slate-400">Context:</span>
        <span className="text-white font-semibold">{profile.role.replace('_', ' ').toUpperCase()}</span>
      </div>

      {/* Super Admin Company Selector (Global Access) */}
      {isSuperAdmin && (
        <div className="flex items-center gap-1.5 bg-purple-950/60 border border-purple-800/80 px-2.5 py-1 rounded-lg text-xs">
          <Building2 className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-purple-300 font-medium">Viewing Company:</span>
          <select
            value={tenant?.id || ''}
            onChange={(e) => switchTenant(e.target.value)}
            className="bg-purple-900/80 text-white font-semibold rounded px-2 py-0.5 border border-purple-700 focus:outline-none focus:ring-1 focus:ring-purple-400 cursor-pointer"
          >
            {availableTenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.status.toUpperCase()})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Company Owner Context Indicator */}
      {isCompanyOwner && tenant && (
        <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded-lg text-xs">
          <Building2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-300 font-medium">Company:</span>
          <span className="text-white font-bold">{tenant.name}</span>
        </div>
      )}

      {/* Appointed Company Admins Quick Switcher */}
      {companyAdmins.length > 0 && (
        <div className="flex items-center gap-1.5 bg-indigo-950/60 border border-indigo-800/80 px-2.5 py-1 rounded-lg text-xs">
          <Users className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-indigo-300 font-medium">Admin:</span>
          <select
            value={profile.id}
            onChange={(e) => switchProfile(e.target.value)}
            className="bg-indigo-900/80 text-white font-semibold rounded px-2 py-0.5 border border-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer text-xs"
          >
            {isSuperAdmin && (
              <option value="p-super-01">👑 Super Admin (Viewing as)</option>
            )}
            {companyAdmins.map((adm) => (
              <option key={adm.id} value={adm.id}>
                👤 {adm.full_name} ({adm.role === 'company_owner' ? 'Owner' : 'Company Admin'})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Available Portals Buttons */}
      <div className="flex flex-wrap items-center gap-1 ml-auto">
        {portals.map((p) => {
          const allowed = canAccessPortal(p.id);
          if (!allowed) return null;
          const isActive = activePortal === p.id;

          return (
            <button
              key={p.id}
              onClick={() => setPortal(p.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400/50'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'
              }`}
              title={p.desc}
            >
              {p.icon}
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
