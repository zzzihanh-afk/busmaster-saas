-- ==============================================================================
-- BUSMASTER SaaS - REALISTIC BANGLADESH OPERATORS SEED DATA
-- Operators: Green Line Paribahan, Hanif Enterprise, Shohag Paribahan
-- ==============================================================================

-- 1. TENANTS (BUS COMPANIES)
INSERT INTO public.tenants (id, name, slug, logo_url, owner_name, email, phone, address, trade_license, status, settings)
VALUES 
(
    'a1000000-0000-0000-0000-000000000001',
    'Green Line Paribahan',
    'green-line',
    'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=300&q=80',
    'Mohammad Alauddin',
    'owner@greenline.bd',
    '+880 1711-123456',
    '9/2 Outer Circular Road, Rajarbagh, Dhaka',
    'TRAD/DNCC/012948/2023',
    'active',
    '{"currency": "BDT", "currency_symbol": "৳", "timezone": "Asia/Dhaka", "cancellation_allowed": true, "refund_percentage": 85, "primary_color": "#059669"}'::jsonb
),
(
    'a2000000-0000-0000-0000-000000000002',
    'Hanif Enterprise',
    'hanif-enterprise',
    'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=300&q=80',
    'Kofil Uddin',
    'owner@hanif.bd',
    '+880 1819-654321',
    'Technical Intersection, Mirpur Road, Gabtoli, Dhaka',
    'TRAD/DNCC/098712/2022',
    'active',
    '{"currency": "BDT", "currency_symbol": "৳", "timezone": "Asia/Dhaka", "cancellation_allowed": true, "refund_percentage": 80, "primary_color": "#dc2626"}'::jsonb
),
(
    'a3000000-0000-0000-0000-000000000003',
    'Shohag Paribahan',
    'shohag-paribahan',
    'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=300&q=80',
    'Faruk Talukder',
    'owner@shohag.bd',
    '+880 1912-987654',
    '63 DIT Road, Malibagh, Dhaka',
    'TRAD/DSCC/034567/2024',
    'approved',
    '{"currency": "BDT", "currency_symbol": "৳", "timezone": "Asia/Dhaka", "cancellation_allowed": true, "refund_percentage": 90, "primary_color": "#2563eb"}'::jsonb
);

-- 2. USER PROFILES
INSERT INTO public.profiles (id, email, full_name, phone, role, tenant_id)
VALUES
-- Super Admin (Central Platform Controller)
('b0000000-0000-0000-0000-000000000001', 'admin@busmaster.com', 'Tariqul Islam (Super Admin)', '+880 1700-000001', 'super_admin', NULL),

-- Green Line Team
('b1000000-0000-0000-0000-000000000001', 'owner@greenline.bd', 'Mohammad Alauddin (Owner)', '+880 1711-123456', 'company_owner', 'a1000000-0000-0000-0000-000000000001'),
('b1000000-0000-0000-0000-000000000002', 'manager.arambagh@greenline.bd', 'Kabir Hossain (Arambagh Manager)', '+880 1711-123457', 'counter_manager', 'a1000000-0000-0000-0000-000000000001'),
('b1000000-0000-0000-0000-000000000003', 'agent1@greenline.bd', 'Sumon Mia (Ticket Agent)', '+880 1711-123458', 'counter_agent', 'a1000000-0000-0000-0000-000000000001'),
('b1000000-0000-0000-0000-000000000004', 'driver.kalam@greenline.bd', 'Abul Kalam (Senior Driver)', '+880 1711-123459', 'driver', 'a1000000-0000-0000-0000-000000000001'),
('b1000000-0000-0000-0000-000000000005', 'supervisor.rafiq@greenline.bd', 'Rafiqul Islam (Station Supervisor)', '+880 1711-123460', 'supervisor', 'a1000000-0000-0000-0000-000000000001'),

-- Customer
('b9000000-0000-0000-0000-000000000001', 'customer@example.com', 'Tanvir Ahmed (Passenger)', '+880 1811-998877', 'customer', NULL);

-- 3. COUNTERS FOR GREEN LINE
INSERT INTO public.counters (id, tenant_id, name, code, city, address, contact_phone, status)
VALUES
('c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Arambagh Central Counter', 'GL-ARB-01', 'Dhaka', '12 Arambagh Motijheel, Dhaka', '+880 1711-123457', 'active'),
('c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'Sayedabad Terminal Counter', 'GL-SYD-02', 'Dhaka', 'Sayedabad Bus Terminal Platform 4, Dhaka', '+880 1711-123461', 'active'),
('c1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'Dampara Counter', 'GL-CTG-01', 'Chattogram', 'Dampara Bus Stand, Chattogram', '+880 1711-123462', 'active');

-- 4. SEAT LAYOUTS
INSERT INTO public.seat_layouts (id, tenant_id, name, rows_count, cols_count, decks_count, layout_type, grid_data, is_template)
VALUES
(
    '11000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    'Scania Multi-Axle Luxury & Sleeper (36 Seats)',
    9, 4, 1, '2+2',
    '[
      {"seat_number": "A1", "deck": 1, "row": 1, "col": 1, "type": "sleeper", "extra_fare": 350, "price_multiplier": 1.25},
      {"seat_number": "A2", "deck": 1, "row": 1, "col": 2, "type": "sleeper", "extra_fare": 350, "price_multiplier": 1.25},
      {"seat_number": "A3", "deck": 1, "row": 1, "col": 3, "type": "disabled", "is_accessible": true, "extra_fare": 0, "price_multiplier": 1.0},
      {"seat_number": "A4", "deck": 1, "row": 1, "col": 4, "type": "disabled", "is_accessible": true, "extra_fare": 0, "price_multiplier": 1.0},
      {"seat_number": "B1", "deck": 1, "row": 2, "col": 1, "type": "sleeper", "extra_fare": 350, "price_multiplier": 1.25},
      {"seat_number": "B2", "deck": 1, "row": 2, "col": 2, "type": "sleeper", "extra_fare": 350, "price_multiplier": 1.25},
      {"seat_number": "B3", "deck": 1, "row": 2, "col": 3, "type": "regular", "extra_fare": 0, "price_multiplier": 1.0},
      {"seat_number": "B4", "deck": 1, "row": 2, "col": 4, "type": "regular", "extra_fare": 0, "price_multiplier": 1.0},
      {"seat_number": "C1", "deck": 1, "row": 3, "col": 1, "type": "regular", "extra_fare": 0, "price_multiplier": 1.0},
      {"seat_number": "C2", "deck": 1, "row": 3, "col": 2, "type": "regular", "extra_fare": 0, "price_multiplier": 1.0},
      {"seat_number": "C3", "deck": 1, "row": 3, "col": 3, "type": "female", "extra_fare": 0, "price_multiplier": 1.0},
      {"seat_number": "C4", "deck": 1, "row": 3, "col": 4, "type": "female", "extra_fare": 0, "price_multiplier": 1.0},
      {"seat_number": "D1", "deck": 1, "row": 4, "col": 1, "type": "regular", "extra_fare": 0, "price_multiplier": 1.0},
      {"seat_number": "D2", "deck": 1, "row": 4, "col": 2, "type": "regular", "extra_fare": 0, "price_multiplier": 1.0},
      {"seat_number": "D3", "deck": 1, "row": 4, "col": 3, "type": "regular", "extra_fare": 0, "price_multiplier": 1.0},
      {"seat_number": "D4", "deck": 1, "row": 4, "col": 4, "type": "regular", "extra_fare": 0, "price_multiplier": 1.0},
      {"seat_number": "E1", "deck": 1, "row": 5, "col": 1, "type": "premium", "extra_fare": 200, "price_multiplier": 1.15},
      {"seat_number": "E2", "deck": 1, "row": 5, "col": 2, "type": "premium", "extra_fare": 200, "price_multiplier": 1.15},
      {"seat_number": "E3", "deck": 1, "row": 5, "col": 3, "type": "premium", "extra_fare": 200, "price_multiplier": 1.15},
      {"seat_number": "E4", "deck": 1, "row": 5, "col": 4, "type": "premium", "extra_fare": 200, "price_multiplier": 1.15}
    ]'::jsonb,
    TRUE
);

-- 5. BUSES
INSERT INTO public.buses (id, tenant_id, name, reg_no, bus_type, total_capacity, seat_layout_id, manufacturer, model, year, status)
VALUES
('d1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Green Line Scania Multi-Axle #101', 'DHAKA-METRO-BA-11-2024', 'AC', 36, '11000000-0000-0000-0000-000000000001', 'Scania', 'K360', 2023, 'active'),
('d1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'Green Line Volvo B9R #102', 'DHAKA-METRO-BA-11-8899', 'Executive-AC', 32, '11000000-0000-0000-0000-000000000001', 'Volvo', 'B9R', 2024, 'active');

-- 6. ROUTES & STOPS (Segment Example: Dhaka -> Cumilla -> Feni -> Chattogram)
INSERT INTO public.routes (id, tenant_id, origin_city, destination_city, distance_km, estimated_duration_hours, status, description)
VALUES
('e1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Dhaka', 'Chattogram', 250.00, 5.5, 'active', 'Express Highway Route via Cumilla & Feni Bypass');

INSERT INTO public.route_stops (id, tenant_id, route_id, stop_name, sequence_order, arrival_offset_minutes, departure_offset_minutes, can_board, can_drop)
VALUES
('f1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'Arambagh (Dhaka)', 1, 0, 0, TRUE, FALSE),
('f1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'Paduar Bazar (Cumilla)', 2, 120, 130, TRUE, TRUE),
('f1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'Mohipal (Feni)', 3, 190, 200, TRUE, TRUE),
('f1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'Dampara (Chattogram)', 4, 330, 330, FALSE, TRUE);

-- 7. TRIPS
INSERT INTO public.trips (id, tenant_id, route_id, bus_id, driver_id, trip_code, departure_date, departure_time, base_fare, status)
VALUES
('31000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000004', 'GL-DHK-CTG-0600', CURRENT_DATE, '06:00:00', 1400.00, 'scheduled'),
('31000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000004', 'GL-DHK-CTG-1030', CURRENT_DATE, '10:30:00', 1400.00, 'scheduled');

-- 8. TRIP STOPS FOR THE TRIP
INSERT INTO public.trip_stops (id, tenant_id, trip_id, stop_name, sequence_order, can_board, can_drop)
VALUES
('41000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', 'Arambagh (Dhaka)', 1, TRUE, FALSE),
('41000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', 'Paduar Bazar (Cumilla)', 2, TRUE, TRUE),
('41000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', 'Mohipal (Feni)', 3, TRUE, TRUE),
('41000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', 'Dampara (Chattogram)', 4, FALSE, TRUE);

-- 9. TRIP SEGMENTS (with specific fares)
INSERT INTO public.trip_segments (tenant_id, trip_id, from_stop_id, to_stop_id, from_seq, to_seq, segment_fare)
VALUES
('a1000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000002', 1, 2, 450.00), -- Dhaka -> Cumilla
('a1000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000002', '41000000-0000-0000-0000-000000000003', 2, 3, 300.00), -- Cumilla -> Feni
('a1000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000003', '41000000-0000-0000-0000-000000000004', 3, 4, 650.00), -- Feni -> Chattogram
('a1000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000004', 1, 4, 1400.00); -- Dhaka -> Chattogram (Full Journey)
