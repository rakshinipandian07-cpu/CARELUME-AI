import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Sparkles,
  Calendar,
  FileText,
  ShieldCheck,
  LifeBuoy,
  Users,
  ArrowRight,
  CheckCircle2,
  Lock,
  Clock,
  ChevronRight,
  Globe,
  Bot,
  Layers,
  HeartHandshake,
  Check,
  Menu,
  X,
  Building2,
  Stethoscope,
  Activity,
  FileCheck2,
  ArrowUpRight,
} from 'lucide-react';
import Logo from '../components/Logo';
import './LandingPage.css';

export default function LandingPage() {
  const { user, isAuthenticated } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-page">
      {/* ── Navbar ─────────────────────────────────────────────── */}
      <header className={`landing-header ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="landing-container landing-header-inner">
          <Link to="/" className="landing-brand">
            <Logo size={32} />
            <div className="landing-brand-text">
              <span className="landing-brand-name">CareLume</span>
              <span className="landing-brand-badge">AI</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="landing-nav" aria-label="Main Navigation">
            <button
              type="button"
              className="landing-nav-link"
              onClick={() => handleNavClick('hero')}
            >
              Home
            </button>
            <button
              type="button"
              className="landing-nav-link"
              onClick={() => handleNavClick('features')}
            >
              Features
            </button>
            <button
              type="button"
              className="landing-nav-link"
              onClick={() => handleNavClick('how-it-works')}
            >
              How It Works
            </button>
            <button
              type="button"
              className="landing-nav-link"
              onClick={() => handleNavClick('security')}
            >
              Security
            </button>
            <button
              type="button"
              className="landing-nav-link"
              onClick={() => handleNavClick('faq')}
            >
              FAQ
            </button>
          </nav>

          {/* Action CTAs */}
          <div className="landing-actions">
            {isAuthenticated ? (
              <Link
                to={user?.role === 'staff' ? '/staff' : '/patient'}
                className="btn btn-primary landing-cta-btn"
              >
                <span>Go to Dashboard</span>
                <ArrowRight size={15} />
              </Link>
            ) : (
              <>
                <Link
                  to="/login?tab=patient"
                  className="btn btn-ghost landing-login-link"
                >
                  Patient Login
                </Link>
                <Link
                  to="/login?tab=staff"
                  className="btn btn-primary landing-cta-btn"
                >
                  <Lock size={14} />
                  <span>Staff Portal</span>
                </Link>
              </>
            )}

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              className="landing-mobile-toggle btn-icon btn-ghost"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="landing-mobile-menu animate-fade-in">
            <div className="landing-container mobile-menu-links">
              <button
                type="button"
                className="mobile-nav-link"
                onClick={() => handleNavClick('hero')}
              >
                Home
              </button>
              <button
                type="button"
                className="mobile-nav-link"
                onClick={() => handleNavClick('features')}
              >
                Features
              </button>
              <button
                type="button"
                className="mobile-nav-link"
                onClick={() => handleNavClick('how-it-works')}
              >
                How It Works
              </button>
              <button
                type="button"
                className="mobile-nav-link"
                onClick={() => handleNavClick('security')}
              >
                Security & Privacy
              </button>
              <button
                type="button"
                className="mobile-nav-link"
                onClick={() => handleNavClick('faq')}
              >
                FAQ
              </button>
              <div className="mobile-menu-divider" />
              <div className="mobile-menu-actions">
                <Link
                  to="/login?tab=patient"
                  className="btn btn-secondary btn-full"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Patient Sign In
                </Link>
                <Link
                  to="/login?tab=staff"
                  className="btn btn-primary btn-full"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Staff Portal Login
                </Link>
                <Link
                  to="/activate-account"
                  className="btn btn-ghost btn-full btn-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Activate Patient Account
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero Section ────────────────────────────────────────── */}
      <section id="hero" className="landing-hero">
        <div className="landing-container hero-grid">
          <div className="hero-content">
            <div className="hero-pill-tag">
              <Sparkles size={14} className="hero-pill-icon" />
              <span>Modern Fertility Clinic Management & AI Assistance</span>
            </div>

            <h1 className="hero-headline">
              Smarter Clinic Operations. <br />
              <span className="hero-highlight">More Time for Patient Care.</span>
            </h1>

            <p className="hero-description">
              CareLume AI helps fertility clinics streamline appointments, patient records,
              required documents, and routine care questions — with built-in medical safety
              handovers that keep clinicians in complete control.
            </p>

            <div className="hero-cta-group">
              <Link to="/login?tab=staff" className="btn btn-primary btn-lg hero-btn-primary">
                <span>Staff Login</span>
                <ArrowRight size={16} />
              </Link>
              <Link to="/login?tab=patient" className="btn btn-secondary btn-lg hero-btn-secondary">
                <Users size={16} />
                <span>Patient Portal</span>
              </Link>
            </div>

            <div className="hero-trust-badges">
              <div className="trust-item">
                <CheckCircle2 size={16} className="trust-icon" />
                <span>Role-Based Access</span>
              </div>
              <div className="trust-item">
                <CheckCircle2 size={16} className="trust-icon" />
                <span>Safe AI Handover</span>
              </div>
              <div className="trust-item">
                <CheckCircle2 size={16} className="trust-icon" />
                <span>Verified Records</span>
              </div>
            </div>
          </div>

          {/* Hero Interactive Preview Showcase */}
          <div className="hero-preview-wrapper">
            <div className="hero-card-stack">
              {/* Main Clinic Card */}
              <div className="hero-dashboard-card card">
                <div className="hero-card-header">
                  <div className="hero-card-badge">
                    <span className="live-status-dot" />
                    <span>Clinic Portal Live</span>
                  </div>
                  <span className="hero-card-patient-tag">PAT1001</span>
                </div>

                <div className="hero-patient-summary">
                  <div className="hero-avatar">E</div>
                  <div className="hero-patient-info">
                    <h4>Emma Vance</h4>
                    <p>Stage: <strong>Stimulation Protocol</strong></p>
                  </div>
                  <span className="badge badge-stimulation">Stimulation</span>
                </div>

                {/* Next Appointment Pill */}
                <div className="hero-appointment-pill">
                  <div className="pill-icon lavender">
                    <Calendar size={16} />
                  </div>
                  <div className="pill-text">
                    <span className="pill-title">Next Scheduled Ultrasound</span>
                    <span className="pill-sub">Tomorrow at 09:30 AM · Room 3B</span>
                  </div>
                  <span className="badge badge-scheduled">Confirmed</span>
                </div>

                {/* AI Assistant Question Preview */}
                <div className="hero-ai-chat-preview">
                  <div className="chat-preview-q">
                    <span className="chat-preview-sender">Patient:</span>
                    <p>“What documents are still pending for my upcoming cycle?”</p>
                  </div>
                  <div className="chat-preview-a">
                    <div className="ai-bubble-tag">
                      <Bot size={13} />
                      <span>CareLume AI</span>
                    </div>
                    <p>
                      “Based on clinic records, your <strong>Fertility Consent Form</strong> has been approved. Your <strong>Initial Bloodwork Report</strong> is currently pending submission.”
                    </p>
                  </div>
                </div>

                {/* Bottom Stats Row */}
                <div className="hero-card-footer-stats">
                  <div className="footer-stat">
                    <span className="footer-stat-num">3 / 4</span>
                    <span className="footer-stat-label">Documents Submitted</span>
                  </div>
                  <div className="footer-stat-divider" />
                  <div className="footer-stat">
                    <span className="footer-stat-num text-teal">Active</span>
                    <span className="footer-stat-label">Cycle Status</span>
                  </div>
                  <div className="footer-stat-divider" />
                  <div className="footer-stat">
                    <span className="footer-stat-num text-sage">0</span>
                    <span className="footer-stat-label">Unresolved Tickets</span>
                  </div>
                </div>
              </div>

              {/* Floating Handover Notification Card */}
              <div className="hero-floating-card animate-float">
                <div className="floating-icon">
                  <ShieldCheck size={18} />
                </div>
                <div className="floating-text">
                  <strong>Safe Clinical Handover</strong>
                  <span>Medical queries instantly route to staff tickets</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Key Highlights / Numbers Strip ─────────────────────── */}
      <section className="landing-strip">
        <div className="landing-container strip-grid">
          <div className="strip-item">
            <span className="strip-num">100%</span>
            <span className="strip-label">Patient Record Isolation</span>
          </div>
          <div className="strip-item">
            <span className="strip-num">0</span>
            <span className="strip-label">Medical Advice Hallucinations</span>
          </div>
          <div className="strip-item">
            <span className="strip-num">48h</span>
            <span className="strip-label">Expiring Secure Invitations</span>
          </div>
          <div className="strip-item">
            <span className="strip-num">3</span>
            <span className="strip-label">Supported Languages (EN, TA, HI)</span>
          </div>
        </div>
      </section>

      {/* ── Features Section ───────────────────────────────────── */}
      <section id="features" className="landing-section">
        <div className="landing-container">
          <div className="section-header text-center">
            <span className="section-eyebrow">Comprehensive Platform</span>
            <h2 className="section-title">Built for Modern Fertility Practices</h2>
            <p className="section-subtitle">
              Every feature is purposefully designed to reduce administrative burden, eliminate
              phone tag, and provide patients with calm, structured clarity.
            </p>
          </div>

          <div className="features-grid">
            {/* Feature 1 */}
            <div className="feature-card card">
              <div className="feature-icon teal">
                <Bot size={24} />
              </div>
              <h3>AI-Powered Routine Assistance</h3>
              <p>
                Answers routine questions on appointment dates, pending paperwork, and recorded
                treatment stages directly from authorized clinic databases.
              </p>
              <ul className="feature-bullets">
                <li>
                  <Check size={14} /> Instant retrieval from verified records
                </li>
                <li>
                  <Check size={14} /> Automatic handover for clinical questions
                </li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="feature-card card">
              <div className="feature-icon lavender">
                <Calendar size={24} />
              </div>
              <h3>Appointment & Cycle Coordination</h3>
              <p>
                Keep clinic schedules and patient visits synchronized across consultation,
                monitoring, egg retrieval, and embryo transfer stages.
              </p>
              <ul className="feature-bullets">
                <li>
                  <Check size={14} /> Clear scheduling and status updates
                </li>
                <li>
                  <Check size={14} /> Dedicated patient appointment timeline
                </li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="feature-card card">
              <div className="feature-icon peach">
                <FileCheck2 size={24} />
              </div>
              <h3>Document & Consent Verification</h3>
              <p>
                Manage mandatory government IDs, fertility consent forms, and diagnostic lab
                reports with staff review and cloud security.
              </p>
              <ul className="feature-bullets">
                <li>
                  <Check size={14} /> PDF & image upload with progress tracking
                </li>
                <li>
                  <Check size={14} /> Staff verification and review feedback notes
                </li>
              </ul>
            </div>

            {/* Feature 4 */}
            <div className="feature-card card">
              <div className="feature-icon sage">
                <Users size={24} />
              </div>
              <h3>Patient Directory & Stage Tracking</h3>
              <p>
                Track patients from initial consultation through each milestone with clear
                administrative stage classification and history.
              </p>
              <ul className="feature-bullets">
                <li>
                  <Check size={14} /> Auto-generated unique Patient IDs
                </li>
                <li>
                  <Check size={14} /> Real-time stage progression stepper
                </li>
              </ul>
            </div>

            {/* Feature 5 */}
            <div className="feature-card card">
              <div className="feature-icon teal">
                <ShieldCheck size={24} />
              </div>
              <h3>Role-Based Access Control</h3>
              <p>
                Strict authorization middleware prevents data leakage. Patients see only their own
                records; staff manage clinic operations safely.
              </p>
              <ul className="feature-bullets">
                <li>
                  <Check size={14} /> Cryptographic invitation activation
                </li>
                <li>
                  <Check size={14} /> JWT authenticated session boundaries
                </li>
              </ul>
            </div>

            {/* Feature 6 */}
            <div className="feature-card card">
              <div className="feature-icon lavender">
                <Globe size={24} />
              </div>
              <h3>Multilingual Patient Experience</h3>
              <p>
                Enable patients and staff to view the portal in their preferred language,
                facilitating clearer care communication.
              </p>
              <ul className="feature-bullets">
                <li>
                  <Check size={14} /> English, தமிழ் (Tamil), हिन्दी (Hindi)
                </li>
                <li>
                  <Check size={14} /> One-click dynamic language switcher
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works Section ───────────────────────────────── */}
      <section id="how-it-works" className="landing-section bg-alt">
        <div className="landing-container">
          <div className="section-header text-center">
            <span className="section-eyebrow">Seamless Workflow</span>
            <h2 className="section-title">How CareLume AI Works</h2>
            <p className="section-subtitle">
              A transparent, 4-step workflow connecting clinic administration, patients, and AI safety.
            </p>
          </div>

          <div className="workflow-steps">
            {/* Step 1 */}
            <div className="workflow-step-card card">
              <div className="step-badge">01</div>
              <h4>Staff Patient Onboarding</h4>
              <p>
                Clinic staff registers a patient with their name, email, and treatment stage. The
                system assigns a unique <strong>Patient ID</strong> (e.g. <code>PAT1001</code>) and
                generates a secure 48-hour activation link.
              </p>
            </div>

            <div className="workflow-arrow">
              <ChevronRight size={24} />
            </div>

            {/* Step 2 */}
            <div className="workflow-step-card card">
              <div className="step-badge">02</div>
              <h4>First-Time Activation</h4>
              <p>
                The patient opens their clinic invitation, verifies their profile details, and creates
                their private password. Once activated, the account is securely enabled.
              </p>
            </div>

            <div className="workflow-arrow">
              <ChevronRight size={24} />
            </div>

            {/* Step 3 */}
            <div className="workflow-step-card card">
              <div className="step-badge">03</div>
              <h4>Direct Patient ID Sign-In</h4>
              <p>
                Moving forward, patients sign in directly using their <strong>Patient ID</strong> and
                password. No repeated tokens, no invitation link confusion.
              </p>
            </div>

            <div className="workflow-arrow">
              <ChevronRight size={24} />
            </div>

            {/* Step 4 */}
            <div className="workflow-step-card card">
              <div className="step-badge">04</div>
              <h4>AI Guidance & Safe Handover</h4>
              <p>
                Patients check scheduled appointments and pending documents with AI. Any medical
                advice question immediately triggers an escalation ticket for staff review.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Security & Privacy Section ─────────────────────────── */}
      <section id="security" className="landing-section">
        <div className="landing-container">
          <div className="security-box card">
            <div className="security-content">
              <div className="security-icon-wrapper">
                <ShieldCheck size={32} />
              </div>
              <span className="section-eyebrow">Enterprise Privacy & Security</span>
              <h2 className="security-title">Patient Data Privacy & Isolation</h2>
              <p className="security-desc">
                Fertility treatment records contain sensitive information. CareLume AI enforces
                strict role-based authorization at every API route and database query.
              </p>

              <div className="security-points-grid">
                <div className="security-point">
                  <div className="point-icon"><Lock size={16} /></div>
                  <div>
                    <strong>Cryptographic Activation</strong>
                    <p>Expiring, single-use SHA-256 hashed tokens protect first-time password setup.</p>
                  </div>
                </div>

                <div className="security-point">
                  <div className="point-icon"><Users size={16} /></div>
                  <div>
                    <strong>Isolated Patient Scope</strong>
                    <p>Patients access solely their verified appointments, documents, and tickets.</p>
                  </div>
                </div>

                <div className="security-point">
                  <div className="point-icon"><Stethoscope size={16} /></div>
                  <div>
                    <strong>Medical Guardrails</strong>
                    <p>AI strictly refrains from diagnostic claims and routes clinical questions to staff.</p>
                  </div>
                </div>

                <div className="security-point">
                  <div className="point-icon"><Building2 size={16} /></div>
                  <div>
                    <strong>Staff Protected Operations</strong>
                    <p>Staff actions (reissuing invites, reviewing documents) require verified staff credentials.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ Section ────────────────────────────────────────── */}
      <section id="faq" className="landing-section bg-alt">
        <div className="landing-container">
          <div className="section-header text-center">
            <span className="section-eyebrow">Frequently Asked Questions</span>
            <h2 className="section-title">Everything You Need to Know</h2>
            <p className="section-subtitle">
              Common questions about accessing and managing clinic records on CareLume AI.
            </p>
          </div>

          <div className="faq-grid">
            <div className="faq-card card">
              <h4>How do patients log into CareLume AI?</h4>
              <p>
                After first-time activation with a clinic invitation, patients simply enter their{' '}
                <strong>Patient ID</strong> (e.g. <code>PAT1001</code>) and password on the sign-in page.
              </p>
            </div>

            <div className="faq-card card">
              <h4>What happens if a patient asks a medical or symptom question?</h4>
              <p>
                The AI assistant detects clinical keywords (medications, symptoms, dosages) and
                automatically generates a <strong>Support Ticket</strong> assigned to clinic staff,
                alerting doctors for proper medical guidance.
              </p>
            </div>

            <div className="faq-card card">
              <h4>Can a patient see another patient's records?</h4>
              <p>
                No. All database queries and API endpoints strictly match the authenticated user's JWT
                patient identity, guaranteeing total data isolation.
              </p>
            </div>

            <div className="faq-card card">
              <h4>What if an invitation link expires?</h4>
              <p>
                Clinic staff can reissue a fresh 48-hour invitation link with a single click from the
                Patient Directory dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA Banner ──────────────────────────────────── */}
      <section className="landing-cta-banner">
        <div className="landing-container cta-banner-inner">
          <div className="cta-banner-content">
            <h2>Ready to experience smarter fertility clinic management?</h2>
            <p>
              Sign in with your staff credentials or access your patient care portal today.
            </p>
          </div>
          <div className="cta-banner-buttons">
            <Link to="/login?tab=staff" className="btn btn-primary btn-lg banner-btn-primary">
              <span>Staff Login</span>
              <ArrowRight size={16} />
            </Link>
            <Link to="/login?tab=patient" className="btn btn-secondary btn-lg banner-btn-secondary">
              <span>Patient Portal</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-container footer-inner">
          <div className="footer-brand-col">
            <div className="landing-brand">
              <Logo size={28} />
              <div className="landing-brand-text">
                <span className="landing-brand-name">CareLume</span>
                <span className="landing-brand-badge">AI</span>
              </div>
            </div>
            <p className="footer-tagline">
              Fertility Clinic Information & Care Management Platform
            </p>
            <p className="footer-disclaimer">
              CareLume AI is an administrative clinic operational tool and does not provide clinical
              medical diagnosis or medical treatment advice.
            </p>
          </div>

          <div className="footer-links-group">
            <div className="footer-col">
              <h5>Navigation</h5>
              <button type="button" onClick={() => handleNavClick('hero')}>Home</button>
              <button type="button" onClick={() => handleNavClick('features')}>Features</button>
              <button type="button" onClick={() => handleNavClick('how-it-works')}>How It Works</button>
              <button type="button" onClick={() => handleNavClick('security')}>Security</button>
            </div>

            <div className="footer-col">
              <h5>Portals</h5>
              <Link to="/login?tab=staff">Staff Portal</Link>
              <Link to="/login?tab=patient">Patient Sign In</Link>
              <Link to="/activate-account">Account Activation</Link>
            </div>
          </div>
        </div>

        <div className="landing-container footer-bottom">
          <p>© {new Date().getFullYear()} CareLume AI. All rights reserved.</p>
          <div className="footer-bottom-links">
            <span>Secure Role-Based Access</span>
            <span>•</span>
            <span>Healthcare Operations</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
