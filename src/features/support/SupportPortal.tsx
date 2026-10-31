import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { dbStore } from '../../services/dbStore';
import { SupportTicket, SupportReply, Profile } from '../../types';
import {
  HelpCircle,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Send,
  CornerDownRight,
  User,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  UserCheck,
} from 'lucide-react';

export const SupportPortal: React.FC = () => {
  const { tenant, profile, isSuperAdmin } = useAuth();
  const tenantId = tenant?.id || '';

  // Get all company managers for this tenant
  const [managers, setManagers] = useState<Profile[]>(
    dbStore
      .getProfilesByTenant(tenantId)
      .filter((p) => p.role === 'counter_manager' || p.role === 'company_admin' || p.role === 'company_owner')
  );

  const defaultManager =
    managers.find((m) => m.role === 'counter_manager') ||
    managers[0] ||
    ({
      id: 'p-mgr-fallback',
      full_name: 'Kabir Hossain',
      role: 'counter_manager',
    } as Profile);

  const [selectedManagerId, setSelectedManagerId] = useState<string>(
    profile.role === 'counter_manager' ? profile.id : defaultManager.id
  );

  const [tickets, setTickets] = useState<SupportTicket[]>([
    {
      id: 'st-01',
      tenant_id: tenantId,
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
      tenant_id: tenantId,
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
      tenant_id: tenantId,
      booking_ref: 'BM-HN-505',
      subject: 'Change of passenger phone number on confirmed ticket',
      message: 'My contact number changed, please update ticket notification details.',
      priority: 'high',
      status: 'open',
      created_at: new Date(Date.now() - 1800000).toISOString(),
      replies: [],
    },
  ]);

  // Expanded ticket for viewing conversation & replying
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>('st-02');
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [replyStatusMap, setReplyStatusMap] = useState<Record<string, SupportTicket['status']>>({});

  // New Ticket Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newRef, setNewRef] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newPriority, setNewPriority] = useState<SupportTicket['priority']>('normal');

  useEffect(() => {
    const unsub = dbStore.subscribe(() => {
      const updated = dbStore
        .getProfilesByTenant(tenantId)
        .filter((p) => p.role === 'counter_manager' || p.role === 'company_admin' || p.role === 'company_owner');
      setManagers(updated);
    });
    return unsub;
  }, [tenantId]);

  const activeReplyingManager =
    managers.find((m) => m.id === selectedManagerId) || defaultManager;

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject || !newMessage) return;
    const ticket: SupportTicket = {
      id: 'st-' + Date.now(),
      tenant_id: tenantId,
      booking_ref: newRef,
      subject: newSubject,
      message: newMessage,
      priority: newPriority,
      status: 'open',
      replies: [],
      created_at: new Date().toISOString(),
    };
    setTickets([ticket, ...tickets]);
    setExpandedTicketId(ticket.id);
    setShowNewModal(false);
    setNewSubject('');
    setNewRef('');
    setNewMessage('');
  };

  // Passenger ticket replies are strictly sent by the Counter / Operations Manager
  const handleSendReply = (ticketId: string) => {
    const replyText = replyTextMap[ticketId]?.trim();
    if (!replyText) return;

    // Replying entity is ALWAYS the Counter Manager or Company Manager (never platform Super Admin!)
    const replyingName =
      profile.role === 'counter_manager'
        ? profile.full_name
        : activeReplyingManager.full_name || 'Kabir Hossain (Counter Manager)';

    const replyingRole = 'COUNTER MANAGER';

    const newReply: SupportReply = {
      id: 'rep-' + Date.now(),
      ticket_id: ticketId,
      sender_name: replyingName,
      sender_role: replyingRole,
      message: replyText,
      created_at: new Date().toISOString(),
    };

    const targetStatus = replyStatusMap[ticketId] || 'in_progress';

    setTickets(
      tickets.map((t) => {
        if (t.id === ticketId) {
          const updatedReplies = [...(t.replies || []), newReply];
          return {
            ...t,
            status: targetStatus,
            replies: updatedReplies,
            updated_at: new Date().toISOString(),
          };
        }
        return t;
      })
    );

    // Clear input
    setReplyTextMap({ ...replyTextMap, [ticketId]: '' });

    dbStore.addAuditLog({
      tenant_id: tenantId,
      actor_id: activeReplyingManager.id,
      actor_name: replyingName,
      actor_role: 'counter_manager',
      action: 'SUPPORT_TICKET_REPLY',
      entity_type: 'SUPPORT_TICKET',
      entity_id: ticketId,
      details: {
        reply: replyText,
        newStatus: targetStatus,
        manager: replyingName,
        authorized_by: profile.full_name,
      },
    });
  };

  const handleUpdateStatus = (id: string, status: SupportTicket['status']) => {
    setTickets(
      tickets.map((t) => (t.id === id ? { ...t, status, updated_at: new Date().toISOString() } : t))
    );
  };

  return (
    <div className="space-y-6">
      {/* Support Header */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-rose-400" />
            <h1 className="text-xl font-extrabold text-white">
              Customer Support & Complaint Desk
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Resolve passenger inquiries, baggage questions, and station service requests.
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Support Case
        </button>
      </div>

      {/* Policy Banner: Super Admin oversight vs Counter Manager Response */}
      <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
          <UserCheck className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Support Responsibility Policy:</strong> Passenger operational inquiries are answered by the <strong>Counter Manager</strong> or Company Station Desk. (Platform Super Admin oversees governance).
          </span>
        </div>
      </div>

      {/* Support Tickets List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden text-xs">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <span className="font-bold text-sm text-slate-900 dark:text-white">
            Active Support Cases ({tickets.length})
          </span>
          <span className="text-[11px] text-slate-500">
            Click any ticket to view conversation and dispatch manager reply
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {tickets.map((t) => {
            const isExpanded = expandedTicketId === t.id;
            const currentReplyText = replyTextMap[t.id] || '';

            return (
              <div key={t.id} className="p-4 space-y-3 transition-colors hover:bg-slate-50/40 dark:hover:bg-slate-700/20">
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div
                    onClick={() => setExpandedTicketId(isExpanded ? null : t.id)}
                    className="space-y-1 cursor-pointer flex-1"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {t.subject}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          t.status === 'resolved'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : t.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : t.status === 'waiting_for_customer'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {t.status.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Priority: {t.priority.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-slate-600 dark:text-slate-300 text-xs">{t.message}</p>

                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">
                        {t.booking_ref ? `PNR: ${t.booking_ref}` : 'General Inquiry'}
                      </span>
                      <span>•</span>
                      <span>{new Date(t.created_at || '').toLocaleString()}</span>
                      <span>•</span>
                      <span className="text-slate-600 dark:text-slate-300 font-medium">
                        💬 {t.replies?.length || 0} Replies
                      </span>
                    </div>
                  </div>

                  {/* Actions & Expand Toggle */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() =>
                        handleUpdateStatus(
                          t.id,
                          t.status === 'resolved' ? 'open' : 'resolved'
                        )
                      }
                      className={`px-3 py-1 font-semibold rounded text-xs transition cursor-pointer ${
                        t.status === 'resolved'
                          ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-200'
                          : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm'
                      }`}
                    >
                      {t.status === 'resolved' ? 'Reopen' : 'Mark Resolved'}
                    </button>

                    <button
                      onClick={() => setExpandedTicketId(isExpanded ? null : t.id)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
                      title="Toggle conversation and send reply"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* EXPANDED CONVERSATION THREAD & SEND REPLY */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl">
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs block">
                      Conversation Thread & Messages:
                    </span>

                    {/* Original Message */}
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-blue-500" />
                          Passenger / Ticket Creator
                        </span>
                        <span className="text-slate-400">
                          {new Date(t.created_at || '').toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 text-xs">{t.message}</p>
                    </div>

                    {/* Threaded Replies (Always Authored by Manager) */}
                    {t.replies && t.replies.length > 0 && (
                      <div className="space-y-2 pl-4 border-l-2 border-emerald-500">
                        {t.replies.map((rep) => (
                          <div
                            key={rep.id}
                            className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-900 space-y-1"
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                {rep.sender_name}{' '}
                                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-mono bg-emerald-100 dark:bg-emerald-900 px-1.5 py-0.2 rounded">
                                  {rep.sender_role}
                                </span>
                              </span>
                              <span className="text-slate-400">
                                {new Date(rep.created_at).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-slate-800 dark:text-slate-200 text-xs leading-relaxed">
                              {rep.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* SEND REPLY FORM (MANAGER AUTHORED) */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="font-semibold text-slate-700 dark:text-slate-300 text-xs flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Replying Official:</span>
                        </label>

                        {/* Dropdown to select which Counter Manager is authoring the response */}
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-[11px] text-slate-500">Manager:</span>
                          <select
                            value={selectedManagerId}
                            onChange={(e) => setSelectedManagerId(e.target.value)}
                            className="px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 font-bold text-emerald-700 dark:text-emerald-300 focus:outline-none"
                          >
                            {managers.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.full_name} ({m.role === 'counter_manager' ? 'Counter Manager' : 'Company Admin'})
                              </option>
                            ))}
                            {managers.length === 0 && (
                              <option value="p-mgr-fallback">
                                Kabir Hossain (Arambagh Counter Manager)
                              </option>
                            )}
                          </select>
                        </div>
                      </div>

                      <textarea
                        rows={2}
                        placeholder={`Type official response from ${activeReplyingManager.full_name} to the passenger...`}
                        value={currentReplyText}
                        onChange={(e) =>
                          setReplyTextMap({ ...replyTextMap, [t.id]: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500">Update ticket status to:</span>
                          <select
                            value={replyStatusMap[t.id] || t.status}
                            onChange={(e) =>
                              setReplyStatusMap({
                                ...replyStatusMap,
                                [t.id]: e.target.value as any,
                              })
                            }
                            className="text-[11px] px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                          >
                            <option value="in_progress">In Progress</option>
                            <option value="waiting_for_customer">Waiting for Customer</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSendReply(t.id)}
                          disabled={!currentReplyText.trim()}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-bold text-xs shadow transition cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Dispatch Manager Reply</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* New Case Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 text-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Log Support Case</h3>
            <form onSubmit={handleCreateTicket} className="mt-4 space-y-3">
              <div>
                <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Summary of issue..."
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                  PNR Reference (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. BM-GL-1001"
                  value={newRef}
                  onChange={(e) => setNewRef(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                  Description *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Details of complaint or inquiry..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 text-white font-semibold rounded hover:bg-blue-500 shadow"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
