import { useState, useEffect, useCallback } from 'react';
import { subscriptionApi } from '../api/subscriptionApi';
import type {
  PlanResponse,
  SubscriptionResponse,
  TransactionResponse,
  PagedResponse,
} from '../api/subscriptionApi';
import { loadRazorpay } from '../utils/loadRazorpay';
import { useAuth } from '../context/AuthContext';

interface UseSubscriptionOptions {
  role?: 'CANDIDATE' | 'HR' | 'COMPANY';
  autoFetch?: boolean;
}

export const useSubscription = (options: UseSubscriptionOptions = {}) => {
  const { role, autoFetch = true } = options;
  const { user } = useAuth();

  const [subscription, setSubscription] = useState<SubscriptionResponse | null>(null);
  const [plans, setPlans] = useState<PlanResponse[]>([]);
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      const res = await subscriptionApi.getMySubscription();
      if (res.data?.success) {
        setSubscription(res.data.data);
      } else {
        setSubscription(null);
      }
    } catch (err: any) {
      // 404 or no active subscription is expected for new users
      setSubscription(null);
    }
  }, []);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await subscriptionApi.getPlans(role);
      if (res.data?.success && Array.isArray(res.data.data)) {
        setPlans(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch subscription plans', err);
    }
  }, [role]);

  const fetchTransactions = useCallback(async (page: number = 0, size: number = 10): Promise<PagedResponse<TransactionResponse> | null> => {
    try {
      const res = await subscriptionApi.getTransactions(page, size);
      if (res.data?.success && res.data.data) {
        const paged = res.data.data;
        setTransactions(paged.content || []);
        return paged;
      }
      return null;
    } catch (err: any) {
      console.error('Failed to fetch transactions', err);
      return null;
    }
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.allSettled([fetchSubscription(), fetchPlans(), fetchTransactions(0, 10)]);
    } finally {
      setLoading(false);
    }
  }, [fetchSubscription, fetchPlans, fetchTransactions]);

  useEffect(() => {
    if (autoFetch && user) {
      reload();
    }
  }, [autoFetch, user, reload]);

  /**
   * Complete end-to-end checkout flow:
   * 1. Initiate order on backend
   * 2. Load Razorpay or handle Mock mode
   * 3. Verify signature on backend
   * 4. Refresh subscription state
   */
  const purchasePlan = async (
    planCode: string,
    billingCycle: string = 'MONTHLY'
  ): Promise<{ success: boolean; error?: string }> => {
    setActionLoading(true);
    setError(null);

    try {
      const orderRes = await subscriptionApi.initiatePurchase(planCode, billingCycle);
      if (!orderRes.data?.success || !orderRes.data.data) {
        throw new Error(orderRes.data?.message || 'Failed to initialize payment order');
      }

      const orderData = orderRes.data.data;
      const isMock = orderData.gatewayKeyId === 'mock_key_id' || orderData.gatewayOrderId?.startsWith('mock_order_');

      if (isMock) {
        // Mock Gateway Flow: Instantly verify with mock payment ID and mock signature
        const mockPayId = 'mock_pay_' + Math.random().toString(36).substring(2, 12);
        const mockSig = 'mock_sig_' + Math.random().toString(36).substring(2, 14);

        const verifyRes = await subscriptionApi.verifyPayment(orderData.orderId, mockPayId, mockSig);
        if (verifyRes.data?.success) {
          setSubscription(verifyRes.data.data);
          await fetchTransactions(0, 10);
          return { success: true };
        } else {
          throw new Error(verifyRes.data?.message || 'Mock payment verification failed');
        }
      }

      // Razorpay Live/Test Flow
      const Razorpay = await loadRazorpay();
      if (!Razorpay) {
        throw new Error('Payment gateway SDK failed to load. Please check your internet connection.');
      }

      return new Promise((resolve) => {
        const options = {
          key: orderData.gatewayKeyId,
          amount: Math.round(orderData.amount * 100),
          currency: orderData.currency || 'INR',
          name: 'HireMind AI',
          description: `Subscription: ${planCode}`,
          order_id: orderData.gatewayOrderId,
          prefill: {
            name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
            email: user?.email || '',
          },
          theme: {
            color: '#4F46E5',
          },
          handler: async (response: any) => {
            try {
              const verifyRes = await subscriptionApi.verifyPayment(
                orderData.orderId,
                response.razorpay_payment_id,
                response.razorpay_signature
              );
              if (verifyRes.data?.success) {
                setSubscription(verifyRes.data.data);
                await fetchTransactions(0, 10);
                resolve({ success: true });
              } else {
                resolve({ success: false, error: verifyRes.data?.message || 'Verification failed' });
              }
            } catch (vErr: any) {
              resolve({ success: false, error: vErr.response?.data?.message || vErr.message });
            }
          },
          modal: {
            ondismiss: () => {
              resolve({ success: false, error: 'Payment was dismissed by user' });
            },
          },
        };

        const rzp = new Razorpay(options);
        rzp.on('payment.failed', (resp: any) => {
          resolve({
            success: false,
            error: resp.error?.description || 'Payment execution failed at gateway',
          });
        });
        rzp.open();
      });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Payment processing failed';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setActionLoading(false);
    }
  };

  const cancelSubscription = async (reason: string): Promise<boolean> => {
    setActionLoading(true);
    try {
      const res = await subscriptionApi.cancelSubscription(reason);
      if (res.data?.success) {
        await fetchSubscription();
        return true;
      }
      return false;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to cancel subscription');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  return {
    subscription,
    plans,
    transactions,
    loading,
    actionLoading,
    error,
    reload,
    fetchSubscription,
    fetchPlans,
    fetchTransactions,
    purchasePlan,
    cancelSubscription,
  };
};
