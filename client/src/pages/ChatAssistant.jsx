import { useState, useRef, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { sendChatMessage, getPatients } from '../services/api';
import {
  Send,
  Bot,
  User,
  Sparkles,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Users,
  Search,
  Check,
  ShieldAlert,
} from 'lucide-react';
import './ChatAssistant.css';

const DEFAULT_PROMPTS = [
  'What documents are currently pending for this patient?',
  'When is the next scheduled appointment?',
  'What is the recorded treatment stage?',
  'What paperwork is required before egg retrieval?',
];

export default function ChatAssistant() {
  const { user, isStaff } = useAuth();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();

  // Patients for staff combobox
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(
    isStaff ? searchParams.get('patient') || '' : user?.patientId || ''
  );
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Load patients for staff
  useEffect(() => {
    if (isStaff) {
      getPatients()
        .then((data) => setPatients(data || []))
        .catch(() => {});
    }
  }, [isStaff]);

  // Click outside patient dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowPatientDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize welcome message
  useEffect(() => {
    const activePatient = isStaff
      ? patients.find((p) => p.patientId === selectedPatientId)
      : { name: user?.name, patientId: user?.patientId };

    if (isStaff && !selectedPatientId) {
      setMessages([
        {
          id: 'init',
          sender: 'bot',
          text: 'Hello! I am your CareLume AI assistant. Please select a patient above to ask about their appointments, documents, or clinic routine.',
          time: formatTime(new Date()),
        },
      ]);
    } else {
      setMessages([
        {
          id: 'init',
          sender: 'bot',
          text: `Hello ${
            isStaff ? 'Doctor' : user?.name?.split(' ')[0] || ''
          }! I am ready to answer routine questions regarding ${
            activePatient?.name || selectedPatientId || 'your'
          } appointments, required documents, and clinic schedules.`,
          time: formatTime(new Date()),
        },
      ]);
    }
  }, [selectedPatientId, isStaff, patients]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSelectPatient = (pId) => {
    setSelectedPatientId(pId);
    setShowPatientDropdown(false);
    setPatientSearch('');
  };

  const handleSend = async (questionToSend) => {
    const q = (questionToSend || input).trim();
    if (!q || loading) return;

    if (isStaff && !selectedPatientId) {
      alert('Please select a patient record first.');
      return;
    }

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: q,
      time: formatTime(new Date()),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!questionToSend) setInput('');
    setLoading(true);

    try {
      const res = await sendChatMessage(q, selectedPatientId);

      const botMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: res.answer,
        source: res.source,
        handover: res.handover,
        ticketId: res.ticketId,
        time: formatTime(new Date()),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errorMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: err.message || 'Sorry, I encountered an issue processing your request.',
        error: true,
        time: formatTime(new Date()),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const selectedPatient = patients.find((p) => p.patientId === selectedPatientId);
  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.patientId.toLowerCase().includes(patientSearch.toLowerCase())
  );

  return (
    <div className="chat-page animate-fade-in">
      <div className="page-header" style={{ marginBottom: '12px' }}>
        <h1>{t('aiAssistantTitle', 'AI Care Assistant')}</h1>
        <p>{t('aiAssistantSubtitle', 'Routine clinic information, appointment dates, and paperwork help')}</p>
      </div>

      <div className="chat-container card">
        {/* Header Bar: Patient context selector for staff / Indicator for patients */}
        <div className="chat-header-bar">
          {isStaff ? (
            <div className="chat-patient-selector" ref={dropdownRef}>
              <button
                type="button"
                className="patient-select-btn"
                onClick={() => setShowPatientDropdown((prev) => !prev)}
              >
                <Users size={16} className="text-teal" />
                {selectedPatient ? (
                  <div className="selected-patient-preview">
                    <strong>{selectedPatient.name}</strong>
                    <span className="patient-id-tag">{selectedPatient.patientId}</span>
                    <span className={`badge badge-${selectedPatient.treatmentStage?.toLowerCase()}`}>
                      {selectedPatient.treatmentStage}
                    </span>
                  </div>
                ) : (
                  <span className="placeholder-text">
                    {t('selectPatientPrompt', 'Select a patient to query records')}
                  </span>
                )}
              </button>

              {showPatientDropdown && (
                <div className="patient-picker-dropdown animate-fade-in">
                  <div className="picker-search-bar">
                    <Search size={14} />
                    <input
                      type="text"
                      placeholder="Search patient name or ID…"
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="picker-list">
                    {filteredPatients.length === 0 ? (
                      <div className="picker-empty">No patients match search</div>
                    ) : (
                      filteredPatients.map((p) => (
                        <div
                          key={p._id}
                          className={`picker-item ${p.patientId === selectedPatientId ? 'active' : ''}`}
                          onClick={() => handleSelectPatient(p.patientId)}
                        >
                          <div className="picker-item-info">
                            <strong>{p.name}</strong>
                            <span>{p.patientId} · {p.treatmentStage}</span>
                          </div>
                          {p.patientId === selectedPatientId && <Check size={14} />}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="chat-patient-badge">
              <Sparkles size={16} className="text-teal" />
              <span>
                {t('activeForPatient', 'Active record for')}: <strong>{user?.name}</strong> ({user?.patientId})
              </span>
            </div>
          )}

          <div className="chat-status-pill">
            <span className="live-dot" />
            <span>AI Ready</span>
          </div>
        </div>

        {/* Message stream */}
        <div className="chat-messages">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`chat-bubble-row ${msg.sender === 'user' ? 'user-row' : 'bot-row'}`}
            >
              <div className={`chat-avatar ${msg.sender}`}>
                {msg.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className="chat-bubble-content">
                <div className={`chat-bubble ${msg.sender} ${msg.error ? 'is-error' : ''}`}>
                  <p>{msg.text}</p>

                  {msg.source && (
                    <div className="chat-source-tag">
                      <span>Source: {msg.source}</span>
                    </div>
                  )}

                  {msg.handover && (
                    <div className="chat-handover-box">
                      <div className="handover-header">
                        <ShieldAlert size={16} className="text-peach" />
                        <strong>Staff Handover Created</strong>
                      </div>
                      <p>{t('handoverAlert', 'Your inquiry has been routed to clinic staff as a support ticket.')}</p>
                      <Link
                        to={isStaff ? '/staff/tickets' : '/patient/tickets'}
                        className="btn btn-secondary btn-sm"
                        style={{ marginTop: '8px' }}
                      >
                        <ExternalLink size={14} /> View Ticket #{msg.ticketId?.slice(-6)?.toUpperCase()}
                      </Link>
                    </div>
                  )}
                </div>
                <span className="chat-time">{msg.time}</span>
              </div>
            </div>
          ))}

          {loading && (
            <div className="chat-bubble-row bot-row">
              <div className="chat-avatar bot">
                <Bot size={16} />
              </div>
              <div className="chat-bubble bot typing-indicator">
                <div className="typing-dots">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick prompt chips */}
        <div className="chat-quick-prompts">
          {DEFAULT_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="quick-prompt-btn"
              onClick={() => handleSend(prompt)}
              disabled={loading || (isStaff && !selectedPatientId)}
            >
              <Sparkles size={12} />
              <span>{prompt}</span>
            </button>
          ))}
        </div>

        {/* Input area */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="chat-input-wrapper"
        >
          <input
            ref={inputRef}
            type="text"
            className="form-input chat-input"
            placeholder={
              isStaff && !selectedPatientId
                ? t('selectPatientPrompt', 'Please select a patient first')
                : t('askPlaceholder', 'Ask about appointments, required documents, or clinic routine...')
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading || (isStaff && !selectedPatientId)}
          />
          <button
            type="submit"
            className="btn btn-primary chat-send-btn"
            disabled={loading || !input.trim() || (isStaff && !selectedPatientId)}
          >
            <Send size={16} />
            <span>{t('askBtn', 'Send')}</span>
          </button>
        </form>

        <div className="chat-disclaimer">
          <AlertTriangle size={12} />
          <span>{t('safetyDisclaimer', 'CareLume AI provides administrative routine guidance only and does not replace clinician advice.')}</span>
        </div>
      </div>
    </div>
  );
}

function formatTime(d) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
