import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { dbStore } from '../../services/dbStore';
import { Trip, Booking, SeatType, RouteStop, SupportTicket, SupportReply } from '../../types';
import {
  Search,
  Bus as BusIcon,
  Calendar,
  MapPin,
  Clock,
  Armchair,
  CheckCircle,
  Smartphone,
  ShieldCheck,
  Star,
  Download,
  Printer,
  ChevronRight,
  Filter,
  Bed,
  Accessibility,
  Sparkles,
  Sliders,
  Info,
  Check,
  X,
  AlertTriangle,
  ArrowRight,
  Ban,
  CheckCircle2,
  Copy,
  RotateCcw,
  CreditCard,
  Lock,
  Shield,
  Loader2,
  MessageSquare,
  HelpCircle,
  Send,
  AlertCircle,
  Phone,
  ExternalLink,
  MessageCircle,
  FileText,
  Headphones,
  Users,
  ChevronDown,
  ChevronUp,
  UserCheck,
  User,
  MessageSquarePlus,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';

const OPERATOR_SUPPORT_DIRECTORY = [
  {
    name: 'Hanif Enterprise',
    hotline: '16334',
    phone: '+880 1819-654321',
    whatsapp: '+880 1711-999888',
    whatsappGroupLink: 'https://chat.whatsapp.com/example-hanif-support',
    email: 'support@hanifenterprise.bd',
    coverage: 'Nationwide (Chattogram, Rangpur, Cox\'s Bazar, Sylhet)',
    status: '24/7 Active',
  },
  {
    name: 'Green Line Paribahan',
    hotline: '16298',
    phone: '+880 1711-123456',
    whatsapp: '+880 1711-999888',
    whatsappGroupLink: 'https://chat.whatsapp.com/example-greenline-support',
    email: 'support@greenlinebd.com',
    coverage: 'Premium AC & Sleeper Coach Routes',
    status: '24/7 Active',
  },
  {
    name: 'Shohagh Paribahan',
    hotline: '16440',
    phone: '+880 1711-987654',
    whatsapp: '+880 1711-999888',
    whatsappGroupLink: 'https://chat.whatsapp.com/example-shohagh-support',
    email: 'help@shohagh.com',
    coverage: 'Intercity Scania & Business Class Services',
    status: '24/7 Active',
  },
  {
    name: 'Shyamoli NR Travels',
    hotline: '16550',
    phone: '+880 1819-112233',
    whatsapp: '+880 1711-999888',
    whatsappGroupLink: 'https://chat.whatsapp.com/example-shyamoli-support',
    email: 'customercare@shyamolinr.com',
    coverage: 'North Bengal & Cross-border Routes',
    status: '24/7 Active',
  },
];

const COMPLAINT_CATEGORIES = [
  { id: 'ac', label: '❄️ AC / Cabin Temperature', desc: 'Too cold or warm during journey' },
  { id: 'behavior', label: '👨‍✈️ Driver or Helper Conduct', desc: 'Rude behavior, reckless driving, or assistant issue' },
  { id: 'luggage', label: '🧳 Baggage Lost & Found', desc: 'Luggage misplaced or boot storage inquiry' },
  { id: 'delay', label: '⏱️ Highway Delay & Halts', desc: 'Unnotified halts or major departure delay' },
  { id: 'refund', label: '💳 Online Refund Dispute', desc: 'Cancellation refund assistance or failed charge' },
  { id: 'seat', label: '💺 Damaged / Dirty Seat', desc: 'Recliner broken or occupied by unverified person' },
  { id: 'inquiry', label: '❓ Station Counter Inquiry', desc: 'Boarding point location or timetable inquiry' },
];

export const CustomerBookingPortal: React.FC = () => {
  const allTenants = dbStore.getTenants().filter((t) => t.status === 'active' || t.status === 'approved');
  const [allTrips, setAllTrips] = useState<Trip[]>(dbStore.getTrips());

  // Search State
  const [origin, setOrigin] = useState('Dhaka');
  const [destination, setDestination] = useState('Chattogram');
  const [journeyDate, setJourneyDate] = useState(new Date().toISOString().split('T')[0]);
  const [busTypeFilter, setBusTypeFilter] = useState<'all' | 'AC' | 'Non-AC'>('all');

  // Active Flow: 'search' | 'seat_select' | 'checkout' | 'confirmed' | 'my_tickets' | 'support_complaint'
  const [viewStep, setViewStep] = useState<
    'search' | 'seat_select' | 'checkout' | 'confirmed' | 'my_tickets' | 'support_complaint'
  >('search');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  // Support & Complaints State
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(() => dbStore.getSupportTickets());
  const [supportSubTab, setSupportSubTab] = useState<'file_complaint' | 'track_complaints' | 'hotlines_group'>('file_complaint');
  const [complaintTenantId, setComplaintTenantId] = useState<string>(allTenants[0]?.id || 't-greenline-01');
  const [complaintBookingRef, setComplaintBookingRef] = useState<string>('');
  const [complaintCategory, setComplaintCategory] = useState<string>('ac');
  const [complaintPriority, setComplaintPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [complaintSubject, setComplaintSubject] = useState<string>('');
  const [complaintMessage, setComplaintMessage] = useState<string>('');
  const [complaintPassengerName, setComplaintPassengerName] = useState<string>('');
  const [complaintPassengerPhone, setComplaintPassengerPhone] = useState<string>('');
  const [searchComplaintQuery, setSearchComplaintQuery] = useState<string>('');
  const [selectedTicketForChat, setSelectedTicketForChat] = useState<string | null>(null);
  const [passengerReplyText, setPassengerReplyText] = useState<string>('');
  const [submittedTicketSuccess, setSubmittedTicketSuccess] = useState<SupportTicket | null>(null);

  // Segment Selection State (Boarding to Dropping)
  const [fromSeq, setFromSeq] = useState<number>(1);
  const [toSeq, setToSeq] = useState<number>(4);
  const [seatStatuses, setSeatStatuses] = useState<
    Record<string, { status: 'available' | 'booked' | 'locked'; passengerName?: string }>
  >({});

  // Passenger Info
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [passengerEmail, setPassengerEmail] = useState('');
  const [boardingPoint, setBoardingPoint] = useState('');
  const [droppingPoint, setDroppingPoint] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'bkash' | 'nagad' | 'card' | 'rocket'>('card');
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  // Credit Card Credentials State
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [saveCard, setSaveCard] = useState(false);

  // Mobile Wallet Credentials State
  const [bkashNumber, setBkashNumber] = useState('');
  const [bkashPin, setBkashPin] = useState('');
  const [nagadNumber, setNagadNumber] = useState('');
  const [nagadPin, setNagadPin] = useState('');

  // Payment Gateway Verification Simulation
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [processingStatusText, setProcessingStatusText] = useState('');

  // Payment input formatting helpers
  const formatCardNumber = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 16);
    return raw.replace(/(\d{4})/g, '$1 ').trim();
  };

  const formatExpiry = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      return `${raw.slice(0, 2)}/${raw.slice(2, 4)}`;
    }
    return raw;
  };

  const formatCvv = (val: string) => val.replace(/\D/g, '').slice(0, 4);

  const getCardType = (num: string) => {
    const clean = num.replace(/\s+/g, '');
    if (clean.startsWith('4')) return 'VISA';
    if (/^5[1-5]/.test(clean) || /^2[2-7]/.test(clean)) return 'Mastercard';
    if (/^3[47]/.test(clean)) return 'AMEX';
    return 'Credit / Debit';
  };

  // My Tickets & Cancellation State
  const [searchPnr, setSearchPnr] = useState('');
  const [myBookings, setMyBookings] = useState<Booking[]>(dbStore.getBookings());
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('Change of travel schedule');
  const [cancelFeedback, setCancelFeedback] = useState<{ pnr: string; refund: number } | null>(null);
  const [copiedPnr, setCopiedPnr] = useState(false);

  // Seat Type Filter
  const [selectedSeatTypeFilter, setSelectedSeatTypeFilter] = useState<SeatType | 'all'>('all');

  // Helper to safely get route stops for a trip
  const getTripRouteStops = (trip: Trip | null): RouteStop[] => {
    if (!trip) return [];
    if (trip.route?.stops && trip.route.stops.length > 0) {
      return trip.route.stops;
    }
    return [
      { id: 's1', tenant_id: trip.tenant_id, route_id: trip.route_id, stop_name: `${trip.route?.origin_city || origin} (Arambagh Central)`, sequence_order: 1, arrival_offset_minutes: 0, departure_offset_minutes: 0, can_board: true, can_drop: false },
      { id: 's2', tenant_id: trip.tenant_id, route_id: trip.route_id, stop_name: 'Cumilla (Paduar Bazar)', sequence_order: 2, arrival_offset_minutes: 120, departure_offset_minutes: 130, can_board: true, can_drop: true },
      { id: 's3', tenant_id: trip.tenant_id, route_id: trip.route_id, stop_name: 'Feni (Mohipal Highway)', sequence_order: 3, arrival_offset_minutes: 200, departure_offset_minutes: 210, can_board: true, can_drop: true },
      { id: 's4', tenant_id: trip.tenant_id, route_id: trip.route_id, stop_name: `${trip.route?.destination_city || destination} (Dampara)`, sequence_order: 4, arrival_offset_minutes: 330, departure_offset_minutes: 330, can_board: false, can_drop: true },
    ];
  };

  // Subscribe to real-time dbStore updates
  useEffect(() => {
    const unsub = dbStore.subscribe(() => {
      setAllTrips(dbStore.getTrips());
      setMyBookings(dbStore.getBookings());
      setSupportTickets(dbStore.getSupportTickets());
      if (selectedTrip) {
        const statuses = dbStore.getSeatStatusesForSegment(selectedTrip.id, fromSeq, toSeq);
        setSeatStatuses(statuses);
      }
    });
    return () => unsub();
  }, [selectedTrip?.id, fromSeq, toSeq]);

  const handleOpenComplaintForTicket = (booking: Booking) => {
    setComplaintTenantId(booking.tenant_id);
    setComplaintBookingRef(booking.booking_ref);
    setComplaintPassengerName(booking.passenger_name);
    setComplaintPassengerPhone(booking.passenger_phone || '');
    setComplaintSubject(`Service assistance for Journey: ${booking.from_stop_name} to ${booking.to_stop_name}`);
    setViewStep('support_complaint');
    setSupportSubTab('file_complaint');
    setSubmittedTicketSuccess(null);
  };

  const handleSubmitComplaint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintSubject.trim() || !complaintMessage.trim()) {
      alert('Please provide both a subject and details for your complaint.');
      return;
    }
    if (!complaintPassengerName.trim() || !complaintPassengerPhone.trim()) {
      alert('Please enter your name and contact phone number so counter managers can respond.');
      return;
    }

    const ticketId = `st-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();
    const newTicket: SupportTicket = {
      id: ticketId,
      tenant_id: complaintTenantId,
      booking_ref: complaintBookingRef.trim() || undefined,
      subject: complaintSubject.trim(),
      message: complaintMessage.trim(),
      priority: complaintPriority,
      status: 'open',
      created_at: nowIso,
      updated_at: nowIso,
      replies: [
        {
          id: `rep-${Date.now()}`,
          ticket_id: ticketId,
          sender_name: `${complaintPassengerName.trim()} (${complaintPassengerPhone.trim()})`,
          sender_role: 'PASSENGER',
          message: complaintMessage.trim(),
          created_at: nowIso,
        },
      ],
    };

    dbStore.createSupportTicket(newTicket);
    setSupportTickets(dbStore.getSupportTickets());
    setSubmittedTicketSuccess(newTicket);
    setSelectedTicketForChat(ticketId);
    setComplaintSubject('');
    setComplaintMessage('');
  };

  const handleSendPassengerReply = (ticketId: string) => {
    if (!passengerReplyText.trim()) return;

    const senderName = complaintPassengerName.trim() || 'Passenger';
    const newReply: SupportReply = {
      id: `rep-${Date.now()}`,
      ticket_id: ticketId,
      sender_name: senderName,
      sender_role: 'PASSENGER',
      message: passengerReplyText.trim(),
      created_at: new Date().toISOString(),
    };

    dbStore.addSupportReply(ticketId, newReply, 'open');
    setPassengerReplyText('');
    setSupportTickets(dbStore.getSupportTickets());
  };

  // Update seatStatuses whenever trip or segment selection changes
  useEffect(() => {
    if (selectedTrip) {
      const statuses = dbStore.getSeatStatusesForSegment(selectedTrip.id, fromSeq, toSeq);
      setSeatStatuses(statuses);
      // Remove any seat currently selected if it is booked in the newly chosen segment
      setSelectedSeats((prev) => prev.filter((s) => statuses[s]?.status !== 'booked'));
    }
  }, [selectedTrip?.id, fromSeq, toSeq]);

  const filteredTrips = allTrips.filter((t) => {
    const matchesOrigin = t.route?.origin_city.toLowerCase() === origin.toLowerCase();
    const matchesDest = t.route?.destination_city.toLowerCase() === destination.toLowerCase();
    const matchesType = busTypeFilter === 'all' || t.bus?.bus_type === busTypeFilter;
    return matchesOrigin && matchesDest && matchesType;
  });

  const handleStartSeatSelection = (trip: Trip) => {
    setSelectedTrip(trip);
    setSelectedSeats([]);
    setSelectedSeatTypeFilter('all');

    const stops = getTripRouteStops(trip);
    const initialFrom = stops[0]?.sequence_order || 1;
    const initialTo = stops[stops.length - 1]?.sequence_order || 4;

    setFromSeq(initialFrom);
    setToSeq(initialTo);
    setBoardingPoint(stops[0]?.stop_name || `${trip.route?.origin_city || origin} Counter`);
    setDroppingPoint(stops[stops.length - 1]?.stop_name || `${trip.route?.destination_city || destination} Stand`);

    const statuses = dbStore.getSeatStatusesForSegment(trip.id, initialFrom, initialTo);
    setSeatStatuses(statuses);
    setViewStep('seat_select');
  };

  const handleFromSeqChange = (newFrom: number) => {
    setFromSeq(newFrom);
    const stops = getTripRouteStops(selectedTrip);
    const fromStop = stops.find((s) => s.sequence_order === newFrom);
    if (fromStop) {
      setBoardingPoint(fromStop.stop_name);
    }
    if (newFrom >= toSeq) {
      const nextStops = stops.filter((s) => s.sequence_order > newFrom);
      if (nextStops.length > 0) {
        const newTo = nextStops[0].sequence_order;
        setToSeq(newTo);
        setDroppingPoint(nextStops[0].stop_name);
      }
    }
  };

  const handleToSeqChange = (newTo: number) => {
    setToSeq(newTo);
    const stops = getTripRouteStops(selectedTrip);
    const toStop = stops.find((s) => s.sequence_order === newTo);
    if (toStop) {
      setDroppingPoint(toStop.stop_name);
    }
  };

  const currentTripLayout = selectedTrip ? dbStore.getSeatLayoutForTrip(selectedTrip.id) : undefined;
  const layoutGridSeats = currentTripLayout?.grid_data || [];

  // Segment base fare calculated via dbStore
  const segmentBaseFare = selectedTrip
    ? dbStore.getSegmentFare(selectedTrip.id, fromSeq, toSeq)
    : 1400;

  const getSeatInfo = (seatNumber: string) => {
    const item = layoutGridSeats.find((s) => s.seat_number === seatNumber);
    const base = segmentBaseFare;
    const type: SeatType = item?.type || 'regular';
    let fare = base;
    if (item?.extra_fare !== undefined && item.extra_fare > 0) {
      fare = base + item.extra_fare;
    } else if (item?.price_multiplier && item.price_multiplier > 1) {
      fare = Math.round(base * item.price_multiplier);
    } else if (type === 'sleeper') {
      fare = base + 350;
    } else if (type === 'premium') {
      fare = base + 200;
    }
    return {
      seatNumber,
      type,
      isAccessible: Boolean(item?.is_accessible || type === 'disabled'),
      fare,
      extraFare: item?.extra_fare || (type === 'sleeper' ? 350 : type === 'premium' ? 200 : 0),
    };
  };

  const handleSeatClick = (seatNumber: string, isBooked: boolean) => {
    if (isBooked) return;
    if (selectedSeats.includes(seatNumber)) {
      setSelectedSeats(selectedSeats.filter((s) => s !== seatNumber));
    } else {
      if (selectedSeats.length >= 4) {
        alert('Maximum 4 seats allowed per online booking.');
        return;
      }
      setSelectedSeats([...selectedSeats, seatNumber]);
    }
  };

  const totalAmount = selectedSeats.reduce((sum, seatNum) => sum + getSeatInfo(seatNum).fare, 0);
  const farePerSeat = selectedSeats.length > 0 ? Math.round(totalAmount / selectedSeats.length) : segmentBaseFare;

  const seatFaresRecord: Record<string, { fare: number; type: SeatType }> = {};
  selectedSeats.forEach((seatNum) => {
    const info = getSeatInfo(seatNum);
    seatFaresRecord[seatNum] = { fare: info.fare, type: info.type };
  });

  const handleProceedToCheckout = () => {
    if (selectedSeats.length === 0) {
      alert('Please select at least one seat.');
      return;
    }
    setViewStep('checkout');
  };

  const handleCompleteOnlinePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrip || selectedSeats.length === 0) return;

    // Validate payment credentials based on selected gateway
    if (paymentMethod === 'card') {
      const cleanCard = cardNumber.replace(/\s+/g, '');
      if (cleanCard.length < 16) {
        alert('Please enter a valid 16-digit credit/debit card number.');
        return;
      }
      if (!cardExpiry || cardExpiry.length < 5) {
        alert('Please enter a valid card expiration date in MM/YY format.');
        return;
      }
      if (!cardCvv || cardCvv.length < 3) {
        alert('Please enter a valid 3 or 4-digit CVV security code.');
        return;
      }
      if (!cardName.trim() && !passengerName.trim()) {
        alert('Please enter the cardholder full name as printed on the card.');
        return;
      }
    } else if (paymentMethod === 'bkash') {
      if (!bkashNumber || bkashNumber.length < 11) {
        alert('Please enter your 11-digit bKash mobile number (e.g. 01711234567).');
        return;
      }
      if (!bkashPin || bkashPin.length < 5) {
        alert('Please enter your 5-digit bKash PIN to authorize transaction.');
        return;
      }
    } else if (paymentMethod === 'nagad') {
      if (!nagadNumber || nagadNumber.length < 11) {
        alert('Please enter your 11-digit Nagad account number.');
        return;
      }
      if (!nagadPin || nagadPin.length < 4) {
        alert('Please enter your 4-digit Nagad PIN to authorize payment.');
        return;
      }
    }

    const stops = getTripRouteStops(selectedTrip);
    const fromStopObj = stops.find((s) => s.sequence_order === fromSeq);
    const toStopObj = stops.find((s) => s.sequence_order === toSeq);

    const fromStopName = fromStopObj ? fromStopObj.stop_name : (selectedTrip.route?.origin_city || origin);
    const toStopName = toStopObj ? toStopObj.stop_name : (selectedTrip.route?.destination_city || destination);

    const cardBrand = getCardType(cardNumber);
    const generatedTxnId =
      paymentMethod === 'card'
        ? `CARD-${cardBrand}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
        : `${paymentMethod.toUpperCase()}-TXN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    // Payment Gateway Handshake Simulation
    setIsProcessingPayment(true);
    setProcessingStatusText(
      paymentMethod === 'card'
        ? `Connecting to ${cardBrand} 3D-Secure 2.0 Gateway...`
        : paymentMethod === 'bkash'
        ? 'Authorizing bKash Direct Checkout API Handshake...'
        : 'Connecting to Nagad Payment Settlement...'
    );

    setTimeout(() => {
      setProcessingStatusText('Encrypting transaction payload & securing tokenized authorization...');
    }, 600);

    setTimeout(() => {
      const res = dbStore.bookSeatsAtomic({
        tenantId: selectedTrip.tenant_id,
        tripId: selectedTrip.id,
        bookingSource: 'online',
        passengerName,
        passengerPhone,
        passengerEmail,
        fromStopName,
        toStopName,
        fromSeq,
        toSeq,
        boardingPoint: boardingPoint || fromStopName,
        droppingPoint: droppingPoint || toStopName,
        seatNumbers: selectedSeats,
        farePerSeat,
        seatFares: seatFaresRecord,
        paymentMethod,
        providerTxnId: generatedTxnId,
      });

      setIsProcessingPayment(false);

      if (res.success && res.booking) {
        setConfirmedBooking(res.booking);
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        setViewStep('confirmed');
      } else {
        alert(res.error || 'Payment or booking failed');
      }
    }, 1200);
  };

  // Ticket Cancellation Request Handling (Requires counter acceptance)
  const handleRequestCancelBooking = () => {
    if (!bookingToCancel) return;

    const res = dbStore.requestBookingCancellation(
      bookingToCancel.id,
      cancelReason || 'Passenger requested cancellation online'
    );

    if (res.success) {
      setCancelFeedback({
        pnr: bookingToCancel.booking_ref,
        refund: Math.round(bookingToCancel.total_payable * 0.8),
      });

      // Update confirmedBooking if it is the one being cancelled
      if (confirmedBooking && confirmedBooking.id === bookingToCancel.id) {
        setConfirmedBooking({
          ...confirmedBooking,
          ticket_status: 'cancellation_requested',
          cancellation_reason: cancelReason,
          cancellation_requested_at: new Date().toISOString(),
        });
      }

      setBookingToCancel(null);
    } else {
      alert(res.error || 'Failed to submit cancellation request.');
    }
  };

  const handleCopyPnr = (pnr: string) => {
    navigator.clipboard.writeText(pnr);
    setCopiedPnr(true);
    setTimeout(() => setCopiedPnr(false), 2000);
  };

  const routeStops = selectedTrip ? getTripRouteStops(selectedTrip) : [];
  const currentFromStop = routeStops.find((s) => s.sequence_order === fromSeq);
  const currentToStop = routeStops.find((s) => s.sequence_order === toSeq);

  return (
    <div className="space-y-8">
      {/* Hero Banner Section */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-8 sm:p-12 shadow-2xl border border-blue-800/40">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-xs font-semibold text-blue-300">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            Official Nationwide Bus Reservation Network
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Smart Bus Management. <br />
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Seamless Travel in Bangladesh.
            </span>
          </h1>
          <p className="text-slate-300 text-sm sm:text-base max-w-xl">
            Book guaranteed seats on Green Line, Hanif, Shohag, and leading coach operators with segment-based stop selection, instant digital tickets, and verified online refunds.
          </p>
        </div>

        {/* Floating Quick Navigation Tabs */}
        <div className="relative z-10 flex flex-wrap gap-2 pt-6">
          <button
            onClick={() => setViewStep('search')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              viewStep !== 'my_tickets' && viewStep !== 'support_complaint'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search Bus Tickets</span>
          </button>
          <button
            onClick={() => setViewStep('my_tickets')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              viewStep === 'my_tickets'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>My Bookings & QR Download</span>
            {myBookings.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-blue-500/40 text-blue-200 text-[10px] rounded-full font-mono">
                {myBookings.length}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setViewStep('support_complaint');
              setSubmittedTicketSuccess(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              viewStep === 'support_complaint'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <Headphones className="w-3.5 h-3.5 text-emerald-400" />
            <span>Complaints & Support Group</span>
            <span className="ml-1 px-1.5 py-0.2 bg-emerald-500/30 text-emerald-300 text-[10px] rounded-full font-mono">
              24/7 Desk
            </span>
          </button>
        </div>
      </div>

      {/* SEARCH FORM & RESULTS */}
      {viewStep === 'search' && (
        <div className="space-y-6">
          {/* Search Card */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  Leaving From
                </label>
                <select
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="Dhaka">Dhaka</option>
                  <option value="Chattogram">Chattogram</option>
                  <option value="Sylhet">Sylhet</option>
                  <option value="Rangpur">Rangpur</option>
                  <option value="Cox's Bazar">Cox's Bazar</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  Going To
                </label>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="Chattogram">Chattogram</option>
                  <option value="Dhaka">Dhaka</option>
                  <option value="Sylhet">Sylhet</option>
                  <option value="Rangpur">Rangpur</option>
                  <option value="Cox's Bazar">Cox's Bazar</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  Journey Date
                </label>
                <input
                  type="date"
                  value={journeyDate}
                  onChange={(e) => setJourneyDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <Filter className="w-4 h-4 text-amber-500" />
                  Coach Type
                </label>
                <select
                  value={busTypeFilter}
                  onChange={(e) => setBusTypeFilter(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="all">All Bus Classes</option>
                  <option value="AC">AC Luxury Coach</option>
                  <option value="Non-AC">Non-AC Standard</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Available Buses for {origin} ➔ {destination} ({filteredTrips.length})
              </h2>
            </div>

            {filteredTrips.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-2">
                <BusIcon className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="font-bold text-slate-800 dark:text-slate-200">No scheduled trips found</h3>
                <p className="text-xs text-slate-500">
                  Try selecting Dhaka to Chattogram to view today's available departures.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTrips.map((trip) => {
                  const operator = allTenants.find((t) => t.id === trip.tenant_id);
                  const statuses = dbStore.getSeatStatusesForSegment(trip.id, 1, 4);
                  const availableCount = Object.values(statuses).filter((s) => s.status === 'available').length || 32;

                  return (
                    <div
                      key={trip.id}
                      className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-blue-400 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-base text-slate-900 dark:text-white">
                            {operator?.name || 'Busmaster Coach'}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            {trip.bus?.bus_type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {trip.bus?.name} • Reg: {trip.bus?.reg_no}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300 pt-1">
                          <span className="font-mono font-semibold">
                            🕒 {trip.departure_time} Departure
                          </span>
                          <span>•</span>
                          <span className="text-emerald-600 font-semibold">
                            {availableCount} Seats Left
                          </span>
                          <span>•</span>
                          <span className="text-blue-600 font-semibold">
                            Multi-Stop Segment Booking Enabled
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-700">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">
                            Standard Fare
                          </span>
                          <div className="font-extrabold text-xl text-slate-900 dark:text-white font-mono">
                            ৳{trip.base_fare}
                          </div>
                        </div>

                        <button
                          onClick={() => handleStartSeatSelection(trip)}
                          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition cursor-pointer flex items-center gap-1"
                        >
                          <span>Select Seats</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* INTERACTIVE SEAT SELECTION & SEGMENT STEP */}
      {viewStep === 'seat_select' && selectedTrip && (() => {
        const tripLayout = dbStore.getSeatLayoutForTrip(selectedTrip.id);
        const layoutGrid = tripLayout?.grid_data || [];
        const rowsCount = tripLayout?.rows_count || 9;
        const colsCount = tripLayout?.cols_count || 4;

        const totalSeatsCount = layoutGrid.length || 36;
        const sleeperSeats = layoutGrid.filter((s) => s.type === 'sleeper');
        const disabledSeats = layoutGrid.filter((s) => s.type === 'disabled');
        const femaleSeats = layoutGrid.filter((s) => s.type === 'female');
        const premiumSeats = layoutGrid.filter((s) => s.type === 'premium');
        const regularSeats = layoutGrid.filter((s) => s.type === 'regular' || !s.type);

        const sleeperFare = segmentBaseFare + (sleeperSeats[0]?.extra_fare || 350);
        const premiumFare = segmentBaseFare + (premiumSeats[0]?.extra_fare || 200);
        const disabledFare = segmentBaseFare;
        const femaleFare = segmentBaseFare;
        const regularFare = segmentBaseFare;

        return (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Select Your Seats ({selectedTrip.trip_code})</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-normal">
                    {selectedTrip.bus?.bus_type}
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  {selectedTrip.route?.origin_city || origin} ➔ {selectedTrip.route?.destination_city || destination} • Departure: {selectedTrip.departure_time} • Coach: {selectedTrip.bus?.name || 'Luxury Express'}
                </p>
              </div>
              <button
                onClick={() => setViewStep('search')}
                className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>← Change Bus</span>
              </button>
            </div>

            {/* SEGMENT-BASED TICKET SECTION (Matching Image 2) */}
            <div className="p-4 bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-slate-50 dark:from-blue-950/40 dark:via-slate-900 dark:to-indigo-950/30 rounded-2xl border-2 border-blue-200 dark:border-blue-900 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-blue-600 text-white font-bold text-xs">⚡</span>
                  <div>
                    <h3 className="font-extrabold text-xs sm:text-sm text-blue-950 dark:text-blue-200">
                      Segment-Based Ticket Section (Boarding to Dropping)
                    </h3>
                    <p className="text-[10px] text-blue-700 dark:text-blue-300">
                      Select your exact embarkation stop and destination landing point for segment-accurate seat availability &amp; fare.
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-100 dark:bg-blue-900/60 border border-blue-300 dark:border-blue-700 text-xs font-bold text-blue-800 dark:text-blue-200">
                  <span>Segment Fare:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-extrabold">
                    ৳{segmentBaseFare}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    From Stop:
                  </label>
                  <select
                    value={fromSeq}
                    onChange={(e) => handleFromSeqChange(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {routeStops.slice(0, -1).map((s) => (
                      <option key={s.sequence_order} value={s.sequence_order}>
                        {s.sequence_order}. {s.stop_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    To Stop:
                  </label>
                  <select
                    value={toSeq}
                    onChange={(e) => handleToSeqChange(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {routeStops
                      .filter((s) => s.sequence_order > fromSeq)
                      .map((s) => (
                        <option key={s.sequence_order} value={s.sequence_order}>
                          {s.sequence_order}. {s.stop_name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-blue-700 dark:text-blue-300 pt-0.5">
                <Info className="w-3.5 h-3.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                <span>
                  Non-overlapping journey sections safely release seat inventory for passengers travelling other segments!
                </span>
              </div>
            </div>

            {/* CUSTOMER SEAT TYPE PREFERENCE / FILTER BAR */}
            <div className="space-y-2.5 p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 dark:from-slate-900 dark:via-slate-900/80 dark:to-slate-800 border border-blue-200/80 dark:border-slate-700">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    Filter by Seat Type:
                  </span>
                  <span className="text-[10px] text-slate-500">
                    (Click to highlight matching seats on the bus map)
                  </span>
                </div>
                {selectedSeatTypeFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedSeatTypeFilter('all')}
                    className="text-[11px] text-blue-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Show All Seats</span>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {[
                  { type: 'all', label: 'All Seats', count: totalSeatsCount, fare: regularFare, icon: '💺' },
                  ...(sleeperSeats.length > 0 ? [{ type: 'sleeper', label: 'Sleeper Berth', count: sleeperSeats.length, fare: sleeperFare, icon: '🛏️' }] : []),
                  ...(disabledSeats.length > 0 ? [{ type: 'disabled', label: 'Disabled / Accessible', count: disabledSeats.length, fare: disabledFare, icon: '♿' }] : []),
                  ...(femaleSeats.length > 0 ? [{ type: 'female', label: 'Women Only', count: femaleSeats.length, fare: femaleFare, icon: '👩' }] : []),
                  ...(premiumSeats.length > 0 ? [{ type: 'premium', label: 'VIP Recliner', count: premiumSeats.length, fare: premiumFare, icon: '⭐' }] : []),
                  { type: 'regular', label: 'Standard Seat', count: regularSeats.length, fare: regularFare, icon: '💺' },
                ].map((opt) => {
                  const isSelected = selectedSeatTypeFilter === opt.type;
                  return (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => setSelectedSeatTypeFilter(opt.type as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                        isSelected
                          ? 'bg-blue-600 text-white ring-2 ring-blue-400 shadow-md'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-blue-400'
                      }`}
                    >
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                      <span className={`text-[10px] font-mono px-1 rounded ${isSelected ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                        {opt.count}
                      </span>
                      <span className={`text-[10px] font-mono font-bold ${isSelected ? 'text-blue-100' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        ৳{opt.fare}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Informative Banner for Selected Seat Type */}
              {selectedSeatTypeFilter === 'sleeper' && (
                <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 text-[11px] flex items-center gap-2">
                  <Bed className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  <span>
                    <strong>🛏️ Sleeper Berth Highlighted:</strong> Premium 160° flat-reclining sleep beds with personal reading lamp, privacy curtain, soft pillow &amp; blanket, and USB charging.
                  </span>
                </div>
              )}
              {selectedSeatTypeFilter === 'disabled' && (
                <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 text-[11px] flex items-center gap-2">
                  <Accessibility className="w-4 h-4 text-teal-600 flex-shrink-0" />
                  <span>
                    <strong>♿ Accessible / Priority Seating:</strong> Dedicated front-row seating with step-free entrance access for wheelchair users, passengers with disabilities, and elderly passengers.
                  </span>
                </div>
              )}
              {selectedSeatTypeFilter === 'female' && (
                <div className="p-2.5 rounded-xl bg-pink-50 dark:bg-pink-950/60 border border-pink-200 dark:border-pink-800 text-pink-900 dark:text-pink-200 text-[11px] flex items-center gap-2">
                  <Armchair className="w-4 h-4 text-pink-600 flex-shrink-0" />
                  <span>
                    <strong>👩 Women-Only Reserved:</strong> Safe, comfortable adjacent seating exclusively reserved for female passengers traveling solo or with families.
                  </span>
                </div>
              )}
              {selectedSeatTypeFilter === 'premium' && (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[11px] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>
                    <strong>⭐ VIP Business Class Recliner:</strong> Extra wide leather recliner with extended legroom and calf support.
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              {/* Visual Bus Layout */}
              <div className="flex flex-col items-center">
                <div className="w-full max-w-sm bg-slate-50 dark:bg-slate-900 p-4 rounded-3xl border-2 border-slate-300 dark:border-slate-700 space-y-3 shadow-inner">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-400">
                    <span>FRONT (DRIVER CAB)</span>
                    <span>PASSENGER ENTRY DOOR</span>
                  </div>

                  {/* Rows */}
                  <div className="space-y-2.5">
                    {Array.from({ length: rowsCount }, (_, rIdx) => {
                      const rowNumber = rIdx + 1;
                      const rowLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
                      const rowLetter = rowLetters[rIdx] || `R${rowNumber}`;

                      return (
                        <div key={rowLetter} className="flex items-center justify-around gap-1.5">
                          <span className="w-4 text-[10px] font-mono text-slate-400 font-bold text-center">
                            {rowLetter}
                          </span>
                          {Array.from({ length: colsCount }, (_, cIdx) => {
                            const col = cIdx + 1;
                            const seatNumber = `${rowLetter}${col}`;
                            const seatItem =
                              layoutGrid.find((s) => s.row === rowNumber && s.col === col) ||
                              layoutGrid.find((s) => s.seat_number === seatNumber);

                            if (!seatItem && layoutGrid.length > 0) {
                              return <div key={col} className="w-10 h-10" />;
                            }

                            const isBooked = seatStatuses[seatNumber]?.status === 'booked';
                            const isSelected = selectedSeats.includes(seatNumber);
                            const seatInfo = getSeatInfo(seatNumber);

                            const matchesFilter =
                              selectedSeatTypeFilter === 'all' || seatInfo.type === selectedSeatTypeFilter;
                            const isAisle = colsCount === 4 && col === 2;
                            const isAisle21 = colsCount === 3 && col === 1;

                            const renderIcon = () => {
                              const iconColor = isBooked
                                ? seatInfo.type === 'sleeper'
                                  ? 'text-purple-600 dark:text-purple-400'
                                  : seatInfo.type === 'disabled'
                                  ? 'text-teal-600 dark:text-teal-400'
                                  : seatInfo.type === 'female'
                                  ? 'text-pink-600 dark:text-pink-400'
                                  : seatInfo.type === 'premium'
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-slate-400 dark:text-slate-500'
                                : isSelected
                                ? 'text-white'
                                : seatInfo.type === 'sleeper'
                                ? 'text-purple-700 dark:text-purple-300'
                                : seatInfo.type === 'disabled'
                                ? 'text-teal-700 dark:text-teal-300'
                                : seatInfo.type === 'female'
                                ? 'text-pink-700 dark:text-pink-300'
                                : seatInfo.type === 'premium'
                                ? 'text-amber-700 dark:text-amber-300'
                                : 'text-slate-700 dark:text-slate-200';

                              if (seatInfo.type === 'sleeper') return <Bed className={`w-3.5 h-3.5 ${iconColor}`} />;
                              if (seatInfo.type === 'disabled') return <Accessibility className={`w-3.5 h-3.5 ${iconColor}`} />;
                              if (seatInfo.type === 'female') return <Armchair className={`w-3.5 h-3.5 ${iconColor}`} />;
                              if (seatInfo.type === 'premium') return <Sparkles className={`w-3.5 h-3.5 ${iconColor}`} />;
                              return <Armchair className={`w-3.5 h-3.5 ${iconColor}`} />;
                            };

                            let seatStyle =
                              'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-blue-500';
                            if (isSelected) {
                              seatStyle =
                                'bg-blue-600 text-white ring-2 ring-blue-400 font-bold scale-105 shadow-md shadow-blue-500/25';
                            } else if (isBooked) {
                              const topAccent =
                                seatInfo.type === 'sleeper'
                                  ? 'border-t-[3px] border-t-purple-500'
                                  : seatInfo.type === 'disabled'
                                  ? 'border-t-[3px] border-t-teal-500'
                                  : seatInfo.type === 'female'
                                  ? 'border-t-[3px] border-t-pink-500'
                                  : seatInfo.type === 'premium'
                                  ? 'border-t-[3px] border-t-amber-500'
                                  : 'border-t-[3px] border-t-slate-400 dark:border-t-slate-500';
                              seatStyle = `bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700 cursor-not-allowed opacity-75 ${topAccent}`;
                            } else if (seatInfo.type === 'sleeper') {
                              seatStyle =
                                'bg-purple-50 text-purple-800 border-purple-400 dark:bg-purple-950/70 dark:text-purple-200 dark:border-purple-600 hover:border-purple-500';
                            } else if (seatInfo.type === 'disabled') {
                              seatStyle =
                                'bg-teal-50 text-teal-800 border-teal-400 dark:bg-teal-950/70 dark:text-teal-200 dark:border-teal-600 hover:border-teal-500';
                            } else if (seatInfo.type === 'female') {
                              seatStyle =
                                'bg-pink-50 text-pink-800 border-pink-400 dark:bg-pink-950/70 dark:text-pink-200 dark:border-pink-600 hover:border-pink-500';
                            } else if (seatInfo.type === 'premium') {
                              seatStyle =
                                'bg-amber-50 text-amber-800 border-amber-400 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-600 hover:border-amber-500';
                            }

                            return (
                              <React.Fragment key={col}>
                                <button
                                  type="button"
                                  disabled={isBooked}
                                  onClick={() => handleSeatClick(seatNumber, isBooked)}
                                  title={`${seatNumber} • ${seatInfo.type.toUpperCase()}${seatInfo.isAccessible ? ' (Priority Accessible)' : ''} • Segment Fare: ৳${seatInfo.fare}${isBooked ? ' (Already Booked for this segment)' : ''}`}
                                  className={`w-11 h-12 rounded-xl flex flex-col items-center justify-center font-bold font-mono text-[10px] transition cursor-pointer shadow-sm relative border ${seatStyle} ${
                                    !matchesFilter && !isSelected && !isBooked ? 'opacity-35 hover:opacity-100' : ''
                                  } ${
                                    matchesFilter && selectedSeatTypeFilter !== 'all' && !isSelected && !isBooked ? 'ring-2 ring-blue-500 scale-105' : ''
                                  }`}
                                >
                                  {renderIcon()}
                                  <span className={`leading-none mt-0.5 ${isBooked ? 'text-slate-500 dark:text-slate-400 line-through decoration-slate-400/60' : ''}`}>
                                    {seatNumber}
                                  </span>
                                  {isBooked ? (
                                    <span className="text-[6px] font-black uppercase tracking-tight leading-none text-center">
                                      {seatInfo.type === 'sleeper' && (
                                        <span className="text-purple-700 dark:text-purple-400">BED · SOLD</span>
                                      )}
                                      {seatInfo.type === 'female' && (
                                        <span className="text-pink-700 dark:text-pink-400">WOMEN · SOLD</span>
                                      )}
                                      {seatInfo.type === 'disabled' && (
                                        <span className="text-teal-700 dark:text-teal-400">♿ · SOLD</span>
                                      )}
                                      {seatInfo.type === 'premium' && (
                                        <span className="text-amber-700 dark:text-amber-400">VIP · SOLD</span>
                                      )}
                                      {seatInfo.type === 'regular' && (
                                        <span className="text-slate-400 dark:text-slate-500">SOLD</span>
                                      )}
                                    </span>
                                  ) : (
                                    <span className="text-[7px] font-extrabold uppercase tracking-tighter leading-none text-center">
                                      {seatInfo.type === 'sleeper' && (
                                        <span className="text-purple-700 dark:text-purple-300">BED</span>
                                      )}
                                      {seatInfo.type === 'female' && (
                                        <span className="text-pink-700 dark:text-pink-300">WOMEN</span>
                                      )}
                                      {seatInfo.type === 'disabled' && (
                                        <span className="text-teal-700 dark:text-teal-300">♿</span>
                                      )}
                                      {seatInfo.type === 'premium' && (
                                        <span className="text-amber-700 dark:text-amber-300">VIP</span>
                                      )}
                                    </span>
                                  )}
                                </button>
                                {(isAisle || isAisle21) && <div className="w-3 text-center text-slate-300 text-[8px]">•</div>}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Legend */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px]">
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200">
                    <Bed className="w-3 h-3 text-purple-600" /> Sleeper Berth (৳{sleeperFare})
                  </span>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200">
                    <Accessibility className="w-3 h-3 text-teal-600" /> Accessible (৳{disabledFare})
                  </span>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border border-pink-200">
                    <Armchair className="w-3 h-3 text-pink-600" /> Female Only
                  </span>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200">
                    <Sparkles className="w-3 h-3 text-amber-600" /> VIP (৳{premiumFare})
                  </span>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                    <span className="w-2.5 h-2.5 rounded bg-slate-200 dark:bg-slate-700 border-t-2 border-t-purple-500 border-slate-400" /> Booked / Sold (Type Preserved)
                  </span>
                </div>
              </div>

              {/* Selection Summary */}
              <div className="space-y-4 bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Journey &amp; Seat Summary
                  </h3>
                  <span className="text-[11px] font-mono font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                    {selectedSeats.length} / 4 Selected
                  </span>
                </div>

                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Selected Segment:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {currentFromStop?.stop_name || 'Origin'} ➔ {currentToStop?.stop_name || 'Destination'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Departure Time:</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {selectedTrip.departure_time}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Segment Base Fare:</span>
                    <span className="font-mono font-bold text-emerald-600">
                      ৳{segmentBaseFare} / seat
                    </span>
                  </div>
                </div>

                {selectedSeats.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-400">
                    Click seats on the bus map above to select your preferred seats.
                  </div>
                ) : (
                  <div className="space-y-2 border-t border-b border-slate-200 dark:border-slate-700 py-3">
                    {selectedSeats.map((seatNum) => {
                      const info = getSeatInfo(seatNum);
                      return (
                        <div key={seatNum} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 dark:text-white px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700">
                              {seatNum}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              info.type === 'sleeper' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' :
                              info.type === 'disabled' ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300' :
                              info.type === 'female' ? 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300' :
                              info.type === 'premium' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                              'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                            }`}>
                              {info.type === 'sleeper' ? '🛏️ Sleeper Berth' :
                               info.type === 'disabled' ? '♿ Accessible / Priority' :
                               info.type === 'female' ? '👩 Women Only' :
                               info.type === 'premium' ? '⭐ VIP Recliner' :
                               '💺 Standard Seat'}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            ৳{info.fare}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="space-y-2 text-slate-600 dark:text-slate-300">
                  <div className="flex justify-between font-bold text-sm text-slate-900 dark:text-white pt-1">
                    <span>Total Payable:</span>
                    <span className="font-mono text-emerald-600 text-base">৳{totalAmount}</span>
                  </div>
                </div>

                <button
                  onClick={handleProceedToCheckout}
                  disabled={selectedSeats.length === 0}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 transition cursor-pointer text-xs"
                >
                  Proceed to Passenger Details (৳{totalAmount})
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* CHECKOUT STEP */}
      {viewStep === 'checkout' && selectedTrip && (
        <form
          onSubmit={handleCompleteOnlinePayment}
          className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md space-y-5 text-xs max-w-xl mx-auto"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Passenger Details &amp; Payment Checkout
              </h2>
              <p className="text-[11px] text-slate-500">
                Segment: {currentFromStop?.stop_name} ➔ {currentToStop?.stop_name}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setViewStep('seat_select')}
              className="text-blue-600 font-semibold hover:underline cursor-pointer"
            >
              ← Back to Seats
            </button>
          </div>

          <div>
            <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
              Passenger Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Tanvir Ahmed"
              value={passengerName}
              onChange={(e) => setPassengerName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                Mobile Phone (for SMS Ticket) *
              </label>
              <input
                type="text"
                required
                placeholder="01811-..."
                value={passengerPhone}
                onChange={(e) => setPassengerPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="passenger@mail.com"
                value={passengerEmail}
                onChange={(e) => setPassengerEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Boarding and Dropping Stations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                Specific Boarding Location:
              </label>
              <input
                type="text"
                required
                value={boardingPoint}
                onChange={(e) => setBoardingPoint(e.target.value)}
                placeholder="e.g. Counter 1 / Station Stand"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                Specific Dropping Location:
              </label>
              <input
                type="text"
                required
                value={droppingPoint}
                onChange={(e) => setDroppingPoint(e.target.value)}
                placeholder="e.g. Main Passenger Drop Point"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none"
              />
            </div>
          </div>

          {/* PAYMENT GATEWAY SELECTOR */}
          <div>
            <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1.5">
              Select Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'card', name: 'Debit/Credit Card', icon: '💳' },
                { id: 'bkash', name: 'bKash Direct', icon: '📱' },
                { id: 'nagad', name: 'Nagad Pay', icon: '⚡' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPaymentMethod(p.id as any)}
                  className={`py-2.5 rounded-xl font-bold border text-center transition cursor-pointer flex items-center justify-center gap-1.5 text-xs ${
                    paymentMethod === p.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/25 ring-2 ring-blue-400'
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-blue-400'
                  }`}
                >
                  <span>{p.icon}</span>
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 1. CREDIT / DEBIT CARD INPUT DETAILS */}
          {paymentMethod === 'card' && (
            <div className="p-4 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl border-2 border-indigo-700/60 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-400" />
                  <span className="font-extrabold text-xs uppercase tracking-wider text-indigo-200">
                    Credit / Debit Card Details
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-full">
                  <Lock className="w-3 h-3" />
                  <span>256-Bit SSL Encrypted</span>
                </div>
              </div>

              {/* Live Virtual Card Visualization */}
              <div className="relative p-4 rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-700 text-white shadow-xl space-y-3 overflow-hidden border border-white/20">
                <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold tracking-widest text-[9px] text-blue-200 uppercase">
                    BUSMASTER SECUREPAY
                  </span>
                  <span className="font-black tracking-wider text-sm font-mono px-2 py-0.5 rounded bg-white/20 text-white">
                    {getCardType(cardNumber)}
                  </span>
                </div>
                <div className="w-8 h-6 rounded bg-amber-300/80 border border-amber-400/80 shadow-inner flex items-center justify-center">
                  <div className="w-6 h-4 border-t border-b border-amber-600/60" />
                </div>
                <div className="font-mono text-base tracking-widest font-black text-white text-shadow">
                  {cardNumber || '•••• •••• •••• ••••'}
                </div>
                <div className="flex justify-between items-end text-[10px] text-blue-100">
                  <div>
                    <span className="block text-[8px] text-blue-300 uppercase tracking-wider">CARDHOLDER</span>
                    <span className="font-bold tracking-wide uppercase font-mono">
                      {cardName || passengerName || 'VALUED PASSENGER'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-blue-300 uppercase tracking-wider">EXPIRES</span>
                    <span className="font-bold font-mono">{cardExpiry || 'MM/YY'}</span>
                  </div>
                </div>
              </div>

              {/* Card Inputs */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Card Number *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      maxLength={19}
                      placeholder="4532 1123 4455 8829"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      className="w-full pl-3 pr-20 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-3 top-2 text-[10px] font-bold text-indigo-300 font-mono px-1.5 py-0.5 rounded bg-slate-700">
                      {getCardType(cardNumber)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Cardholder Name (as printed on card) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TANVIR AHMED"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Expiration Date (MM/YY) *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={5}
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      CVV / Security Code *
                    </label>
                    <input
                      type="password"
                      required
                      maxLength={4}
                      placeholder="•••"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(formatCvv(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-[11px] text-slate-400 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={saveCard}
                    onChange={(e) => setSaveCard(e.target.checked)}
                    className="rounded border-slate-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Save this card for secure 1-click booking (PCI-DSS Level 1 compliant tokenization)</span>
                </label>
              </div>
            </div>
          )}

          {/* 2. BKASH DIRECT GATEWAY */}
          {paymentMethod === 'bkash' && (
            <div className="p-4 bg-gradient-to-r from-pink-500/10 via-rose-500/10 to-pink-500/5 rounded-2xl border-2 border-pink-400/60 dark:border-pink-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-pink-600 text-white font-extrabold text-xs">bKash</span>
                  <span className="font-extrabold text-xs text-pink-900 dark:text-pink-200">
                    bKash Direct Gateway Payment
                  </span>
                </div>
                <span className="text-[10px] text-pink-600 dark:text-pink-300 font-bold bg-pink-100 dark:bg-pink-950 px-2 py-0.5 rounded-full">
                  Instant OTP Verified
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    bKash Mobile Wallet Number *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={11}
                    placeholder="01711-XXXXXX"
                    value={bkashNumber}
                    onChange={(e) => setBkashNumber(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 rounded-xl border border-pink-300 dark:border-pink-800 bg-white dark:bg-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    bKash 5-Digit PIN *
                  </label>
                  <input
                    type="password"
                    required
                    maxLength={5}
                    placeholder="•••••"
                    value={bkashPin}
                    onChange={(e) => setBkashPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 rounded-xl border border-pink-300 dark:border-pink-800 bg-white dark:bg-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                A charge of ৳{totalAmount} will be deducted from your bKash wallet. Your PIN is end-to-end encrypted.
              </p>
            </div>
          )}

          {/* 3. NAGAD DIRECT GATEWAY */}
          {paymentMethod === 'nagad' && (
            <div className="p-4 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/5 rounded-2xl border-2 border-orange-400/60 dark:border-orange-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-orange-600 text-white font-extrabold text-xs">Nagad</span>
                  <span className="font-extrabold text-xs text-orange-900 dark:text-orange-200">
                    Nagad Checkout Payment
                  </span>
                </div>
                <span className="text-[10px] text-orange-600 dark:text-orange-300 font-bold bg-orange-100 dark:bg-orange-950 px-2 py-0.5 rounded-full">
                  Government Postal Cash
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Nagad Account Number *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={11}
                    placeholder="01811-XXXXXX"
                    value={nagadNumber}
                    onChange={(e) => setNagadNumber(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 rounded-xl border border-orange-300 dark:border-orange-800 bg-white dark:bg-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Nagad 4-Digit PIN *
                  </label>
                  <input
                    type="password"
                    required
                    maxLength={4}
                    placeholder="••••"
                    value={nagadPin}
                    onChange={(e) => setNagadPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 rounded-xl border border-orange-300 dark:border-orange-800 bg-white dark:bg-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Authorized transaction of ৳{totalAmount}. No extra convenience fee charged.
              </p>
            </div>
          )}

          {/* Itemized Seats Summary */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
            <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">
              Selected Seats &amp; Segment Fare Breakdown
            </span>
            <div className="space-y-1.5">
              {selectedSeats.map((seatNum) => {
                const info = getSeatInfo(seatNum);
                return (
                  <div key={seatNum} className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        Seat {seatNum}
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
                         info.type === 'female' ? '👩 Women Only' :
                         info.type === 'premium' ? '⭐ VIP' : '💺 Standard'}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      ৳{info.fare}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1">
            <div className="flex justify-between font-bold text-slate-900 dark:text-white">
              <span>Total Payable Amount:</span>
              <span className="font-mono text-emerald-600 text-base">৳{totalAmount}</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Instant digital ticket with encrypted QR validation. Online cancellation and refund guaranteed.
            </p>
          </div>

          <button
            type="submit"
            disabled={isProcessingPayment}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 transition cursor-pointer text-xs flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isProcessingPayment ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Processing Payment Authorization...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Pay ৳{totalAmount} &amp; Generate Verified QR Ticket</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* CONFIRMATION & DIGITAL BOARDING PASS SCREEN */}
      {viewStep === 'confirmed' && confirmedBooking && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md space-y-6 max-w-xl mx-auto text-xs">
          <div className="text-center space-y-1">
            {confirmedBooking.ticket_status === 'cancelled' ? (
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <Ban className="w-6 h-6" />
              </div>
            ) : confirmedBooking.ticket_status === 'cancellation_requested' ? (
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto animate-pulse">
                <Clock className="w-6 h-6" />
              </div>
            ) : (
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
            )}

            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              {confirmedBooking.ticket_status === 'cancelled'
                ? 'Booking Cancelled & Refunded'
                : confirmedBooking.ticket_status === 'cancellation_requested'
                ? 'Cancellation Pending Counter Acceptance'
                : 'Ticket Confirmed & Active!'}
            </h2>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-slate-500 bg-blue-50 dark:bg-blue-950/40 p-2.5 rounded-xl border border-blue-200 dark:border-blue-900/60 max-w-md mx-auto">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Supervisor Verification Code (PNR):
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-blue-600 dark:text-cyan-400 font-mono text-base px-2 py-0.5 bg-white dark:bg-slate-900 rounded-md border border-blue-200 dark:border-blue-800 shadow-2xs">
                  {confirmedBooking.booking_ref}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyPnr(confirmedBooking.booking_ref)}
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-[11px] font-bold flex items-center gap-1 transition cursor-pointer shadow-xs"
                  title="Copy Verification Code"
                >
                  {copiedPnr ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPnr ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Pending Counter Acceptance Informative Banner */}
          {confirmedBooking.ticket_status === 'cancellation_requested' && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border-2 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="block font-bold">Cancellation Request Submitted to Station Counter</strong>
                <p className="text-[11px] leading-relaxed">
                  As per transport policy, cancellations can only be confirmed after the counter accepts it. Your request is queued for the station counter clerk. Once accepted, your refund of <strong>৳{Math.round(confirmedBooking.total_payable * 0.8)}</strong> will be finalized and seats released.
                </p>
              </div>
            </div>
          )}

          {/* Ticket Card Preview */}
          <div className={`relative bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-xl space-y-4 border ${
            confirmedBooking.ticket_status === 'cancelled'
              ? 'border-rose-700/60 opacity-90'
              : confirmedBooking.ticket_status === 'cancellation_requested'
              ? 'border-amber-600/70'
              : 'border-slate-700'
          }`}>
            {confirmedBooking.ticket_status === 'cancelled' && (
              <div className="absolute inset-0 bg-rose-950/40 rounded-2xl flex items-center justify-center pointer-events-none">
                <span className="text-rose-400 font-black tracking-widest text-3xl rotate-[-15deg] border-4 border-rose-500 px-6 py-2 rounded-xl">
                  CANCELLED
                </span>
              </div>
            )}

            {confirmedBooking.ticket_status === 'cancellation_requested' && (
              <div className="absolute inset-0 bg-amber-950/30 rounded-2xl flex items-center justify-center pointer-events-none">
                <span className="text-amber-300 font-black tracking-widest text-2xl rotate-[-12deg] border-4 border-amber-500 px-5 py-2 rounded-xl bg-slate-900/80 shadow-2xl">
                  PENDING COUNTER ACCEPTANCE
                </span>
              </div>
            )}

            <div className="flex justify-between items-center pb-3 border-b border-slate-700">
              <div>
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
                  DIGITAL BUS TICKET &amp; BOARDING PASS
                </span>
                <h3 className="font-bold text-base">{confirmedBooking.passenger_name}</h3>
                <span className="text-[10px] text-slate-400 font-mono">{confirmedBooking.passenger_phone}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">SEAT NUMBERS</span>
                <span className="font-extrabold font-mono text-lg text-emerald-400">
                  {confirmedBooking.seats?.map((s) => s.seat_number).join(', ') || 'N/A'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">ROUTE SEGMENT</span>
                <span className="font-semibold text-cyan-300">
                  {confirmedBooking.from_stop_name} ➔ {confirmedBooking.to_stop_name}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Stops #{confirmedBooking.from_seq} to #{confirmedBooking.to_seq}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">BOARDING LOCATION</span>
                <span className="font-semibold">{confirmedBooking.boarding_point}</span>
              </div>
            </div>

            {/* Prominent Supervisor Verification Section */}
            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-700/80 flex items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                  Supervisor Verification Code
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-lg text-cyan-300 tracking-wider">
                    {confirmedBooking.booking_ref}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyPnr(confirmedBooking.booking_ref)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-bold border border-slate-600 flex items-center gap-1 transition cursor-pointer"
                  >
                    {copiedPnr ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedPnr ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <span className="text-[9px] text-slate-400 block">
                  Provide this code or show QR code to the station supervisor to verify boarding.
                </span>
              </div>

              <div className="flex flex-col items-center shrink-0 pl-2 border-l border-slate-800">
                <div className="p-1.5 bg-white rounded-lg shadow-md">
                  <QRCodeSVG
                    value={confirmedBooking.tickets?.[0]?.qr_code_hash || confirmedBooking.booking_ref}
                    size={68}
                  />
                </div>
                <span className="text-[8px] text-slate-400 font-mono mt-0.5 tracking-tight uppercase">
                  Scan QR Pass
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">
                  {confirmedBooking.ticket_status === 'cancelled'
                    ? 'REFUND STATUS'
                    : confirmedBooking.ticket_status === 'cancellation_requested'
                    ? 'REFUND PENDING APPROVAL'
                    : 'TOTAL FARE PAID'}
                </span>
                <span className={`font-bold font-mono text-base ${
                  confirmedBooking.ticket_status === 'cancelled'
                    ? 'text-rose-400'
                    : confirmedBooking.ticket_status === 'cancellation_requested'
                    ? 'text-amber-300'
                    : 'text-emerald-400'
                }`}>
                  ৳{confirmedBooking.ticket_status === 'cancellation_requested'
                    ? Math.round(confirmedBooking.total_payable * 0.8)
                    : confirmedBooking.total_payable}
                  {confirmedBooking.ticket_status === 'cancelled' && ' (Refunded)'}
                  {confirmedBooking.ticket_status === 'cancellation_requested' && ' (80% Policy)'}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">TICKET STATUS</span>
                <span className="font-bold text-xs uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {confirmedBooking.ticket_status === 'confirmed' ? 'Verified Active' : confirmedBooking.ticket_status}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Print, Cancel, New Booking */}
          <div className="space-y-2">
            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow cursor-pointer text-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save PDF</span>
              </button>

              <button
                onClick={() => setViewStep('search')}
                className="py-2.5 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl cursor-pointer text-xs"
              >
                Book Another Trip
              </button>
            </div>

            {/* Cancel Ticket Button (Only available if status is confirmed) */}
            {confirmedBooking.ticket_status === 'confirmed' && (
              <button
                type="button"
                onClick={() => setBookingToCancel(confirmedBooking)}
                className="w-full py-2.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer text-xs"
              >
                <Ban className="w-4 h-4 text-rose-500" />
                <span>Request Ticket Cancellation &amp; Refund</span>
              </button>
            )}

            {/* Support / Complaint Button for this Journey */}
            <button
              type="button"
              onClick={() => handleOpenComplaintForTicket(confirmedBooking)}
              className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer text-xs"
            >
              <MessageSquarePlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Need Help or File a Complaint for this Journey</span>
            </button>

            {confirmedBooking.ticket_status === 'cancellation_requested' && (
              <div className="text-center p-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-500 text-[11px] font-semibold">
                ⏳ Cancellation is waiting for Counter Acceptance. Check back or visit the counter.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MY TICKETS SEARCH & LIST STEP */}
      {viewStep === 'my_tickets' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md space-y-4 max-w-2xl mx-auto text-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-600" />
              <span>Find Your Bookings &amp; Tickets</span>
            </h2>
            <span className="text-xs text-slate-500">
              {myBookings.length} Total Registered Bookings
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search by PNR (e.g. BM-GL-1001) or mobile phone..."
              value={searchPnr}
              onChange={(e) => setSearchPnr(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono focus:outline-none"
            />
          </div>

          <div className="space-y-3 pt-2">
            {myBookings
              .filter(
                (b) =>
                  !searchPnr ||
                  b.booking_ref.toLowerCase().includes(searchPnr.toLowerCase()) ||
                  b.passenger_phone.includes(searchPnr)
              )
              .map((b) => (
                <div
                  key={b.id}
                  className={`p-4 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    b.ticket_status === 'cancelled'
                      ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900'
                      : b.ticket_status === 'cancellation_requested'
                      ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white font-mono">
                        {b.booking_ref}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          b.ticket_status === 'confirmed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : b.ticket_status === 'cancellation_requested'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                            : b.ticket_status === 'cancelled'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        }`}
                      >
                        {b.ticket_status === 'cancellation_requested' ? 'Pending Counter Approval' : b.ticket_status}
                      </span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        • {b.passenger_name} ({b.passenger_phone})
                      </span>
                    </div>

                    <p className="text-slate-600 dark:text-slate-300 font-medium">
                      {b.from_stop_name} ➔ {b.to_stop_name}
                      <span className="text-slate-400 text-[11px] ml-1">
                        (Stop #{b.from_seq} to #{b.to_seq})
                      </span>
                    </p>

                    <p className="text-slate-500 text-[11px]">
                      Seats: <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{b.seats?.map((s) => s.seat_number).join(', ') || 'N/A'}</span> • Boarding: {b.boarding_point}
                    </p>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-800">
                    <div className="text-right">
                      <span className="font-bold text-emerald-600 font-mono text-sm block">
                        ৳{b.total_payable}
                      </span>
                      {b.ticket_status === 'cancelled' && (
                        <span className="text-[10px] text-rose-500 font-medium block">
                          Refund Processed
                        </span>
                      )}
                      {b.ticket_status === 'cancellation_requested' && (
                        <span className="text-[10px] text-amber-600 font-medium block">
                          Refund Pending Counter
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => {
                          setConfirmedBooking(b);
                          setViewStep('confirmed');
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1 shadow-sm"
                      >
                        <span>View QR Ticket</span>
                      </button>

                      <button
                        onClick={() => handleOpenComplaintForTicket(b)}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1 border border-emerald-200 dark:border-emerald-800"
                        title="File complaint or contact support for this trip"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Complain</span>
                      </button>

                      {b.ticket_status === 'confirmed' && (
                        <button
                          onClick={() => setBookingToCancel(b)}
                          className="px-2.5 py-1.5 bg-rose-100 hover:bg-rose-200 dark:bg-rose-950 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1"
                          title="Request ticket cancellation"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Request Cancel</span>
                        </button>
                      )}

                      {b.ticket_status === 'cancellation_requested' && (
                        <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-1 rounded-lg border border-amber-300">
                          ⏳ Waiting Counter
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* PASSENGER COMPLAINT & SUPPORT DESK / SUPPORT GROUP STEP */}
      {viewStep === 'support_complaint' && (
        <div className="space-y-6 max-w-4xl mx-auto text-xs">
          {/* Top Banner & Quick Sub-tabs */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                    <Headphones className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      Passenger Support &amp; Complaint Desk
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                        24/7 Available
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      File service complaints, track responses from Station Counter Managers, or connect via official passenger WhatsApp support groups.
                    </p>
                  </div>
                </div>
              </div>

              {/* Sub-tabs selector */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setSupportSubTab('file_complaint');
                    setSubmittedTicketSuccess(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                    supportSubTab === 'file_complaint'
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <MessageSquarePlus className="w-3.5 h-3.5" />
                  <span>File Complaint</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSupportSubTab('track_complaints')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                    supportSubTab === 'track_complaints'
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Live Complaints ({supportTickets.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSupportSubTab('hotlines_group')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                    supportSubTab === 'hotlines_group'
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Support Groups &amp; Hotlines</span>
                </button>
              </div>
            </div>

            {/* Emergency Hotline Ticker */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-amber-900 dark:text-amber-300">
              <div className="flex items-center gap-1.5 font-semibold">
                <Phone className="w-3.5 h-3.5 text-amber-600" />
                <span>Instant Travel Hotlines:</span>
                <span className="font-mono">Hanif: 16334</span>
                <span>•</span>
                <span className="font-mono">Green Line: 16298</span>
                <span>•</span>
                <span className="font-mono">Shohagh: 16440</span>
                <span>•</span>
                <span className="font-mono">Shyamoli: 16550</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-900 font-bold text-[10px]">
                  Emergency: 999
                </span>
                <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold text-[10px]">
                  BRTA: 16107
                </span>
              </div>
            </div>
          </div>

          {/* SUB-TAB 1: FILE COMPLAINT */}
          {supportSubTab === 'file_complaint' && (
            <div className="space-y-4">
              {submittedTicketSuccess ? (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border-2 border-emerald-500 shadow-lg space-y-4 text-center animate-in fade-in">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Complaint Case #{submittedTicketSuccess.id} Lodged Successfully!
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                      Your complaint has been dispatched directly to the Station Counter Manager. They will review and respond to you shortly.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl max-w-md mx-auto text-left space-y-1.5 border border-slate-200 dark:border-slate-700 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Subject:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{submittedTicketSuccess.subject}</span>
                    </div>
                    {submittedTicketSuccess.booking_ref && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Linked PNR:</span>
                        <span className="font-bold text-blue-600">{submittedTicketSuccess.booking_ref}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">Status:</span>
                      <span className="font-bold text-amber-600 uppercase">Open (Waiting for Counter Response)</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSupportSubTab('track_complaints');
                        setSelectedTicketForChat(submittedTicketSuccess.id);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl cursor-pointer text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>View Live Conversation &amp; Track Status</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubmittedTicketSuccess(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl cursor-pointer text-xs"
                    >
                      File Another Complaint
                    </button>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmitComplaint}
                  className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md space-y-5"
                >
                  <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-blue-600" />
                      Lodge an Official Service Complaint or Inquiry
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Select the operator and category of issue. Inquiries and complaints are received and resolved by station managers.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Operator */}
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Select Bus Operator <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={complaintTenantId}
                        onChange={(e) => setComplaintTenantId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold cursor-pointer focus:outline-none"
                      >
                        {allTenants.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Booking Reference / PNR */}
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Booking PNR / Ticket Number <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. BM-GL-1001 or BM-D0H05I"
                        value={complaintBookingRef}
                        onChange={(e) => setComplaintBookingRef(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono uppercase focus:outline-none"
                      />
                    </div>

                    {/* Passenger Name */}
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Your Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Asif Mahmud"
                        value={complaintPassengerName}
                        onChange={(e) => setComplaintPassengerName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>

                    {/* Passenger Contact Phone */}
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Contact Mobile Phone <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 01711-234567"
                        value={complaintPassengerPhone}
                        onChange={(e) => setComplaintPassengerPhone(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Complaint Category Pills */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block">
                      Select Issue Category <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {COMPLAINT_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setComplaintCategory(cat.id)}
                          className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                            complaintCategory === cat.id
                              ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/50 shadow-xs'
                              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-slate-50/50 dark:bg-slate-900/40'
                          }`}
                        >
                          <div className="font-bold text-slate-900 dark:text-white text-xs">{cat.label}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{cat.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Priority Selector */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block">
                      Urgency Level
                    </label>
                    <div className="flex gap-2">
                      {[
                        { id: 'normal', label: 'Normal Inquiry', color: 'border-slate-300 text-slate-700' },
                        { id: 'high', label: 'High Priority', color: 'border-amber-400 text-amber-700' },
                        { id: 'urgent', label: '🚨 Urgent Departure Issue', color: 'border-rose-400 text-rose-700' },
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setComplaintPriority(p.id as any)}
                          className={`px-3 py-1.5 rounded-xl border font-bold text-xs transition cursor-pointer ${
                            complaintPriority === p.id
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Subject / Short Summary <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. AC cooling was not working on Coach #505 during Dhaka to Chattogram trip"
                      value={complaintSubject}
                      onChange={(e) => setComplaintSubject(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Detailed Description of Complaint / Issue <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Please describe what happened, time of incident, seat number, and any assistance required from the station manager..."
                      value={complaintMessage}
                      onChange={(e) => setComplaintMessage(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl cursor-pointer text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30"
                    >
                      <Send className="w-4 h-4" />
                      <span>Submit Official Complaint to Counter Manager</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* SUB-TAB 2: TRACK LIVE COMPLAINTS & INTERACTIVE CHAT */}
          {supportSubTab === 'track_complaints' && (
            <div className="space-y-4">
              {/* Search bar */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row gap-3 items-center">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search by Ticket ID (e.g. st-01), PNR (e.g. BM-GL-1003), or subject..."
                    value={searchComplaintQuery}
                    onChange={(e) => setSearchComplaintQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-none"
                  />
                </div>
                {searchComplaintQuery && (
                  <button
                    onClick={() => setSearchComplaintQuery('')}
                    className="text-xs text-blue-600 font-semibold cursor-pointer shrink-0"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              {/* Tickets List */}
              <div className="space-y-3">
                {(() => {
                  const query = searchComplaintQuery.trim().toLowerCase();
                  const filtered = supportTickets.filter((t) => {
                    if (!query) return true;
                    return (
                      t.id.toLowerCase().includes(query) ||
                      (t.booking_ref && t.booking_ref.toLowerCase().includes(query)) ||
                      t.subject.toLowerCase().includes(query) ||
                      t.message.toLowerCase().includes(query)
                    );
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-2">
                        <MessageSquare className="w-10 h-10 text-slate-400 mx-auto" />
                        <h4 className="font-bold text-slate-800 dark:text-slate-200">No support tickets found</h4>
                        <p className="text-xs text-slate-500">
                          {searchComplaintQuery
                            ? `No records matching "${searchComplaintQuery}". Try searching by your Ticket ID or PNR.`
                            : 'You have not submitted any complaints yet. Click "File Complaint" above to submit a case.'}
                        </p>
                      </div>
                    );
                  }

                  return filtered.map((t) => {
                    const isExpanded = selectedTicketForChat === t.id;
                    const tenant = allTenants.find((item) => item.id === t.tenant_id);

                    const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
                      open: { bg: 'bg-amber-100 dark:bg-amber-950', text: 'text-amber-800 dark:text-amber-300', label: 'Open' },
                      in_progress: { bg: 'bg-blue-100 dark:bg-blue-950', text: 'text-blue-800 dark:text-blue-300', label: 'In Progress' },
                      waiting_for_customer: { bg: 'bg-purple-100 dark:bg-purple-950', text: 'text-purple-800 dark:text-purple-300', label: 'Waiting for Passenger' },
                      resolved: { bg: 'bg-emerald-100 dark:bg-emerald-950', text: 'text-emerald-800 dark:text-emerald-300', label: 'Resolved' },
                      closed: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', label: 'Closed' },
                    };

                    const style = statusStyles[t.status] || statusStyles.open;

                    return (
                      <div
                        key={t.id}
                        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition"
                      >
                        {/* Ticket Header Card */}
                        <div
                          onClick={() => setSelectedTicketForChat(isExpanded ? null : t.id)}
                          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition"
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900">
                                #{t.id.toUpperCase()}
                              </span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {tenant?.name || 'Coach Operator'}
                              </span>
                              {t.booking_ref && (
                                <span className="font-mono text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                  PNR: {t.booking_ref}
                                </span>
                              )}
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${style.bg} ${style.text}`}>
                                {style.label}
                              </span>
                              {t.priority === 'urgent' && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                                  🚨 Urgent
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white pt-0.5">
                              {t.subject}
                            </h4>
                            <p className="text-xs text-slate-500 line-clamp-1">
                              {t.message}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                            <span className="text-[11px] text-slate-400 font-medium">
                              {t.replies?.length || 0} {(t.replies?.length || 0) === 1 ? 'Reply' : 'Replies'}
                            </span>
                            <div className="p-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </div>
                        </div>

                        {/* Expandable Conversation Thread */}
                        {isExpanded && (
                          <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-50/60 dark:bg-slate-900/40 space-y-4">
                            <div className="space-y-3">
                              {/* Initial Ticket Creation Message */}
                              <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30 space-y-1.5">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5 text-blue-600" />
                                    Initial Passenger Complaint
                                  </span>
                                  <span className="text-slate-400 font-mono text-[10px]">
                                    {t.created_at ? new Date(t.created_at).toLocaleString() : ''}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                                  {t.message}
                                </p>
                              </div>

                              {/* All Replies Thread */}
                              {t.replies && t.replies.length > 0 && (
                                <div className="space-y-2.5 pl-2 sm:pl-4 border-l-2 border-emerald-500">
                                  {t.replies.map((rep) => {
                                    const isPassenger = rep.sender_role === 'PASSENGER';
                                    return (
                                      <div
                                        key={rep.id}
                                        className={`p-3 rounded-xl border space-y-1 ${
                                          isPassenger
                                            ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900'
                                            : 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between text-[11px]">
                                          <div className="flex items-center gap-1.5 font-bold">
                                            {isPassenger ? (
                                              <User className="w-3.5 h-3.5 text-blue-600" />
                                            ) : (
                                              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                            )}
                                            <span className={isPassenger ? 'text-blue-900 dark:text-blue-200' : 'text-emerald-900 dark:text-emerald-200'}>
                                              {rep.sender_name}
                                            </span>
                                            <span
                                              className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                                                isPassenger
                                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                                              }`}
                                            >
                                              {rep.sender_role}
                                            </span>
                                          </div>
                                          <span className="text-slate-400 font-mono text-[10px]">
                                            {new Date(rep.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                          </span>
                                        </div>
                                        <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                                          {rep.message}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Interactive Passenger Follow-Up Reply Box */}
                            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                              <label className="font-bold text-slate-700 dark:text-slate-300 text-[11px] flex items-center gap-1.5">
                                <Send className="w-3 h-3 text-blue-600" />
                                Send Follow-up Message to Station Counter Manager:
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Type your reply to the counter manager here..."
                                  value={passengerReplyText}
                                  onChange={(e) => setPassengerReplyText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleSendPassengerReply(t.id);
                                    }
                                  }}
                                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSendPassengerReply(t.id)}
                                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center gap-1.5 shadow-sm"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  <span>Send Reply</span>
                                </button>
                              </div>
                              <span className="text-[10px] text-slate-400 block">
                                💬 Replies sent here are instantly visible to the operator's Counter Manager and Customer Support Desk.
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* SUB-TAB 3: OPERATOR SUPPORT GROUPS & HELPLINES */}
          {supportSubTab === 'hotlines_group' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {OPERATOR_SUPPORT_DIRECTORY.map((op) => (
                  <div
                    key={op.name}
                    className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3.5 hover:border-emerald-400 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center font-bold text-emerald-700 dark:text-emerald-300 text-sm">
                          {op.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{op.name}</h4>
                          <span className="text-[10px] text-emerald-600 font-semibold">{op.status}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-mono">
                        Official Operator
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      {op.coverage}
                    </p>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-blue-500" />
                          Shortcode Helpline:
                        </span>
                        <a
                          href={`tel:${op.hotline}`}
                          className="font-mono font-bold text-blue-600 hover:underline"
                        >
                          {op.hotline}
                        </a>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-emerald-500" />
                          Station Desk Direct:
                        </span>
                        <a
                          href={`tel:${op.phone.replace(/[^0-9+]/g, '')}`}
                          className="font-mono font-bold text-slate-800 dark:text-slate-200 hover:underline"
                        >
                          {op.phone}
                        </a>
                      </div>
                    </div>

                    {/* WhatsApp Support Group Link Button */}
                    <div className="pt-1">
                      <a
                        href={op.whatsappGroupLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30 transition text-xs"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-100" />
                        <span>Join {op.name} WhatsApp Support Group</span>
                        <ExternalLink className="w-3.5 h-3.5 text-emerald-200" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              {/* Central Consumer Protection & Emergency Hotlines */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-3 shadow-lg">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  <h4 className="font-bold text-sm">Bangladesh National Passenger Rights &amp; Emergency Desks</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-mono">BRTA Passenger Hotline</span>
                    <div className="font-extrabold text-base text-cyan-300 font-mono">16107</div>
                    <p className="text-[10px] text-slate-300">Overcharging, safety violations &amp; route licensing</p>
                  </div>
                  <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-mono">National Emergency</span>
                    <div className="font-extrabold text-base text-rose-400 font-mono">999</div>
                    <p className="text-[10px] text-slate-300">Highway police, accident response &amp; fire service</p>
                  </div>
                  <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-mono">Consumer Rights (DNCRP)</span>
                    <div className="font-extrabold text-base text-amber-300 font-mono">16121</div>
                    <p className="text-[10px] text-slate-300">Fare disputes, service quality &amp; ticket complaints</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CANCELLATION REQUEST MODAL (REQUIRES COUNTER ACCEPTANCE) */}
      {bookingToCancel &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in duration-150 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-rose-600">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Request Ticket Cancellation
                  </h3>
                </div>
                <button
                  onClick={() => setBookingToCancel(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-slate-600 dark:text-slate-300">
                  Submit a cancellation request for booking{' '}
                  <strong className="text-blue-600 font-mono">{bookingToCancel.booking_ref}</strong> to the station counter agent.
                </p>

                {/* Refund breakdown card */}
                {(() => {
                  const tenant = dbStore.getTenantById(bookingToCancel.tenant_id);
                  const refundPct = tenant?.settings.refund_percentage || 80;
                  const netRefund = Math.round((bookingToCancel.total_payable * refundPct) / 100);
                  const cancellationFee = bookingToCancel.total_payable - netRefund;

                  return (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Journey Route:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {bookingToCancel.from_stop_name} ➔ {bookingToCancel.to_stop_name}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Booked Seats:</span>
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {bookingToCancel.seats?.map((s) => s.seat_number).join(', ') || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Original Amount Paid:</span>
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          ৳{bookingToCancel.total_payable}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-rose-600">
                        <span>Cancellation Fee ({100 - refundPct}%):</span>
                        <span className="font-mono font-semibold">-৳{cancellationFee}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center font-bold text-sm">
                        <span className="text-slate-900 dark:text-white">Refund Upon Counter Acceptance:</span>
                        <span className="font-mono text-emerald-600 text-base">৳{netRefund}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Reason */}
                <div>
                  <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                    Reason for Cancellation (Required):
                  </label>
                  <select
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                  >
                    <option value="Change of travel schedule">Change of travel schedule</option>
                    <option value="Booked incorrect journey date or bus class">Booked incorrect journey date or bus class</option>
                    <option value="Personal emergency">Personal emergency</option>
                    <option value="Found alternative transport">Found alternative transport</option>
                    <option value="Other passenger request">Other passenger request</option>
                  </select>
                </div>

                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[11px] flex items-center gap-2">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span>
                    <strong>Counter Rule:</strong> Cancellation can only be confirmed after the counter accepts it. Your seats remain reserved until counter approval.
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBookingToCancel(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Keep Ticket
                </button>
                <button
                  type="button"
                  onClick={handleRequestCancelBooking}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold text-white shadow-lg shadow-amber-600/30 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Clock className="w-4 h-4" />
                  <span>Submit to Counter</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* CANCELLATION REQUEST TRANSMITTED TOAST / MODAL */}
      {cancelFeedback &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4 animate-in fade-in zoom-in duration-150">
              <Clock className="w-12 h-12 text-amber-500 mx-auto animate-bounce" />
              <div className="space-y-1">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Cancellation Request Sent to Counter
                </h3>
                <p className="text-xs text-slate-500">
                  PNR: <strong className="font-mono text-blue-600">{cancelFeedback.pnr}</strong>
                </p>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs text-left space-y-1">
                <p>
                  Your cancellation request has been transmitted to the station counter agent.
                </p>
                <p className="font-semibold text-amber-900 dark:text-amber-200">
                  • Cancellation can only be confirmed after the counter accepts it.
                </p>
                <p>
                  • A refund of <strong className="font-mono font-bold text-sm text-emerald-600">৳{cancelFeedback.refund}</strong> will be processed to your account once accepted.
                </p>
              </div>
              <button
                onClick={() => setCancelFeedback(null)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl cursor-pointer text-xs"
              >
                Understood, Return to Portal
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* SECURE PAYMENT PROCESSING MODAL OVERLAY */}
      {isProcessingPayment &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-7 shadow-2xl border-2 border-blue-500/50 text-center space-y-4 animate-in fade-in zoom-in duration-150">
              <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 animate-spin" />
                <CreditCard className="w-7 h-7 text-blue-600 animate-pulse" />
              </div>

              <div className="space-y-1">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Processing Payment
                </h3>
                <p className="text-sm font-mono font-bold text-emerald-600">
                  ৳{totalAmount} BDT
                </p>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 text-slate-700 dark:text-slate-300 text-xs text-center space-y-2">
                <p className="text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                  {processingStatusText}
                </p>
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-mono pt-1 border-t border-blue-200 dark:border-blue-900/60">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>3D-Secure 2.0 Bank Handshake</span>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* FLOATING 24/7 PASSENGER SUPPORT & COMPLAINT PILL */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => {
            setViewStep('support_complaint');
            setSubmittedTicketSuccess(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="group flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-full shadow-2xl shadow-emerald-600/40 border border-emerald-400/40 transition-all duration-200 hover:scale-105 cursor-pointer"
          title="Open Passenger Support Desk, WhatsApp Group & Complaints"
        >
          <div className="relative">
            <Headphones className="w-5 h-5 text-white" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full" />
          </div>
          <div className="text-left">
            <div className="font-extrabold text-xs leading-tight">24/7 Support &amp; Helpdesk</div>
            <div className="text-[10px] text-emerald-100 opacity-90 leading-tight">Complain • WhatsApp Group</div>
          </div>
        </button>
      </div>
    </div>
  );
};
