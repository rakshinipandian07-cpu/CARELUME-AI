import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  getPatients,
  getAppointments,
  getDocuments,
  getTickets,
} from '../services/api';
import {
  Users,
  CalendarDays,
  FileText,
  LifeBuoy,
  Clock,
  ArrowRight,
  Search,
  RefreshCw,
  AlertCircle,
  Inbox,
  UserPlus,
} from 'lucide-react';
import './StaffDashboard.css';

export default function StaffDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [data, setData] = useState({
    patients: [],
    appointments: [],
    documents: [],
    tickets: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [patientSearch, setPatientSearch] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [patients, appointments, documents, tickets] = await Promise.all([
        getPatients(),
        getAppointments(),
        getDocuments(),
        getTickets(),
      ]);
      setData({
        patients: patients || [],
        appointments: appointments || [],
        documents: documents || [],
        tickets: tickets || [],
      });
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const todayStr = new Date().toISOString().slice(0, 10);
  const upcomingAppointments = data.appointments
    .filter(
      (a) => a.status === 'Scheduled' && a.date >= todayStr
    )
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .slice(0, 5);

  const pendingDocuments = data.documents.filter(
    (d) => d.status === 'Pending' || d.status === 'Submitted'
  );
  const openTickets = data.tickets.filter((t) => t.status !== 'Resolved');
  const recentTickets = data.tickets.slice(0, 5);

  const filteredPatients = data.patients.filter((p) => {
    const q = patientSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.patientId.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="staff-dashboard animate-fade-in">
        <div className="page-header">
          <div className="skeleton skeleton-text" style={{ width: '260px', height: '24px' }} />
          <div className="skeleton skeleton-text short" style={{ marginTop: '8px' }} />
        </div>
        <div className="summary-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton skeleton-card" />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="skeleton" style={{ height: '240px', borderRadius: '14px' }} />
          <div className="skeleton" style={{ height: '240px', borderRadius: '14px' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="staff-dashboard animate-fade-in">
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

  return (
    <div className="staff-dashboard animate-fade-in">
      <div className="page-header">
        <h1>{t('staffWelcome', 'Welcome back')}, {user?.name?.split(' ')[0] || 'Staff'}</h1>
        <p>{t('staffSubtitle', "Here's what's happening at the clinic today.")}</p>
      </div>

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-card-icon teal">
            <Users size={20} />
          </div>
          <div className="summary-card-content">
            <h3>{data.patients.length}</h3>
            <p>{t('totalPatients', 'Total Patients')}</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-card-icon lavender">
            <CalendarDays size={20} />
          </div>
          <div className="summary-card-content">
            <h3>{upcomingAppointments.length}</h3>
            <p>{t('upcomingAppointments', 'Upcoming Appointments')}</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-card-icon peach">
            <FileText size={20} />
          </div>
          <div className="summary-card-content">
            <h3>{pendingDocuments.length}</h3>
            <p>{t('pendingDocuments', 'Pending Documents')}</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-card-icon sage">
            <LifeBuoy size={20} />
          </div>
          <div className="summary-card-content">
            <h3>{openTickets.length}</h3>
            <p>{t('openTickets', 'Open Tickets')}</p>
          </div>
        </div>
      </div>

      {/* Two-column sections */}
      <div className="staff-grid">
        {/* Upcoming Appointments */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">{t('upcomingAppointments', 'Upcoming Appointments')}</h2>
            <Link to="/staff/appointments" className="btn btn-ghost btn-sm">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {upcomingAppointments.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 16px' }}>
              <div className="empty-state-icon"><CalendarDays size={22} /></div>
              <h3>No upcoming appointments</h3>
              <p>All scheduled appointments are complete.</p>
            </div>
          ) : (
            <div className="staff-list">
              {upcomingAppointments.map((apt) => (
                <div key={apt._id} className="staff-list-item">
                  <div className="staff-list-icon">
                    <Clock size={14} />
                  </div>
                  <div className="staff-list-content">
                    <span className="staff-list-primary">{apt.patientId}</span>
                    <span className="staff-list-secondary">
                      {formatDate(apt.date)} at {apt.time}
                    </span>
                  </div>
                  <span className="badge badge-scheduled">Scheduled</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Support Tickets */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">{t('ticketsTitle', 'Recent Support Tickets')}</h2>
            <Link to="/staff/tickets" className="btn btn-ghost btn-sm">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {recentTickets.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 16px' }}>
              <div className="empty-state-icon"><Inbox size={22} /></div>
              <h3>No support tickets</h3>
              <p>No tickets have been created yet.</p>
            </div>
          ) : (
            <div className="staff-list">
              {recentTickets.map((ticket) => (
                <div key={ticket._id} className="staff-list-item">
                  <div className="staff-list-content" style={{ flex: 1 }}>
                    <span className="staff-list-primary staff-list-question">
                      {ticket.question}
                    </span>
                    <span className="staff-list-secondary">
                      {ticket.patientId || 'Unknown'} · {formatDateShort(ticket.createdAt)}
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
      </div>

      {/* Patient Directory */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <h2 className="card-title">{t('patientDirectory', 'Patient Directory')}</h2>
          <div className="staff-search-wrapper">
            <Search size={14} className="staff-search-icon" />
            <input
              type="text"
              className="form-input staff-search-input"
              placeholder="Search patients…"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              aria-label="Search patients"
            />
          </div>
        </div>
        {filteredPatients.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 16px' }}>
            <div className="empty-state-icon"><Users size={22} /></div>
            <h3>{patientSearch ? 'No patients found' : 'No patients'}</h3>
            <p>{patientSearch ? 'Try a different search term.' : 'Patient records will appear here.'}</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('patientIdLabel', 'Patient ID')}</th>
                  <th>{t('patientName', 'Name')}</th>
                  <th>{t('treatmentStage', 'Treatment Stage')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <code style={{ fontSize: '0.8125rem', background: 'var(--cl-neutral-100)', padding: '2px 8px', borderRadius: '4px' }}>
                        {p.patientId}
                      </code>
                    </td>
                    <td style={{ fontWeight: 500, color: 'var(--cl-neutral-800)' }}>{p.name}</td>
                    <td>
                      <span className={`badge badge-${p.treatmentStage?.toLowerCase()}`}>
                        {p.treatmentStage}
                      </span>
                    </td>
                    <td>
                      <Link
                        to={`/staff/patients/${p.patientId}`}
                        className="btn btn-ghost btn-sm"
                      >
                        {t('view', 'View')} <ArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="staff-quick-actions">
        <Link to="/staff/patients" className="staff-quick-action">
          <UserPlus size={18} />
          <span>{t('registerPatient', 'Register Patient')}</span>
        </Link>
        <Link to="/staff/appointments" className="staff-quick-action">
          <CalendarDays size={18} />
          <span>{t('scheduleAppointment', 'Schedule Appointment')}</span>
        </Link>
        <Link to="/staff/documents" className="staff-quick-action">
          <FileText size={18} />
          <span>{t('reviewDocuments', 'Review Documents')}</span>
        </Link>
        <Link to="/staff/chat" className="staff-quick-action">
          <LifeBuoy size={18} />
          <span>{t('aiAssistant', 'AI Assistant')}</span>
        </Link>
      </div>
    </div>
  );
}

function formatDate(dateStr) {
  try {
    const date = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
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
