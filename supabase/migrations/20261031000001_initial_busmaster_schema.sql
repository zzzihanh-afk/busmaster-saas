-- ==============================================================================
-- BUSMASTER SaaS - COMPLETE POSTGRESQL SCHEMA MIGRATION
-- Database: Supabase PostgreSQL
-- Multi-tenancy: Tenant Isolation via Row Level Security (RLS)
-- Features: Segment-based inventory, atomic seat locks & booking, role hierarchies
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. TENANTS & MULTI-TENANCY
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    owner_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT,
    trade_license VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'suspended', 'active', 'inactive')),
    settings JSONB DEFAULT '{
      "currency": "BDT",
      "currency_symbol": "৳",
      "timezone": "Asia/Dhaka",
      "cancellation_allowed": true,
      "cancellation_cutoff_hours": 12,
      "refund_percentage": 85,
      "primary_color": "#1e40af",
      "secondary_color": "#3b82f6"
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON public.tenants(status);

-- ------------------------------------------------------------------------------
-- 2. USER PROFILES & RBAC ROLES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- References auth.users(id) in Supabase Auth
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    avatar_url TEXT,
    role VARCHAR(50) NOT NULL CHECK (role IN (
        'super_admin',
        'company_owner',
        'company_admin',
        'counter_manager',
        'counter_agent',
        'supervisor',
        'driver',
        'customer'
    )),
    counter_id UUID,
    license_number VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ------------------------------------------------------------------------------
-- 3. COUNTERS (PHYSICAL BUS STATIONS / TICKET BOOTHS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.counters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    city VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    contact_phone VARCHAR(50) NOT NULL,
    manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_tenant_counter_code UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_counters_tenant ON public.counters(tenant_id);

-- ------------------------------------------------------------------------------
-- 4. CASH SESSIONS (COUNTER REGISTER RECONCILIATION)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cash_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    counter_id UUID NOT NULL REFERENCES public.counters(id) ON DELETE CASCADE,
    opened_by UUID NOT NULL REFERENCES public.profiles(id),
    closed_by UUID REFERENCES public.profiles(id),
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    opening_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    cash_collected NUMERIC(12, 2) DEFAULT 0.00,
    cash_refunded NUMERIC(12, 2) DEFAULT 0.00,
    closing_balance NUMERIC(12, 2),
    expected_balance NUMERIC(12, 2),
    discrepancy NUMERIC(12, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_cash_sessions_tenant ON public.cash_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_counter ON public.cash_sessions(counter_id);

-- ------------------------------------------------------------------------------
-- 5. FLEET: SEAT LAYOUTS & BUSES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.seat_layouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    rows_count INT NOT NULL DEFAULT 10,
    cols_count INT NOT NULL DEFAULT 4,
    decks_count INT NOT NULL DEFAULT 1 CHECK (decks_count IN (1, 2)),
    layout_type VARCHAR(50) DEFAULT '2+2' CHECK (layout_type IN ('2+2', '2+1', '1+1', 'sleeper', 'double-decker', 'custom')),
    grid_data JSONB NOT NULL, -- Array of seats: { seat_number, deck, row, col, type, is_accessible, etc. }
    is_template BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.buses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    reg_no VARCHAR(100) NOT NULL,
    bus_type VARCHAR(50) NOT NULL CHECK (bus_type IN ('AC', 'Non-AC', 'Sleeper-AC', 'Executive-AC')),
    total_capacity INT NOT NULL,
    deck_config VARCHAR(50) DEFAULT 'single' CHECK (deck_config IN ('single', 'double')),
    seat_layout_id UUID REFERENCES public.seat_layouts(id) ON DELETE SET NULL,
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    year INT,
    fitness_expiry DATE,
    insurance_expiry DATE,
    assigned_driver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_assistant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'out_of_service')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_tenant_bus_reg UNIQUE(tenant_id, reg_no)
);

CREATE INDEX IF NOT EXISTS idx_buses_tenant ON public.buses(tenant_id);

-- ------------------------------------------------------------------------------
-- 6. ROUTES & ROUTE STOPS (Dhaka -> Cumilla -> Feni -> Chattogram)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    origin_city VARCHAR(100) NOT NULL,
    destination_city VARCHAR(100) NOT NULL,
    distance_km NUMERIC(8, 2),
    estimated_duration_hours NUMERIC(4, 2),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_routes_tenant ON public.routes(tenant_id);

CREATE TABLE IF NOT EXISTS public.route_stops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
    stop_name VARCHAR(150) NOT NULL,
    sequence_order INT NOT NULL,
    location_address TEXT,
    arrival_offset_minutes INT DEFAULT 0,
    departure_offset_minutes INT DEFAULT 0,
    can_board BOOLEAN DEFAULT TRUE,
    can_drop BOOLEAN DEFAULT TRUE,
    counter_id UUID REFERENCES public.counters(id) ON DELETE SET NULL,
    CONSTRAINT unique_route_stop_order UNIQUE(route_id, sequence_order)
);

CREATE INDEX IF NOT EXISTS idx_route_stops_route ON public.route_stops(route_id);

-- ------------------------------------------------------------------------------
-- 7. SCHEDULES & TRIPS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
    bus_id UUID REFERENCES public.buses(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    departure_time TIME NOT NULL,
    recurring_days INT[] DEFAULT '{1,2,3,4,5,6,7}', -- 1=Monday ... 7=Sunday
    default_fare NUMERIC(10, 2) NOT NULL DEFAULT 500.00,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES public.schedules(id) ON DELETE SET NULL,
    route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
    bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE RESTRICT,
    driver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    trip_code VARCHAR(50) NOT NULL,
    departure_date DATE NOT NULL,
    departure_time TIME NOT NULL,
    arrival_estimate TIMESTAMPTZ,
    base_fare NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN (
        'scheduled', 'boarding', 'in_transit', 'arrived', 'completed', 'delayed', 'cancelled'
    )),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_tenant_trip_code UNIQUE(tenant_id, trip_code)
);

CREATE INDEX IF NOT EXISTS idx_trips_tenant ON public.trips(tenant_id);
CREATE INDEX IF NOT EXISTS idx_trips_date ON public.trips(departure_date);
CREATE INDEX IF NOT EXISTS idx_trips_status ON public.trips(status);

-- ------------------------------------------------------------------------------
-- 8. TRIP STOPS & TRIP SEGMENTS (SEGMENT-BASED INVENTORY ENGINE)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trip_stops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    stop_name VARCHAR(150) NOT NULL,
    sequence_order INT NOT NULL,
    scheduled_arrival TIMESTAMPTZ,
    scheduled_departure TIMESTAMPTZ,
    can_board BOOLEAN DEFAULT TRUE,
    can_drop BOOLEAN DEFAULT TRUE,
    CONSTRAINT unique_trip_stop_seq UNIQUE(trip_id, sequence_order)
);

CREATE TABLE IF NOT EXISTS public.trip_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    from_stop_id UUID NOT NULL REFERENCES public.trip_stops(id) ON DELETE CASCADE,
    to_stop_id UUID NOT NULL REFERENCES public.trip_stops(id) ON DELETE CASCADE,
    from_seq INT NOT NULL,
    to_seq INT NOT NULL,
    segment_fare NUMERIC(10, 2) NOT NULL,
    CONSTRAINT check_segment_order CHECK (to_seq > from_seq)
);

CREATE INDEX IF NOT EXISTS idx_segments_trip ON public.trip_segments(trip_id);

-- ------------------------------------------------------------------------------
-- 9. SEAT LOCKS & SEGMENT-BASED INVENTORY
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.seat_locks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    seat_numbers TEXT[] NOT NULL,
    from_seq INT NOT NULL,
    to_seq INT NOT NULL,
    locked_by_user UUID,
    session_token VARCHAR(100) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seat_locks_trip ON public.seat_locks(trip_id);
CREATE INDEX IF NOT EXISTS idx_seat_locks_expiry ON public.seat_locks(expires_at);

-- ------------------------------------------------------------------------------
-- 10. BOOKINGS, PASSENGERS & TICKETS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    booking_ref VARCHAR(50) NOT NULL,
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE RESTRICT,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    counter_id UUID REFERENCES public.counters(id) ON DELETE SET NULL,
    booked_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    booking_source VARCHAR(50) DEFAULT 'counter' CHECK (booking_source IN ('online', 'counter', 'admin')),
    passenger_name VARCHAR(255) NOT NULL,
    passenger_phone VARCHAR(50) NOT NULL,
    passenger_email VARCHAR(255),
    passenger_gender VARCHAR(20) DEFAULT 'unspecified' CHECK (passenger_gender IN ('male', 'female', 'other', 'unspecified')),
    from_stop_name VARCHAR(150) NOT NULL,
    to_stop_name VARCHAR(150) NOT NULL,
    from_seq INT NOT NULL,
    to_seq INT NOT NULL,
    boarding_point VARCHAR(255) NOT NULL,
    dropping_point VARCHAR(255) NOT NULL,
    seat_count INT NOT NULL DEFAULT 1,
    subtotal_fare NUMERIC(10, 2) NOT NULL,
    discount_amount NUMERIC(10, 2) DEFAULT 0.00,
    total_payable NUMERIC(10, 2) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded', 'partially_refunded')),
    ticket_status VARCHAR(50) DEFAULT 'confirmed' CHECK (ticket_status IN ('confirmed', 'cancelled', 'completed', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_tenant_booking_ref UNIQUE(tenant_id, booking_ref)
);

CREATE INDEX IF NOT EXISTS idx_bookings_tenant ON public.bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_ref ON public.bookings(booking_ref);
CREATE INDEX IF NOT EXISTS idx_bookings_trip ON public.bookings(trip_id);

CREATE TABLE IF NOT EXISTS public.booking_seats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    seat_number VARCHAR(20) NOT NULL,
    seat_type VARCHAR(50) DEFAULT 'regular',
    fare NUMERIC(10, 2) NOT NULL,
    from_seq INT NOT NULL,
    to_seq INT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_booking_seats_trip ON public.booking_seats(trip_id);

CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    ticket_number VARCHAR(100) NOT NULL,
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE RESTRICT,
    seat_number VARCHAR(20) NOT NULL,
    passenger_name VARCHAR(255) NOT NULL,
    qr_code_hash VARCHAR(255) NOT NULL,
    is_boarded BOOLEAN DEFAULT FALSE,
    boarded_at TIMESTAMPTZ,
    boarded_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reprint_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_tenant_ticket_number UNIQUE(tenant_id, ticket_number)
);

CREATE INDEX IF NOT EXISTS idx_tickets_ticket_num ON public.tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_tickets_booking ON public.tickets(booking_id);

-- ------------------------------------------------------------------------------
-- 11. PAYMENTS & REFUNDS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    payment_ref VARCHAR(100) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'BDT',
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'bkash', 'nagad', 'rocket', 'card', 'bank_transfer')),
    provider_txn_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'successful' CHECK (status IN ('successful', 'pending', 'failed', 'refunded')),
    collected_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    refund_ref VARCHAR(100) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    cancellation_fee NUMERIC(10, 2) DEFAULT 0.00,
    net_refund_amount NUMERIC(10, 2) NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
    processed_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 12. EXPENSES & FINANCE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL CHECK (category IN ('fuel', 'maintenance', 'salary', 'counter_rent', 'terminal_toll', 'police_legal', 'food_lodging', 'miscellaneous')),
    title VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    expense_date DATE NOT NULL,
    bus_id UUID REFERENCES public.buses(id) ON DELETE SET NULL,
    counter_id UUID REFERENCES public.counters(id) ON DELETE SET NULL,
    recorded_by UUID REFERENCES public.profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 13. AUDIT LOGS (IMMUTABLE)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    actor_id UUID,
    actor_name VARCHAR(255),
    actor_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant ON public.audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at);

-- ------------------------------------------------------------------------------
-- 14. SUPPORT TICKETS & PASSENGER REVIEWS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    booking_ref VARCHAR(50),
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(50) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    assigned_to UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    status VARCHAR(50) DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'hidden')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 15. ATOMIC SEGMENT INVENTORY CHECK & BOOKING FUNCTION
-- Enforces: Non-overlapping segments may book the same seat; overlapping segments conflict.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_check_seat_availability(
    p_trip_id UUID,
    p_seat_number VARCHAR(20),
    p_from_seq INT,
    p_to_seq INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_conflict_count INT;
BEGIN
    -- Check if seat is currently booked on any overlapping segment:
    -- Two segments [from1, to1] and [from2, to2] overlap iff from1 < to2 AND from2 < to1
    SELECT COUNT(*)
    INTO v_conflict_count
    FROM public.booking_seats bs
    JOIN public.bookings b ON bs.booking_id = b.id
    WHERE bs.trip_id = p_trip_id
      AND bs.seat_number = p_seat_number
      AND b.ticket_status = 'confirmed'
      AND (bs.from_seq < p_to_seq AND p_from_seq < bs.to_seq);

    IF v_conflict_count > 0 THEN
        RETURN FALSE;
    END IF;

    -- Check if seat is currently temporarily locked and not expired
    SELECT COUNT(*)
    INTO v_conflict_count
    FROM public.seat_locks sl
    WHERE sl.trip_id = p_trip_id
      AND p_seat_number = ANY(sl.seat_numbers)
      AND sl.expires_at > NOW()
      AND (sl.from_seq < p_to_seq AND p_from_seq < sl.to_seq);

    IF v_conflict_count > 0 THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$;

-- ------------------------------------------------------------------------------
-- 16. ATOMIC SEAT BOOKING STORED PROCEDURE / FUNCTION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_book_seats_atomic(
    p_tenant_id UUID,
    p_trip_id UUID,
    p_customer_id UUID,
    p_counter_id UUID,
    p_booked_by UUID,
    p_booking_source VARCHAR(50),
    p_passenger_name VARCHAR(255),
    p_passenger_phone VARCHAR(50),
    p_passenger_email VARCHAR(255),
    p_from_stop_name VARCHAR(150),
    p_to_stop_name VARCHAR(150),
    p_from_seq INT,
    p_to_seq INT,
    p_boarding_point VARCHAR(255),
    p_dropping_point VARCHAR(255),
    p_seats VARCHAR(20)[],
    p_fare_per_seat NUMERIC(10, 2),
    p_discount NUMERIC(10, 2),
    p_payment_method VARCHAR(50),
    p_provider_txn_id VARCHAR(100)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_seat VARCHAR(20);
    v_is_available BOOLEAN;
    v_booking_id UUID;
    v_booking_ref VARCHAR(50);
    v_seat_count INT;
    v_subtotal NUMERIC(10, 2);
    v_total NUMERIC(10, 2);
    v_ticket_num VARCHAR(100);
    v_qr_hash VARCHAR(255);
BEGIN
    v_seat_count := array_length(p_seats, 1);
    IF v_seat_count IS NULL OR v_seat_count = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'No seats specified');
    END IF;

    -- 1. Check availability for every requested seat
    FOREACH v_seat IN ARRAY p_seats LOOP
        v_is_available := public.fn_check_seat_availability(p_trip_id, v_seat, p_from_seq, p_to_seq);
        IF NOT v_is_available THEN
            RETURN jsonb_build_object('success', false, 'error', 'Seat ' || v_seat || ' is already booked or locked for this journey segment');
        END IF;
    END LOOP;

    -- 2. Calculate totals
    v_subtotal := v_seat_count * p_fare_per_seat;
    v_total := v_subtotal - COALESCE(p_discount, 0.00);
    v_booking_ref := 'BM-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));

    -- 3. Insert Booking
    INSERT INTO public.bookings (
        tenant_id, booking_ref, trip_id, customer_id, counter_id, booked_by_user_id,
        booking_source, passenger_name, passenger_phone, passenger_email,
        from_stop_name, to_stop_name, from_seq, to_seq, boarding_point, dropping_point,
        seat_count, subtotal_fare, discount_amount, total_payable,
        payment_status, ticket_status
    ) VALUES (
        p_tenant_id, v_booking_ref, p_trip_id, p_customer_id, p_counter_id, p_booked_by,
        p_booking_source, p_passenger_name, p_passenger_phone, p_passenger_email,
        p_from_stop_name, p_to_stop_name, p_from_seq, p_to_seq, p_boarding_point, p_dropping_point,
        v_seat_count, v_subtotal, COALESCE(p_discount, 0.00), v_total,
        'completed', 'confirmed'
    ) RETURNING id INTO v_booking_id;

    -- 4. Insert booking seats & tickets
    FOREACH v_seat IN ARRAY p_seats LOOP
        INSERT INTO public.booking_seats (
            tenant_id, booking_id, trip_id, seat_number, fare, from_seq, to_seq
        ) VALUES (
            p_tenant_id, v_booking_id, p_trip_id, v_seat, p_fare_per_seat, p_from_seq, p_to_seq
        );

        v_ticket_num := 'TKT-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 10));
        v_qr_hash := MD5(v_ticket_num || ':' || v_booking_ref || ':' || v_seat);

        INSERT INTO public.tickets (
            tenant_id, ticket_number, booking_id, trip_id, seat_number,
            passenger_name, qr_code_hash
        ) VALUES (
            p_tenant_id, v_ticket_num, v_booking_id, p_trip_id, v_seat,
            p_passenger_name, v_qr_hash
        );
    END LOOP;

    -- 5. Record Payment
    INSERT INTO public.payments (
        tenant_id, booking_id, payment_ref, amount, payment_method, provider_txn_id, status, collected_by
    ) VALUES (
        p_tenant_id, v_booking_id, 'PAY-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8)),
        v_total, p_payment_method, p_provider_txn_id, 'successful', p_booked_by
    );

    -- 6. Log Audit
    INSERT INTO public.audit_logs (
        tenant_id, actor_id, actor_name, action, entity_type, entity_id, details
    ) VALUES (
        p_tenant_id, p_booked_by, p_passenger_name, 'CREATE_BOOKING', 'BOOKING', v_booking_id::TEXT,
        jsonb_build_object('booking_ref', v_booking_ref, 'seats', p_seats, 'total', v_total)
    );

    RETURN jsonb_build_object(
        'success', true,
        'booking_id', v_booking_id,
        'booking_ref', v_booking_ref,
        'seats', p_seats,
        'total_payable', v_total
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 17. ROW LEVEL SECURITY (RLS) POLICIES
-- Multi-Tenancy Guarantee:
-- Super Admin: unrestricted access to all tenant records.
-- Company Owner: full access to their company's tenant_id records.
-- Counter Agent / Manager: access to their counter and company's trips.
-- Customer: access to their own bookings and tickets.
-- ------------------------------------------------------------------------------

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Helper to check if current user is Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper to get tenant_id of current user
CREATE OR REPLACE FUNCTION public.current_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- TENANTS POLICIES
CREATE POLICY "Super admin can do anything with tenants"
    ON public.tenants FOR ALL
    USING (public.is_super_admin() OR auth.role() = 'service_role');

CREATE POLICY "Public can view approved tenants"
    ON public.tenants FOR SELECT
    USING (status = 'approved' OR status = 'active');

CREATE POLICY "Company owner can view and edit own tenant"
    ON public.tenants FOR ALL
    USING (id = public.current_user_tenant_id());

-- GENERIC TENANT ISOLATION POLICY CREATION (Example on Trips & Bookings)
CREATE POLICY "Tenant isolation for trips"
    ON public.trips FOR ALL
    USING (
        public.is_super_admin()
        OR auth.role() = 'service_role'
        OR tenant_id = public.current_user_tenant_id()
    );

CREATE POLICY "Public can view scheduled trips"
    ON public.trips FOR SELECT
    USING (status IN ('scheduled', 'boarding'));

CREATE POLICY "Tenant isolation for bookings"
    ON public.bookings FOR ALL
    USING (
        public.is_super_admin()
        OR auth.role() = 'service_role'
        OR tenant_id = public.current_user_tenant_id()
        OR customer_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Tenant isolation for buses"
    ON public.buses FOR ALL
    USING (
        public.is_super_admin()
        OR auth.role() = 'service_role'
        OR tenant_id = public.current_user_tenant_id()
    );

CREATE POLICY "Tenant isolation for counters"
    ON public.counters FOR ALL
    USING (
        public.is_super_admin()
        OR auth.role() = 'service_role'
        OR tenant_id = public.current_user_tenant_id()
    );

CREATE POLICY "Tenant isolation for expenses"
    ON public.expenses FOR ALL
    USING (
        public.is_super_admin()
        OR auth.role() = 'service_role'
        OR tenant_id = public.current_user_tenant_id()
    );
