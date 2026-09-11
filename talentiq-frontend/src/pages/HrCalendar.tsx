import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Mail,
  Plus, X, Check, AlertCircle, Trash2, Video, ExternalLink, CheckCircle2
} from 'lucide-react';
import { HrSidebar } from '../components/HrSidebar';
import '../css/hr-calendar.css';

/* ─── Types ─── */
interface InterviewSlot {
  id: number;
  applicationId: number;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  scheduledAt: string;
  durationMinutes: number;
  meetingLink?: string;
  notes?: string;
  status: string;
}

interface Application {
  id: number;
  candidate: { user: { firstName: string; lastName: string; email: string } };
  job: { id: number; title: string };
  status: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  PENDING: { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' },
  CONFIRMED: { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' },
  COMPLETED: { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
  CANCELLED: { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const HrCalendar: React.FC = () => {
  const [slots, setSlots] = useState<InterviewSlot[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar navigation
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Modals
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [showDayModal, setShowDayModal] = useState(false);
  const [meetingMode, setMeetingMode] = useState<'APPLICATION' | 'CUSTOM'>('APPLICATION');

  // Forms
  const [scheduleForm, setScheduleForm] = useState({
    applicationId: '',
    candidateName: '',
    candidateEmail: '',
    jobTitle: '',
    scheduledAt: '',
    durationMinutes: 60,
    meetingLink: '',
    notes: ''
  });
  const [selectForm, setSelectForm] = useState({ applicationId: '', customMessage: '' });

  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  /* ─── Fetch data ─── */
  const fetchData = async () => {
    try {
      setLoading(true);
      const [slotsRes, appsRes] = await Promise.all([
        apiClient.get('/interviews/calendar').catch(() => ({ data: { data: [] } })),
        apiClient.get('/applications/hr?size=50&sort=appliedAt,desc').catch(() => ({ data: { data: { content: [] } } })),
      ]);
      setSlots(slotsRes.data?.data || []);
      setApplications(appsRes.data?.data?.content || []);
    } catch {
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* ─── Calendar helpers ─── */
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();

  const getSlotsForDay = (day: number): InterviewSlot[] => {
    return slots.filter(slot => {
      const d = new Date(slot.scheduledAt);
      return d.getFullYear() === viewYear && d.getMonth() === viewMonth && d.getDate() === day;
    });
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
    setSelectedDay(null);
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatFull = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  const isMeetingPast = (iso: string) => {
    return new Date(iso) < new Date();
  };

  /* ─── Open Schedule Modal for a specific date ─── */
  const openScheduleForDay = (day: number) => {
    const d = new Date(viewYear, viewMonth, day, 10, 0);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    setScheduleForm({
      applicationId: '',
      candidateName: '',
      candidateEmail: '',
      jobTitle: '',
      scheduledAt: localIso,
      durationMinutes: 60,
      meetingLink: 'https://meet.google.com/new',
      notes: ''
    });
    setShowDayModal(false);
    setShowScheduleModal(true);
  };

  /* ─── Schedule interview ─── */
  const handleSchedule = async () => {
    if (!scheduleForm.scheduledAt) return;
    if (meetingMode === 'APPLICATION' && !scheduleForm.applicationId) return;
    if (meetingMode === 'CUSTOM' && (!scheduleForm.candidateName || !scheduleForm.candidateEmail)) return;

    try {
      setActionLoading(true);
      const payload: any = {
        scheduledAt: new Date(scheduleForm.scheduledAt).toISOString(),
        durationMinutes: scheduleForm.durationMinutes,
        meetingLink: scheduleForm.meetingLink || undefined,
        notes: scheduleForm.notes || undefined,
      };

      if (meetingMode === 'APPLICATION') {
        payload.applicationId = parseInt(scheduleForm.applicationId);
      } else {
        payload.candidateName = scheduleForm.candidateName;
        payload.candidateEmail = scheduleForm.candidateEmail;
        payload.jobTitle = scheduleForm.jobTitle || 'Interview Meeting';
      }

      await apiClient.post('/interviews/schedule', payload);
      setActionMsg({ type: 'success', text: 'Meeting scheduled successfully! Candidate notified via email.' });
      setShowScheduleModal(false);
      setScheduleForm({
        applicationId: '',
        candidateName: '',
        candidateEmail: '',
        jobTitle: '',
        scheduledAt: '',
        durationMinutes: 60,
        meetingLink: '',
        notes: ''
      });
      fetchData();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to schedule meeting.' });
    } finally {
      setActionLoading(false);
    }
  };

  /* ─── Send selection email ─── */
  const handleSelect = async () => {
    if (!selectForm.applicationId) return;
    try {
      setActionLoading(true);
      await apiClient.post('/interviews/select', {
        applicationId: parseInt(selectForm.applicationId),
        customMessage: selectForm.customMessage || undefined,
      });
      setActionMsg({ type: 'success', text: 'Selection email sent successfully to candidate!' });
      setShowSelectModal(false);
      setSelectForm({ applicationId: '', customMessage: '' });
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to send selection email.' });
    } finally {
      setActionLoading(false);
    }
  };

  /* ─── Update slot status ─── */
  const updateStatus = async (slotId: number, status: string) => {
    try {
      await apiClient.put(`/interviews/${slotId}/status`, { status });
      setActionMsg({ type: 'info', text: `Status updated to ${status}` });
      fetchData();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: 'Failed to update interview status.' });
    }
  };

  /* ─── Delete or Deactivate meeting ─── */
  const handleDeleteMeeting = async (slot: InterviewSlot) => {
    const past = isMeetingPast(slot.scheduledAt);
    if (past) {
      try {
        await apiClient.delete(`/interviews/${slot.id}`);
        setActionMsg({
          type: 'info',
          text: 'Meeting has already passed. It is now archived as COMPLETED in history.'
        });
        fetchData();
      } catch {
        setActionMsg({ type: 'error', text: 'Failed to update past meeting.' });
      }
      return;
    }

    if (window.confirm(`Are you sure you want to cancel and delete the scheduled meeting with ${slot.candidateName}?`)) {
      try {
        await apiClient.delete(`/interviews/${slot.id}`);
        setActionMsg({ type: 'success', text: `Scheduled meeting for ${slot.candidateName} was deleted.` });
        fetchData();
      } catch (err: any) {
        setActionMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to delete meeting.' });
      }
    }
  };

  const selectedDaySlots = selectedDay ? getSlotsForDay(selectedDay) : [];

  return (
    <div className="cal-page-layout">
      {/* ── Stable HR Sidebar ── */}
      <HrSidebar activeNav="Calendar" />

      {/* ── Main Workspace ── */}
      <main className="cal-main-content">
        {/* Header Bar */}
        <header className="cal-top-header">
          <div className="cal-header-left">
            <h1 className="cal-title">Interview Calendar & Meetings</h1>
            <p className="cal-subtitle">
              Schedule candidate interviews, manage Google Meet sessions, and track hiring progress.
            </p>
          </div>

          <div className="cal-header-actions">
            <button
              type="button"
              onClick={() => setShowSelectModal(true)}
              className="cal-btn-secondary"
            >
              <Mail size={15} />
              <span>Select Candidate</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setScheduleForm({
                  applicationId: '',
                  candidateName: '',
                  candidateEmail: '',
                  jobTitle: '',
                  scheduledAt: '',
                  durationMinutes: 60,
                  meetingLink: 'https://meet.google.com/new',
                  notes: ''
                });
                setShowScheduleModal(true);
              }}
              className="cal-btn-primary"
            >
              <Plus size={16} />
              <span>Create Meeting</span>
            </button>
          </div>
        </header>

        {/* Action Alert Banner */}
        {actionMsg && (
          <div className={`cal-alert-banner ${actionMsg.type}`}>
            <span>{actionMsg.text}</span>
            <button
              type="button"
              onClick={() => setActionMsg(null)}
              className="cal-alert-close"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Calendar Grid & Right Side List */}
        <div className="cal-grid-layout">
          {/* Calendar Card */}
          <div className="cal-card cal-card-calendar">
            <div className="cal-month-header">
              <div className="cal-month-title-wrap">
                <CalendarIcon size={20} className="cal-month-icon" />
                <h2 className="cal-month-title">{MONTHS[viewMonth]} {viewYear}</h2>
              </div>
              <div className="cal-nav-buttons">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="cal-nav-arrow"
                  aria-label="Previous month"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="cal-nav-arrow"
                  aria-label="Next month"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Weekdays Row */}
            <div className="cal-weekdays">
              {DAYS.map(d => (
                <div key={d} className="cal-weekday-cell">{d}</div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="cal-days-grid">
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="cal-day-cell cal-day-empty" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const daySlots = getSlotsForDay(day);
                const isToday =
                  today.getDate() === day &&
                  today.getMonth() === viewMonth &&
                  today.getFullYear() === viewYear;
                const isSelected = selectedDay === day;
                const isPast = new Date(viewYear, viewMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());

                return (
                  <div
                    key={day}
                    onClick={() => {
                      setSelectedDay(day);
                      setShowDayModal(true);
                    }}
                    className={`cal-day-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${isPast ? 'past' : ''}`}
                  >
                    <div className="cal-day-header">
                      <span className={`cal-day-number ${isToday ? 'today-badge' : ''}`}>{day}</span>
                      {daySlots.length > 0 && (
                        <span className="cal-day-slot-count">{daySlots.length}</span>
                      )}
                    </div>

                    <div className="cal-day-events">
                      {daySlots.slice(0, 2).map((slot, si) => {
                        const pastSlot = isMeetingPast(slot.scheduledAt);
                        const statusStyle = pastSlot
                          ? { bg: '#F1F5F9', text: '#64748B', border: '#E2E8F0' }
                          : (STATUS_COLORS[slot.status] || STATUS_COLORS.PENDING);

                        return (
                          <div
                            key={si}
                            className="cal-event-pill"
                            style={{
                              backgroundColor: statusStyle.bg,
                              color: statusStyle.text,
                              borderColor: statusStyle.border,
                            }}
                            title={`${formatTime(slot.scheduledAt)} - ${slot.candidateName} (${slot.jobTitle})`}
                          >
                            <span className="cal-pill-time">{formatTime(slot.scheduledAt)}</span>
                            <span className="cal-pill-name">{slot.candidateName}</span>
                          </div>
                        );
                      })}
                      {daySlots.length > 2 && (
                        <span className="cal-more-events">+{daySlots.length - 2} more</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Status Legend */}
            <div className="cal-legend">
              {Object.entries(STATUS_COLORS).map(([status, style]) => (
                <div key={status} className="cal-legend-item">
                  <span className="cal-legend-dot" style={{ backgroundColor: style.text }} />
                  <span className="cal-legend-label">{status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Rail: Scheduled Meetings List */}
          <div className="cal-card cal-card-list">
            <div className="cal-list-header">
              <h3 className="cal-list-title">All Scheduled Meetings ({slots.length})</h3>
              <button
                type="button"
                onClick={() => {
                  setScheduleForm({
                    applicationId: '',
                    candidateName: '',
                    candidateEmail: '',
                    jobTitle: '',
                    scheduledAt: '',
                    durationMinutes: 60,
                    meetingLink: 'https://meet.google.com/new',
                    notes: ''
                  });
                  setShowScheduleModal(true);
                }}
                className="cal-list-add-btn"
              >
                <Plus size={14} />
                <span>Add</span>
              </button>
            </div>

            {loading ? (
              <div className="cal-empty-state">Loading meetings...</div>
            ) : slots.length === 0 ? (
              <div className="cal-empty-state">
                <CalendarIcon size={36} className="cal-empty-icon" />
                <div className="cal-empty-title">No meetings scheduled</div>
                <p className="cal-empty-desc">Create your first interview meeting to get started.</p>
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(true)}
                  className="cal-btn-primary"
                  style={{ marginTop: 12 }}
                >
                  <Plus size={14} />
                  <span>Create First Meeting</span>
                </button>
              </div>
            ) : (
              <div className="cal-meeting-scroll-list">
                {slots.map(slot => {
                  const past = isMeetingPast(slot.scheduledAt);
                  const displayStatus = past ? 'COMPLETED' : slot.status;
                  const statusStyle = past
                    ? { bg: '#F1F5F9', text: '#64748B', border: '#E2E8F0' }
                    : (STATUS_COLORS[slot.status] || STATUS_COLORS.PENDING);

                  return (
                    <div key={slot.id} className="cal-meeting-card">
                      <div className="cal-meeting-header">
                        <div className="cal-meeting-candidate">
                          <div className="cal-meeting-name">{slot.candidateName}</div>
                          <div className="cal-meeting-job">{slot.jobTitle}</div>
                        </div>
                        <span
                          className="cal-status-badge"
                          style={{
                            backgroundColor: statusStyle.bg,
                            color: statusStyle.text,
                            borderColor: statusStyle.border,
                          }}
                        >
                          {displayStatus}
                        </span>
                      </div>

                      <div className="cal-meeting-meta">
                        <Clock size={13} className="cal-meta-icon" />
                        <span>{formatFull(slot.scheduledAt)} ({slot.durationMinutes} min)</span>
                      </div>

                      {slot.meetingLink && (
                        <div className="cal-meeting-link-wrap">
                          <a
                            href={slot.meetingLink}
                            target="_blank"
                            rel="noreferrer"
                            className="cal-meeting-link-btn"
                          >
                            <Video size={13} />
                            <span>Join Video Meeting</span>
                            <ExternalLink size={11} />
                          </a>
                        </div>
                      )}

                      <div className="cal-meeting-actions">
                        {!past && slot.status === 'PENDING' && (
                          <button
                            type="button"
                            onClick={() => updateStatus(slot.id, 'CONFIRMED')}
                            className="cal-action-confirm"
                          >
                            <Check size={13} />
                            <span>Confirm</span>
                          </button>
                        )}

                        {past ? (
                          <div className="cal-action-archived">
                            <CheckCircle2 size={13} />
                            <span>Archived</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDeleteMeeting(slot)}
                            className="cal-action-delete"
                            title="Cancel and delete meeting"
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Create / Schedule Modal ── */}
      {showScheduleModal && (
        <div className="cal-modal-backdrop" onClick={() => setShowScheduleModal(false)}>
          <div className="cal-modal-card" onClick={e => e.stopPropagation()}>
            <div className="cal-modal-top">
              <h2 className="cal-modal-heading">Create & Schedule Meeting</h2>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="cal-modal-close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Mode Selector */}
            <div className="cal-mode-toggle">
              <button
                type="button"
                className={`cal-mode-btn ${meetingMode === 'APPLICATION' ? 'active' : ''}`}
                onClick={() => setMeetingMode('APPLICATION')}
              >
                Candidate Applicant
              </button>
              <button
                type="button"
                className={`cal-mode-btn ${meetingMode === 'CUSTOM' ? 'active' : ''}`}
                onClick={() => setMeetingMode('CUSTOM')}
              >
                Direct / Custom Meeting
              </button>
            </div>

            <div className="cal-modal-body">
              {meetingMode === 'APPLICATION' ? (
                <div className="cal-form-group">
                  <label className="cal-form-label">Select Candidate Application *</label>
                  <select
                    value={scheduleForm.applicationId}
                    onChange={e => setScheduleForm(f => ({ ...f, applicationId: e.target.value }))}
                    className="cal-select"
                  >
                    <option value="">— Choose candidate application —</option>
                    {applications.map(app => (
                      <option key={app.id} value={app.id}>
                        {app.candidate?.user?.firstName} {app.candidate?.user?.lastName} — {app.job?.title} ({app.status})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div className="cal-form-row">
                    <div className="cal-form-group">
                      <label className="cal-form-label">Candidate Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Alex Smith"
                        value={scheduleForm.candidateName}
                        onChange={e => setScheduleForm(f => ({ ...f, candidateName: e.target.value }))}
                        className="cal-input"
                      />
                    </div>
                    <div className="cal-form-group">
                      <label className="cal-form-label">Candidate Email *</label>
                      <input
                        type="email"
                        placeholder="alex.smith@example.com"
                        value={scheduleForm.candidateEmail}
                        onChange={e => setScheduleForm(f => ({ ...f, candidateEmail: e.target.value }))}
                        className="cal-input"
                      />
                    </div>
                  </div>
                  <div className="cal-form-group">
                    <label className="cal-form-label">Job Title / Meeting Topic</label>
                    <input
                      type="text"
                      placeholder="e.g. Senior Frontend Engineer Interview"
                      value={scheduleForm.jobTitle}
                      onChange={e => setScheduleForm(f => ({ ...f, jobTitle: e.target.value }))}
                      className="cal-input"
                    />
                  </div>
                </>
              )}

              <div className="cal-form-row">
                <div className="cal-form-group">
                  <label className="cal-form-label">Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={scheduleForm.scheduledAt}
                    onChange={e => setScheduleForm(f => ({ ...f, scheduledAt: e.target.value }))}
                    className="cal-input"
                  />
                </div>
                <div className="cal-form-group">
                  <label className="cal-form-label">Duration</label>
                  <select
                    value={scheduleForm.durationMinutes}
                    onChange={e => setScheduleForm(f => ({ ...f, durationMinutes: parseInt(e.target.value) }))}
                    className="cal-select"
                  >
                    {[15, 30, 45, 60, 90, 120].map(d => (
                      <option key={d} value={d}>{d} minutes</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="cal-form-group">
                <div className="cal-label-row">
                  <label className="cal-form-label">Meeting Link (Google Meet / Zoom)</label>
                  <button
                    type="button"
                    onClick={() => setScheduleForm(f => ({ ...f, meetingLink: 'https://meet.google.com/new' }))}
                    className="cal-text-btn"
                  >
                    + Auto-fill Google Meet
                  </button>
                </div>
                <input
                  type="url"
                  placeholder="https://meet.google.com/..."
                  value={scheduleForm.meetingLink}
                  onChange={e => setScheduleForm(f => ({ ...f, meetingLink: e.target.value }))}
                  className="cal-input"
                />
              </div>

              <div className="cal-form-group">
                <label className="cal-form-label">Notes & Agenda</label>
                <textarea
                  value={scheduleForm.notes}
                  onChange={e => setScheduleForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Topics to cover, technical evaluation notes..."
                  rows={3}
                  className="cal-textarea"
                />
              </div>

              <div className="cal-modal-footer">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="cal-btn-cancel"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSchedule}
                  disabled={
                    actionLoading ||
                    !scheduleForm.scheduledAt ||
                    (meetingMode === 'APPLICATION' && !scheduleForm.applicationId) ||
                    (meetingMode === 'CUSTOM' && !scheduleForm.candidateName)
                  }
                  className="cal-btn-primary"
                >
                  {actionLoading ? 'Scheduling...' : 'Schedule & Send Invite'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Select Candidate Modal ── */}
      {showSelectModal && (
        <div className="cal-modal-backdrop" onClick={() => setShowSelectModal(false)}>
          <div className="cal-modal-card" onClick={e => e.stopPropagation()}>
            <div className="cal-modal-top">
              <h2 className="cal-modal-heading">Send Selection Email</h2>
              <button
                type="button"
                onClick={() => setShowSelectModal(false)}
                className="cal-modal-close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="cal-info-notice">
              <AlertCircle size={16} className="cal-info-icon" />
              <div className="cal-info-text">
                This will send an official congratulatory selection email to the candidate.
              </div>
            </div>

            <div className="cal-modal-body">
              <div className="cal-form-group">
                <label className="cal-form-label">Select Application *</label>
                <select
                  value={selectForm.applicationId}
                  onChange={e => setSelectForm(f => ({ ...f, applicationId: e.target.value }))}
                  className="cal-select"
                >
                  <option value="">— Choose candidate —</option>
                  {applications.map(app => (
                    <option key={app.id} value={app.id}>
                      {app.candidate?.user?.firstName} {app.candidate?.user?.lastName} — {app.job?.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="cal-form-group">
                <label className="cal-form-label">Custom Message (Optional)</label>
                <textarea
                  value={selectForm.customMessage}
                  onChange={e => setSelectForm(f => ({ ...f, customMessage: e.target.value }))}
                  placeholder="Congratulations! We are delighted to extend an offer..."
                  rows={4}
                  className="cal-textarea"
                />
              </div>

              <div className="cal-modal-footer">
                <button
                  type="button"
                  onClick={() => setShowSelectModal(false)}
                  className="cal-btn-cancel"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSelect}
                  disabled={actionLoading || !selectForm.applicationId}
                  className="cal-btn-success"
                >
                  {actionLoading ? 'Sending...' : 'Send Selection Email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Day Details Modal ── */}
      {showDayModal && selectedDay && (
        <div className="cal-modal-backdrop" onClick={() => setShowDayModal(false)}>
          <div className="cal-modal-card" onClick={e => e.stopPropagation()}>
            <div className="cal-modal-top">
              <div>
                <h2 className="cal-modal-heading">
                  {MONTHS[viewMonth]} {selectedDay}, {viewYear}
                </h2>
                <p className="cal-modal-subheading">
                  {selectedDaySlots.length} meeting(s) scheduled on this day
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDayModal(false)}
                className="cal-modal-close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="cal-modal-body">
              <div className="cal-day-slot-list">
                {selectedDaySlots.length === 0 ? (
                  <div className="cal-empty-day">No meetings scheduled for this date.</div>
                ) : (
                  selectedDaySlots.map(slot => {
                    const past = isMeetingPast(slot.scheduledAt);
                    const displayStatus = past ? 'COMPLETED' : slot.status;
                    const statusStyle = past
                      ? { bg: '#F1F5F9', text: '#64748B', border: '#E2E8F0' }
                      : (STATUS_COLORS[slot.status] || STATUS_COLORS.PENDING);

                    return (
                      <div key={slot.id} className="cal-day-meeting-item">
                        <div className="cal-day-meeting-top">
                          <div>
                            <div className="cal-day-meeting-name">{slot.candidateName}</div>
                            <div className="cal-day-meeting-job">{slot.jobTitle}</div>
                          </div>
                          <span
                            className="cal-status-badge"
                            style={{
                              backgroundColor: statusStyle.bg,
                              color: statusStyle.text,
                              borderColor: statusStyle.border,
                            }}
                          >
                            {displayStatus}
                          </span>
                        </div>

                        <div className="cal-day-meeting-time">
                          <Clock size={12} />
                          <span>{formatTime(slot.scheduledAt)} ({slot.durationMinutes} min)</span>
                        </div>

                        {slot.meetingLink && (
                          <a
                            href={slot.meetingLink}
                            target="_blank"
                            rel="noreferrer"
                            className="cal-day-meet-link"
                          >
                            <Video size={12} />
                            <span>Join Video Meeting</span>
                          </a>
                        )}

                        <div className="cal-day-meeting-actions">
                          {past ? (
                            <span className="cal-action-archived-sm">
                              <CheckCircle2 size={12} />
                              <span>Archived</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setShowDayModal(false);
                                handleDeleteMeeting(slot);
                              }}
                              className="cal-action-delete-sm"
                            >
                              <Trash2 size={12} />
                              <span>Delete Meeting</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="cal-modal-footer">
                <button
                  type="button"
                  onClick={() => setShowDayModal(false)}
                  className="cal-btn-cancel"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => openScheduleForDay(selectedDay)}
                  className="cal-btn-primary"
                >
                  <Plus size={15} />
                  <span>Add on this Day</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HrCalendar;
