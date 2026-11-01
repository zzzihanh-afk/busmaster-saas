import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { dbStore } from '../../services/dbStore';
import { Route, RouteStop } from '../../types';
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
  Trash2,
  Edit3,
  ArrowRight,
  X,
  Sparkles,
  Navigation,
  AlertCircle,
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

  // Route Management States & Handlers
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [newRoute, setNewRoute] = useState({
    origin_city: 'Dhaka',
    destination_city: '',
    distance_km: 250,
    estimated_duration_hours: 5.5,
    description: '',
    status: 'active' as 'active' | 'inactive',
    stops: [
      {
        id: 'stop-1',
        stop_name: 'Dhaka Central Counter',
        sequence_order: 1,
        arrival_offset_minutes: 0,
        departure_offset_minutes: 0,
        can_board: true,
        can_drop: false,
        counter_id: '',
      },
      {
        id: 'stop-2',
        stop_name: '',
        sequence_order: 2,
        arrival_offset_minutes: 330,
        departure_offset_minutes: 330,
        can_board: false,
        can_drop: true,
        counter_id: '',
      },
    ],
  });

  const POPULAR_ROUTE_PRESETS = [
    {
      name: 'Dhaka ➔ Chattogram',
      badge: '250 KM • 5.5 hrs',
      origin_city: 'Dhaka',
      destination_city: 'Chattogram',
      distance_km: 250,
      estimated_duration_hours: 5.5,
      description: 'Direct Highway route via Cumilla Paduar Bazar & Feni Mohipal bypass',
      stops: [
        { stop_name: 'Arambagh Central (Dhaka)', sequence_order: 1, arrival_offset_minutes: 0, departure_offset_minutes: 0, can_board: true, can_drop: false },
        { stop_name: 'Paduar Bazar (Cumilla)', sequence_order: 2, arrival_offset_minutes: 120, departure_offset_minutes: 130, can_board: true, can_drop: true },
        { stop_name: 'Mohipal (Feni)', sequence_order: 3, arrival_offset_minutes: 190, departure_offset_minutes: 200, can_board: true, can_drop: true },
        { stop_name: 'Dampara Main (Chattogram)', sequence_order: 4, arrival_offset_minutes: 330, departure_offset_minutes: 330, can_board: false, can_drop: true },
      ],
    },
    {
      name: 'Dhaka ➔ Cox\'s Bazar',
      badge: '395 KM • 9.0 hrs',
      origin_city: 'Dhaka',
      destination_city: 'Cox\'s Bazar',
      distance_km: 395,
      estimated_duration_hours: 9.0,
      description: 'Direct tourist highway corridor via Chattogram Dampara and Chakaria',
      stops: [
        { stop_name: 'Sayedabad / Arambagh (Dhaka)', sequence_order: 1, arrival_offset_minutes: 0, departure_offset_minutes: 0, can_board: true, can_drop: false },
        { stop_name: 'Paduar Bazar (Cumilla)', sequence_order: 2, arrival_offset_minutes: 120, departure_offset_minutes: 130, can_board: true, can_drop: true },
        { stop_name: 'Dampara Highway (Chattogram)', sequence_order: 3, arrival_offset_minutes: 330, departure_offset_minutes: 345, can_board: true, can_drop: true },
        { stop_name: 'Chakaria Central Station', sequence_order: 4, arrival_offset_minutes: 450, departure_offset_minutes: 460, can_board: true, can_drop: true },
        { stop_name: 'Kolatoli Beach Point (Cox\'s Bazar)', sequence_order: 5, arrival_offset_minutes: 540, departure_offset_minutes: 540, can_board: false, can_drop: true },
      ],
    },
    {
      name: 'Dhaka ➔ Sylhet',
      badge: '245 KM • 5.5 hrs',
      origin_city: 'Dhaka',
      destination_city: 'Sylhet',
      distance_km: 245,
      estimated_duration_hours: 5.5,
      description: 'North-Eastern corridor via Narsingdi, Bhairab and Shayestaganj bypass',
      stops: [
        { stop_name: 'Sayedabad Terminal (Dhaka)', sequence_order: 1, arrival_offset_minutes: 0, departure_offset_minutes: 0, can_board: true, can_drop: false },
        { stop_name: 'Bhairab Counter Hub', sequence_order: 2, arrival_offset_minutes: 90, departure_offset_minutes: 100, can_board: true, can_drop: true },
        { stop_name: 'Shayestaganj Station', sequence_order: 3, arrival_offset_minutes: 180, departure_offset_minutes: 190, can_board: true, can_drop: true },
        { stop_name: 'Kadamtoli Central (Sylhet)', sequence_order: 4, arrival_offset_minutes: 330, departure_offset_minutes: 330, can_board: false, can_drop: true },
      ],
    },
    {
      name: 'Dhaka ➔ Rangpur',
      badge: '310 KM • 7.0 hrs',
      origin_city: 'Dhaka',
      destination_city: 'Rangpur',
      distance_km: 310,
      estimated_duration_hours: 7.0,
      description: 'North Bengal Grand Trunk corridor via Jamuna Bridge and Bogura',
      stops: [
        { stop_name: 'Gabtoli Central (Dhaka)', sequence_order: 1, arrival_offset_minutes: 0, departure_offset_minutes: 0, can_board: true, can_drop: false },
        { stop_name: 'Sirajganj Highway Junction', sequence_order: 2, arrival_offset_minutes: 150, departure_offset_minutes: 165, can_board: true, can_drop: true },
        { stop_name: 'Charmatha Central (Bogura)', sequence_order: 3, arrival_offset_minutes: 270, departure_offset_minutes: 285, can_board: true, can_drop: true },
        { stop_name: 'Kamarpara Terminal (Rangpur)', sequence_order: 4, arrival_offset_minutes: 420, departure_offset_minutes: 420, can_board: false, can_drop: true },
      ],
    },
    {
      name: 'Dhaka ➔ Rajshahi',
      badge: '260 KM • 6.0 hrs',
      origin_city: 'Dhaka',
      destination_city: 'Rajshahi',
      distance_km: 260,
      estimated_duration_hours: 6.0,
      description: 'Silk City Express route via Bangabandhu Bridge and Natore bypass',
      stops: [
        { stop_name: 'Gabtoli Terminal (Dhaka)', sequence_order: 1, arrival_offset_minutes: 0, departure_offset_minutes: 0, can_board: true, can_drop: false },
        { stop_name: 'Sirajganj Food Village', sequence_order: 2, arrival_offset_minutes: 150, departure_offset_minutes: 165, can_board: true, can_drop: true },
        { stop_name: 'Natore Station Point', sequence_order: 3, arrival_offset_minutes: 260, departure_offset_minutes: 275, can_board: true, can_drop: true },
        { stop_name: 'Shiroil Main Terminal (Rajshahi)', sequence_order: 4, arrival_offset_minutes: 360, departure_offset_minutes: 360, can_board: false, can_drop: true },
      ],
    },
  ];

  const handleOpenAddRoute = () => {
    setEditingRouteId(null);
    setNewRoute({
      origin_city: 'Dhaka',
      destination_city: '',
      distance_km: 250,
      estimated_duration_hours: 5.5,
      description: '',
      status: 'active',
      stops: [
        {
          id: 'stop-' + Date.now() + '-1',
          stop_name: 'Dhaka Central Counter',
          sequence_order: 1,
          arrival_offset_minutes: 0,
          departure_offset_minutes: 0,
          can_board: true,
          can_drop: false,
          counter_id: '',
        },
        {
          id: 'stop-' + Date.now() + '-2',
          stop_name: '',
          sequence_order: 2,
          arrival_offset_minutes: 330,
          departure_offset_minutes: 330,
          can_board: false,
          can_drop: true,
          counter_id: '',
        },
      ],
    });
    setShowRouteModal(true);
  };

  const handleOpenEditRoute = (rt: Route) => {
    setEditingRouteId(rt.id);
    setNewRoute({
      origin_city: rt.origin_city,
      destination_city: rt.destination_city,
      distance_km: rt.distance_km || 250,
      estimated_duration_hours: rt.estimated_duration_hours || 5.5,
      description: rt.description || '',
      status: rt.status || 'active',
      stops:
        rt.stops && rt.stops.length > 0
          ? rt.stops.map((s, idx) => ({
              id: s.id || `stop-${idx}`,
              stop_name: s.stop_name,
              sequence_order: s.sequence_order || idx + 1,
              arrival_offset_minutes: s.arrival_offset_minutes ?? 0,
              departure_offset_minutes: s.departure_offset_minutes ?? 0,
              can_board: s.can_board ?? true,
              can_drop: s.can_drop ?? true,
              counter_id: s.counter_id || '',
            }))
          : [
              {
                id: 'stop-1',
                stop_name: rt.origin_city,
                sequence_order: 1,
                arrival_offset_minutes: 0,
                departure_offset_minutes: 0,
                can_board: true,
                can_drop: false,
                counter_id: '',
              },
              {
                id: 'stop-2',
                stop_name: rt.destination_city,
                sequence_order: 2,
                arrival_offset_minutes: Math.round((rt.estimated_duration_hours || 5.5) * 60),
                departure_offset_minutes: Math.round((rt.estimated_duration_hours || 5.5) * 60),
                can_board: false,
                can_drop: true,
                counter_id: '',
              },
            ],
    });
    setShowRouteModal(true);
  };

  const handleApplyRoutePreset = (preset: (typeof POPULAR_ROUTE_PRESETS)[0]) => {
    setNewRoute({
      origin_city: preset.origin_city,
      destination_city: preset.destination_city,
      distance_km: preset.distance_km,
      estimated_duration_hours: preset.estimated_duration_hours,
      description: preset.description,
      status: 'active',
      stops: preset.stops.map((s, idx) => ({
        id: `stop-preset-${idx + 1}`,
        stop_name: s.stop_name,
        sequence_order: s.sequence_order,
        arrival_offset_minutes: s.arrival_offset_minutes,
        departure_offset_minutes: s.departure_offset_minutes,
        can_board: s.can_board,
        can_drop: s.can_drop,
        counter_id: '',
      })),
    });
  };

  const handleAddIntermediateStop = () => {
    const currentStops = [...newRoute.stops];
    const newSeq = currentStops.length + 1;
    const lastStop = currentStops[currentStops.length - 1];
    const prevArrival = lastStop ? lastStop.arrival_offset_minutes : 120;

    currentStops.push({
      id: 'stop-' + Date.now(),
      stop_name: '',
      sequence_order: newSeq,
      arrival_offset_minutes: prevArrival + 60,
      departure_offset_minutes: prevArrival + 70,
      can_board: true,
      can_drop: true,
      counter_id: '',
    });
    setNewRoute({ ...newRoute, stops: currentStops });
  };

  const handleRemoveStop = (idx: number) => {
    if (newRoute.stops.length <= 2) {
      alert('A travel route must contain at least 2 stops (Origin and Destination).');
      return;
    }
    const filtered = newRoute.stops.filter((_, i) => i !== idx);
    const resequenced = filtered.map((s, i) => ({
      ...s,
      sequence_order: i + 1,
    }));
    setNewRoute({ ...newRoute, stops: resequenced });
  };

  const handleSaveRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoute.origin_city.trim() || !newRoute.destination_city.trim()) {
      alert('Please specify both Origin City and Destination City.');
      return;
    }
    const finalStops: RouteStop[] = newRoute.stops.map((s, idx) => ({
      id: s.id || `stop-${Date.now()}-${idx + 1}`,
      tenant_id: tenantId,
      route_id: editingRouteId || `rt-${Date.now()}`,
      stop_name:
        s.stop_name.trim() ||
        (idx === 0
          ? `${newRoute.origin_city} Counter`
          : idx === newRoute.stops.length - 1
          ? `${newRoute.destination_city} Counter`
          : `Intermediate Stop ${idx + 1}`),
      sequence_order: idx + 1,
      arrival_offset_minutes: Number(s.arrival_offset_minutes) || 0,
      departure_offset_minutes: Number(s.departure_offset_minutes) || 0,
      can_board: s.can_board,
      can_drop: s.can_drop,
      counter_id: s.counter_id || undefined,
    }));

    const routeToSave: Route = {
      id: editingRouteId || `rt-${Date.now()}`,
      tenant_id: tenantId,
      origin_city: newRoute.origin_city.trim(),
      destination_city: newRoute.destination_city.trim(),
      distance_km: Number(newRoute.distance_km) || 250,
      estimated_duration_hours: Number(newRoute.estimated_duration_hours) || 5.5,
      description:
        newRoute.description.trim() ||
        `${newRoute.origin_city} to ${newRoute.destination_city} highway route`,
      status: newRoute.status,
      stops: finalStops,
      created_at: new Date().toISOString(),
    };

    dbStore.saveRoute(routeToSave);
    setShowRouteModal(false);
    setEditingRouteId(null);
  };

  const handleDeleteRoute = (rtId: string, rtName: string) => {
    if (window.confirm(`Are you sure you want to delete route "${rtName}"?`)) {
      dbStore.deleteRoute(rtId);
    }
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Configured Travel Routes ({routes.length})</span>
                <span className="text-xs font-normal text-slate-500">
                  (Nationwide Inter-District Transit Network)
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage operational transit corridors, highway distances, and intermediate passenger boarding/dropping stops.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddRoute}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-md transition cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Travel Route</span>
            </button>
          </div>

          {/* Quick Preset Banner */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1 text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Quick Add Popular Presets:
            </span>
            {POPULAR_ROUTE_PRESETS.map((pst) => (
              <button
                key={pst.name}
                type="button"
                onClick={() => {
                  handleOpenAddRoute();
                  handleApplyRoutePreset(pst);
                }}
                className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-medium transition cursor-pointer shadow-xs"
              >
                + {pst.name}
              </button>
            ))}
          </div>

          {/* Routes list */}
          <div className="space-y-4">
            {routes.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-10 text-center space-y-3">
                <Navigation className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="font-bold text-slate-700 dark:text-slate-200">No Routes Configured Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Click the button below to add your first transit corridor or choose one of our high-speed highway presets.
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddRoute}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add Route Now
                </button>
              </div>
            ) : (
              routes.map((rt) => (
                <div
                  key={rt.id}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-3 transition hover:border-slate-300 dark:hover:border-slate-600"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{rt.origin_city}</span>
                        <ArrowRight className="w-4 h-4 text-blue-600" />
                        <span>{rt.destination_city}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-mono">
                        {rt.distance_km || 250} KM • ~{rt.estimated_duration_hours || 5.5} hrs
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                          rt.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {rt.status || 'ACTIVE'}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleOpenEditRoute(rt)}
                        title="Edit Route & Stops"
                        className="px-2.5 py-1 text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded text-xs font-semibold flex items-center gap-1 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRoute(rt.id, `${rt.origin_city} ➔ ${rt.destination_city}`)}
                        title="Delete Route"
                        className="px-2.5 py-1 text-rose-600 hover:text-white hover:bg-rose-600 rounded text-xs font-semibold flex items-center gap-1 border border-rose-200 dark:border-rose-900/60 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500">{rt.description}</p>

                  {/* Route stops timeline */}
                  {rt.stops && rt.stops.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[11px] font-semibold text-slate-400 block mb-2">
                        Intermediate Stops & Boarding / Dropping Stations ({rt.stops.length}):
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        {rt.stops.map((st, i) => (
                          <div key={st.id || i} className="flex items-center gap-1.5 text-xs">
                            <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700/60 text-slate-800 dark:text-slate-200 rounded-md font-medium flex items-center gap-1.5 border border-slate-200/60 dark:border-slate-700">
                              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] flex items-center justify-center font-bold">
                                {st.sequence_order || i + 1}
                              </span>
                              <span>{st.stop_name}</span>
                              <div className="flex items-center gap-0.5 ml-0.5">
                                {st.can_board && (
                                  <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 uppercase" title="Boarding Allowed">
                                    Pick
                                  </span>
                                )}
                                {st.can_drop && (
                                  <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 uppercase" title="Dropping Allowed">
                                    Drop
                                  </span>
                                )}
                              </div>
                            </span>
                            {i < (rt.stops?.length || 0) - 1 && (
                              <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Add / Edit Route Modal */}
          {showRouteModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
              <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 my-8 space-y-4 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Navigation className="w-5 h-5 text-blue-600" />
                      <span>{editingRouteId ? 'Edit Travel Route' : 'Add New Travel Route'}</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configure origin, destination, highway distance, and ordered intermediate passenger stations.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRouteModal(false);
                      setEditingRouteId(null);
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Popular Presets Quick Selector */}
                {!editingRouteId && (
                  <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/50 space-y-2">
                    <span className="text-[11px] font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      Choose a Highway Route Preset to Auto-Fill:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {POPULAR_ROUTE_PRESETS.map((pst) => (
                        <button
                          key={pst.name}
                          type="button"
                          onClick={() => handleApplyRoutePreset(pst)}
                          className="px-2 py-1.5 bg-white dark:bg-slate-800 hover:border-blue-500 rounded-lg border border-slate-200 dark:border-slate-700 text-left transition cursor-pointer shadow-2xs"
                        >
                          <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200 block truncate">
                            {pst.name}
                          </span>
                          <span className="text-[9px] text-slate-400 block font-mono">
                            {pst.badge}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <form onSubmit={handleSaveRoute} className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
                  {/* Origin & Destination */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Origin City / Division *
                      </label>
                      <input
                        type="text"
                        required
                        value={newRoute.origin_city}
                        onChange={(e) => setNewRoute({ ...newRoute, origin_city: e.target.value })}
                        placeholder="e.g. Dhaka"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Destination City / Division *
                      </label>
                      <input
                        type="text"
                        required
                        value={newRoute.destination_city}
                        onChange={(e) => setNewRoute({ ...newRoute, destination_city: e.target.value })}
                        placeholder="e.g. Cox's Bazar, Rangpur, Sylhet"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Distance, Duration & Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Distance (KM)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={newRoute.distance_km}
                        onChange={(e) => setNewRoute({ ...newRoute, distance_km: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Estimated Duration (Hours)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.5"
                        value={newRoute.estimated_duration_hours}
                        onChange={(e) => setNewRoute({ ...newRoute, estimated_duration_hours: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Operational Status
                      </label>
                      <select
                        value={newRoute.status}
                        onChange={(e) => setNewRoute({ ...newRoute, status: e.target.value as 'active' | 'inactive' })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="active">Active (Available for Trips)</option>
                        <option value="inactive">Inactive / Seasonal</option>
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Route Description / Highway Notes
                    </label>
                    <input
                      type="text"
                      value={newRoute.description}
                      onChange={(e) => setNewRoute({ ...newRoute, description: e.target.value })}
                      placeholder="e.g. Direct express corridor via Paduar Bazar bypass and Meghna Bridge"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Route Stops Sequence Builder */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block text-xs">
                          Ordered Passenger Boarding & Dropping Stops ({newRoute.stops.length})
                        </span>
                        <span className="text-[11px] text-slate-400">
                          These stations appear on customer ticket search and live segment booking.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddIntermediateStop}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-[11px] font-bold shadow-xs transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Intermediate Stop</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {newRoute.stops.map((stop, idx) => (
                        <div
                          key={stop.id || idx}
                          className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center gap-2 text-xs"
                        >
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-slate-500 text-[11px] w-14">
                              {idx === 0
                                ? 'Start'
                                : idx === newRoute.stops.length - 1
                                ? 'End'
                                : `Stop ${idx + 1}`}
                            </span>
                          </div>

                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              required
                              placeholder="Station Name (e.g. Mohipal, Feni)"
                              value={stop.stop_name}
                              onChange={(e) => {
                                const updated = [...newRoute.stops];
                                updated[idx].stop_name = e.target.value;
                                setNewRoute({ ...newRoute, stops: updated });
                              }}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />

                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-400 font-mono">+Min:</span>
                                <input
                                  type="number"
                                  title="Minutes from departure"
                                  value={stop.arrival_offset_minutes}
                                  onChange={(e) => {
                                    const updated = [...newRoute.stops];
                                    const val = Number(e.target.value);
                                    updated[idx].arrival_offset_minutes = val;
                                    updated[idx].departure_offset_minutes = val + 10;
                                    setNewRoute({ ...newRoute, stops: updated });
                                  }}
                                  className="w-16 px-1.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-mono text-[11px]"
                                />
                              </div>

                              <label className="flex items-center gap-1 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={stop.can_board}
                                  onChange={(e) => {
                                    const updated = [...newRoute.stops];
                                    updated[idx].can_board = e.target.checked;
                                    setNewRoute({ ...newRoute, stops: updated });
                                  }}
                                  className="rounded text-blue-600"
                                />
                                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                  Board
                                </span>
                              </label>

                              <label className="flex items-center gap-1 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={stop.can_drop}
                                  onChange={(e) => {
                                    const updated = [...newRoute.stops];
                                    updated[idx].can_drop = e.target.checked;
                                    setNewRoute({ ...newRoute, stops: updated });
                                  }}
                                  className="rounded text-blue-600"
                                />
                                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
                                  Drop
                                </span>
                              </label>

                              {newRoute.stops.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStop(idx)}
                                  title="Remove Stop"
                                  className="p-1 text-slate-400 hover:text-rose-600 ml-auto transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => {
                        setShowRouteModal(false);
                        setEditingRouteId(null);
                      }}
                      className="px-4 py-2 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-md transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{editingRouteId ? 'Update Route' : 'Save & Publish Route'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
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
