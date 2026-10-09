import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getPatient,
  getAppointments,
  getDocuments,
  getTickets,
  updateDocumentStatus,
  updateTicketStatus,
} from '../services/api';
import {
  ArrowLeft,
  User,
  Calendar,
  Clock,
  FileText,
  LifeBuoy,
  CheckCircle2,
  CircleDot,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ChevronRight,
  MessageCircle,
} from 'lucide-react';
import './PatientDetail.css';

const TREATMENT_STAGES = [
  'Consultation',
  'Testing',
  'Stimulation',
  'Retrieval',
  'Transfer',
  'Monitoring',
  'Completed',
];

export default function PatientDetail() {
  const { id: patientId } = useParams();
  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const fetchPatientData = async () => {
    setLoading(true);
    setError('');
    try {
      const [patientData, allAppointments, allDocuments, allTickets] =
        await Promise.all([
          getPatient(patientId),
          getAppointments(),
          getDocuments(),
          getTickets(),
        ]);

      setPatient(patientData);
      setAppointments(
        allAppointments.filter((a) => a.patientId === patientId)
      );
      setDocuments(allDocuments.filter((d) => d.patientId === patientId));
      setTickets(allTickets.filter((t) => t.patientId === patientId));
    } catch (err) {
      setError(err.message || 'Failed to load patient records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      fetchPatientData();
    }
  }, [patientId]);

  if (loading) {
    return (
      <div className="patient-detail-page animate-fade-in">
        <div className="skeleton skeleton-text" style={{ width: '150px', height: '20px', marginBottom: '16px' }} />
        <div className="skeleton" style={{ height: '140px', borderRadius: '16px', marginBottom: '24px' }} />
        <div className="skeleton" style={{ height: '300px', borderRadius: '16px' }} />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="patient-detail-page animate-fade-in">
        <Link to="/staff/patients" className="btn btn-ghost btn-sm" style={{ marginBottom: '16px' }}>
          <ArrowLeft size={16} /> Back to Directory
        </Link>
        <div className="error-state">
          <div className="error-state-icon">
            <AlertCircle size={24} />
          </div>
          <h3>Unable to load patient</h3>
          <p>{error || 'Patient record not found.'}</p>
          <button className="btn btn-primary btn-sm" onClick={fetchPatientData}>
            <RefreshCw size={14} /> Try again
          </button>
        </div>
      </div>
    );
  }

  const currentStageIndex = TREATMENT_STAGES.findIndex(
    (s) => s.toLowerCase() === patient.treatmentStage.toLowerCase()
  );

  return (
    <div className="patient-detail-page animate-fade-in">
      <div className="patient-detail-header-nav">
        <Link to="/staff/patients" className="btn btn-ghost btn-sm">
          <ArrowLeft size={16} /> Back to Patients
        </Link>
      </div>

      {/* Patient Profile Card */}
      <div className="card patient-profile-card">
        <div className="patient-profile-top">
          <div className="patient-profile-avatar">
            {patient.name.charAt(0)}
          </div>
          <div className="patient-profile-info">
            <div className="patient-profile-title-row">
              <h2>{patient.name}</h2>
              <span className="patient-id-tag">{patient.patientId}</span>
              <span
                className={`badge badge-${patient.treatmentStage.toLowerCase()}`}
              >
                {patient.treatmentStage}
              </span>
            </div>
            <p className="patient-profile-meta">
              Registered on {formatDateLong(patient.createdAt)}
            </p>
          </div>
          <div className="patient-profile-actions">
            <Link
              to={`/staff/chat?patient=${patient.patientId}`}
              className="btn btn-secondary btn-sm"
            >
              <Sparkles size={14} /> AI Context
            </Link>
          </div>
        </div>

        {/* Treatment Stage Stepper */}
        <div className="treatment-stepper">
          <h4 className="stepper-title">Treatment Progression</h4>
          <div className="stepper-track">
            {TREATMENT_STAGES.map((stage, idx) => {
              const isPast = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              return (
                <div
                  key={stage}
                  className={`stepper-step ${
                    isPast ? 'is-past' : isCurrent ? 'is-current' : 'is-future'
                  }`}
                >
                  <div className="stepper-indicator">
                    {isPast ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </div>
                  <span className="stepper-label">{stage}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Controls */}
      <div className="patient-tabs">
        <button
          className={`patient-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`patient-tab ${activeTab === 'appointments' ? 'active' : ''}`}
          onClick={() => setActiveTab('appointments')}
        >
          Appointments ({appointments.length})
        </button>
        <button
          className={`patient-tab ${activeTab === 'documents' ? 'active' : ''}`}
          onClick={() => setActiveTab('documents')}
        >
          Documents ({documents.length})
        </button>
        <button
          className={`patient-tab ${activeTab === 'tickets' ? 'active' : ''}`}
          onClick={() => setActiveTab('tickets')}
        >
          Support Tickets ({tickets.length})
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div className="patient-detail-grid">
          {/* Quick stats / summary */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Recent Activity</h3>
            </div>
            <div className="patient-overview-summary">
              <div className="summary-item">
                <Calendar size={18} className="text-teal" />
                <div>
                  <strong>{appointments.length} Total Appointments</strong>
                  <span>
                    {appointments.filter((a) => a.status === 'Scheduled').length} upcoming
                  </span>
                </div>
              </div>
              <div className="summary-item">
                <FileText size={18} className="text-lavender" />
                <div>
                  <strong>{documents.length} Required Documents</strong>
                  <span>
                    {documents.filter((d) => d.status === 'Approved').length} approved
                  </span>
                </div>
              </div>
              <div className="summary-item">
                <LifeBuoy size={18} className="text-peach" />
                <div>
                  <strong>{tickets.length} Support Tickets</strong>
                  <span>
                    {tickets.filter((t) => t.status !== 'Resolved').length} unresolved
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Schedule */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Next Scheduled Appointment</h3>
            </div>
            {appointments.length === 0 ? (
              <p className="empty-notice">No appointments found for this patient.</p>
            ) : (
              <div className="patient-appointment-preview">
                {appointments.slice(0, 2).map((apt) => (
                  <div key={apt._id} className="apt-preview-row">
                    <Clock size={16} />
                    <div>
                      <strong>{formatDateLong(apt.date)}</strong>
                      <span>{apt.time}</span>
                    </div>
                    <span className={`badge badge-${apt.status.toLowerCase()}`}>
                      {apt.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'appointments' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Patient Appointments</h3>
          </div>
          {appointments.length === 0 ? (
            <p className="empty-notice">No appointments recorded.</p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((apt) => (
                    <tr key={apt._id}>
                      <td>{formatDateLong(apt.date)}</td>
                      <td>{apt.time}</td>
                      <td>
                        <span className={`badge badge-${apt.status.toLowerCase()}`}>
                          {apt.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Patient Documents</h3>
          </div>
          {documents.length === 0 ? (
            <p className="empty-notice">No documents assigned.</p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Document Name</th>
                    <th>Status</th>
                    <th>Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc._id}>
                      <td style={{ fontWeight: 500 }}>{doc.name}</td>
                      <td>
                        <span className={`badge badge-${doc.status.toLowerCase()}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td>{formatDateLong(doc.updatedAt || doc.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'tickets' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Support Inquiries</h3>
          </div>
          {tickets.length === 0 ? (
            <p className="empty-notice">No support tickets submitted.</p>
          ) : (
            <div className="patient-ticket-list-detail">
              {tickets.map((t) => (
                <div key={t._id} className="patient-ticket-card-item">
                  <div className="ticket-card-header">
                    <span className="ticket-question-text">{t.question}</span>
                    <span className={`badge badge-${t.status.toLowerCase().replace(/\s+/g, '-')}`}>
                      {t.status}
                    </span>
                  </div>
                  <div className="ticket-card-footer">
                    <span>Submitted: {formatDateLong(t.createdAt)}</span>
                    <span>Assigned: {t.assignedTo}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatDateLong(dateStr) {
  if (!dateStr) return 'N/A';
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
