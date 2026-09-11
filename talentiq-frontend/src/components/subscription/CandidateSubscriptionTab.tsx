import React, { useState } from 'react';
import {
  Check,
  Sparkles,
  ShieldCheck,
  Zap,
  Clock,
  AlertCircle,
  FileText,
  Download,
  CreditCard,
  X,
} from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';
import '../../css/subscription.css';

interface CandidateSubscriptionTabProps {
  embedded?: boolean;
}

export const CandidateSubscriptionTab: React.FC<CandidateSubscriptionTabProps> = ({ embedded = false }) => {
  const {
    subscription,
    transactions,
    actionLoading,
    error,
    purchasePlan,
    cancelSubscription,
  } = useSubscription({ role: 'CANDIDATE', autoFetch: true });

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const isCandidatePro =
    subscription?.status === 'ACTIVE' && subscription?.plan?.planCode === 'CANDIDATE_PRO';

  const handlePurchase = async () => {
    const res = await purchasePlan('CANDIDATE_PRO', 'MONTHLY');
    if (res.success) {
      showToast('🎉 Successfully upgraded to Candidate Pro!');
    } else if (res.error) {
      showToast(`Error: ${res.error}`);
    }
  };

  const handleCancel = async () => {
    const ok = await cancelSubscription(cancelReason || 'No longer needed');
    if (ok) {
      setCancelModalOpen(false);
      setCancelReason('');
      showToast('Subscription auto-renew cancelled.');
    } else {
      showToast('Failed to cancel subscription');
    }
  };

  const daysRemaining = subscription?.currentPeriodEnd
    ? Math.max(
        0,
        Math.ceil(
          (new Date(subscription.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  const isExpiringSoon = isCandidatePro && daysRemaining <= 3;

  return (
    <div className={`sub-container ${embedded ? 'embedded' : ''}`}>
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#1E293B',
            color: '#F8FAFC',
            padding: '12px 20px',
            borderRadius: '8px',
            border: '1px solid #6366F1',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            zIndex: 99999,
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="sub-header">
        <h2 className="sub-header-title">
          <CreditCard size={24} color="#6366F1" /> Subscription & Career Pro Plans
        </h2>
        <p className="sub-header-desc">
          Supercharge your job search, bypass applicant queues, and get verified recruiter exposure.
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: '8px',
            color: '#FB7185',
            fontSize: '13px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Active Status Card */}
      <div
        className={`sub-status-card ${
          isCandidatePro
            ? isExpiringSoon
              ? 'expiring'
              : 'active'
            : 'free'
        }`}
      >
        <div className="sub-status-info">
          <div className="sub-badge-row">
            {isCandidatePro ? (
              <span className={`sub-badge ${isExpiringSoon ? 'sub-badge-expiring' : 'sub-badge-active'}`}>
                <ShieldCheck size={13} /> {isExpiringSoon ? 'EXPIRING SOON' : 'ACTIVE SUBSCRIBER'}
              </span>
            ) : (
              <span className="sub-badge sub-badge-free">
                <Clock size={13} /> FREE BASIC PLAN
              </span>
            )}
            <span style={{ fontSize: '12px', color: '#94A3B8' }}>
              Member since {new Date().getFullYear()}
            </span>
          </div>

          <h3 className="sub-plan-title">
            {isCandidatePro ? 'Candidate Pro Plan' : 'Free Career Tier'}
          </h3>

          <div className="sub-plan-meta">
            {isCandidatePro ? (
              <>
                Active until{' '}
                <strong style={{ color: '#F8FAFC' }}>
                  {new Date(subscription!.currentPeriodEnd).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </strong>{' '}
                ({daysRemaining} days remaining) &bull;{' '}
                {subscription!.autoRenew ? 'Auto-renews at ₹99/mo' : 'Auto-renew cancelled'}
              </>
            ) : (
              'Standard job applications with basic AI matching limits.'
            )}
          </div>
        </div>

        <div className="sub-status-actions">
          {isCandidatePro ? (
            <button
              className="sub-btn sub-btn-danger"
              style={{ width: 'auto' }}
              onClick={() => setCancelModalOpen(true)}
              disabled={actionLoading || !subscription?.autoRenew}
            >
              {subscription?.autoRenew ? 'Cancel Renewal' : 'Cancellation Pending'}
            </button>
          ) : (
            <button
              className="sub-btn sub-btn-primary"
              style={{ width: 'auto' }}
              onClick={handlePurchase}
              disabled={actionLoading}
            >
              <Zap size={16} /> Upgrade to Pro (₹99/mo)
            </button>
          )}
        </div>
      </div>

      {/* Plan Cards Comparison */}
      <div className="sub-plans-grid">
        {/* Free Plan Card */}
        <div className={`sub-plan-card ${!isCandidatePro ? 'current' : ''}`}>
          <div className="sub-card-top">
            <h4 className="sub-card-name">Basic Free Tier</h4>
            <p className="sub-card-desc">
              Essential platform access to explore jobs and build your candidate profile.
            </p>
            <div className="sub-card-price-row">
              <span className="sub-card-price">₹0</span>
              <span className="sub-card-period">/ forever</span>
            </div>
            <ul className="sub-card-features">
              <li className="sub-card-feature-item">
                <Check size={16} className="sub-feature-icon" /> Standard job applications
              </li>
              <li className="sub-card-feature-item">
                <Check size={16} className="sub-feature-icon" /> Up to 5 AI match queries / month
              </li>
              <li className="sub-card-feature-item">
                <Check size={16} className="sub-feature-icon" /> Standard candidate portfolio
              </li>
              <li className="sub-card-feature-item">
                <Check size={16} className="sub-feature-icon" /> Standard recruiter visibility
              </li>
            </ul>
          </div>
          <button className="sub-btn sub-btn-outline" disabled>
            {!isCandidatePro ? 'Current Plan' : 'Basic Tier'}
          </button>
        </div>

        {/* Candidate Pro Card */}
        <div className={`sub-plan-card ${isCandidatePro ? 'current' : 'featured'}`}>
          <div className="sub-popular-tag">RECOMMENDED</div>
          <div className="sub-card-top">
            <h4 className="sub-card-name" style={{ color: '#818CF8' }}>
              Candidate Pro
            </h4>
            <p className="sub-card-desc">
              Accelerate your job search and stand out to premium tech recruiters.
            </p>
            <div className="sub-card-price-row">
              <span className="sub-card-price">₹99</span>
              <span className="sub-card-period">/ month (incl. GST)</span>
            </div>
            <ul className="sub-card-features">
              <li className="sub-card-feature-item">
                <Check size={16} className="sub-feature-icon" /> Priority top-of-stack job applications
              </li>
              <li className="sub-card-feature-item">
                <Check size={16} className="sub-feature-icon" /> Unlimited AI Job Matching & scoring
              </li>
              <li className="sub-card-feature-item">
                <Check size={16} className="sub-feature-icon" /> AI-Powered resume optimization & ATS audit
              </li>
              <li className="sub-card-feature-item">
                <Check size={16} className="sub-feature-icon" /> Direct recruiter messaging access
              </li>
              <li className="sub-card-feature-item">
                <Check size={16} className="sub-feature-icon" /> Verified Pro Candidate badge on profile
              </li>
              <li className="sub-card-feature-item">
                <Check size={16} className="sub-feature-icon" /> Application views & profile telemetry
              </li>
            </ul>
          </div>
          <button
            className={`sub-btn ${isCandidatePro ? 'sub-btn-outline' : 'sub-btn-primary'}`}
            onClick={handlePurchase}
            disabled={actionLoading || isCandidatePro}
          >
            {isCandidatePro ? (
              <>
                <Check size={16} /> Current Active Plan
              </>
            ) : (
              <>
                <Sparkles size={16} /> {actionLoading ? 'Connecting...' : 'Upgrade with Razorpay'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Transaction History Ledger */}
      <div className="sub-table-card">
        <div className="sub-table-header">
          <h3 className="sub-table-title">
            <FileText size={18} color="#6366F1" /> Payment & Invoicing History
          </h3>
          <span style={{ fontSize: '12px', color: '#94A3B8' }}>
            {transactions.length} record{transactions.length === 1 ? '' : 's'} found
          </span>
        </div>

        <div className="sub-table-wrapper">
          {transactions.length === 0 ? (
            <div
              style={{
                padding: '36px 20px',
                textAlign: 'center',
                color: '#94A3B8',
                fontSize: '13px',
              }}
            >
              No payment transactions yet. When you upgrade or renew, your invoices will appear here.
            </div>
          ) : (
            <table className="sub-table">
              <thead>
                <tr>
                  <th>Order Reference</th>
                  <th>Date & Time</th>
                  <th>Plan Tier</th>
                  <th>Amount</th>
                  <th>Payment Status</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.orderId}>
                    <td className="sub-order-code">{tx.orderId}</td>
                    <td>
                      {new Date(tx.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td style={{ color: '#F8FAFC', fontWeight: 600 }}>{tx.planName}</td>
                    <td className="sub-amount">
                      ₹{tx.amount.toFixed(2)} {tx.currency}
                    </td>
                    <td>
                      <span
                        className={`sub-badge ${
                          tx.status === 'CAPTURED'
                            ? 'sub-badge-active'
                            : tx.status === 'FAILED'
                            ? 'sub-badge-expired'
                            : 'sub-badge-free'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => showToast(`Receipt download ready for ${tx.orderId}`)}
                        style={{
                          background: 'rgba(99, 102, 241, 0.12)',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                          borderRadius: '6px',
                          color: '#818CF8',
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Download size={11} /> PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Cancellation Modal */}
      {cancelModalOpen && (
        <div className="sub-modal-backdrop">
          <div className="sub-modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="sub-modal-title">Cancel Subscription Auto-Renewal</h3>
              <button
                onClick={() => setCancelModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>
            <p className="sub-modal-desc">
              Your Pro benefits will remain active until{' '}
              <strong>
                {new Date(subscription!.currentPeriodEnd).toLocaleDateString()}
              </strong>
              . You won't be charged again.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  color: '#CBD5E1',
                  marginBottom: '6px',
                  fontWeight: 600,
                }}
              >
                Reason for cancellation (optional):
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Found a job, testing features, etc."
                style={{
                  width: '100%',
                  height: '70px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '6px',
                  color: '#F8FAFC',
                  padding: '8px 10px',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div className="sub-modal-actions">
              <button
                className="sub-btn sub-btn-outline"
                style={{ width: 'auto' }}
                onClick={() => setCancelModalOpen(false)}
              >
                Keep Pro
              </button>
              <button
                className="sub-btn sub-btn-danger"
                style={{ width: 'auto' }}
                onClick={handleCancel}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
