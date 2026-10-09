import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import {
  getPatients,
  registerPatientInvitation,
  reissueInvitation,
  getInvitations,
  revokeInvitation,
} from '../services/api';
import {
  Users,
  Search,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  UserPlus,
  Calendar,
  X,
  CheckCircle2,
  Copy,
  Mail,
  Loader2,
  Ban,
  Send,
  Link as LinkIcon,
  ShieldCheck,
} from 'lucide-react';
import './Patients.css';

const STAGES = [
  'All',
  'Consultation',
  'Testing',
  'Stimulation',
  'Retrieval',
  'Transfer',
  'Monitoring',
  'Completed',
];

export default function Patients() {
  const { t } = useLanguage();
  const [patients, setPatients] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('All');

  // Registration modal state
  const [showRegModal, setShowRegModal] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regStage, setRegStage] = useState('Consultation');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const [createdInvite, setCreatedInvite] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Action feedback
  const [actionNotice, setActionNotice] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [patientsData, invitationsData] = await Promise.all([
        getPatients(),
        getInvitations(),
      ]);
      setPatients(patientsData || []);
      setInvitations(invitationsData || []);
    } catch (err) {
      setError(err.message || 'Failed to load patients data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRegisterPatient = async (e) => {
    e.preventDefault();
    setRegError('');
    setRegLoading(true);

    const name = regName.trim();
    const email = regEmail.trim();

    if (!name || !email) {
      setRegError('Please provide both patient name and registered email.');
      setRegLoading(false);
      return;
    }

    try {
      const result = await registerPatientInvitation({
        name,
        email,
        treatmentStage: regStage,
      });

      setCreatedInvite(result.invitation);
      fetchData();
    } catch (err) {
      setRegError(err.message || 'Failed to register patient and create invitation.');
    } finally {
      setRegLoading(false);
    }
  };

  const getInviteUrl = (token) => {
    return `${window.location.origin}/activate-account?token=${encodeURIComponent(token)}`;
  };

  const handleCopyInviteLink = (token, patientId, email) => {
    const inviteLink = getInviteUrl(token);
    const fullText = `CareLume AI Patient Portal Invitation\nPatient ID: ${patientId}\nEmail: ${email}\nActivation Link: ${inviteLink}`;
    navigator.clipboard.writeText(fullText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  const handleReissue = async (patientId, email) => {
    try {
      const res = await reissueInvitation(patientId, email);
      setCreatedInvite(res.invitation);
      setShowRegModal(true);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to reissue invitation');
    }
  };

  const handleRevoke = async (inviteId) => {
    if (!window.confirm('Are you sure you want to revoke this invitation?')) return;
    try {
      await revokeInvitation(inviteId);
      setActionNotice('Invitation revoked successfully.');
      setTimeout(() => setActionNotice(''), 3000);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to revoke invitation');
    }
  };

  const filteredPatients = patients.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.patientId && p.patientId.toLowerCase().includes(q)) ||
      (p.email && p.email.toLowerCase().includes(q));
    const matchesStage =
      stageFilter === 'All' ||
      (p.treatmentStage && p.treatmentStage.toLowerCase() === stageFilter.toLowerCase());
    return matchesSearch && matchesStage;
  });

  return (
    <div className="patients-page animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1>{t('patientDirectory', 'Patient Directory')}</h1>
          <p>{t('patientDirectorySub', 'View and manage all registered fertility clinic patients and access status')}</p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => {
            setShowRegModal(true);
            setCreatedInvite(null);
            setRegName('');
            setRegEmail('');
            setRegError('');
          }}
        >
          <UserPlus size={16} />
          <span>{t('registerNewPatient', 'Register New Patient')}</span>
        </button>
      </div>

      {actionNotice && (
        <div className="login-success animate-fade-in">
          <CheckCircle2 size={16} />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Filters */}
      {!loading && !error && (
        <div className="patients-filters">
          <div className="patients-search-wrapper">
            <Search size={14} className="patients-search-icon" />
            <input
              type="text"
              className="form-input patients-search-input"
              placeholder="Search by name, Patient ID (e.g., PAT1001), or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search patients"
            />
          </div>

          <div className="patients-stage-filters">
            {STAGES.map((s) => {
              const count =
                s === 'All'
                  ? patients.length
                  : patients.filter(
                      (p) => p.treatmentStage?.toLowerCase() === s.toLowerCase()
                    ).length;
              return (
                <button
                  key={s}
                  className={`patients-filter-btn ${
                    stageFilter === s ? 'active' : ''
                  }`}
                  onClick={() => setStageFilter(s)}
                >
                  {s} ({count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-center">
          <div className="spinner spinner-lg" />
        </div>
      ) : error ? (
        <div className="error-state">
          <div className="error-state-icon">
            <AlertCircle size={24} />
          </div>
          <h3>Unable to load patients</h3>
          <p>{error}</p>
          <button className="btn btn-primary btn-sm" onClick={fetchData}>
            <RefreshCw size={14} /> Try again
          </button>
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <Users size={22} />
            </div>
            <h3>{t('noPatientsFound', 'No patients found')}</h3>
            <p>
              {search || stageFilter !== 'All'
                ? 'Try adjusting your search criteria or filter.'
                : 'No patient records exist yet.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('patientIdLabel', 'Patient ID')}</th>
                  <th>{t('patientName', 'Patient Name')}</th>
                  <th>{t('registeredEmail', 'Email Address')}</th>
                  <th>{t('treatmentStage', 'Treatment Stage')}</th>
                  <th>Account Status</th>
                  <th>{t('registeredOn', 'Registered')}</th>
                  <th>{t('actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <span className="patient-id-tag">{p.patientId}</span>
                    </td>
                    <td>
                      <div className="patient-cell-name">
                        <div className="patient-avatar-circle">
                          {p.name?.charAt(0) || 'P'}
                        </div>
                        <span className="patient-full-name">{p.name}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--cl-neutral-600)' }}>
                        <Mail size={13} className="text-muted" />
                        <span>{p.email || '—'}</span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge badge-${p.treatmentStage?.toLowerCase() || 'consultation'}`}
                      >
                        {p.treatmentStage}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge badge-${
                          p.accountStatus === 'Active'
                            ? 'approved'
                            : p.accountStatus === 'Invitation Pending'
                            ? 'scheduled'
                            : 'cancelled'
                        }`}
                      >
                        {p.accountStatus || 'Active'}
                      </span>
                    </td>
                    <td>
                      <span className="patient-cell-date">
                        <Calendar size={12} />
                        {formatDate(p.createdAt)}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Link
                          to={`/staff/patients/${p.patientId}`}
                          className="btn btn-ghost btn-sm"
                        >
                          {t('viewDetails', 'View')} <ArrowRight size={14} />
                        </Link>
                        {p.accountStatus !== 'Active' && (
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => handleReissue(p.patientId, p.email)}
                            title="Generate new invitation link"
                          >
                            <Send size={12} /> Reissue
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Registration / Reissue Modal Dialog */}
      {showRegModal && (
        <div className="modal-backdrop">
          <div className="modal-card card animate-scale-in">
            <div className="modal-header">
              <h3>
                {createdInvite ? 'Patient Invitation Link Ready' : t('registerNewPatient', 'Register New Patient')}
              </h3>
              <button
                className="btn-icon btn-ghost"
                onClick={() => setShowRegModal(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {createdInvite ? (
              <div className="modal-body">
                <div className="invite-success-box">
                  <CheckCircle2 size={36} className="text-sage" />
                  <h4>Invitation Link Generated</h4>
                  <p>Share this secure single-use invitation link with the patient (valid for 48 hours):</p>
                  
                  <div className="invite-details-card">
                    <div className="detail-row">
                      <span>Patient ID:</span>
                      <strong style={{ fontSize: '1.15rem', color: 'var(--cl-teal-700)' }}>
                        {createdInvite.patientId}
                      </strong>
                    </div>
                    <div className="detail-row">
                      <span>Registered Email:</span>
                      <span>{createdInvite.email}</span>
                    </div>
                    <div className="detail-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
                      <span style={{ fontWeight: 600 }}>Activation Link:</span>
                      <input
                        type="text"
                        className="form-input"
                        style={{ fontSize: '0.8125rem', width: '100%', background: 'var(--cl-white)' }}
                        readOnly
                        value={getInviteUrl(createdInvite.token)}
                      />
                    </div>
                  </div>

                  <div className="activation-instruction-box">
                    <ShieldCheck size={18} className="text-teal" />
                    <p style={{ fontSize: '0.8125rem', margin: 0 }}>
                      The patient can click this link to verify their details, set a password, and access their fertility dashboard.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                    <button
                      className="btn btn-primary btn-full"
                      onClick={() => handleCopyInviteLink(createdInvite.token, createdInvite.patientId, createdInvite.email)}
                    >
                      <Copy size={16} />
                      <span>{copySuccess ? 'Copied Invitation Link!' : 'Copy Invitation Link'}</span>
                    </button>
                    <button
                      className="btn btn-outline btn-full"
                      onClick={() => setShowRegModal(false)}
                    >
                      <span>Done</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRegisterPatient} className="modal-body">
                {regError && (
                  <div className="login-error">
                    <AlertCircle size={16} />
                    <span>{regError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="reg-name">
                    {t('patientName', 'Patient Full Name')} *
                  </label>
                  <input
                    id="reg-name"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Ananya Iyer"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="reg-email">
                    {t('registeredEmail', 'Registered Email Address')} *
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    className="form-input"
                    placeholder="e.g. ananya@example.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="reg-stage">
                    {t('treatmentStage', 'Initial Treatment Stage')}
                  </label>
                  <select
                    id="reg-stage"
                    className="form-select"
                    value={regStage}
                    onChange={(e) => setRegStage(e.target.value)}
                  >
                    {STAGES.filter((s) => s !== 'All').map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setShowRegModal(false)}
                  >
                    {t('cancel', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={regLoading}
                  >
                    {regLoading ? (
                      <>
                        <Loader2 size={16} className="login-spinner" />
                        <span>Generating Invitation…</span>
                      </>
                    ) : (
                      <span>Register & Create Invitation</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}
