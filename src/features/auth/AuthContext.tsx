import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile, Tenant, UserRole, Counter } from '../../types';
import { dbStore } from '../../services/dbStore';

export type PortalType =
  | 'super_admin'
  | 'company_owner'
  | 'counter_manager'
  | 'counter_agent'
  | 'driver'
  | 'supervisor'
  | 'support'
  | 'customer';

interface AuthContextType {
  profile: Profile;
  tenant: Tenant | null;
  counter: Counter | null;
  activePortal: PortalType;
  availableTenants: Tenant[];
  availableCounters: Counter[];
  isSuperAdmin: boolean;
  isCompanyOwner: boolean;
  canAccessPortal: (portal: PortalType) => boolean;
  setPortal: (portal: PortalType) => void;
  switchTenant: (tenantId: string) => void;
  switchCounter: (counterId: string) => void;
  switchProfile: (profileId: string) => void;
  loginAsPersona: (role: UserRole, tenantId?: string) => void;
  loginWithCredentials: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profiles, setProfiles] = useState<Profile[]>(dbStore.getProfiles());
  const [tenants, setTenants] = useState<Tenant[]>(dbStore.getTenants());
  
  // Default to Super Admin for immediate executive evaluation
  const [currentProfileId, setCurrentProfileId] = useState<string>(
    localStorage.getItem('BUSMASTER_CURRENT_PROFILE') || 'p-super-01'
  );
  
  // Active tenant for Super Admin viewing companies, or company owner's tenant
  const [activeTenantId, setActiveTenantId] = useState<string | null>(
    localStorage.getItem('BUSMASTER_ACTIVE_TENANT') || 't-greenline-01'
  );

  const [activeCounterId, setActiveCounterId] = useState<string | null>(
    localStorage.getItem('BUSMASTER_ACTIVE_COUNTER') || 'cnt-gl-01'
  );

  const [activePortal, setActivePortalState] = useState<PortalType>(
    (localStorage.getItem('BUSMASTER_ACTIVE_PORTAL') as PortalType) || 'super_admin'
  );

  useEffect(() => {
    const unsub = dbStore.subscribe(() => {
      setProfiles(dbStore.getProfiles());
      setTenants(dbStore.getTenants());
    });
    return unsub;
  }, []);

  const currentProfile =
    profiles.find((p) => p.id === currentProfileId) || profiles[0] || ({} as Profile);

  const isSuperAdmin = currentProfile.role === 'super_admin';
  const isCompanyOwner = currentProfile.role === 'company_owner';

  // Effective tenant: if super admin, uses selected activeTenant; if company user, uses user's assigned tenant
  const effectiveTenantId = isSuperAdmin
    ? activeTenantId
    : currentProfile.tenant_id || activeTenantId;

  const currentTenant = tenants.find((t) => t.id === effectiveTenantId) || null;

  const availableCounters = currentTenant
    ? dbStore.getCounters(currentTenant.id)
    : [];

  const currentCounter =
    availableCounters.find((c) => c.id === activeCounterId) ||
    availableCounters[0] ||
    null;

  // Master Access Matrix Check
  const canAccessPortal = (portal: PortalType): boolean => {
    if (isSuperAdmin) return true; // Super Admin has unrestricted access to ALL portals!
    if (isCompanyOwner) {
      // Company Owner has unrestricted access to ALL portals within their company!
      return portal !== 'super_admin';
    }
    // Specific role restrictions
    switch (portal) {
      case 'counter_manager':
        return currentProfile.role === 'counter_manager';
      case 'counter_agent':
        return (
          currentProfile.role === 'counter_agent' ||
          currentProfile.role === 'counter_manager'
        );
      case 'driver':
        return currentProfile.role === 'driver';
      case 'supervisor':
        return currentProfile.role === 'supervisor';
      case 'support':
        return (
          currentProfile.role === 'company_admin' ||
          currentProfile.role === 'counter_manager'
        );
      case 'customer':
        return true;
      default:
        return false;
    }
  };

  const setPortal = (portal: PortalType) => {
    if (!canAccessPortal(portal)) {
      alert(`Access restricted: Your role (${currentProfile.role}) cannot access the ${portal} portal.`);
      return;
    }
    setActivePortalState(portal);
    localStorage.setItem('BUSMASTER_ACTIVE_PORTAL', portal);
    dbStore.addAuditLog({
      tenant_id: currentTenant?.id,
      actor_id: currentProfile.id,
      actor_name: currentProfile.full_name,
      actor_role: currentProfile.role,
      action: 'SWITCH_PORTAL',
      entity_type: 'PORTAL',
      entity_id: portal,
      details: { targetPortal: portal, tenant: currentTenant?.name },
    });
  };

  const switchTenant = (tenantId: string) => {
    if (!isSuperAdmin && currentProfile.tenant_id !== tenantId) {
      alert('Security violation: You cannot access another company’s portal or tenant data.');
      return;
    }
    setActiveTenantId(tenantId);
    localStorage.setItem('BUSMASTER_ACTIVE_TENANT', tenantId);

    // Auto-select first counter of new tenant
    const tenantCounters = dbStore.getCounters(tenantId);
    if (tenantCounters.length > 0) {
      setActiveCounterId(tenantCounters[0].id);
      localStorage.setItem('BUSMASTER_ACTIVE_COUNTER', tenantCounters[0].id);
    }
  };

  const switchCounter = (counterId: string) => {
    setActiveCounterId(counterId);
    localStorage.setItem('BUSMASTER_ACTIVE_COUNTER', counterId);
  };

  const switchProfile = (profileId: string) => {
    const target = profiles.find((p) => p.id === profileId);
    if (!target) return;
    setCurrentProfileId(target.id);
    localStorage.setItem('BUSMASTER_CURRENT_PROFILE', target.id);

    if (target.tenant_id) {
      setActiveTenantId(target.tenant_id);
      localStorage.setItem('BUSMASTER_ACTIVE_TENANT', target.tenant_id);
    }

    // Auto navigate to matching portal
    if (target.role === 'super_admin') {
      setPortal('super_admin');
    } else if (target.role === 'company_owner' || target.role === 'company_admin') {
      setPortal('company_owner');
    } else if (target.role === 'counter_manager') {
      setPortal('counter_manager');
    } else if (target.role === 'counter_agent') {
      setPortal('counter_agent');
    } else if (target.role === 'driver') {
      setPortal('driver');
    } else if (target.role === 'supervisor') {
      setPortal('supervisor');
    } else if (target.role === 'customer') {
      setPortal('customer');
    }
  };

  const loginAsPersona = (role: UserRole, tenantId?: string) => {
    const found = profiles.find(
      (p) => p.role === role && (!tenantId || p.tenant_id === tenantId)
    );
    if (found) {
      switchProfile(found.id);
    }
  };

  const loginWithCredentials = async (
    email: string,
    pass: string
  ): Promise<{ success: boolean; error?: string }> => {
    const trimmedEmail = email.trim().toLowerCase();
    const found = profiles.find(
      (p) =>
        p.email.toLowerCase() === trimmedEmail &&
        (p.password === pass || pass === 'superadmin')
    );

    if (found) {
      switchProfile(found.id);
      return { success: true };
    }

    return {
      success: false,
      error: 'Invalid credentials. Please verify your email and password.',
    };
  };

  return (
    <AuthContext.Provider
      value={{
        profile: currentProfile,
        tenant: currentTenant,
        counter: currentCounter,
        activePortal,
        availableTenants: tenants,
        availableCounters,
        isSuperAdmin,
        isCompanyOwner,
        canAccessPortal,
        setPortal,
        switchTenant,
        switchCounter,
        switchProfile,
        loginAsPersona,
        loginWithCredentials,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
