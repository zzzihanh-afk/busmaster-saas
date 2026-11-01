import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../auth/AuthContext';
import { dbStore } from '../../services/dbStore';
import { CashSession, Booking, Bus, Trip, Profile, TripStatus } from '../../types';
import {
  DollarSign,
  UserCheck,
  Receipt,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Clock,
  Search,
  XCircle,
  Bus as BusIcon,
  Truck,
  MapPin,
  Users,
  Phone,
  Navigation,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  FileText,
  Check,
  ChevronDown,
  Filter,
  Calendar,
  X,
  Printer,
  Sparkles,
  Radio,
  Activity,
  Wrench,
  Gauge,
  CheckCircle2,
} from 'lucide-react';

export const CounterManagerPortal: React.FC = () => {
  const { tenant, counter, profile } = useAuth();
  const tenantId = tenant?.id || 't-greenline-01';

  const sessions = dbStore.getCashSessions(tenantId);
  const activeSession = sessions.find(
    (s) => s.counter_id === counter?.id && s.status === 'open'
  );

  const [allBookings, setAllBookings] = useState<Booking[]>(() => dbStore.getBookings(tenantId));
  const [buses, setBuses] = useState<Bus[]>(() => dbStore.getBuses(tenantId));
  const [trips, setTrips] = useState<Trip[]>(() => dbStore.getTrips(tenantId));
  const [drivers, setDrivers] = useState<Profile[]>(() =>
    dbStore.getProfilesByTenant(tenantId).filter((p) => p.role === 'driver')
  );

  // Fleet & Bus State Monitor State
  const [busFilterQuery, setBusFilterQuery] = useState('');
  const [busStateFilter, setBusStateFilter] = useState<'all' | 'in_transit' | 'boarding' | 'scheduled' | 'delayed' | 'maintenance'>('all');
  const [manifestTrip, setManifestTrip] = useState<Trip | null>(null);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  // Active View Tab: 'all' | 'buses' | 'cash' | 'refunds'
  const [activeTab, setActiveTab] = useState<'all' | 'buses' | 'cash' | 'refunds'>('all');

  useEffect(() => {
    const unsub = dbStore.subscribe(() => {
      setAllBookings(dbStore.getBookings(tenantId));
      setBuses(dbStore.getBuses(tenantId));
      setTrips(dbStore.getTrips(tenantId));
      setDrivers(dbStore.getProfilesByTenant(tenantId).filter((p) => p.role === 'driver'));
    });
    return () => unsub();
  }, [tenantId]);

  const bookings = allBookings.filter((b) => b.counter_id === counter?.id);
  const pendingCancellations = allBookings.filter((b) => b.ticket_status === 'cancellation_requested');
  const todayRevenue = bookings.reduce((sum, b) => sum + (b.total_payable || 0), 0);

  // Cash Session State
  const [openingBalance, setOpeningBalance] = useState<number>(5000);
  const [closingPhysicalCash, setClosingPhysicalCash] = useState<number>(0);
  const [sessionNotes, setSessionNotes] = useState('');

  // Cancellation State
  const [searchRef, setSearchRef] = useState('');
  const [foundBooking, setFoundBooking] = useState<Booking | null>(bookings[0] || null);
  const [cancelReason, setCancelReason] = useState('Passenger personal emergency');
  const [refundResult, setRefundResult] = useState<{ amount: number } | null>(null);

  // Fleet Metrics calculations
  const inTransitCount = trips.filter((t) => t.status === 'in_transit').length;
  const boardingCount = trips.filter((t) => t.status === 'boarding').length;
  const delayedCount = trips.filter((t) => t.status === 'delayed').length;
  const scheduledCount = trips.filter((t) => t.status === 'scheduled').length;
  const maintenanceCount = buses.filter((b) => b.status === 'maintenance').length;
  const activeBusesCount = buses.filter((b) => b.status === 'active').length;

  const getBusTrip = (busId: string): Trip | undefined => {
    const busTrips = trips.filter((t) => t.bus_id === busId);
    return (
      busTrips.find((t) => t.status === 'in_transit' || t.status === 'boarding' || t.status === 'delayed') ||
      busTrips.find((t) => t.status === 'scheduled') ||
      busTrips[0]
    );
  };

  const getBusDriver = (bus: Bus, trip?: Trip): Profile | undefined => {
    if (trip?.driver_id) {
      const match = drivers.find((d) => d.id === trip.driver_id);
      if (match) return match;
    }
    if (bus.assigned_driver_id) {
      const match = drivers.find((d) => d.id === bus.assigned_driver_id);
      if (match) return match;
    }
    return drivers[0];
  };

  const getTripOccupancy = (trip?: Trip, totalCapacity = 36) => {
    if (!trip) return { bookedCount: 0, capacity: totalCapacity, pct: 0, availableCount: totalCapacity };
    const tripBookings = allBookings.filter(
      (b) => b.trip_id === trip.id && b.ticket_status !== 'cancelled'
    );
    const bookedCount = tripBookings.reduce((sum, b) => sum + (b.seats?.length || 1), 0);
    const capacity = trip.bus?.total_capacity || totalCapacity;
    const pct = Math.min(100, Math.round((bookedCount / capacity) * 100));
    const availableCount = Math.max(0, capacity - bookedCount);
    return { bookedCount, capacity, pct, availableCount };
  };

  const handleUpdateTripStatus = (tripId: string, newStatus: TripStatus) => {
    const targetTrip = trips.find((t) => t.id === tripId);
    if (!targetTrip) return;
    const updatedTrip: Trip = { ...targetTrip, status: newStatus };
    dbStore.saveTrip(updatedTrip);
    setTrips(dbStore.getTrips(tenantId));
    setStatusNotification(`Bus trip ${targetTrip.trip_code} status updated to: ${newStatus.toUpperCase()}`);
    setTimeout(() => setStatusNotification(null), 3500);
  };

  const handleToggleBusMaintenance = (busId: string, currentStatus: string) => {
    const targetBus = buses.find((b) => b.id === busId);
    if (!targetBus) return;
    const newStatus = currentStatus === 'maintenance' ? 'active' : 'maintenance';
    const updatedBus = { ...targetBus, status: newStatus as any };
    dbStore.saveBus(updatedBus);
    setBuses(dbStore.getBuses(tenantId));
    setStatusNotification(
      `Coach ${targetBus.name} marked as ${newStatus === 'maintenance' ? 'UNDER MAINTENANCE' : 'ACTIVE IN FLEET'}`
    );
    setTimeout(() => setStatusNotification(null), 3500);
  };

  const filteredBuses = buses.filter((bus) => {
    const trip = getBusTrip(bus.id);
    const driver = getBusDriver(bus, trip);
    const query = busFilterQuery.trim().toLowerCase();

    if (query) {
      const matchName = bus.name.toLowerCase().includes(query);
      const matchReg = bus.reg_no.toLowerCase().includes(query);
      const matchTripCode = trip?.trip_code.toLowerCase().includes(query);
      const matchRoute =
        trip?.route?.origin_city.toLowerCase().includes(query) ||
        trip?.route?.destination_city.toLowerCase().includes(query);
      const matchDriver = driver?.full_name.toLowerCase().includes(query);
      if (!matchName && !matchReg && !matchTripCode && !matchRoute && !matchDriver) {
        return false;
      }
    }

    if (busStateFilter === 'all') return true;
    if (busStateFilter === 'maintenance') return bus.status === 'maintenance';
    if (busStateFilter === 'in_transit') return trip?.status === 'in_transit';
    if (busStateFilter === 'boarding') return trip?.status === 'boarding';
    if (busStateFilter === 'scheduled') return trip?.status === 'scheduled';
    if (busStateFilter === 'delayed') return trip?.status === 'delayed';

    return true;
  });

  const renderTripStateBadge = (status?: TripStatus, busTechnicalStatus?: string) => {
    if (busTechnicalStatus === 'maintenance') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1.5 shadow-xs">
          <Wrench className="w-3.5 h-3.5" />
          <span>Under Maintenance</span>
        </span>
      );
    }

    if (!status) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>Depot Standby</span>
        </span>
      );
    }

    switch (status) {
      case 'in_transit':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5 shadow-xs animate-pulse">
            <Truck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>On Highway / In Transit</span>
          </span>
        );
      case 'boarding':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800 flex items-center gap-1.5 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-ping" />
            <span>Boarding at Platform</span>
          </span>
        );
      case 'delayed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1.5 shadow-xs">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Highway Delay Notice</span>
          </span>
        );
      case 'scheduled':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Scheduled Departure</span>
          </span>
        );
      case 'arrived':
      case 'completed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>Trip Arrived &amp; Completed</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {status}
          </span>
        );
    }
  };

  const handleOpenSession = (e: React.FormEvent) => {
    e.preventDefault();
    const newSession: CashSession = {
      id: 'cs-' + Date.now(),
      tenant_id: tenantId,
      counter_id: counter?.id || 'cnt-gl-01',
      opened_by: profile.id,
      opened_at: new Date().toISOString(),
      opening_balance: Number(openingBalance),
      cash_collected: 0,
      cash_refunded: 0,
      expected_balance: Number(openingBalance),
      status: 'open',
      notes: sessionNotes || 'Regular shift session',
    };
    dbStore.saveCashSession(newSession);
    setSessionNotes('');
  };

  const handleCloseSession = () => {
    if (!activeSession) return;
    const expected =
      activeSession.opening_balance + activeSession.cash_collected - activeSession.cash_refunded;
    const discrepancy = closingPhysicalCash - expected;

    activeSession.closed_by = profile.id;
    activeSession.closed_at = new Date().toISOString();
    activeSession.closing_balance = closingPhysicalCash;
    activeSession.expected_balance = expected;
    activeSession.discrepancy = discrepancy;
    activeSession.status = 'closed';

    dbStore.saveCashSession(activeSession);
    alert(
      `Session closed successfully!\nExpected Cash: ৳${expected}\nPhysical Count: ৳${closingPhysicalCash}\nDiscrepancy: ৳${discrepancy}`
    );
  };

  const handleSearchBooking = () => {
    const res = dbStore.getBookingByRef(searchRef);
    if (res) {
      setFoundBooking(res);
      setRefundResult(null);
    } else {
      alert('Booking not found with reference: ' + searchRef);
    }
  };

  const handleAcceptCancellation = (bookingId: string) => {
    const res = dbStore.acceptBookingCancellation(bookingId, profile.full_name, counter?.id);
    if (res.success) {
      setRefundResult({ amount: res.refundAmount });
      if (foundBooking && foundBooking.id === bookingId) {
        setFoundBooking(dbStore.getBookingByRef(foundBooking.booking_ref) || null);
      }
    } else {
      alert(res.error || 'Failed to accept cancellation');
    }
  };

  const handleRejectCancellation = (bookingId: string) => {
    const res = dbStore.rejectBookingCancellation(bookingId, 'Counter manager rejected cancellation request', profile.full_name);
    if (res.success) {
      alert('Cancellation request rejected.');
      if (foundBooking && foundBooking.id === bookingId) {
        setFoundBooking(dbStore.getBookingByRef(foundBooking.booking_ref) || null);
      }
    } else {
      alert(res.error || 'Failed to reject cancellation');
    }
  };

  const handleCancelBooking = () => {
    if (!foundBooking) return;
    if (
      window.confirm(
        `Are you sure you want to cancel booking ${foundBooking.booking_ref} for ${foundBooking.passenger_name}?`
      )
    ) {
      const res = dbStore.cancelBooking(foundBooking.id, cancelReason, profile.id);
      if (res.success) {
        setRefundResult({ amount: res.refundAmount });
        setFoundBooking(dbStore.getBookingByRef(foundBooking.booking_ref) || null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* COUNTER MANAGER HEADER CARD */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Counter Operations &amp; Bus Fleet Monitor
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Station: <span className="font-bold text-slate-800 dark:text-slate-200">{counter?.name || 'Central Terminal Counter'}</span> • Counter Code: <span className="font-mono font-bold text-blue-600">{counter?.code || 'CNT-01'}</span> • Operator: <span className="font-bold text-slate-800 dark:text-slate-200">{tenant?.name}</span>
          </p>
        </div>

        {/* View Selection Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <span>All Operations</span>
          </button>
          <button
            onClick={() => setActiveTab('buses')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'buses'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <BusIcon className="w-3.5 h-3.5" />
            <span>Bus State Monitor ({buses.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('cash')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'cash'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Cash Drawer</span>
          </button>
          <button
            onClick={() => setActiveTab('refunds')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'refunds'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Cancellations</span>
            {pendingCancellations.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-mono">
                {pendingCancellations.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* REAL-TIME NOTIFICATION BANNER */}
      {statusNotification && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 rounded-xl text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-semibold">{statusNotification}</span>
        </div>
      )}

      {/* OPERATIONAL FLEET & BUS STATE METRICS BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
            <BusIcon className="w-3.5 h-3.5 text-blue-500" />
            Total Fleet
          </span>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">
            {buses.length}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold">
            {activeBusesCount} Active / {maintenanceCount} Maint.
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
            <Truck className="w-3.5 h-3.5 text-emerald-500" />
            On Highway
          </span>
          <div className="text-xl font-extrabold text-emerald-600 font-mono">
            {inTransitCount}
          </div>
          <span className="text-[11px] text-slate-500">
            In Transit departures
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-blue-500" />
            Boarding Now
          </span>
          <div className="text-xl font-extrabold text-blue-600 font-mono">
            {boardingCount}
          </div>
          <span className="text-[11px] text-blue-500 font-medium">
            Terminal platform
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            Scheduled
          </span>
          <div className="text-xl font-extrabold text-indigo-600 font-mono">
            {scheduledCount}
          </div>
          <span className="text-[11px] text-slate-500">
            Bay standby
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Highway Delays
          </span>
          <div className="text-xl font-extrabold text-amber-500 font-mono">
            {delayedCount}
          </div>
          <span className="text-[11px] text-amber-600 font-medium">
            Traffic notices
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
            <Receipt className="w-3.5 h-3.5 text-emerald-500" />
            Today's Till
          </span>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">
            ৳{todayRevenue.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500">
            Counter Sales
          </span>
        </div>
      </div>

      {/* 1. LIVE FLEET & BUS OPERATIONAL STATE MONITOR (CORE USER REQUEST) */}
      {(activeTab === 'all' || activeTab === 'buses') && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <BusIcon className="w-5 h-5 text-blue-600" />
                Live Bus Fleet &amp; Trip Operational State Monitor
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Counter manager radar: inspect real-time departure states, driver assignments, highway delay notices, and passenger occupancy.
              </p>
            </div>

            {/* Filter pills */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              {[
                { id: 'all', label: `All (${buses.length})` },
                { id: 'in_transit', label: `On Highway (${inTransitCount})` },
                { id: 'boarding', label: `Boarding (${boardingCount})` },
                { id: 'scheduled', label: `Scheduled (${scheduledCount})` },
                { id: 'delayed', label: `Delayed (${delayedCount})` },
                { id: 'maintenance', label: `Maint. (${maintenanceCount})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setBusStateFilter(tab.id as any)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer text-[11px] ${
                    busStateFilter === tab.id
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search fleet by coach model, license plate (e.g. 11-2024), route destination, or driver..."
              value={busFilterQuery}
              onChange={(e) => setBusFilterQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
            />
            {busFilterQuery && (
              <button
                onClick={() => setBusFilterQuery('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Coach Fleet Cards Grid */}
          {filteredBuses.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <BusIcon className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">No coaches found matching criteria</h3>
              <p className="text-xs text-slate-500">
                Try resetting your search query or switching the status filter tab above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredBuses.map((bus) => {
                const trip = getBusTrip(bus.id);
                const driver = getBusDriver(bus, trip);
                const occ = getTripOccupancy(trip, bus.total_capacity);

                return (
                  <div
                    key={bus.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-blue-400 dark:hover:border-blue-500 transition overflow-hidden flex flex-col justify-between"
                  >
                    {/* Bus Card Header */}
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/30 flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <BusIcon className="w-4 h-4 text-blue-600 shrink-0" />
                          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                            {bus.name}
                          </h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {/* License Plate box */}
                          <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 font-mono font-bold text-[11px] text-amber-900 dark:text-amber-200 shadow-2xs">
                            {bus.reg_no}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                            {bus.bus_type}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Cap: {bus.total_capacity} Seats
                          </span>
                        </div>
                      </div>

                      {/* State Badge */}
                      <div className="shrink-0">
                        {renderTripStateBadge(trip?.status, bus.status)}
                      </div>
                    </div>

                    {/* Bus Card Content */}
                    <div className="p-4 space-y-3.5 text-xs flex-1">
                      {/* Trip & Route Details */}
                      {trip ? (
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
                              #{trip.trip_code}
                            </span>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1 font-semibold">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {trip.departure_time} Today
                            </span>
                          </div>

                          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs">
                            <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span>{trip.route?.origin_city || 'Origin'}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>{trip.route?.destination_city || 'Destination'}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-slate-400 text-xs italic">
                          No trip departure scheduled for today. Coach is on depot standby.
                        </div>
                      )}

                      {/* Assigned Driver on Duty */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                            Assigned Driver Crew
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {driver?.full_name || 'Standby Driver Pool'}
                          </span>
                          {driver?.license_number && (
                            <span className="text-[10px] text-slate-400 block font-mono">
                              BRTA: {driver.license_number}
                            </span>
                          )}
                        </div>

                        {driver?.phone && (
                          <a
                            href={`tel:${driver.phone}`}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[11px] font-bold flex items-center gap-1 hover:bg-emerald-100 transition shadow-xs"
                            title="Call Driver Crew"
                          >
                            <Phone className="w-3 h-3" />
                            <span>Call Driver</span>
                          </a>
                        )}
                      </div>

                      {/* Seat Occupancy Progress Bar */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                            <Gauge className="w-3.5 h-3.5 text-blue-500" />
                            Seat Occupancy:
                          </span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {occ.bookedCount} / {occ.capacity} Seats ({occ.pct}%)
                          </span>
                        </div>

                        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              occ.pct >= 90
                                ? 'bg-rose-500'
                                : occ.pct >= 60
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${occ.pct}%` }}
                          />
                        </div>

                        <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                          <span>{occ.availableCount} seats available for counter sale</span>
                          <span>{occ.bookedCount} confirmed passengers</span>
                        </div>
                      </div>
                    </div>

                    {/* Bus Card Footer: State Changer Actions */}
                    <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/40 space-y-2.5">
                      {trip ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            <span className="flex items-center gap-1">
                              <Radio className="w-3 h-3 text-blue-500" />
                              Update Trip State:
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              Current: <strong className="uppercase font-mono text-blue-600">{trip.status}</strong>
                            </span>
                          </div>

                          <div className="grid grid-cols-4 gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateTripStatus(trip.id, 'boarding')}
                              className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition cursor-pointer text-center ${
                                trip.status === 'boarding'
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-blue-50'
                              }`}
                            >
                              Boarding
                            </button>

                            <button
                              type="button"
                              onClick={() => handleUpdateTripStatus(trip.id, 'in_transit')}
                              className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition cursor-pointer text-center ${
                                trip.status === 'in_transit'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50'
                              }`}
                            >
                              In Transit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleUpdateTripStatus(trip.id, 'delayed')}
                              className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition cursor-pointer text-center ${
                                trip.status === 'delayed'
                                  ? 'bg-amber-600 text-white shadow-xs'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-amber-50'
                              }`}
                            >
                              Delay
                            </button>

                            <button
                              type="button"
                              onClick={() => handleUpdateTripStatus(trip.id, 'completed')}
                              className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition cursor-pointer text-center ${
                                trip.status === 'completed' || trip.status === 'arrived'
                                  ? 'bg-slate-800 text-white shadow-xs'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              Arrived
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {/* Secondary Buttons: Passenger Manifest & Maintenance */}
                      <div className="flex items-center gap-2 pt-1">
                        {trip ? (
                          <button
                            type="button"
                            onClick={() => setManifestTrip(trip)}
                            className="flex-1 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Passenger Manifest ({occ.bookedCount})</span>
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => handleToggleBusMaintenance(bus.id, bus.status)}
                          className={`py-1.5 px-2.5 rounded-lg text-[11px] font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                            bus.status === 'maintenance'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                          }`}
                        >
                          <Wrench className="w-3 h-3" />
                          <span>{bus.status === 'maintenance' ? 'Reactivate Coach' : 'Mark Maintenance'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. CASH DRAWER & CANCELLATIONS SECTION */}
      {(activeTab === 'all' || activeTab === 'cash' || activeTab === 'refunds') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CASH DRAWER RECONCILIATION */}
          {(activeTab === 'all' || activeTab === 'cash') && (
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Cash Drawer Session &amp; Shift Reconciliation
                </h2>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    activeSession
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  {activeSession ? 'SESSION OPEN' : 'SESSION CLOSED'}
                </span>
              </div>

              {activeSession ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Opening Float</span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                        ৳{activeSession.opening_balance.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Cash Received (Sales)</span>
                      <span className="font-bold text-emerald-600 font-mono text-sm">
                        +৳{activeSession.cash_collected.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Cash Refunds Paid</span>
                      <span className="font-bold text-rose-600 font-mono text-sm">
                        -৳{activeSession.cash_refunded.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Expected Cash in Till</span>
                      <span className="font-bold text-blue-600 font-mono text-sm">
                        ৳{(activeSession.opening_balance + activeSession.cash_collected - activeSession.cash_refunded).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                      Physical Cash Count at Shift End (৳)
                    </label>
                    <input
                      type="number"
                      placeholder="Enter counted physical notes"
                      value={closingPhysicalCash || ''}
                      onChange={(e) => setClosingPhysicalCash(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono text-sm focus:outline-none"
                    />
                  </div>

                  <button
                    onClick={handleCloseSession}
                    className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg shadow transition cursor-pointer"
                  >
                    Close &amp; Reconcile Shift Session
                  </button>
                </div>
              ) : (
                <form onSubmit={handleOpenSession} className="space-y-3">
                  <div>
                    <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                      Opening Cash Float (৳)
                    </label>
                    <input
                      type="number"
                      required
                      value={openingBalance}
                      onChange={(e) => setOpeningBalance(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                      Session Notes
                    </label>
                    <input
                      type="text"
                      placeholder="Morning shift opening notes..."
                      value={sessionNotes}
                      onChange={(e) => setSessionNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow transition cursor-pointer"
                  >
                    Open Morning Cash Drawer
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TICKET CANCELLATIONS & REFUND APPROVAL */}
          {(activeTab === 'all' || activeTab === 'refunds') && (
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-amber-500" />
                  Ticket Cancellation &amp; Refund Authorization
                </h2>
              </div>

              {/* PENDING CANCELLATIONS QUEUE */}
              {pendingCancellations.length > 0 && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border-2 border-amber-300 dark:border-amber-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-amber-950 dark:text-amber-200 text-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                      Pending Cancellation Requests ({pendingCancellations.length})
                    </span>
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">
                      Awaiting Counter Acceptance
                    </span>
                  </div>

                  <div className="space-y-2">
                    {pendingCancellations.map((b) => {
                      const refundPct = tenant?.settings.refund_percentage || 80;
                      const netRefund = Math.round((b.total_payable * refundPct) / 100);

                      return (
                        <div
                          key={b.id}
                          className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-amber-200 dark:border-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div>
                            <div className="flex items-center gap-2 font-mono font-bold text-slate-900 dark:text-white">
                              <span>{b.booking_ref}</span>
                              <span className="font-sans font-semibold text-slate-600 dark:text-slate-300">
                                • {b.passenger_name} ({b.passenger_phone})
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {b.from_stop_name} ➔ {b.to_stop_name} • Seats: {b.seats?.map((s) => s.seat_number).join(', ')}
                            </div>
                            <div className="text-[10px] text-amber-700 dark:text-amber-400">
                              Reason: "{b.cancellation_reason || 'Passenger requested cancellation'}"
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => handleAcceptCancellation(b.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs cursor-pointer shadow-sm"
                            >
                              Accept &amp; Refund ৳{netRefund}
                            </button>
                            <button
                              onClick={() => handleRejectCancellation(b.id)}
                              className="px-2 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-lg text-xs cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter PNR e.g. BM-GL-1001"
                  value={searchRef}
                  onChange={(e) => setSearchRef(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono focus:outline-none"
                />
                <button
                  onClick={handleSearchBooking}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center gap-1 shadow cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  Find
                </button>
              </div>

              {foundBooking && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                    <span>PNR: {foundBooking.booking_ref}</span>
                    <span className="font-mono text-emerald-600">৳{foundBooking.total_payable}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">
                    Passenger: <span className="font-semibold">{foundBooking.passenger_name}</span> ({foundBooking.passenger_phone})
                  </p>
                  <p className="text-slate-500">
                    Route: {foundBooking.from_stop_name} ➔ {foundBooking.to_stop_name} • Seats: {foundBooking.seats?.map((s: any) => s.seat_number).join(', ')}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-semibold text-slate-500">
                      Status: <span className="uppercase text-blue-600 font-bold">{foundBooking.ticket_status}</span>
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      Policy: {tenant?.settings.refund_percentage || 80}% Refundable
                    </span>
                  </div>

                  {foundBooking.ticket_status === 'cancellation_requested' ? (
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="p-2.5 rounded bg-amber-50 dark:bg-amber-950/60 border border-amber-300 text-amber-900 dark:text-amber-200 text-xs">
                        <strong>Passenger submitted cancellation request:</strong> "{foundBooking.cancellation_reason || 'Personal schedule change'}"
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptCancellation(foundBooking.id)}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded shadow transition cursor-pointer"
                        >
                          Accept Cancellation &amp; Issue ৳{Math.round(foundBooking.total_payable * 0.8)} Refund
                        </button>
                        <button
                          onClick={() => handleRejectCancellation(foundBooking.id)}
                          className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded font-semibold cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ) : foundBooking.ticket_status === 'confirmed' ? (
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                      <input
                        type="text"
                        placeholder="Cancellation Reason..."
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs"
                      />
                      <button
                        onClick={handleCancelBooking}
                        className="w-full py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded shadow transition cursor-pointer"
                      >
                        Authorize Direct Cancellation &amp; Issue Refund
                      </button>
                    </div>
                  ) : (
                    <div className="p-2 bg-amber-50 dark:bg-amber-950 rounded text-amber-800 dark:text-amber-200 font-semibold text-center">
                      This booking has already been cancelled and refunded.
                    </div>
                  )}
                </div>
              )}

              {refundResult && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded-lg text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
                  <span>Refund Processed Successfully:</span>
                  <span className="font-extrabold text-base font-mono">৳{refundResult.amount}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* PASSENGER MANIFEST MODAL (WHEN MANIFEST BUTTON IS CLICKED) */}
      {manifestTrip &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in duration-150 text-xs max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      Passenger Manifest &amp; Boarding Roster
                    </h3>
                    <p className="text-xs text-slate-500">
                      Trip <strong className="font-mono text-blue-600">#{manifestTrip.trip_code}</strong> • {manifestTrip.bus?.name || 'Assigned Coach'} ({manifestTrip.bus?.reg_no})
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setManifestTrip(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Trip Information Card */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block">Departure Route</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {manifestTrip.route?.origin_city} ➔ {manifestTrip.route?.destination_city}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Departure Time</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {manifestTrip.departure_time} Today
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Live Trip State</span>
                  <span className="font-bold uppercase text-emerald-600">
                    {manifestTrip.status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Total Booked</span>
                  <span className="font-bold text-blue-600 font-mono">
                    {(() => {
                      const bookingsForTrip = allBookings.filter(
                        (b) => b.trip_id === manifestTrip.id && b.ticket_status !== 'cancelled'
                      );
                      const seatsCount = bookingsForTrip.reduce((sum, b) => sum + (b.seats?.length || 1), 0);
                      return `${seatsCount} / ${manifestTrip.bus?.total_capacity || 36} Seats`;
                    })()}
                  </span>
                </div>
              </div>

              {/* Passenger List Table */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                  Confirmed Passengers on this Coach:
                </h4>

                {(() => {
                  const tripBookings = allBookings.filter(
                    (b) => b.trip_id === manifestTrip.id && b.ticket_status !== 'cancelled'
                  );

                  if (tripBookings.length === 0) {
                    return (
                      <div className="p-6 text-center text-slate-400 border border-dashed rounded-xl">
                        No bookings confirmed on this departure yet.
                      </div>
                    );
                  }

                  return (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px]">
                          <tr>
                            <th className="py-2.5 px-3">Seats</th>
                            <th className="py-2.5 px-3">Passenger</th>
                            <th className="py-2.5 px-3">Contact</th>
                            <th className="py-2.5 px-3">Boarding ➔ Drop</th>
                            <th className="py-2.5 px-3">Fare Paid</th>
                            <th className="py-2.5 px-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {tripBookings.map((b) => (
                            <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="py-2.5 px-3 font-mono font-bold text-blue-600">
                                {b.seats?.map((s) => s.seat_number).join(', ') || 'N/A'}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                                {b.passenger_name}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                                <a href={`tel:${b.passenger_phone}`} className="hover:underline text-blue-600">
                                  {b.passenger_phone}
                                </a>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                                {b.from_stop_name} ➔ {b.to_stop_name}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-emerald-600">
                                ৳{b.total_payable}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                  Confirmed
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Manifest</span>
                </button>

                <button
                  type="button"
                  onClick={() => setManifestTrip(null)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer text-xs"
                >
                  Close Manifest
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
