import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { dbStore } from '../../services/dbStore';
import { Ticket, Booking, Trip } from '../../types';
import {
  Eye,
  ScanLine,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Bus,
  Search,
  Sparkles,
} from 'lucide-react';

export const SupervisorPortal: React.FC = () => {
  const { tenant, profile } = useAuth();
  const trips = dbStore.getTrips(tenant?.id);

  // Scanner & Verification State
  const [ticketInput, setTicketInput] = useState('');
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    alreadyBoarded?: boolean;
    ticket?: Ticket;
    booking?: Booking;
    trip?: Trip;
    message: string;
  } | null>(null);

  const handleVerify = (codeToVerify?: string) => {
    const code = codeToVerify || ticketInput;
    if (!code.trim()) return;

    const res = dbStore.verifyBoardingTicket(code.trim(), profile.id);
    setScanResult(res);
  };

  return (
    <div className="space-y-6">
      {/* Supervisor Header */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-teal-400" />
            <h1 className="text-xl font-extrabold text-white">
              Station Supervisor & Boarding Dispatch
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Supervisor: <span className="text-white font-bold">{profile.full_name}</span> • Terminal Dispatch Control
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1 rounded-full font-bold bg-teal-950 text-teal-300 border border-teal-800">
            SUPERVISOR AUTHORITY
          </span>
        </div>
      </div>

      {/* Operational Dispatch Metrics (From Master Prompt Architecture) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-slate-500 font-semibold uppercase text-[10px]">Active Trips</span>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">24</div>
          <span className="text-teal-600 font-medium">On-platform dispatch</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-slate-500 font-semibold uppercase text-[10px]">On-Time Departure</span>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">96%</div>
          <span className="text-emerald-600 font-medium">Schedule adherence</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-slate-500 font-semibold uppercase text-[10px]">Delayed Trips</span>
          <div className="text-2xl font-extrabold text-amber-500 mt-1">2</div>
          <span className="text-amber-500 font-medium">Highway traffic notice</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-slate-500 font-semibold uppercase text-[10px]">Cancelled Trips</span>
          <div className="text-2xl font-extrabold text-slate-400 mt-1">1</div>
          <span className="text-slate-400 font-medium">Maintenance swap</span>
        </div>
      </div>

      {/* QR TICKET VERIFICATION SYSTEM */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 text-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-700">
            <ScanLine className="w-5 h-5 text-teal-600" />
            <h2 className="font-bold text-sm text-slate-900 dark:text-white">
              Boarding Pass QR Scanner & Ticket Verifier
            </h2>
          </div>

          <p className="text-slate-500">
            Scan passenger QR code or manually enter the ticket number to verify trip authorization and prevent duplicate boarding.
          </p>

          <div className="space-y-3">
            <div>
              <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                Enter Ticket Number or QR Code Hash:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. TKT-GL-89101 or scan QR"
                  value={ticketInput}
                  onChange={(e) => setTicketInput(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono text-sm focus:outline-none"
                />
                <button
                  onClick={() => handleVerify()}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow cursor-pointer"
                >
                  Verify
                </button>
              </div>
            </div>

            {/* Quick Test Chips for Verification */}
            <div className="pt-2">
              <span className="text-[10px] text-slate-400 block mb-1">
                Quick Test Tickets (Click to verify instantly):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {['TKT-GL-89101', 'TKT-GL-89102', 'TKT-GL-89103-1', 'TKT-INVALID-99'].map((demoCode) => (
                  <button
                    key={demoCode}
                    onClick={() => {
                      setTicketInput(demoCode);
                      handleVerify(demoCode);
                    }}
                    className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded font-mono text-[10px] hover:bg-teal-100 dark:hover:bg-teal-900 cursor-pointer"
                  >
                    {demoCode}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SCAN RESULT DISPLAY */}
        <div className="lg:col-span-6">
          {scanResult ? (
            <div
              className={`p-6 rounded-2xl border shadow-md space-y-4 text-xs ${
                scanResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                  : scanResult.alreadyBoarded
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-100'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100'
              }`}
            >
              <div className="flex items-center gap-3">
                {scanResult.success ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                ) : scanResult.alreadyBoarded ? (
                  <AlertTriangle className="w-8 h-8 text-amber-600 shrink-0" />
                ) : (
                  <XCircle className="w-8 h-8 text-rose-600 shrink-0" />
                )}
                <div>
                  <h3 className="font-extrabold text-base">
                    {scanResult.success
                      ? 'BOARDING AUTHORIZED'
                      : scanResult.alreadyBoarded
                      ? 'DUPLICATE BOARDING ATTEMPT'
                      : 'VERIFICATION REJECTED'}
                  </h3>
                  <p className="text-xs">{scanResult.message}</p>
                </div>
              </div>

              {scanResult.ticket && scanResult.booking && (
                <div className="bg-white/80 dark:bg-slate-900/80 p-4 rounded-xl space-y-2 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                  <div className="flex justify-between font-bold text-sm">
                    <span>Passenger: {scanResult.ticket.passenger_name}</span>
                    <span className="font-mono text-blue-600">
                      Seat: {scanResult.ticket.seat_number}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>PNR Reference:</span>
                    <span className="font-mono">{scanResult.booking.booking_ref}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Route Section:</span>
                    <span>
                      {scanResult.booking.from_stop_name} ➔ {scanResult.booking.to_stop_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Boarding Terminal:</span>
                    <span>{scanResult.booking.boarding_point}</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-600 pt-1 border-t border-slate-200 dark:border-slate-700">
                    <span>Payment Confirmed:</span>
                    <span>৳{scanResult.booking.total_payable}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 text-center text-slate-400 space-y-2">
              <ScanLine className="w-10 h-10 mx-auto opacity-40" />
              <p className="text-xs">
                Awaiting passenger ticket scan. Ready to verify boarding pass.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
