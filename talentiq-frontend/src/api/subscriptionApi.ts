import apiClient from './client';

export interface PlanResponse {
  planCode: string;
  name: string;
  description: string;
  targetRole: string;
  priceAmount: number;
  currency: string;
  billingCycle: string;
  features: string[];
  maxJobs?: number;
  maxAiMatches?: number;
  active: boolean;
}

export interface SubscriptionResponse {
  subscriptionId: number;
  status: string;
  plan: PlanResponse;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  autoRenew: boolean;
  cancelledAt?: string;
}

export interface CreateOrderResponse {
  orderId: string;
  gatewayOrderId: string;
  amount: number;
  currency: string;
  gatewayKeyId: string;
}

export interface TransactionResponse {
  orderId: string;
  gatewayPaymentId?: string;
  amount: number;
  currency: string;
  status: string;
  planName: string;
  paymentMethod?: string;
  maskedDetails?: string;
  createdAt: string;
  errorMessage?: string;
}

export interface PagedResponse<T> {
  content: T[];
  pageable: any;
  totalPages: number;
  totalElements: number;
  last: boolean;
  size: number;
  number: number;
  first: boolean;
  numberOfElements: number;
  empty: boolean;
}

export const subscriptionApi = {
  getPlans: (role?: string) => 
    apiClient.get('/subscriptions/plans', { params: { role } }),
    
  getMySubscription: () => 
    apiClient.get('/subscriptions/my'),
    
  initiatePurchase: (planCode: string, billingCycle: string = 'MONTHLY') => 
    apiClient.post('/subscriptions/purchase', { planCode, billingCycle }),
    
  verifyPayment: (orderId: string, gatewayPaymentId: string, gatewaySignature: string) => 
    apiClient.post('/subscriptions/verify', { orderId, gatewayPaymentId, gatewaySignature }),
    
  renewSubscription: () => 
    apiClient.post('/subscriptions/renew', {}),
    
  cancelSubscription: (reason: string) => 
    apiClient.post('/subscriptions/cancel', { reason }),
    
  getTransactions: (page: number = 0, size: number = 20) => 
    apiClient.get('/subscriptions/transactions', { params: { page, size } }),
};
