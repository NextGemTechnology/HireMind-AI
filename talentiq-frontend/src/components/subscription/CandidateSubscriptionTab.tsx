import React, { useState, useEffect } from 'react';
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
  RotateCw,
  X,
  CreditCard as CardIcon,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';
import { PaymentCheckoutModal } from './PaymentCheckoutModal';
import '../../css/subscription.css';

interface CandidateSubscriptionTabProps {
  embedded?: boolean;
}

export const CandidateSubscriptionTab: React.FC<CandidateSubscriptionTabProps> = ({ embedded = false }) => {
  const {
    subscription,
    plans,
    transactions,
    actionLoading,
    error,
    reload,
    fetchTransactions,
    cancelSubscription,
  } = useSubscription({ role: 'CANDIDATE', autoFetch: true });

  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Filters & Pagination for Transaction History
  const [historyStatus, setHistoryStatus] = useState<string>('');
  const [historySearch, setHistorySearch] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4500);
  };

  const isCandidatePro =
    subscription?.status === 'ACTIVE' && subscription?.plan?.planCode === 'CANDIDATE_PRO';

  // Check if latest transaction failed to present safe retry
  const latestTx = transactions.length > 0 ? transactions[0] : null;
  const showRetryBanner = latestTx && (latestTx.status === 'FAILED' || latestTx.status === 'CANCELLED') && !isCandidatePro;

  const handlePurchase = () => {
    setCheckoutModalOpen(true);
  };

  // Re-fetch transactions on filter/page change
  useEffect(() => {
    fetchTransactions(currentPage, 10, historyStatus, historySearch).then((res) => {
      if (res) {
        setTotalPages(res.totalPages || 1);
      }
    });
  }, [fetchTransactions, currentPage, historyStatus, historySearch]);

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

      {/* Safe Retry Banner for Failed/Cancelled Attempt */}
      {showRetryBanner && (
        <div className="sub-retry-banner">
          <div className="sub-retry-content">
            <div className="sub-retry-icon-box">
              <AlertCircle size={20} color="#F43F5E" />
            </div>
            <div>
              <h4 className="sub-retry-title">Your recent payment attempt was not completed</h4>
              <p className="sub-retry-desc">
                Order <code style={{ color: '#CBD5E1' }}>{latestTx.orderId}</code> was {latestTx.status.toLowerCase()}
                {latestTx.errorMessage ? `: "${latestTx.errorMessage}"` : ''}. No funds were deducted. You can safely retry whenever you're ready.
              </p>
            </div>
          </div>
          <button 
            className="sub-btn sub-btn-primary sub-retry-btn"
            onClick={handlePurchase}
            disabled={actionLoading}
          >
            <RotateCw size={14} className={actionLoading ? 'sub-spin' : ''} />
            {actionLoading ? 'Connecting...' : 'Retry Payment (₹99)'}
          </button>
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
              Candidate Role &bull; Plan ID: {isCandidatePro ? 'CANDIDATE_PRO' : 'FREE_TIER'}
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
                {subscription!.autoRenew ? 'Auto-renews at ₹99/month' : 'Auto-renew cancelled'}
              </>
            ) : (
              'Standard job applications with basic AI matching limits. Upgrade to unlock direct recruiter access & verified badge.'
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
              <span className="sub-card-period">/ month (Cards & UPI)</span>
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
                <Sparkles size={16} /> {actionLoading ? 'Connecting...' : 'Pay ₹99 with Razorpay'}
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

        {/* Filter and Search Bar */}
        <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(15, 23, 42, 0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px', maxWidth: '380px', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', padding: '6px 10px' }}>
            <Search size={14} color="#94A3B8" />
            <input
              type="text"
              placeholder="Search Order ID or method..."
              value={historySearch}
              onChange={(e) => { setHistorySearch(e.target.value); setCurrentPage(0); }}
              style={{ background: 'transparent', border: 'none', color: '#F8FAFC', fontSize: '12px', width: '100%', outline: 'none' }}
            />
            {historySearch && (
              <button onClick={() => setHistorySearch('')} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}>
                <X size={12} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={14} color="#94A3B8" />
            <select
              value={historyStatus}
              onChange={(e) => { setHistoryStatus(e.target.value); setCurrentPage(0); }}
              style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.15)', color: '#F8FAFC', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', outline: 'none' }}
            >
              <option value="">All Statuses</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="EXPIRED">Expired</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
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
              No payment transactions matching your filter. When you upgrade or renew, your transactions appear here.
            </div>
          ) : (
            <table className="sub-table">
              <thead>
                <tr>
                  <th>Order Reference</th>
                  <th>Date & Time</th>
                  <th>Plan Tier</th>
                  <th>Amount</th>
                  <th>Payment Method</th>
                  <th>Status</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const isPaid = tx.status === 'PAID' || tx.status === 'CAPTURED';
                  const isFailed = tx.status === 'FAILED';
                  const isPending = tx.status === 'PENDING' || tx.status === 'CREATED' || tx.status === 'AUTHORIZED';

                  return (
                    <tr key={tx.orderId}>
                      <td className="sub-order-code">
                        <span>{tx.orderId}</span>
                        {tx.gatewayPaymentId && (
                          <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                            {tx.gatewayPaymentId}
                          </div>
                        )}
                      </td>
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
                        {tx.paymentMethod ? (
                          <span className="sub-payment-method-pill">
                            <CardIcon size={12} />
                            <span>{tx.maskedDetails || tx.paymentMethod}</span>
                          </span>
                        ) : (
                          <span style={{ color: '#64748B', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`sub-badge ${
                            isPaid
                              ? 'sub-badge-active'
                              : isFailed
                              ? 'sub-badge-expired'
                              : isPending
                              ? 'sub-badge-expiring'
                              : 'sub-badge-free'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td>
                        {isPaid ? (
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
                        ) : (
                          <button
                            onClick={handlePurchase}
                            disabled={actionLoading}
                            style={{
                              background: 'rgba(244, 63, 94, 0.12)',
                              border: '1px solid rgba(244, 63, 94, 0.3)',
                              borderRadius: '6px',
                              color: '#FB7185',
                              padding: '4px 10px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <RotateCw size={11} /> Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div style={{ padding: '12px 18px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: currentPage === 0 ? '#64748B' : '#F8FAFC', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', cursor: currentPage === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <span style={{ fontSize: '12px', color: '#94A3B8' }}>
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: currentPage >= totalPages - 1 ? '#64748B' : '#F8FAFC', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
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

      {/* Payment Checkout Modal */}
      {checkoutModalOpen && (
        <PaymentCheckoutModal
          plan={
            plans.find((p) => p.planCode === 'CANDIDATE_PRO') || {
              planCode: 'CANDIDATE_PRO',
              name: 'Candidate Pro',
              description: 'Supercharge your job search with verified recruiter exposure',
              targetRole: 'CANDIDATE',
              priceAmount: 99,
              currency: 'INR',
              billingCycle: 'MONTHLY',
              features: ['Unlimited AI Job Matches', 'Direct Recruiter InMail', 'Priority Application Queue'],
              active: true,
            }
          }
          billingCycle="MONTHLY"
          isOpen={checkoutModalOpen}
          onClose={() => setCheckoutModalOpen(false)}
          onSuccess={() => {
            setCheckoutModalOpen(false);
            reload();
            showToast('🎉 Successfully upgraded to Candidate Pro!');
          }}
        />
      )}
    </div>
  );
};
