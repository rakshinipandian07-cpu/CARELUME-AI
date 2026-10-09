import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  signup as signupApi,
  getInvitationByToken,
} from '../services/api';
import {
  Lock,
  User,
  KeyRound,
  Globe,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  ArrowLeft,
  Eye,
  EyeOff,
  Check,
  Building2,
} from 'lucide-react';
import Logo from '../components/Logo';
import './ActivateAccount.css';

export default function ActivateAccount() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setSession, isAuthenticated, user } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const urlToken = searchParams.get('token') || '';

  // Step 1: Token verification state
  const [inputToken, setInputToken] = useState(urlToken);
  const [verifiedPatient, setVerifiedPatient] = useState(null);
  const [verifyingToken, setVerifyingToken] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  // Step 2: Password creation state
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [signupLang, setSignupLang] = useState(language);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 3: Success state
  const [activatedSuccess, setActivatedSuccess] = useState(false);

  // Auto-verify token from URL on mount or URL change
  useEffect(() => {
    if (urlToken) {
      setInputToken(urlToken);
      verifyToken(urlToken);
    }
  }, [urlToken]);

  const verifyToken = async (tokenToVerify) => {
    const rawInput = (tokenToVerify || inputToken).trim();
    if (!rawInput) {
      setVerifyError('Please enter or paste your invitation link or token.');
      return;
    }

    // Extract token if user pasted a full URL
    let extractedToken = rawInput;
    try {
      if (rawInput.includes('token=')) {
        const urlObj = new URL(rawInput);
        extractedToken = urlObj.searchParams.get('token') || rawInput;
      }
    } catch {
      // Use raw string
    }

    setVerifyingToken(true);
    setVerifyError('');
    setVerifiedPatient(null);

    try {
      const data = await getInvitationByToken(extractedToken);
      setVerifiedPatient(data);
      setInputToken(extractedToken);
    } catch (err) {
      setVerifyError(err.message || 'Invalid or expired invitation link. Please request a new invite from clinic staff.');
    } finally {
      setVerifyingToken(false);
    }
  };

  const handleActivationSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!verifiedPatient || !inputToken) {
      setError('Please verify your invitation link before setting a password.');
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    if (signupPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const data = await signupApi({
        token: inputToken,
        password: signupPassword,
        languagePreference: signupLang,
      });

      setActivatedSuccess(true);
    } catch (err) {
      setError(err.message || 'Account activation failed. Please check your invitation link or request a new one.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="activate-page">
      {/* Top Bar with Home & Login links */}
      <div className="activate-top-bar">
        <Link to="/" className="btn btn-ghost btn-sm activate-back-link">
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </Link>
        <Link to="/login?tab=patient" className="btn btn-ghost btn-sm activate-back-link">
          <span>Patient Sign In</span>
          <ArrowRight size={15} />
        </Link>
      </div>

      <div className="activate-container animate-fade-in">
        {/* Brand Header */}
        <div className="activate-brand">
          <Link to="/" className="activate-logo-link">
            <Logo size={48} />
          </Link>
          <h1 className="activate-brand-name">
            CareLume <span className="brand-accent">AI</span>
          </h1>
          <p className="activate-brand-sub">Patient Account Activation</p>
        </div>

        {/* Main Card */}
        <div className="activate-card card">
          {activatedSuccess ? (
            /* ── Step 3: Success State ───────────────────────────── */
            <div className="activate-success-view animate-fade-in">
              <div className="activate-success-icon">
                <CheckCircle2 size={36} />
              </div>
              <h2>Account Activated Successfully!</h2>
              <p>
                Welcome to CareLume AI, <strong>{verifiedPatient?.name}</strong>. Your patient care portal is now ready.
              </p>

              <div className="patient-id-highlight-box">
                <span className="highlight-label">Your Patient ID for Login:</span>
                <span className="highlight-code">{verifiedPatient?.patientId}</span>
              </div>

              <div className="activation-success-info">
                <p>
                  You can now log in anytime using your <strong>Patient ID</strong> and the password you just created.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-full activate-btn"
                onClick={() => navigate('/login?tab=patient')}
              >
                <span>Go to Patient Login</span>
                <ArrowRight size={16} />
              </button>
            </div>
          ) : !verifiedPatient ? (
            /* ── Step 1: Token Verification ──────────────────────── */
            <form
              onSubmit={(e) => {
                e.preventDefault();
                verifyToken();
              }}
              className="activate-form"
            >
              <div className="activate-header">
                <h2>Activate Your Patient Account</h2>
                <p>
                  Enter the secure invitation link or token provided by your fertility clinic staff to set up your account password.
                </p>
              </div>

              <div className="activate-info-pill">
                <ShieldCheck size={18} className="text-teal" />
                <span>Invitations are single-use and valid for 48 hours</span>
              </div>

              {verifyError && (
                <div className="activate-error animate-fade-in" role="alert">
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{verifyError}</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="invitation-token-input">
                  Invitation Link or Code *
                </label>
                <div className="input-with-icon">
                  <KeyRound size={16} className="input-icon" />
                  <input
                    id="invitation-token-input"
                    type="text"
                    className="form-input"
                    placeholder="Paste your invitation token or full link..."
                    value={inputToken}
                    onChange={(e) => setInputToken(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <span className="form-hint">Example token: 48-character code sent by clinic staff</span>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full activate-btn"
                disabled={verifyingToken || !inputToken.trim()}
              >
                {verifyingToken ? (
                  <>
                    <Loader2 size={16} className="activate-spinner" />
                    <span>Verifying clinic invitation…</span>
                  </>
                ) : (
                  <>
                    <span>Verify Invitation</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div className="activate-card-footer">
                <p>Already activated your account?</p>
                <Link to="/login?tab=patient" className="activate-footer-link">
                  Sign in with Patient ID & Password
                </Link>
              </div>
            </form>
          ) : (
            /* ── Step 2: Set Password & Profile ──────────────────── */
            <form onSubmit={handleActivationSubmit} className="activate-form animate-fade-in">
              <div className="activate-header">
                <h2>Create Your Password</h2>
                <p>Set a secure password to complete your portal account setup.</p>
              </div>

              {/* Verified Identity Badge */}
              <div className="verified-patient-box">
                <div className="verified-badge-tag">
                  <CheckCircle2 size={15} />
                  <span>Verified Clinic Record</span>
                </div>
                <div className="verified-row">
                  <span className="verified-lbl">Patient Name:</span>
                  <strong className="verified-val">{verifiedPatient.name}</strong>
                </div>
                <div className="verified-row">
                  <span className="verified-lbl">Patient ID:</span>
                  <code className="verified-patient-id">{verifiedPatient.patientId}</code>
                </div>
                <div className="verified-row">
                  <span className="verified-lbl">Registered Email:</span>
                  <span className="verified-val">{verifiedPatient.email}</span>
                </div>
              </div>

              {error && (
                <div className="activate-error animate-fade-in" role="alert">
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{error}</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="new-password">
                  Create Password *
                </label>
                <div className="input-with-icon input-with-action">
                  <Lock size={16} className="input-icon" />
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="At least 6 characters"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                    autoFocus
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="input-eye-btn btn-icon btn-ghost"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="confirm-password">
                  Confirm Password *
                </label>
                <div className="input-with-icon">
                  <Lock size={16} className="input-icon" />
                  <input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Re-enter password"
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="patient-lang">
                  Preferred Portal Language
                </label>
                <div className="input-with-icon">
                  <Globe size={16} className="input-icon" />
                  <select
                    id="patient-lang"
                    className="form-select"
                    value={signupLang}
                    onChange={(e) => {
                      setSignupLang(e.target.value);
                      setLanguage(e.target.value);
                    }}
                  >
                    <option value="en">English</option>
                    <option value="ta">தமிழ் (Tamil)</option>
                    <option value="hi">हिन्दी (Hindi)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full activate-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="activate-spinner" />
                    <span>Activating account…</span>
                  </>
                ) : (
                  <>
                    <span>Activate Account & Proceed</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <button
                type="button"
                className="btn btn-ghost btn-full btn-sm"
                onClick={() => {
                  setVerifiedPatient(null);
                  setInputToken('');
                  setError('');
                  setVerifyError('');
                }}
              >
                <ArrowLeft size={14} />
                <span>Use a different invitation link</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
