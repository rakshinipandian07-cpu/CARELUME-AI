import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  updateLanguagePreference,
} from '../services/api';
import {
  Menu,
  Bell,
  LogOut,
  User,
  Globe,
  Check,
  CheckCheck,
  Calendar,
  FileText,
  LifeBuoy,
  UserPlus,
  Sparkles,
} from 'lucide-react';
import Logo from './Logo';
import './Navbar.css';

const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'ta', label: 'தமிழ்', short: 'த' },
  { code: 'hi', label: 'हिन्दी', short: 'हि' },
];

export default function Navbar({ onMenuClick }) {
  const { user, logout, isAuthenticated } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const notifRef = useRef(null);
  const langRef = useRef(null);

  const fetchNotifs = async () => {
    if (!isAuthenticated) return;
    try {
      const data = await getNotifications();
      setNotifications(data || []);
    } catch (err) {
      // Silently ignore background notification fetch errors
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 25000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (langRef.current && !langRef.current.contains(e.target)) {
        setShowLangMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = async (code) => {
    setLanguage(code);
    setShowLangMenu(false);
    if (isAuthenticated) {
      try {
        await updateLanguagePreference(code);
      } catch {
        // Preference locally saved regardless
      }
    }
  };

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
    } catch {
      // Ignored
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // Ignored
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getNotifIcon = (type) => {
    switch (type) {
      case 'appointment':
        return <Calendar size={14} className="notif-icon-apt" />;
      case 'document':
        return <FileText size={14} className="notif-icon-doc" />;
      case 'ticket':
        return <LifeBuoy size={14} className="notif-icon-ticket" />;
      case 'registration':
        return <UserPlus size={14} className="notif-icon-reg" />;
      default:
        return <Sparkles size={14} className="notif-icon-gen" />;
    }
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button
          className="navbar-menu-btn btn-icon btn-ghost"
          onClick={onMenuClick}
          aria-label="Open sidebar menu"
        >
          <Menu size={20} />
        </button>
        <div className="navbar-brand-mobile">
          <Logo size={26} showText={true} />
        </div>
      </div>

      <div className="navbar-right">
        {/* Language Selector */}
        <div className="navbar-dropdown-wrapper" ref={langRef}>
          <button
            className="navbar-lang-btn btn-ghost btn-sm"
            onClick={() => setShowLangMenu((prev) => !prev)}
            aria-label="Select Language"
            title="Language"
          >
            <Globe size={16} />
            <span className="lang-code-tag">
              {LANGUAGES.find((l) => l.code === language)?.short || 'EN'}
            </span>
          </button>

          {showLangMenu && (
            <div className="navbar-dropdown lang-dropdown animate-fade-in">
              <div className="dropdown-header">
                <span>{t('preferredLanguage', 'Preferred Language')}</span>
              </div>
              <div className="lang-options">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    className={`lang-option ${language === l.code ? 'active' : ''}`}
                    onClick={() => handleLanguageChange(l.code)}
                  >
                    <span>{l.label}</span>
                    {language === l.code && <Check size={14} />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notifications Dropdown */}
        <div className="navbar-dropdown-wrapper" ref={notifRef}>
          <button
            className="navbar-bell btn-icon btn-ghost"
            onClick={() => setShowNotifications((prev) => !prev)}
            aria-label="Notifications"
            title={t('notifications', 'Notifications')}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="navbar-bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>

          {showNotifications && (
            <div className="navbar-dropdown notif-dropdown animate-fade-in">
              <div className="dropdown-header">
                <span className="dropdown-title">
                  {t('notifications', 'Notifications')}{' '}
                  {unreadCount > 0 && <span className="unread-tag">{unreadCount} new</span>}
                </span>
                {unreadCount > 0 && (
                  <button
                    className="mark-all-read-btn btn-ghost"
                    onClick={handleMarkAllRead}
                  >
                    <CheckCheck size={14} /> {t('markAllRead', 'Mark all read')}
                  </button>
                )}
              </div>

              <div className="notif-list">
                {notifications.length === 0 ? (
                  <div className="notif-empty">
                    <p>{t('noNotifications', 'No notifications yet')}</p>
                  </div>
                ) : (
                  notifications.slice(0, 8).map((notif) => (
                    <div
                      key={notif._id}
                      className={`notif-item ${!notif.read ? 'unread' : ''}`}
                    >
                      <div className="notif-icon-wrapper">
                        {getNotifIcon(notif.type)}
                      </div>
                      <div className="notif-content">
                        {notif.link ? (
                          <Link
                            to={notif.link}
                            className="notif-title-link"
                            onClick={() => setShowNotifications(false)}
                          >
                            <strong>{notif.title}</strong>
                          </Link>
                        ) : (
                          <strong>{notif.title}</strong>
                        )}
                        <p>{notif.message}</p>
                        <span className="notif-time">
                          {formatTimeAgo(notif.createdAt)}
                        </span>
                      </div>
                      {!notif.read && (
                        <button
                          className="notif-mark-read btn-icon btn-ghost"
                          title="Mark as read"
                          onClick={(e) => handleMarkAsRead(notif._id, e)}
                        >
                          <Check size={12} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="navbar-divider" />

        {/* User Info */}
        <div className="navbar-user">
          <div className="navbar-avatar">
            <User size={16} />
          </div>
          <div className="navbar-user-info">
            <span className="navbar-user-name">{user?.name || 'User'}</span>
            <span className="navbar-user-role">
              {user?.role === 'staff' ? 'Clinic Staff' : `Patient ${user?.patientId || ''}`}
            </span>
          </div>
        </div>

        <button
          className="navbar-logout btn-ghost btn-sm"
          onClick={logout}
          aria-label={t('logout', 'Log out')}
          title={t('logout', 'Log out')}
        >
          <LogOut size={16} />
          <span className="navbar-logout-text">{t('logout', 'Log out')}</span>
        </button>
      </div>
    </header>
  );
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
