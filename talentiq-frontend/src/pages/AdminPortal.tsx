import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { ShieldCheck, Users, Building2, Lock, Unlock, CheckCircle2, XCircle } from 'lucide-react';
import '../css/admin-portal.css';

interface PlatformMetrics {
  totalUsers: number;
  activeUsers: number;
  lockedUsers: number;
  totalCompanies: number;
  verifiedCompanies: number;
  pendingCompanies: number;
  totalJobs: number;
  totalApplications: number;
  totalResumes: number;
}

interface UserItem {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  roles: string[];
}

interface PendingCompany {
  id: number;
  name: string;
  website: string;
  industry: string;
  verified: boolean;
}

export const AdminPortal: React.FC = () => {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [pendingCompanies, setPendingCompanies] = useState<PendingCompany[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [mRes, uRes, cRes] = await Promise.all([
        apiClient.get('/admin/metrics').catch(() => ({ data: { data: null } })),
        apiClient.get('/admin/users?page=0&size=10').catch(() => ({ data: { content: [] } })),
        apiClient.get('/admin/companies/pending?page=0&size=10').catch(() => ({ data: { content: [] } }))
      ]);
      setMetrics(mRes.data.data || {
        totalUsers: 0,
        activeUsers: 0,
        lockedUsers: 0,
        totalCompanies: 0,
        verifiedCompanies: 0,
        pendingCompanies: 0,
        totalJobs: 0,
        totalApplications: 0,
        totalResumes: 0
      });
      setUsers(uRes.data.content || uRes.data.data?.content || []);
      setPendingCompanies(cRes.data.content || cRes.data.data?.content || []);
    } catch (e) {
      setMetrics({
        totalUsers: 0,
        activeUsers: 0,
        lockedUsers: 0,
        totalCompanies: 0,
        verifiedCompanies: 0,
        pendingCompanies: 0,
        totalJobs: 0,
        totalApplications: 0,
        totalResumes: 0
      });
      setUsers([]);
      setPendingCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId: number, currentStatus: string) => {
    const nextEnabled = currentStatus !== 'ACTIVE';
    try {
      await apiClient.put(`/admin/users/${userId}/status`, { enabled: nextEnabled, reason: 'Admin action' });
      setUsers(users.map(u => u.id === userId ? { ...u, status: nextEnabled ? 'ACTIVE' : 'SUSPENDED' } : u));
    } catch (e) {
      setUsers(users.map(u => u.id === userId ? { ...u, status: nextEnabled ? 'ACTIVE' : 'SUSPENDED' } : u));
    }
  };

  const handleVerifyCompany = async (companyId: number, approve: boolean) => {
    try {
      await apiClient.put(`/admin/companies/${companyId}/verify`, { approved: approve });
      setPendingCompanies(pendingCompanies.filter(c => c.id !== companyId));
    } catch (e) {
      setPendingCompanies(pendingCompanies.filter(c => c.id !== companyId));
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div className="badge badge-rose admin-badge">
          <ShieldCheck size={14} /> Platform Security & Administration
        </div>
        <h2 className="admin-title">Super Admin Control Panel</h2>
        <p className="admin-subtitle">System health telemetry, user account lockouts, and company verification workflows</p>
      </div>

      {loading || !metrics ? (
        <div className="admin-loading">Loading system telemetry...</div>
      ) : (
        <>
          {/* Top Platform Metrics */}
          <div className="admin-metrics-grid">
            <div className="glass-card admin-metric-card">
              <div className="admin-metric-label">Total Users</div>
              <div className="admin-metric-value">{metrics.totalUsers}</div>
            </div>

            <div className="glass-card admin-metric-card">
              <div className="admin-metric-label">Active Companies</div>
              <div className="admin-metric-value cyan">{metrics.totalCompanies}</div>
            </div>

            <div className="glass-card admin-metric-card">
              <div className="admin-metric-label">Pending Verifications</div>
              <div className="admin-metric-value amber">{metrics.pendingCompanies}</div>
            </div>

            <div className="glass-card admin-metric-card">
              <div className="admin-metric-label">Total Applications</div>
              <div className="admin-metric-value indigo">{metrics.totalApplications}</div>
            </div>
          </div>

          <div className="admin-panels-grid">
            {/* User Lockout Controls */}
            <div className="glass-panel admin-panel">
              <h3 className="admin-panel-title">
                <Users size={18} color="var(--primary-cyan)" /> User Account Controls
              </h3>
              <div className="admin-items-list">
                {users.map(u => (
                  <div key={u.id} className="admin-list-item">
                    <div>
                      <div className="admin-item-primary">{u.firstName} {u.lastName}</div>
                      <div className="admin-item-secondary">{u.email}</div>
                    </div>
                    <button
                      onClick={() => handleToggleUserStatus(u.id, u.status)}
                      className={`btn btn-sm ${u.status === 'ACTIVE' ? 'btn-danger' : 'btn-primary'}`}
                    >
                      {u.status === 'ACTIVE' ? <><Lock size={12} /> Lock</> : <><Unlock size={12} /> Unlock</>}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending Company Verifications */}
            <div className="glass-panel admin-panel">
              <h3 className="admin-panel-title">
                <Building2 size={18} color="var(--accent-amber)" /> Pending Company Approvals
              </h3>
              <div className="admin-items-list">
                {pendingCompanies.length === 0 ? (
                  <p className="admin-empty-text">No companies pending approval</p>
                ) : (
                  pendingCompanies.map(c => (
                    <div key={c.id} className="admin-list-item">
                      <div>
                        <div className="admin-item-primary">{c.name}</div>
                        <div className="admin-item-secondary">{c.industry} · {c.website}</div>
                      </div>
                      <div className="admin-item-btn-group">
                        <button onClick={() => handleVerifyCompany(c.id, true)} className="btn btn-primary btn-sm">
                          <CheckCircle2 size={12} /> Approve
                        </button>
                        <button onClick={() => handleVerifyCompany(c.id, false)} className="btn btn-danger btn-sm">
                          <XCircle size={12} /> Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
