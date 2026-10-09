import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getTickets,
  createTicket,
  replyTicket,
  updateTicketStatus,
} from '../services/api';
import {
  LifeBuoy,
  Search,
  RefreshCw,
  AlertCircle,
  Inbox,
  Loader2,
  CheckCircle2,
  Clock,
  Plus,
  X,
  MessageSquare,
  Send,
  User,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Tag,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import './SupportTickets.css';

const STATUS_OPTIONS = ['Open', 'In Progress', 'Resolved'];

const TICKET_CATEGORIES = [
  'Appointment Assistance',
  'Document Assistance',
  'Account/Login Help',
  'General Clinic Query',
];

export default function SupportTickets() {
  const { isStaff, user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modals & Expansion
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedTicketId, setExpandedTicketId] = useState(null);
  const [replyText, setReplyText] = useState({});
  const [replyStatus, setReplyStatus] = useState({});
  const [replyingId, setReplyingId] = useState(null);

  const [updatingId, setUpdatingId] = useState(null);
  const [feedback, setFeedback] = useState({ id: null, type: '', message: '' });

  const fetchTickets = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getTickets();
      setTickets(data);
    } catch (err) {
      setError(err.message || 'Failed to load tickets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleStatusChange = async (ticketId, newStatus) => {
    setUpdatingId(ticketId);
    setFeedback({ id: null, type: '', message: '' });
    try {
      const updated = await updateTicketStatus(ticketId, newStatus);
      setTickets((prev) =>
        prev.map((t) => (t._id === ticketId ? { ...t, status: updated.status } : t))
      );
      setFeedback({ id: ticketId, type: 'success', message: `Status updated to ${newStatus}` });
      setTimeout(() => setFeedback({ id: null, type: '', message: '' }), 2500);
    } catch (err) {
      setFeedback({ id: ticketId, type: 'error', message: err.message });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSendReply = async (ticketId) => {
    const text = (replyText[ticketId] || '').trim();
    if (!text) return;

    setReplyingId(ticketId);
    try {
      const statusUpdate = isStaff ? replyStatus[ticketId] : undefined;
      const res = await replyTicket(ticketId, {
        message: text,
        status: statusUpdate,
      });

      // Update local state
      setTickets((prev) =>
        prev.map((t) => (t._id === ticketId ? res.ticket : t))
      );

      // Clear input
      setReplyText((prev) => ({ ...prev, [ticketId]: '' }));
      setFeedback({ id: ticketId, type: 'success', message: 'Reply sent successfully!' });
      setTimeout(() => setFeedback({ id: null, type: '', message: '' }), 2500);
    } catch (err) {
      setFeedback({ id: ticketId, type: 'error', message: err.message || 'Failed to send reply.' });
    } finally {
      setReplyingId(null);
    }
  };

  const toggleExpand = (ticketId) => {
    setExpandedTicketId((prev) => (prev === ticketId ? null : ticketId));
  };

  const filteredTickets = tickets.filter((t) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      (t.question && t.question.toLowerCase().includes(searchLower)) ||
      (t.subject && t.subject.toLowerCase().includes(searchLower)) ||
      (t.patientId && t.patientId.toLowerCase().includes(searchLower)) ||
      (t.patientName && t.patientName.toLowerCase().includes(searchLower));

    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const openCount = tickets.filter((t) => t.status === 'Open').length;
  const inProgressCount = tickets.filter((t) => t.status === 'In Progress').length;
  const resolvedCount = tickets.filter((t) => t.status === 'Resolved').length;

  return (
    <div className="tickets-page animate-fade-in">
      {/* Page Header */}
      <div className="tickets-header">
        <div className="tickets-title-group">
          <h1>{isStaff ? 'Patient Support Tickets' : 'Contact Clinic Support'}</h1>
          <p>
            {isStaff
              ? 'Review inquiries, provide clinical assistance, and manage support threads'
              : 'Submit questions to clinic staff, track status, and view care team responses'}
          </p>
        </div>
        <div className="tickets-header-actions">
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
            <span>{isStaff ? 'New Ticket' : 'Create Support Ticket'}</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="tickets-filters">
        <div className="tickets-search-wrapper">
          <Search size={15} className="tickets-search-icon" />
          <input
            type="text"
            className="form-input tickets-search-input"
            placeholder={isStaff ? 'Search by patient ID, name, or message…' : 'Search your tickets…'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search tickets"
          />
        </div>

        <div className="tickets-status-filters">
          <button
            className={`tickets-filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All <span className="tickets-count-badge">{tickets.length}</span>
          </button>
          <button
            className={`tickets-filter-btn ${statusFilter === 'Open' ? 'active' : ''}`}
            onClick={() => setStatusFilter('Open')}
          >
            Open {openCount > 0 && <span className="tickets-count-badge warning">{openCount}</span>}
          </button>
          <button
            className={`tickets-filter-btn ${statusFilter === 'In Progress' ? 'active' : ''}`}
            onClick={() => setStatusFilter('In Progress')}
          >
            In Progress {inProgressCount > 0 && <span className="tickets-count-badge info">{inProgressCount}</span>}
          </button>
          <button
            className={`tickets-filter-btn ${statusFilter === 'Resolved' ? 'active' : ''}`}
            onClick={() => setStatusFilter('Resolved')}
          >
            Resolved
          </button>
        </div>
      </div>

      {/* Main List */}
      {loading ? (
        <div className="loading-center">
          <div className="spinner spinner-lg" />
        </div>
      ) : error ? (
        <div className="error-state">
          <div className="error-state-icon">
            <AlertCircle size={24} />
          </div>
          <h3>Unable to load tickets</h3>
          <p>{error}</p>
          <button className="btn btn-primary btn-sm" onClick={fetchTickets}>
            <RefreshCw size={14} /> Try again
          </button>
        </div>
      ) : tickets.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <Inbox size={26} />
            </div>
            <h3>No support tickets</h3>
            <p>
              {isStaff
                ? 'No support tickets have been submitted by patients yet.'
                : 'You have not submitted any support tickets. Click "Create Support Ticket" if you need assistance with appointments, documents, or clinic questions.'}
            </p>
            {!isStaff && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowCreateModal(true)}
                style={{ marginTop: '12px' }}
              >
                <Plus size={14} /> Create Support Ticket
              </button>
            )}
          </div>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <Search size={22} />
            </div>
            <h3>No matching tickets</h3>
            <p>Try adjusting your search query or status filter.</p>
          </div>
        </div>
      ) : (
        <div className="tickets-list">
          {filteredTickets.map((ticket) => {
            const isExpanded = expandedTicketId === ticket._id;
            const messages = ticket.messages && ticket.messages.length > 0
              ? ticket.messages
              : [
                  {
                    sender: 'patient',
                    senderName: ticket.patientName || 'Patient',
                    text: ticket.question,
                    createdAt: ticket.createdAt,
                  },
                ];

            return (
              <div
                key={ticket._id}
                className={`ticket-card card ${isExpanded ? 'is-expanded' : ''}`}
              >
                {/* Top Summary Bar */}
                <div className="ticket-card-top" onClick={() => toggleExpand(ticket._id)}>
                  <div className="ticket-card-info">
                    <div className="ticket-icon">
                      <LifeBuoy size={18} />
                    </div>
                    <div className="ticket-details">
                      <div className="ticket-header-line">
                        <span className="ticket-subject">
                          {ticket.subject || ticket.question.slice(0, 50)}
                        </span>
                        {ticket.category && (
                          <span className="ticket-category-pill">
                            <Tag size={10} />
                            {ticket.category}
                          </span>
                        )}
                      </div>

                      <p className="ticket-question-preview">{ticket.question}</p>

                      <div className="ticket-meta">
                        <span className="ticket-id">#{ticket._id.slice(-6).toUpperCase()}</span>
                        {isStaff && ticket.patientId && (
                          <span className="ticket-patient">
                            {ticket.patientName ? `${ticket.patientName} (${ticket.patientId})` : ticket.patientId}
                          </span>
                        )}
                        <span className="ticket-date">
                          <Clock size={11} /> {formatDate(ticket.createdAt)}
                        </span>
                        <span className="ticket-msg-count">
                          <MessageSquare size={11} /> {messages.length} message{messages.length === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="ticket-card-actions" onClick={(e) => e.stopPropagation()}>
                    <span className={`badge badge-${ticket.status.toLowerCase().replace(/\s+/g, '-')}`}>
                      {ticket.status}
                    </span>

                    {isStaff && (
                      <div className="ticket-status-update">
                        <select
                          className="form-select"
                          value={ticket.status}
                          onChange={(e) => handleStatusChange(ticket._id, e.target.value)}
                          disabled={updatingId === ticket._id}
                          aria-label="Update ticket status"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        {updatingId === ticket._id && (
                          <Loader2 size={14} className="login-spinner" />
                        )}
                      </div>
                    )}

                    <button
                      type="button"
                      className="btn-icon btn-ghost btn-sm toggle-thread-btn"
                      onClick={() => toggleExpand(ticket._id)}
                      aria-label="Toggle message thread"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Feedback Alert */}
                {feedback.id === ticket._id && (
                  <div
                    className={`ticket-feedback ${
                      feedback.type === 'success' ? 'ticket-feedback-success' : 'ticket-feedback-error'
                    }`}
                  >
                    {feedback.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    <span>{feedback.message}</span>
                  </div>
                )}

                {/* Expanded Conversation Thread */}
                {isExpanded && (
                  <div className="ticket-thread-section animate-fade-in">
                    <div className="thread-divider" />
                    <h4 className="thread-title">Conversation History</h4>

                    <div className="ticket-messages-list">
                      {messages.map((msg, idx) => {
                        const isStaffMsg = msg.sender === 'staff';
                        return (
                          <div
                            key={idx}
                            className={`ticket-message-item ${
                              isStaffMsg ? 'message-staff' : 'message-patient'
                            }`}
                          >
                            <div className="message-sender-row">
                              <span className="message-sender-name">
                                {isStaffMsg ? (
                                  <>
                                    <ShieldCheck size={13} className="staff-icon" />
                                    <span>Care Team ({msg.senderName || 'Clinic Staff'})</span>
                                  </>
                                ) : (
                                  <>
                                    <User size={13} className="patient-icon" />
                                    <span>{msg.senderName || 'Patient'}</span>
                                  </>
                                )}
                              </span>
                              <span className="message-time">
                                {formatDateTime(msg.createdAt)}
                              </span>
                            </div>
                            <div className="message-bubble-content">
                              <p>{msg.text}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Reply Form */}
                    <div className="ticket-reply-form">
                      <div className="reply-input-wrapper">
                        <textarea
                          className="form-textarea reply-textarea"
                          rows="2"
                          placeholder={
                            isStaff
                              ? 'Write a clinical response to the patient…'
                              : 'Write a follow-up reply to clinic staff…'
                          }
                          value={replyText[ticket._id] || ''}
                          onChange={(e) =>
                            setReplyText({ ...replyText, [ticket._id]: e.target.value })
                          }
                          disabled={replyingId === ticket._id}
                        />
                      </div>

                      <div className="reply-controls-row">
                        {isStaff && (
                          <div className="reply-status-option">
                            <label className="form-label" style={{ fontSize: '0.75rem', margin: 0 }}>
                              Set Status on Reply:
                            </label>
                            <select
                              className="form-select form-select-sm"
                              value={replyStatus[ticket._id] || (ticket.status === 'Open' ? 'In Progress' : ticket.status)}
                              onChange={(e) =>
                                setReplyStatus({ ...replyStatus, [ticket._id]: e.target.value })
                              }
                              disabled={replyingId === ticket._id}
                            >
                              <option value="In Progress">In Progress</option>
                              <option value="Resolved">Resolved</option>
                              <option value="Open">Open</option>
                            </select>
                          </div>
                        )}

                        <button
                          type="button"
                          className="btn btn-primary btn-sm reply-submit-btn"
                          onClick={() => handleSendReply(ticket._id)}
                          disabled={replyingId === ticket._id || !(replyText[ticket._id] || '').trim()}
                        >
                          {replyingId === ticket._id ? (
                            <>
                              <Loader2 size={13} className="login-spinner" />
                              <span>Sending…</span>
                            </>
                          ) : (
                            <>
                              <Send size={13} />
                              <span>Send Reply</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Support Ticket Modal */}
      {showCreateModal && (
        <CreateTicketModal
          isStaff={isStaff}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchTickets();
          }}
        />
      )}
    </div>
  );
}

/* ── Create Ticket Modal Component ────────────────────────────────── */
function CreateTicketModal({ isStaff, onClose, onSuccess }) {
  const [category, setCategory] = useState(TICKET_CATEGORIES[0]);
  const [subject, setSubject] = useState('');
  const [question, setQuestion] = useState('');
  const [patientId, setPatientId] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!question.trim()) {
      setError('Please describe your question or issue.');
      return;
    }

    if (isStaff && !patientId.trim()) {
      setError('Please enter the associated Patient ID.');
      return;
    }

    setSubmitting(true);
    try {
      await createTicket({
        category,
        subject: subject.trim() || `${category} Inquiry`,
        question: question.trim(),
        patientId: isStaff ? patientId.trim().toUpperCase() : undefined,
      });
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to create support ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content-md" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{isStaff ? 'Create Patient Support Ticket' : 'Contact Clinic Support'}</h2>
            <p className="modal-subtitle">
              {isStaff
                ? 'Open an inquiry thread on behalf of a patient'
                : 'Send your query directly to our clinical operations team'}
            </p>
          </div>
          <button className="btn-icon btn-ghost" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && (
            <div className="alert alert-error">
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {isStaff && (
            <div className="form-group">
              <label className="form-label" htmlFor="ticket-patient-id">
                Patient ID <span className="required-star">*</span>
              </label>
              <input
                id="ticket-patient-id"
                type="text"
                className="form-input"
                placeholder="e.g. PAT1001"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="ticket-category">
              Category <span className="required-star">*</span>
            </label>
            <select
              id="ticket-category"
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={submitting}
            >
              {TICKET_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="ticket-subject">
              Subject (Optional)
            </label>
            <input
              id="ticket-subject"
              type="text"
              className="form-input"
              placeholder="e.g. Question regarding upcoming ultrasound scan"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="ticket-message">
              Message / Inquiry Details <span className="required-star">*</span>
            </label>
            <textarea
              id="ticket-message"
              className="form-textarea"
              rows="4"
              placeholder="Please provide details about your question, medication concern, document query, or appointment request…"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 size={15} className="login-spinner" />
                  <span>Submitting Ticket…</span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>Submit Ticket</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Date Helpers ─────────────────────────────────────────────────── */
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

