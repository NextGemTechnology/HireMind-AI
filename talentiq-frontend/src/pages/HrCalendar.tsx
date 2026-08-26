import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { apiClient } from '../api/client';
import {
  Calendar, ChevronLeft, ChevronRight, Clock, Mail,
  Plus, X, Check,
  AlertCircle, Sun, Trash2, Video, ExternalLink,
  CheckCircle2, Moon
} from 'lucide-react';
import { InteractiveGalaxyBackground } from '../components/InteractiveGalaxyBackground';
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

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#F59E0B',
  CONFIRMED: '#10B981',
  COMPLETED: '#3B82F6',
  CANCELLED: '#EF4444',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export const HrCalendar: React.FC = () => {
  const { theme, toggleTheme, isUniverse } = useTheme();

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
        apiClient.get('/interviews/calendar'),
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
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
    setSelectedDay(null);
  };

  const formatTime = (iso: string) => {
    try { return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  };
  const formatFull = (iso: string) => {
    try { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  };

  const isMeetingPast = (iso: string) => {
    return new Date(iso) < new Date();
  };

  /* ─── Open Schedule Modal for a specific date ─── */
  const openScheduleForDay = (day: number) => {
    const d = new Date(viewYear, viewMonth, day, 10, 0);
    // Format YYYY-MM-DDTHH:mm for datetime-local input
    const pad = (n: number) => n.toString().padStart(2, '0');
    const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    
    setScheduleForm({
      applicationId: '',
      candidateName: '',
      candidateEmail: '',
      jobTitle: '',
      scheduledAt: localIso,
      durationMinutes: 60,
      meetingLink: `https://meet.google.com/new`,
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
      setActionMsg({ type: 'success', text: '✅ Meeting scheduled successfully! Candidate notified via email.' });
      setShowScheduleModal(false);
      setScheduleForm({
        applicationId: '', candidateName: '', candidateEmail: '',
        jobTitle: '', scheduledAt: '', durationMinutes: 60, meetingLink: '', notes: ''
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
      setActionMsg({ type: 'success', text: '🎉 Selection email sent successfully to candidate!' });
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
      // Meeting time is over -> Cannot delete; deactivate / mark completed
      try {
        await apiClient.delete(`/interviews/${slot.id}`);
        setActionMsg({
          type: 'info',
          text: `ℹ️ Meeting time has already passed. The meeting has been archived as COMPLETED in history and cannot be deleted.`
        });
        fetchData();
      } catch {
        setActionMsg({ type: 'error', text: 'Failed to deactivate past meeting.' });
      }
      return;
    }

    // Future meeting -> Ask confirmation to delete
    if (window.confirm(`Are you sure you want to cancel and delete the scheduled meeting with ${slot.candidateName}?`)) {
      try {
        await apiClient.delete(`/interviews/${slot.id}`);
        setActionMsg({ type: 'success', text: `🗑️ Scheduled meeting for ${slot.candidateName} was deleted.` });
        fetchData();
      } catch (err: any) {
        setActionMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to delete meeting.' });
      }
    }
  };

  const selectedDaySlots = selectedDay ? getSlotsForDay(selectedDay) : [];

  const Backdrop: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <div onClick={onClose} className="cal-modal-overlay" />
  );

  return (
    <div className={`calendar-page-wrapper ${isUniverse ? 'theme-universe' : 'theme-light'}`}>
      <InteractiveGalaxyBackground theme={theme} />
      {/* ── Left Sidebar (Unified Stable HR Sidebar) ── */}
      <HrSidebar activeNav="Calendar" />

      {/* ── Main Content ── */}
      <main className="cal-main-workspace">
        {/* Header bar */}
        <div className="cal-header-bar">
          <div>
            <h1 className="cal-header-title">Interview Calendar & Meetings</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: isUniverse ? '#94A3B8' : '#475569' }}>
              Schedule candidate interviews, launch Google Meet calls, and manage hiring timeline
            </p>
          </div>
          <div className="cal-header-actions">
            {/* Theme Toggle Button */}
            <button onClick={toggleTheme} className="cal-theme-btn">
              {isUniverse ? <Sun size={14} color="#F59E0B" /> : <Moon size={14} color="#7C3AED" />}
              {isUniverse ? 'Light Mode' : 'Galaxy Universe'}
            </button>
            <button onClick={() => setShowSelectModal(true)} className="cal-btn-select">
              <Mail size={15} /> Select Candidate
            </button>
            <button onClick={() => {
              setScheduleForm({
                applicationId: '', candidateName: '', candidateEmail: '',
                jobTitle: '', scheduledAt: '', durationMinutes: 60,
                meetingLink: 'https://meet.google.com/new', notes: ''
              });
              setShowScheduleModal(true);
            }} className="cal-btn-schedule">
              <Plus size={15} /> Create Meeting
            </button>
          </div>
        </div>

        <div className="cal-content-body">
          {actionMsg && (
            <div style={{
              padding: '12px 20px', borderRadius: 10, marginBottom: 20,
              background: actionMsg.type === 'success' ? 'rgba(16,185,129,0.12)' : actionMsg.type === 'info' ? 'rgba(59,130,246,0.12)' : 'rgba(239,68,68,0.12)',
              border: `1px solid ${actionMsg.type === 'success' ? '#10B981' : actionMsg.type === 'info' ? '#3B82F6' : '#EF4444'}`,
              color: actionMsg.type === 'success' ? (isUniverse ? '#34D399' : '#059669') : actionMsg.type === 'info' ? (isUniverse ? '#60A5FA' : '#2563EB') : (isUniverse ? '#FCA5A5' : '#DC2626'),
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontWeight: 500
            }}>
              <span>{actionMsg.text}</span>
              <button onClick={() => setActionMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}><X size={16} /></button>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
            {/* ── Calendar Grid ── */}
            <div className="cal-card" style={{ borderRadius: 16, padding: '24px' }}>
              <div className="cal-nav-controls">
                <button onClick={prevMonth} className="cal-nav-arrow-btn">
                  <ChevronLeft size={20} />
                </button>
                <h2 className="cal-month-title">{MONTHS[viewMonth]} {viewYear}</h2>
                <button onClick={nextMonth} className="cal-nav-arrow-btn">
                  <ChevronRight size={20} />
                </button>
              </div>

              <div className="cal-weekdays-row">
                {DAYS.map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, padding: '6px 0', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{d}</div>
                ))}
              </div>

              <div className="cal-grid">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const daySlots = getSlotsForDay(day);
                  const isToday = today.getDate() === day && today.getMonth() === viewMonth && today.getFullYear() === viewYear;
                  const isSelected = selectedDay === day;
                  const isPast = new Date(viewYear, viewMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());

                  return (
                    <button
                      key={day}
                      onClick={() => {
                        setSelectedDay(day);
                        setShowDayModal(true);
                      }}
                      className={`cal-day-cell ${isSelected ? 'selected' : ''}`}
                      style={{ opacity: isPast ? 0.75 : 1 }}
                    >
                      <span className="cal-day-number" style={{ color: isToday ? '#2563EB' : undefined }}>{day}</span>
                      <div className="cal-slots-indicator-list">
                        {daySlots.slice(0, 2).map((slot, si) => {
                          const pastSlot = isMeetingPast(slot.scheduledAt);
                          const color = pastSlot ? '#64748B' : (STATUS_COLORS[slot.status] || '#2563EB');
                          return (
                            <div key={si} style={{
                              width: '100%', padding: '2px 4px', borderRadius: 3, marginBottom: 2,
                              background: `${color}20`, color: color, fontSize: 9, fontWeight: 700,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left'
                            }}>
                              {formatTime(slot.scheduledAt)} {slot.candidateName}
                            </div>
                          );
                        })}
                        {daySlots.length > 2 && (
                          <span style={{ fontSize: 9, color: isUniverse ? '#94A3B8' : '#475569', fontWeight: 600 }}>+{daySlots.length - 2} more</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: 16, marginTop: 16, paddingTop: 16, borderTop: isUniverse ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0', flexWrap: 'wrap' }}>
                {Object.entries(STATUS_COLORS).map(([status, color]) => (
                  <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
                    <span style={{ fontSize: 11, color: isUniverse ? '#94A3B8' : '#475569', fontWeight: 600 }}>{status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Upcoming & Recent Meetings Sidebar ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="cal-card" style={{ borderRadius: 16, padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>All Meetings ({slots.length})</h3>
                  <button
                    onClick={() => {
                      setScheduleForm({
                        applicationId: '', candidateName: '', candidateEmail: '',
                        jobTitle: '', scheduledAt: '', durationMinutes: 60,
                        meetingLink: 'https://meet.google.com/new', notes: ''
                      });
                      setShowScheduleModal(true);
                    }}
                    style={{
                      background: 'none', border: 'none', color: isUniverse ? '#818CF8' : '#2563EB',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                    }}
                  >
                    <Plus size={13} /> Add
                  </button>
                </div>

                {loading ? (
                  <div style={{ color: isUniverse ? '#94A3B8' : '#475569', fontSize: 13, textAlign: 'center', padding: '30px 0' }}>Loading meetings...</div>
                ) : slots.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: isUniverse ? '#94A3B8' : '#647489' }}>
                    <Calendar size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
                    <div style={{ fontSize: 13, fontWeight: 500 }}>No meetings scheduled yet</div>
                    <button
                      onClick={() => setShowScheduleModal(true)}
                      style={{
                        marginTop: 12, padding: '6px 14px', borderRadius: 8, border: 'none',
                        background: '#2563EB', color: '#FFF', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                      }}
                    >
                      + Create First Meeting
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 520, overflowY: 'auto', paddingRight: 4 }}>
                    {slots.map(slot => {
                      const past = isMeetingPast(slot.scheduledAt);
                      const displayStatus = past ? 'COMPLETED' : slot.status;
                      const color = past ? '#64748B' : (STATUS_COLORS[slot.status] || '#2563EB');

                      return (
                        <div key={slot.id} style={{
                          padding: '14px', background: isUniverse ? 'rgba(255,255,255,0.03)' : '#F8FAFC', borderRadius: 12,
                          borderLeft: `4px solid ${color}`,
                          borderTop: isUniverse ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
                          borderRight: isUniverse ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
                          borderBottom: isUniverse ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: isUniverse ? '#F8FAFC' : '#0F172A' }}>{slot.candidateName}</div>
                              <div style={{ fontSize: 11, color: isUniverse ? '#94A3B8' : '#475569', marginTop: 2 }}>{slot.jobTitle}</div>
                            </div>
                            <span style={{
                              fontSize: 10, padding: '3px 8px', borderRadius: 20,
                              background: `${color}20`, color, fontWeight: 700
                            }}>
                              {displayStatus}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: isUniverse ? '#94A3B8' : '#475569', marginBottom: 8 }}>
                            <Clock size={12} />
                            <span>{formatFull(slot.scheduledAt)} · {slot.durationMinutes} min</span>
                          </div>

                          {slot.meetingLink && (
                            <div style={{ marginBottom: 10 }}>
                              <a
                                href={slot.meetingLink}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 5,
                                  fontSize: 11, fontWeight: 600, color: isUniverse ? '#818CF8' : '#2563EB', textDecoration: 'none',
                                  padding: '4px 8px', borderRadius: 6, background: isUniverse ? 'rgba(99,102,241,0.1)' : '#EFF6FF'
                                }}
                              >
                                <Video size={12} /> Join Video Call <ExternalLink size={10} />
                              </a>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', borderTop: isUniverse ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E2E8F0', paddingTop: 8 }}>
                            {!past && slot.status === 'PENDING' && (
                              <button
                                onClick={() => updateStatus(slot.id, 'CONFIRMED')}
                                style={{
                                  flex: 1, padding: '5px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                                  borderRadius: 6, color: '#10B981', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontWeight: 600
                                }}
                              >
                                <Check size={11} /> Confirm
                              </button>
                            )}

                            {past ? (
                              <button
                                onClick={() => handleDeleteMeeting(slot)}
                                title="Meeting time is over. This meeting is completed and archived."
                                style={{
                                  flex: 1, padding: '5px', background: isUniverse ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
                                  border: isUniverse ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
                                  borderRadius: 6, color: '#64748B', fontSize: 11, cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontWeight: 600
                                }}
                              >
                                <CheckCircle2 size={11} /> Completed (Archived)
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDeleteMeeting(slot)}
                                title="Delete or cancel this upcoming meeting"
                                style={{
                                  flex: 1, padding: '5px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                                  borderRadius: 6, color: '#EF4444', fontSize: 11, cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontWeight: 600
                                }}
                              >
                                <Trash2 size={11} /> Delete Meeting
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
          </div>
        </div>
      </main>

      {/* ── Create / Schedule Interview Modal ── */}
      {showScheduleModal && (
        <>
          <Backdrop onClose={() => setShowScheduleModal(false)} />
          <div className="cal-modal-overlay">
            <div className="cal-modal-panel">
              <div className="cal-modal-header">
                <h2 className="cal-modal-title">📅 Create & Schedule Meeting</h2>
                <button onClick={() => setShowScheduleModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isUniverse ? '#94A3B8' : '#475569' }}>
                  <X size={20} />
                </button>
              </div>

              {/* Mode toggle: Candidate Applicant vs Custom / Direct meeting */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14, background: isUniverse ? 'rgba(255,255,255,0.05)' : '#F1F5F9', padding: 4, borderRadius: 10 }}>
                <button
                  type="button"
                  onClick={() => setMeetingMode('APPLICATION')}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none',
                    background: meetingMode === 'APPLICATION' ? '#2563EB' : 'transparent',
                    color: meetingMode === 'APPLICATION' ? '#FFF' : (isUniverse ? '#94A3B8' : '#475569'),
                    fontWeight: 600, fontSize: 12, cursor: 'pointer'
                  }}
                >
                  Candidate Applicant
                </button>
                <button
                  type="button"
                  onClick={() => setMeetingMode('CUSTOM')}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none',
                    background: meetingMode === 'CUSTOM' ? '#2563EB' : 'transparent',
                    color: meetingMode === 'CUSTOM' ? '#FFF' : (isUniverse ? '#94A3B8' : '#475569'),
                    fontWeight: 600, fontSize: 12, cursor: 'pointer'
                  }}
                >
                  Direct / Custom Meeting
                </button>
              </div>

              <div className="cal-modal-form">
                {meetingMode === 'APPLICATION' ? (
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: isUniverse ? '#CBD5E1' : '#334155', marginBottom: 6, display: 'block' }}>
                      Select Candidate Application *
                    </label>
                    <select
                      value={scheduleForm.applicationId}
                      onChange={e => setScheduleForm(f => ({ ...f, applicationId: e.target.value }))}
                      className="cal-input-field"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8 }}
                    >
                      <option value="">— Choose a candidate application —</option>
                      {applications.map(app => (
                        <option key={app.id} value={app.id}>
                          {app.candidate?.user?.firstName} {app.candidate?.user?.lastName} — {app.job?.title} ({app.status})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: isUniverse ? '#CBD5E1' : '#334155', marginBottom: 6, display: 'block' }}>
                          Candidate / Participant Name *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. John Doe"
                          value={scheduleForm.candidateName}
                          onChange={e => setScheduleForm(f => ({ ...f, candidateName: e.target.value }))}
                          className="cal-input-field"
                          style={{ width: '100%', padding: '10px 14px', borderRadius: 8 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: isUniverse ? '#CBD5E1' : '#334155', marginBottom: 6, display: 'block' }}>
                          Candidate Email Address *
                        </label>
                        <input
                          type="email"
                          placeholder="john.doe@example.com"
                          value={scheduleForm.candidateEmail}
                          onChange={e => setScheduleForm(f => ({ ...f, candidateEmail: e.target.value }))}
                          className="cal-input-field"
                          style={{ width: '100%', padding: '10px 14px', borderRadius: 8 }}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: isUniverse ? '#CBD5E1' : '#334155', marginBottom: 6, display: 'block' }}>
                        Job Title / Meeting Topic
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Senior Frontend Engineer Interview"
                        value={scheduleForm.jobTitle}
                        onChange={e => setScheduleForm(f => ({ ...f, jobTitle: e.target.value }))}
                        className="cal-input-field"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8 }}
                      />
                    </div>
                  </>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: isUniverse ? '#CBD5E1' : '#334155', marginBottom: 6, display: 'block' }}>
                      Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduleForm.scheduledAt}
                      onChange={e => setScheduleForm(f => ({ ...f, scheduledAt: e.target.value }))}
                      className="cal-input-field"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, colorScheme: isUniverse ? 'dark' : 'light' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: isUniverse ? '#CBD5E1' : '#334155', marginBottom: 6, display: 'block' }}>
                      Duration
                    </label>
                    <select
                      value={scheduleForm.durationMinutes}
                      onChange={e => setScheduleForm(f => ({ ...f, durationMinutes: parseInt(e.target.value) }))}
                      className="cal-input-field"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8 }}
                    >
                      {[15, 30, 45, 60, 90, 120].map(d => <option key={d} value={d}>{d} minutes</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: isUniverse ? '#CBD5E1' : '#334155' }}>
                      Meeting Link (Google Meet / Zoom)
                    </label>
                    <button
                      type="button"
                      onClick={() => setScheduleForm(f => ({ ...f, meetingLink: `https://meet.google.com/new` }))}
                      style={{ background: 'none', border: 'none', color: isUniverse ? '#818CF8' : '#2563EB', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                    >
                      + Google Meet Link
                    </button>
                  </div>
                  <input
                    type="url"
                    placeholder="https://meet.google.com/..."
                    value={scheduleForm.meetingLink}
                    onChange={e => setScheduleForm(f => ({ ...f, meetingLink: e.target.value }))}
                    className="cal-input-field"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: isUniverse ? '#CBD5E1' : '#334155', marginBottom: 6, display: 'block' }}>
                    Notes & Agenda
                  </label>
                  <textarea
                    value={scheduleForm.notes}
                    onChange={e => setScheduleForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Topics to cover, portfolio review notes..."
                    rows={3}
                    className="cal-input-field"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, resize: 'vertical' }}
                  />
                </div>

                <div className="cal-modal-actions">
                  <button onClick={() => setShowScheduleModal(false)} style={{ flex: 1, padding: '11px', background: isUniverse ? 'rgba(255,255,255,0.05)' : '#F1F5F9', border: isUniverse ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0', borderRadius: 9, color: isUniverse ? '#94A3B8' : '#475569', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                    Cancel
                  </button>
                  <button
                    onClick={handleSchedule}
                    disabled={actionLoading || !scheduleForm.scheduledAt || (meetingMode === 'APPLICATION' && !scheduleForm.applicationId) || (meetingMode === 'CUSTOM' && !scheduleForm.candidateName)}
                    style={{
                      flex: 2, padding: '11px', background: isUniverse ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#2563EB',
                      border: 'none', borderRadius: 9, color: '#FFFFFF !important', cursor: 'pointer', fontSize: 14, fontWeight: 700,
                      opacity: (actionLoading || !scheduleForm.scheduledAt) ? 0.7 : 1
                    }}
                  >
                    {actionLoading ? 'Scheduling...' : '📅 Schedule & Send Invite'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Select Candidate Modal ── */}
      {showSelectModal && (
        <>
          <Backdrop onClose={() => setShowSelectModal(false)} />
          <div className="cal-modal-overlay">
            <div className="cal-modal-panel" style={{ maxWidth: 460 }}>
              <div className="cal-modal-header">
                <h2 className="cal-modal-title">🌟 Send Selection Email</h2>
                <button onClick={() => setShowSelectModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isUniverse ? '#94A3B8' : '#475569' }}><X size={20} /></button>
              </div>

              <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <AlertCircle size={16} color="#10B981" style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 12, color: isUniverse ? '#94A3B8' : '#475569', lineHeight: 1.6 }}>
                  This will send an official <strong style={{ color: '#10B981' }}>"You are selected"</strong> congratulations email directly to the candidate's inbox.
                </div>
              </div>

              <div className="cal-modal-form">
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: isUniverse ? '#CBD5E1' : '#334155', marginBottom: 6, display: 'block' }}>Select Application *</label>
                  <select
                    value={selectForm.applicationId}
                    onChange={e => setSelectForm(f => ({ ...f, applicationId: e.target.value }))}
                    className="cal-input-field"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8 }}
                  >
                    <option value="">— Choose a candidate —</option>
                    {applications.map(app => (
                      <option key={app.id} value={app.id}>
                        {app.candidate?.user?.firstName} {app.candidate?.user?.lastName} — {app.job?.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: isUniverse ? '#CBD5E1' : '#334155', marginBottom: 6, display: 'block' }}>Custom Message (optional)</label>
                  <textarea
                    value={selectForm.customMessage}
                    onChange={e => setSelectForm(f => ({ ...f, customMessage: e.target.value }))}
                    placeholder="Congratulations! We are excited to extend an offer for this position..."
                    rows={4}
                    className="cal-input-field"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, resize: 'vertical' }}
                  />
                  <div style={{ fontSize: 11, color: isUniverse ? '#94A3B8' : '#64748B', marginTop: 4 }}>Leave blank to use default selection email text.</div>
                </div>
                <div className="cal-modal-actions">
                  <button onClick={() => setShowSelectModal(false)} style={{ flex: 1, padding: '11px', background: isUniverse ? 'rgba(255,255,255,0.05)' : '#F1F5F9', border: isUniverse ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0', borderRadius: 9, color: isUniverse ? '#94A3B8' : '#475569', cursor: 'pointer', fontSize: 14 }}>
                    Cancel
                  </button>
                  <button onClick={handleSelect} disabled={actionLoading || !selectForm.applicationId}
                    style={{ flex: 2, padding: '11px', background: 'linear-gradient(135deg,#10B981,#06B6D4)', border: 'none', borderRadius: 9, color: '#FFFFFF !important', cursor: 'pointer', fontSize: 14, fontWeight: 700, opacity: actionLoading ? 0.7 : 1 }}>
                    {actionLoading ? 'Sending...' : '🌟 Send Selection Email'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Day Detail Modal ── */}
      {showDayModal && selectedDay && (
        <>
          <Backdrop onClose={() => setShowDayModal(false)} />
          <div className="cal-modal-overlay">
            <div className="cal-modal-panel" style={{ maxWidth: 440 }}>
              <div className="cal-modal-header">
                <div>
                  <h2 className="cal-modal-title">
                    {MONTHS[viewMonth]} {selectedDay}, {viewYear}
                  </h2>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: isUniverse ? '#94A3B8' : '#475569' }}>
                    {selectedDaySlots.length} meeting(s) scheduled
                  </p>
                </div>
                <button onClick={() => setShowDayModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isUniverse ? '#94A3B8' : '#475569' }}><X size={18} /></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 340, overflowY: 'auto', marginBottom: 16 }}>
                {selectedDaySlots.length === 0 ? (
                  <div style={{ padding: '24px 0', textAlign: 'center', color: isUniverse ? '#94A3B8' : '#64748B', fontSize: 13 }}>
                    No meetings scheduled on this day.
                  </div>
                ) : (
                  selectedDaySlots.map(slot => {
                    const past = isMeetingPast(slot.scheduledAt);
                    const color = past ? '#64748B' : (STATUS_COLORS[slot.status] || '#2563EB');
                    const displayStatus = past ? 'COMPLETED' : slot.status;

                    return (
                      <div key={slot.id} style={{
                        padding: '14px', background: isUniverse ? 'rgba(255,255,255,0.03)' : '#F8FAFC', borderRadius: 10,
                        borderLeft: `4px solid ${color}`,
                        borderTop: isUniverse ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
                        borderRight: isUniverse ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
                        borderBottom: isUniverse ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: isUniverse ? '#F8FAFC' : '#0F172A' }}>{slot.candidateName}</div>
                          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: `${color}20`, color, fontWeight: 700 }}>
                            {displayStatus}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: isUniverse ? '#94A3B8' : '#475569' }}>{slot.jobTitle}</div>
                        <div style={{ fontSize: 12, color: isUniverse ? '#94A3B8' : '#475569', marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Clock size={12} /> {formatTime(slot.scheduledAt)} · {slot.durationMinutes} min
                        </div>

                        {slot.meetingLink && (
                          <div style={{ marginTop: 8 }}>
                            <a href={slot.meetingLink} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: isUniverse ? '#818CF8' : '#2563EB', textDecoration: 'none', fontWeight: 600 }}>
                              🔗 Open Meeting Link
                            </a>
                          </div>
                        )}

                        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end', borderTop: isUniverse ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E2E8F0', paddingTop: 8 }}>
                          {past ? (
                            <span style={{ fontSize: 11, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <CheckCircle2 size={12} /> Meeting Finished (Archived)
                            </span>
                          ) : (
                            <button
                              onClick={() => { setShowDayModal(false); handleDeleteMeeting(slot); }}
                              style={{
                                padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)',
                                background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontSize: 11, fontWeight: 600,
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                              }}
                            >
                              <Trash2 size={11} /> Delete Meeting
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setShowDayModal(false)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 8, background: isUniverse ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
                    border: isUniverse ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
                    color: isUniverse ? '#94A3B8' : '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Close
                </button>
                <button
                  onClick={() => openScheduleForDay(selectedDay)}
                  style={{
                    flex: 1.5, padding: '10px', borderRadius: 8, background: '#2563EB',
                    border: 'none', color: '#FFF', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                  }}
                >
                  <Plus size={14} /> Add on this Day
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default HrCalendar;
