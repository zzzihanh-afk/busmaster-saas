import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { dbStore } from '../../services/dbStore';
import { TripStatus, Profile, Trip } from '../../types';
import {
  Truck,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  AlertTriangle,
  Plus,
  ShieldCheck,
  IdCard,
  Phone,
  Bus as BusIcon,
  Check,
  Calendar,
  AlertCircle,
  Compass,
  ArrowRight,
  Shield,
  FileText,
} from 'lucide-react';

export const DriverPortal: React.FC = () => {
  const { tenant, profile, isSuperAdmin, isCompanyOwner } = useAuth();
  const tenantId = tenant?.id || '';

  const [drivers, setDrivers] = useState<Profile[]>(
    dbStore.getProfilesByTenant(tenantId).filter((p) => p.role === 'driver')
  );
  const [selectedDriverId, setSelectedDriverId] = useState<string>(
    profile.role === 'driver' ? profile.id : drivers[0]?.id || ''
  );

  const [trips, setTrips] = useState<Trip[]>(dbStore.getTrips(tenantId));
  const buses = dbStore.getBuses(tenantId);
  const routes = dbStore.getRoutes(tenantId);

  // Modals state
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [showAssignBusModal, setShowAssignBusModal] = useState(false);
  const [showScheduleTripModal, setShowScheduleTripModal] = useState(false);

  // New Driver Form state
  const [newDriver, setNewDriver] = useState({
    full_name: '',
    phone: '',
    email: '',
    license_number: '',
    assigned_bus_id: buses[0]?.id || '',
  });

  // Assign Bus to Driver state
  const [selectedBusForDriver, setSelectedBusForDriver] = useState<string>(buses[0]?.id || '');

  // Schedule New Trip for Driver state
  const [newTripForDriver, setNewTripForDriver] = useState({
    route_id: routes[0]?.id || '',
    bus_id: buses[0]?.id || '',
    trip_code: '',
    departure_date: new Date().toISOString().split('T')[0],
    departure_time: '08:00',
    base_fare: 1400,
  });

  // Standby quick trip assignment dropdown
  const [tripToAssignId, setTripToAssignId] = useState<string>('');

  // Selected trip manifest to view
  const [selectedTripId, setSelectedTripId] = useState<string>('');

  // Boarding checklist state per passenger ticket
  const [boardedPassengers, setBoardedPassengers] = useState<Record<string, boolean>>({});

  // Pre-trip safety checklist
  const [safetyChecklist, setSafetyChecklist] = useState({
    licenseValid: true,
    brakesAndTires: true,
    emergencyEquipment: true,
    routeNavigation: true,
  });

  const isManagement =
    isSuperAdmin ||
    isCompanyOwner ||
    profile.role === 'company_admin';

  useEffect(() => {
    const unsub = dbStore.subscribe(() => {
      const updatedDrivers = dbStore.getProfilesByTenant(tenantId).filter((p) => p.role === 'driver');
      setDrivers(updatedDrivers);
      setTrips(dbStore.getTrips(tenantId));
    });
    return unsub;
  }, [tenantId]);

  // Keep selectedDriverId synchronized if list changes
  useEffect(() => {
    if (drivers.length > 0 && (!selectedDriverId || !drivers.find((d) => d.id === selectedDriverId))) {
      setSelectedDriverId(drivers[0].id);
    }
  }, [drivers, selectedDriverId]);

  const activeDriver =
    drivers.find((d) => d.id === selectedDriverId) ||
    drivers[0] ||
    (profile.role === 'driver' ? profile : null);

  // Find bus assigned to active driver
  const assignedBus = buses.find((b) => b.assigned_driver_id === activeDriver?.id);

  // Trips assigned to this driver
  const driverTrips = trips.filter((t) => t.driver_id === activeDriver?.id);

  // Active trip to display
  const activeTrip =
    trips.find((t) => t.id === selectedTripId) ||
    driverTrips[0] ||
    (driverTrips.length > 0 ? driverTrips[0] : null);

  const bookings = activeTrip
    ? dbStore.getBookings(tenantId).filter((b) => b.trip_id === activeTrip.id)
    : [];

  const handleUpdateStatus = (newStatus: TripStatus) => {
    if (!activeTrip) return;
    const updated = { ...activeTrip, status: newStatus };
    dbStore.saveTrip(updated);
    setTrips(dbStore.getTrips(tenantId));
  };

  const togglePassengerBoarded = (bookingId: string) => {
    setBoardedPassengers((prev) => ({
      ...prev,
      [bookingId]: !prev[bookingId],
    }));
  };

  // Add Bus Driver handler
  const handleCreateDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriver.full_name || !newDriver.phone) return;

    const generatedLicense =
      newDriver.license_number.trim() ||
      'BRTA-PROF-DL-' + Math.floor(100000 + Math.random() * 900000);

    const driverProfile: Profile = {
      id: 'p-drv-' + Date.now(),
      tenant_id: tenantId,
      full_name: newDriver.full_name.trim(),
      phone: newDriver.phone.trim(),
      email: newDriver.email.trim() || `driver.${Date.now()}@${tenant?.slug || 'operator'}.bd`,
      role: 'driver',
      license_number: generatedLicense,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    dbStore.saveProfile(driverProfile);

    // If bus assigned, link driver to bus
    if (newDriver.assigned_bus_id) {
      const targetBus = buses.find((b) => b.id === newDriver.assigned_bus_id);
      if (targetBus) {
        targetBus.assigned_driver_id = driverProfile.id;
        dbStore.saveBus(targetBus);
      }
    }

    dbStore.addAuditLog({
      tenant_id: tenantId,
      actor_id: profile.id,
      actor_name: profile.full_name,
      actor_role: profile.role,
      action: 'ADD_BUS_DRIVER',
      entity_type: 'DRIVER',
      entity_id: driverProfile.id,
      details: {
        driver_name: newDriver.full_name,
        license: driverProfile.license_number,
        bus_id: newDriver.assigned_bus_id,
      },
    });

    const updatedDrivers = dbStore.getProfilesByTenant(tenantId).filter((p) => p.role === 'driver');
    setDrivers(updatedDrivers);
    setSelectedDriverId(driverProfile.id);
    setShowAddDriverModal(false);
    setNewDriver({
      full_name: '',
      phone: '',
      email: '',
      license_number: '',
      assigned_bus_id: buses[0]?.id || '',
    });
  };

  // Assign Bus to Driver
  const handleAssignBus = (busId: string) => {
    if (!activeDriver) return;
    dbStore.assignDriverToBus(busId, activeDriver.id);
    setShowAssignBusModal(false);
  };

  // Quick assign driver to existing trip
  const handleAssignDriverToTrip = (tripId: string) => {
    if (!activeDriver || !tripId) return;
    dbStore.assignDriverToTrip(tripId, activeDriver.id);
    setSelectedTripId(tripId);
    setTripToAssignId('');
  };

  // Schedule new trip for driver
  const handleScheduleTripForDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDriver || !newTripForDriver.route_id || !newTripForDriver.bus_id) return;

    const route = routes.find((r) => r.id === newTripForDriver.route_id);
    const generatedCode =
      newTripForDriver.trip_code.trim() ||
      `${tenant?.slug?.substring(0, 3).toUpperCase() || 'TRP'}-${route?.origin_city.substring(0, 3).toUpperCase()}-${route?.destination_city.substring(0, 3).toUpperCase()}-${newTripForDriver.departure_time.replace(':', '')}`;

    const newTripObj: Trip = {
      id: 'trip-' + Date.now(),
      tenant_id: tenantId,
      route_id: newTripForDriver.route_id,
      bus_id: newTripForDriver.bus_id,
      driver_id: activeDriver.id,
      trip_code: generatedCode,
      departure_date: newTripForDriver.departure_date,
      departure_time: newTripForDriver.departure_time,
      base_fare: Number(newTripForDriver.base_fare) || 1200,
      status: 'scheduled',
      created_at: new Date().toISOString(),
    };

    dbStore.saveTrip(newTripObj);
    setSelectedTripId(newTripObj.id);
    setShowScheduleTripModal(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & CONSOLE CONTROLS */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-extrabold text-white">Driver Operations Console</h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20">
              BRTA Verified Transport Portal
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-slate-400 font-semibold">Viewing Driver:</span>
            {isManagement ? (
              <select
                value={selectedDriverId}
                onChange={(e) => {
                  setSelectedDriverId(e.target.value);
                  setSelectedTripId('');
                }}
                className="bg-slate-800 text-amber-300 font-bold rounded-lg px-3 py-1 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer text-xs"
              >
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name} ({d.phone}) {buses.some((b) => b.assigned_driver_id === d.id) ? '• Bus Assigned' : '• Standby'}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-white font-bold">{activeDriver?.full_name || profile.full_name}</span>
            )}

            <span className="text-slate-400">• Operator: {tenant?.name} ({tenant?.status?.toUpperCase()})</span>
            <span className="text-slate-400">• Total Drivers: <strong className="text-slate-200">{drivers.length}</strong></span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {isManagement && (
            <button
              onClick={() => setShowAddDriverModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow-md transition cursor-pointer"
              title="Register a new professional bus driver"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>Add Bus Driver</span>
            </button>
          )}

          <span className="text-xs px-3 py-1.5 rounded-xl font-bold bg-amber-950 text-amber-300 border border-amber-800">
            DRIVER CONSOLE
          </span>
        </div>
      </div>

      {/* 2. ACTIVE DRIVER CREDENTIALS & FLEET STATUS CARD (ALWAYS VISIBLE!) */}
      {activeDriver ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 flex items-center justify-center text-amber-700 dark:text-amber-300 font-black text-xl shadow-inner">
                {activeDriver.full_name.substring(0, 2).toUpperCase()}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {activeDriver.full_name}
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                    <ShieldCheck className="w-3 h-3" />
                    BRTA Verified Professional
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <span className="flex items-center gap-1 font-mono">
                    <IdCard className="w-3.5 h-3.5 text-slate-400" />
                    License: <strong className="text-slate-800 dark:text-slate-200">{activeDriver.license_number || 'BRTA-PROF-DL-2024'}</strong>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    Mobile: <strong className="text-slate-800 dark:text-slate-200">{activeDriver.phone || 'N/A'}</strong>
                  </span>
                  <span>•</span>
                  <span>Operator: <strong className="text-slate-800 dark:text-slate-200">{tenant?.name}</strong></span>
                </div>
              </div>
            </div>

            {/* Vehicle & Shift Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs">
                <span className="text-slate-400 block text-[10px] font-medium">Assigned Bus</span>
                {assignedBus ? (
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <BusIcon className="w-3.5 h-3.5 text-blue-500" />
                    {assignedBus.name} ({assignedBus.reg_no})
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Unassigned (Standby Pool)
                  </span>
                )}
              </div>

              {isManagement && (
                <button
                  onClick={() => setShowAssignBusModal(true)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  {assignedBus ? 'Change Vehicle' : 'Assign Bus'}
                </button>
              )}

              <div className="px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{activeTrip ? `ON DUTY: ${activeTrip.trip_code}` : 'STANDBY DUTY (Terminal Pool)'}</span>
              </div>
            </div>
          </div>

          {/* Pre-Trip Safety & Vehicle Inspection Checklist */}
          <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-3.5 border border-slate-100 dark:border-slate-700/60 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 block mb-2 text-[11px] uppercase tracking-wider">
              BRTA Pre-Shift Safety & Vehicle Readiness Check:
            </span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={safetyChecklist.licenseValid}
                  onChange={(e) => setSafetyChecklist({ ...safetyChecklist, licenseValid: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                />
                <span className="text-slate-600 dark:text-slate-300 text-[11px]">Commercial License Valid</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={safetyChecklist.brakesAndTires}
                  onChange={(e) => setSafetyChecklist({ ...safetyChecklist, brakesAndTires: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                />
                <span className="text-slate-600 dark:text-slate-300 text-[11px]">Brakes, Tires & Air Pressure</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={safetyChecklist.emergencyEquipment}
                  onChange={(e) => setSafetyChecklist({ ...safetyChecklist, emergencyEquipment: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                />
                <span className="text-slate-600 dark:text-slate-300 text-[11px]">Fire Extinguisher & First-Aid</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={safetyChecklist.routeNavigation}
                  onChange={(e) => setSafetyChecklist({ ...safetyChecklist, routeNavigation: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                />
                <span className="text-slate-600 dark:text-slate-300 text-[11px]">Highway GPS & Route Sync</span>
              </label>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
          <span>No drivers registered for this company yet. Click &quot;Add Bus Driver&quot; above to register your first professional driver.</span>
          <button
            onClick={() => setShowAddDriverModal(true)}
            className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-lg"
          >
            + Add First Driver
          </button>
        </div>
      )}

      {/* 3. TRIP MANIFEST OR STANDBY DISPATCH CENTER */}
      {activeTrip ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
          {/* Trip Summary Card */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="space-y-0.5">
                <span className="font-bold text-sm text-slate-900 dark:text-white block">
                  Trip Manifest: {activeTrip.trip_code}
                </span>
                <span className="text-[10px] text-slate-400">Departure: {activeTrip.departure_date}</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 uppercase">
                {activeTrip.status}
              </span>
            </div>

            {/* Trip Switcher if Multiple exist */}
            {trips.length > 1 && (
              <div>
                <label className="text-[10px] text-slate-400 block font-semibold mb-1">
                  Switch Active Manifest:
                </label>
                <select
                  value={activeTrip.id}
                  onChange={(e) => setSelectedTripId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-800 dark:text-slate-200"
                >
                  {trips.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.trip_code} • {t.route?.origin_city} ➔ {t.route?.destination_city} ({t.departure_time})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Assigned Driver:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {activeDriver?.full_name || 'Assigned Driver'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">BRTA License:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {activeDriver?.license_number || 'BRTA-PROF-DL-2024'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Route:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {activeTrip.route?.origin_city} ➔ {activeTrip.route?.destination_city}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Scheduled Departure:</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{activeTrip.departure_time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Assigned Vehicle:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {activeTrip.bus?.name || 'Bus not assigned'} ({activeTrip.bus?.reg_no || 'N/A'})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Booked Passengers:</span>
                <span className="font-bold text-emerald-600 font-mono text-sm">
                  {bookings.reduce((sum, b) => sum + b.seat_count, 0)} Seats
                </span>
              </div>
            </div>

            {/* Quick Status Changers */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 space-y-2">
              <span className="font-semibold block text-slate-700 dark:text-slate-300">
                Update Live Trip State
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleUpdateStatus('boarding')}
                  className="py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold shadow cursor-pointer transition text-xs"
                >
                  Start Boarding
                </button>
                <button
                  onClick={() => handleUpdateStatus('in_transit')}
                  className="py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold shadow cursor-pointer transition text-xs"
                >
                  Departed / In Transit
                </button>
                <button
                  onClick={() => handleUpdateStatus('delayed')}
                  className="py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold shadow cursor-pointer transition text-xs"
                >
                  Highway Delay
                </button>
                <button
                  onClick={() => handleUpdateStatus('completed')}
                  className="py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded font-bold shadow cursor-pointer transition text-xs"
                >
                  Arrived / Completed
                </button>
              </div>
            </div>
          </div>

          {/* Passenger Checklist */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                <span>Authorized Passenger List ({bookings.length} Bookings)</span>
              </h2>
              <span className="text-[11px] text-slate-500">
                Boarded: {Object.values(boardedPassengers).filter(Boolean).length} / {bookings.length}
              </span>
            </div>

            {bookings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase font-semibold text-[10px] border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">Boarded</th>
                      <th className="py-2.5 px-3">Seat</th>
                      <th className="py-2.5 px-3">Passenger</th>
                      <th className="py-2.5 px-3">Mobile Contact</th>
                      <th className="py-2.5 px-3">Boarding Point</th>
                      <th className="py-2.5 px-3">Dropping Point</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {bookings.map((b) => (
                      <tr
                        key={b.id}
                        className={`hover:bg-slate-50/50 dark:hover:bg-slate-700/30 ${
                          boardedPassengers[b.id] ? 'bg-emerald-50/30 dark:bg-emerald-950/20' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          <button
                            onClick={() => togglePassengerBoarded(b.id)}
                            className={`w-6 h-6 rounded flex items-center justify-center transition cursor-pointer ${
                              boardedPassengers[b.id]
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-400 hover:bg-slate-300'
                            }`}
                            title="Toggle Boarding Status"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1 font-mono font-bold text-xs">
                            {b.seats?.map((s) => (
                              <span
                                key={s.seat_number}
                                className={`px-1.5 py-0.5 rounded text-[10px] ${
                                  s.seat_type === 'sleeper'
                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                                    : s.seat_type === 'disabled'
                                    ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 ring-1 ring-teal-400'
                                    : s.seat_type === 'female'
                                    ? 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300'
                                    : s.seat_type === 'premium'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'text-blue-600 bg-blue-50 dark:bg-blue-950/40'
                                }`}
                                title={`Seat ${s.seat_number}: ${s.seat_type || 'regular'}`}
                              >
                                {s.seat_number}
                                {s.seat_type === 'sleeper' && ' 🛏️'}
                                {s.seat_type === 'disabled' && ' ♿'}
                              </span>
                            )) || <span className="text-slate-400">N/A</span>}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          {b.passenger_name}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">
                          <a href={`tel:${b.passenger_phone}`} className="hover:underline text-blue-600">
                            {b.passenger_phone}
                          </a>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                          {b.boarding_point || b.from_stop_name}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                          {b.dropping_point || b.to_stop_name}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <Users className="w-8 h-8 text-slate-300 mx-auto" />
                <p>No confirmed passenger bookings yet for this departure.</p>
                <p className="text-[11px] text-slate-500">Counter agents can book seats in the Counter POS terminal.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* STANDBY DUTY / READY FOR DISPATCH CENTER */
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold mt-0.5">
                <Clock className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Driver Shift: Standby Pool - Ready for Trip Assignment
                </h3>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                  Driver <strong>{activeDriver?.full_name}</strong> is registered and active on standby duty.
                  Assign this driver to an upcoming scheduled trip, or schedule an immediate departure below.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowScheduleTripModal(true)}
                className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold rounded-xl text-xs shadow transition cursor-pointer whitespace-nowrap"
              >
                + Schedule Trip for {activeDriver?.full_name?.split(' ')[0]}
              </button>
            </div>
          </div>

          {/* Quick Assign to Scheduled Trips */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 space-y-3">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-2">
                <Compass className="w-4 h-4 text-blue-500" />
                Assign to Existing Scheduled Trip
              </h4>
              <p className="text-[11px] text-slate-500">
                Select an upcoming departure from {tenant?.name}&apos;s schedule and link this driver:
              </p>

              {trips.length > 0 ? (
                <div className="flex items-center gap-2">
                  <select
                    value={tripToAssignId}
                    onChange={(e) => setTripToAssignId(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">-- Choose Upcoming Trip --</option>
                    {trips.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.trip_code} • {t.route?.origin_city} ➔ {t.route?.destination_city} ({t.departure_time})
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={!tripToAssignId}
                    onClick={() => handleAssignDriverToTrip(tripToAssignId)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition cursor-pointer"
                  >
                    Assign &amp; Open
                  </button>
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 py-1">
                  No trips currently registered for {tenant?.name}. Use the button on the right to schedule the first trip!
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 space-y-3">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-500" />
                Dispatch New Direct Route
              </h4>
              <p className="text-[11px] text-slate-500">
                Create a new trip code and assign {activeDriver?.full_name} as the pilot captain:
              </p>

              <button
                onClick={() => setShowScheduleTripModal(true)}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Dispatch Scheduled Trip</span>
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. COMPANY REGISTERED DRIVERS ROSTER TABLE (ALWAYS DISPLAYED) */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-500" />
              <span>Registered Bus Drivers Roster — {tenant?.name} ({drivers.length} Drivers)</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Professional transport crew licensed under BRTA regulations and assigned to {tenant?.name}
            </p>
          </div>

          {isManagement && (
            <button
              onClick={() => setShowAddDriverModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded-lg text-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Driver</span>
            </button>
          )}
        </div>

        {drivers.length > 0 ? (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase font-semibold text-[10px] border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Driver Name</th>
                  <th className="py-2.5 px-3">Contact Phone</th>
                  <th className="py-2.5 px-3">BRTA License</th>
                  <th className="py-2.5 px-3">Assigned Bus</th>
                  <th className="py-2.5 px-3">Shift Duty Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {drivers.map((drv) => {
                  const driverBus = buses.find((b) => b.assigned_driver_id === drv.id);
                  const activeDriverTrip = trips.find((t) => t.driver_id === drv.id);
                  const isCurrent = drv.id === activeDriver?.id;

                  return (
                    <tr
                      key={drv.id}
                      className={`hover:bg-slate-50/60 dark:hover:bg-slate-700/30 ${
                        isCurrent ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 text-xs">
                            {drv.full_name.substring(0, 1)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">
                              {drv.full_name}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                                Currently Selected
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                        {drv.phone || 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                        {drv.license_number || 'BRTA-PROF-DL-2024'}
                      </td>
                      <td className="py-2.5 px-3">
                        {driverBus ? (
                          <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                            <BusIcon className="w-3.5 h-3.5 text-blue-500" />
                            {driverBus.name} ({driverBus.reg_no})
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">None (Standby Pool)</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {activeDriverTrip ? (
                          <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            On Transit ({activeDriverTrip.trip_code})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            Standby Pool
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedDriverId(drv.id);
                              setSelectedTripId('');
                            }}
                            className={`px-2.5 py-1 rounded font-bold text-[11px] cursor-pointer transition ${
                              isCurrent
                                ? 'bg-amber-500 text-slate-950 shadow-sm'
                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {isCurrent ? 'Active View' : 'Select Console'}
                          </button>

                          {isManagement && (
                            <button
                              onClick={() => {
                                setSelectedDriverId(drv.id);
                                setShowAssignBusModal(true);
                              }}
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-[11px] cursor-pointer"
                              title="Assign Bus to this driver"
                            >
                              Assign Bus
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400">
            No drivers registered yet. Click &quot;Add Bus Driver&quot; to onboard drivers for {tenant?.name}.
          </div>
        )}
      </div>

      {/* MODAL 1: ADD BUS DRIVER */}
      {showAddDriverModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 text-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-amber-500" />
              Register Professional Bus Driver
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Authorized for Super Admin and Company Administrators for {tenant?.name}
            </p>

            <form onSubmit={handleCreateDriver} className="mt-4 space-y-3">
              <div>
                <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                  Driver Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Md. Jahangir Alam"
                  value={newDriver.full_name}
                  onChange={(e) => setNewDriver({ ...newDriver, full_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+880 1712-..."
                    value={newDriver.phone}
                    onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                    BRTA License Number
                  </label>
                  <input
                    type="text"
                    placeholder="BRTA-PROF-DL-..."
                    value={newDriver.license_number}
                    onChange={(e) => setNewDriver({ ...newDriver, license_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  placeholder="driver@transport.bd"
                  value={newDriver.email}
                  onChange={(e) => setNewDriver({ ...newDriver, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                  Assign Initial Fleet Bus
                </label>
                <select
                  value={newDriver.assigned_bus_id}
                  onChange={(e) => setNewDriver({ ...newDriver, assigned_bus_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold focus:outline-none"
                >
                  <option value="">None (Terminal Standby Pool)</option>
                  {buses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.reg_no})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddDriverModal(false)}
                  className="px-3.5 py-1.5 font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold rounded-lg shadow cursor-pointer"
                >
                  Register Driver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ASSIGN BUS TO DRIVER */}
      {showAssignBusModal && activeDriver && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 text-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BusIcon className="w-5 h-5 text-blue-500" />
              Assign Vehicle to {activeDriver.full_name}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Select one of {tenant?.name}&apos;s buses to link to this pilot captain.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                  Choose Bus:
                </label>
                <select
                  value={selectedBusForDriver}
                  onChange={(e) => setSelectedBusForDriver(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold focus:outline-none"
                >
                  {buses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.reg_no})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAssignBusModal(false)}
                  className="px-3.5 py-1.5 font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleAssignBus(selectedBusForDriver)}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow cursor-pointer"
                >
                  Confirm Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: SCHEDULE & DISPATCH TRIP FOR DRIVER */}
      {showScheduleTripModal && activeDriver && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 text-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-amber-500" />
              Schedule &amp; Dispatch Trip for {activeDriver.full_name}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Create an operational trip manifest and assign {activeDriver.full_name} as the pilot captain.
            </p>

            <form onSubmit={handleScheduleTripForDriver} className="mt-4 space-y-3">
              <div>
                <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                  Select Highway Route *
                </label>
                <select
                  value={newTripForDriver.route_id}
                  onChange={(e) => setNewTripForDriver({ ...newTripForDriver, route_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold focus:outline-none"
                  required
                >
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.origin_city} ➔ {r.destination_city} ({r.distance_km || 250} km)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                  Select Assigned Bus *
                </label>
                <select
                  value={newTripForDriver.bus_id}
                  onChange={(e) => setNewTripForDriver({ ...newTripForDriver, bus_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold focus:outline-none"
                  required
                >
                  {buses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.reg_no})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                    Departure Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newTripForDriver.departure_date}
                    onChange={(e) => setNewTripForDriver({ ...newTripForDriver, departure_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                    Departure Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={newTripForDriver.departure_time}
                    onChange={(e) => setNewTripForDriver({ ...newTripForDriver, departure_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                    Base Fare (৳ BDT) *
                  </label>
                  <input
                    type="number"
                    min="100"
                    required
                    value={newTripForDriver.base_fare}
                    onChange={(e) => setNewTripForDriver({ ...newTripForDriver, base_fare: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                    Custom Trip Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SH-DHK-CTG-0800"
                    value={newTripForDriver.trip_code}
                    onChange={(e) => setNewTripForDriver({ ...newTripForDriver, trip_code: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowScheduleTripModal(false)}
                  className="px-3.5 py-1.5 font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold rounded-lg shadow cursor-pointer"
                >
                  Dispatch Trip Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
