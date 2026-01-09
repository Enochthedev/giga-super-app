export interface PaymentRequest {
  id: string;
  module: 'hotel' | 'taxi' | 'ecommerce';
  amount: number;
  currency: string;
  userId: string;
  branchId: string;
  stateId: string;
  metadata: {
    moduleTransactionId: string;
    customerEmail?: string;
    customerPhone?: string;
    description?: string;
    [key: string]: any;
  };
  commissionRate: number;
  paymentMethod?: 'paystack' | 'stripe';
  createdAt: Date;
}

export interface PaymentResponse {
  success: boolean;
  transactionId: string;
  paymentReference?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  amount: number;
  commissionAmount: number;
  netAmount: number;
  message?: string;
  error?: string;
}

export interface RefundRequest {
  transactionId: string;
  reason: string;
  amount?: number; // Partial refund support
  userId: string;
}

export interface SettlementReport {
  reportId: string;
  period: {
    start: Date;
    end: Date;
  };
  totalTransactions: number;
  totalRevenue: number;
  totalCommission: number;
  totalNetAmount: number;
  byModule: {
    hotel: ModuleSettlement;
    taxi: ModuleSettlement;
    ecommerce: ModuleSettlement;
  };
  byState: Record<string, StateSettlement>;
  generatedAt: Date;
}

export interface ModuleSettlement {
  transactions: number;
  revenue: number;
  commission: number;
  netAmount: number;
}

export interface StateSettlement {
  stateName: string;
  transactions: number;
  revenue: number;
  commission: number;
  branches: Record<string, BranchSettlement>;
}

export interface BranchSettlement {
  branchName: string;
  transactions: number;
  revenue: number;
  commission: number;
}

export interface CircuitBreakerState {
  failures: number;
  lastFailureTime?: Date;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}
