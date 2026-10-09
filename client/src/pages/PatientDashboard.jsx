import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  getPatient,
  getAppointments,
  getDocuments,
  getTickets,
} from '../services/api';
import {
  CalendarDays,
  FileText,
  LifeBuoy,
  Clock,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  CircleDot,
  Sparkles,
  Upload,
} from 'lucide-react';
import './PatientDashboard.css';

export default function PatientDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const results = await Promise.all([
        user?.patientId ? getPatient(user.patientId) : Promise.resolve(null),
        getAppointments(),
        getDocuments(),
        getTickets(),
      ]);
      setPatient(results[0]);
      setAppointments(results[1] || []);
      setDocuments(results[2] || []);
      setTickets(results[3] || []);
    } catch (err) {
      setError(err.message || 'Failed to load your dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="patient-dashboard animate-fade-in">
        <div className="page-header">
          <div className="skeleton skeleton-text" style={{ width: '280px', height: '24px' }} />
          <div className="skeleton skeleton-text short" style={{ marginTop: '8px' }} />
        </div>
        <div className="summary-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton skeleton-card" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="patient-dashboard animate-fade-in">
        <div className="error-state">
          <div className="error-state-icon"><AlertCircle size={24} /></div>
          <h3>Unable to load dashboard</h3>
          <p>{error}</p>
          <button className="btn btn-primary btn-sm" onClick={fetchAll}>
            <RefreshCw size={14} /> Try again
          </button>
        </div>
      </div>
    );
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  
  // Confirmed upcoming appointment
  const nextConfirmed = appointments
    .filter((a) => (a.status === 'Confirmed' || a.status === 'Scheduled') && a.date >= todayStr)
    .sort((a, b) => (a.date > b.date ? 1 : -1))[0];

  // Pending appointment requests or proposed reschedules
  const pendingRequests = appointments.filter((a) => a.status === 'Pending Approval');
  const proposedReschedules = appointments.filter((a) => a.status === 'Reschedule Proposed');

  const totalDocs = documents.length;
  const approvedDocs = documents.filter((d) => d.status === 'Approved').length;
  const submittedDocs = documents.filter((d) => d.status === 'Submitted').length;
  const docProgress = totalDocs > 0 ? Math.round(((approvedDocs + submittedDocs) / totalDocs) * 100) : 0;

  const recentTickets = tickets.slice(0, 3);

  return (
    <div className="patient-dashboard animate-fade-in">
      {/* Welcome Header */}
      <div className="patient-welcome">
        <div className="patient-welcome-text">
          <h1>{t('patientWelcome', 'Welcome')}, {user?.name?.split(' ')[0] || 'Patient'}</h1>
          <p>{t('patientSubtitle', "Here's an overview of your fertility care journey.")}</p>
        </div>
        <div className="patient-welcome-actions">
          <Link to="/patient/appointments" className="btn btn-primary btn-sm">
            <CalendarDays size={14} />
            <span>Book Appointment</span>
          </Link>
          <Link to="/patient/tickets" className="btn btn-secondary btn-sm">
            <LifeBuoy size={14} />
            <span>Contact Support</span>
          </Link>
          {patient && (
            <div className="patient-id-badge">
              <CircleDot size={14} />
              <span>{patient.patientId}</span>
              <span className={`badge badge-${patient.treatmentStage?.toLowerCase()}`}>
                {patient.treatmentStage}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action Banner: Proposed Reschedule from Clinic */}
      {proposedReschedules.length > 0 && (
        <div className="patient-alert-banner alert-banner-info animate-fade-in">
          <div className="banner-content">
            <AlertCircle size={18} className="banner-icon" />
            <div>
              <strong>Clinic Reschedule Proposed</strong>
              <p>
                The care team suggested a new time for your appointment on{' '}
                {formatDate(proposedReschedules[0].proposedDate || proposedReschedules[0].date)} at{' '}
                {proposedReschedules[0].proposedTime}.
              </p>
            </div>
          </div>
          <Link to="/patient/appointments" className="btn btn-primary btn-sm">
            <span>Review & Respond</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Summary Cards */}
      <div className="summary-grid">
        {/* Next Appointment */}
        <div className="summary-card">
          <div className="summary-card-icon lavender">
            <CalendarDays size={20} />
          </div>
          <div className="summary-card-content">
            {nextConfirmed ? (
              <>
                <h3>{formatDate(nextConfirmed.date)}</h3>
                <p>{nextConfirmed.time} — {t('nextAppointment', 'Confirmed Visit')}</p>
              </>
            ) : pendingRequests.length > 0 ? (
              <>
                <h3>Pending</h3>
                <p>{pendingRequests.length} request awaiting review</p>
              </>
            ) : (
              <>
                <h3>—</h3>
                <p>{t('noUpcomingAppointments', 'No upcoming appointments')}</p>
              </>
            )}
          </div>
        </div>

        {/* Document Progress */}
        <div className="summary-card">
          <div className="summary-card-icon peach">
            <FileText size={20} />
          </div>
          <div className="summary-card-content">
            <h3>{docProgress}%</h3>
            <p>{approvedDocs + submittedDocs} of {totalDocs} {t('documentsSummary', 'documents submitted')}</p>
          </div>
        </div>

        {/* Tickets */}
        <div className="summary-card">
          <div className="summary-card-icon sage">
            <LifeBuoy size={20} />
          </div>
          <div className="summary-card-content">
            <h3>{tickets.filter((t) => t.status !== 'Resolved').length}</h3>
            <p>{t('openTickets', 'Open support tickets')}</p>
          </div>
        </div>
      </div>

      <div className="patient-grid">
        {/* Next Appointment Card */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">{t('nextAppointment', 'Appointments')}</h2>
            <Link to="/patient/appointments" className="btn btn-ghost btn-sm">
              All appointments <ArrowRight size={14} />
            </Link>
          </div>
          {nextConfirmed ? (
            <div className="patient-appointment-card">
              <div className="patient-appointment-date">
                <Clock size={16} />
                <div>
                  <strong>{formatDateLong(nextConfirmed.date)}</strong>
                  <span>{nextConfirmed.time} {nextConfirmed.reason ? `· ${nextConfirmed.reason}` : ''}</span>
                </div>
              </div>
              <span className="badge badge-completed">Confirmed</span>
            </div>
          ) : pendingRequests.length > 0 ? (
            <div className="patient-appointment-card" style={{ background: '#fffdf5', border: '1px solid #fde68a' }}>
              <div className="patient-appointment-date">
                <Clock size={16} style={{ color: '#d97706' }} />
                <div>
                  <strong>{formatDateLong(pendingRequests[0].date)}</strong>
                  <span>{pendingRequests[0].time} · Pending clinic approval</span>
                </div>
              </div>
              <span className="badge badge-pending">Pending Approval</span>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '24px 16px' }}>
              <div className="empty-state-icon"><CalendarDays size={22} /></div>
              <p>{t('noUpcomingAppointments', 'No upcoming appointments scheduled.')}</p>
              <Link to="/patient/appointments" className="btn btn-primary btn-sm" style={{ marginTop: '10px' }}>
                Book an Appointment
              </Link>
            </div>
          )}
        </div>

        {/* Document Progress */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">{t('navDocuments', 'Documents')}</h2>
            <Link to="/patient/documents" className="btn btn-ghost btn-sm">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {totalDocs === 0 ? (
            <div className="empty-state" style={{ padding: '24px 16px' }}>
              <div className="empty-state-icon"><FileText size={22} /></div>
              <p>No documents assigned yet.</p>
            </div>
          ) : (
            <div className="patient-doc-progress">
              <div className="patient-doc-bar">
                <div
                  className="patient-doc-bar-fill"
                  style={{ width: `${docProgress}%` }}
                />
              </div>
              <div className="patient-doc-list">
                {documents.slice(0, 4).map((doc) => (
                  <div key={doc._id} className="patient-doc-item">
                    {doc.status === 'Approved' ? (
                      <CheckCircle2 size={14} className="patient-doc-icon-done" />
                    ) : doc.status === 'Submitted' ? (
                      <CheckCircle2 size={14} className="patient-doc-icon-submitted" />
                    ) : (
                      <CircleDot size={14} className="patient-doc-icon-pending" />
                    )}
                    <span className="patient-doc-name">{doc.name}</span>
                    <span className={`badge badge-${doc.status.toLowerCase()}`}>
                      {t(`status${doc.status}`, doc.status)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Tickets */}
      <div className="card" style={{ marginTop: '16px' }}>
        <div className="card-header">
          <h2 className="card-title">{t('ticketsTitle', 'Support & Inquiries')}</h2>
          <Link to="/patient/tickets" className="btn btn-ghost btn-sm">
            View all / Contact support <ArrowRight size={14} />
          </Link>
        </div>
        {recentTickets.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px 16px' }}>
            <p>No open support tickets. Need help with appointments, documents, or protocols?</p>
            <Link to="/patient/tickets" className="btn btn-secondary btn-sm" style={{ marginTop: '8px' }}>
              Contact Clinic Support
            </Link>
          </div>
        ) : (
          <div className="patient-ticket-list">
            {recentTickets.map((ticket) => (
              <div key={ticket._id} className="patient-ticket-item">
                <div className="patient-ticket-info">
                  <span className="patient-ticket-question">{ticket.subject || ticket.question}</span>
                  <span className="patient-ticket-meta">
                    {formatDateShort(ticket.createdAt)} {ticket.category ? `· ${ticket.category}` : ''} · {ticket.messages?.length || 1} msg
                  </span>
                </div>
                <span className={`badge badge-${ticket.status.toLowerCase().replace(/\s+/g, '-')}`}>
                  {ticket.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="patient-quick-links">
        <Link to="/patient/appointments" className="patient-quick-link">
          <CalendarDays size={18} />
          <span>{t('myAppointmentsTitle', 'My Appointments')}</span>
        </Link>
        <Link to="/patient/documents" className="patient-quick-link">
          <Upload size={18} />
          <span>{t('uploadDocument', 'Upload Documents')}</span>
        </Link>
        <Link to="/patient/tickets" className="patient-quick-link">
          <LifeBuoy size={18} />
          <span>Contact Clinic Support</span>
        </Link>
        <Link to="/patient/chat" className="patient-quick-link patient-quick-link-accent">
          <Sparkles size={18} />
          <span>{t('aiAssistant', 'Ask AI Assistant')}</span>
        </Link>
      </div>
    </div>
  );
}

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatDateLong(dateStr) {
  try {
    const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatDateShort(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}
