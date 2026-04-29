/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowLeft, FileText, Handshake, BookOpen, FilePieChart, Landmark, Users, TrendingUp, Wallet, CheckCircle2, AlertCircle, Calendar, Building } from "lucide-react"
import { Link } from 'react-router-dom'
import { Button } from "@/components/ui/button"
import { listenToCooperativeTransactions, getAccountBalances } from '@/services/cooperativeAccountingService'
import { listenToCooperativeMembers } from '@/services/cooperativeMemberService'
import { listenToCooperativeDividendStructure } from '@/services/cooperativeDividendService'
import { listenToFixedAssets } from '@/services/cooperativeFixedAssetService'
import { listenToTradeReceivables } from '@/services/cooperativeArService'
import { listenToCooperativeLoans, listenToAllRepayments } from '@/services/cooperativeLoanService'
import { defaultAccounts } from '@/services/cooperativeChartOfAccounts'
import type { Transaction, CooperativeMember, DividendItem, CurrencyValues, FixedAsset, TradeReceivable, Loan, LoanRepayment } from '@/lib/types'

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
};

export default function ReportsDashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [members, setMembers] = useState<CooperativeMember[]>([]);
  const [dividendStructure, setDividendStructure] = useState<DividendItem[]>([]);
  const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>([]);
  const [receivables, setReceivables] = useState<TradeReceivable[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [repayments, setRepayments] = useState<LoanRepayment[]>([]);

  useEffect(() => {
    const unsubTxs = listenToCooperativeTransactions(setTransactions);
    const unsubMembers = listenToCooperativeMembers(setMembers);
    const unsubDividend = listenToCooperativeDividendStructure(setDividendStructure);
    const unsubFixedAssets = listenToFixedAssets(setFixedAssets);
    const unsubAr = listenToTradeReceivables(setReceivables);
    const unsubLoans = listenToCooperativeLoans(setLoans);
    const unsubRepayments = listenToAllRepayments(setRepayments);
    return () => {
      unsubTxs();
      unsubMembers();
      unsubDividend();
      unsubFixedAssets();
      unsubAr();
      unsubLoans();
      unsubRepayments();
    };
  }, []);

  const metrics = useMemo(() => {
    const balances = getAccountBalances(transactions);
    const initialValues = { kip: 0, thb: 0, usd: 0, cny: 0 };
    
    const assets = { ...initialValues };
    const liabilities = { ...initialValues };
    const equity = { ...initialValues };
    const income = { ...initialValues };
    const expense = { ...initialValues };

    defaultAccounts.forEach(acc => {
      const bal = balances[acc.id] || initialValues;
      if (acc.type === 'asset') {
        assets.kip += bal.kip;
      } else if (acc.type === 'liability') {
        liabilities.kip += bal.kip * -1;
      } else if (acc.type === 'equity') {
        equity.kip += bal.kip * -1;
      } else if (acc.type === 'income') {
        income.kip += bal.kip * -1;
      } else if (acc.type === 'expense') {
        expense.kip += bal.kip;
      }
    });

    const netProfit = income.kip - expense.kip;
    const totalDividendPool = netProfit > 0 ? netProfit : 0;
    const isBalanced = Math.abs(assets.kip - (liabilities.kip + equity.kip)) < 0.01;

    return {
      netProfit,
      totalAssets: assets.kip,
      totalLiabilities: liabilities.kip,
      totalEquity: equity.kip,
      memberCount: members.length,
      totalDividendPool,
      income: income.kip,
      expense: expense.kip,
      isBalanced,
      totalFixedAssets: fixedAssets.filter(a => a.status === 'active').reduce((sum, a) => sum + (a.purchasePrice.kip || 0), 0),
      fixedAssetCount: fixedAssets.length,
      totalAr: receivables.filter(r => r.status !== 'paid').reduce((sum, r) => sum + (r.amount.kip || 0), 0),
      arCount: receivables.filter(r => r.status !== 'paid').length,
      loanTransactionCount: loans.filter(l => l.status === 'approved').length + repayments.length
    };
  }, [transactions, members, fixedAssets, receivables, loans, repayments]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-br from-background via-background to-primary/5">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-md px-4 sm:px-6">
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" asChild>
          <Link to="/tee/cooperative">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-xl">
            <FilePieChart className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">ລາຍງານທັງໝົດ</h1>
        </div>
      </header>
      <main className="flex-1 p-4 sm:px-6 md:py-12">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 w-full max-w-7xl mx-auto">
          <Link to="/tee/cooperative/reports/monthly">
            <Card className="card-hover border-none shadow-sm cursor-pointer h-full bg-card/50 backdrop-blur-sm overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <FileText className="h-24 w-24" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-xl font-bold">ລາຍງານການຝາກ-ຖອນ</CardTitle>
                <div className="bg-blue-100 p-2 rounded-lg z-10">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm leading-relaxed">
                  ລາຍງານການຝາກ ແລະ ຖອນເງິນປະຈຳເດືອນ ແຍກຕາມສະກຸນເງິນ ແລະ ສະຫຼຸບຍອດຄົງເຫຼືອ
                </p>
                <div className="pt-2 border-t flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase">ລາຍການທັງໝົດ</span>
                  <span className="text-sm font-bold font-mono">{transactions.filter(t => t.accountId === 'cash').length} ລາຍການ</span>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/tee/cooperative/reports/loans">
            <Card className="card-hover border-none shadow-sm cursor-pointer h-full bg-card/50 backdrop-blur-sm overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Handshake className="h-24 w-24" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-xl font-bold">ລາຍງານການຈ່າຍສິນເຊື່ອ</CardTitle>
                <div className="bg-indigo-100 p-2 rounded-lg z-10">
                  <Handshake className="h-6 w-6 text-indigo-600" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm leading-relaxed">
                  ລາຍງານການຈ່າຍເງິນກູ້ ແລະ ການຮັບຊຳລະຄືນປະຈຳເດືອນ ປຽບທຽບກັບຍອດເງິນຝາກ-ຖອນ
                </p>
                <div className="pt-2 border-t flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase">ລາຍການທັງໝົດ</span>
                  <span className="text-sm font-bold font-mono">{metrics.loanTransactionCount} ລາຍການ</span>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/tee/cooperative/accounting/reports/income-statement">
            <Card className="card-hover border-none shadow-sm cursor-pointer h-full bg-card/50 backdrop-blur-sm overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <TrendingUp className="h-24 w-24" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-bold">ໃບລາຍງານຜົນໄດ້ຮັບ</CardTitle>
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase bg-muted/50 w-fit px-2 py-0.5 rounded-full">
                    <Calendar className="h-3 w-3" />
                    ສົກປີປັດຈຸບັນ
                  </div>
                </div>
                <div className="bg-green-100 p-2 rounded-lg z-10">
                  <BookOpen className="h-6 w-6 text-green-600" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm leading-relaxed">
                  ສະແດງລາຍຮັບ, ລາຍຈ່າຍ, ແລະ ກໍາໄລ/ຂາດທຶນ (Income Statement)
                </p>
                <div className="pt-2 border-t space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase">ກຳໄລສຸດທິ (KIP)</span>
                    <span className={`text-sm font-bold font-mono ${metrics.netProfit < 0 ? 'text-red-500' : 'text-green-600'}`}>
                      {formatCurrency(metrics.netProfit)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>ລາຍຮັບ: {formatCurrency(metrics.income)}</span>
                    <span>ລາຍຈ່າຍ: {formatCurrency(metrics.expense)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/tee/cooperative/accounting/reports/balance-sheet">
            <Card className="card-hover border-none shadow-sm cursor-pointer h-full bg-card/50 backdrop-blur-sm overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Landmark className="h-24 w-24" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-bold">ໃບສະຫຼຸບຊັບສິນ</CardTitle>
                  <div className={`flex items-center gap-1.5 text-[10px] font-medium uppercase w-fit px-2 py-0.5 rounded-full ${metrics.isBalanced ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {metrics.isBalanced ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                    {metrics.isBalanced ? 'ດຸ່ນດ່ຽງແລ້ວ' : 'ບໍ່ດຸ່ນດ່ຽງ'}
                  </div>
                </div>
                <div className="bg-blue-100 p-2 rounded-lg z-10">
                  <Landmark className="h-6 w-6 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm leading-relaxed">
                  ສະແດງສິນຊັບ, ໜີ້ສິນ, ແລະ ທຶນ (Balance Sheet)
                </p>
                <div className="pt-2 border-t space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase">ລວມສິນຊັບ (KIP)</span>
                    <span className="text-sm font-bold font-mono text-blue-600">
                      {formatCurrency(metrics.totalAssets)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>ໜີ້ສິນ: {formatCurrency(metrics.totalLiabilities)}</span>
                    <span>ທຶນ: {formatCurrency(metrics.totalEquity)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/tee/cooperative/accounting/reports/dividend">
            <Card className="card-hover border-none shadow-sm cursor-pointer h-full bg-card/50 backdrop-blur-sm overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Wallet className="h-24 w-24" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-xl font-bold">ການປັນຜົນກຳໄລ</CardTitle>
                <div className="bg-purple-100 p-2 rounded-lg z-10">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm leading-relaxed">
                  ຄິດໄລ່ ແລະ ແບ່ງປັນຜົນກຳໄລໃຫ້ກັບຜູ້ມີສ່ວນຮ່ວມ
                </p>
                <div className="pt-2 border-t flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase">ເງິນປັນຜົນລວມ (KIP)</span>
                  <span className="text-sm font-bold font-mono text-purple-600">
                    {formatCurrency(metrics.totalDividendPool)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/tee/cooperative/accounting/reports/dividend-members">
            <Card className="card-hover border-none shadow-sm cursor-pointer h-full bg-card/50 backdrop-blur-sm overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Users className="h-24 w-24" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-xl font-bold">ລາຍງານການປັນຜົນໃຫ້ສະມາຊິກ</CardTitle>
                <div className="bg-orange-100 p-2 rounded-lg z-10">
                  <Users className="h-6 w-6 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm leading-relaxed">
                  ເບິ່ງລາຍລະອຽດເງິນປັນຜົນຂອງສະມາຊິກແຕ່ລະຄົນ
                </p>
                <div className="pt-2 border-t flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase">ຈຳນວນສະມາຊິກ</span>
                  <span className="text-sm font-bold font-mono text-orange-600">
                    {metrics.memberCount} ທ່ານ
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/tee/cooperative/fixed-assets">
            <Card className="card-hover border-none shadow-sm cursor-pointer h-full bg-card/50 backdrop-blur-sm overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Building className="h-24 w-24" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-xl font-bold">ລາຍງານສິນຊັບຄົງທີ່</CardTitle>
                <div className="bg-amber-100 p-2 rounded-lg z-10">
                  <Building className="h-6 w-6 text-amber-600" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm leading-relaxed">
                  ສະຫຼຸບລາຍການສິນຊັບຄົງທີ່, ມູນຄ່າລວມ ແລະ ສະຖານະການນຳໃຊ້
                </p>
                <div className="pt-2 border-t flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase">ມູນຄ່າລວມ (KIP)</span>
                  <span className="text-sm font-bold font-mono text-amber-600">
                    {formatCurrency(metrics.totalFixedAssets)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/tee/cooperative/ar">
            <Card className="card-hover border-none shadow-sm cursor-pointer h-full bg-card/50 backdrop-blur-sm overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <FileText className="h-24 w-24" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-xl font-bold">ລາຍງານລູກໜີ້ການຄ້າ</CardTitle>
                <div className="bg-rose-100 p-2 rounded-lg z-10">
                  <FileText className="h-6 w-6 text-rose-600" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm leading-relaxed">
                  ສະຫຼຸບຍອດລູກໜີ້ການຄ້າທີ່ຄ້າງຊຳລະ ແລະ ໃບບິນທີ່ກາຍກຳນົດ
                </p>
                <div className="pt-2 border-t flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase">ຍອດຄ້າງຊຳລະ (KIP)</span>
                  <span className="text-sm font-bold font-mono text-rose-600">
                    {formatCurrency(metrics.totalAr)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  )
}
