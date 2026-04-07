/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client"
import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ArrowLeft, PlusCircle, Calendar as CalendarIcon, Scale, Search, Trash2, X, Landmark, Wallet, MinusCircle, Users, TrendingUp, Building, Briefcase, BookOpen, Edit, RefreshCw } from "lucide-react"
import { Link } from 'react-router-dom'
import { useToast } from "@/hooks/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Textarea } from "@/components/ui/textarea"
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { defaultAccounts } from '@/services/cooperativeChartOfAccounts';
import { listenToCooperativeTransactions, getAccountBalances, createTransaction, deleteTransactionGroup } from '@/services/cooperativeAccountingService';
import { listenToCooperativeAccounts, seedInitialSystemData } from '@/services/cooperativeAccountService';
import { listenToCooperativeLoans, listenToAllRepayments } from '@/services/cooperativeLoanService';
import { listenToCooperativeDeposits } from '@/services/cooperativeDepositService';
import { listenToAllCooperativeWithdrawals } from '@/services/cooperativeWithdrawalService';
import { listenToCooperativeMembers } from '@/services/cooperativeMemberService';
import type { Account, Transaction, CurrencyValues, Loan, LoanRepayment, CooperativeDeposit, CooperativeWithdrawal, CooperativeMember } from '@/lib/types';
import { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"

const currencies: (keyof CurrencyValues)[] = ['kip', 'thb', 'usd', 'cny'];

const journalActions = [
  { id: 'deposit', name: 'ຮັບເງິນຝາກສະມາຊິກ (Member Deposit)', debit: 'payment', credit: 'deposits_payable' },
  { id: 'withdrawal', name: 'ຖອນເງິນຝາກສະມາຊິກ (Member Withdrawal)', debit: 'deposits_payable', credit: 'payment' },
  { id: 'loan_issue', name: 'ປ່ອຍເງິນກູ້ (Issue Loan)', debit: 'loans_receivable', credit: 'payment' },
  { id: 'loan_repayment', name: 'ຮັບຊຳລະເງິນກູ້ (Loan Repayment)', debit: 'payment', credit: 'loans_receivable' },
  { id: 'investment', name: 'ລົງທຶນ (Investment)', debit: 'investments', credit: 'payment' },
  { id: 'expense_admin', name: 'ລາຍຈ່າຍບໍລິຫານ (Admin Expense)', debit: 'expense_admin', credit: 'payment' },
  { id: 'expense_salary', name: 'ລາຍຈ່າຍເງິນເດືອນ (Salary Expense)', debit: 'expense_salary', credit: 'payment' },
  { id: 'income_fees', name: 'ຮັບຄ່າທຳນຽມ (Fee Income)', debit: 'payment', credit: 'income_fees' },
  { id: 'capital', name: 'ຮັບທຶນສະຫະກອນ (Capital Contribution)', debit: 'payment', credit: 'capital' },
  { id: 'custom', name: 'ອື່ນໆ (Custom Entry)', debit: 'custom', credit: 'custom' },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
}

const SummaryCard: React.FC<{ 
  title: string, 
  balances: CurrencyValues, 
  icon?: React.ReactNode, 
  variant?: 'default' | 'highlight',
  onEdit?: () => void
}> = ({ title, balances, icon, variant = 'default', onEdit }) => (
  <Card className={cn(variant === 'highlight' && "bg-blue-50/50 border-blue-100")}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <div className="flex items-center gap-1">
        {onEdit && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit}>
            <Edit className="h-3 w-3" />
          </Button>
        )}
        {icon || <Scale className="h-4 w-4 text-muted-foreground" />}
      </div>
    </CardHeader>
    <CardContent>
      {currencies.some(c => (balances[c] || 0) !== 0) ? (
        currencies.filter(c => (balances[c] || 0) !== 0).map(c => (
          <div key={c} className="text-xs">
            <span className="font-semibold uppercase">{c}: </span>
            <span>{formatCurrency(balances[c] || 0)}</span>
          </div>
        ))
      ) : (
        <div className="text-xs">
          <span className="font-semibold uppercase">kip: </span>
          <span>0</span>
        </div>
      )}
    </CardContent>
  </Card>
);

import { UserNav } from '@/components/UserNav';
import { startOfMonth, endOfMonth, getMonth, getYear } from 'date-fns';
import { LAO_MONTHS } from '@/lib/date-utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

export default function CooperativeAccountancyPage() {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountBalances, setAccountBalances] = useState<Record<string, CurrencyValues>>({});
  
  // System data for linking
  const [loans, setLoans] = useState<Loan[]>([]);
  const [repayments, setRepayments] = useState<LoanRepayment[]>([]);
  const [deposits, setDeposits] = useState<CooperativeDeposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<CooperativeWithdrawal[]>([]);
  const [members, setMembers] = useState<CooperativeMember[]>([]);

  // Form state
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [description, setDescription] = useState('');
  const [selectedActionId, setSelectedActionId] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState('cash');
  const [debitAccountId, setDebitAccountId] = useState('');
  const [creditAccountId, setCreditAccountId] = useState('');
  const [amount, setAmount] = useState<CurrencyValues>({ kip: 0, thb: 0, usd: 0, cny: 0 });

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Edit balance state
  const [displayMonth, setDisplayMonth] = useState<Date>(new Date());
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [newBalance, setNewBalance] = useState<CurrencyValues>({ kip: 0, thb: 0, usd: 0, cny: 0 });

  useEffect(() => {
    const unsubscribeTransactions = listenToCooperativeTransactions(setTransactions);
    const unsubscribeAccounts = listenToCooperativeAccounts(setAccounts);
    const unsubscribeLoans = listenToCooperativeLoans(setLoans);
    const unsubscribeRepayments = listenToAllRepayments(setRepayments);
    const unsubscribeDeposits = listenToCooperativeDeposits(setDeposits);
    const unsubscribeWithdrawals = listenToAllCooperativeWithdrawals(setWithdrawals);
    const unsubscribeMembers = listenToCooperativeMembers(setMembers);
    
    // Seed initial system data if collections are empty
    seedInitialSystemData();
    
    return () => {
      unsubscribeTransactions();
      unsubscribeAccounts();
      unsubscribeLoans();
      unsubscribeRepayments();
      unsubscribeDeposits();
      unsubscribeWithdrawals();
      unsubscribeMembers();
    };
  }, []);

  useEffect(() => {
    const balances = getAccountBalances(transactions);
    setAccountBalances(balances);
  }, [transactions]);

  const summaryData = useMemo(() => {
    const totalAssets: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };
    accounts.filter(a => a.type === 'asset' && a.id !== 'cash').forEach(acc => {
      const bal = accountBalances[acc.id] || { kip: 0, thb: 0, usd: 0, cny: 0 };
      currencies.forEach(c => totalAssets[c] += bal[c]);
    });

    const totalBcel: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };
    ['bank_bcel', 'bank_bcel_cash'].forEach(id => {
      const bal = accountBalances[id] || { kip: 0, thb: 0, usd: 0, cny: 0 };
      currencies.forEach(c => totalBcel[c] += bal[c]);
    });

    const cashBal = accountBalances['cash'] || { kip: 0, thb: 0, usd: 0, cny: 0 };
    const difference: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };
    currencies.forEach(c => difference[c] = cashBal[c] - totalBcel[c]);

    // System linked data
    const totalOutstanding: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };
    loans.forEach(loan => {
      // Match CooperativeLoansPage logic: exclude 'pending' loans
      if (loan.status !== 'pending' && loan.status !== 'rejected') {
        currencies.forEach(c => totalOutstanding[c] += (loan.repaymentAmount?.[c] || 0));
      }
    });
    repayments.forEach(rep => {
      // Only subtract repayments for loans that are not pending/rejected
      const loan = loans.find(l => l.id === rep.loanId);
      if (loan && loan.status !== 'pending' && loan.status !== 'rejected') {
        currencies.forEach(c => totalOutstanding[c] -= (rep.amountPaid?.[c] || 0));
      }
    });

    const totalDeposits: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };
    // Include initial deposits from members
    members.forEach(member => {
      currencies.forEach(c => totalDeposits[c] += (member.deposits?.[c] || 0));
    });
    // Include transaction-based deposits
    deposits.forEach(dep => {
      currencies.forEach(c => totalDeposits[c] += (dep[c] || 0));
    });
    // Subtract withdrawals
    withdrawals.forEach(wit => {
      currencies.forEach(c => totalDeposits[c] -= (wit[c] || 0));
    });

    const totalIncome: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };
    accounts.filter(a => a.type === 'income').forEach(acc => {
      const bal = accountBalances[acc.id] || { kip: 0, thb: 0, usd: 0, cny: 0 };
      // Income accounts have credit balances (negative in our system), so we subtract to get a positive display value
      currencies.forEach(c => totalIncome[c] -= bal[c]);
    });

    const totalExpenses: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };
    accounts.filter(a => a.type === 'expense').forEach(acc => {
      const bal = accountBalances[acc.id] || { kip: 0, thb: 0, usd: 0, cny: 0 };
      currencies.forEach(c => totalExpenses[c] += bal[c]);
    });

    const netProfit: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };
    currencies.forEach(c => netProfit[c] = totalIncome[c] - totalExpenses[c]);

    return { totalAssets, totalBcel, difference, totalOutstanding, totalDeposits, totalIncome, totalExpenses, netProfit };
  }, [accountBalances, accounts, loans, repayments, deposits, withdrawals, members]);

  const monthlyStats = useMemo(() => {
    const start = startOfMonth(displayMonth);
    const end = endOfMonth(displayMonth);
    
    const stats = {
        deposit: { kip: 0, thb: 0, usd: 0, cny: 0 },
        withdrawal: { kip: 0, thb: 0, usd: 0, cny: 0 }
    };

    deposits.forEach(d => {
        if (isWithinInterval(d.date, { start, end })) {
            currencies.forEach(c => {
                const val = d[c] || 0;
                if (val > 0) stats.deposit[c] += val;
            });
        }
    });

    withdrawals.forEach(w => {
        if (isWithinInterval(w.date, { start, end })) {
            currencies.forEach(c => {
                const val = w[c] || 0;
                if (val > 0) stats.withdrawal[c] += val;
            });
        }
    });

    return stats;
  }, [deposits, withdrawals, displayMonth]);

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    transactions.forEach(tx => {
      if (!groups[tx.transactionGroupId]) {
        groups[tx.transactionGroupId] = [];
      }
      groups[tx.transactionGroupId].push(tx);
    });

    // Convert to array and sort by date descending
    return Object.values(groups).sort((a, b) => b[0].date.getTime() - a[0].date.getTime());
  }, [transactions]);

  const filteredGroups = useMemo(() => {
    let result = groupedTransactions;

    if (searchQuery) {
      result = result.filter(group => 
        group.some(tx => tx.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (selectedAccountId && selectedAccountId !== 'all') {
      result = result.filter(group => 
        group.some(tx => tx.accountId === selectedAccountId)
      );
    }

    if (dateRange?.from) {
      result = result.filter(group => {
        const txDate = group[0].date;
        if (dateRange.to) {
          return isWithinInterval(txDate, { 
            start: startOfDay(dateRange.from!), 
            end: endOfDay(dateRange.to!) 
          });
        }
        return txDate >= startOfDay(dateRange.from!);
      });
    }

    return result;
  }, [groupedTransactions, searchQuery, selectedAccountId, dateRange]);

  const handleAmountChange = (currency: keyof CurrencyValues, value: string) => {
    setAmount(prev => ({ ...prev, [currency]: Number(value) || 0 }));
  }

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalAmount = amount.kip + amount.thb + amount.usd + amount.cny;
    
    let finalDebitId = debitAccountId;
    let finalCreditId = creditAccountId;

    if (selectedActionId && selectedActionId !== 'custom') {
      const action = journalActions.find(a => a.id === selectedActionId);
      if (action) {
        finalDebitId = action.debit === 'payment' ? paymentAccountId : action.debit;
        finalCreditId = action.credit === 'payment' ? paymentAccountId : action.credit;
      }
    }

    if (!date || !description || !finalDebitId || !finalCreditId || totalAmount === 0) {
      toast({ title: "ຂໍ້ມູນບໍ່ຄົບ", description: "ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບຖ້ວນ", variant: "destructive" });
      return;
    }
    try {
      await createTransaction(finalDebitId, finalCreditId, amount, description, date);
      toast({ title: "ສ້າງທຸລະກຳສຳເລັດ" });
      // Reset form
      setDate(new Date());
      setDescription('');
      setSelectedActionId('');
      setDebitAccountId('');
      setCreditAccountId('');
      setAmount({ kip: 0, thb: 0, usd: 0, cny: 0 });

    } catch (error) {
      console.error("Error adding transaction:", error);
      toast({ title: "ເກີດຂໍ້ຜິດພາດ", variant: "destructive" });
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await deleteTransactionGroup(groupId);
      toast({ title: "ລຶບທຸລະກຳສຳເລັດ" });
    } catch (error) {
      console.error("Error deleting transaction group:", error);
      toast({ title: "ເກີດຂໍ້ຜິດພາດໃນການລຶບ", variant: "destructive" });
    }
  }

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedAccountId('all');
    setDateRange(undefined);
  }

  const handleOpenEditBalance = (accountId: string) => {
    setEditingAccountId(accountId);
    setNewBalance(accountBalances[accountId] || { kip: 0, thb: 0, usd: 0, cny: 0 });
  };

  const handleSaveBalance = async () => {
    if (!editingAccountId) return;
    
    const currentBalance = accountBalances[editingAccountId] || { kip: 0, thb: 0, usd: 0, cny: 0 };
    const adjustment: CurrencyValues = {
      kip: (newBalance.kip || 0) - (currentBalance.kip || 0),
      thb: (newBalance.thb || 0) - (currentBalance.thb || 0),
      usd: (newBalance.usd || 0) - (currentBalance.usd || 0),
      cny: (newBalance.cny || 0) - (currentBalance.cny || 0),
    };

    const totalAdjustment = Math.abs(adjustment.kip) + Math.abs(adjustment.thb) + Math.abs(adjustment.usd) + Math.abs(adjustment.cny);
    if (totalAdjustment === 0) {
      setEditingAccountId(null);
      return;
    }

    try {
      const increases: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };
      const decreases: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };
      
      let hasIncrease = false;
      let hasDecrease = false;
      
      currencies.forEach(c => {
        if (adjustment[c] > 0) {
          increases[c] = adjustment[c];
          hasIncrease = true;
        } else if (adjustment[c] < 0) {
          decreases[c] = Math.abs(adjustment[c]);
          hasDecrease = true;
        }
      });
      
      const accountName = accounts.find(a => a.id === editingAccountId)?.name;

      if (hasIncrease) {
        await createTransaction(editingAccountId, 'capital', increases, `ປັບປຸງຍອດບັນຊີ (Balance Adjustment) - ${accountName}`, new Date());
      }
      
      if (hasDecrease) {
        await createTransaction('capital', editingAccountId, decreases, `ປັບປຸງຍອດບັນຊີ (Balance Adjustment) - ${accountName}`, new Date());
      }
      
      toast({ title: "ປັບປຸງຍອດບັນຊີສຳເລັດ" });
      setEditingAccountId(null);
    } catch (error) {
      console.error("Error adjusting balance:", error);
      toast({ title: "ເກີດຂໍ້ຜິດພາດ", variant: "destructive" });
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="h-8 w-8" asChild>
            <Link to="/tee/cooperative"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-green-600" />
            <h1 className="text-xl font-bold tracking-tight">ການບັນຊີ (ສະຫະກອນ)</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                {displayMonth ? `${LAO_MONTHS[getMonth(displayMonth)]} ${getYear(displayMonth) + 543}` : 'Select Month'}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {[2024, 2025, 2026].map(year => (
                <div key={year}>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <span>{year + 543}</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        {LAO_MONTHS.map((monthName, monthIndex) => (
                          <DropdownMenuItem
                            key={monthIndex}
                            onClick={() => {
                              const newDate = new Date(year, monthIndex, 1);
                              setDisplayMonth(newDate);
                            }}
                          >
                            {monthName}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" asChild>
            <Link to="/tee/cooperative/income-expense">
              <BookOpen className="mr-2 h-4 w-4" />
              ໄປທີ່ໜ້າລາຍຮັບ-ລາຍຈ່າຍ
            </Link>
          </Button>
          <UserNav />
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
        <div className="grid gap-4 md:grid-cols-2 mb-4">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-bold">ຍອດຝາກປະຈຳເດືອນ</CardTitle>
              <PlusCircle className="h-6 w-6 text-green-500" />
            </CardHeader>
            <CardContent>
              {Object.entries(monthlyStats.deposit).filter(([, v]) => (v as number) > 0).length > 0 ? (
                Object.entries(monthlyStats.deposit).filter(([, v]) => (v as number) > 0).map(([c, v]) => (
                  <p key={c} className="text-2xl font-bold text-green-600">
                    {String(c).toUpperCase()}: {formatCurrency(v as number)}
                  </p>
                ))
              ) : (
                <p className="text-xl text-muted-foreground font-medium">ບໍ່ມີການຝາກ</p>
              )}
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-bold">ຍອດຖອນປະຈຳເດືອນ</CardTitle>
              <MinusCircle className="h-6 w-6 text-red-500" />
            </CardHeader>
            <CardContent>
              {Object.entries(monthlyStats.withdrawal).filter(([, v]) => (v as number) > 0).length > 0 ? (
                Object.entries(monthlyStats.withdrawal).filter(([, v]) => (v as number) > 0).map(([c, v]) => (
                  <p key={c} className="text-2xl font-bold text-red-600">
                    {String(c).toUpperCase()}: {formatCurrency(v as number)}
                  </p>
                ))
              ) : (
                <p className="text-xl text-muted-foreground font-medium">ບໍ່ມີການຖອນ</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={!!editingAccountId} onOpenChange={(open) => !open && setEditingAccountId(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>ແກ້ໄຂຍອດບັນຊີ: {accounts.find(a => a.id === editingAccountId)?.name}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <p className="text-sm text-muted-foreground">ລະບົບຈະສ້າງທຸລະກຳປັບປຸງຍອດ (Balance Adjustment) ເພື່ອໃຫ້ຍອດບັນຊີເທົ່າກັບທີ່ທ່ານປ້ອນ.</p>
              <div className="grid gap-2">
                <Label>ຍອດບັນຊີໃໝ່ (New Balance)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">KIP</Label>
                    <Input 
                      type="number" 
                      value={newBalance.kip || ''} 
                      onChange={e => setNewBalance(prev => ({ ...prev, kip: Number(e.target.value) || 0 }))} 
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">THB</Label>
                    <Input 
                      type="number" 
                      value={newBalance.thb || ''} 
                      onChange={e => setNewBalance(prev => ({ ...prev, thb: Number(e.target.value) || 0 }))} 
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">USD</Label>
                    <Input 
                      type="number" 
                      value={newBalance.usd || ''} 
                      onChange={e => setNewBalance(prev => ({ ...prev, usd: Number(e.target.value) || 0 }))} 
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">CNY</Label>
                    <Input 
                      type="number" 
                      value={newBalance.cny || ''} 
                      onChange={e => setNewBalance(prev => ({ ...prev, cny: Number(e.target.value) || 0 }))} 
                    />
                  </div>
                </div>
                {editingAccountId === 'ar_murabaha' && (
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="w-full mt-2"
                    onClick={() => setNewBalance(summaryData.totalOutstanding)}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    ດຶງຍອດຈາກລະບົບເງິນກູ້ (Sync with Loan System)
                  </Button>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingAccountId(null)}>ຍົກເລີກ</Button>
              <Button onClick={handleSaveBalance} className="bg-green-600 hover:bg-green-700 text-white">ບັນທຶກການປ່ຽນແປງ</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="grid gap-4 md:gap-8 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>ບັນທຶກລາຍການ (Journal Entry)</CardTitle>
              <p className="text-xs text-muted-foreground">ເລືອກເຫດການທີ່ເກີດຂຶ້ນຈິງ, ລະບົບຈະລົງບັນຊີໃຫ້ອັດຕະໂນມັດ</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddTransaction} className="grid gap-4">
                <div className="grid gap-2">
                  <Label>ເຫດການ (Action)</Label>
                  <Select value={selectedActionId} onValueChange={setSelectedActionId}>
                    <SelectTrigger><SelectValue placeholder="ເລືອກເຫດການທີ່ເກີດຂຶ້ນ..." /></SelectTrigger>
                    <SelectContent>
                      {journalActions.map(action => (
                        <SelectItem key={action.id} value={action.id}>{action.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedActionId !== 'custom' && selectedActionId !== '' && (
                  <div className="grid gap-2">
                    <Label>ຊ່ອງທາງການຊຳລະ</Label>
                    <Select value={paymentAccountId} onValueChange={setPaymentAccountId}>
                      <SelectTrigger><SelectValue placeholder="ເລືອກບັນຊີຊຳລະ" /></SelectTrigger>
                      <SelectContent>
                        {accounts.filter(a => a.type === 'asset' && (a.id === 'cash' || a.id === 'bank')).map(acc => (
                          <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedActionId === 'custom' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Debit (ເດບິດ)</Label>
                      <Select value={debitAccountId} onValueChange={setDebitAccountId}>
                        <SelectTrigger><SelectValue placeholder="ເລືອກບັນຊີ" /></SelectTrigger>
                        <SelectContent>{accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.code})</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Credit (ເຄຣດິດ)</Label>
                      <Select value={creditAccountId} onValueChange={setCreditAccountId}>
                        <SelectTrigger><SelectValue placeholder="ເລືອກບັນຊີ" /></SelectTrigger>
                        <SelectContent>{accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.code})</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="date">ວັນທີ</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : <span>ເລືອກວັນທີ</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} initialFocus /></PopoverContent>
                  </Popover>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">ຄຳອະທິບາຍ</Label>
                  <Textarea id="description" placeholder="ເຊັ່ນ: ຮັບເງິນຄ່າຫຸ້ນຈາກ ທ້າວ ກ." value={description} onChange={(e) => setDescription(e.target.value)} required />
                </div>

                <div className="grid gap-2">
                  <Label>ຈຳນວນເງິນ (Amount)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-[10px]">KIP</Label><Input type="number" value={amount.kip || ''} onChange={e => handleAmountChange('kip', e.target.value)} /></div>
                    <div><Label className="text-[10px]">THB</Label><Input type="number" value={amount.thb || ''} onChange={e => handleAmountChange('thb', e.target.value)} /></div>
                    <div><Label className="text-[10px]">USD</Label><Input type="number" value={amount.usd || ''} onChange={e => handleAmountChange('usd', e.target.value)} /></div>
                    <div><Label className="text-[10px]">CNY</Label><Input type="number" value={amount.cny || ''} onChange={e => handleAmountChange('cny', e.target.value)} /></div>
                  </div>
                </div>

                <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white"><PlusCircle className="mr-2 h-4 w-4" />ເພີ່ມທຸລະກຳ</Button>
              </form>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex flex-col gap-4">
                <CardTitle>ປະຫວັດທຸລະກຳ</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                          "w-[240px] justify-start text-left font-normal",
                          !dateRange && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "dd/MM/yyyy")} -{" "}
                              {format(dateRange.to, "dd/MM/yyyy")}
                            </>
                          ) : (
                            format(dateRange.from, "dd/MM/yyyy")
                          )
                        ) : (
                          <span>ເລືອກຊ່ວງວັນທີ</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>

                  <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="ທຸກບັນຊີ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ທຸກບັນຊີ</SelectItem>
                      {accounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="ຄົ້ນຫາຄຳອະທິບາຍ..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {(searchQuery || selectedAccountId !== 'all' || dateRange) && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-10">
                      <X className="mr-2 h-4 w-4" />
                      ລ້າງໂຕກອງ
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">ວັນທີ</TableHead>
                    <TableHead>ລາຍລະອຽດ</TableHead>
                    <TableHead>ບັນຊີ</TableHead>
                    <TableHead className="text-right">ເດບິດ</TableHead>
                    <TableHead className="text-right">ເຄຣດິດ</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGroups.flatMap((group, groupIdx) => {
                    const firstTx = group[0];
                    return group.map((tx, idx) => {
                      const account = accounts.find(a => a.id === tx.accountId);
                      return (
                        <TableRow key={tx.id || `${firstTx.transactionGroupId}-${idx}`} className={cn(idx === 0 ? "border-t-2" : "border-none hover:bg-transparent")}>
                          <TableCell className="align-top">
                            {idx === 0 ? format(tx.date, "dd/MM/yyyy") : ""}
                          </TableCell>
                          <TableCell className="align-top">
                            {idx === 0 ? (
                              <div className="flex flex-col">
                                <span className="font-medium">{tx.description}</span>
                                {/* Sub-description if needed, for now just description */}
                              </div>
                            ) : ""}
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="flex flex-col">
                              <span>{account?.name}</span>
                              <span className="text-[10px] text-muted-foreground">({account?.code})</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right align-top text-green-600 font-mono">
                            {tx.type === 'debit' ? currencies.map(c => (tx.amount?.[c] || 0) > 0 ? <div key={c}>{formatCurrency(tx.amount?.[c] || 0)} {String(c).toUpperCase()}</div> : null) : ''}
                          </TableCell>
                          <TableCell className="text-right align-top text-red-600 font-mono">
                            {tx.type === 'credit' ? currencies.map(c => (tx.amount?.[c] || 0) > 0 ? <div key={c}>{formatCurrency(tx.amount?.[c] || 0)} {String(c).toUpperCase()}</div> : null) : ''}
                          </TableCell>
                          <TableCell className="align-top">
                            {idx === group.length - 1 ? (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteGroup(firstTx.transactionGroupId)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : ""}
                          </TableCell>
                        </TableRow>
                      )
                    });
                  })}
                </TableBody>
              </Table>
              {filteredGroups.length === 0 && <div className="text-center py-8 text-muted-foreground">ບໍ່ມີທຸລະກຳ</div>}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
