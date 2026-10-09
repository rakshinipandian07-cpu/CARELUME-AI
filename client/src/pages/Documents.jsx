import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  getDocuments,
  uploadDocument,
  updateDocumentStatus,
  getSecureDocumentView,
} from '../services/api';
import {
  FileText,
  Upload,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Inbox,
  Loader2,
  ExternalLink,
  Filter,
  X,
  FileCheck,
  Clock,
  Eye,
  Plus,
} from 'lucide-react';
import './Documents.css';

const CATEGORIES = [
  'Identification',
  'Consent Forms',
  'Lab Reports',
  'Medical Records',
  'Ultrasound Scans',
  'General',
];

const STATUS_OPTIONS = ['Pending', 'Submitted', 'Approved', 'Rejected'];

export default function Documents() {
  const { isStaff, user } = useAuth();
  const { t } = useLanguage();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [docName, setDocName] = useState('');
  const [category, setCategory] = useState('Identification');
  const [targetFile, setTargetFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const fileInputRef = useRef(null);

  // Review status modal state (for staff)
  const [reviewingDoc, setReviewingDoc] = useState(null);
  const [newStatus, setNewStatus] = useState('Approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [feedback, setFeedback] = useState({ id: null, type: '', message: '' });

  const fetchDocuments = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getDocuments();
      setDocuments(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setUploadError('');
    if (!file) {
      setTargetFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size exceeds 5MB limit.');
      setTargetFile(null);
      return;
    }

    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!validExtensions.includes(ext)) {
      setUploadError('Unsupported file type. Please select a PDF, JPG, or PNG file.');
      setTargetFile(null);
      return;
    }

    setTargetFile(file);
    if (!docName && !selectedDocId) {
      // Pre-fill name from file
      setDocName(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!targetFile) {
      setUploadError('Please choose a file to upload.');
      return;
    }

    setUploading(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', targetFile);
      formData.append('name', docName || targetFile.name);
      formData.append('category', category);
      if (selectedDocId) {
        formData.append('documentId', selectedDocId);
      }

      const res = await uploadDocument(formData);
      setUploadSuccess(t('uploadedSuccessfully', 'Document uploaded successfully!'));
      
      // Update local state
      await fetchDocuments();

      setTimeout(() => {
        setShowUploadModal(false);
        setTargetFile(null);
        setDocName('');
        setSelectedDocId('');
        setUploadSuccess('');
      }, 1500);
    } catch (err) {
      setUploadError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleViewDocument = async (docId) => {
    try {
      const viewData = await getSecureDocumentView(docId);
      if (viewData?.url) {
        window.open(viewData.url, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      alert(err.message || 'Unable to open document.');
    }
  };

  const handleSaveReview = async (e) => {
    e.preventDefault();
    if (!reviewingDoc) return;

    setReviewLoading(true);
    try {
      const updated = await updateDocumentStatus(reviewingDoc._id, newStatus, reviewNotes);
      setDocuments((prev) =>
        prev.map((d) => (d._id === reviewingDoc._id ? updated : d))
      );
      setFeedback({
        id: reviewingDoc._id,
        type: 'success',
        message: `Status updated to ${newStatus}`,
      });
      setReviewingDoc(null);
      setTimeout(() => setFeedback({ id: null, type: '', message: '' }), 3000);
    } catch (err) {
      alert(err.message || 'Failed to update review status');
    } finally {
      setReviewLoading(false);
    }
  };

  const filteredDocs = documents.filter((d) => {
    if (statusFilter === 'all') return true;
    return d.status.toLowerCase() === statusFilter.toLowerCase();
  });

  const totalCount = documents.length;
  const approvedCount = documents.filter((d) => d.status === 'Approved').length;
  const submittedCount = documents.filter((d) => d.status === 'Submitted').length;
  const pendingCount = documents.filter((d) => d.status === 'Pending').length;
  const rejectedCount = documents.filter((d) => d.status === 'Rejected').length;
  const progressPct = totalCount > 0 ? Math.round(((approvedCount + submittedCount) / totalCount) * 100) : 0;

  return (
    <div className="documents-page animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1>
            {isStaff
              ? t('documentsTitle', 'Documents Management')
              : t('patientDocumentsTitle', 'My Documents')}
          </h1>
          <p>
            {isStaff
              ? t('documentsSubtitle', 'Manage and verify patient medical paperwork and test reports')
              : t('patientDocumentsSubtitle', 'Upload and track your clinic documents and consent forms')}
          </p>
        </div>

        {!isStaff && (
          <button
            className="btn btn-primary"
            onClick={() => {
              setShowUploadModal(true);
              setSelectedDocId('');
              setDocName('');
              setTargetFile(null);
              setUploadError('');
              setUploadSuccess('');
            }}
          >
            <Upload size={16} />
            <span>{t('uploadDocument', 'Upload Document')}</span>
          </button>
        )}
      </div>

      {/* Progress & Summary Bar */}
      <div className="card documents-summary-card">
        <div className="documents-summary-top">
          <div className="summary-stat">
            <span className="stat-label">Total Documents</span>
            <span className="stat-val">{totalCount}</span>
          </div>
          <div className="summary-stat">
            <span className="stat-label text-sage">{t('statusApproved', 'Approved')}</span>
            <span className="stat-val">{approvedCount}</span>
          </div>
          <div className="summary-stat">
            <span className="stat-label text-teal">{t('statusSubmitted', 'Submitted')}</span>
            <span className="stat-val">{submittedCount}</span>
          </div>
          <div className="summary-stat">
            <span className="stat-label text-peach">{t('statusPending', 'Pending')}</span>
            <span className="stat-val">{pendingCount}</span>
          </div>
          {rejectedCount > 0 && (
            <div className="summary-stat">
              <span className="stat-label text-danger">{t('statusRejected', 'Rejected')}</span>
              <span className="stat-val">{rejectedCount}</span>
            </div>
          )}
        </div>

        {!isStaff && totalCount > 0 && (
          <div className="doc-progress-container">
            <div className="progress-info">
              <span>Submission Progress</span>
              <strong>{progressPct}%</strong>
            </div>
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Status Filters */}
      {!loading && !error && documents.length > 0 && (
        <div className="doc-filters" role="tablist" aria-label="Filter documents by status">
          <button
            type="button"
            className={`doc-filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            <span className="doc-filter-label">{t('all', 'All')}</span>
            <span className="doc-filter-count">{totalCount}</span>
          </button>
          {STATUS_OPTIONS.map((st) => {
            const count = documents.filter((d) => d.status.toLowerCase() === st.toLowerCase()).length;
            return (
              <button
                type="button"
                key={st}
                className={`doc-filter-btn doc-filter-${st.toLowerCase()} ${
                  statusFilter.toLowerCase() === st.toLowerCase() ? 'active' : ''
                }`}
                onClick={() => setStatusFilter(st)}
              >
                <span className="doc-filter-label">{t(`status${st}`, st)}</span>
                <span className="doc-filter-count">{count}</span>
              </button>
            );
          })}
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
          <h3>Unable to load documents</h3>
          <p>{error}</p>
          <button className="btn btn-primary btn-sm" onClick={fetchDocuments}>
            <RefreshCw size={14} /> Try again
          </button>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <Inbox size={22} />
            </div>
            <h3>No documents found</h3>
            <p>
              {statusFilter !== 'all'
                ? 'No documents match the selected filter.'
                : isStaff
                ? 'No documents have been assigned or uploaded.'
                : 'No documents required at this stage.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  {isStaff && <th>{t('patientIdLabel', 'Patient ID')}</th>}
                  <th>{t('documentName', 'Document Name')}</th>
                  <th>{t('category', 'Category')}</th>
                  <th>{t('status', 'Status')}</th>
                  <th>Submission / Review</th>
                  <th>{t('actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((doc) => (
                  <tr key={doc._id}>
                    {isStaff && (
                      <td>
                        <span className="patient-id-tag">{doc.patientId}</span>
                      </td>
                    )}
                    <td>
                      <div className="doc-cell-name">
                        <div className="doc-icon-circle">
                          <FileText size={16} />
                        </div>
                        <div>
                          <strong>{doc.name}</strong>
                          {doc.reviewNotes && (
                            <span className="doc-note-preview">
                              Note: {doc.reviewNotes}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="doc-category-tag">{doc.category || 'General'}</span>
                    </td>
                    <td>
                      <span className={`badge badge-${doc.status.toLowerCase()}`}>
                        {t(`status${doc.status}`, doc.status)}
                      </span>
                    </td>
                    <td>
                      <span className="doc-date-text">
                        {doc.submittedAt ? formatDate(doc.submittedAt) : 'Pending Upload'}
                      </span>
                      {doc.reviewedBy && (
                        <span className="doc-reviewer-text">
                          by {doc.reviewedBy}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="doc-actions-cell">
                        {doc.fileUrl && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleViewDocument(doc._id)}
                            title="View / Download file"
                          >
                            <Eye size={14} /> {t('view', 'View')}
                          </button>
                        )}

                        {!isStaff && doc.status === 'Pending' && (
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => {
                              setSelectedDocId(doc._id);
                              setDocName(doc.name);
                              setCategory(doc.category || 'General');
                              setShowUploadModal(true);
                              setTargetFile(null);
                              setUploadError('');
                              setUploadSuccess('');
                            }}
                          >
                            <Upload size={14} /> {t('upload', 'Upload')}
                          </button>
                        )}

                        {isStaff && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              setReviewingDoc(doc);
                              setNewStatus(doc.status);
                              setReviewNotes(doc.reviewNotes || '');
                            }}
                          >
                            <FileCheck size={14} /> {t('updateStatus', 'Review')}
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

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-backdrop">
          <div className="modal-card card animate-scale-in">
            <div className="modal-header">
              <h3>{t('uploadDocument', 'Upload Document')}</h3>
              <button
                className="btn-icon btn-ghost"
                onClick={() => setShowUploadModal(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="modal-body">
              {uploadError && (
                <div className="login-error">
                  <AlertCircle size={16} />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadSuccess && (
                <div className="login-success">
                  <CheckCircle2 size={16} />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="upload-name">
                  {t('documentName', 'Document Title')} *
                </label>
                <input
                  id="upload-name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Identity Proof / Blood Test Report"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="upload-cat">
                  {t('category', 'Category')}
                </label>
                <select
                  id="upload-cat"
                  className="form-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  {t('selectFile', 'File (PDF, JPG, PNG up to 5MB)')} *
                </label>
                <div
                  className="file-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    onChange={handleFileChange}
                  />
                  <Upload size={24} className="text-teal" />
                  {targetFile ? (
                    <div className="selected-file-info">
                      <strong>{targetFile.name}</strong>
                      <span>({(targetFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                  ) : (
                    <div>
                      <p className="dropzone-text">{t('dropFileHere', 'Click to browse file')}</p>
                      <span className="dropzone-sub">{t('fileSizeLimit', 'PDF, JPG, PNG up to 5MB')}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowUploadModal(false)}
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={uploading || !targetFile}
                >
                  {uploading ? (
                    <>
                      <Loader2 size={16} className="login-spinner" />
                      <span>Uploading to cloud…</span>
                    </>
                  ) : (
                    <span>{t('upload', 'Upload Document')}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Review Modal */}
      {reviewingDoc && (
        <div className="modal-backdrop">
          <div className="modal-card card animate-scale-in">
            <div className="modal-header">
              <h3>Review Document Submission</h3>
              <button
                className="btn-icon btn-ghost"
                onClick={() => setReviewingDoc(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveReview} className="modal-body">
              <div className="review-meta-box">
                <div>
                  <span className="meta-label">Patient:</span>
                  <strong>{reviewingDoc.patientId}</strong>
                </div>
                <div>
                  <span className="meta-label">Document:</span>
                  <strong>{reviewingDoc.name}</strong>
                </div>
                {reviewingDoc.fileUrl && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleViewDocument(reviewingDoc._id)}
                    style={{ marginTop: '8px' }}
                  >
                    <ExternalLink size={14} /> Open File in Secure Viewer
                  </button>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">{t('status', 'Verification Status')}</label>
                <select
                  className="form-select"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  {STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="review-notes">
                  {t('reviewNotes', 'Reviewer Notes / Feedback')}
                </label>
                <textarea
                  id="review-notes"
                  className="form-input"
                  rows="3"
                  placeholder="e.g. Signature verified / Resubmit with clear scan"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setReviewingDoc(null)}
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={reviewLoading}
                >
                  {reviewLoading ? (
                    <>
                      <Loader2 size={16} className="login-spinner" />
                      <span>Saving…</span>
                    </>
                  ) : (
                    <span>Save Review Decision</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '';
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
