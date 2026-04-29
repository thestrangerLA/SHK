/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CurrencyValues {
  kip: number;
  thb: number;
  usd: number;
  cny: number;
}

export type Currency = Omit<CurrencyValues, 'cny'>;

export interface CooperativeMember {
  id: string;
  memberId: string;
  name: string;
  joinDate: Date;
  deposits: CurrencyValues;
  createdAt: Date;
}

export interface CooperativeDeposit {
  id: string;
  memberId: string;
  memberName: string;
  date: Date;
  kip: number;
  thb: number;
  usd: number;
  cny: number;
  createdAt: Date;
}

export interface CooperativeWithdrawal {
  id: string;
  memberId: string;
  memberName: string;
  date: Date;
  kip: number;
  thb: number;
  usd: number;
  cny: number;
  createdAt: Date;
}

export type IslamicLoanType = 'MURABAHA' | 'QARD_HASAN';

export interface Loan {
  id: string;
  loanCode: string;
  memberId?: string;
  debtorName?: string;
  amount: CurrencyValues;
  repaymentAmount: CurrencyValues;
  purpose: string;
  applicationDate: Date;
  loanType: IslamicLoanType;
  durationYears: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
}

export interface LoanRepayment {
  id: string;
  loanId: string;
  repaymentDate: Date;
  amountPaid: CurrencyValues;
  principalPortion?: CurrencyValues;
  profitPortion?: CurrencyValues;
  note?: string;
  createdAt: Date;
}

export interface CooperativeInvestment {
  id: string;
  title: string;
  amount: CurrencyValues;
  date: Date;
  createdAt: Date;
}

export interface FixedAsset {
  id: string;
  code: string;
  name: string;
  purchaseDate: Date;
  purchasePrice: CurrencyValues;
  usefulLifeYears: number;
  residualValue: CurrencyValues;
  location: string;
  status: 'active' | 'disposed' | 'maintenance';
  createdAt: Date;
}

export interface DividendItem {
  id: string;
  name: string;
  percentage: number;
}

export interface Account {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
}

export interface Transaction {
  id: string;
  transactionGroupId: string;
  accountId: string;
  date: Date;
  amount: CurrencyValues;
  type: 'debit' | 'credit';
  description: string;
  createdAt: Date;
}

export interface TradeReceivable {
  id: string;
  customerName: string;
  invoiceNumber: string;
  amount: CurrencyValues;
  cost?: CurrencyValues;
  date: Date;
  dueDate: Date;
  status: 'pending' | 'paid' | 'overdue';
  createdAt: Date;
}

export interface TradeReceivablePayment {
  id: string;
  arId: string;
  paymentDate: Date;
  amountPaid: CurrencyValues;
  note?: string;
  transactionGroupId?: string;
  createdAt: Date;
}
