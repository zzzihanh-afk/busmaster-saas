import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { dbStore } from '../../services/dbStore';
import { Trip, Booking, Counter, Bus, Route, SeatType } from '../../types';
import {
  Ticket as TicketIcon,
  Armchair,
  Printer,
  CheckCircle,
  CreditCard,
  DollarSign,
  Smartphone,
  RotateCcw,
  User,
  Phone,
  MapPin,
  Calendar,
  AlertTriangle,
  Plus,
  Building2,
  Tag,
  Coins,
  Check,
  AlertCircle,
  Bus as BusIcon,
  Compass,
  Bed,
  Accessibility,
  Sparkles,
  Sliders,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';

export const CounterAgentPortal: React.FC = () => {
  const { tenant, counter, profile, switchCounter, isSuperAdmin, isCompanyOwner } = useAuth();
  const tenantId = tenant?.id || '';

  const [trips, setTrips] = useState<Trip[]>(() => dbStore.getTrips(tenantId));
  const [counters, setCounters] = useState<Counter[]>(() => dbStore.getCounters(tenantId));
  const [buses, setBuses] = useState<Bus[]>(() => dbStore.getBuses(tenantId));
  const [routes, setRoutes] = useState<Route[]>(() => dbStore.getRoutes(tenantId));
  const [pendingCancellations, setPendingCancellations] = useState<Booking[]>(() =>
    dbStore.getBookings(tenantId).filter((b) => b.ticket_status === 'cancellation_requested')
  );

  const openSession = dbStore
    .getCashSessions(tenantId)
    .find((s) => s.counter_id === counter?.id && s.status === 'open');

  // Search & Filter
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedTripId, setSelectedTripId] = useState<string>(trips[0]?.id || '');
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  // Synchronization with tenant changes
  useEffect(() => {
    const tTrips = dbStore.getTrips(tenantId);
    const tCounters = dbStore.getCounters(tenantId);
    const tBuses = dbStore.getBuses(tenantId);
    const tRoutes = dbStore.getRoutes(tenantId);
    const tCancellations = dbStore
      .getBookings(tenantId)
      .filter((b) => b.ticket_status === 'cancellation_requested');

    setTrips(tTrips);
    setCounters(tCounters);
    setBuses(tBuses);
    setRoutes(tRoutes);
    setPendingCancellations(tCancellations);

    if (tTrips.length > 0) {
      setSelectedTripId(tTrips[0].id);
    } else {
      setSelectedTripId('');
    }

    if (tCounters.length > 0 && (!counter || counter.tenant_id !== tenantId)) {
      switchCounter(tCounters[0].id);
      setBoardingPoint(tCounters[0].name);
    }
  }, [tenantId]);

  // Re-sync with store updates
  useEffect(() => {
    const unsub = dbStore.subscribe(() => {
      const tTrips = dbStore.getTrips(tenantId);
      const tCounters = dbStore.getCounters(tenantId);
      const tBuses = dbStore.getBuses(tenantId);
      const tRoutes = dbStore.getRoutes(tenantId);
      const tCancellations = dbStore
        .getBookings(tenantId)
        .filter((b) => b.ticket_status === 'cancellation_requested');

      setTrips(tTrips);
      setCounters(tCounters);
      setBuses(tBuses);
      setRoutes(tRoutes);
      setPendingCancellations(tCancellations);
    });
    return unsub;
  }, [tenantId]);

  const handleAcceptCancellation = (bookingId: string) => {
    const res = dbStore.acceptBookingCancellation(
      bookingId,
      profile?.full_name || 'Counter Clerk',
      counter?.id
    );
    if (res.success) {
      alert(`Cancellation confirmed! Refund of ৳${res.refundAmount} authorized and seat inventory released.`);
    } else {
      alert(res.error || 'Failed to accept cancellation');
    }
  };

  const handleRejectCancellation = (bookingId: string) => {
    const res = dbStore.rejectBookingCancellation(
      bookingId,
      'Counter clerk rejected passenger cancellation request',
      profile?.full_name || 'Counter Clerk'
    );
    if (res.success) {
      alert('Cancellation request rejected. Ticket remains active.');
    } else {
      alert(res.error || 'Failed to reject cancellation');
    }
  };

  // Auto-synchronize selectedTripId if current trip becomes invalid
  useEffect(() => {
    if (trips.length > 0) {
      if (!selectedTripId || !trips.some((t) => t.id === selectedTripId)) {
        setSelectedTripId(trips[0].id);
      }
    } else {
      setSelectedTripId('');
    }
  }, [trips, selectedTripId]);

  // Journey Segment Selection
  const currentTrip = trips.find((t) => t.id === selectedTripId) || trips[0];
  const routeStops = currentTrip?.route?.stops || [
    { sequence_order: 1, stop_name: 'Dhaka Central Terminal' },
    { sequence_order: 2, stop_name: 'Highway Midpoint' },
    { sequence_order: 3, stop_name: 'Bypass Crossing' },
    { sequence_order: 4, stop_name: 'Chattogram Dampara' },
  ];

  const [fromSeq, setFromSeq] = useState<number>(1);
  const [toSeq, setToSeq] = useState<number>(4);

  // Seat Availability Status Map
  const [seatStatuses, setSeatStatuses] = useState<
    Record<string, { status: 'available' | 'booked' | 'locked'; passengerName?: string }>
  >({});

  // Passenger Form
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [passengerEmail, setPassengerEmail] = useState('');
  const [boardingPoint, setBoardingPoint] = useState(counter?.name || 'Dhaka Central Counter');
  const [droppingPoint, setDroppingPoint] = useState('Chattogram Dampara Stand');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bkash' | 'nagad' | 'card'>('cash');
  const [providerTxnId, setProviderTxnId] = useState('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Modals State
  const [showAddCounterModal, setShowAddCounterModal] = useState(false);
  const [newCounter, setNewCounter] = useState({
    name: `${tenant?.name || 'Operator'} Central Counter`,
    code: '',
    city: 'Dhaka',
    address: 'Central Terminal, Dhaka',
    contact_phone: '+880 1711-123456',
  });

  const [showAddTripModal, setShowAddTripModal] = useState(false);
  const [newTrip, setNewTrip] = useState({
    route_id: '',
    bus_id: '',
    trip_code: '',
    departure_date: new Date().toISOString().split('T')[0],
    departure_time: '08:30',
    base_fare: 1400,
    custom_origin: 'Dhaka',
    custom_destination: 'Chattogram',
    custom_bus_name: `${tenant?.name || 'Express'} Scania HD #101`,
  });

  const [showAddCashModal, setShowAddCashModal] = useState(false);
  const [addCashAmount, setAddCashAmount] = useState<number>(1000);

  // Confirmation & Print Ticket State
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [printFormat, setPrintFormat] = useState<'standard' | 'thermal' | 'a4'>('thermal');
  const [errorMessage, setErrorMessage] = useState('');

  // Update stops and boarding/dropping when trip changes
  useEffect(() => {
    if (currentTrip?.route?.stops && currentTrip.route.stops.length > 1) {
      const stops = currentTrip.route.stops;
      setFromSeq(stops[0].sequence_order);
      setToSeq(stops[stops.length - 1].sequence_order);
      if (counter?.name) {
        setBoardingPoint(counter.name);
      } else {
        setBoardingPoint(stops[0].stop_name);
      }
      setDroppingPoint(stops[stops.length - 1].stop_name);
    }
  }, [currentTrip?.id, counter?.id]);

  // Update seat statuses whenever trip or segment selection changes
  useEffect(() => {
    if (currentTrip) {
      const statuses = dbStore.getSeatStatusesForSegment(currentTrip.id, fromSeq, toSeq);
      setSeatStatuses(statuses);
      setSelectedSeats([]);
    } else {
      setSeatStatuses({});
      setSelectedSeats([]);
    }
  }, [currentTrip?.id, fromSeq, toSeq]);

  const handleSeatToggle = (seatNumber: string) => {
    if (!currentTrip) {
      alert('Please select or dispatch a departure trip first.');
      return;
    }
    const seatInfo = seatStatuses[seatNumber];
    if (seatInfo && seatInfo.status === 'booked') {
      alert(`Seat ${seatNumber} is already booked on this journey section for ${seatInfo.passengerName || 'another passenger'}!`);
      return;
    }
    if (selectedSeats.includes(seatNumber)) {
      setSelectedSeats(selectedSeats.filter((s) => s !== seatNumber));
    } else {
      setSelectedSeats([...selectedSeats, seatNumber]);
    }
  };

  // Filter for Counter Seat Map
  const [seatTypeFilter, setSeatTypeFilter] = useState<SeatType | 'all'>('all');

  // Layout and pricing calculation
  const currentTripLayout = currentTrip ? dbStore.getSeatLayoutForTrip(currentTrip.id) : undefined;
  const layoutGridSeats = currentTripLayout?.grid_data || [];

  const getSeatInfo = (seatNumber: string) => {
    const item = layoutGridSeats.find((s) => s.seat_number === seatNumber);
    const base = currentTrip?.base_fare || 1400;
    const type: SeatType = item?.type || 'regular';
    let fullFare = base;
    if (item?.extra_fare !== undefined && item.extra_fare > 0) {
      fullFare = base + item.extra_fare;
    } else if (item?.price_multiplier && item.price_multiplier > 1) {
      fullFare = Math.round(base * item.price_multiplier);
    } else if (type === 'sleeper') {
      fullFare = base + 350;
    } else if (type === 'premium') {
      fullFare = base + 200;
    }
    const segmentRatio = Math.max(0.3, (toSeq - fromSeq) / 3);
    const effective = Math.round(fullFare * segmentRatio);
    return {
      seatNumber,
      type,
      isAccessible: Boolean(item?.is_accessible || type === 'disabled'),
      fare: effective,
    };
  };

  const segmentRatio = Math.max(0.3, (toSeq - fromSeq) / 3);
  const subtotal = selectedSeats.reduce((sum, seatNum) => sum + getSeatInfo(seatNum).fare, 0);
  const effectiveFare = selectedSeats.length > 0
    ? Math.round(subtotal / selectedSeats.length)
    : Math.round((currentTrip?.base_fare || 1400) * segmentRatio);
  const netTotal = Math.max(0, subtotal - discountAmount);

  const seatFaresRecord: Record<string, { fare: number; type: SeatType }> = {};
  selectedSeats.forEach((seatNum) => {
    const info = getSeatInfo(seatNum);
    seatFaresRecord[seatNum] = { fare: info.fare, type: info.type };
  });

  // Quick Counter Creation
  const handleCreateCounter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCounter.name.trim()) return;
    const code =
      newCounter.code.trim() ||
      `${(tenant?.slug || 'CNT').substring(0, 3).toUpperCase()}-${newCounter.city.substring(0, 3).toUpperCase()}-${Math.floor(10 + Math.random() * 90)}`;

    const createdCounter: Counter = {
      id: 'cnt-' + Date.now(),
      tenant_id: tenantId,
      name: newCounter.name.trim(),
      code: code,
      city: newCounter.city.trim() || 'Dhaka',
      address: newCounter.address.trim() || `${newCounter.city}, Bangladesh`,
      contact_phone: newCounter.contact_phone.trim() || '+880 1711-000000',
      status: 'active',
    };
    dbStore.saveCounter(createdCounter);
    const updatedCounters = dbStore.getCounters(tenantId);
    setCounters(updatedCounters);
    switchCounter(createdCounter.id);
    setBoardingPoint(createdCounter.name);
    setShowAddCounterModal(false);
  };

  // Quick Trip Creation
  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();

    let routeId = newTrip.route_id;
    let busId = newTrip.bus_id;

    // Auto-create or pick Route
    const currentRoutes = dbStore.getRoutes(tenantId);
    if (!routeId || !currentRoutes.some((r) => r.id === routeId)) {
      if (currentRoutes.length > 0) {
        routeId = currentRoutes[0].id;
      } else {
        const autoRoute: Route = {
          id: 'rt-' + Date.now(),
          tenant_id: tenantId,
          origin_city: newTrip.custom_origin || 'Dhaka',
          destination_city: newTrip.custom_destination || 'Chattogram',
          distance_km: 250,
          estimated_duration_hours: 5.5,
          status: 'active',
          description: `${tenant?.name || 'Operator'} Express Route`,
          stops: [
            { id: 'st-1-' + Date.now(), tenant_id: tenantId, route_id: 'rt-' + Date.now(), stop_name: `${newTrip.custom_origin || 'Dhaka'} Central Terminal`, sequence_order: 1, arrival_offset_minutes: 0, departure_offset_minutes: 0, can_board: true, can_drop: false },
            { id: 'st-2-' + Date.now(), tenant_id: tenantId, route_id: 'rt-' + Date.now(), stop_name: 'Cumilla Paduar Bazar Highway Bypass', sequence_order: 2, arrival_offset_minutes: 120, departure_offset_minutes: 130, can_board: true, can_drop: true },
            { id: 'st-3-' + Date.now(), tenant_id: tenantId, route_id: 'rt-' + Date.now(), stop_name: 'Feni Mohipal Highway Crossing', sequence_order: 3, arrival_offset_minutes: 190, departure_offset_minutes: 200, can_board: true, can_drop: true },
            { id: 'st-4-' + Date.now(), tenant_id: tenantId, route_id: 'rt-' + Date.now(), stop_name: `${newTrip.custom_destination || 'Chattogram'} Dampara Stand`, sequence_order: 4, arrival_offset_minutes: 330, departure_offset_minutes: 330, can_board: false, can_drop: true },
          ],
        };
        dbStore.saveRoute(autoRoute);
        routeId = autoRoute.id;
      }
    }

    // Auto-create or pick Bus
    const currentBuses = dbStore.getBuses(tenantId);
    if (!busId || !currentBuses.some((b) => b.id === busId)) {
      if (currentBuses.length > 0) {
        busId = currentBuses[0].id;
      } else {
        const autoBus: Bus = {
          id: 'bus-' + Date.now(),
          tenant_id: tenantId,
          name: newTrip.custom_bus_name || `${tenant?.name || 'Express'} Scania HD #101`,
          reg_no: `DHAKA-METRO-BA-15-${Math.floor(1000 + Math.random() * 9000)}`,
          bus_type: 'AC',
          total_capacity: 36,
          deck_config: 'single',
          seat_layout_id: 'layout-gl-scania-36',
          status: 'active',
        };
        dbStore.saveBus(autoBus);
        busId = autoBus.id;
      }
    }

    const tripCode =
      newTrip.trip_code.trim() ||
      `${tenant?.slug?.substring(0, 3).toUpperCase() || 'TRP'}-${newTrip.departure_time.replace(':', '')}`;

    const createdTrip: Trip = {
      id: 'trip-' + Date.now(),
      tenant_id: tenantId,
      route_id: routeId,
      bus_id: busId,
      trip_code: tripCode,
      departure_date: newTrip.departure_date,
      departure_time: newTrip.departure_time,
      base_fare: Number(newTrip.base_fare) || 1400,
      status: 'scheduled',
      created_at: new Date().toISOString(),
    };

    dbStore.saveTrip(createdTrip);
    const updatedTrips = dbStore.getTrips(tenantId);
    setTrips(updatedTrips);
    setSelectedTripId(createdTrip.id);
    setShowAddTripModal(false);
  };

  // Quick Add Cash to Session
  const handleAddCashFloat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!openSession) {
      alert('Please open a cash drawer session first in the Counter Manager portal.');
      return;
    }
    openSession.cash_collected += Number(addCashAmount);
    openSession.expected_balance =
      openSession.opening_balance + openSession.cash_collected - openSession.cash_refunded;
    dbStore.saveCashSession(openSession);
    setShowAddCashModal(false);
  };

  // Atomic Booking Execution
  const handleConfirmCounterBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!currentTrip) {
      setErrorMessage('Please select or dispatch an active departure trip.');
      return;
    }
    if (selectedSeats.length === 0) {
      setErrorMessage('Please click and select at least one seat on the seat map (e.g. A1, B1).');
      return;
    }
    if (!passengerName.trim() || !passengerPhone.trim()) {
      setErrorMessage('Passenger Full Name and Mobile Contact Number are required.');
      return;
    }

    const fromStopObj = routeStops.find((s) => s.sequence_order === fromSeq);
    const toStopObj = routeStops.find((s) => s.sequence_order === toSeq);

    const result = dbStore.bookSeatsAtomic({
      tenantId: tenantId,
      tripId: currentTrip.id,
      counterId: counter?.id,
      bookedByUserId: profile.id,
      bookingSource: 'counter',
      passengerName: passengerName.trim(),
      passengerPhone: passengerPhone.trim(),
      passengerEmail: passengerEmail.trim(),
      fromStopName: fromStopObj?.stop_name || 'Departure Station',
      toStopName: toStopObj?.stop_name || 'Arrival Station',
      fromSeq,
      toSeq,
      boardingPoint: boardingPoint || fromStopObj?.stop_name || 'Counter Terminal',
      droppingPoint: droppingPoint || toStopObj?.stop_name || 'Dropping Point',
      seatNumbers: selectedSeats,
      farePerSeat: effectiveFare,
      seatFares: seatFaresRecord,
      discountAmount,
      paymentMethod,
      providerTxnId,
    });

    if (result.success && result.booking) {
      setConfirmedBooking(result.booking);
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
      setSelectedSeats([]);
      setPassengerName('');
      setPassengerPhone('');
      setPassengerEmail('');
      setProviderTxnId('');
      setDiscountAmount(0);
      setSeatStatuses(dbStore.getSeatStatusesForSegment(currentTrip.id, fromSeq, toSeq));
    } else {
      setErrorMessage(result.error || 'Failed to complete booking.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Counter POS Top Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <TicketIcon className="w-5 h-5 text-blue-400" />
            <h1 className="text-xl font-extrabold tracking-tight">
              Rapid Counter Ticketing Terminal (POS)
            </h1>
          </div>

          {/* Active Counter Selector & Add Counter Button */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-slate-400 font-semibold">Active Station / Counter:</span>
            {counters.length > 0 ? (
              <select
                value={counter?.id || counters[0]?.id || ''}
                onChange={(e) => {
                  switchCounter(e.target.value);
                  const found = counters.find((c) => c.id === e.target.value);
                  if (found) setBoardingPoint(found.name);
                }}
                className="bg-slate-800 text-white font-bold rounded-lg px-2.5 py-1 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
              >
                {counters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code} - {c.city})
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-amber-300 font-bold bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-800 text-xs">
                No Counter Assigned
              </span>
            )}

            {/* Admin Add Counter Option */}
            <button
              onClick={() => {
                setNewCounter({
                  name: `${tenant?.name || 'Operator'} Main Counter`,
                  code: '',
                  city: 'Dhaka',
                  address: 'Terminal Stand 1',
                  contact_phone: '+880 1711-123456',
                });
                setShowAddCounterModal(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold shadow transition cursor-pointer text-xs"
              title="Add a new physical ticket counter"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Counter</span>
            </button>
          </div>
        </div>

        {/* Cash Drawer Status & Add Cash Option */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-800 border border-slate-700 px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-3">
            <div>
              <span className="text-slate-400 block text-[10px] font-semibold">CASH DRAWER TILL</span>
              <span className="text-emerald-400 font-mono font-bold text-sm">
                ৳{(openSession?.cash_collected || 0).toLocaleString()} Collected
              </span>
            </div>
            <button
              onClick={() => setShowAddCashModal(true)}
              className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition cursor-pointer"
              title="Add Float Cash to Drawer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* PENDING CANCELLATION REQUESTS (COUNTER ACCEPTANCE REQUIRED) */}
      {pendingCancellations.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border-2 border-amber-400 dark:border-amber-700 rounded-2xl shadow-md space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-amber-500 text-white font-bold animate-pulse text-xs">⚠️</span>
              <div>
                <h3 className="font-extrabold text-sm text-amber-950 dark:text-amber-100 flex items-center gap-2">
                  <span>Pending Online Cancellation Requests</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 font-mono text-xs font-bold">
                    {pendingCancellations.length} Pending
                  </span>
                </h3>
                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                  Passenger cancellations require counter acceptance before seats are released and refunds issued.
                </p>
              </div>
            </div>
            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold italic">
              * Click "Accept &amp; Refund" to process refund &amp; free seats
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingCancellations.map((b) => {
              const refundPct = tenant?.settings.refund_percentage || 80;
              const netRefund = Math.round((b.total_payable * refundPct) / 100);
              const fee = b.total_payable - netRefund;

              return (
                <div
                  key={b.id}
                  className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-amber-300 dark:border-amber-800 shadow-sm space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between font-mono font-bold text-slate-900 dark:text-white">
                    <span className="text-blue-600 dark:text-blue-400">{b.booking_ref}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 text-sm">৳{b.total_payable}</span>
                  </div>

                  <div className="text-slate-600 dark:text-slate-300">
                    <span className="font-semibold">{b.passenger_name}</span> • <span className="font-mono">{b.passenger_phone}</span>
                  </div>

                  <div className="text-[11px] text-slate-500">
                    Route: <span className="font-medium text-slate-700 dark:text-slate-200">{b.from_stop_name} ➔ {b.to_stop_name}</span> • Seats: <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{b.seats?.map((s) => s.seat_number).join(', ')}</span>
                  </div>

                  <div className="p-2 rounded bg-amber-50/80 dark:bg-amber-950/50 text-[11px] text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                    Reason: <em>"{b.cancellation_reason || 'Change of travel schedule'}"</em>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px] font-semibold">
                    <span className="text-rose-600">Fee: -৳{fee}</span>
                    <span className="text-emerald-600 font-bold">Net Refund: ৳{netRefund}</span>
                  </div>

                  <div className="flex gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => handleAcceptCancellation(b.id)}
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-sm cursor-pointer flex items-center justify-center gap-1 transition text-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Accept &amp; Refund ৳{netRefund}</span>
                    </button>

                    <button
                      onClick={() => handleRejectCancellation(b.id)}
                      className="py-1.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold rounded-lg cursor-pointer transition text-xs"
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

      {/* POS Grid: Left Column Controls (7 cols) + Right Column Checkout (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
        {/* LEFT COLUMN: Trip & Real-Time Seat Map */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                  Travel Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Select Departure Trip
                  </label>
                  {/* Admin Add Trip Option */}
                  <button
                    type="button"
                    onClick={() => {
                      const curRoutes = dbStore.getRoutes(tenantId);
                      const curBuses = dbStore.getBuses(tenantId);
                      setNewTrip({
                        route_id: curRoutes[0]?.id || '',
                        bus_id: curBuses[0]?.id || '',
                        trip_code: '',
                        departure_date: selectedDate,
                        departure_time: '08:30',
                        base_fare: 1400,
                        custom_origin: 'Dhaka',
                        custom_destination: 'Chattogram',
                        custom_bus_name: `${tenant?.name || 'Express'} Scania HD #101`,
                      });
                      setShowAddTripModal(true);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Trip</span>
                  </button>
                </div>
                <select
                  value={selectedTripId}
                  onChange={(e) => setSelectedTripId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none font-medium cursor-pointer"
                >
                  {trips.length === 0 ? (
                    <option value="">No Trips Scheduled - Click + Add Trip</option>
                  ) : (
                    trips.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.trip_code} - {t.departure_time} ({t.bus?.bus_type || 'AC'}) - ৳{t.base_fare}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* SEGMENT SELECTION */}
            <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-900">
              <span className="font-bold text-blue-900 dark:text-blue-200 block text-xs mb-1.5">
                ⚡ Segment-Based Ticket Section (Boarding to Dropping)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-0.5">
                    From Stop:
                  </label>
                  <select
                    value={fromSeq}
                    onChange={(e) => setFromSeq(Number(e.target.value))}
                    className="w-full px-2 py-1 text-xs rounded border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 cursor-pointer"
                  >
                    {routeStops.slice(0, -1).map((s) => (
                      <option key={s.sequence_order} value={s.sequence_order}>
                        {s.sequence_order}. {s.stop_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-0.5">
                    To Stop:
                  </label>
                  <select
                    value={toSeq}
                    onChange={(e) => setToSeq(Number(e.target.value))}
                    className="w-full px-2 py-1 text-xs rounded border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 cursor-pointer"
                  >
                    {routeStops.filter((s) => s.sequence_order > fromSeq).map((s) => (
                      <option key={s.sequence_order} value={s.sequence_order}>
                        {s.sequence_order}. {s.stop_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-[10px] text-blue-700 dark:text-blue-300 mt-1.5">
                Non-overlapping journey sections safely release seat inventory for passengers travelling other segments!
              </p>
            </div>
          </div>

          {/* REAL-TIME SEAT GRID */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center">
            <div className="w-full flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 mb-4 text-xs">
              <span className="font-bold text-slate-900 dark:text-white">
                Live Seat Inventory ({currentTrip?.bus?.name || currentTrip?.trip_code || 'Standard Coach'})
              </span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-[11px]">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Available
                </span>
                <span className="flex items-center gap-1 text-[11px]">
                  <span className="w-2.5 h-2.5 rounded bg-blue-600" /> Selected
                </span>
                <span className="flex items-center gap-1 text-[11px]">
                  <span className="w-2.5 h-2.5 rounded bg-rose-500" /> Sold
                </span>
              </div>
            </div>

            {/* If no trip exists, display helpful operational prompt */}
            {!currentTrip && (
              <div className="w-full p-4 mb-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between">
                <div>
                  <strong>No Departure Trips Scheduled for {tenant?.name}:</strong> Click &quot;+ Add Trip&quot; above to dispatch a departure.
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddTripModal(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow cursor-pointer text-xs"
                >
                  + Add Trip Now
                </button>
              </div>
            )}

            {/* Seat Type Legend & Rapid Filter for Counter Agent */}
            <div className="w-full flex flex-wrap items-center justify-between gap-2 p-2.5 mb-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px]">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-blue-500" />
                <span>Filter Map:</span>
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { type: 'all', label: 'All' },
                  { type: 'sleeper', label: '🛏️ Sleeper' },
                  { type: 'disabled', label: '♿ Accessible' },
                  { type: 'female', label: '👩 Female' },
                  { type: 'premium', label: '⭐ VIP' },
                  { type: 'regular', label: '💺 Standard' },
                ].map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setSeatTypeFilter(item.type as any)}
                    className={`px-2 py-0.5 rounded-lg font-semibold transition cursor-pointer ${
                      seatTypeFilter === item.type
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-400'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Coach Shell */}
            <div className="w-full max-w-sm bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-center pb-3 mb-3 border-b border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-400">
                <span>FRONT (STEERING)</span>
                <span>ENTRY DOOR</span>
              </div>

              {/* Rows */}
              <div className="space-y-2.5">
                {Array.from({ length: currentTripLayout?.rows_count || 9 }, (_, rIdx) => {
                  const rowNumber = rIdx + 1;
                  const rowLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
                  const rowLetter = rowLetters[rIdx] || `R${rowNumber}`;
                  const colsTotal = currentTripLayout?.cols_count || 4;

                  return (
                    <div key={rowLetter} className="flex items-center justify-around gap-2">
                      <span className="w-4 text-center font-bold text-[10px] text-slate-400 font-mono">
                        {rowLetter}
                      </span>

                      {Array.from({ length: colsTotal }, (_, cIdx) => {
                        const col = cIdx + 1;
                        const seatNumber = `${rowLetter}${col}`;
                        const isSelected = selectedSeats.includes(seatNumber);
                        const seatState = seatStatuses[seatNumber];
                        const isBooked = seatState?.status === 'booked';
                        const info = getSeatInfo(seatNumber);

                        const matches = seatTypeFilter === 'all' || info.type === seatTypeFilter;
                        const isAisle = colsTotal === 4 && col === 2;
                        const isAisle21 = colsTotal === 3 && col === 1;

                        const renderIcon = () => {
                          if (info.type === 'sleeper') return <Bed className="w-3.5 h-3.5" />;
                          if (info.type === 'disabled') return <Accessibility className="w-3.5 h-3.5" />;
                          if (info.type === 'female') return <Armchair className="w-3.5 h-3.5" />;
                          if (info.type === 'premium') return <Sparkles className="w-3.5 h-3.5" />;
                          return <Armchair className="w-3.5 h-3.5" />;
                        };

                        let btnColor = 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-600 hover:border-blue-500';
                        if (isSelected) {
                          btnColor = 'bg-blue-600 text-white ring-2 ring-blue-400 scale-105';
                        } else if (isBooked) {
                          btnColor = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800 cursor-not-allowed opacity-90';
                        } else if (info.type === 'sleeper') {
                          btnColor = 'bg-purple-50 text-purple-800 border-purple-400 dark:bg-purple-950/70 dark:text-purple-200 dark:border-purple-600 hover:border-purple-500';
                        } else if (info.type === 'disabled') {
                          btnColor = 'bg-teal-50 text-teal-800 border-teal-400 dark:bg-teal-950/70 dark:text-teal-200 dark:border-teal-600 hover:border-teal-500';
                        } else if (info.type === 'female') {
                          btnColor = 'bg-pink-50 text-pink-800 border-pink-400 dark:bg-pink-950/70 dark:text-pink-200 dark:border-pink-600 hover:border-pink-500';
                        } else if (info.type === 'premium') {
                          btnColor = 'bg-amber-50 text-amber-800 border-amber-400 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-600 hover:border-amber-500';
                        }

                        return (
                          <React.Fragment key={col}>
                            <button
                              type="button"
                              onClick={() => handleSeatToggle(seatNumber)}
                              disabled={isBooked}
                              title={
                                isBooked
                                  ? `Booked by ${seatState?.passengerName || 'Passenger'}`
                                  : `${seatNumber} • ${info.type.toUpperCase()}${info.isAccessible ? ' (Priority Accessible)' : ''} • Fare: ৳${info.fare}`
                              }
                              className={`w-10 h-11 rounded-lg flex flex-col items-center justify-center font-bold font-mono text-[10px] transition-all cursor-pointer shadow-sm border ${btnColor} ${
                                !matches && !isSelected && !isBooked ? 'opacity-30 hover:opacity-100' : ''
                              } ${
                                matches && seatTypeFilter !== 'all' && !isSelected && !isBooked ? 'ring-2 ring-blue-500 scale-105' : ''
                              }`}
                            >
                              {renderIcon()}
                              <span className="leading-none mt-0.5">{seatNumber}</span>
                              {info.type === 'sleeper' && (
                                <span className="text-[7px] font-extrabold uppercase tracking-tighter leading-none text-purple-700 dark:text-purple-300">
                                  BED
                                </span>
                              )}
                              {info.type === 'disabled' && (
                                <span className="text-[7px] font-extrabold uppercase tracking-tighter leading-none text-teal-700 dark:text-teal-300">
                                  ♿
                                </span>
                              )}
                            </button>

                            {(isAisle || isAisle21) && (
                              <div className="w-4 text-center text-slate-300 dark:text-slate-600 text-[10px] select-none">
                                •
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Passenger Info & Rapid Checkout (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <form
            onSubmit={handleConfirmCounterBooking}
            className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                Passenger &amp; Payment Information
              </h2>
              <span className="text-xs font-mono font-bold text-blue-600">
                {selectedSeats.length} Seats: {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'None'}
              </span>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                Passenger Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Asif Mahmud"
                value={passengerName}
                onChange={(e) => setPassengerName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
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
                  placeholder="01711-..."
                  value={passengerPhone}
                  onChange={(e) => setPassengerPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="passenger@mail.com"
                  value={passengerEmail}
                  onChange={(e) => setPassengerEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                  Boarding Point
                </label>
                <input
                  type="text"
                  value={boardingPoint}
                  onChange={(e) => setBoardingPoint(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                  Dropping Point
                </label>
                <input
                  type="text"
                  value={droppingPoint}
                  onChange={(e) => setDroppingPoint(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                Payment Channel
              </label>
              <div className="grid grid-cols-4 gap-2 text-xs">
                {[
                  { id: 'cash', label: 'Cash' },
                  { id: 'bkash', label: 'bKash' },
                  { id: 'nagad', label: 'Nagad' },
                  { id: 'card', label: 'Card' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`py-1.5 rounded-lg font-semibold border text-center transition cursor-pointer ${
                      paymentMethod === m.id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {paymentMethod !== 'cash' && (
              <div>
                <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                  MFS / Card Transaction ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9JA271BC"
                  value={providerTxnId}
                  onChange={(e) => setProviderTxnId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none font-mono"
                />
              </div>
            )}

            {/* ADMIN / AGENT DISCOUNT INPUT OPTION */}
            <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-blue-500" />
                  <span>Counter Discount (৳)</span>
                </label>
                <div className="flex gap-1">
                  {[0, 50, 100, 200].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDiscountAmount(preset)}
                      className={`px-1.5 py-0.5 text-[10px] rounded font-bold transition cursor-pointer ${
                        discountAmount === preset
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {preset === 0 ? 'None' : `৳${preset}`}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="number"
                min="0"
                value={discountAmount || ''}
                onChange={(e) => setDiscountAmount(Number(e.target.value))}
                placeholder="Enter custom discount amount"
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-mono text-xs focus:outline-none"
              />
            </div>

            {/* Fare Summary Breakdown */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-1.5 text-xs">
              {selectedSeats.length > 0 && (
                <div className="space-y-1 pb-1.5 border-b border-slate-100 dark:border-slate-700">
                  {selectedSeats.map((sNum) => {
                    const info = getSeatInfo(sNum);
                    return (
                      <div key={sNum} className="flex justify-between items-center text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            Seat {sNum}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            info.type === 'sleeper' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' :
                            info.type === 'disabled' ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300' :
                            info.type === 'female' ? 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300' :
                            info.type === 'premium' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                            'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                          }`}>
                            {info.type === 'sleeper' ? '🛏️ Sleeper' :
                             info.type === 'disabled' ? '♿ Accessible' :
                             info.type === 'female' ? '👩 Female' :
                             info.type === 'premium' ? '⭐ VIP' : 'Standard'}
                          </span>
                        </div>
                        <span className="font-mono font-semibold">৳{info.fare}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex justify-between text-slate-500">
                <span>Subtotal ({selectedSeats.length} Seats):</span>
                <span className="font-mono">৳{subtotal}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Counter Discount:</span>
                <span className="font-mono text-emerald-600">-৳{discountAmount}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-700">
                <span>Net Payable:</span>
                <span className="text-emerald-600 font-mono text-base">৳{netTotal}</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 transition cursor-pointer text-xs"
            >
              Confirm Booking &amp; Generate Ticket (৳{netTotal})
            </button>
          </form>

          {/* CONFIRMED TICKET PREVIEW & PRINT MODULE */}
          {confirmedBooking && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                  <CheckCircle className="w-4 h-4" />
                  Booking Confirmed: {confirmedBooking.booking_ref}
                </div>
                <div className="flex items-center gap-1">
                  <select
                    value={printFormat}
                    onChange={(e) => setPrintFormat(e.target.value as any)}
                    className="px-2 py-0.5 rounded text-[11px] border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-semibold"
                  >
                    <option value="thermal">Thermal (80mm POS)</option>
                    <option value="standard">Standard Ticket</option>
                    <option value="a4">A4 PDF Voucher</option>
                  </select>
                  <button
                    onClick={handlePrint}
                    className="px-2.5 py-1 bg-emerald-600 text-white font-bold text-xs rounded-lg hover:bg-emerald-500 flex items-center gap-1 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print
                  </button>
                </div>
              </div>

              {/* Thermal 80mm Printed Receipt Preview */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-lg font-mono text-[11px] space-y-2 text-slate-800 dark:text-slate-200 shadow-inner">
                <div className="text-center border-b border-dashed border-slate-300 pb-2">
                  <span className="font-extrabold text-sm block tracking-wider uppercase">
                    {tenant?.name}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Counter: {boardingPoint} • Hotline: {tenant?.settings.hotline || '16223'}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>PNR Ref:</span>
                    <strong className="text-blue-600">{confirmedBooking.booking_ref}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Passenger:</span>
                    <strong>{confirmedBooking.passenger_name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Seats:</span>
                    <strong className="text-emerald-600 font-bold">
                      {confirmedBooking.seats?.map((s) => s.seat_number).join(', ')}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>From:</span>
                    <span>{confirmedBooking.from_stop_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>To:</span>
                    <span>{confirmedBooking.to_stop_name}</span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-slate-300 pt-1 font-bold">
                    <span>Total Paid:</span>
                    <span className="text-emerald-600 font-bold">
                      ৳{confirmedBooking.total_payable} ({paymentMethod.toUpperCase()})
                    </span>
                  </div>
                </div>

                {/* QR Code */}
                <div className="pt-2 flex flex-col items-center justify-center border-t border-dashed border-slate-300 gap-1">
                  <QRCodeSVG
                    value={`BUSMASTER:${confirmedBooking.booking_ref}:${confirmedBooking.trip_id}:${confirmedBooking.seats?.map((s) => s.seat_number).join(',')}`}
                    size={80}
                  />
                  <span className="text-[9px] text-slate-400">Scan at boarding gate</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: ADD NEW COUNTER */}
      {showAddCounterModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 text-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-600" />
              Register Physical Ticket Counter
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Authorized for Administrators and Operations for {tenant?.name}
            </p>

            <form onSubmit={handleCreateCounter} className="mt-4 space-y-3">
              <div>
                <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                  Counter / Station Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sayedabad Counter Platform 5"
                  value={newCounter.name}
                  onChange={(e) => setNewCounter({ ...newCounter, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCounter.city}
                    onChange={(e) => setNewCounter({ ...newCounter, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                    Counter Code
                  </label>
                  <input
                    type="text"
                    placeholder="Auto-generated if blank"
                    value={newCounter.code}
                    onChange={(e) => setNewCounter({ ...newCounter, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                  Contact Phone *
                </label>
                <input
                  type="text"
                  required
                  placeholder="+880 1711-..."
                  value={newCounter.contact_phone}
                  onChange={(e) => setNewCounter({ ...newCounter, contact_phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                  Physical Address
                </label>
                <input
                  type="text"
                  placeholder="Stand location / platform info..."
                  value={newCounter.address}
                  onChange={(e) => setNewCounter({ ...newCounter, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddCounterModal(false)}
                  className="px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 text-white font-semibold rounded hover:bg-blue-500 shadow cursor-pointer"
                >
                  Save &amp; Switch To Counter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD NEW TRIP */}
      {showAddTripModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 text-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              Quick Dispatch Trip
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Schedule a departure trip on the fly for {tenant?.name}
            </p>

            <form onSubmit={handleCreateTrip} className="mt-4 space-y-3">
              {routes.length > 0 ? (
                <div>
                  <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                    Select Route
                  </label>
                  <select
                    value={newTrip.route_id || routes[0]?.id || ''}
                    onChange={(e) => setNewTrip({ ...newTrip, route_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold focus:outline-none cursor-pointer"
                  >
                    {routes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.origin_city} ➔ {r.destination_city} ({r.distance_km || 250} km)
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                      Origin City *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dhaka"
                      value={newTrip.custom_origin}
                      onChange={(e) => setNewTrip({ ...newTrip, custom_origin: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                      Destination City *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Chattogram"
                      value={newTrip.custom_destination}
                      onChange={(e) => setNewTrip({ ...newTrip, custom_destination: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {buses.length > 0 ? (
                <div>
                  <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                    Select Assigned Bus
                  </label>
                  <select
                    value={newTrip.bus_id || buses[0]?.id || ''}
                    onChange={(e) => setNewTrip({ ...newTrip, bus_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold focus:outline-none cursor-pointer"
                  >
                    {buses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.bus_type} - {b.total_capacity} seats)
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                    Bus Name &amp; Model *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Scania ComfortClass #101"
                    value={newTrip.custom_bus_name}
                    onChange={(e) => setNewTrip({ ...newTrip, custom_bus_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={newTrip.departure_date}
                    onChange={(e) => setNewTrip({ ...newTrip, departure_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                    Departure Time
                  </label>
                  <input
                    type="time"
                    value={newTrip.departure_time}
                    onChange={(e) => setNewTrip({ ...newTrip, departure_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                    Base Fare (৳)
                  </label>
                  <input
                    type="number"
                    value={newTrip.base_fare}
                    onChange={(e) => setNewTrip({ ...newTrip, base_fare: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                    Custom Trip Code
                  </label>
                  <input
                    type="text"
                    placeholder="Auto-generated if blank"
                    value={newTrip.trip_code}
                    onChange={(e) => setNewTrip({ ...newTrip, trip_code: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddTripModal(false)}
                  className="px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 text-white font-semibold rounded hover:bg-blue-500 shadow cursor-pointer"
                >
                  Dispatch &amp; Select Trip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD CASH FLOAT */}
      {showAddCashModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-xs w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 text-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-emerald-500" />
              Add Cash to Drawer
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Inject opening change or deposit float into active counter drawer
            </p>

            <form onSubmit={handleAddCashFloat} className="mt-4 space-y-3">
              <div>
                <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                  Cash Amount (৳)
                </label>
                <input
                  type="number"
                  min="100"
                  required
                  value={addCashAmount}
                  onChange={(e) => setAddCashAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono focus:outline-none text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddCashModal(false)}
                  className="px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 text-white font-semibold rounded hover:bg-emerald-500 shadow cursor-pointer"
                >
                  Deposit Cash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
