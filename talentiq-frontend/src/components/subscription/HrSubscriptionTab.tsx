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
  X,
  CreditCard as CardIcon,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';
import { PaymentCheckoutModal } from './PaymentCheckoutModal';
import type { PlanResponse } from '../../api/subscriptionApi';
import '../../css/subscription.css';

interface HrSubscriptionTabProps {
  styles?: any;
  theme?: string;
}

export const HrSubscriptionTab: React.FC<HrSubscriptionTabProps> = () => {
  const {
    subscription,
    plans,
    transactions,
    actionLoading,
    error,
    reload,
    fetchTransactions,
    cancelSubscription,
  } = useSubscription({ role: 'HR', autoFetch: true });

  const [checkoutPlan, setCheckoutPlan] = useState<PlanResponse | null>(null);
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
    setTimeout(() => setToastMsg(null), 4000);
  };

  const currentPlanCode = subscription?.status === 'ACTIVE' ? subscription?.plan?.planCode : null;
  const isHrPro = currentPlanCode === 'HR_PRO';
  const isHrEnterprise = currentPlanCode === 'HR_ENTERPRISE';
  const hasActiveSub = isHrPro || isHrEnterprise;

  const handlePurchase = (planCode: string) => {
    const targetPlan = plans.find((p) => p.planCode === planCode) || {
      planCode,
      name: planCode === 'HR_ENTERPRISE' ? 'HR Enterprise' : 'HR Pro',
      description:
        planCode === 'HR_ENTERPRISE'
          ? 'High-volume hiring & unlimited candidate outreach'
          : 'Professional AI recruitment suite',
      targetRole: 'HR',
      priceAmount: planCode === 'HR_ENTERPRISE' ? 1999 : 499,
      currency: 'INR',
      billingCycle: 'MONTHLY',
      features: ['Unlimited AI Candidate Match', 'Bulk Interview Scheduling', 'Automated Verification'],
      active: true,
    };
    setCheckoutPlan(targetPlan);
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
    const ok = await cancelSubscription(cancelReason || 'Switching plans');
    if (ok) {
      setCancelModalOpen(false);
      setCancelReason('');
      showToast('Subscription renewal cancelled.');
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

  const isExpiringSoon = hasActiveSub && daysRemaining <= 3;

  return (
    <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
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
          <CreditCard size={24} color="#6366F1" /> Recruiter Subscriptions & Talent Pipeline Quotas
        </h2>
        <p className="sub-header-desc">
          Scale your hiring bandwidth, access smart candidate shortlisting, and run unlimited interview pipelines.
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

      {/* Active Subscription Status Banner */}
      <div
        className={`sub-status-card ${
          hasActiveSub ? (isExpiringSoon ? 'expiring' : 'active') : 'free'
        }`}
      >
        <div className="sub-status-info">
          <div className="sub-badge-row">
            {hasActiveSub ? (
              <span className={`sub-badge ${isExpiringSoon ? 'sub-badge-expiring' : 'sub-badge-active'}`}>
                <ShieldCheck size={13} /> {isExpiringSoon ? 'EXPIRING SOON' : 'ACTIVE SUBSCRIBER'}
              </span>
            ) : (
              <span className="sub-badge sub-badge-free">
                <Clock size={13} /> BASIC RECRUITER TIER
              </span>
            )}
            <span style={{ fontSize: '12px', color: '#94A3B8' }}>
              Account Scope: Recruiter / Organization
            </span>
          </div>

          <h3 className="sub-plan-title">
            {isHrEnterprise
              ? 'HR Enterprise Plan'
              : isHrPro
              ? 'HR Pro Plan'
              : 'Standard Recruiter Access'}
          </h3>

          <div className="sub-plan-meta">
            {hasActiveSub ? (
              <>
                Billing Period End:{' '}
                <strong style={{ color: '#F8FAFC' }}>
                  {new Date(subscription!.currentPeriodEnd).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </strong>{' '}
                ({daysRemaining} days left) &bull;{' '}
                {subscription!.autoRenew ? 'Auto-renews monthly' : 'Auto-renew cancelled'}
              </>
            ) : (
              'Limited to 3 job postings and basic applicant review.'
            )}
          </div>
        </div>

        <div className="sub-status-actions">
          {hasActiveSub && (
            <button
              className="sub-btn sub-btn-danger"
              style={{ width: 'auto' }}
              onClick={() => setCancelModalOpen(true)}
              disabled={actionLoading || !subscription?.autoRenew}
            >
              {subscription?.autoRenew ? 'Cancel Renewal' : 'Cancellation Pending'}
            </button>
          )}
        </div>
      </div>

      {/* Plans Comparison Grid */}
      <div className="sub-plans-grid">
        {/* HR Pro Card */}
        <div className={`sub-plan-card ${isHrPro ? 'current' : ''}`}>
          <div className="sub-card-top">
            <h4 className="sub-card-name" style={{ color: '#38BDF8' }}>
              HR Pro
            </h4>
            <p className="sub-card-desc">
              Essential smart shortlisting and candidate management tools for active recruiters.
            </p>
            <div className="sub-card-price-row">
              <span className="sub-card-price">₹499</span>
              <span className="sub-card-period">/ month + GST</span>
            </div>
            <ul className="sub-card-features">
              <li className="sub-card-feature-item">
                <Check size={16} className="sub-feature-icon" /> Up to 50 active job postings
              </li>
              <li className="sub-card-feature-item">
                <Check size={16} className="sub-feature-icon" /> 1-Click AI Resume Shortlisting
              </li>
              <li className="sub-card-feature-item">
                <Check size={16} className="sub-feature-icon" /> Bulk candidate status filtering
              </li>
              <li className="sub-card-feature-item">
                <Check size={16} className="sub-feature-icon" /> Candidate ranking score & match %
              </li>
              <li className="sub-card-feature-item">
                <Check size={16} className="sub-feature-icon" /> Export candidate lists (CSV / Excel)
              </li>
              <li className="sub-card-feature-item">
                <Check size={16} className="sub-feature-icon" /> Priority email & chat support
              </li>
            </ul>
          </div>
          <button
            className={`sub-btn ${isHrPro ? 'sub-btn-outline' : 'sub-btn-primary'}`}
            onClick={() => handlePurchase('HR_PRO')}
            disabled={actionLoading || isHrPro}
          >
            {isHrPro ? (
              <>
                <Check size={16} /> Current Active Tier
              </>
            ) : (
              <>
                <Zap size={16} /> Select HR Pro (₹499/mo)
              </>
            )}
          </button>
        </div>

        {/* HR Enterprise Card */}
        <div className={`sub-plan-card ${isHrEnterprise ? 'current' : 'featured'}`}>
          <div className="sub-popular-tag">RECOMMENDED TIER</div>
          <div className="sub-card-top">
            <h4 className="sub-card-name" style={{ color: '#C084FC' }}>
              HR Enterprise
            </h4>
            <p className="sub-card-desc">
              Full-featured interview management, pipeline telemetry, and unlimited hiring capacity.
            </p>
            <div className="sub-card-price-row">
              <span className="sub-card-price">₹1,999</span>
              <span className="sub-card-period">/ month + GST</span>
            </div>
            <ul className="sub-card-features">
              <li className="sub-card-feature-item">
                <Check size={16} className="sub-feature-icon" /> <strong>Unlimited</strong> active job postings
              </li>
              <li className="sub-card-feature-item">
                <Check size={16} className="sub-feature-icon" /> Everything in HR Pro included
              </li>
              <li className="sub-card-feature-item">
                <Check size={16} className="sub-feature-icon" /> Built-in Interview scheduling & calendar sync
              </li>
              <li className="sub-card-feature-item">
                <Check size={16} className="sub-feature-icon" /> Candidate interview scorecard & evaluation notes
              </li>
              <li className="sub-card-feature-item">
                <Check size={16} className="sub-feature-icon" /> Multi-stage recruitment pipeline boards
              </li>
              <li className="sub-card-feature-item">
                <Check size={16} className="sub-feature-icon" /> Full hiring telemetry, conversion & SLA reports
              </li>
              <li className="sub-card-feature-item">
                <Check size={16} className="sub-feature-icon" /> Dedicated account manager & onboarding
              </li>
            </ul>
          </div>
          <button
            className={`sub-btn ${isHrEnterprise ? 'sub-btn-outline' : 'sub-btn-primary'}`}
            style={{
              background: isHrEnterprise
                ? undefined
                : 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
            }}
            onClick={() => handlePurchase('HR_ENTERPRISE')}
            disabled={actionLoading || isHrEnterprise}
          >
            {isHrEnterprise ? (
              <>
                <Check size={16} /> Current Active Tier
              </>
            ) : (
              <>
                <Sparkles size={16} /> Upgrade to Enterprise (₹1,999/mo)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Payment Transactions & Billing History */}
      <div className="sub-table-card">
        <div className="sub-table-header">
          <h3 className="sub-table-title">
            <FileText size={18} color="#6366F1" /> Corporate Invoicing & Billing Statements
          </h3>
          <span style={{ fontSize: '12px', color: '#94A3B8' }}>
            {transactions.length} record{transactions.length === 1 ? '' : 's'}
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
              No payment transactions matching your filter. Once you upgrade your recruiter tier, GST invoices will appear here.
            </div>
          ) : (
            <table className="sub-table">
              <thead>
                <tr>
                  <th>Order Reference</th>
                  <th>Date & Time</th>
                  <th>Tier Name</th>
                  <th>Amount Paid</th>
                  <th>Payment Method</th>
                  <th>Status</th>
                  <th>GST Invoice</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
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
                          tx.status === 'CAPTURED' || tx.status === 'PAID'
                            ? 'sub-badge-active'
                            : tx.status === 'FAILED'
                            ? 'sub-badge-expired'
                            : tx.status === 'PENDING'
                            ? 'sub-badge-expiring'
                            : 'sub-badge-free'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => showToast(`Invoice PDF generated for ${tx.orderId}`)}
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
                        <Download size={11} /> PDF Invoice
                      </button>
                    </td>
                  </tr>
                ))}
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
              <h3 className="sub-modal-title">Cancel Recruiter Subscription</h3>
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
              Your recruiting quotas will remain available until{' '}
              <strong>
                {new Date(subscription!.currentPeriodEnd).toLocaleDateString()}
              </strong>
              . Afterwards, your account will fall back to the free basic recruiter quota.
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
                Reason for cancellation:
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Completed hiring drive, team downsizing, etc."
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
                Keep Plan
              </button>
              <button
                className="sub-btn sub-btn-danger"
                style={{ width: 'auto' }}
                onClick={handleCancel}
                disabled={actionLoading}
              >
                {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Checkout Modal */}
      {checkoutPlan && (
        <PaymentCheckoutModal
          plan={checkoutPlan}
          billingCycle="MONTHLY"
          isOpen={Boolean(checkoutPlan)}
          onClose={() => setCheckoutPlan(null)}
          onSuccess={() => {
            setCheckoutPlan(null);
            reload();
            showToast(`🎉 Upgraded to ${checkoutPlan.name}!`);
          }}
        />
      )}
    </div>
  );
};
