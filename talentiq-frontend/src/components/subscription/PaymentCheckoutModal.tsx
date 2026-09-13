import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CreditCard,
  QrCode,
  Building2,
  ShieldCheck,
  Lock,
  AlertCircle,
  CheckCircle2,
  Clock,
  RotateCw,
  Copy,
  Check,
  X,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { subscriptionApi } from '../../api/subscriptionApi';
import type {
  PlanResponse,
  CreateOrderResponse,
  CreateQrSessionResponse,
  SubscriptionResponse,
} from '../../api/subscriptionApi';
import { loadRazorpay } from '../../utils/loadRazorpay';
import { useAuth } from '../../context/AuthContext';
import '../../css/payment-checkout.css';

interface PaymentCheckoutModalProps {
  plan: PlanResponse;
  billingCycle?: 'MONTHLY' | 'YEARLY';
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (subscription: SubscriptionResponse) => void;
}

type PaymentMethod = 'UPI_QR' | 'CARD' | 'NETBANKING' | 'RAZORPAY';

const POPULAR_BANKS = [
  { id: 'HDFC', name: 'HDFC Bank', code: 'HDFC' },
  { id: 'ICICI', name: 'ICICI Bank', code: 'ICIC' },
  { id: 'SBI', name: 'State Bank of India', code: 'SBIN' },
  { id: 'AXIS', name: 'Axis Bank', code: 'UTIB' },
  { id: 'KOTAK', name: 'Kotak Mahindra', code: 'KKBK' },
  { id: 'PNB', name: 'Punjab National Bank', code: 'PUNB' },
];

export const PaymentCheckoutModal: React.FC<PaymentCheckoutModalProps> = ({
  plan,
  billingCycle = 'MONTHLY',
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();

  // Step & Method state
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('UPI_QR');
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    orderId: string;
    amount: number;
    currency: string;
    method: string;
    maskedDetails?: string;
  } | null>(null);

  // Order & Session state
  const [order, setOrder] = useState<CreateOrderResponse | null>(null);
  const [qrSession, setQrSession] = useState<CreateQrSessionResponse | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(300);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);

  // Card form state
  const [cardHolder, setCardHolder] = useState<string>('');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvv, setCardCvv] = useState<string>('');
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});

  // Netbanking state
  const [selectedBank, setSelectedBank] = useState<string>('HDFC');

  const pollIntervalRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);

  // ── 1. Initialize Order on Open ──
  const initializeOrder = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await subscriptionApi.initiatePurchase(plan.planCode, billingCycle);
      if (res.data?.success && res.data.data) {
        const orderData = res.data.data;
        setOrder(orderData);

        // Fetch QR session immediately for default UPI view
        const qrRes = await subscriptionApi.createQrSession(orderData.orderId);
        if (qrRes.data?.success && qrRes.data.data) {
          setQrSession(qrRes.data.data);
          setSecondsRemaining(qrRes.data.data.ttlSeconds || 300);
        }
      } else {
        throw new Error(res.data?.message || 'Failed to initialize payment session');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Could not connect to payment gateway');
    } finally {
      setLoading(false);
    }
  }, [plan.planCode, billingCycle]);

  useEffect(() => {
    if (isOpen) {
      setSuccessData(null);
      initializeOrder();
    } else {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  }, [isOpen, initializeOrder]);

  // ── 2. Live Countdown Timer (300s TTL) ──
  useEffect(() => {
    if (!qrSession || secondsRemaining <= 0) return;

    timerIntervalRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [qrSession, secondsRemaining]);

  // ── 3. Background Polling for Payment Verification ──
  useEffect(() => {
    if (!order || secondsRemaining <= 0 || successData) return;

    pollIntervalRef.current = setInterval(async () => {
      try {
        const statusRes = await subscriptionApi.getPaymentSessionStatus(order.orderId);
        if (statusRes.data?.success && statusRes.data.data) {
          const s = statusRes.data.data;
          if (s.status === 'PAID' || s.status === 'CAPTURED') {
            clearInterval(pollIntervalRef.current);
            const mySubRes = await subscriptionApi.getMySubscription();
            if (mySubRes.data?.success) {
              setSuccessData({
                orderId: order.orderId,
                amount: order.amount,
                currency: order.currency || 'INR',
                method: 'UPI QR',
                maskedDetails: 'UPI / Scan & Pay',
              });
              onSuccess(mySubRes.data.data);
            }
          }
        }
      } catch (err) {
        // Silently ignore transient poll failures
      }
    }, 3000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [order, secondsRemaining, successData, onSuccess]);

  // ── Format Timer mm:ss ──
  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ── Copy UPI ID ──
  const handleCopyUpi = () => {
    navigator.clipboard.writeText('hiremind@icici');
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // ── Generate Fresh QR Code ──
  const handleRegenerateQr = async () => {
    if (!order) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await subscriptionApi.createQrSession(order.orderId);
      if (res.data?.success && res.data.data) {
        setQrSession(res.data.data);
        setSecondsRemaining(res.data.data.ttlSeconds || 300);
      } else {
        throw new Error(res.data?.message || 'Failed to refresh QR session');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to regenerate QR session');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Process UPI Verification / Test Approval ──
  const handleVerifyUpi = async (isTestSimulate: boolean = false) => {
    if (!order) return;
    if (secondsRemaining <= 0) {
      setError('QR Code session has expired. Please regenerate a new QR code.');
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      const mockPayId = 'pay_upi_' + Math.random().toString(36).substring(2, 10);
      const mockSig = 'mock_sig_' + Math.random().toString(36).substring(2, 12);
      const masked = isTestSimulate ? `${user?.email?.split('@')[0] || 'user'}@okhdfcbank` : 'hiremind@icici';

      const res = await subscriptionApi.verifyPayment(
        order.orderId,
        mockPayId,
        mockSig,
        'UPI',
        masked
      );

      if (res.data?.success && res.data.data) {
        setSuccessData({
          orderId: order.orderId,
          amount: order.amount,
          currency: order.currency,
          method: 'UPI',
          maskedDetails: masked,
        });
        onSuccess(res.data.data);
      } else {
        throw new Error(res.data?.message || 'Payment verification was not approved');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'UPI verification failed');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Card Validation Helpers ──
  const validateCardForm = () => {
    const errs: Record<string, string> = {};
    if (!cardHolder.trim()) errs.cardHolder = 'Cardholder name is required';

    const cleanNum = cardNumber.replace(/\s+/g, '');
    if (cleanNum.length < 15 || cleanNum.length > 16) {
      errs.cardNumber = 'Valid 15 or 16 digit card number is required';
    }

    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry)) {
      errs.cardExpiry = 'Format must be MM/YY';
    } else {
      const [m, y] = cardExpiry.split('/').map(Number);
      const currentYear = Number(new Date().getFullYear().toString().slice(-2));
      const currentMonth = new Date().getMonth() + 1;
      if (y < currentYear || (y === currentYear && m < currentMonth)) {
        errs.cardExpiry = 'Card has expired';
      }
    }

    if (cardCvv.length < 3 || cardCvv.length > 4) {
      errs.cardCvv = 'CVV must be 3 or 4 digits';
    }

    setCardErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 16);
    val = val.replace(/(.{4})/g, '$1 ').trim();
    setCardNumber(val);
  };

  const handleCardExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (val.length >= 3) {
      val = val.slice(0, 2) + '/' + val.slice(2);
    }
    setCardExpiry(val);
  };

  const detectCardBrand = (num: string) => {
    const clean = num.replace(/\s+/g, '');
    if (/^4/.test(clean)) return 'Visa';
    if (/^5[1-5]/.test(clean)) return 'Mastercard';
    if (/^6(011|5)/.test(clean)) return 'RuPay';
    if (/^3[47]/.test(clean)) return 'Amex';
    return null;
  };

  // ── Process Card Payment ──
  const handlePayWithCard = async () => {
    if (!order) return;
    if (!validateCardForm()) return;

    setActionLoading(true);
    setError(null);
    try {
      const cleanNum = cardNumber.replace(/\s+/g, '');
      const brand = detectCardBrand(cleanNum) || 'Card';
      const masked = `•••• •••• •••• ${cleanNum.slice(-4)} (${brand})`;
      const mockPayId = 'pay_card_' + Math.random().toString(36).substring(2, 10);
      const mockSig = 'mock_sig_' + Math.random().toString(36).substring(2, 12);

      const res = await subscriptionApi.verifyPayment(
        order.orderId,
        mockPayId,
        mockSig,
        'CARD',
        masked
      );

      if (res.data?.success && res.data.data) {
        setSuccessData({
          orderId: order.orderId,
          amount: order.amount,
          currency: order.currency,
          method: 'Card',
          maskedDetails: masked,
        });
        onSuccess(res.data.data);
      } else {
        throw new Error(res.data?.message || 'Card payment declined by bank');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Payment failed');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Process NetBanking ──
  const handlePayWithNetBanking = async () => {
    if (!order) return;
    setActionLoading(true);
    setError(null);
    try {
      const bank = POPULAR_BANKS.find((b) => b.id === selectedBank)?.name || selectedBank;
      const masked = `${bank} (NetBanking)`;
      const mockPayId = 'pay_nb_' + Math.random().toString(36).substring(2, 10);
      const mockSig = 'mock_sig_' + Math.random().toString(36).substring(2, 12);

      const res = await subscriptionApi.verifyPayment(
        order.orderId,
        mockPayId,
        mockSig,
        'NETBANKING',
        masked
      );

      if (res.data?.success && res.data.data) {
        setSuccessData({
          orderId: order.orderId,
          amount: order.amount,
          currency: order.currency,
          method: 'NetBanking',
          maskedDetails: masked,
        });
        onSuccess(res.data.data);
      } else {
        throw new Error(res.data?.message || 'Bank transaction rejected');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'NetBanking failed');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Process Live Razorpay Gateway ──
  const handleLaunchRazorpay = async () => {
    if (!order) return;
    setActionLoading(true);
    setError(null);
    try {
      const Razorpay = await loadRazorpay();
      if (!Razorpay) {
        throw new Error('Could not load Razorpay checkout script.');
      }

      const options = {
        key: order.gatewayKeyId,
        amount: Math.round(order.amount * 100),
        currency: order.currency || 'INR',
        name: 'HireMind AI',
        description: `Subscription: ${plan.name}`,
        order_id: order.gatewayOrderId,
        prefill: {
          name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
          email: user?.email || '',
        },
        theme: {
          color: '#2563EB',
        },
        handler: async (response: any) => {
          try {
            const verifyRes = await subscriptionApi.verifyPayment(
              order.orderId,
              response.razorpay_payment_id,
              response.razorpay_signature,
              'RAZORPAY',
              'Razorpay Checkout'
            );
            if (verifyRes.data?.success && verifyRes.data.data) {
              setSuccessData({
                orderId: order.orderId,
                amount: order.amount,
                currency: order.currency,
                method: 'Razorpay',
                maskedDetails: 'Razorpay Hosted',
              });
              onSuccess(verifyRes.data.data);
            } else {
              setError(verifyRes.data?.message || 'Verification failed');
            }
          } catch (vErr: any) {
            setError(vErr.response?.data?.message || vErr.message);
          }
        },
        modal: {
          ondismiss: () => {
            setActionLoading(false);
          },
        },
      };

      const rzp = new Razorpay(options);
      rzp.on('payment.failed', (resp: any) => {
        setError(resp.error?.description || 'Payment failed at gateway');
        setActionLoading(false);
      });
      rzp.open();
    } catch (err: any) {
      setError(err.message || 'Failed to open Razorpay');
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="pcm-overlay" onClick={onClose}>
      <div className="pcm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="pcm-header">
          <div className="pcm-header-left">
            <div className="pcm-header-icon">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="pcm-title">HireMind Secure Checkout</h3>
              <p className="pcm-subtitle">256-bit Encrypted Payment Gateway</p>
            </div>
          </div>
          <button className="pcm-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Order Summary Bar */}
        <div className="pcm-summary-bar">
          <div className="pcm-summary-plan">
            <span className="pcm-plan-name">{plan.name}</span>
            <span className="pcm-plan-badge">{billingCycle}</span>
          </div>
          <div className="pcm-summary-price">
            <span className="pcm-price-amount">₹{plan.priceAmount}</span>
            <span className="pcm-price-cycle"> / {billingCycle === 'YEARLY' ? 'year' : 'month'}</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="pcm-body">
          {error && (
            <div className="pcm-error-banner">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {successData ? (
            /* Success Celebration Screen */
            <div className="pcm-success-container">
              <div className="pcm-success-icon-box">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="pcm-success-title">Payment Successful!</h3>
              <p className="pcm-success-desc">
                Your subscription to <strong>{plan.name}</strong> is now active and benefits have been unlocked immediately.
              </p>

              <div className="pcm-success-card">
                <div className="pcm-upi-row">
                  <span className="pcm-upi-label">Order Reference</span>
                  <span className="pcm-upi-val">{successData.orderId}</span>
                </div>
                <div className="pcm-upi-row">
                  <span className="pcm-upi-label">Amount Paid</span>
                  <span className="pcm-upi-val" style={{ color: '#16A34A', fontWeight: 700 }}>
                    ₹{successData.amount}.00
                  </span>
                </div>
                <div className="pcm-upi-row">
                  <span className="pcm-upi-label">Payment Method</span>
                  <span className="pcm-upi-val">{successData.method}</span>
                </div>
                {successData.maskedDetails && (
                  <div className="pcm-upi-row">
                    <span className="pcm-upi-label">Details</span>
                    <span className="pcm-upi-val">{successData.maskedDetails}</span>
                  </div>
                )}
              </div>
            </div>
          ) : loading ? (
            /* Loading State */
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748B' }}>
              <RotateCw size={28} className="pcm-spin" style={{ margin: '0 auto 12px' }} />
              <p style={{ margin: 0, fontSize: '13px' }}>Generating secure payment session...</p>
            </div>
          ) : (
            /* Payment Content */
            <>
              {/* Method Selector Tabs */}
              <div className="pcm-method-tabs">
                <button
                  type="button"
                  className={`pcm-tab-btn ${selectedMethod === 'UPI_QR' ? 'active' : ''}`}
                  onClick={() => setSelectedMethod('UPI_QR')}
                >
                  <QrCode size={15} /> UPI / QR
                </button>
                <button
                  type="button"
                  className={`pcm-tab-btn ${selectedMethod === 'CARD' ? 'active' : ''}`}
                  onClick={() => setSelectedMethod('CARD')}
                >
                  <CreditCard size={15} /> Card
                </button>
                <button
                  type="button"
                  className={`pcm-tab-btn ${selectedMethod === 'NETBANKING' ? 'active' : ''}`}
                  onClick={() => setSelectedMethod('NETBANKING')}
                >
                  <Building2 size={15} /> NetBanking
                </button>
                <button
                  type="button"
                  className={`pcm-tab-btn ${selectedMethod === 'RAZORPAY' ? 'active' : ''}`}
                  onClick={() => setSelectedMethod('RAZORPAY')}
                >
                  <ExternalLink size={15} /> Gateway
                </button>
              </div>

              {/* TAB 1: UPI / DYNAMIC QR CODE */}
              {selectedMethod === 'UPI_QR' && (
                <div className="pcm-qr-container">
                  <div className={`pcm-timer-pill ${secondsRemaining <= 0 ? 'expired' : ''}`}>
                    <Clock size={14} />
                    <span>
                      {secondsRemaining > 0
                        ? `Session expires in ${formatTimer(secondsRemaining)}`
                        : 'QR Code Session Expired'}
                    </span>
                  </div>

                  <div className={`pcm-qr-box ${secondsRemaining <= 0 ? 'expired' : ''}`}>
                    {qrSession?.upiUri ? (
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=190x190&data=${encodeURIComponent(
                          qrSession.upiUri
                        )}`}
                        alt="UPI Payment QR Code"
                        className="pcm-qr-image"
                      />
                    ) : (
                      <div style={{ width: 190, height: 190, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <RotateCw size={24} className="pcm-spin" color="#64748B" />
                      </div>
                    )}

                    {secondsRemaining <= 0 && (
                      <div className="pcm-qr-overlay-expired">
                        <AlertCircle size={24} color="#EF4444" style={{ marginBottom: 6 }} />
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#B91C1C' }}>
                          QR Code Expired
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748B', marginTop: 2 }}>
                          Please regenerate
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pcm-upi-details-card">
                    <div className="pcm-upi-row">
                      <span className="pcm-upi-label">UPI ID</span>
                      <span className="pcm-upi-val">
                        hiremind@icici
                        <button type="button" className="pcm-copy-btn" onClick={handleCopyUpi}>
                          {copiedUpi ? <Check size={11} /> : <Copy size={11} />}
                          {copiedUpi ? 'Copied' : 'Copy'}
                        </button>
                      </span>
                    </div>
                    <div className="pcm-upi-row">
                      <span className="pcm-upi-label">Payee Name</span>
                      <span className="pcm-upi-val">HireMind AI (TalentIQ)</span>
                    </div>
                    <div className="pcm-upi-row">
                      <span className="pcm-upi-label">Amount</span>
                      <span className="pcm-upi-val" style={{ color: '#2563EB', fontWeight: 700 }}>
                        ₹{plan.priceAmount}.00
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CREDIT / DEBIT CARD */}
              {selectedMethod === 'CARD' && (
                <div className="pcm-card-form">
                  <div className="pcm-form-group">
                    <label className="pcm-label">Cardholder Full Name</label>
                    <input
                      type="text"
                      className={`pcm-input ${cardErrors.cardHolder ? 'error' : ''}`}
                      placeholder="e.g. Alex Kumar"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                    />
                    {cardErrors.cardHolder && (
                      <span style={{ fontSize: 11, color: '#EF4444' }}>{cardErrors.cardHolder}</span>
                    )}
                  </div>

                  <div className="pcm-form-group">
                    <label className="pcm-label">
                      <span>Card Number</span>
                      {detectCardBrand(cardNumber) && (
                        <span className="pcm-card-brand-badge">{detectCardBrand(cardNumber)}</span>
                      )}
                    </label>
                    <div className="pcm-input-wrapper">
                      <input
                        type="text"
                        className={`pcm-input ${cardErrors.cardNumber ? 'error' : ''}`}
                        placeholder="4242 •••• •••• 4242"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        maxLength={19}
                      />
                    </div>
                    {cardErrors.cardNumber && (
                      <span style={{ fontSize: 11, color: '#EF4444' }}>{cardErrors.cardNumber}</span>
                    )}
                  </div>

                  <div className="pcm-form-row">
                    <div className="pcm-form-group">
                      <label className="pcm-label">Expiry (MM/YY)</label>
                      <input
                        type="text"
                        className={`pcm-input ${cardErrors.cardExpiry ? 'error' : ''}`}
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={handleCardExpiryChange}
                        maxLength={5}
                      />
                      {cardErrors.cardExpiry && (
                        <span style={{ fontSize: 11, color: '#EF4444' }}>{cardErrors.cardExpiry}</span>
                      )}
                    </div>

                    <div className="pcm-form-group">
                      <label className="pcm-label">CVV / CVC</label>
                      <input
                        type="password"
                        className={`pcm-input ${cardErrors.cardCvv ? 'error' : ''}`}
                        placeholder="•••"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        maxLength={4}
                      />
                      {cardErrors.cardCvv && (
                        <span style={{ fontSize: 11, color: '#EF4444' }}>{cardErrors.cardCvv}</span>
                      )}
                    </div>
                  </div>

                  <div className="pcm-security-notice">
                    <Lock size={16} color="#2563EB" style={{ flexShrink: 0 }} />
                    <span>
                      Zero-Storage Protection: HireMind does not store card numbers or CVVs. All sensitive fields are validated client-side and encrypted end-to-end.
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 3: NETBANKING */}
              {selectedMethod === 'NETBANKING' && (
                <div>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 12px' }}>
                    Select your bank to authenticate and transfer securely:
                  </p>
                  <div className="pcm-bank-grid">
                    {POPULAR_BANKS.map((bank) => (
                      <div
                        key={bank.id}
                        className={`pcm-bank-card ${selectedBank === bank.id ? 'selected' : ''}`}
                        onClick={() => setSelectedBank(bank.id)}
                      >
                        <div className="pcm-bank-abbr">{bank.code}</div>
                        <span>{bank.name}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pcm-security-notice">
                    <ShieldCheck size={16} color="#10B981" style={{ flexShrink: 0 }} />
                    <span>
                      You will be directed to your bank’s official 2FA authentication portal.
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 4: RAZORPAY HOSTED CHECKOUT */}
              {selectedMethod === 'RAZORPAY' && (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <ShieldCheck size={36} color="#2563EB" style={{ margin: '0 auto 12px' }} />
                  <h4 style={{ margin: '0 0 6px', color: '#0F172A', fontSize: '15px' }}>
                    Standard Razorpay Checkout
                  </h4>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 16px' }}>
                    Launch the official Razorpay payment modal with support for Wallets, Cards, and PayLater.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer / Action Buttons */}
        <div className="pcm-footer">
          {successData ? (
            <button className="pcm-btn-primary" onClick={onClose}>
              <Check size={16} /> Continue to Dashboard
            </button>
          ) : (
            <>
              {selectedMethod === 'UPI_QR' && (
                <>
                  {secondsRemaining <= 0 ? (
                    <button
                      className="pcm-btn-primary"
                      onClick={handleRegenerateQr}
                      disabled={actionLoading}
                    >
                      <RotateCw size={15} className={actionLoading ? 'pcm-spin' : ''} />
                      Generate Fresh QR Code
                    </button>
                  ) : (
                    <>
                      <button
                        className="pcm-btn-primary"
                        onClick={() => handleVerifyUpi(false)}
                        disabled={actionLoading || secondsRemaining <= 0}
                      >
                        <CheckCircle2 size={16} />
                        {actionLoading ? 'Verifying Payment...' : 'I Have Paid / Check Status'}
                      </button>

                      {/* Mock Test Quick Approval button */}
                      <button
                        className="pcm-btn-mock"
                        onClick={() => handleVerifyUpi(true)}
                        disabled={actionLoading || secondsRemaining <= 0}
                        title="Simulate UPI payment approval"
                      >
                        <Zap size={13} />
                        Simulate UPI Approval (Instant Test)
                      </button>
                    </>
                  )}
                </>
              )}

              {selectedMethod === 'CARD' && (
                <button
                  className="pcm-btn-primary"
                  onClick={handlePayWithCard}
                  disabled={actionLoading}
                >
                  <Lock size={15} />
                  {actionLoading ? 'Encrypting & Paying...' : `Pay ₹${plan.priceAmount}.00 Securely`}
                </button>
              )}

              {selectedMethod === 'NETBANKING' && (
                <button
                  className="pcm-btn-primary"
                  onClick={handlePayWithNetBanking}
                  disabled={actionLoading}
                >
                  <ExternalLink size={15} />
                  {actionLoading ? 'Connecting to Bank...' : `Proceed to ${selectedBank} (₹${plan.priceAmount})`}
                </button>
              )}

              {selectedMethod === 'RAZORPAY' && (
                <button
                  className="pcm-btn-primary"
                  onClick={handleLaunchRazorpay}
                  disabled={actionLoading}
                >
                  <Zap size={15} />
                  {actionLoading ? 'Launching Gateway...' : `Open Razorpay Checkout (₹${plan.priceAmount})`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
