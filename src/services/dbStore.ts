import {
  Tenant,
  Profile,
  Counter,
  CashSession,
  SeatLayout,
  SeatType,
  Bus,
  Route,
  RouteStop,
  Trip,
  TripStop,
  TripSegment,
  SeatLock,
  Booking,
  BookingSeat,
  Ticket,
  Payment,
  Refund,
  Expense,
  AuditLog,
  SupportTicket,
  SupportReply,
  Review,
} from '../types';
import { indexedDb } from './indexedDbAdapter';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

// Storage Key Constants
const STORAGE_PREFIX = 'BUSMASTER_SAAS_';

// Initial Mock Seed Data
const INITIAL_TENANTS: Tenant[] = [
  {
    id: 't-greenline-01',
    name: 'Green Line Paribahan',
    slug: 'green-line',
    logo_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=300&q=80',
    owner_name: 'Mohammad Alauddin',
    email: 'owner@greenline.bd',
    phone: '+880 1711-123456',
    address: '9/2 Outer Circular Road, Rajarbagh, Dhaka',
    trade_license: 'TRAD/DNCC/012948/2023',
    status: 'active',
    settings: {
      currency: 'BDT',
      currency_symbol: '৳',
      timezone: 'Asia/Dhaka',
      cancellation_allowed: true,
      cancellation_cutoff_hours: 12,
      refund_percentage: 85,
      primary_color: '#059669',
      secondary_color: '#10b981',
      hotline: '16223',
    },
  },
  {
    id: 't-hanif-02',
    name: 'Hanif Enterprise',
    slug: 'hanif-enterprise',
    logo_url: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=300&q=80',
    owner_name: 'Kofil Uddin',
    email: 'owner@hanif.bd',
    phone: '+880 1819-654321',
    address: 'Technical Intersection, Mirpur Road, Gabtoli, Dhaka',
    trade_license: 'TRAD/DNCC/098712/2022',
    status: 'active',
    settings: {
      currency: 'BDT',
      currency_symbol: '৳',
      timezone: 'Asia/Dhaka',
      cancellation_allowed: true,
      cancellation_cutoff_hours: 24,
      refund_percentage: 80,
      primary_color: '#dc2626',
      secondary_color: '#ef4444',
      hotline: '16334',
    },
  },
  {
    id: 't-shohag-03',
    name: 'Shohag Paribahan',
    slug: 'shohag-paribahan',
    logo_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=300&q=80',
    owner_name: 'Faruk Talukder',
    email: 'owner@shohag.bd',
    phone: '+880 1912-987654',
    address: '63 DIT Road, Malibagh, Dhaka',
    trade_license: 'TRAD/DSCC/034567/2024',
    status: 'approved',
    settings: {
      currency: 'BDT',
      currency_symbol: '৳',
      timezone: 'Asia/Dhaka',
      cancellation_allowed: true,
      cancellation_cutoff_hours: 12,
      refund_percentage: 90,
      primary_color: '#2563eb',
      secondary_color: '#3b82f6',
      hotline: '16445',
    },
  },
];

const INITIAL_PROFILES: Profile[] = [
  {
    id: 'p-super-primary',
    email: 'superadmin@gmail.com',
    password: 'superadmin',
    full_name: 'Super Admin',
    phone: '+880 1700-999999',
    role: 'super_admin',
    tenant_id: null,
    is_active: true,
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
  },
  {
    id: 'p-super-01',
    email: 'admin@busmaster.com',
    full_name: 'Tariqul Islam (Super Admin)',
    phone: '+880 1700-000001',
    role: 'super_admin',
    tenant_id: null,
    is_active: true,
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
  },
  {
    id: 'p-gl-owner-01',
    email: 'owner@greenline.bd',
    full_name: 'Mohammad Alauddin (Green Line Owner)',
    phone: '+880 1711-123456',
    role: 'company_owner',
    tenant_id: 't-greenline-01',
    is_active: true,
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
  },
  {
    id: 'p-gl-mgr-01',
    email: 'manager.arambagh@greenline.bd',
    full_name: 'Kabir Hossain (Arambagh Manager)',
    phone: '+880 1711-123457',
    role: 'counter_manager',
    tenant_id: 't-greenline-01',
    counter_id: 'cnt-gl-01',
    is_active: true,
  },
  {
    id: 'p-gl-agent-01',
    email: 'agent1@greenline.bd',
    full_name: 'Sumon Mia (Counter Agent)',
    phone: '+880 1711-123458',
    role: 'counter_agent',
    tenant_id: 't-greenline-01',
    counter_id: 'cnt-gl-01',
    is_active: true,
  },
  {
    id: 'p-gl-driver-01',
    email: 'driver.kalam@greenline.bd',
    full_name: 'Abul Kalam (Senior Driver)',
    phone: '+880 1711-123459',
    role: 'driver',
    tenant_id: 't-greenline-01',
    is_active: true,
  },
  {
    id: 'p-gl-sup-01',
    email: 'supervisor.rafiq@greenline.bd',
    full_name: 'Rafiqul Islam (Operations Supervisor)',
    phone: '+880 1711-123460',
    role: 'supervisor',
    tenant_id: 't-greenline-01',
    is_active: true,
  },
  {
    id: 'p-customer-01',
    email: 'passenger@example.com',
    full_name: 'Tanvir Ahmed (Passenger)',
    phone: '+880 1811-998877',
    role: 'customer',
    tenant_id: null,
    is_active: true,
  },
  {
    id: 'p-hn-owner-01',
    email: 'owner@hanif.bd',
    full_name: 'Kofil Uddin (Hanif Owner)',
    phone: '+880 1819-654321',
    role: 'company_owner',
    tenant_id: 't-hanif-02',
    is_active: true,
  },
  {
    id: 'p-hn-driver-01',
    email: 'driver.babul@hanif.bd',
    full_name: 'Md. Babul Akter (Hanif Senior Driver)',
    phone: '+880 1819-112233',
    role: 'driver',
    tenant_id: 't-hanif-02',
    license_number: 'BRTA-PROF-DL-554421',
    is_active: true,
  },
  {
    id: 'p-hn-mgr-01',
    email: 'manager.gabtoli@hanif.bd',
    full_name: 'Rashedul Islam (Gabtoli Manager)',
    phone: '+880 1819-334455',
    role: 'counter_manager',
    tenant_id: 't-hanif-02',
    counter_id: 'cnt-hanif-01',
    is_active: true,
  },
  {
    id: 'p-sh-owner-01',
    email: 'owner@shohag.bd',
    full_name: 'Faruk Talukder (Shohag Owner)',
    phone: '+880 1912-987654',
    role: 'company_owner',
    tenant_id: 't-shohag-03',
    is_active: true,
  },
  {
    id: 'p-sh-driver-01',
    email: 'driver.rafiq@shohag.bd',
    full_name: 'Md. Rafiqul Hasan (Shohag Senior Driver)',
    phone: '+880 1912-112233',
    role: 'driver',
    tenant_id: 't-shohag-03',
    license_number: 'BRTA-PROF-DL-773412',
    is_active: true,
  },
  {
    id: 'p-sh-mgr-01',
    email: 'manager.malibagh@shohag.bd',
    full_name: 'Zahid Hossain (Malibagh Manager)',
    phone: '+880 1912-223344',
    role: 'counter_manager',
    tenant_id: 't-shohag-03',
    counter_id: 'cnt-sh-01',
    is_active: true,
  },
  {
    id: 'p-sh-agent-01',
    email: 'agent.malibagh@shohag.bd',
    full_name: 'Nasir Ahmed (Counter Agent)',
    phone: '+880 1912-334455',
    role: 'counter_agent',
    tenant_id: 't-shohag-03',
    counter_id: 'cnt-sh-01',
    is_active: true,
  },
];

const INITIAL_COUNTERS: Counter[] = [
  {
    id: 'cnt-gl-01',
    tenant_id: 't-greenline-01',
    name: 'Arambagh Central Counter',
    code: 'GL-ARB-01',
    city: 'Dhaka',
    address: '12 Arambagh Motijheel, Dhaka',
    contact_phone: '+880 1711-123457',
    manager_id: 'p-gl-mgr-01',
    status: 'active',
  },
  {
    id: 'cnt-gl-02',
    tenant_id: 't-greenline-01',
    name: 'Sayedabad Terminal Counter',
    code: 'GL-SYD-02',
    city: 'Dhaka',
    address: 'Sayedabad Bus Terminal Platform 4, Dhaka',
    contact_phone: '+880 1711-123461',
    status: 'active',
  },
  {
    id: 'cnt-gl-03',
    tenant_id: 't-greenline-01',
    name: 'Dampara Counter',
    code: 'GL-CTG-01',
    city: 'Chattogram',
    address: 'Dampara Bus Stand, Chattogram',
    contact_phone: '+880 1711-123462',
    status: 'active',
  },
  {
    id: 'cnt-hanif-01',
    tenant_id: 't-hanif-02',
    name: 'Gabtoli Head Office Counter',
    code: 'HN-GBT-01',
    city: 'Dhaka',
    address: 'Gabtoli Inter-District Bus Terminal, Dhaka',
    contact_phone: '+880 1819-654321',
    status: 'active',
  },
  {
    id: 'cnt-sh-01',
    tenant_id: 't-shohag-03',
    name: 'Malibagh Central Counter',
    code: 'SH-MLB-01',
    city: 'Dhaka',
    address: '63 DIT Road, Malibagh, Dhaka',
    contact_phone: '+880 1912-987654',
    manager_id: 'p-sh-mgr-01',
    status: 'active',
  },
  {
    id: 'cnt-sh-02',
    tenant_id: 't-shohag-03',
    name: 'Dampara Counter',
    code: 'SH-CTG-01',
    city: 'Chattogram',
    address: 'Dampara Bus Stand, Chattogram',
    contact_phone: '+880 1912-987655',
    status: 'active',
  },
];

const INITIAL_SEAT_LAYOUTS: SeatLayout[] = [
  {
    id: 'layout-gl-scania-36',
    tenant_id: 't-greenline-01',
    name: 'Scania Multi-Axle Luxury & Sleeper (36 Seats)',
    rows_count: 9,
    cols_count: 4,
    decks_count: 1,
    layout_type: '2+2',
    is_template: true,
    grid_data: [
      // Row 1: A1, A2 = Sleeper Berths; A3, A4 = Priority Accessible / Disabled by Entrance
      { seat_number: 'A1', deck: 1, row: 1, col: 1, type: 'sleeper', price_multiplier: 1.25, extra_fare: 350 },
      { seat_number: 'A2', deck: 1, row: 1, col: 2, type: 'sleeper', price_multiplier: 1.25, extra_fare: 350 },
      { seat_number: 'A3', deck: 1, row: 1, col: 3, type: 'disabled', is_accessible: true, price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'A4', deck: 1, row: 1, col: 4, type: 'disabled', is_accessible: true, price_multiplier: 1.0, extra_fare: 0 },
      // Row 2: B1, B2 = Sleeper Berths; B3, B4 = Regular
      { seat_number: 'B1', deck: 1, row: 2, col: 1, type: 'sleeper', price_multiplier: 1.25, extra_fare: 350 },
      { seat_number: 'B2', deck: 1, row: 2, col: 2, type: 'sleeper', price_multiplier: 1.25, extra_fare: 350 },
      { seat_number: 'B3', deck: 1, row: 2, col: 3, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'B4', deck: 1, row: 2, col: 4, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
      // Row 3: C1, C2 = Regular; C3, C4 = Female Reserved
      { seat_number: 'C1', deck: 1, row: 3, col: 1, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'C2', deck: 1, row: 3, col: 2, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'C3', deck: 1, row: 3, col: 3, type: 'female', price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'C4', deck: 1, row: 3, col: 4, type: 'female', price_multiplier: 1.0, extra_fare: 0 },
      // Row 4: D1..D4 = Regular
      { seat_number: 'D1', deck: 1, row: 4, col: 1, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'D2', deck: 1, row: 4, col: 2, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'D3', deck: 1, row: 4, col: 3, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'D4', deck: 1, row: 4, col: 4, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
      // Row 5: E1..E4 = VIP / Business Recliners
      { seat_number: 'E1', deck: 1, row: 5, col: 1, type: 'premium', price_multiplier: 1.15, extra_fare: 200 },
      { seat_number: 'E2', deck: 1, row: 5, col: 2, type: 'premium', price_multiplier: 1.15, extra_fare: 200 },
      { seat_number: 'E3', deck: 1, row: 5, col: 3, type: 'premium', price_multiplier: 1.15, extra_fare: 200 },
      { seat_number: 'E4', deck: 1, row: 5, col: 4, type: 'premium', price_multiplier: 1.15, extra_fare: 200 },
      // Rows 6 to 9 = Regular
      { seat_number: 'F1', deck: 1, row: 6, col: 1, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'F2', deck: 1, row: 6, col: 2, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'F3', deck: 1, row: 6, col: 3, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'F4', deck: 1, row: 6, col: 4, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'G1', deck: 1, row: 7, col: 1, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'G2', deck: 1, row: 7, col: 2, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'G3', deck: 1, row: 7, col: 3, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'G4', deck: 1, row: 7, col: 4, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'H1', deck: 1, row: 8, col: 1, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'H2', deck: 1, row: 8, col: 2, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'H3', deck: 1, row: 8, col: 3, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'H4', deck: 1, row: 8, col: 4, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'I1', deck: 1, row: 9, col: 1, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'I2', deck: 1, row: 9, col: 2, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'I3', deck: 1, row: 9, col: 3, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'I4', deck: 1, row: 9, col: 4, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
    ],
  },
  {
    id: 'layout-gl-sleeper-24',
    tenant_id: 't-greenline-01',
    name: 'Royal Sleeper Coach 2+1 (24 Berths)',
    rows_count: 8,
    cols_count: 3,
    decks_count: 1,
    layout_type: 'sleeper',
    is_template: true,
    grid_data: [
      { seat_number: 'S1', deck: 1, row: 1, col: 1, type: 'disabled', is_accessible: true, price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'S2', deck: 1, row: 1, col: 2, type: 'sleeper', price_multiplier: 1.3, extra_fare: 450 },
      { seat_number: 'S3', deck: 1, row: 1, col: 3, type: 'sleeper', price_multiplier: 1.3, extra_fare: 450 },
      { seat_number: 'S4', deck: 1, row: 2, col: 1, type: 'sleeper', price_multiplier: 1.3, extra_fare: 450 },
      { seat_number: 'S5', deck: 1, row: 2, col: 2, type: 'sleeper', price_multiplier: 1.3, extra_fare: 450 },
      { seat_number: 'S6', deck: 1, row: 2, col: 3, type: 'sleeper', price_multiplier: 1.3, extra_fare: 450 },
      { seat_number: 'S7', deck: 1, row: 3, col: 1, type: 'female', price_multiplier: 1.3, extra_fare: 450 },
      { seat_number: 'S8', deck: 1, row: 3, col: 2, type: 'sleeper', price_multiplier: 1.3, extra_fare: 450 },
      { seat_number: 'S9', deck: 1, row: 3, col: 3, type: 'sleeper', price_multiplier: 1.3, extra_fare: 450 },
      { seat_number: 'S10', deck: 1, row: 4, col: 1, type: 'sleeper', price_multiplier: 1.3, extra_fare: 450 },
      { seat_number: 'S11', deck: 1, row: 4, col: 2, type: 'sleeper', price_multiplier: 1.3, extra_fare: 450 },
      { seat_number: 'S12', deck: 1, row: 4, col: 3, type: 'sleeper', price_multiplier: 1.3, extra_fare: 450 },
      { seat_number: 'S13', deck: 1, row: 5, col: 1, type: 'sleeper', price_multiplier: 1.3, extra_fare: 450 },
      { seat_number: 'S14', deck: 1, row: 5, col: 2, type: 'sleeper', price_multiplier: 1.3, extra_fare: 450 },
      { seat_number: 'S15', deck: 1, row: 5, col: 3, type: 'sleeper', price_multiplier: 1.3, extra_fare: 450 },
      { seat_number: 'S16', deck: 1, row: 6, col: 1, type: 'sleeper', price_multiplier: 1.3, extra_fare: 450 },
      { seat_number: 'S17', deck: 1, row: 6, col: 2, type: 'sleeper', price_multiplier: 1.3, extra_fare: 450 },
      { seat_number: 'S18', deck: 1, row: 6, col: 3, type: 'sleeper', price_multiplier: 1.3, extra_fare: 450 },
      { seat_number: 'S19', deck: 1, row: 7, col: 1, type: 'sleeper', price_multiplier: 1.3, extra_fare: 450 },
      { seat_number: 'S20', deck: 1, row: 7, col: 2, type: 'sleeper', price_multiplier: 1.3, extra_fare: 450 },
      { seat_number: 'S21', deck: 1, row: 7, col: 3, type: 'sleeper', price_multiplier: 1.3, extra_fare: 450 },
      { seat_number: 'S22', deck: 1, row: 8, col: 1, type: 'sleeper', price_multiplier: 1.3, extra_fare: 450 },
      { seat_number: 'S23', deck: 1, row: 8, col: 2, type: 'sleeper', price_multiplier: 1.3, extra_fare: 450 },
      { seat_number: 'S24', deck: 1, row: 8, col: 3, type: 'sleeper', price_multiplier: 1.3, extra_fare: 450 },
    ],
  },
  {
    id: 'layout-gl-business-28',
    tenant_id: 't-greenline-01',
    name: 'Executive Business 2+1 (28 Seats)',
    rows_count: 9,
    cols_count: 3,
    decks_count: 1,
    layout_type: '2+1',
    is_template: true,
    grid_data: [
      { seat_number: 'A1', deck: 1, row: 1, col: 1, type: 'disabled', is_accessible: true, price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'A2', deck: 1, row: 1, col: 2, type: 'premium', price_multiplier: 1.15, extra_fare: 200 },
      { seat_number: 'A3', deck: 1, row: 1, col: 3, type: 'premium', price_multiplier: 1.15, extra_fare: 200 },
      { seat_number: 'B1', deck: 1, row: 2, col: 1, type: 'sleeper', price_multiplier: 1.25, extra_fare: 350 },
      { seat_number: 'B2', deck: 1, row: 2, col: 2, type: 'sleeper', price_multiplier: 1.25, extra_fare: 350 },
      { seat_number: 'B3', deck: 1, row: 2, col: 3, type: 'premium', price_multiplier: 1.15, extra_fare: 200 },
      { seat_number: 'C1', deck: 1, row: 3, col: 1, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'C2', deck: 1, row: 3, col: 2, type: 'female', price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'C3', deck: 1, row: 3, col: 3, type: 'female', price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'D1', deck: 1, row: 4, col: 1, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'D2', deck: 1, row: 4, col: 2, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'D3', deck: 1, row: 4, col: 3, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'E1', deck: 1, row: 5, col: 1, type: 'premium', price_multiplier: 1.15, extra_fare: 200 },
      { seat_number: 'E2', deck: 1, row: 5, col: 2, type: 'premium', price_multiplier: 1.15, extra_fare: 200 },
      { seat_number: 'E3', deck: 1, row: 5, col: 3, type: 'premium', price_multiplier: 1.15, extra_fare: 200 },
      { seat_number: 'F1', deck: 1, row: 6, col: 1, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'F2', deck: 1, row: 6, col: 2, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'F3', deck: 1, row: 6, col: 3, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'G1', deck: 1, row: 7, col: 1, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'G2', deck: 1, row: 7, col: 2, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'G3', deck: 1, row: 7, col: 3, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'H1', deck: 1, row: 8, col: 1, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'H2', deck: 1, row: 8, col: 2, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'H3', deck: 1, row: 8, col: 3, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'I1', deck: 1, row: 9, col: 1, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'I2', deck: 1, row: 9, col: 2, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
      { seat_number: 'I3', deck: 1, row: 9, col: 3, type: 'regular', price_multiplier: 1.0, extra_fare: 0 },
    ],
  },
];

const INITIAL_BUSES: Bus[] = [
  {
    id: 'bus-gl-101',
    tenant_id: 't-greenline-01',
    name: 'Green Line Scania Multi-Axle #101',
    reg_no: 'DHAKA-METRO-BA-11-2024',
    bus_type: 'AC',
    total_capacity: 36,
    deck_config: 'single',
    seat_layout_id: 'layout-gl-scania-36',
    manufacturer: 'Scania',
    model: 'Metrolink Multi-Axle HD',
    year: 2023,
    fitness_expiry: '2027-12-31',
    insurance_expiry: '2027-12-31',
    assigned_driver_id: 'p-gl-driver-01',
    status: 'active',
  },
  {
    id: 'bus-gl-102',
    tenant_id: 't-greenline-01',
    name: 'Green Line Volvo B9R #102',
    reg_no: 'DHAKA-METRO-BA-11-8899',
    bus_type: 'Executive-AC',
    total_capacity: 28,
    deck_config: 'single',
    seat_layout_id: 'layout-gl-business-28',
    manufacturer: 'Volvo',
    model: 'B9R 9400',
    year: 2024,
    status: 'active',
  },
  {
    id: 'bus-hn-201',
    tenant_id: 't-hanif-02',
    name: 'Hanif Enterprise Hino 1J #505',
    reg_no: 'DHAKA-METRO-BA-14-3456',
    bus_type: 'Non-AC',
    total_capacity: 40,
    deck_config: 'single',
    manufacturer: 'Hino',
    model: 'AK1J',
    year: 2022,
    assigned_driver_id: 'p-hn-driver-01',
    status: 'active',
  },
  {
    id: 'bus-hn-202',
    tenant_id: 't-hanif-02',
    name: 'Hanif Volvo B11R Multi-Axle #707',
    reg_no: 'DHAKA-METRO-BA-14-9988',
    bus_type: 'AC',
    total_capacity: 36,
    deck_config: 'single',
    seat_layout_id: 'layout-gl-scania-36',
    manufacturer: 'Volvo',
    model: 'B11R',
    year: 2023,
    status: 'active',
  },
  {
    id: 'bus-sh-301',
    tenant_id: 't-shohag-03',
    name: 'Shohag Scania ComfortClass #301',
    reg_no: 'DHAKA-METRO-BA-15-7788',
    bus_type: 'AC',
    total_capacity: 36,
    deck_config: 'single',
    seat_layout_id: 'layout-gl-scania-36',
    manufacturer: 'Scania',
    model: 'Touring HD',
    year: 2024,
    fitness_expiry: '2028-06-30',
    insurance_expiry: '2028-06-30',
    assigned_driver_id: 'p-sh-driver-01',
    status: 'active',
  },
  {
    id: 'bus-sh-302',
    tenant_id: 't-shohag-03',
    name: 'Shohag Hyundai Universe Express #302',
    reg_no: 'DHAKA-METRO-BA-15-9922',
    bus_type: 'Executive-AC',
    total_capacity: 28,
    deck_config: 'single',
    seat_layout_id: 'layout-gl-business-28',
    manufacturer: 'Hyundai',
    model: 'Universe Space Luxury',
    year: 2024,
    status: 'active',
  },
];

const INITIAL_ROUTES: Route[] = [
  {
    id: 'rt-dhk-ctg',
    tenant_id: 't-greenline-01',
    origin_city: 'Dhaka',
    destination_city: 'Chattogram',
    distance_km: 250,
    estimated_duration_hours: 5.5,
    status: 'active',
    description: 'Direct Highway route via Cumilla Paduar Bazar & Feni Mohipal bypass',
    stops: [
      {
        id: 'stop-1',
        tenant_id: 't-greenline-01',
        route_id: 'rt-dhk-ctg',
        stop_name: 'Arambagh (Dhaka)',
        sequence_order: 1,
        arrival_offset_minutes: 0,
        departure_offset_minutes: 0,
        can_board: true,
        can_drop: false,
        counter_id: 'cnt-gl-01',
      },
      {
        id: 'stop-2',
        tenant_id: 't-greenline-01',
        route_id: 'rt-dhk-ctg',
        stop_name: 'Paduar Bazar (Cumilla)',
        sequence_order: 2,
        arrival_offset_minutes: 120,
        departure_offset_minutes: 130,
        can_board: true,
        can_drop: true,
      },
      {
        id: 'stop-3',
        tenant_id: 't-greenline-01',
        route_id: 'rt-dhk-ctg',
        stop_name: 'Mohipal (Feni)',
        sequence_order: 3,
        arrival_offset_minutes: 190,
        departure_offset_minutes: 200,
        can_board: true,
        can_drop: true,
      },
      {
        id: 'stop-4',
        tenant_id: 't-greenline-01',
        route_id: 'rt-dhk-ctg',
        stop_name: 'Dampara (Chattogram)',
        sequence_order: 4,
        arrival_offset_minutes: 330,
        departure_offset_minutes: 330,
        can_board: false,
        can_drop: true,
        counter_id: 'cnt-gl-03',
      },
    ],
  },
  {
    id: 'rt-dhk-syl',
    tenant_id: 't-greenline-01',
    origin_city: 'Dhaka',
    destination_city: 'Sylhet',
    distance_km: 240,
    estimated_duration_hours: 6.0,
    status: 'active',
    description: 'Dhaka to Sylhet via Narsingdi, Bhairab, Brahmanbaria and Habiganj',
  },
  {
    id: 'rt-dhk-cox',
    tenant_id: 't-greenline-01',
    origin_city: 'Dhaka',
    destination_city: "Cox's Bazar",
    distance_km: 390,
    estimated_duration_hours: 8.5,
    status: 'active',
    description: 'Express luxury service to Coxs Bazar beach town',
  },
  {
    id: 'rt-dhk-rng',
    tenant_id: 't-hanif-02',
    origin_city: 'Dhaka',
    destination_city: 'Rangpur',
    distance_km: 310,
    estimated_duration_hours: 7.0,
    status: 'active',
    description: 'Dhaka Gabtoli to Rangpur via Jamuna Bridge and Bogura',
  },
  {
    id: 'rt-sh-dhk-ctg',
    tenant_id: 't-shohag-03',
    origin_city: 'Dhaka',
    destination_city: 'Chattogram',
    distance_km: 250,
    estimated_duration_hours: 5.5,
    status: 'active',
    description: 'Shohag Luxury service from Dhaka Malibagh to Chattogram Dampara',
    stops: [
      {
        id: 'sh-stop-1',
        tenant_id: 't-shohag-03',
        route_id: 'rt-sh-dhk-ctg',
        stop_name: 'Malibagh (Dhaka)',
        sequence_order: 1,
        arrival_offset_minutes: 0,
        departure_offset_minutes: 0,
        can_board: true,
        can_drop: false,
        counter_id: 'cnt-sh-01',
      },
      {
        id: 'sh-stop-2',
        tenant_id: 't-shohag-03',
        route_id: 'rt-sh-dhk-ctg',
        stop_name: 'Paduar Bazar (Cumilla)',
        sequence_order: 2,
        arrival_offset_minutes: 120,
        departure_offset_minutes: 130,
        can_board: true,
        can_drop: true,
      },
      {
        id: 'sh-stop-3',
        tenant_id: 't-shohag-03',
        route_id: 'rt-sh-dhk-ctg',
        stop_name: 'Dampara (Chattogram)',
        sequence_order: 3,
        arrival_offset_minutes: 330,
        departure_offset_minutes: 330,
        can_board: false,
        can_drop: true,
        counter_id: 'cnt-sh-02',
      },
    ],
  },
  {
    id: 'rt-sh-dhk-cox',
    tenant_id: 't-shohag-03',
    origin_city: 'Dhaka',
    destination_city: "Cox's Bazar",
    distance_km: 390,
    estimated_duration_hours: 8.5,
    status: 'active',
    description: 'Shohag Elite AC Sleeper/Executive direct to Coxs Bazar',
  },
];

// Today's ISO date string
const TODAY_STR = new Date().toISOString().split('T')[0];

const INITIAL_TRIPS: Trip[] = [
  {
    id: 'trip-gl-001',
    tenant_id: 't-greenline-01',
    route_id: 'rt-dhk-ctg',
    bus_id: 'bus-gl-101',
    driver_id: 'p-gl-driver-01',
    trip_code: 'GL-DHK-CTG-0600',
    departure_date: TODAY_STR,
    departure_time: '06:00',
    arrival_estimate: `${TODAY_STR}T11:30:00`,
    base_fare: 1400,
    status: 'scheduled',
  },
  {
    id: 'trip-gl-002',
    tenant_id: 't-greenline-01',
    route_id: 'rt-dhk-ctg',
    bus_id: 'bus-gl-102',
    trip_code: 'GL-DHK-CTG-1030',
    departure_date: TODAY_STR,
    departure_time: '10:30',
    arrival_estimate: `${TODAY_STR}T16:00:00`,
    base_fare: 1600,
    status: 'scheduled',
  },
  {
    id: 'trip-gl-003',
    tenant_id: 't-greenline-01',
    route_id: 'rt-dhk-syl',
    bus_id: 'bus-gl-101',
    trip_code: 'GL-DHK-SYL-1400',
    departure_date: TODAY_STR,
    departure_time: '14:00',
    arrival_estimate: `${TODAY_STR}T20:00:00`,
    base_fare: 1200,
    status: 'scheduled',
  },
  {
    id: 'trip-hn-101',
    tenant_id: 't-hanif-02',
    route_id: 'rt-dhk-rng',
    bus_id: 'bus-hn-201',
    driver_id: 'p-hn-driver-01',
    trip_code: 'HN-DHK-RNG-0800',
    departure_date: TODAY_STR,
    departure_time: '08:00',
    arrival_estimate: `${TODAY_STR}T15:00:00`,
    base_fare: 850,
    status: 'scheduled',
  },
  {
    id: 'trip-sh-001',
    tenant_id: 't-shohag-03',
    route_id: 'rt-sh-dhk-ctg',
    bus_id: 'bus-sh-301',
    driver_id: 'p-sh-driver-01',
    trip_code: 'SH-DHK-CTG-0730',
    departure_date: TODAY_STR,
    departure_time: '07:30',
    arrival_estimate: `${TODAY_STR}T13:00:00`,
    base_fare: 1500,
    status: 'scheduled',
  },
  {
    id: 'trip-sh-002',
    tenant_id: 't-shohag-03',
    route_id: 'rt-sh-dhk-ctg',
    bus_id: 'bus-sh-302',
    trip_code: 'SH-DHK-CTG-2300',
    departure_date: TODAY_STR,
    departure_time: '23:00',
    arrival_estimate: `${TODAY_STR}T04:30:00`,
    base_fare: 1600,
    status: 'scheduled',
  },
];

// Initial bookings showcasing segment capability!
// Example: Trip 'trip-gl-001' (Dhaka -> Cumilla -> Feni -> Chattogram)
// Seat A1 is booked for Dhaka -> Cumilla by Passenger 1
// And Seat A1 is ALSO booked for Cumilla -> Chattogram by Passenger 2 without conflict!
const INITIAL_BOOKINGS: Booking[] = [
  {
    id: 'bk-001',
    tenant_id: 't-greenline-01',
    booking_ref: 'BM-GL-1001',
    trip_id: 'trip-gl-001',
    counter_id: 'cnt-gl-01',
    booked_by_user_id: 'p-gl-agent-01',
    booking_source: 'counter',
    passenger_name: 'Mahbubur Rahman',
    passenger_phone: '01712-345678',
    from_stop_name: 'Arambagh (Dhaka)',
    to_stop_name: 'Paduar Bazar (Cumilla)',
    from_seq: 1,
    to_seq: 2,
    boarding_point: 'Arambagh Central Counter',
    dropping_point: 'Paduar Bazar Highway Bypass',
    seat_count: 1,
    subtotal_fare: 450,
    discount_amount: 0,
    total_payable: 450,
    payment_status: 'completed',
    ticket_status: 'confirmed',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    seats: [
      {
        id: 'bks-01',
        tenant_id: 't-greenline-01',
        booking_id: 'bk-001',
        trip_id: 'trip-gl-001',
        seat_number: 'A1',
        seat_type: 'regular',
        fare: 450,
        from_seq: 1,
        to_seq: 2,
      },
    ],
    tickets: [
      {
        id: 'tkt-01',
        tenant_id: 't-greenline-01',
        ticket_number: 'TKT-GL-89101',
        booking_id: 'bk-001',
        trip_id: 'trip-gl-001',
        seat_number: 'A1',
        passenger_name: 'Mahbubur Rahman',
        qr_code_hash: 'QR-HASH-GL-89101',
        is_boarded: false,
        reprint_count: 0,
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
    ],
  },
  {
    id: 'bk-002',
    tenant_id: 't-greenline-01',
    booking_ref: 'BM-GL-1002',
    trip_id: 'trip-gl-001',
    counter_id: 'cnt-gl-01',
    booked_by_user_id: 'p-gl-agent-01',
    booking_source: 'counter',
    passenger_name: 'Sadia Sultana',
    passenger_phone: '01819-223344',
    from_stop_name: 'Paduar Bazar (Cumilla)',
    to_stop_name: 'Dampara (Chattogram)',
    from_seq: 2,
    to_seq: 4,
    boarding_point: 'Paduar Bazar Highway Stand',
    dropping_point: 'Dampara Bus Stand',
    seat_count: 1,
    subtotal_fare: 950,
    discount_amount: 0,
    total_payable: 950,
    payment_status: 'completed',
    ticket_status: 'confirmed',
    created_at: new Date(Date.now() - 3000000).toISOString(),
    seats: [
      {
        id: 'bks-02',
        tenant_id: 't-greenline-01',
        booking_id: 'bk-002',
        trip_id: 'trip-gl-001',
        seat_number: 'A1', // SAME SEAT A1, NON-OVERLAPPING SEGMENT!
        seat_type: 'regular',
        fare: 950,
        from_seq: 2,
        to_seq: 4,
      },
    ],
    tickets: [
      {
        id: 'tkt-02',
        tenant_id: 't-greenline-01',
        ticket_number: 'TKT-GL-89102',
        booking_id: 'bk-002',
        trip_id: 'trip-gl-001',
        seat_number: 'A1',
        passenger_name: 'Sadia Sultana',
        qr_code_hash: 'QR-HASH-GL-89102',
        is_boarded: false,
        reprint_count: 0,
        created_at: new Date(Date.now() - 3000000).toISOString(),
      },
    ],
  },
  {
    id: 'bk-003',
    tenant_id: 't-greenline-01',
    booking_ref: 'BM-GL-1003',
    trip_id: 'trip-gl-001',
    booking_source: 'online',
    passenger_name: 'Tanvir Ahmed',
    passenger_phone: '01811-998877',
    passenger_email: 'passenger@example.com',
    from_stop_name: 'Arambagh (Dhaka)',
    to_stop_name: 'Dampara (Chattogram)',
    from_seq: 1,
    to_seq: 4,
    boarding_point: 'Arambagh Central Counter',
    dropping_point: 'Dampara Counter',
    seat_count: 2,
    subtotal_fare: 2800,
    discount_amount: 100,
    total_payable: 2700,
    payment_status: 'completed',
    ticket_status: 'confirmed',
    created_at: new Date(Date.now() - 1800000).toISOString(),
    seats: [
      {
        id: 'bks-03',
        tenant_id: 't-greenline-01',
        booking_id: 'bk-003',
        trip_id: 'trip-gl-001',
        seat_number: 'B1',
        seat_type: 'regular',
        fare: 1400,
        from_seq: 1,
        to_seq: 4,
      },
      {
        id: 'bks-04',
        tenant_id: 't-greenline-01',
        booking_id: 'bk-003',
        trip_id: 'trip-gl-001',
        seat_number: 'B2',
        seat_type: 'regular',
        fare: 1400,
        from_seq: 1,
        to_seq: 4,
      },
    ],
    tickets: [
      {
        id: 'tkt-03',
        tenant_id: 't-greenline-01',
        ticket_number: 'TKT-GL-89103-1',
        booking_id: 'bk-003',
        trip_id: 'trip-gl-001',
        seat_number: 'B1',
        passenger_name: 'Tanvir Ahmed',
        qr_code_hash: 'QR-HASH-GL-89103-1',
        is_boarded: false,
        reprint_count: 0,
        created_at: new Date(Date.now() - 1800000).toISOString(),
      },
      {
        id: 'tkt-04',
        tenant_id: 't-greenline-01',
        ticket_number: 'TKT-GL-89103-2',
        booking_id: 'bk-003',
        trip_id: 'trip-gl-001',
        seat_number: 'B2',
        passenger_name: 'Tanvir Ahmed',
        qr_code_hash: 'QR-HASH-GL-89103-2',
        is_boarded: false,
        reprint_count: 0,
        created_at: new Date(Date.now() - 1800000).toISOString(),
      },
    ],
  },
];

const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'exp-01',
    tenant_id: 't-greenline-01',
    category: 'fuel',
    title: 'Diesel refill 120 Liters - Padma Oil',
    amount: 14400,
    expense_date: TODAY_STR,
    bus_id: 'bus-gl-101',
    recorded_by: 'p-gl-mgr-01',
    notes: 'Voucher #10892 - Kanchpur Petrol Pump',
  },
  {
    id: 'exp-02',
    tenant_id: 't-greenline-01',
    category: 'terminal_toll',
    title: 'Meghna & Gumti Bridge Toll',
    amount: 1600,
    expense_date: TODAY_STR,
    bus_id: 'bus-gl-101',
    recorded_by: 'p-gl-mgr-01',
  },
  {
    id: 'exp-03',
    tenant_id: 't-greenline-01',
    category: 'counter_rent',
    title: 'Arambagh Counter Monthly Rent Advance',
    amount: 35000,
    expense_date: TODAY_STR,
    counter_id: 'cnt-gl-01',
    recorded_by: 'p-gl-mgr-01',
  },
];

const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud-01',
    tenant_id: 't-greenline-01',
    actor_id: 'p-gl-owner-01',
    actor_name: 'Mohammad Alauddin',
    actor_role: 'company_owner',
    action: 'DISPATCH_SCHEDULE',
    entity_type: 'TRIP',
    entity_id: 'trip-gl-001',
    details: { message: 'Approved trip dispatch for Dhaka to Chattogram 06:00 AM' },
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'aud-02',
    tenant_id: 't-greenline-01',
    actor_id: 'p-gl-agent-01',
    actor_name: 'Sumon Mia',
    actor_role: 'counter_agent',
    action: 'CREATE_BOOKING',
    entity_type: 'BOOKING',
    entity_id: 'bk-001',
    details: { booking_ref: 'BM-GL-1001', seats: ['A1'], segment: 'Dhaka -> Cumilla' },
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
];

const INITIAL_CASH_SESSIONS: CashSession[] = [
  {
    id: 'cs-01',
    tenant_id: 't-greenline-01',
    counter_id: 'cnt-gl-01',
    opened_by: 'p-gl-agent-01',
    opened_at: `${TODAY_STR}T05:30:00`,
    opening_balance: 5000,
    cash_collected: 1400,
    cash_refunded: 0,
    expected_balance: 6400,
    status: 'open',
    notes: 'Morning shift opening cash drawer',
  },
];

const INITIAL_SUPPORT_TICKETS: SupportTicket[] = [
  {
    id: 'st-01',
    tenant_id: 't-greenline-01',
    booking_ref: 'BM-GL-1001',
    subject: 'Inquiry regarding baggage luggage limit for Scania bus',
    message: 'Can I bring 2 medium suitcases on the morning 06:00 AM trip to Chattogram?',
    priority: 'normal',
    status: 'resolved',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    replies: [
      {
        id: 'rep-01',
        ticket_id: 'st-01',
        sender_name: 'Kabir Hossain',
        sender_role: 'COUNTER MANAGER',
        message:
          'Hello Mahbubur! Yes, each passenger is allowed up to 2 standard pieces of luggage (maximum 20kg total) stored in the coach boot. Handbags can be taken inside the cabin.',
        created_at: new Date(Date.now() - 72000000).toISOString(),
      },
    ],
  },
  {
    id: 'st-02',
    tenant_id: 't-greenline-01',
    booking_ref: 'BM-GL-1003',
    subject: 'Request for AC temperature adjustment on Seat B1',
    message: 'Bus was very cold during night journey, kindly instruct driver assistant.',
    priority: 'normal',
    status: 'in_progress',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    replies: [
      {
        id: 'rep-02',
        ticket_id: 'st-02',
        sender_name: 'Kabir Hossain',
        sender_role: 'COUNTER MANAGER',
        message:
          'Dear passenger, thank you for your feedback. We have instructed the coach driver assistant to maintain the AC climate at 24°C on this night departure. Please let our assistant know if you need an additional blanket.',
        created_at: new Date(Date.now() - 1800000).toISOString(),
      },
    ],
  },
  {
    id: 'st-03',
    tenant_id: 't-hanif-01',
    booking_ref: 'BM-HN-505',
    subject: 'Change of passenger phone number on confirmed ticket',
    message: 'My contact number changed, please update ticket notification details.',
    priority: 'high',
    status: 'open',
    created_at: new Date(Date.now() - 1800000).toISOString(),
    replies: [],
  },
];

// Helper to load or persist into localStorage
function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);

    // If both parsed and fallback are arrays, merge missing seeds by id
    if (Array.isArray(parsed) && Array.isArray(fallback)) {
      const existingIds = new Set(parsed.map((item: any) => item?.id).filter(Boolean));
      let hasNewSeeds = false;
      const merged = [...parsed];
      for (const item of fallback as any[]) {
        if (item?.id && !existingIds.has(item.id)) {
          merged.push(item);
          hasNewSeeds = true;
        }
      }
      if (hasNewSeeds) {
        saveToStorage(key, merged);
      }
      return merged as unknown as T;
    }

    return parsed;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
  } catch (err) {
    console.error('Storage write error:', err);
  }
}

// Background dual persistence to IndexedDB and Supabase PostgreSQL
function persistEntity(table: string, entity: any): void {
  if (!entity || !entity.id) return;

  // 1. Dual write to IndexedDB database
  try {
    indexedDb.put(table as any, entity);
  } catch (err) {
    // ignore
  }

  // 2. If Supabase cloud is configured, asynchronously upsert to PostgreSQL
  if (isSupabaseConfigured()) {
    const client = getSupabase();
    if (client) {
      client.from(table).upsert(entity, { onConflict: 'id' }).then(({ error }) => {
        if (error) {
          console.warn(`Supabase PostgreSQL live sync warning on table ${table}:`, error.message);
        }
      });
    }
  }
}

// In-Memory / LocalStorage Enterprise Store
class SaaSDataStore {
  private tenants: Tenant[] = loadFromStorage('tenants', INITIAL_TENANTS);
  private profiles: Profile[] = loadFromStorage('profiles', INITIAL_PROFILES);
  private counters: Counter[] = loadFromStorage('counters', INITIAL_COUNTERS);
  private cashSessions: CashSession[] = loadFromStorage('cash_sessions', INITIAL_CASH_SESSIONS);
  private seatLayouts: SeatLayout[] = loadFromStorage('seat_layouts', INITIAL_SEAT_LAYOUTS);
  private buses: Bus[] = loadFromStorage('buses', INITIAL_BUSES);
  private routes: Route[] = loadFromStorage('routes', INITIAL_ROUTES);
  private trips: Trip[] = loadFromStorage('trips', INITIAL_TRIPS);
  private bookings: Booking[] = loadFromStorage('bookings', INITIAL_BOOKINGS);
  private seatLocks: SeatLock[] = loadFromStorage('seat_locks', []);
  private expenses: Expense[] = loadFromStorage('expenses', INITIAL_EXPENSES);
  private refunds: Refund[] = loadFromStorage('refunds', []);
  private auditLogs: AuditLog[] = loadFromStorage('audit_logs', INITIAL_AUDIT_LOGS);
  private supportTickets: SupportTicket[] = loadFromStorage('support_tickets', INITIAL_SUPPORT_TICKETS);
  private reviews: Review[] = loadFromStorage('reviews', []);

  // Listeners for UI state reactivity
  private subscribers: Array<() => void> = [];

  constructor() {
    // Ensure primary Super Admin profile is present
    const superAdmin = this.profiles.find((p) => p.email === 'superadmin@gmail.com');
    if (!superAdmin) {
      this.profiles.unshift({
        id: 'p-super-primary',
        email: 'superadmin@gmail.com',
        password: 'superadmin',
        full_name: 'Super Admin',
        phone: '+880 1700-999999',
        role: 'super_admin',
        tenant_id: null,
        is_active: true,
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      });
      saveToStorage('profiles', this.profiles);
    } else {
      superAdmin.password = 'superadmin';
      saveToStorage('profiles', this.profiles);
    }
    // If existing cached layouts do not contain sleeper or disabled seats, upgrade from INITIAL_SEAT_LAYOUTS
    const scaniaLayout = this.seatLayouts.find((l) => l.id === 'layout-gl-scania-36');
    if (!scaniaLayout || !scaniaLayout.grid_data.some((s) => s.type === 'sleeper')) {
      const updatedInitial = INITIAL_SEAT_LAYOUTS.find((l) => l.id === 'layout-gl-scania-36');
      if (updatedInitial) {
        if (scaniaLayout) {
          scaniaLayout.grid_data = updatedInitial.grid_data;
          scaniaLayout.name = updatedInitial.name;
        } else {
          this.seatLayouts.push(updatedInitial);
        }
      }
      // Also ensure sleeper layout template is present
      if (!this.seatLayouts.some((l) => l.id === 'layout-gl-sleeper-24')) {
        const sleeperInit = INITIAL_SEAT_LAYOUTS.find((l) => l.id === 'layout-gl-sleeper-24');
        if (sleeperInit) this.seatLayouts.push(sleeperInit);
      }
      saveToStorage('seat_layouts', this.seatLayouts);
    }

    if (this.supportTickets.length === 0) {
      this.supportTickets = [...INITIAL_SUPPORT_TICKETS];
      saveToStorage('support_tickets', this.supportTickets);
    }

    // Hydrate IndexedDB database in background on startup
    setTimeout(async () => {
      try {
        await indexedDb.putMany('tenants', this.tenants);
        await indexedDb.putMany('profiles', this.profiles);
        await indexedDb.putMany('counters', this.counters);
        await indexedDb.putMany('seat_layouts', this.seatLayouts);
        await indexedDb.putMany('buses', this.buses);
        await indexedDb.putMany('routes', this.routes);
        await indexedDb.putMany('trips', this.trips);
        await indexedDb.putMany('bookings', this.bookings);
      } catch {
        // ignore
      }
    }, 400);
  }

  public subscribe(cb: () => void): () => void {
    this.subscribers.push(cb);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== cb);
    };
  }

  private notify() {
    this.subscribers.forEach((cb) => cb());
  }

  // ------------------ Tenants ------------------
  public getTenants(): Tenant[] {
    return [...this.tenants];
  }

  public getTenantById(id: string): Tenant | undefined {
    return this.tenants.find((t) => t.id === id);
  }

  public saveTenant(tenant: Tenant): void {
    const idx = this.tenants.findIndex((t) => t.id === tenant.id);
    if (idx >= 0) {
      this.tenants[idx] = { ...tenant, updated_at: new Date().toISOString() };
    } else {
      this.tenants.push({ ...tenant, created_at: new Date().toISOString() });
    }
    const saved = idx >= 0 ? this.tenants[idx] : this.tenants[this.tenants.length - 1];
    saveToStorage('tenants', this.tenants);
    persistEntity('tenants', saved);
    this.notify();
  }

  public updateTenantStatus(id: string, status: Tenant['status']): void {
    const t = this.getTenantById(id);
    if (t) {
      t.status = status;
      this.saveTenant(t);
      this.addAuditLog({
        tenant_id: id,
        action: 'UPDATE_TENANT_STATUS',
        entity_type: 'TENANT',
        entity_id: id,
        details: { status },
      });
    }
  }

  // ------------------ Profiles ------------------
  public getProfiles(): Profile[] {
    return [...this.profiles];
  }

  public getProfileById(id: string): Profile | undefined {
    return this.profiles.find((p) => p.id === id);
  }

  public getProfilesByTenant(tenantId: string): Profile[] {
    return this.profiles.filter((p) => p.tenant_id === tenantId);
  }

  public saveProfile(profile: Profile): void {
    const idx = this.profiles.findIndex((p) => p.id === profile.id);
    if (idx >= 0) {
      this.profiles[idx] = profile;
    } else {
      this.profiles.push(profile);
    }
    saveToStorage('profiles', this.profiles);
    persistEntity('profiles', profile);
    this.notify();
  }

  // ------------------ Auto-Provision Tenant Essentials ------------------
  public ensureTenantEssentials(tenantId: string): void {
    if (!tenantId) return;
    const t = this.getTenantById(tenantId);
    if (!t) return;

    let modified = false;

    // 1. Ensure Counter
    const existingCounters = this.counters.filter((c) => c.tenant_id === tenantId);
    if (existingCounters.length === 0) {
      const slugPrefix = (t.slug || 'OPR').substring(0, 3).toUpperCase();
      const newCounter: Counter = {
        id: `cnt-${tenantId}-main`,
        tenant_id: tenantId,
        name: `${t.name} Central Counter`,
        code: `${slugPrefix}-ARB-01`,
        city: 'Dhaka',
        address: t.address || 'Central Terminal, Dhaka',
        contact_phone: t.phone || '+880 1711-000000',
        status: 'active',
      };
      this.counters.push(newCounter);
      saveToStorage('counters', this.counters);
      modified = true;
    }

    // 2. Ensure Bus
    const existingBuses = this.buses.filter((b) => b.tenant_id === tenantId);
    if (existingBuses.length === 0) {
      const regRand = Math.floor(1000 + Math.random() * 9000);
      const newBus: Bus = {
        id: `bus-${tenantId}-101`,
        tenant_id: tenantId,
        name: `${t.name} Scania Multi-Axle #101`,
        reg_no: `DHAKA-METRO-BA-15-${regRand}`,
        bus_type: 'AC',
        total_capacity: 36,
        deck_config: 'single',
        seat_layout_id: 'layout-gl-scania-36',
        manufacturer: 'Scania',
        model: 'Touring HD',
        year: 2024,
        status: 'active',
      };
      this.buses.push(newBus);
      saveToStorage('buses', this.buses);
      modified = true;
    }

    // 3. Ensure Route & Stops
    const existingRoutes = this.routes.filter((r) => r.tenant_id === tenantId);
    if (existingRoutes.length === 0) {
      const newRoute: Route = {
        id: `rt-${tenantId}-ctg`,
        tenant_id: tenantId,
        origin_city: 'Dhaka',
        destination_city: 'Chattogram',
        distance_km: 250,
        estimated_duration_hours: 5.5,
        status: 'active',
        description: `${t.name} Luxury express service via Cumilla & Feni bypass`,
        stops: [
          {
            id: `stop-${tenantId}-1`,
            tenant_id: tenantId,
            route_id: `rt-${tenantId}-ctg`,
            stop_name: `${t.name} Dhaka Terminal`,
            sequence_order: 1,
            arrival_offset_minutes: 0,
            departure_offset_minutes: 0,
            can_board: true,
            can_drop: false,
          },
          {
            id: `stop-${tenantId}-2`,
            tenant_id: tenantId,
            route_id: `rt-${tenantId}-ctg`,
            stop_name: 'Cumilla Paduar Bazar Highway Bypass',
            sequence_order: 2,
            arrival_offset_minutes: 120,
            departure_offset_minutes: 130,
            can_board: true,
            can_drop: true,
          },
          {
            id: `stop-${tenantId}-3`,
            tenant_id: tenantId,
            route_id: `rt-${tenantId}-ctg`,
            stop_name: 'Feni Mohipal Highway Crossing',
            sequence_order: 3,
            arrival_offset_minutes: 190,
            departure_offset_minutes: 200,
            can_board: true,
            can_drop: true,
          },
          {
            id: `stop-${tenantId}-4`,
            tenant_id: tenantId,
            route_id: `rt-${tenantId}-ctg`,
            stop_name: 'Chattogram Dampara Bus Stand',
            sequence_order: 4,
            arrival_offset_minutes: 330,
            departure_offset_minutes: 330,
            can_board: false,
            can_drop: true,
          },
        ],
      };
      this.routes.push(newRoute);
      saveToStorage('routes', this.routes);
      modified = true;
    }

    // 4. Ensure Scheduled Trip
    const existingTrips = this.trips.filter((tr) => tr.tenant_id === tenantId);
    if (existingTrips.length === 0) {
      const bus = this.buses.find((b) => b.tenant_id === tenantId);
      const route = this.routes.find((r) => r.tenant_id === tenantId);
      if (bus && route) {
        const todayStr = new Date().toISOString().split('T')[0];
        const slugPrefix = (t.slug || 'OPR').substring(0, 3).toUpperCase();
        const newTrip: Trip = {
          id: `trip-${tenantId}-01`,
          tenant_id: tenantId,
          route_id: route.id,
          bus_id: bus.id,
          trip_code: `${slugPrefix}-DHK-CTG-0830`,
          departure_date: todayStr,
          departure_time: '08:30',
          arrival_estimate: `${todayStr}T14:00:00`,
          base_fare: 1400,
          status: 'scheduled',
          created_at: new Date().toISOString(),
        };
        this.trips.push(newTrip);
        saveToStorage('trips', this.trips);
        modified = true;
      }
    }

    if (modified) {
      this.notify();
    }
  }

  // ------------------ Counters ------------------
  public getCounters(tenantId?: string): Counter[] {
    if (tenantId) {
      this.ensureTenantEssentials(tenantId);
      return this.counters.filter((c) => c.tenant_id === tenantId);
    }
    return [...this.counters];
  }

  public saveCounter(counter: Counter): void {
    const idx = this.counters.findIndex((c) => c.id === counter.id);
    if (idx >= 0) {
      this.counters[idx] = counter;
    } else {
      this.counters.push(counter);
    }
    saveToStorage('counters', this.counters);
    persistEntity('counters', counter);
    this.notify();
  }

  public deleteCounter(id: string): void {
    this.counters = this.counters.filter((c) => c.id !== id);
    saveToStorage('counters', this.counters);
    this.notify();
  }

  // ------------------ Cash Sessions ------------------
  public getCashSessions(tenantId?: string): CashSession[] {
    if (tenantId) return this.cashSessions.filter((c) => c.tenant_id === tenantId);
    return [...this.cashSessions];
  }

  public saveCashSession(session: CashSession): void {
    const idx = this.cashSessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      this.cashSessions[idx] = session;
    } else {
      this.cashSessions.push(session);
    }
    saveToStorage('cash_sessions', this.cashSessions);
    persistEntity('cash_sessions', session);
    this.notify();
  }

  // ------------------ Seat Layouts ------------------
  public getSeatLayouts(tenantId?: string): SeatLayout[] {
    if (tenantId) return this.seatLayouts.filter((l) => l.tenant_id === tenantId || l.is_template);
    return [...this.seatLayouts];
  }

  public getSeatLayoutById(id: string): SeatLayout | undefined {
    return this.seatLayouts.find((l) => l.id === id);
  }

  public getSeatLayoutForTrip(tripId: string): SeatLayout {
    const trip = this.getTripById(tripId);
    if (trip?.bus?.seat_layout_id) {
      const layout = this.seatLayouts.find((l) => l.id === trip.bus?.seat_layout_id);
      if (layout) return layout;
    }
    return this.seatLayouts[0];
  }

  public saveSeatLayout(layout: SeatLayout): void {
    const idx = this.seatLayouts.findIndex((l) => l.id === layout.id);
    if (idx >= 0) {
      this.seatLayouts[idx] = layout;
    } else {
      this.seatLayouts.push(layout);
    }
    saveToStorage('seat_layouts', this.seatLayouts);
    persistEntity('seat_layouts', layout);
    this.notify();
  }

  // ------------------ Buses ------------------
  public getBuses(tenantId?: string): Bus[] {
    if (tenantId) {
      this.ensureTenantEssentials(tenantId);
      return this.buses.filter((b) => b.tenant_id === tenantId);
    }
    return [...this.buses];
  }

  public getBusById(id: string): Bus | undefined {
    return this.buses.find((b) => b.id === id);
  }

  public saveBus(bus: Bus): void {
    const idx = this.buses.findIndex((b) => b.id === bus.id);
    if (idx >= 0) {
      this.buses[idx] = bus;
    } else {
      this.buses.push(bus);
    }
    saveToStorage('buses', this.buses);
    persistEntity('buses', bus);
    this.notify();
  }

  // ------------------ Routes & Stops ------------------
  public getRoutes(tenantId?: string): Route[] {
    if (tenantId) {
      this.ensureTenantEssentials(tenantId);
      return this.routes.filter((r) => r.tenant_id === tenantId);
    }
    return [...this.routes];
  }

  public getRouteById(id: string): Route | undefined {
    return this.routes.find((r) => r.id === id);
  }

  public saveRoute(route: Route): void {
    const idx = this.routes.findIndex((r) => r.id === route.id);
    if (idx >= 0) {
      this.routes[idx] = route;
    } else {
      this.routes.push(route);
    }
    saveToStorage('routes', this.routes);
    persistEntity('routes', route);
    this.notify();
  }

  public deleteRoute(id: string): void {
    this.routes = this.routes.filter((r) => r.id !== id);
    saveToStorage('routes', this.routes);
    this.notify();
  }

  // ------------------ Trips ------------------
  public getTrips(tenantId?: string): Trip[] {
    if (tenantId) {
      this.ensureTenantEssentials(tenantId);
    }
    const base = tenantId ? this.trips.filter((t) => t.tenant_id === tenantId) : [...this.trips];
    return base.map((t) => ({
      ...t,
      bus: this.getBusById(t.bus_id),
      route: this.getRouteById(t.route_id),
    }));
  }

  public getTripById(id: string): Trip | undefined {
    const trip = this.trips.find((t) => t.id === id);
    if (!trip) return undefined;
    return {
      ...trip,
      bus: this.getBusById(trip.bus_id),
      route: this.getRouteById(trip.route_id),
    };
  }

  public saveTrip(trip: Trip): void {
    const idx = this.trips.findIndex((t) => t.id === trip.id);
    if (idx >= 0) {
      this.trips[idx] = trip;
    } else {
      this.trips.push(trip);
    }
    saveToStorage('trips', this.trips);
    persistEntity('trips', trip);
    this.notify();
  }

  public assignDriverToTrip(tripId: string, driverId: string): void {
    const trip = this.trips.find((t) => t.id === tripId);
    if (trip) {
      trip.driver_id = driverId;
      this.saveTrip(trip);
    }
  }

  public assignDriverToBus(busId: string, driverId: string): void {
    const bus = this.buses.find((b) => b.id === busId);
    if (bus) {
      bus.assigned_driver_id = driverId;
      this.saveBus(bus);
    }
  }

  // -------------------------------------------------------------
  // SEGMENT-BASED SEAT INVENTORY CHECK (Crucial Core Feature)
  // -------------------------------------------------------------
  public isSeatAvailable(
    tripId: string,
    seatNumber: string,
    fromSeq: number,
    toSeq: number
  ): boolean {
    const now = Date.now();

    // 1. Check all active/confirmed bookings on this trip (including pending counter acceptance)
    const tripBookings = this.bookings.filter(
      (b) => b.trip_id === tripId && (b.ticket_status === 'confirmed' || b.ticket_status === 'cancellation_requested')
    );

    for (const b of tripBookings) {
      if (b.seats) {
        for (const seat of b.seats) {
          if (seat.seat_number === seatNumber) {
            // Check interval overlap: [seat.from_seq, seat.to_seq] with [fromSeq, toSeq]
            // Overlaps if seat.from_seq < toSeq AND fromSeq < seat.to_seq
            if (seat.from_seq < toSeq && fromSeq < seat.to_seq) {
              return false; // Overlapping segment is booked!
            }
          }
        }
      }
    }

    // 2. Check active temporary locks
    const activeLocks = this.seatLocks.filter(
      (l) => l.trip_id === tripId && new Date(l.expires_at).getTime() > now
    );

    for (const l of activeLocks) {
      if (l.seat_numbers.includes(seatNumber)) {
        if (l.from_seq < toSeq && fromSeq < l.to_seq) {
          return false; // Temporarily locked
        }
      }
    }

    return true; // Available!
  }

  // Get seat status map for a given journey segment
  public getSeatStatusesForSegment(
    tripId: string,
    fromSeq: number,
    toSeq: number
  ): Record<string, { status: 'available' | 'booked' | 'locked'; passengerName?: string }> {
    const result: Record<string, { status: 'available' | 'booked' | 'locked'; passengerName?: string }> = {};
    const trip = this.getTripById(tripId);
    if (!trip) return result;

    const layout = this.seatLayouts.find((l) => l.id === trip.bus?.seat_layout_id) || this.seatLayouts[0];
    const seats = (layout?.grid_data && layout.grid_data.length > 0)
      ? layout.grid_data
      : [
          { seat_number: 'A1' }, { seat_number: 'A2' }, { seat_number: 'A3' }, { seat_number: 'A4' },
          { seat_number: 'B1' }, { seat_number: 'B2' }, { seat_number: 'B3' }, { seat_number: 'B4' },
          { seat_number: 'C1' }, { seat_number: 'C2' }, { seat_number: 'C3' }, { seat_number: 'C4' },
          { seat_number: 'D1' }, { seat_number: 'D2' }, { seat_number: 'D3' }, { seat_number: 'D4' },
          { seat_number: 'E1' }, { seat_number: 'E2' }, { seat_number: 'E3' }, { seat_number: 'E4' },
          { seat_number: 'F1' }, { seat_number: 'F2' }, { seat_number: 'F3' }, { seat_number: 'F4' },
          { seat_number: 'G1' }, { seat_number: 'G2' }, { seat_number: 'G3' }, { seat_number: 'G4' },
          { seat_number: 'H1' }, { seat_number: 'H2' }, { seat_number: 'H3' }, { seat_number: 'H4' },
          { seat_number: 'I1' }, { seat_number: 'I2' }, { seat_number: 'I3' }, { seat_number: 'I4' },
        ];

    const now = Date.now();
    const tripBookings = this.bookings.filter(
      (b) => b.trip_id === tripId && (b.ticket_status === 'confirmed' || b.ticket_status === 'cancellation_requested')
    );
    const activeLocks = this.seatLocks.filter(
      (l) => l.trip_id === tripId && new Date(l.expires_at).getTime() > now
    );

    for (const s of seats) {
      let isBooked = false;
      let bookedPassenger = '';

      for (const b of tripBookings) {
        const found = b.seats?.find(
          (bs) => bs.seat_number === s.seat_number && bs.from_seq < toSeq && fromSeq < bs.to_seq
        );
        if (found) {
          isBooked = true;
          bookedPassenger = b.passenger_name;
          break;
        }
      }

      if (isBooked) {
        result[s.seat_number] = { status: 'booked', passengerName: bookedPassenger };
        continue;
      }

      const isLocked = activeLocks.some(
        (l) => l.seat_numbers.includes(s.seat_number) && l.from_seq < toSeq && fromSeq < l.to_seq
      );

      if (isLocked) {
        result[s.seat_number] = { status: 'locked' };
      } else {
        result[s.seat_number] = { status: 'available' };
      }
    }

    return result;
  }

  public getSegmentFare(tripId: string, fromSeq: number, toSeq: number): number {
    const trip = this.trips.find((t) => t.id === tripId);
    if (!trip) return 1400;

    if (trip.segments && trip.segments.length > 0) {
      const seg = trip.segments.find(
        (s) => s.from_seq === fromSeq && s.to_seq === toSeq
      );
      if (seg) return seg.segment_fare;
    }

    const route = this.getRouteById(trip.route_id);
    const totalStops = route?.stops?.length || 4;
    const maxSpan = totalStops > 1 ? totalStops - 1 : 1;
    const span = Math.max(1, toSeq - fromSeq);
    return Math.round((trip.base_fare * span) / maxSpan);
  }

  // -------------------------------------------------------------
  // ATOMIC SEAT BOOKING OPERATION
  // -------------------------------------------------------------
  public bookSeatsAtomic(params: {
    tenantId: string;
    tripId: string;
    customerId?: string;
    counterId?: string;
    bookedByUserId?: string;
    bookingSource: 'online' | 'counter' | 'admin';
    passengerName: string;
    passengerPhone: string;
    passengerEmail?: string;
    fromStopName: string;
    toStopName: string;
    fromSeq: number;
    toSeq: number;
    boardingPoint: string;
    droppingPoint: string;
    seatNumbers: string[];
    farePerSeat: number;
    seatFares?: Record<string, { fare: number; type: SeatType }>;
    discountAmount?: number;
    paymentMethod: Payment['payment_method'];
    providerTxnId?: string;
  }): { success: boolean; booking?: Booking; error?: string } {
    // 1. Verify availability for every requested seat
    for (const seat of params.seatNumbers) {
      if (!this.isSeatAvailable(params.tripId, seat, params.fromSeq, params.toSeq)) {
        return {
          success: false,
          error: `Seat ${seat} is already booked or locked on this journey section.`,
        };
      }
    }

    const calculatedSubtotal = params.seatFares
      ? params.seatNumbers.reduce((sum, s) => sum + (params.seatFares?.[s]?.fare ?? params.farePerSeat), 0)
      : params.seatNumbers.length * params.farePerSeat;
    const subtotal = calculatedSubtotal;
    const discount = params.discountAmount || 0;
    const totalPayable = Math.max(0, subtotal - discount);
    const bookingRef = 'BM-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const bookingId = 'bk-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

    const bookingSeats: BookingSeat[] = params.seatNumbers.map((seatNum, idx) => ({
      id: `bks-${bookingId}-${idx + 1}`,
      tenant_id: params.tenantId,
      booking_id: bookingId,
      trip_id: params.tripId,
      seat_number: seatNum,
      seat_type: params.seatFares?.[seatNum]?.type || 'regular',
      fare: params.seatFares?.[seatNum]?.fare ?? params.farePerSeat,
      from_seq: params.fromSeq,
      to_seq: params.toSeq,
    }));

    const tickets: Ticket[] = params.seatNumbers.map((seatNum, idx) => {
      const ticketNum = 'TKT-' + Math.random().toString(36).substring(2, 9).toUpperCase();
      return {
        id: `tkt-${bookingId}-${idx + 1}`,
        tenant_id: params.tenantId,
        ticket_number: ticketNum,
        booking_id: bookingId,
        trip_id: params.tripId,
        seat_number: seatNum,
        passenger_name: params.passengerName,
        qr_code_hash: `QR:${ticketNum}:${bookingRef}:${seatNum}:${params.tripId}`,
        is_boarded: false,
        reprint_count: 0,
        created_at: new Date().toISOString(),
      };
    });

    const newBooking: Booking = {
      id: bookingId,
      tenant_id: params.tenantId,
      booking_ref: bookingRef,
      trip_id: params.tripId,
      customer_id: params.customerId,
      counter_id: params.counterId,
      booked_by_user_id: params.bookedByUserId,
      booking_source: params.bookingSource,
      passenger_name: params.passengerName,
      passenger_phone: params.passengerPhone,
      passenger_email: params.passengerEmail,
      from_stop_name: params.fromStopName,
      to_stop_name: params.toStopName,
      from_seq: params.fromSeq,
      to_seq: params.toSeq,
      boarding_point: params.boardingPoint,
      dropping_point: params.droppingPoint,
      seat_count: params.seatNumbers.length,
      subtotal_fare: subtotal,
      discount_amount: discount,
      total_payable: totalPayable,
      payment_status: 'completed',
      ticket_status: 'confirmed',
      created_at: new Date().toISOString(),
      seats: bookingSeats,
      tickets: tickets,
    };

    this.bookings.unshift(newBooking);
    saveToStorage('bookings', this.bookings);
    persistEntity('bookings', newBooking);

    // Record cash or digital payment in counter cash drawer if at counter
    if (params.counterId && params.paymentMethod === 'cash') {
      const openSession = this.cashSessions.find(
        (s) => s.counter_id === params.counterId && s.status === 'open'
      );
      if (openSession) {
        openSession.cash_collected += totalPayable;
        openSession.expected_balance =
          openSession.opening_balance + openSession.cash_collected - openSession.cash_refunded;
        this.saveCashSession(openSession);
      }
    }

    // Release any temporary seat locks
    this.seatLocks = this.seatLocks.filter(
      (l) =>
        !(
          l.trip_id === params.tripId &&
          l.seat_numbers.some((s) => params.seatNumbers.includes(s))
        )
    );
    saveToStorage('seat_locks', this.seatLocks);

    // Immutable Audit Log
    this.addAuditLog({
      tenant_id: params.tenantId,
      actor_id: params.bookedByUserId,
      actor_name: params.passengerName,
      actor_role: params.bookingSource === 'counter' ? 'counter_agent' : 'customer',
      action: 'BOOK_TICKETS_ATOMIC',
      entity_type: 'BOOKING',
      entity_id: bookingId,
      details: {
        booking_ref: bookingRef,
        seats: params.seatNumbers,
        from: params.fromStopName,
        to: params.toStopName,
        total: totalPayable,
      },
    });

    this.notify();
    return { success: true, booking: newBooking };
  }

  // ------------------ Bookings & Tickets ------------------
  public getBookings(tenantId?: string): Booking[] {
    if (tenantId) return this.bookings.filter((b) => b.tenant_id === tenantId);
    return [...this.bookings];
  }

  public getBookingByRef(ref: string): Booking | undefined {
    return this.bookings.find((b) => b.booking_ref.toUpperCase() === ref.toUpperCase().trim());
  }

  public getTicketByNumber(tktNumber: string): Ticket | undefined {
    for (const b of this.bookings) {
      if (b.tickets) {
        const found = b.tickets.find((t) => t.ticket_number === tktNumber);
        if (found) return found;
      }
    }
    return undefined;
  }

  // Boarding verification (for QR Scanner, Ticket Number, or PNR Booking Ref)
  public verifyBoardingTicket(
    qrHashOrTicketNum: string,
    verifierUserId: string
  ): {
    success: boolean;
    alreadyBoarded?: boolean;
    ticket?: Ticket;
    booking?: Booking;
    trip?: Trip;
    message: string;
  } {
    const rawCode = (qrHashOrTicketNum || '').trim();
    if (!rawCode) {
      return { success: false, message: 'Please enter a ticket number, QR code, or PNR reference.' };
    }
    const cleanQuery = rawCode.toUpperCase();
    const numericQuery = rawCode.replace(/\D/g, '');

    let targetBooking: Booking | undefined;
    let targetTicket: Ticket | undefined;

    // 1. Search by booking reference (PNR, e.g. BM-GL-1003 or BM-...) or ID or Phone
    for (const b of this.bookings) {
      const bRef = (b.booking_ref || '').toUpperCase();
      const bId = (b.id || '').toUpperCase();
      const bPhone = (b.passenger_phone || '').replace(/\D/g, '');

      if (
        bRef === cleanQuery ||
        cleanQuery.includes(bRef) ||
        bId === cleanQuery ||
        (numericQuery.length >= 10 && bPhone.endsWith(numericQuery))
      ) {
        targetBooking = b;
        break;
      }
    }

    // 2. Search by ticket number or QR code hash in tickets arrays
    for (const b of this.bookings) {
      if (b.tickets && b.tickets.length > 0) {
        const t = b.tickets.find((item) => {
          const tNum = (item.ticket_number || '').toUpperCase();
          const tHash = (item.qr_code_hash || '').toUpperCase();
          const tId = (item.id || '').toUpperCase();
          return (
            tNum === cleanQuery ||
            tHash === cleanQuery ||
            tId === cleanQuery ||
            cleanQuery.includes(tNum) ||
            cleanQuery.includes(tHash)
          );
        });
        if (t) {
          targetBooking = b;
          targetTicket = t;
          break;
        }
      }
    }

    if (!targetBooking) {
      return { success: false, message: `Invalid or unrecognized ticket / PNR "${rawCode}".` };
    }

    // If targetBooking matched by PNR and targetTicket not yet assigned:
    if (!targetTicket) {
      if (targetBooking.tickets && targetBooking.tickets.length > 0) {
        targetTicket = targetBooking.tickets[0];
      } else {
        const primarySeat = targetBooking.seats?.[0]?.seat_number || 'A1';
        targetTicket = {
          id: `tkt-${targetBooking.id}-1`,
          tenant_id: targetBooking.tenant_id,
          ticket_number: `TKT-${targetBooking.booking_ref}`,
          booking_id: targetBooking.id,
          trip_id: targetBooking.trip_id,
          seat_number: primarySeat,
          passenger_name: targetBooking.passenger_name,
          qr_code_hash: `QR:${targetBooking.booking_ref}:${primarySeat}`,
          is_boarded: false,
          reprint_count: 0,
          created_at: targetBooking.created_at || new Date().toISOString(),
        };
        targetBooking.tickets = [targetTicket];
      }
    }

    const trip = this.getTripById(targetBooking.trip_id);

    // 3. Status checks
    if (targetBooking.ticket_status === 'cancelled') {
      return {
        success: false,
        booking: targetBooking,
        ticket: targetTicket,
        trip: trip,
        message: 'REJECTED: This ticket was cancelled and refunded. Boarding prohibited.',
      };
    }

    if (targetBooking.ticket_status === 'cancellation_requested') {
      return {
        success: false,
        booking: targetBooking,
        ticket: targetTicket,
        trip: trip,
        message: 'HOLD: Cancellation requested by passenger. Counter manager approval is pending.',
      };
    }

    if (targetTicket.is_boarded) {
      const boardedTime = targetTicket.boarded_at
        ? new Date(targetTicket.boarded_at).toLocaleTimeString()
        : 'earlier';
      return {
        success: false,
        alreadyBoarded: true,
        ticket: targetTicket,
        booking: targetBooking,
        trip: trip,
        message: `ALREADY BOARDED at ${boardedTime}! Duplicate boarding attempt rejected.`,
      };
    }

    // 4. Mark ticket as boarded
    targetTicket.is_boarded = true;
    targetTicket.boarded_at = new Date().toISOString();
    targetTicket.boarded_by_user_id = verifierUserId;
    saveToStorage('bookings', this.bookings);
    persistEntity('bookings', targetBooking);

    this.addAuditLog({
      tenant_id: targetBooking.tenant_id,
      actor_id: verifierUserId,
      action: 'BOARDING_VERIFICATION',
      entity_type: 'TICKET',
      entity_id: targetTicket.ticket_number,
      details: {
        passenger: targetTicket.passenger_name,
        seat: targetTicket.seat_number,
        booking_ref: targetBooking.booking_ref,
      },
    });

    this.notify();
    return {
      success: true,
      ticket: targetTicket,
      booking: targetBooking,
      trip: trip,
      message: 'Boarding verified successfully. Welcome aboard!',
    };
  }

  // Passenger requests ticket cancellation (pending counter approval)
  public requestBookingCancellation(
    bookingId: string,
    reason: string
  ): { success: boolean; error?: string } {
    const booking = this.bookings.find((b) => b.id === bookingId);
    if (!booking) return { success: false, error: 'Booking not found' };
    if (booking.ticket_status !== 'confirmed') {
      return {
        success: false,
        error: `Cannot request cancellation: ticket is currently ${booking.ticket_status}`,
      };
    }

    booking.ticket_status = 'cancellation_requested';
    booking.cancellation_reason = reason;
    booking.cancellation_requested_at = new Date().toISOString();

    saveToStorage('bookings', this.bookings);

    this.addAuditLog({
      tenant_id: booking.tenant_id,
      action: 'CANCELLATION_REQUESTED',
      entity_type: 'BOOKING',
      entity_id: booking.id,
      details: {
        booking_ref: booking.booking_ref,
        passenger_name: booking.passenger_name,
        reason,
        total_payable: booking.total_payable,
      },
    });

    this.notify();
    return { success: true };
  }

  // Counter accepts and confirms cancellation (releases seats and issues refund)
  public acceptBookingCancellation(
    bookingId: string,
    actorId?: string,
    counterId?: string
  ): { success: boolean; refundAmount: number; error?: string } {
    const booking = this.bookings.find((b) => b.id === bookingId);
    if (!booking) return { success: false, refundAmount: 0, error: 'Booking not found' };

    const tenant = this.getTenantById(booking.tenant_id);
    const refundPct = tenant?.settings.refund_percentage || 80;
    const netRefund = Math.round((booking.total_payable * refundPct) / 100);
    const cancellationFee = booking.total_payable - netRefund;

    booking.ticket_status = 'cancelled';
    booking.payment_status = 'refunded';
    booking.cancellation_confirmed_by = actorId || 'Counter Agent';
    booking.cancellation_confirmed_at = new Date().toISOString();

    const refundRecord: Refund = {
      id: 'ref-' + Date.now(),
      tenant_id: booking.tenant_id,
      booking_id: booking.id,
      refund_ref: 'RF-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      amount: booking.total_payable,
      cancellation_fee: cancellationFee,
      net_refund_amount: netRefund,
      reason: booking.cancellation_reason || 'Counter accepted cancellation request',
      status: 'approved',
      processed_by: actorId,
      created_at: new Date().toISOString(),
    };

    this.refunds.unshift(refundRecord);
    saveToStorage('refunds', this.refunds);
    saveToStorage('bookings', this.bookings);

    if (counterId) {
      const session = this.cashSessions.find(
        (s) => s.counter_id === counterId && s.status === 'open'
      );
      if (session) {
        session.cash_refunded = (session.cash_refunded || 0) + netRefund;
        saveToStorage('cash_sessions', this.cashSessions);
      }
    }

    this.addAuditLog({
      tenant_id: booking.tenant_id,
      actor_id: actorId,
      action: 'COUNTER_CONFIRMED_CANCELLATION',
      entity_type: 'BOOKING',
      entity_id: booking.id,
      details: {
        booking_ref: booking.booking_ref,
        cancellationFee,
        netRefund,
        counterId,
        reason: booking.cancellation_reason,
      },
    });

    this.notify();
    return { success: true, refundAmount: netRefund };
  }

  // Counter rejects cancellation request
  public rejectBookingCancellation(
    bookingId: string,
    reason?: string,
    actorId?: string
  ): { success: boolean; error?: string } {
    const booking = this.bookings.find((b) => b.id === bookingId);
    if (!booking) return { success: false, error: 'Booking not found' };

    booking.ticket_status = 'confirmed';
    const originalReason = booking.cancellation_reason;
    delete booking.cancellation_reason;
    delete booking.cancellation_requested_at;

    saveToStorage('bookings', this.bookings);

    this.addAuditLog({
      tenant_id: booking.tenant_id,
      actor_id: actorId,
      action: 'COUNTER_REJECTED_CANCELLATION',
      entity_type: 'BOOKING',
      entity_id: booking.id,
      details: {
        booking_ref: booking.booking_ref,
        rejection_reason: reason || 'Counter declined cancellation request',
        original_reason: originalReason,
      },
    });

    this.notify();
    return { success: true };
  }

  // Direct Ticket cancellation and refund calculation
  public cancelBooking(
    bookingId: string,
    reason: string,
    actorId?: string
  ): { success: boolean; refundAmount: number; error?: string } {
    const booking = this.bookings.find((b) => b.id === bookingId);
    if (!booking) return { success: false, refundAmount: 0, error: 'Booking not found' };

    const tenant = this.getTenantById(booking.tenant_id);
    const refundPct = tenant?.settings.refund_percentage || 80;
    const netRefund = Math.round((booking.total_payable * refundPct) / 100);
    const cancellationFee = booking.total_payable - netRefund;

    booking.ticket_status = 'cancelled';
    booking.payment_status = 'refunded';
    booking.cancellation_confirmed_by = actorId || 'Direct Counter Action';
    booking.cancellation_confirmed_at = new Date().toISOString();

    const refundRecord: Refund = {
      id: 'ref-' + Date.now(),
      tenant_id: booking.tenant_id,
      booking_id: booking.id,
      refund_ref: 'RF-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      amount: booking.total_payable,
      cancellation_fee: cancellationFee,
      net_refund_amount: netRefund,
      reason,
      status: 'approved',
      processed_by: actorId,
      created_at: new Date().toISOString(),
    };

    this.refunds.unshift(refundRecord);
    saveToStorage('refunds', this.refunds);
    saveToStorage('bookings', this.bookings);

    this.addAuditLog({
      tenant_id: booking.tenant_id,
      actor_id: actorId,
      action: 'CANCEL_BOOKING',
      entity_type: 'BOOKING',
      entity_id: booking.id,
      details: {
        booking_ref: booking.booking_ref,
        cancellationFee,
        netRefund,
        reason,
      },
    });

    this.notify();
    return { success: true, refundAmount: netRefund };
  }

  // ------------------ Expenses ------------------
  public getExpenses(tenantId?: string): Expense[] {
    if (tenantId) return this.expenses.filter((e) => e.tenant_id === tenantId);
    return [...this.expenses];
  }

  public saveExpense(expense: Expense): void {
    const idx = this.expenses.findIndex((e) => e.id === expense.id);
    if (idx >= 0) {
      this.expenses[idx] = expense;
    } else {
      this.expenses.unshift(expense);
    }
    saveToStorage('expenses', this.expenses);
    this.notify();
  }

  // ------------------ Audit Logs ------------------
  public getAuditLogs(tenantId?: string): AuditLog[] {
    if (tenantId) return this.auditLogs.filter((a) => a.tenant_id === tenantId);
    return [...this.auditLogs];
  }

  public addAuditLog(log: Omit<AuditLog, 'id' | 'created_at'>): void {
    const newLog: AuditLog = {
      ...log,
      id: 'aud-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      created_at: new Date().toISOString(),
    };
    this.auditLogs.unshift(newLog);
    saveToStorage('audit_logs', this.auditLogs);
    this.notify();
  }

  // ------------------ Support Tickets & Complaints ------------------
  public getSupportTickets(tenantId?: string): SupportTicket[] {
    if (tenantId) {
      return this.supportTickets.filter((t) => t.tenant_id === tenantId);
    }
    return [...this.supportTickets];
  }

  public getSupportTicketById(id: string): SupportTicket | undefined {
    return this.supportTickets.find((t) => t.id === id);
  }

  public getSupportTicketsByBookingRef(ref: string): SupportTicket[] {
    const clean = ref.trim().toUpperCase();
    return this.supportTickets.filter(
      (t) => (t.booking_ref && t.booking_ref.toUpperCase() === clean) || t.id.toUpperCase() === clean
    );
  }

  public createSupportTicket(ticket: SupportTicket): SupportTicket {
    this.supportTickets.unshift(ticket);
    saveToStorage('support_tickets', this.supportTickets);
    persistEntity('support_tickets', ticket);
    this.notify();
    return ticket;
  }

  public addSupportReply(ticketId: string, reply: SupportReply, newStatus?: SupportTicket['status']): boolean {
    const ticket = this.supportTickets.find((t) => t.id === ticketId);
    if (!ticket) return false;
    if (!ticket.replies) ticket.replies = [];
    ticket.replies.push(reply);
    if (newStatus) {
      ticket.status = newStatus;
    }
    ticket.updated_at = new Date().toISOString();
    saveToStorage('support_tickets', this.supportTickets);
    persistEntity('support_tickets', ticket);
    this.notify();
    return true;
  }

  public updateSupportTicketStatus(ticketId: string, status: SupportTicket['status']): boolean {
    const ticket = this.supportTickets.find((t) => t.id === ticketId);
    if (!ticket) return false;
    ticket.status = status;
    ticket.updated_at = new Date().toISOString();
    saveToStorage('support_tickets', this.supportTickets);
    persistEntity('support_tickets', ticket);
    this.notify();
    return true;
  }

  public getAllDataForTable(table: string): any[] {
    switch (table) {
      case 'tenants': return this.tenants;
      case 'profiles': return this.profiles;
      case 'counters': return this.counters;
      case 'cash_sessions': return this.cashSessions;
      case 'seat_layouts': return this.seatLayouts;
      case 'buses': return this.buses;
      case 'routes': return this.routes;
      case 'trips': return this.trips;
      case 'bookings': return this.bookings;
      case 'expenses': return this.expenses;
      case 'refunds': return this.refunds;
      case 'support_tickets': return this.supportTickets;
      case 'reviews': return this.reviews;
      case 'audit_logs': return this.auditLogs;
      default: return [];
    }
  }

  public getTableCounts(): Record<string, number> {
    return {
      tenants: this.tenants.length,
      profiles: this.profiles.length,
      counters: this.counters.length,
      cash_sessions: this.cashSessions.length,
      seat_layouts: this.seatLayouts.length,
      buses: this.buses.length,
      routes: this.routes.length,
      trips: this.trips.length,
      bookings: this.bookings.length,
      expenses: this.expenses.length,
      refunds: this.refunds.length,
      support_tickets: this.supportTickets.length,
      reviews: this.reviews.length,
      audit_logs: this.auditLogs.length,
    };
  }

  // Reset demo data to factory seeds
  public resetToFactorySeeds(): void {
    localStorage.clear();
    this.tenants = INITIAL_TENANTS;
    this.profiles = INITIAL_PROFILES;
    this.counters = INITIAL_COUNTERS;
    this.cashSessions = INITIAL_CASH_SESSIONS;
    this.seatLayouts = INITIAL_SEAT_LAYOUTS;
    this.buses = INITIAL_BUSES;
    this.routes = INITIAL_ROUTES;
    this.trips = INITIAL_TRIPS;
    this.bookings = INITIAL_BOOKINGS;
    this.seatLocks = [];
    this.expenses = INITIAL_EXPENSES;
    this.refunds = [];
    this.auditLogs = INITIAL_AUDIT_LOGS;
    this.notify();
  }
}

export const dbStore = new SaaSDataStore();
