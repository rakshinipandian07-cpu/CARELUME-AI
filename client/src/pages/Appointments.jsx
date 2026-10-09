import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getAppointments,
  bookAppointment,
  createAppointment,
  approveAppointment,
  proposeAppointmentReschedule,
  respondAppointmentReschedule,
  declineAppointment,
  updateAppointmentStatus,
} from '../services/api';
import {
  CalendarDays,
  Clock,
  Plus,
  X,
  RefreshCw,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Inbox,
  Search,
  Check,
  CalendarCheck,
  CalendarX,
  ArrowRight,
  MessageSquare,
  HelpCircle,
  FileText,
  User,
} from 'lucide-react';
import './Appointments.css';

const TIME_SLOTS = [
  '09:00 AM',
  '09:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '02:00 PM',
  '02:30 PM',
  '03:00 PM',
  '03:30 PM',
  '04:00 PM',
  '04:30 PM',
];

const VISIT_REASONS = [
  'Initial Fertility Consultation',
  'Ultrasound Follicle Monitoring',
  'Bloodwork & Hormonal Check',
  'Medication Review & Protocol',
  'IVF Treatment Planning',
  'IUI Procedure Preparation',
  'Embryo Transfer Follow-up',
  'Routine Post-Cycle Review',
  'Other Inquiry',
];

export default function Appointments() {
  const { isStaff, user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [showBookModal, setShowBookModal] = useState(false);
  const [showStaffCreateModal, setShowStaffCreateModal] = useState(false);
  const [rescheduleModalApt, setRescheduleModalApt] = useState(null);
  const [declineModalApt, setDeclineModalApt] = useState(null);
  const [patientCounterModalApt, setPatientCounterModalApt] = useState(null);

  // Action loading state
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const fetchAppointments = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAppointments();
      setAppointments(data);
    } catch (err) {
      setError(err.message || 'Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const showToast = (type, message) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Staff Approve
  const handleApprove = async (aptId) => {
    setActionLoadingId(aptId);
    try {
      await approveAppointment(aptId);
      showToast('success', 'Appointment confirmed successfully!');
      fetchAppointments();
    } catch (err) {
      showToast('error', err.message || 'Failed to approve appointment.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Patient Accept Proposed Time
  const handlePatientAccept = async (aptId) => {
    setActionLoadingId(aptId);
    try {
      await respondAppointmentReschedule(aptId, { action: 'accept' });
      showToast('success', 'Proposed appointment time confirmed!');
      fetchAppointments();
    } catch (err) {
      showToast('error', err.message || 'Failed to accept reschedule.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Staff direct status update
  const handleQuickStatusChange = async (aptId, newStatus) => {
    setActionLoadingId(aptId);
    try {
      await updateAppointmentStatus(aptId, newStatus);
      showToast('success', `Appointment status updated to ${newStatus}.`);
      fetchAppointments();
    } catch (err) {
      showToast('error', err.message || 'Failed to update status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter list
  const filteredAppointments = appointments.filter((apt) => {
    const matchesSearch =
      (apt.patientId && apt.patientId.toLowerCase().includes(search.toLowerCase())) ||
      (apt.patientName && apt.patientName.toLowerCase().includes(search.toLowerCase())) ||
      (apt.reason && apt.reason.toLowerCase().includes(search.toLowerCase())) ||
      (apt.date && apt.date.includes(search));

    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending') return apt.status === 'Pending Approval';
    if (statusFilter === 'confirmed') return apt.status === 'Confirmed' || apt.status === 'Scheduled';
    if (statusFilter === 'reschedule') return apt.status === 'Reschedule Proposed';
    if (statusFilter === 'completed') return apt.status === 'Completed';
    if (statusFilter === 'cancelled') return apt.status === 'Cancelled';
    return true;
  });

  const pendingCount = appointments.filter((a) => a.status === 'Pending Approval').length;
  const rescheduleCount = appointments.filter((a) => a.status === 'Reschedule Proposed').length;

  return (
    <div className="appointments-page animate-fade-in">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`appointment-toast alert ${
            toastMessage.type === 'success' ? 'alert-success' : 'alert-error'
          } animate-fade-in`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="appointments-header">
        <div className="appointments-title-group">
          <h1>{isStaff ? 'Clinic Appointments' : 'My Care Appointments'}</h1>
          <p>
            {isStaff
              ? 'Manage, approve, and reschedule patient clinic appointments'
              : 'Book upcoming visits, review pending requests, and manage clinic schedules'}
          </p>
        </div>
        <div className="appointments-header-actions">
          {isStaff ? (
            <button
              className="btn btn-primary"
              onClick={() => setShowStaffCreateModal(true)}
            >
              <Plus size={16} />
              <span>New Appointment</span>
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={() => setShowBookModal(true)}
            >
              <CalendarCheck size={16} />
              <span>Book an Appointment</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="appointments-filters-bar">
        <div className="appointments-search-wrapper">
          <Search size={15} className="appointments-search-icon" />
          <input
            type="text"
            className="form-input appointments-search-input"
            placeholder={isStaff ? 'Search by patient ID, name, or reason…' : 'Search your appointments…'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search appointments"
          />
        </div>

        <div className="appointments-filter-tabs">
          <button
            className={`apt-filter-tab ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All <span className="apt-tab-count">{appointments.length}</span>
          </button>
          <button
            className={`apt-filter-tab ${statusFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setStatusFilter('pending')}
          >
            Pending Approval
            {pendingCount > 0 && <span className="apt-tab-count warning">{pendingCount}</span>}
          </button>
          <button
            className={`apt-filter-tab ${statusFilter === 'reschedule' ? 'active' : ''}`}
            onClick={() => setStatusFilter('reschedule')}
          >
            Reschedule Proposed
            {rescheduleCount > 0 && <span className="apt-tab-count info">{rescheduleCount}</span>}
          </button>
          <button
            className={`apt-filter-tab ${statusFilter === 'confirmed' ? 'active' : ''}`}
            onClick={() => setStatusFilter('confirmed')}
          >
            Confirmed
          </button>
          <button
            className={`apt-filter-tab ${statusFilter === 'completed' ? 'active' : ''}`}
            onClick={() => setStatusFilter('completed')}
          >
            Completed
          </button>
          <button
            className={`apt-filter-tab ${statusFilter === 'cancelled' ? 'active' : ''}`}
            onClick={() => setStatusFilter('cancelled')}
          >
            Cancelled
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="loading-center">
          <div className="spinner spinner-lg" />
        </div>
      ) : error ? (
        <div className="error-state">
          <div className="error-state-icon">
            <AlertCircle size={24} />
          </div>
          <h3>Unable to load appointments</h3>
          <p>{error}</p>
          <button className="btn btn-primary btn-sm" onClick={fetchAppointments}>
            <RefreshCw size={14} /> Try again
          </button>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="card empty-state-card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <Inbox size={26} />
            </div>
            <h3>No appointments found</h3>
            <p>
              {search || statusFilter !== 'all'
                ? 'Try adjusting your search or status filter.'
                : isStaff
                ? 'No appointments have been created yet. Click "New Appointment" to get started.'
                : 'You have no scheduled appointments. Click "Book an Appointment" to request a time with our clinic team.'}
            </p>
            {!isStaff && statusFilter === 'all' && !search && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowBookModal(true)}
                style={{ marginTop: '12px' }}
              >
                <CalendarCheck size={14} /> Book an Appointment
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="appointments-grid">
          {filteredAppointments.map((apt) => (
            <AppointmentCard
              key={apt._id}
              appointment={apt}
              isStaff={isStaff}
              actionLoadingId={actionLoadingId}
              onApprove={handleApprove}
              onProposeReschedule={(apt) => setRescheduleModalApt(apt)}
              onDecline={(apt) => setDeclineModalApt(apt)}
              onPatientAccept={handlePatientAccept}
              onPatientRequestNew={(apt) => setPatientCounterModalApt(apt)}
              onStatusChange={handleQuickStatusChange}
            />
          ))}
        </div>
      )}

      {/* Patient Book Appointment Modal */}
      {showBookModal && (
        <PatientBookModal
          onClose={() => setShowBookModal(false)}
          onSuccess={() => {
            setShowBookModal(false);
            showToast('success', 'Appointment request submitted! Clinic staff will review your slot.');
            fetchAppointments();
          }}
        />
      )}

      {/* Staff Create Appointment Modal */}
      {showStaffCreateModal && (
        <StaffCreateModal
          onClose={() => setShowStaffCreateModal(false)}
          onSuccess={() => {
            setShowStaffCreateModal(false);
            showToast('success', 'Appointment scheduled and confirmed!');
            fetchAppointments();
          }}
        />
      )}

      {/* Staff Propose Reschedule Modal */}
      {rescheduleModalApt && (
        <StaffRescheduleModal
          appointment={rescheduleModalApt}
          onClose={() => setRescheduleModalApt(null)}
          onSuccess={() => {
            setRescheduleModalApt(null);
            showToast('success', 'Reschedule proposal sent to patient.');
            fetchAppointments();
          }}
        />
      )}

      {/* Staff Decline Modal */}
      {declineModalApt && (
        <StaffDeclineModal
          appointment={declineModalApt}
          onClose={() => setDeclineModalApt(null)}
          onSuccess={() => {
            setDeclineModalApt(null);
            showToast('success', 'Appointment declined and patient notified.');
            fetchAppointments();
          }}
        />
      )}

      {/* Patient Request Another Time Modal */}
      {patientCounterModalApt && (
        <PatientCounterModal
          appointment={patientCounterModalApt}
          onClose={() => setPatientCounterModalApt(null)}
          onSuccess={() => {
            setPatientCounterModalApt(null);
            showToast('success', 'New preferred appointment time submitted for clinic review.');
            fetchAppointments();
          }}
        />
      )}
    </div>
  );
}

/* ── Individual Appointment Card Component ────────────────────────── */
function AppointmentCard({
  appointment: apt,
  isStaff,
  actionLoadingId,
  onApprove,
  onProposeReschedule,
  onDecline,
  onPatientAccept,
  onPatientRequestNew,
  onStatusChange,
}) {
  const isPending = apt.status === 'Pending Approval';
  const isReschedule = apt.status === 'Reschedule Proposed';
  const isConfirmed = apt.status === 'Confirmed' || apt.status === 'Scheduled';
  const isCancelled = apt.status === 'Cancelled';
  const isCompleted = apt.status === 'Completed';

  const isLoading = actionLoadingId === apt._id;

  const getStatusBadgeClass = () => {
    if (isPending) return 'badge-pending';
    if (isReschedule) return 'badge-reschedule';
    if (isConfirmed) return 'badge-completed';
    if (isCancelled) return 'badge-cancelled';
    if (isCompleted) return 'badge-resolved';
    return 'badge-scheduled';
  };

  return (
    <div className={`appointment-card card ${isReschedule ? 'is-reschedule-proposed' : ''} ${isPending ? 'is-pending-approval' : ''}`}>
      {/* Top Header */}
      <div className="appointment-card-header">
        <div className="appointment-date-badge">
          <CalendarDays size={18} className="apt-date-icon" />
          <div>
            <h3 className="apt-primary-date">{formatDateFull(apt.date)}</h3>
            <span className="apt-primary-time">
              <Clock size={13} /> {apt.time}
            </span>
          </div>
        </div>
        <span className={`badge ${getStatusBadgeClass()}`}>
          {apt.status}
        </span>
      </div>

      {/* Patient & Clinic Details */}
      <div className="appointment-card-body">
        {isStaff && (
          <div className="apt-meta-row">
            <User size={14} className="apt-meta-icon" />
            <span>
              <strong>{apt.patientName || 'Patient'}</strong>{' '}
              <span className="apt-patient-id-tag">({apt.patientId})</span>
            </span>
          </div>
        )}

        {apt.reason && (
          <div className="apt-meta-row">
            <FileText size={14} className="apt-meta-icon" />
            <span className="apt-reason-text">
              <strong>Reason:</strong> {apt.reason}
            </span>
          </div>
        )}

        {apt.notes && (
          <div className="apt-meta-row apt-notes-row">
            <MessageSquare size={14} className="apt-meta-icon" />
            <span className="apt-notes-text">
              <strong>Notes:</strong> {apt.notes}
            </span>
          </div>
        )}

        {/* Reschedule Proposal Details Alert Box */}
        {isReschedule && (
          <div className="apt-reschedule-box">
            <div className="apt-reschedule-header">
              <AlertCircle size={15} />
              <strong>Clinic Proposed Alternative Time</strong>
            </div>
            <div className="apt-reschedule-details">
              <p>
                <strong>Proposed Date:</strong> {formatDateFull(apt.proposedDate || apt.date)}
              </p>
              <p>
                <strong>Proposed Time:</strong> {apt.proposedTime}
              </p>
              {apt.staffMessage && (
                <p className="apt-staff-message">
                  <strong>Message:</strong> “{apt.staffMessage}”
                </p>
              )}
            </div>

            {/* Patient Action Buttons on Proposed Reschedule */}
            {!isStaff && (
              <div className="apt-patient-reschedule-actions">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => onPatientAccept(apt._id)}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 size={14} className="login-spinner" /> : <Check size={14} />}
                  <span>Accept Proposed Time</span>
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => onPatientRequestNew(apt)}
                  disabled={isLoading}
                >
                  <Clock size={14} />
                  <span>Request Another Time</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Decline Reason Display */}
        {isCancelled && apt.declineReason && (
          <div className="apt-decline-box">
            <AlertCircle size={14} />
            <span>
              <strong>Clinic Note:</strong> {apt.declineReason}
            </span>
          </div>
        )}
      </div>

      {/* Staff Actions Bar */}
      {isStaff && (
        <div className="appointment-card-footer">
          {isPending && (
            <div className="apt-staff-approval-actions">
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onApprove(apt._id)}
                disabled={isLoading}
                title="Confirm this appointment slot"
              >
                {isLoading ? <Loader2 size={13} className="login-spinner" /> : <Check size={13} />}
                <span>Approve</span>
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onProposeReschedule(apt)}
                disabled={isLoading}
                title="Suggest an alternative date or time"
              >
                <Clock size={13} />
                <span>Suggest Time</span>
              </button>
              <button
                className="btn btn-danger-outline btn-sm"
                onClick={() => onDecline(apt)}
                disabled={isLoading}
                title="Decline this appointment request"
              >
                <CalendarX size={13} />
                <span>Decline</span>
              </button>
            </div>
          )}

          {!isPending && (
            <div className="apt-status-change-group">
              <span className="apt-status-label">Update Status:</span>
              <select
                className="form-select apt-status-select"
                value={apt.status}
                onChange={(e) => onStatusChange(apt._id, e.target.value)}
                disabled={isLoading}
                aria-label="Update appointment status"
              >
                <option value="Confirmed">Confirmed</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Modal 1: Patient Book Appointment Form ───────────────────────── */
function PatientBookModal({ onClose, onSuccess }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState('');
  const [time, setTime] = useState(TIME_SLOTS[0]);
  const [reasonCategory, setReasonCategory] = useState(VISIT_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!date) {
      setError('Please select a preferred appointment date.');
      return;
    }

    if (date < todayStr) {
      setError('Please choose a valid upcoming date.');
      return;
    }

    if (!time) {
      setError('Please choose a preferred time slot.');
      return;
    }

    const finalReason =
      reasonCategory === 'Other Inquiry'
        ? customReason.trim() || 'General Consultation'
        : reasonCategory;

    setSubmitting(true);
    try {
      await bookAppointment({
        date,
        time,
        reason: finalReason,
        notes: notes.trim(),
      });
      onSuccess();
    } catch (err) {
      setError(err.message || 'Unable to submit booking request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content-md" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Book an Appointment</h2>
            <p className="modal-subtitle">Choose your preferred clinic date and time slot</p>
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

          <div className="form-group">
            <label className="form-label" htmlFor="patient-apt-date">
              Preferred Date <span className="required-star">*</span>
            </label>
            <input
              id="patient-apt-date"
              type="date"
              className="form-input"
              min={todayStr}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Preferred Time Slot <span className="required-star">*</span>
            </label>
            <div className="time-slots-grid">
              {TIME_SLOTS.map((slot) => (
                <button
                  type="button"
                  key={slot}
                  className={`time-slot-pill ${time === slot ? 'selected' : ''}`}
                  onClick={() => setTime(slot)}
                  disabled={submitting}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="patient-apt-reason">
              Reason for Visit
            </label>
            <select
              id="patient-apt-reason"
              className="form-select"
              value={reasonCategory}
              onChange={(e) => setReasonCategory(e.target.value)}
              disabled={submitting}
            >
              {VISIT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {reasonCategory === 'Other Inquiry' && (
            <div className="form-group">
              <label className="form-label" htmlFor="patient-apt-custom-reason">
                Describe Reason
              </label>
              <input
                id="patient-apt-custom-reason"
                type="text"
                className="form-input"
                placeholder="e.g. Discuss lab test results"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                disabled={submitting}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="patient-apt-notes">
              Notes for Clinic Staff (Optional)
            </label>
            <textarea
              id="patient-apt-notes"
              className="form-textarea"
              rows="3"
              placeholder="Any specific questions, symptoms, or scheduling preferences…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={submitting}
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
                  <span>Submitting Request…</span>
                </>
              ) : (
                <>
                  <Check size={15} />
                  <span>Submit Appointment Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Modal 2: Staff Create Appointment Modal ──────────────────────── */
function StaffCreateModal({ onClose, onSuccess }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [patientId, setPatientId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState(TIME_SLOTS[0]);
  const [reason, setReason] = useState(VISIT_REASONS[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!patientId.trim()) {
      setError('Please provide the Patient ID (e.g. PAT1001).');
      return;
    }
    if (!date) {
      setError('Please specify the appointment date.');
      return;
    }

    setSubmitting(true);
    try {
      await createAppointment({
        patientId: patientId.trim().toUpperCase(),
        date,
        time,
        reason,
        notes: notes.trim(),
      });
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to create appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content-md" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>New Clinic Appointment</h2>
            <p className="modal-subtitle">Directly book and confirm an appointment for a patient</p>
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

          <div className="form-group">
            <label className="form-label" htmlFor="staff-apt-patient-id">
              Patient ID <span className="required-star">*</span>
            </label>
            <input
              id="staff-apt-patient-id"
              type="text"
              className="form-input"
              placeholder="e.g. PAT1001"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="staff-apt-date">
              Date <span className="required-star">*</span>
            </label>
            <input
              id="staff-apt-date"
              type="date"
              className="form-input"
              min={todayStr}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Time Slot <span className="required-star">*</span>
            </label>
            <div className="time-slots-grid">
              {TIME_SLOTS.map((slot) => (
                <button
                  type="button"
                  key={slot}
                  className={`time-slot-pill ${time === slot ? 'selected' : ''}`}
                  onClick={() => setTime(slot)}
                  disabled={submitting}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="staff-apt-reason">
              Reason for Visit
            </label>
            <select
              id="staff-apt-reason"
              className="form-select"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
            >
              {VISIT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="staff-apt-notes">
              Internal Clinical Notes (Optional)
            </label>
            <textarea
              id="staff-apt-notes"
              className="form-textarea"
              rows="2"
              placeholder="Room assignment, doctor details, or preparatory steps…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={submitting}
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
                  <span>Creating…</span>
                </>
              ) : (
                <>
                  <Check size={15} />
                  <span>Create & Confirm Appointment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Modal 3: Staff Suggest Reschedule Modal ──────────────────────── */
function StaffRescheduleModal({ appointment, onClose, onSuccess }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [proposedDate, setProposedDate] = useState(appointment.date || todayStr);
  const [proposedTime, setProposedTime] = useState(appointment.time || TIME_SLOTS[0]);
  const [staffMessage, setStaffMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!proposedDate) {
      setError('Please select a proposed alternative date.');
      return;
    }

    setSubmitting(true);
    try {
      await proposeAppointmentReschedule(appointment._id, {
        proposedDate,
        proposedTime,
        staffMessage: staffMessage.trim(),
      });
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to propose reschedule.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content-md" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Suggest Alternative Time</h2>
            <p className="modal-subtitle">
              Propose a different date/time for Patient {appointment.patientName || appointment.patientId}
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

          <div className="apt-modal-original-box">
            <p>
              <strong>Originally Requested:</strong> {formatDateFull(appointment.date)} at {appointment.time}
            </p>
            {appointment.reason && (
              <p>
                <strong>Reason:</strong> {appointment.reason}
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reschedule-date">
              Suggested New Date <span className="required-star">*</span>
            </label>
            <input
              id="reschedule-date"
              type="date"
              className="form-input"
              min={todayStr}
              value={proposedDate}
              onChange={(e) => setProposedDate(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Suggested Time Slot <span className="required-star">*</span>
            </label>
            <div className="time-slots-grid">
              {TIME_SLOTS.map((slot) => (
                <button
                  type="button"
                  key={slot}
                  className={`time-slot-pill ${proposedTime === slot ? 'selected' : ''}`}
                  onClick={() => setProposedTime(slot)}
                  disabled={submitting}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reschedule-message">
              Message to Patient (Optional)
            </label>
            <textarea
              id="reschedule-message"
              className="form-textarea"
              rows="2"
              placeholder="e.g. Doctor is in surgery during the morning slot, afternoon is available."
              value={staffMessage}
              onChange={(e) => setStaffMessage(e.target.value)}
              disabled={submitting}
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
                  <span>Proposing…</span>
                </>
              ) : (
                <>
                  <Clock size={15} />
                  <span>Propose Reschedule</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Modal 4: Staff Decline Modal ─────────────────────────────────── */
function StaffDeclineModal({ appointment, onClose, onSuccess }) {
  const [reason, setReason] = useState('Requested time slot is unavailable.');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    setSubmitting(true);
    try {
      await declineAppointment(appointment._id, { reason: reason.trim() });
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to decline appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Decline Appointment Request</h2>
            <p className="modal-subtitle">
              Patient: {appointment.patientName || appointment.patientId}
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

          <p className="modal-warning-text">
            This will cancel the pending request and notify the patient with the explanation below.
          </p>

          <div className="form-group">
            <label className="form-label" htmlFor="decline-reason">
              Reason for Declining
            </label>
            <textarea
              id="decline-reason"
              className="form-textarea"
              rows="3"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Back
            </button>
            <button type="submit" className="btn btn-danger" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 size={15} className="login-spinner" />
                  <span>Declining…</span>
                </>
              ) : (
                <>
                  <CalendarX size={15} />
                  <span>Decline Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Modal 5: Patient Counter-Request Time Modal ──────────────────── */
function PatientCounterModal({ appointment, onClose, onSuccess }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState('');
  const [time, setTime] = useState(TIME_SLOTS[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!date) {
      setError('Please choose a preferred alternative date.');
      return;
    }

    setSubmitting(true);
    try {
      await respondAppointmentReschedule(appointment._id, {
        action: 'request_new',
        date,
        time,
        notes: notes.trim(),
      });
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to submit preferred time.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content-md" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Request Another Time</h2>
            <p className="modal-subtitle">Submit your availability for clinic care team review</p>
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

          <div className="form-group">
            <label className="form-label" htmlFor="patient-counter-date">
              Your Preferred Date <span className="required-star">*</span>
            </label>
            <input
              id="patient-counter-date"
              type="date"
              className="form-input"
              min={todayStr}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Your Preferred Time Slot <span className="required-star">*</span>
            </label>
            <div className="time-slots-grid">
              {TIME_SLOTS.map((slot) => (
                <button
                  type="button"
                  key={slot}
                  className={`time-slot-pill ${time === slot ? 'selected' : ''}`}
                  onClick={() => setTime(slot)}
                  disabled={submitting}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="patient-counter-notes">
              Additional Note
            </label>
            <textarea
              id="patient-counter-notes"
              className="form-textarea"
              rows="2"
              placeholder="e.g. I am only free on Friday afternoons…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={submitting}
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
                  <span>Submitting…</span>
                </>
              ) : (
                <>
                  <Check size={15} />
                  <span>Submit Preferred Time</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Date Formatting Helpers ──────────────────────────────────────── */
function formatDateFull(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

