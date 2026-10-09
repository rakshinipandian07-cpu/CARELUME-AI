import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  LayoutDashboard,
  CalendarDays,
  FileText,
  MessageCircle,
  LifeBuoy,
  Users,
  X,
  Heart,
} from 'lucide-react';
import Logo from './Logo';
import './Sidebar.css';

export default function Sidebar({ isOpen, onClose }) {
  const { isStaff } = useAuth();
  const { t } = useLanguage();

  const staffNav = [
    { to: '/staff', icon: LayoutDashboard, label: t('navDashboard', 'Dashboard'), end: true },
    { to: '/staff/patients', icon: Users, label: t('navPatients', 'Patients') },
    { to: '/staff/appointments', icon: CalendarDays, label: t('navAppointments', 'Appointments') },
    { to: '/staff/documents', icon: FileText, label: t('navDocuments', 'Documents') },
    { to: '/staff/chat', icon: MessageCircle, label: t('navChat', 'AI Assistant') },
    { to: '/staff/tickets', icon: LifeBuoy, label: t('navTickets', 'Support Tickets') },
  ];

  const patientNav = [
    { to: '/patient', icon: LayoutDashboard, label: t('navDashboard', 'Dashboard'), end: true },
    { to: '/patient/appointments', icon: CalendarDays, label: t('navAppointments', 'Appointments') },
    { to: '/patient/documents', icon: FileText, label: t('navDocuments', 'Documents') },
    { to: '/patient/chat', icon: MessageCircle, label: t('navChat', 'AI Assistant') },
    { to: '/patient/tickets', icon: LifeBuoy, label: t('navTickets', 'Support Tickets') },
  ];

  const navItems = isStaff ? staffNav : patientNav;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Logo size={28} />
            <div className="sidebar-logo-text">
              <span className="sidebar-logo-name">{t('brandName', 'CareLume')}</span>
              <span className="sidebar-logo-badge">AI</span>
            </div>
          </div>
          <button
            className="sidebar-close btn-icon btn-ghost"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <ul className="sidebar-nav-list">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `sidebar-nav-link ${isActive ? 'active' : ''}`
                  }
                  onClick={onClose}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-badge">
            <Heart size={14} />
            <span>{t('brandSubtitle', 'Fertility Clinic Platform')}</span>
          </div>
        </div>
      </aside>
    </>
  );
}
