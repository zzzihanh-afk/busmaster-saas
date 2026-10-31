import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { dbStore } from '../../services/dbStore';
import { CashSession, Booking } from '../../types';
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
} from 'lucide-react';

export const CounterManagerPortal: React.FC = () => {
  const { tenant, counter, profile } = useAuth();
  const tenantId = tenant?.id || '';

  const sessions = dbStore.getCashSessions(tenantId);
  const activeSession = sessions.find(
    (s) => s.counter_id === counter?.id && s.status === 'open'
  );

  const [allBookings, setAllBookings] = useState<Booking[]>(() => dbStore.getBookings(tenantId));

  useEffect(() => {
    const unsub = dbStore.subscribe(() => {
      setAllBookings(dbStore.getBookings(tenantId));
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
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Counter Operations & Cash Management
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Station: <span className="font-bold text-slate-800 dark:text-slate-200">{counter?.name}</span> • Counter Code: {counter?.code}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs px-3 py-1 rounded-full font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            MANAGER PRIVILEGES ACTIVE
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CASH DRAWER RECONCILIATION */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Cash Drawer Session & Shift Reconciliation
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
                Close & Reconcile Shift Session
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

        {/* TICKET CANCELLATIONS & REFUND APPROVAL */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-500" />
              Ticket Cancellation & Refund Authorization
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
      </div>
    </div>
  );
};
