/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from "@/components/ui/sonner";
import CooperativePage from './pages/cooperative/CooperativePage';
import CooperativeMembersPage from './pages/cooperative/members/CooperativeMembersPage';
import MemberDetailPage from './pages/cooperative/members/MemberDetailPage';
import CooperativeAccountancyPage from './pages/cooperative/accounting/CooperativeAccountancyPage';
import CooperativeIncomeExpensePage from './pages/cooperative/income-expense/CooperativeIncomeExpensePage';
import CooperativeLoansPage from './pages/cooperative/loans/CooperativeLoansPage';
import NewLoanPage from './pages/cooperative/loans/NewLoanPage';
import LoanDetailPage from './pages/cooperative/loans/LoanDetailPage';
import LoanPaymentPage from './pages/cooperative/loans/LoanPaymentPage';
import MonthlyTransactionReport from './pages/cooperative/reports/MonthlyTransactionReport';
import LoanTransactionReport from './pages/cooperative/reports/LoanTransactionReport';
import MonthlyLoanPaymentsReport from './pages/cooperative/reports/MonthlyLoanPaymentsReport';
import ReportsDashboard from './pages/cooperative/reports/ReportsDashboard';
import CooperativeInvestmentsPage from './pages/cooperative/investments/CooperativeInvestmentsPage';
import CooperativeFixedAssetsPage from './pages/cooperative/fixed-assets/CooperativeFixedAssetsPage';
import CooperativeArPage from './pages/cooperative/ar/CooperativeArPage';
import ArDetailPage from './pages/cooperative/ar/ArDetailPage';
import IncomeStatementPage from './pages/cooperative/accounting/reports/IncomeStatementPage';
import BalanceSheetPage from './pages/cooperative/accounting/reports/BalanceSheetPage';
import DividendPage from './pages/cooperative/accounting/reports/DividendPage';
import DividendMembersPage from './pages/cooperative/accounting/reports/DividendMembersPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/tee/cooperative" replace />} />
        <Route path="/tee/cooperative" element={<CooperativePage />} />
        <Route path="/tee/cooperative/members" element={<CooperativeMembersPage />} />
        <Route path="/tee/cooperative/members/:id" element={<MemberDetailPage />} />
        <Route path="/tee/cooperative/accounting" element={<CooperativeAccountancyPage />} />
        <Route path="/tee/cooperative/income-expense" element={<CooperativeIncomeExpensePage />} />
        <Route path="/tee/cooperative/loans" element={<CooperativeLoansPage />} />
        <Route path="/tee/cooperative/loans/new" element={<NewLoanPage />} />
        <Route path="/tee/cooperative/loans/:id" element={<LoanDetailPage />} />
        <Route path="/tee/cooperative/loans/payment" element={<LoanPaymentPage />} />
        <Route path="/tee/cooperative/investments" element={<CooperativeInvestmentsPage />} />
        <Route path="/tee/cooperative/fixed-assets" element={<CooperativeFixedAssetsPage />} />
        <Route path="/tee/cooperative/ar" element={<CooperativeArPage />} />
        <Route path="/tee/cooperative/ar/:id" element={<ArDetailPage />} />
        <Route path="/tee/cooperative/reports" element={<ReportsDashboard />} />
        <Route path="/tee/cooperative/reports/monthly" element={<MonthlyTransactionReport />} />
        <Route path="/tee/cooperative/reports/loans" element={<LoanTransactionReport />} />
        <Route path="/tee/cooperative/reports/loan-payments" element={<MonthlyLoanPaymentsReport />} />
        
        {/* Accounting Reports */}
        <Route path="/tee/cooperative/accounting/reports/income-statement" element={<IncomeStatementPage />} />
        <Route path="/tee/cooperative/accounting/reports/balance-sheet" element={<BalanceSheetPage />} />
        <Route path="/tee/cooperative/accounting/reports/dividend" element={<DividendPage />} />
        <Route path="/tee/cooperative/accounting/reports/dividend-members" element={<DividendMembersPage />} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/tee/cooperative" replace />} />
      </Routes>
      <Toaster />
    </Router>
  );
}
