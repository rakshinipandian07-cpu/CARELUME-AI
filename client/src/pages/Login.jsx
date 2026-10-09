import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Mail,
  Lock,
  User,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  HelpCircle,
  Users,
  Stethoscope,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import Logo from '../components/Logo';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { login, isAuthenticated, user } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const urlTab = searchParams.get('tab') || '';
  const initialMode = urlTab === 'staff' ? 'staff' : 'patient';

  // Mode: ONLY 'patient' or 'staff'
  const [mode, setMode] = useState(initialMode);

  // Patient Login state
  const [patientIdInput, setPatientIdInput] = useState('');
  const [patientPassword, setPatientPassword] = useState('');
  const [showPatientPassword, setShowPatientPassword] = useState(false);

  // Staff Login state
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [showStaffPassword, setShowStaffPassword] = useState(false);

  // Global UI status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  // If already authenticated and visiting /login, redirect to their role dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(user.role === 'staff' ? '/staff' : '/patient', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // Sync tab with URL
  useEffect(() => {
    if (urlTab === 'staff') {
      setMode('staff');
    } else {
      setMode('patient');
    }
  }, [urlTab]);

  // Handle Patient Sign In (Patient ID / Email + Password)
  const handlePatientLogin = async (e) => {
    e.preventDefault();
    setError('');

    const patientIdOrEmail = patientIdInput.trim();
    const password = patientPassword;

    if (!patientIdOrEmail || !password) {
      setError('Please enter both your Patient ID (e.g. PAT1001) and password.');
      return;
    }

    setLoading(true);

    try {
      const loggedUser = await login({ identifier: patientIdOrEmail, password });
      if (loggedUser?.languagePreference) {
        setLanguage(loggedUser.languagePreference);
      }
      navigate(loggedUser?.role === 'staff' ? '/staff' : '/patient', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid Patient ID or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Staff Sign In (Email + Password)
  const handleStaffLogin = async (e) => {
    e.preventDefault();
    setError('');

    const email = staffEmail.trim();
    const password = staffPassword;

    if (!email || !password) {
      setError('Please enter your staff email address and password.');
      return;
    }

    setLoading(true);

    try {
      const loggedUser = await login({ email, password });
      if (loggedUser?.languagePreference) {
        setLanguage(loggedUser.languagePreference);
      }
      navigate('/staff', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid staff credentials. Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Background ambient accents */}
      <div className="login-bg-glow login-bg-glow-1" />
      <div className="login-bg-glow login-bg-glow-2" />

      {/* Top Bar with Home Link */}
      <div className="login-top-bar">
        <Link to="/" className="btn btn-ghost btn-sm login-back-home">
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </Link>
      </div>

      <div className="login-container animate-fade-in">
        {/* Brand Header */}
        <div className="login-brand">
          <Link to="/" className="login-logo-link">
            <Logo size={52} />
          </Link>
          <h1 className="login-brand-name">
            CareLume <span className="brand-accent">AI</span>
          </h1>
          <p className="login-brand-sub">Fertility Clinic Platform</p>
        </div>

        {/* Main Card */}
        <div className="login-card card">
          {/* Mode Switcher: ONLY Patient Login & Staff Portal */}
          <div className="login-mode-tabs" role="tablist" aria-label="Login Options">
            <button
              type="button"
              className={`login-mode-tab ${mode === 'patient' ? 'active' : ''}`}
              onClick={() => {
                setMode('patient');
                setError('');
                setSearchParams({ tab: 'patient' });
              }}
            >
              <Users size={16} />
              <span>Patient Login</span>
            </button>

            <button
              type="button"
              className={`login-mode-tab ${mode === 'staff' ? 'active' : ''}`}
              onClick={() => {
                setMode('staff');
                setError('');
                setSearchParams({ tab: 'staff' });
              }}
            >
              <Stethoscope size={16} />
              <span>Staff Portal</span>
            </button>
          </div>

          <div className="login-card-header">
            <h2>{mode === 'patient' ? 'Patient Sign In' : 'Staff Portal Login'}</h2>
            <p>
              {mode === 'patient'
                ? 'Enter your Patient ID (e.g. PAT1001) and password to access your fertility care records.'
                : 'Sign in with your authorized clinic staff credentials.'}
            </p>
          </div>

          {error && (
            <div className="login-error animate-fade-in" role="alert">
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{error}</span>
            </div>
          )}

          {/* ── Form 1: Patient Sign In ─────────────────────────── */}
          {mode === 'patient' && (
            <form onSubmit={handlePatientLogin} className="login-form animate-fade-in">
              <div className="form-group">
                <label className="form-label" htmlFor="patient-id-input">
                  Patient ID / Registered Email
                </label>
                <div className="input-with-icon">
                  <User size={16} className="input-icon" />
                  <input
                    id="patient-id-input"
                    type="text"
                    className="form-input"
                    placeholder="e.g. PAT1001 or emma@example.com"
                    value={patientIdInput}
                    onChange={(e) => setPatientIdInput(e.target.value)}
                    required
                    autoComplete="username"
                    autoFocus
                  />
                </div>
                <span className="form-hint">Enter the Patient ID issued upon clinic registration</span>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="patient-password">
                  Password
                </label>
                <div className="input-with-icon input-with-action">
                  <Lock size={16} className="input-icon" />
                  <input
                    id="patient-password"
                    type={showPatientPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="••••••••"
                    value={patientPassword}
                    onChange={(e) => setPatientPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="input-eye-btn btn-icon btn-ghost"
                    onClick={() => setShowPatientPassword(!showPatientPassword)}
                    aria-label={showPatientPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPatientPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full login-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="login-spinner" />
                    <span>Signing in…</span>
                  </>
                ) : (
                  <>
                    <span>Sign In as Patient</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              {/* Account help link & first-time activation callout */}
              <div className="patient-help-footer">
                <p>
                  First time accessing your care portal?{' '}
                  <Link to="/activate-account" className="patient-activate-link">
                    Activate account here
                  </Link>
                </p>
                <button
                  type="button"
                  className="patient-help-toggle"
                  onClick={() => setShowHelp(!showHelp)}
                >
                  <HelpCircle size={13} />
                  <span>Need help with your Patient ID or password?</span>
                </button>
                {showHelp && (
                  <div className="patient-help-content animate-fade-in">
                    <p>
                      Your <strong>Patient ID</strong> (e.g. <code>PAT1001</code>) was assigned by clinic staff when your record was created. If you have not set a password yet, please use your 48-hour invitation link to activate your account.
                    </p>
                  </div>
                )}
              </div>
            </form>
          )}

          {/* ── Form 2: Staff Sign In ───────────────────────────── */}
          {mode === 'staff' && (
            <form onSubmit={handleStaffLogin} className="login-form animate-fade-in">
              <div className="form-group">
                <label className="form-label" htmlFor="staff-email">
                  Staff Email Address
                </label>
                <div className="input-with-icon">
                  <Mail size={16} className="input-icon" />
                  <input
                    id="staff-email"
                    type="email"
                    className="form-input"
                    placeholder="doctor@carelume.ai"
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="staff-password">
                  Password
                </label>
                <div className="input-with-icon input-with-action">
                  <Lock size={16} className="input-icon" />
                  <input
                    id="staff-password"
                    type={showStaffPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="••••••••"
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="input-eye-btn btn-icon btn-ghost"
                    onClick={() => setShowStaffPassword(!showStaffPassword)}
                    aria-label={showStaffPassword ? 'Hide password' : 'Show password'}
                  >
                    {showStaffPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full login-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="login-spinner" />
                    <span>Verifying credentials…</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Staff Portal</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
