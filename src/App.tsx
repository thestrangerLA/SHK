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
        <Route path="/tee/cooperative/reports/monthly" element={<MonthlyTransactionReport />} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/tee/cooperative" replace />} />
      </Routes>
      <Toaster />
    </Router>
  );
}
