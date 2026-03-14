import { useEffect, useId, useRef, useState } from 'react';
import {
  FiCheck,
  FiClock,
  FiDownload,
  FiExternalLink,
  FiMail,
  FiPhone,
  FiRefreshCw,
  FiX,
  FiXCircle,
} from 'react-icons/fi';
import api from '../../lib/api.js';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import InlineAlert from '@/components/ui/InlineAlert.jsx';
import { useToast } from '@/context/ToastContext.jsx';

const ApplicationDetails = ({ application, onClose, onStatusChange }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showInterviewDialog, setShowInterviewDialog] = useState(false);
  const [interviewMessage, setInterviewMessage] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [currentStatus, setCurrentStatus] = useState(application.status);
  const [interviewSnapshot, setInterviewSnapshot] = useState({
    interviewDate: application.interviewDate || null,
    interviewStartTime: application.interviewStartTime || '',
    interviewQueueNumber: application.interviewQueueNumber || null,
  });
  const [retryingEmail, setRetryingEmail] = useState(false);
  const [emailRetryAvailable, setEmailRetryAvailable] = useState(false);
  const [emailDeliveryLogs, setEmailDeliveryLogs] = useState([]);
  const [actionNotice, setActionNotice] = useState({ tone: 'info', message: '' });
  const titleId = useId();
  const closeButtonRef = useRef(null);
  const toast = useToast();
  const canClose = !isLoading && !retryingEmail;

  useEffect(() => {
    setCurrentStatus(application.status);
    setInterviewSnapshot({
      interviewDate: application.interviewDate || null,
      interviewStartTime: application.interviewStartTime || '',
      interviewQueueNumber: application.interviewQueueNumber || null,
    });
    setRetryingEmail(false);
    setEmailRetryAvailable(false);
    setEmailDeliveryLogs([]);
    setActionNotice({ tone: 'info', message: '' });
    setInterviewMessage('');
    setInterviewDate(
      application?.interviewDate
        ? String(application.interviewDate).slice(0, 10)
        : Array.isArray(application?.job?.interviewDates) &&
            application.job.interviewDates.length > 0
          ? String(application.job.interviewDates[0]).slice(0, 10)
          : ''
    );
    setShowRejectConfirm(false);
    setShowInterviewDialog(false);
  }, [
    application.id,
    application.status,
    application.interviewDate,
    application.interviewStartTime,
    application.interviewQueueNumber,
    application.job?.interviewDates,
  ]);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && canClose) {
        event.preventDefault();
        onClose?.();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [canClose, onClose]);

  const handleStatusChange = async (statusPayload) => {
    try {
      setIsLoading(true);
      const result = await onStatusChange(application.id, statusPayload);
      if (!result?.ok) {
        setActionNotice({
          tone: 'error',
          message: result?.message || 'Failed to update application status.',
        });
        return;
      }

      const updatedStatus =
        result?.application?.status ||
        (typeof statusPayload === 'string' ? statusPayload : statusPayload?.status);
      if (updatedStatus) setCurrentStatus(updatedStatus);
      if (result?.application) {
        setInterviewSnapshot({
          interviewDate: result.application.interviewDate || null,
          interviewStartTime: result.application.interviewStartTime || '',
          interviewQueueNumber: result.application.interviewQueueNumber || null,
        });
      }

      const emailInfo = result?.emailNotification;
      const hasEmailFailure = Boolean(emailInfo?.attempted && !emailInfo?.sent);
      setEmailRetryAvailable(Boolean(hasEmailFailure && emailInfo?.retryable !== false));
      if (Array.isArray(result?.emailDeliveryLogs)) {
        setEmailDeliveryLogs(result.emailDeliveryLogs);
      }

      setActionNotice({
        tone: hasEmailFailure ? 'warning' : 'success',
        message: result?.message || `Application marked as ${updatedStatus || currentStatus}.`,
      });
    } catch (error) {
      console.error('Error updating application status:', error);
      setActionNotice({ tone: 'error', message: 'Failed to update application status.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetryEmail = async () => {
    if (!application?.id) return;

    try {
      setRetryingEmail(true);
      const payload = {};
      const note = interviewMessage.trim();
      if (currentStatus === 'INTERVIEW' && note) payload.message = note;

      const { data } = await api.post(`/applications/${application.id}/retry-email`, payload);
      const emailInfo = data?.emailNotification;
      const retryFailed = Boolean(emailInfo?.attempted && !emailInfo?.sent);

      setEmailRetryAvailable(Boolean(retryFailed && emailInfo?.retryable !== false));
      setActionNotice({
        tone: retryFailed ? 'warning' : 'success',
        message:
          data?.message || (retryFailed ? 'Email retry failed.' : 'Email sent successfully.'),
      });

      if (Array.isArray(data?.emailDeliveryLogs)) {
        setEmailDeliveryLogs(data.emailDeliveryLogs);
      }
    } catch (error) {
      console.error('Error retrying email:', error);
      setActionNotice({
        tone: 'error',
        message: error?.response?.data?.message || 'Failed to retry email notification.',
      });
    } finally {
      setRetryingEmail(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      PENDING: 'border-amber-200 bg-amber-100 text-amber-800',
      ACCEPTED: 'border-emerald-200 bg-emerald-100 text-emerald-800',
      INTERVIEW: 'border-brand-200 bg-brand-100 text-brand-800',
      APPROVED: 'border-emerald-200 bg-emerald-100 text-emerald-800',
      REJECTED: 'border-red-200 bg-red-100 text-red-800',
    };

    return (
      <span
        className={`status-pill ${statusMap[status] || 'border-slate-200 bg-slate-100 text-slate-700'}`}
      >
        {status}
      </span>
    );
  };

  const handleViewResume = async (url) => {
    try {
      if (!url) {
        toast.warning('No resume URL found.');
        return;
      }

      let viewUrl = url.trim();

      if (viewUrl.startsWith('http://localhost:3001https')) {
        viewUrl = `https${viewUrl.split('https')[1]}`;
      }

      if (viewUrl.includes('cloudinary.com') && viewUrl.toLowerCase().endsWith('.pdf')) {
        const cleanUrl = viewUrl.split('?')[0];
        window.open(cleanUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      if (viewUrl.toLowerCase().endsWith('.pdf')) {
        const googleDocsViewer = `https://docs.google.com/viewer?url=${encodeURIComponent(viewUrl)}&embedded=true`;
        window.open(googleDocsViewer, '_blank', 'noopener,noreferrer');
        return;
      }

      window.open(viewUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error viewing resume:', error);
      toast.error(`Could not open the resume: ${error.message || 'Invalid URL format'}`);
    }
  };

  const handleDownloadResume = async (url) => {
    if (!url) return;

    setIsDownloading(true);
    try {
      let downloadUrl = url.trim();

      if (downloadUrl.startsWith('http://localhost:3001https')) {
        downloadUrl = `https${downloadUrl.split('https')[1]}`;
      }

      if (downloadUrl.includes('cloudinary.com')) {
        downloadUrl = downloadUrl.split('?')[0];
        downloadUrl += '?fl_attachment=true';
      }

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';

      let filename = downloadUrl.split('/').pop().split('?')[0] || 'resume';
      if (!filename.includes('.')) filename += '.pdf';
      if (downloadUrl.startsWith('blob:') || downloadUrl.startsWith('data:')) {
        link.setAttribute('download', filename);
      }

      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
    } catch (error) {
      console.error('Error downloading resume:', error);
      toast.error('Failed to download the resume. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const isImageFile = (url) => {
    if (!url) return false;
    return ['.jpg', '.jpeg', '.png', '.gif'].some((ext) => url.toLowerCase().endsWith(ext));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && canClose) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="surface-card max-h-[90vh] w-full max-w-4xl overflow-y-auto"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="p-6">
          <div className="mb-6 flex items-start justify-between border-b border-slate-200 pb-4">
            <div>
              <p className="section-kicker">Candidate Review</p>
              <h3 id={titleId} className="mt-1 text-2xl font-semibold text-gray-900">
                Application Details
              </h3>
              <div className="mt-1 text-sm text-gray-600">
                For: <span className="font-medium">{application.job.title}</span>
              </div>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="mobile-nav-toggle -mr-1 p-2"
              disabled={!canClose}
              aria-label="Close application details"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>

          <InlineAlert message={actionNotice.message} tone={actionNotice.tone} className="mb-4" />

          <div className="grid gap-8 md:grid-cols-3">
            <div className="md:col-span-1">
              <div className="surface-panel p-6">
                <div className="flex flex-col items-center">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-2xl font-semibold text-brand-700">
                    {application.student.user.name.charAt(0).toUpperCase()}
                  </div>
                  <h4 className="text-lg font-semibold">{application.student.user.name}</h4>
                  <div className="mt-1 text-sm text-gray-500">
                    {application.student.college || 'Student'}
                  </div>
                  {getStatusBadge(currentStatus)}
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center text-gray-700">
                    <FiMail className="mr-2 text-gray-500" />
                    <span className="truncate">{application.student.user.email}</span>
                  </div>
                  {application.student.phone && (
                    <div className="flex items-center text-gray-700">
                      <FiPhone className="mr-2 text-gray-500" />
                      <span>{application.student.phone}</span>
                    </div>
                  )}
                  {application.student.course && (
                    <div className="text-sm text-gray-600">
                      <div className="font-medium">Course</div>
                      <div>{application.student.course}</div>
                    </div>
                  )}
                  {application.student.graduationYear && (
                    <div className="text-sm text-gray-600">
                      <div className="font-medium">Graduation Year</div>
                      <div>{application.student.graduationYear}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="mb-6">
                <h4 className="mb-2 font-medium text-gray-900">Cover Letter</h4>
                <div className="surface-panel min-h-[100px] p-4 text-gray-700">
                  {application.coverLetter || 'No cover letter provided.'}
                </div>
              </div>

              {currentStatus === 'INTERVIEW' && (
                <div className="mb-6 surface-panel p-4">
                  <h4 className="mb-2 font-medium text-gray-900">Interview Assignment</h4>
                  <div className="space-y-1 text-sm text-gray-700">
                    <p>
                      <span className="font-medium">Date:</span>{' '}
                      {interviewSnapshot.interviewDate
                        ? new Date(interviewSnapshot.interviewDate).toLocaleDateString()
                        : '-'}
                    </p>
                    <p>
                      <span className="font-medium">Start Time:</span>{' '}
                      {interviewSnapshot.interviewStartTime || '-'}
                    </p>
                    <p>
                      <span className="font-medium">Queue Number:</span>{' '}
                      {interviewSnapshot.interviewQueueNumber || '-'}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <h4 className="mb-3 font-medium text-gray-900">Resume / CV</h4>
                {application.student?.resumeUrl ? (
                  <div className="surface-panel p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="mr-3 rounded-lg bg-brand-50 p-2">
                          <svg
                            className="h-6 w-6 text-brand-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {application.student.resumeUrl.split('/').pop().split('?')[0] ||
                              'Resume'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {application.student.resumeUrl.toLowerCase().endsWith('.pdf')
                              ? 'PDF Document'
                              : 'Document'}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => handleViewResume(application.student.resumeUrl)}
                          className="btn-soft p-2 text-slate-600 disabled:opacity-50"
                          title="View Resume"
                          disabled={isDownloading || !application.student?.resumeUrl}
                        >
                          <FiExternalLink className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadResume(application.student.resumeUrl)}
                          className="btn-soft p-2 text-slate-600 disabled:opacity-50"
                          title="Download Resume"
                          disabled={isDownloading || !application.student?.resumeUrl}
                        >
                          <FiDownload
                            className={`h-5 w-5 ${isDownloading ? 'animate-pulse' : ''}`}
                          />
                        </button>
                      </div>
                    </div>

                    {application.student?.resumeUrl?.toLowerCase().endsWith('.pdf') && (
                      <div className="mt-4 surface-panel bg-slate-50/80 p-4">
                        <div className="text-center">
                          <svg
                            className="mx-auto h-12 w-12 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1"
                              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                          </svg>
                          <h3 className="mt-2 text-sm font-medium text-gray-900">PDF Document</h3>
                          <p className="mt-1 text-sm text-gray-500">Click view to open the PDF.</p>
                          <div className="mt-4">
                            <button
                              type="button"
                              onClick={() => handleViewResume(application.student.resumeUrl)}
                              className="btn-brand"
                            >
                              <FiExternalLink className="-ml-1 mr-2 h-5 w-5" />
                              Open PDF
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {isImageFile(application.student?.resumeUrl) && (
                      <div className="mt-4">
                        <img
                          src={application.student.resumeUrl}
                          alt="Resume Preview"
                          className="h-auto max-h-96 w-full rounded border object-contain"
                          onError={(event) => {
                            const target = event.target;
                            target.onerror = null;
                            target.src = '/placeholder-document.png';
                          }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="empty-shell py-8">No resume uploaded</div>
                )}
              </div>

              {emailDeliveryLogs.length > 0 && (
                <div className="mt-6 surface-panel p-4">
                  <h5 className="text-sm font-semibold text-gray-900">Email Delivery Logs</h5>
                  <div className="mt-3 max-h-48 space-y-2 overflow-auto pr-1">
                    {emailDeliveryLogs.map((entry) => {
                      const metadata = entry?.metadata || {};
                      const sent = metadata?.sent === true;
                      return (
                        <div
                          key={entry.id}
                          className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-gray-700"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-medium">
                              {metadata?.attemptType || 'status_update'}
                            </span>
                            <span>{new Date(entry.createdAt).toLocaleString()}</span>
                          </div>
                          <div className="mt-1 flex items-center justify-between gap-3">
                            <span>Status: {metadata?.status || currentStatus}</span>
                            <span className={sent ? 'text-green-700' : 'text-amber-700'}>
                              {sent ? 'Sent' : 'Failed'}
                            </span>
                          </div>
                          {metadata?.message && (
                            <div className="mt-1 text-gray-600">{metadata.message}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
            {emailRetryAvailable &&
              (currentStatus === 'INTERVIEW' || currentStatus === 'ACCEPTED') && (
                <button
                  type="button"
                  onClick={handleRetryEmail}
                  disabled={retryingEmail || isLoading}
                  className="btn-soft border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                >
                  <FiRefreshCw className={`mr-2 h-4 w-4 ${retryingEmail ? 'animate-spin' : ''}`} />
                  {retryingEmail ? 'Retrying Email...' : 'Retry Email'}
                </button>
              )}

            {currentStatus !== 'REJECTED' && (
              <button
                type="button"
                onClick={() => setShowRejectConfirm(true)}
                disabled={isLoading || retryingEmail}
                className="btn-danger disabled:opacity-50"
              >
                <FiXCircle className="mr-2 h-4 w-4" />
                Reject
              </button>
            )}

            {(currentStatus === 'PENDING' ||
              currentStatus === 'ACCEPTED' ||
              currentStatus === 'INTERVIEW') && (
              <button
                type="button"
                onClick={() => setShowInterviewDialog(true)}
                disabled={isLoading || retryingEmail}
                className="btn-soft border-brand-300 bg-brand-50 text-brand-700 hover:bg-brand-100 disabled:opacity-50"
              >
                <FiMail className="mr-2 h-4 w-4" />
                {currentStatus === 'INTERVIEW' ? 'Reschedule Interview' : 'Assign Interview Slot'}
              </button>
            )}

            {(currentStatus === 'PENDING' || currentStatus === 'INTERVIEW') && (
              <button
                type="button"
                onClick={() => handleStatusChange('ACCEPTED')}
                disabled={isLoading || retryingEmail}
                className="btn-brand from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50"
              >
                <FiCheck className="mr-2 h-4 w-4" />
                Accept
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="btn-soft disabled:opacity-50"
              disabled={isLoading || retryingEmail}
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showRejectConfirm}
        title="Reject Application"
        description={`Are you sure you want to reject ${application.student.user.name}?`}
        confirmText="Reject"
        confirmVariant="danger"
        busy={isLoading}
        onCancel={() => setShowRejectConfirm(false)}
        onConfirm={async () => {
          setShowRejectConfirm(false);
          await handleStatusChange('REJECTED');
        }}
      />

      <ConfirmDialog
        open={showInterviewDialog}
        title={currentStatus === 'INTERVIEW' ? 'Reschedule Interview' : 'Assign Interview Slot'}
        description="Select interview date and optional note."
        confirmText={currentStatus === 'INTERVIEW' ? 'Save Schedule' : 'Assign Slot'}
        confirmVariant="primary"
        busy={isLoading}
        onCancel={() => {
          setShowInterviewDialog(false);
          setInterviewMessage('');
        }}
        onConfirm={async () => {
          if (!interviewDate) {
            setActionNotice({ tone: 'error', message: 'Please select an interview date.' });
            return;
          }
          const message = interviewMessage.trim();
          setShowInterviewDialog(false);
          await handleStatusChange({ status: 'INTERVIEW', message, interviewDate });
        }}
      >
        <label className="mb-3 block text-sm font-medium text-gray-700">
          Interview Date
          <select
            value={interviewDate}
            onChange={(event) => setInterviewDate(event.target.value)}
            className="select-field mt-1"
          >
            <option value="">Select date</option>
            {Array.isArray(application?.job?.interviewDates) &&
              application.job.interviewDates.map((dateValue) => {
                const value = String(dateValue || '').slice(0, 10);
                return (
                  <option key={value} value={value}>
                    {new Date(value).toLocaleDateString()}
                  </option>
                );
              })}
          </select>
        </label>

        <textarea
          rows={4}
          value={interviewMessage}
          onChange={(event) => setInterviewMessage(event.target.value)}
          className="textarea-field min-h-0"
          placeholder="Optional: meeting link, preparation notes..."
        />

        {(currentStatus === 'INTERVIEW' || currentStatus === 'ACCEPTED') && (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <div className="flex items-start gap-2">
              <FiClock className="mt-0.5 h-3.5 w-3.5" />
              <span>
                Interview note is optional now, and can also be used while retrying email later.
              </span>
            </div>
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
};

export default ApplicationDetails;
