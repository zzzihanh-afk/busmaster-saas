export type UserRole =
  | 'super_admin'
  | 'company_owner'
  | 'company_admin'
  | 'counter_manager'
  | 'counter_agent'
  | 'supervisor'
  | 'driver'
  | 'customer';

export type TenantStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'suspended'
  | 'active'
  | 'inactive';

export interface TenantSettings {
  currency: string;
  currency_symbol: string;
  timezone: string;
  cancellation_allowed: boolean;
  cancellation_cutoff_hours?: number;
  refund_percentage: number;
  primary_color: string;
  secondary_color?: string;
  hotline?: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  owner_name: string;
  email: string;
  phone: string;
  address?: string;
  trade_license?: string;
  status: TenantStatus;
  settings: TenantSettings;
  created_at?: string;
  updated_at?: string;
}

export interface Profile {
  id: string;
  user_id?: string;
  tenant_id?: string | null;
  email: string;
  password?: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  role: UserRole;
  counter_id?: string;
  license_number?: string;
  is_active: boolean;
  created_at?: string;
}

export interface Counter {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  city: string;
  address: string;
  contact_phone: string;
  manager_id?: string;
  status: 'active' | 'inactive' | 'maintenance';
  created_at?: string;
}

export interface CashSession {
  id: string;
  tenant_id: string;
  counter_id: string;
  opened_by: string;
  closed_by?: string;
  opened_at: string;
  closed_at?: string;
  opening_balance: number;
  cash_collected: number;
  cash_refunded: number;
  closing_balance?: number;
  expected_balance?: number;
  discrepancy?: number;
  status: 'open' | 'closed';
  notes?: string;
}

export type SeatType = 'regular' | 'premium' | 'sleeper' | 'female' | 'disabled' | 'empty';

export interface SeatGridItem {
  seat_number: string;
  deck: 1 | 2;
  row: number;
  col: number;
  type: SeatType;
  is_accessible?: boolean;
  price_multiplier?: number;
  extra_fare?: number;
}

export interface SeatLayout {
  id: string;
  tenant_id: string;
  name: string;
  rows_count: number;
  cols_count: number;
  decks_count: 1 | 2;
  layout_type: '2+2' | '2+1' | '1+1' | 'sleeper' | 'double-decker' | 'custom';
  grid_data: SeatGridItem[];
  is_template?: boolean;
  created_at?: string;
}

export interface Bus {
  id: string;
  tenant_id: string;
  name: string;
  reg_no: string;
  bus_type: 'AC' | 'Non-AC' | 'Sleeper-AC' | 'Executive-AC';
  total_capacity: number;
  deck_config: 'single' | 'double';
  seat_layout_id?: string;
  manufacturer?: string;
  model?: string;
  year?: number;
  fitness_expiry?: string;
  insurance_expiry?: string;
  assigned_driver_id?: string;
  assigned_assistant_id?: string;
  status: 'active' | 'inactive' | 'maintenance' | 'out_of_service';
  created_at?: string;
}

export interface Route {
  id: string;
  tenant_id: string;
  origin_city: string;
  destination_city: string;
  distance_km?: number;
  estimated_duration_hours?: number;
  status: 'active' | 'inactive';
  description?: string;
  stops?: RouteStop[];
  created_at?: string;
}

export interface RouteStop {
  id: string;
  tenant_id: string;
  route_id: string;
  stop_name: string;
  sequence_order: number;
  location_address?: string;
  arrival_offset_minutes: number;
  departure_offset_minutes: number;
  can_board: boolean;
  can_drop: boolean;
  counter_id?: string;
}

export type TripStatus =
  | 'scheduled'
  | 'boarding'
  | 'in_transit'
  | 'arrived'
  | 'completed'
  | 'delayed'
  | 'cancelled';

export interface Trip {
  id: string;
  tenant_id: string;
  schedule_id?: string;
  route_id: string;
  bus_id: string;
  driver_id?: string;
  trip_code: string;
  departure_date: string;
  departure_time: string;
  arrival_estimate?: string;
  base_fare: number;
  status: TripStatus;
  bus?: Bus;
  route?: Route;
  segments?: TripSegment[];
  created_at?: string;
}

export interface TripStop {
  id: string;
  tenant_id: string;
  trip_id: string;
  stop_name: string;
  sequence_order: number;
  scheduled_arrival?: string;
  scheduled_departure?: string;
  can_board: boolean;
  can_drop: boolean;
}

export interface TripSegment {
  id: string;
  tenant_id: string;
  trip_id: string;
  from_stop_id: string;
  to_stop_id: string;
  from_seq: number;
  to_seq: number;
  segment_fare: number;
}

export interface SeatLock {
  id: string;
  tenant_id: string;
  trip_id: string;
  seat_numbers: string[];
  from_seq: number;
  to_seq: number;
  locked_by_user?: string;
  session_token: string;
  expires_at: string;
  created_at?: string;
}

export interface Booking {
  id: string;
  tenant_id: string;
  booking_ref: string;
  trip_id: string;
  customer_id?: string;
  counter_id?: string;
  booked_by_user_id?: string;
  booking_source: 'online' | 'counter' | 'admin';
  passenger_name: string;
  passenger_phone: string;
  passenger_email?: string;
  passenger_gender?: 'male' | 'female' | 'other' | 'unspecified';
  from_stop_name: string;
  to_stop_name: string;
  from_seq: number;
  to_seq: number;
  boarding_point: string;
  dropping_point: string;
  seat_count: number;
  subtotal_fare: number;
  discount_amount: number;
  total_payable: number;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded' | 'partially_refunded';
  ticket_status: 'confirmed' | 'cancellation_requested' | 'cancelled' | 'completed' | 'expired';
  cancellation_reason?: string;
  cancellation_requested_at?: string;
  cancellation_confirmed_by?: string;
  cancellation_confirmed_at?: string;
  seats?: BookingSeat[];
  tickets?: Ticket[];
  created_at?: string;
  updated_at?: string;
}

export interface BookingSeat {
  id: string;
  tenant_id: string;
  booking_id: string;
  trip_id: string;
  seat_number: string;
  seat_type: string;
  fare: number;
  from_seq: number;
  to_seq: number;
}

export interface Ticket {
  id: string;
  tenant_id: string;
  ticket_number: string;
  booking_id: string;
  trip_id: string;
  seat_number: string;
  passenger_name: string;
  qr_code_hash: string;
  is_boarded: boolean;
  boarded_at?: string;
  boarded_by_user_id?: string;
  reprint_count: number;
  created_at?: string;
}

export interface Payment {
  id: string;
  tenant_id: string;
  booking_id: string;
  payment_ref: string;
  amount: number;
  currency: string;
  payment_method: 'cash' | 'bkash' | 'nagad' | 'rocket' | 'card' | 'bank_transfer';
  provider_txn_id?: string;
  status: 'successful' | 'pending' | 'failed' | 'refunded';
  collected_by?: string;
  created_at?: string;
}

export interface Refund {
  id: string;
  tenant_id: string;
  booking_id: string;
  ticket_id?: string;
  refund_ref: string;
  amount: number;
  cancellation_fee: number;
  net_refund_amount: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  processed_by?: string;
  created_at?: string;
}

export interface Expense {
  id: string;
  tenant_id: string;
  category: 'fuel' | 'maintenance' | 'salary' | 'counter_rent' | 'terminal_toll' | 'police_legal' | 'food_lodging' | 'miscellaneous';
  title: string;
  amount: number;
  expense_date: string;
  bus_id?: string;
  counter_id?: string;
  recorded_by?: string;
  notes?: string;
  created_at?: string;
}

export interface AuditLog {
  id: string;
  tenant_id?: string;
  actor_id?: string;
  actor_name?: string;
  actor_role?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, unknown>;
  created_at?: string;
}

export interface SupportReply {
  id: string;
  ticket_id: string;
  sender_name: string;
  sender_role: string;
  message: string;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  tenant_id: string;
  customer_id?: string;
  booking_ref?: string;
  subject: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_for_customer' | 'resolved' | 'closed';
  assigned_to?: string;
  replies?: SupportReply[];
  created_at?: string;
  updated_at?: string;
}

export interface Review {
  id: string;
  tenant_id: string;
  trip_id: string;
  booking_id: string;
  customer_name: string;
  rating: number;
  comment?: string;
  status: 'approved' | 'pending' | 'hidden';
  created_at?: string;
}
