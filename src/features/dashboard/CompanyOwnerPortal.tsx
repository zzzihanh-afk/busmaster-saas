import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { dbStore } from '../../services/dbStore';
import {
  Bus as BusIcon,
  Route as RouteIcon,
  Calendar,
  DollarSign,
  Users,
  Grid,
  TrendingUp,
  Receipt,
  Settings,
  Plus,
  Clock,
  CheckCircle,
  FileText,
  MapPin,
  Shield,
  Percent,
  Truck,
  IdCard,
  Phone,
  Sliders,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { SeatLayoutDesigner } from '../fleet/SeatLayoutDesigner';

export const CompanyOwnerPortal: React.FC = () => {
  const { tenant, profile, switchProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'fleet'
    | 'drivers'
    | 'layouts'
    | 'routes'
    | 'trips'
    | 'finance'
    | 'counters'
    | 'settings'
  >('overview');

  const tenantId = tenant?.id || '';
  const buses = dbStore.getBuses(tenantId);
  const routes = dbStore.getRoutes(tenantId);
  const trips = dbStore.getTrips(tenantId);
  const bookings = dbStore.getBookings(tenantId);
  const expenses = dbStore.getExpenses(tenantId);
  const counters = dbStore.getCounters(tenantId);
  const layouts = dbStore.getSeatLayouts(tenantId);
  const drivers = dbStore.getProfilesByTenant(tenantId).filter((p) => p.role === 'driver');
  const companyAdmins = dbStore
    .getProfiles()
    .filter(
      (p) =>
        p.tenant_id === tenantId &&
        (p.role === 'company_admin' || p.role === 'company_owner')
    );

  // Financial calculations
  const totalRevenue = bookings.reduce((sum, b) => sum + (b.total_payable || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;

  // Chart data
  const revenueTrendData = [
    { day: 'Mon', revenue: 45000, bookings: 32 },
    { day: 'Tue', revenue: 52000, bookings: 38 },
    { day: 'Wed', revenue: 61000, bookings: 44 },
    { day: 'Thu', revenue: 78000, bookings: 56 },
    { day: 'Fri', revenue: 115000, bookings: 82 },
    { day: 'Sat', revenue: 98000, bookings: 70 },
    { day: 'Sun', revenue: totalRevenue > 0 ? totalRevenue : 88000, bookings: bookings.length || 65 },
  ];

  const bookingSourceData = [
    { name: 'Counter POS', value: bookings.filter((b) => b.booking_source === 'counter').length || 18, color: '#3b82f6' },
    { name: 'Online Booking', value: bookings.filter((b) => b.booking_source === 'online').length || 12, color: '#10b981' },
    { name: 'Admin Created', value: bookings.filter((b) => b.booking_source === 'admin').length || 4, color: '#8b5cf6' },
  ];

  // Forms states
  const [showBusModal, setShowBusModal] = useState(false);
  const [newBus, setNewBus] = useState({
    name: '',
    reg_no: '',
    bus_type: 'AC' as const,
    total_capacity: 36,
    manufacturer: 'Scania',
    model: 'Metrolink',
    year: 2024,
  });

  const [showTripModal, setShowTripModal] = useState(false);
  const [newTrip, setNewTrip] = useState({
    route_id: routes[0]?.id || '',
    bus_id: buses[0]?.id || '',
    trip_code: '',
    departure_date: new Date().toISOString().split('T')[0],
    departure_time: '07:30',
    base_fare: 1400,
  });

  const handleCreateBus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBus.name || !newBus.reg_no) return;
    dbStore.saveBus({
      id: 'bus-' + Date.now(),
      tenant_id: tenantId,
      name: newBus.name,
      reg_no: newBus.reg_no,
      bus_type: newBus.bus_type,
      total_capacity: newBus.total_capacity,
      deck_config: 'single',
      seat_layout_id: layouts[0]?.id,
      manufacturer: newBus.manufacturer,
      model: newBus.model,
      year: newBus.year,
      status: 'active',
    });
    setShowBusModal(false);
    setNewBus({
      name: '',
      reg_no: '',
      bus_type: 'AC',
      total_capacity: 36,
      manufacturer: 'Scania',
      model: 'Metrolink',
      year: 2024,
    });
  };

  const [showDriverModal, setShowDriverModal] = useState(false);
  const [newDriverOwner, setNewDriverOwner] = useState({
    full_name: '',
    phone: '',
    license_number: '',
    assigned_bus_id: buses[0]?.id || '',
  });

  const handleCreateDriverOwner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriverOwner.full_name || !newDriverOwner.phone) return;
    const license =
      newDriverOwner.license_number.trim() ||
      'BRTA-PROF-DL-' + Math.floor(100000 + Math.random() * 900000);

    const driverProfile = {
      id: 'p-drv-' + Date.now(),
      tenant_id: tenantId,
      full_name: newDriverOwner.full_name.trim(),
      phone: newDriverOwner.phone.trim(),
      email: `driver.${Date.now()}@${tenant?.slug || 'operator'}.bd`,
      role: 'driver' as const,
      license_number: license,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    dbStore.saveProfile(driverProfile);

    if (newDriverOwner.assigned_bus_id) {
      const bus = buses.find((b) => b.id === newDriverOwner.assigned_bus_id);
      if (bus) {
        bus.assigned_driver_id = driverProfile.id;
        dbStore.saveBus(bus);
      }
    }

    setShowDriverModal(false);
    setNewDriverOwner({
      full_name: '',
      phone: '',
      license_number: '',
      assigned_bus_id: buses[0]?.id || '',
    });
  };

  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrip.route_id || !newTrip.bus_id) return;
    const code =
      newTrip.trip_code ||
      `TRP-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    dbStore.saveTrip({
      id: 'trip-' + Date.now(),
      tenant_id: tenantId,
      route_id: newTrip.route_id,
      bus_id: newTrip.bus_id,
      trip_code: code,
      departure_date: newTrip.departure_date,
      departure_time: newTrip.departure_time,
      base_fare: Number(newTrip.base_fare),
      status: 'scheduled',
    });
    setShowTripModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Operator Header */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            {tenant?.name.charAt(0) || 'B'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                {tenant?.name}
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                ACTIVE OPERATOR
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span>
                Owner: <strong className="text-slate-800 dark:text-slate-200">{tenant?.owner_name}</strong>
              </span>
              <span>•</span>
              <span>
                Operating as: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{profile.full_name}</strong> ({profile.role.replace('_', ' ').toUpperCase()})
              </span>
              <span>•</span>
              <span>Hotline: {tenant?.settings.hotline || '16223'}</span>
              <span>•</span>
              <span>Trade Lic: {tenant?.trade_license || 'TRAD/DNCC/012948'}</span>
            </div>

            {/* Switch between company admins if multiple exist */}
            {companyAdmins.length > 1 && (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                <span className="text-slate-500 font-semibold flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-blue-500" />
                  <span>Switch Administrator ({companyAdmins.length} Admins):</span>
                </span>
                <select
                  value={profile.id}
                  onChange={(e) => switchProfile(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-bold rounded-lg px-2.5 py-1 border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  {companyAdmins.map((adm) => (
                    <option key={adm.id} value={adm.id}>
                      👤 {adm.full_name} ({adm.role === 'company_owner' ? 'Company Owner' : 'Appointed Admin'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Sub-Tabs Navigation */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
          {[
            { id: 'overview', label: 'Overview', icon: <TrendingUp className="w-3.5 h-3.5" /> },
            { id: 'fleet', label: 'Fleet & Buses', icon: <BusIcon className="w-3.5 h-3.5" /> },
            { id: 'drivers', label: 'Drivers', icon: <Truck className="w-3.5 h-3.5" /> },
            { id: 'layouts', label: 'Seat Layouts', icon: <Grid className="w-3.5 h-3.5" /> },
            { id: 'routes', label: 'Routes & Stops', icon: <RouteIcon className="w-3.5 h-3.5" /> },
            { id: 'trips', label: 'Trips & Schedules', icon: <Calendar className="w-3.5 h-3.5" /> },
            { id: 'finance', label: 'Finances', icon: <Receipt className="w-3.5 h-3.5" /> },
            { id: 'counters', label: 'Counters', icon: <Users className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: OVERVIEW & ANALYTICS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Revenue
              </span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                ৳{totalRevenue.toLocaleString()}
              </div>
              <span className="text-xs text-emerald-600 font-medium">Real sales revenue</span>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Operating Fleet
              </span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                {buses.length} Buses
              </div>
              <span className="text-xs text-blue-600 font-medium">
                {buses.filter((b) => b.bus_type === 'AC').length} AC / {buses.filter((b) => b.bus_type !== 'AC').length} Non-AC
              </span>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Bookings
              </span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                {bookings.length}
              </div>
              <span className="text-xs text-emerald-600 font-medium">Atomic reservations</span>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Net Operating Profit
              </span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                ৳{netProfit.toLocaleString()}
              </div>
              <span className="text-xs text-purple-600 font-medium">After recorded expenses</span>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-4">
                Weekly Revenue Trend (BDT ৳)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueTrendData}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="day" stroke="#888888" fontSize={12} />
                    <YAxis stroke="#888888" fontSize={12} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRev)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-4">
                Booking Channel Distribution
              </h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={bookingSourceData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={45}
                    >
                      {bookingSourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-2">
                {bookingSourceData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.name}
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Today's Scheduled Departures */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Upcoming Departures & Trips
              </h3>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                {trips.length} Scheduled
              </span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {trips.map((t) => (
                <div key={t.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {t.trip_code}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        {t.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-slate-500 mt-0.5">
                      Route: {t.route?.origin_city} ➔ {t.route?.destination_city} • Bus: {t.bus?.name} ({t.bus?.bus_type})
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {t.departure_time}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Base ৳{t.base_fare}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FLEET & BUS MANAGEMENT */}
      {activeTab === 'fleet' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Fleet Vehicle Roster ({buses.length})
            </h2>
            <button
              onClick={() => setShowBusModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Bus
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {buses.map((bus) => (
              <div
                key={bus.id}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                    <BusIcon className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {bus.status.toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">{bus.name}</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{bus.reg_no}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Type</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{bus.bus_type}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Capacity</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{bus.total_capacity} Seats</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Chassis</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{bus.manufacturer} {bus.model}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Model Year</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{bus.year || 2024}</span>
                  </div>
                </div>

                {/* Seat Type Breakdown & Direct Quota Config Shortcut */}
                {(() => {
                  const busLayout = layouts.find((l) => l.id === bus.seat_layout_id) || layouts[0];
                  const sl = busLayout?.grid_data.filter((s) => s.type === 'sleeper').length || 0;
                  const dis = busLayout?.grid_data.filter((s) => s.type === 'disabled').length || 0;
                  const fem = busLayout?.grid_data.filter((s) => s.type === 'female').length || 0;
                  const vip = busLayout?.grid_data.filter((s) => s.type === 'premium').length || 0;
                  const reg = busLayout?.grid_data.filter((s) => s.type === 'regular').length || 0;

                  return (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-1.5 items-center justify-between">
                      <div className="flex flex-wrap gap-1 text-[10px]">
                        {sl > 0 && <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-semibold">🛏️ {sl} Sleeper</span>}
                        {dis > 0 && <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 font-semibold">♿ {dis} Accessible</span>}
                        {fem > 0 && <span className="px-1.5 py-0.5 rounded bg-pink-50 text-pink-700 dark:bg-pink-950 dark:text-pink-300 font-semibold">👩 {fem} Female</span>}
                        {vip > 0 && <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-semibold">⭐ {vip} VIP</span>}
                        {reg > 0 && <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">💺 {reg} Standard</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('layouts')}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-500 cursor-pointer"
                      >
                        <Sliders className="w-3 h-3" />
                        <span>Set Quota</span>
                      </button>
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>

          {/* Add Bus Modal */}
          {showBusModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Register New Bus</h3>
                <form onSubmit={handleCreateBus} className="mt-4 space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300">Bus Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Scania Multi-Axle #105"
                      value={newBus.name}
                      onChange={(e) => setNewBus({ ...newBus, name: e.target.value })}
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300">Registration Number</label>
                    <input
                      type="text"
                      required
                      placeholder="DHAKA-METRO-BA-11-..."
                      value={newBus.reg_no}
                      onChange={(e) => setNewBus({ ...newBus, reg_no: e.target.value })}
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300">Bus Type</label>
                      <select
                        value={newBus.bus_type}
                        onChange={(e) => setNewBus({ ...newBus, bus_type: e.target.value as any })}
                        className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none"
                      >
                        <option value="AC">AC</option>
                        <option value="Non-AC">Non-AC</option>
                        <option value="Executive-AC">Executive-AC</option>
                        <option value="Sleeper-AC">Sleeper-AC</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300">Capacity</label>
                      <input
                        type="number"
                        value={newBus.total_capacity}
                        onChange={(e) => setNewBus({ ...newBus, total_capacity: Number(e.target.value) })}
                        className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setShowBusModal(false)}
                      className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-500"
                    >
                      Save Bus
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: DRIVERS MANAGEMENT */}
      {activeTab === 'drivers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-500" />
                <span>Transport Pilot &amp; Driver Roster ({drivers.length})</span>
              </h2>
              <p className="text-xs text-slate-400">
                BRTA registered commercial heavy vehicle drivers operating for {tenant?.name}
              </p>
            </div>
            <button
              onClick={() => setShowDriverModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-lg text-xs shadow transition cursor-pointer"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              Add Bus Driver
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drivers.map((drv) => {
              const driverBus = buses.find((b) => b.assigned_driver_id === drv.id);
              const driverTrip = trips.find((t) => t.driver_id === drv.id);

              return (
                <div
                  key={drv.id}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-black text-sm flex items-center justify-center">
                        {drv.full_name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          {drv.full_name}
                        </h4>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          BRTA Commercial Driver
                        </span>
                      </div>
                    </div>

                    {driverTrip ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        IN TRANSIT
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        STANDBY
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">License:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
                        {drv.license_number || 'BRTA-PROF-DL-2024'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Mobile:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">
                        {drv.phone || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Assigned Bus:</span>
                      {driverBus ? (
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {driverBus.name} ({driverBus.reg_no})
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned Pool</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Driver Modal */}
          {showDriverModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 text-xs">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Truck className="w-5 h-5 text-amber-500" />
                  Register Professional Bus Driver
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Register and authorize a commercial driver for {tenant?.name}
                </p>

                <form onSubmit={handleCreateDriverOwner} className="mt-4 space-y-3">
                  <div>
                    <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                      Driver Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Md. Jahangir Alam"
                      value={newDriverOwner.full_name}
                      onChange={(e) => setNewDriverOwner({ ...newDriverOwner, full_name: e.target.value })}
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
                        value={newDriverOwner.phone}
                        onChange={(e) => setNewDriverOwner({ ...newDriverOwner, phone: e.target.value })}
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
                        value={newDriverOwner.license_number}
                        onChange={(e) => setNewDriverOwner({ ...newDriverOwner, license_number: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                      Assign Initial Bus
                    </label>
                    <select
                      value={newDriverOwner.assigned_bus_id}
                      onChange={(e) => setNewDriverOwner({ ...newDriverOwner, assigned_bus_id: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold focus:outline-none"
                    >
                      <option value="">None (Standby Pool)</option>
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
                      onClick={() => setShowDriverModal(false)}
                      className="px-3.5 py-1.5 font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer"
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
        </div>
      )}

      {/* TAB 3: VISUAL SEAT LAYOUT DESIGNER */}
      {activeTab === 'layouts' && (
        <SeatLayoutDesigner tenantId={tenantId} />
      )}

      {/* TAB 4: ROUTES & STOPS */}
      {activeTab === 'routes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Configured Travel Routes ({routes.length})
            </h2>
          </div>
          <div className="space-y-4">
            {routes.map((rt) => (
              <div
                key={rt.id}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-base text-slate-900 dark:text-white">
                      {rt.origin_city} ➔ {rt.destination_city}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      {rt.distance_km || 250} KM • ~{rt.estimated_duration_hours || 5.5} hrs
                    </span>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    ACTIVE
                  </span>
                </div>
                <p className="text-xs text-slate-500">{rt.description}</p>

                {/* Route stops timeline */}
                {rt.stops && rt.stops.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[11px] font-semibold text-slate-400 block mb-2">
                      Intermediate Stops & Boarding Points:
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {rt.stops.map((st, i) => (
                        <div key={st.id} className="flex items-center gap-1.5 text-xs">
                          <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700/60 text-slate-800 dark:text-slate-200 rounded-md font-medium flex items-center gap-1">
                            <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] flex items-center justify-center font-bold">
                              {st.sequence_order}
                            </span>
                            {st.stop_name}
                          </span>
                          {i < (rt.stops?.length || 0) - 1 && (
                            <span className="text-slate-400">➔</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: TRIPS & SCHEDULES */}
      {activeTab === 'trips' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Trip Dispatch & Scheduling ({trips.length})
            </h2>
            <button
              onClick={() => setShowTripModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Schedule Trip
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">Trip Code</th>
                  <th className="py-3 px-4">Route</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Assigned Bus</th>
                  <th className="py-3 px-4">Fare</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {trips.map((trip) => (
                  <tr key={trip.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {trip.trip_code}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      {trip.route?.origin_city} ➔ {trip.route?.destination_city}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {trip.departure_date} at {trip.departure_time}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      {trip.bus?.name || 'Assigned'}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-600">
                      ৳{trip.base_fare}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 uppercase">
                        {trip.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Schedule Trip Modal */}
          {showTripModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Schedule New Trip</h3>
                <form onSubmit={handleCreateTrip} className="mt-4 space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300">Select Route</label>
                    <select
                      value={newTrip.route_id}
                      onChange={(e) => setNewTrip({ ...newTrip, route_id: e.target.value })}
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none"
                    >
                      {routes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.origin_city} ➔ {r.destination_city}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300">Assign Bus</label>
                    <select
                      value={newTrip.bus_id}
                      onChange={(e) => setNewTrip({ ...newTrip, bus_id: e.target.value })}
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none"
                    >
                      {buses.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.bus_type} - {b.total_capacity} seats)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300">Departure Date</label>
                      <input
                        type="date"
                        value={newTrip.departure_date}
                        onChange={(e) => setNewTrip({ ...newTrip, departure_date: e.target.value })}
                        className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300">Departure Time</label>
                      <input
                        type="time"
                        value={newTrip.departure_time}
                        onChange={(e) => setNewTrip({ ...newTrip, departure_time: e.target.value })}
                        className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300">Base Fare (৳)</label>
                    <input
                      type="number"
                      value={newTrip.base_fare}
                      onChange={(e) => setNewTrip({ ...newTrip, base_fare: Number(e.target.value) })}
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setShowTripModal(false)}
                      className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-500"
                    >
                      Dispatch Trip
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: FINANCES & EXPENSES */}
      {activeTab === 'finance' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-400 font-semibold uppercase">Total Sales Inflows</span>
              <div className="text-2xl font-extrabold text-emerald-600 mt-1">৳{totalRevenue.toLocaleString()}</div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-400 font-semibold uppercase">Operating Outflows</span>
              <div className="text-2xl font-extrabold text-rose-600 mt-1">৳{totalExpenses.toLocaleString()}</div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-400 font-semibold uppercase">Net Retained Cash</span>
              <div className="text-2xl font-extrabold text-blue-600 mt-1">৳{netProfit.toLocaleString()}</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3">Recorded Expenses</h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {expenses.map((exp) => (
                <div key={exp.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{exp.title}</span>
                    <span className="text-slate-400 block text-[11px] capitalize">Category: {exp.category.replace('_', ' ')} • Date: {exp.expense_date}</span>
                  </div>
                  <span className="font-bold text-rose-600 font-mono">-৳{exp.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: COUNTERS */}
      {activeTab === 'counters' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Physical Ticket Stations & Counters ({counters.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {counters.map((cnt) => (
              <div
                key={cnt.id}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded font-bold">
                    {cnt.code}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {cnt.status.toUpperCase()}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">{cnt.name}</h3>
                <p className="text-slate-500">{cnt.address}, {cnt.city}</p>
                <p className="text-slate-700 dark:text-slate-300 font-mono">{cnt.contact_phone}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
