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
import { ArrowLeft, PlusCircle, Calendar as CalendarIcon, Scale, Search, Trash2, X, Landmark, Wallet, MinusCircle, Users, TrendingUp, Building, Briefcase, BookOpen, Edit, RefreshCw, FilePieChart } from "lucide-react"
import { Link } from 'react-router-dom'
import { useToast } from "@/hooks/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Textarea } from "@/components/ui/textarea"
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { defaultAccounts } from '@/services/cooperativeChartOfAccounts';
import { listenToCooperativeTransactions, getAccountBalances, createTransaction, deleteTransactionGroup } from '@/services/cooperativeAccountingService';
import { listenToCooperativeAccounts, seedInitialSystemData } from '@/services/cooperativeAccountService';
import { listenToCooperativeLoans, listenToAllRepayments } from '@/services/cooperativeLoanService';
import { listenToCooperativeDeposits } from '@/services/cooperativeDepositService';
import { listenToAllCooperativeWithdrawals } from '@/services/cooperativeWithdrawalService';
import { listenToCooperativeMembers } from '@/services/cooperativeMemberService';
import { listenToCooperativeInvestments } from '@/services/cooperativeInvestmentService';
import { listenToFixedAssets } from '@/services/cooperativeFixedAssetService';
import { listenToTradeReceivables, listenToAllArPayments } from '@/services/cooperativeArService';
import type { Account, Transaction, CurrencyValues, Loan, LoanRepayment, CooperativeDeposit, CooperativeWithdrawal, CooperativeMember, CooperativeInvestment, FixedAsset, TradeReceivable, TradeReceivablePayment } from '@/lib/types';
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
  { id: 'asset_sale', name: 'ຂາຍສິນຊັບຜ່ອນ (Sale of Asset - Installment)', debit: 'ar_trade', credit: 'fixed_assets' },
  { id: 'ar_payment', name: 'ຮັບຊຳລະຈາກລູກໜີ້ (A/R Payment)', debit: 'payment', credit: 'ar_trade' },
  { id: 'capital', name: 'ຮັບທຶນສະຫະກອນ (Capital Contribution)', debit: 'payment', credit: 'capital' },
  { id: 'cash_adjust_in', name: 'ປັບຍອດເງິນສົດ (ເພີ່ມ) (Cash Adjustment - Increase)', debit: 'payment', credit: 'capital' },
  { id: 'cash_adjust_out', name: 'ປັບຍອດເງິນສົດ (ຫຼຸດ) (Cash Adjustment - Decrease)', debit: 'capital', credit: 'payment' },
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
  onEdit?: () => void,
  onClick?: () => void,
  linkTo?: string
}> = ({ title, balances, icon, variant = 'default', onEdit, onClick, linkTo }) => (
  <Card 
    className={cn(
      variant === 'highlight' && "bg-blue-50/50 border-blue-100", 
      "relative overflow-hidden group",
      onClick && "cursor-pointer hover:border-primary/50 transition-all hover:shadow-md"
    )}
    onClick={onClick}
  >
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <div className="flex items-center gap-1 z-10">
        {linkTo && (
          <Button variant="ghost" size="icon" className="h-6 w-6" asChild onClick={(e) => e.stopPropagation()}>
            <Link to={linkTo}>
              <Search className="h-3 w-3" />
            </Link>
          </Button>
        )}
        {onEdit && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
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

function CurrencyConverterDialog({ open, onOpenChange, balances, title }: { open: boolean, onOpenChange: (open: boolean) => void, balances: CurrencyValues, title: string }) {
  const [targetCurrency, setTargetCurrency] = useState<keyof CurrencyValues>('kip');
  const [rates, setRates] = useState<Record<keyof CurrencyValues, number>>({
    kip: 1,
    thb: 750,
    usd: 22000,
    cny: 3100
  });

  useEffect(() => {
    // Reset rates when target changes to make it intuitive
    if (targetCurrency === 'kip') {
      setRates({ kip: 1, thb: 750, usd: 22000, cny: 3100 });
    } else if (targetCurrency === 'thb') {
      setRates({ kip: 1/750, thb: 1, usd: 35, cny: 4.5 });
    } else if (targetCurrency === 'usd') {
      setRates({ kip: 1/22000, thb: 1/35, usd: 1, cny: 1/7 });
    } else if (targetCurrency === 'cny') {
      setRates({ kip: 1/3100, thb: 1/4.5, usd: 7, cny: 1 });
    }
  }, [targetCurrency]);

  const total = useMemo(() => {
    let sum = 0;
    currencies.forEach(c => {
      sum += (balances[c] || 0) * (rates[c] || 0);
    });
    return sum;
  }, [balances, rates]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            ແປງຄ່າເງິນ: {title}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label className="text-sm font-medium">ສະກຸນເງິນເປົ້າໝາຍ (Target Currency)</Label>
            <Select value={targetCurrency} onValueChange={(v: any) => setTargetCurrency(v)}>
              <SelectTrigger className="h-11 bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kip">KIP (ກີບ)</SelectItem>
                <SelectItem value="thb">THB (ບາດ)</SelectItem>
                <SelectItem value="usd">USD (ໂດລາ)</SelectItem>
                <SelectItem value="cny">CNY (ຢວນ)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-4 border p-4 rounded-xl bg-muted/20">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">ກຳນົດອັດຕາແລກປ່ຽນ (1 [Unit] = ? {targetCurrency.toUpperCase()})</Label>
            <div className="grid gap-3">
              {currencies.map(c => (
                <div key={c} className="grid grid-cols-2 items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-background border flex items-center justify-center text-[10px] font-bold uppercase">
                      {c}
                    </div>
                    <Label className="text-sm font-medium uppercase">1 {c}</Label>
                  </div>
                  <div className="relative">
                    <Input 
                      type="number" 
                      value={rates[c]} 
                      step="any"
                      onChange={e => setRates(prev => ({ ...prev, [c]: Number(e.target.value) || 0 }))}
                      disabled={c === targetCurrency}
                      className="h-9 pr-12 text-right font-mono"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted-foreground uppercase">{targetCurrency}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 bg-primary/5 border border-primary/10 rounded-2xl text-center shadow-inner">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">ລວມທັງໝົດເປັນ {targetCurrency.toUpperCase()}</p>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-4xl font-black text-primary tracking-tighter">
                {new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(total)}
              </span>
              <span className="text-sm font-bold text-primary/60 uppercase">{targetCurrency}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button className="w-full h-11" onClick={() => onOpenChange(false)}>ປິດໜ້າຕ່າງ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { UserNav } from '@/components/UserNav';

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
  const [investments, setInvestments] = useState<CooperativeInvestment[]>([]);
  const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>([]);
  const [receivables, setReceivables] = useState<TradeReceivable[]>([]);
  const [arPayments, setArPayments] = useState<TradeReceivablePayment[]>([]);

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
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(() => {
    const saved = localStorage.getItem('cooperative_auto_sync');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('cooperative_auto_sync', JSON.stringify(autoSyncEnabled));
  }, [autoSyncEnabled]);

  // Edit balance state
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [newBalance, setNewBalance] = useState<CurrencyValues>({ kip: 0, thb: 0, usd: 0, cny: 0 });

  // Converter state
  const [converterData, setConverterData] = useState<{ open: boolean, balances: CurrencyValues, title: string }>({
    open: false,
    balances: { kip: 0, thb: 0, usd: 0, cny: 0 },
    title: ''
  });

  useEffect(() => {
    const unsubscribeTransactions = listenToCooperativeTransactions(setTransactions);
    const unsubscribeAccounts = listenToCooperativeAccounts(setAccounts);
    const unsubscribeLoans = listenToCooperativeLoans(setLoans);
    const unsubscribeRepayments = listenToAllRepayments(setRepayments);
    const unsubscribeDeposits = listenToCooperativeDeposits(setDeposits);
    const unsubscribeWithdrawals = listenToAllCooperativeWithdrawals(setWithdrawals);
    const unsubscribeMembers = listenToCooperativeMembers(setMembers);
    const unsubscribeInvestments = listenToCooperativeInvestments(setInvestments);
    const unsubscribeFixedAssets = listenToFixedAssets(setFixedAssets);
    const unsubscribeAr = listenToTradeReceivables(setReceivables);
    const unsubscribeArPayments = listenToAllArPayments(setArPayments);
    
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
      unsubscribeInvestments();
      unsubscribeFixedAssets();
      unsubscribeAr();
      unsubscribeArPayments();
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

    // Add realized profit from Trade Receivables
    receivables.forEach(item => {
      const itemPayments = arPayments.filter(p => p.arId === item.id);
      const itemPaid = { kip: 0, thb: 0, usd: 0 };
      itemPayments.forEach(p => {
        currencies.forEach(c => {
          itemPaid[c] += (p.amountPaid?.[c] || 0);
        });
      });

      currencies.forEach(c => {
        const cost = item.cost?.[c] || 0;
        const totalAmount = item.amount[c] || 0;
        const potentialProfit = Math.max(0, totalAmount - cost);
        const realized = Math.max(0, itemPaid[c] - cost);
        const actualRealized = Math.min(realized, potentialProfit);
        totalIncome[c] += actualRealized;
      });
    });

    const totalExpenses: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };
    accounts.filter(a => a.type === 'expense').forEach(acc => {
      const bal = accountBalances[acc.id] || { kip: 0, thb: 0, usd: 0, cny: 0 };
      currencies.forEach(c => totalExpenses[c] += bal[c]);
    });

    const netProfit: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };
    currencies.forEach(c => netProfit[c] = totalIncome[c] - totalExpenses[c]);

    const totalInvestments: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };
    investments.forEach(inv => {
      currencies.forEach(c => totalInvestments[c] += (inv.amount[c] || 0));
    });

    const totalFixedAssets: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };
    fixedAssets.forEach(asset => {
      if (asset.status === 'active') {
        currencies.forEach(c => totalFixedAssets[c] += (asset.purchasePrice[c] || 0));
      }
    });

    const totalAr: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };
    receivables.forEach(item => {
      if (item.status !== 'paid') {
        currencies.forEach(c => totalAr[c] += (item.amount[c] || 0));
      }
    });
    // Subtract A/R payments
    arPayments.forEach(payment => {
      const ar = receivables.find(r => r.id === payment.arId);
      if (ar && ar.status !== 'paid') {
        currencies.forEach(c => totalAr[c] -= (payment.amountPaid?.[c] || 0));
      }
    });

    return { totalAssets, totalBcel, difference, totalOutstanding, totalDeposits, totalIncome, totalExpenses, netProfit, totalInvestments, totalFixedAssets, totalAr };
  }, [accountBalances, accounts, loans, repayments, deposits, withdrawals, members, investments, fixedAssets, receivables, arPayments]);

  // Auto-sync balances when system data changes
  useEffect(() => {
    if (accounts.length === 0 || !autoSyncEnabled) return;

    const syncBalances = async () => {
      const syncTasks = [
        { id: 'ar_murabaha', current: accountBalances['ar_murabaha'], target: summaryData.totalOutstanding },
        { id: 'investments', current: accountBalances['investments'], target: summaryData.totalInvestments },
        { id: 'deposits_payable', current: accountBalances['deposits_payable'], target: summaryData.totalDeposits },
        { id: 'fixed_assets', current: accountBalances['fixed_assets'], target: summaryData.totalFixedAssets },
        { id: 'ar_trade', current: accountBalances['ar_trade'], target: summaryData.totalAr },
      ];

      for (const task of syncTasks) {
        const current = task.current || { kip: 0, thb: 0, usd: 0, cny: 0 };
        const target = task.target;
        
        const adjustment: CurrencyValues = {
          kip: (target.kip || 0) - (current.kip || 0),
          thb: (target.thb || 0) - (current.thb || 0),
          usd: (target.usd || 0) - (current.usd || 0),
          cny: (target.cny || 0) - (current.cny || 0),
        };

        const totalAdjustment = Math.abs(adjustment.kip) + Math.abs(adjustment.thb) + Math.abs(adjustment.usd) + Math.abs(adjustment.cny);
        
        if (totalAdjustment > 0) {
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
          
          const accountName = accounts.find(a => a.id === task.id)?.name || task.id;
          const syncDate = new Date();

          if (hasIncrease) {
            await createTransaction(task.id, 'capital', increases, `ປັບປຸງຍອດອັດຕະໂນມັດ (Auto-Sync) - ${accountName}`, syncDate);
          }
          if (hasDecrease) {
            await createTransaction('capital', task.id, decreases, `ປັບປຸງຍອດອັດຕະໂນມັດ (Auto-Sync) - ${accountName}`, syncDate);
          }
        }
      }
    };

    // We use a small timeout to ensure summaryData is fully calculated and avoid infinite loops
    const timer = setTimeout(() => {
      syncBalances();
    }, 1000);

    return () => clearTimeout(timer);
  }, [summaryData, accounts]);

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
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-br from-background via-background to-primary/5">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 backdrop-blur-md px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" asChild>
            <Link to="/tee/cooperative"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-xl">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">ການບັນຊີ (ສະຫະກອນ)</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 mr-4 px-3 py-1.5 bg-muted/50 rounded-full border border-border/50">
            <Label htmlFor="auto-sync" className="text-xs font-medium cursor-pointer">Auto-Sync</Label>
            <input 
              id="auto-sync"
              type="checkbox" 
              checked={autoSyncEnabled} 
              onChange={(e) => setAutoSyncEnabled(e.target.checked)}
              className="w-4 h-4 accent-primary cursor-pointer"
            />
          </div>
          <Button variant="outline" size="sm" className="h-9" asChild>
            <Link to="/tee/cooperative/income-expense">
              <BookOpen className="mr-2 h-4 w-4" />
              ໄປທີ່ໜ້າລາຍຮັບ-ລາຍຈ່າຍ
            </Link>
          </Button>
          <UserNav />
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-8 p-4 sm:px-6 md:py-8">
        <Tabs defaultValue="cards" className="w-full">
          <div className="flex justify-center mb-6">
            <TabsList className="grid w-full max-w-2xl grid-cols-3 bg-muted/50 backdrop-blur-sm p-1 h-12">
              <TabsTrigger value="cards" className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                ພາບລວມບັນຊີ (All Cards)
              </TabsTrigger>
              <TabsTrigger value="history" className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                ປະຫວັດທຸລະກຳ (History)
              </TabsTrigger>
              <TabsTrigger value="journal" className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                ບັນທຶກລາຍການ (Journal Entry)
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="cards" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <SummaryCard 
            title="ລວມສິນຊັບທັງໝົດ" 
            balances={summaryData.totalAssets} 
            icon={<Landmark className="h-4 w-4 text-green-600" />} 
            onClick={() => setConverterData({ open: true, balances: summaryData.totalAssets, title: 'ລວມສິນຊັບທັງໝົດ' })}
          />
          <SummaryCard 
            title="ສ່ວນຕ່າງ (ເງິນສົດ - ລວມ BCEL)" 
            balances={summaryData.difference} 
            variant="highlight"
            icon={<MinusCircle className="h-4 w-4 text-blue-600" />} 
            onClick={() => setConverterData({ open: true, balances: summaryData.difference, title: 'ສ່ວນຕ່າງ (ເງິນສົດ - ລວມ BCEL)' })}
          />
          <SummaryCard 
            title="ເງິນສົດ (Cash)" 
            balances={accountBalances['cash'] || { kip: 0, thb: 0, usd: 0, cny: 0 }} 
            icon={<Wallet className="h-4 w-4 text-muted-foreground" />} 
            onClick={() => setConverterData({ open: true, balances: accountBalances['cash'] || { kip: 0, thb: 0, usd: 0, cny: 0 }, title: 'ເງິນສົດ (Cash)' })}
          />
          <SummaryCard 
            title="ບັນຊີ BCEL" 
            balances={accountBalances['bank_bcel'] || { kip: 0, thb: 0, usd: 0, cny: 0 }} 
            icon={<Landmark className="h-4 w-4 text-muted-foreground" />} 
            onEdit={() => handleOpenEditBalance('bank_bcel')}
            onClick={() => setConverterData({ open: true, balances: accountBalances['bank_bcel'] || { kip: 0, thb: 0, usd: 0, cny: 0 }, title: 'ບັນຊີ BCEL' })}
          />
          <SummaryCard 
            title="ບັນຊີ BCEL ເງິນສົດ" 
            balances={accountBalances['bank_bcel_cash'] || { kip: 0, thb: 0, usd: 0, cny: 0 }} 
            icon={<Wallet className="h-4 w-4 text-muted-foreground" />} 
            onEdit={() => handleOpenEditBalance('bank_bcel_cash')}
            onClick={() => setConverterData({ open: true, balances: accountBalances['bank_bcel_cash'] || { kip: 0, thb: 0, usd: 0, cny: 0 }, title: 'ບັນຊີ BCEL ເງິນສົດ' })}
          />
          <SummaryCard 
            title="ລວມ BCEL" 
            balances={summaryData.totalBcel} 
            variant="highlight"
            icon={<Users className="h-4 w-4 text-blue-600" />} 
            onClick={() => setConverterData({ open: true, balances: summaryData.totalBcel, title: 'ລວມ BCEL' })}
          />
          <SummaryCard 
            title="ລູກໜີ້ການຄ້າ (A/R)" 
            balances={accountBalances['ar_trade'] || { kip: 0, thb: 0, usd: 0, cny: 0 }} 
            icon={<Users className="h-4 w-4 text-muted-foreground" />} 
            onEdit={() => handleOpenEditBalance('ar_trade')}
            linkTo="/tee/cooperative/ar"
            onClick={() => setConverterData({ open: true, balances: accountBalances['ar_trade'] || { kip: 0, thb: 0, usd: 0, cny: 0 }, title: 'ລູກໜີ້ການຄ້າ (A/R)' })}
          />
          <SummaryCard 
            title="ລູກໜີ້ການຄ້າກຳໄລ (Murabaha)" 
            balances={accountBalances['ar_murabaha'] || { kip: 0, thb: 0, usd: 0, cny: 0 }} 
            icon={<Users className="h-4 w-4 text-muted-foreground" />} 
            onEdit={() => handleOpenEditBalance('ar_murabaha')}
            linkTo="/tee/cooperative/loans"
            onClick={() => setConverterData({ open: true, balances: accountBalances['ar_murabaha'] || { kip: 0, thb: 0, usd: 0, cny: 0 }, title: 'ລູກໜີ້ການຄ້າກຳໄລ (Murabaha)' })}
          />
          <SummaryCard 
            title="ສິນຊັບລົງທຶນ (Investments)" 
            balances={accountBalances['investments'] || { kip: 0, thb: 0, usd: 0, cny: 0 }} 
            icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} 
            onEdit={() => handleOpenEditBalance('investments')}
            linkTo="/tee/cooperative/investments"
            onClick={() => setConverterData({ open: true, balances: accountBalances['investments'] || { kip: 0, thb: 0, usd: 0, cny: 0 }, title: 'ສິນຊັບລົງທຶນ (Investments)' })}
          />
          <SummaryCard 
            title="ສິນຊັບຄົງທີ່ (Fixed Assets)" 
            balances={accountBalances['fixed_assets'] || { kip: 0, thb: 0, usd: 0, cny: 0 }} 
            icon={<Building className="h-4 w-4 text-muted-foreground" />} 
            onEdit={() => handleOpenEditBalance('fixed_assets')}
            linkTo="/tee/cooperative/fixed-assets"
            onClick={() => setConverterData({ open: true, balances: accountBalances['fixed_assets'] || { kip: 0, thb: 0, usd: 0, cny: 0 }, title: 'ສິນຊັບຄົງທີ່ (Fixed Assets)' })}
          />
          <SummaryCard 
            title="ເງິນຝາກສະມາຊິກ (Deposits)" 
            balances={accountBalances['deposits_payable'] || { kip: 0, thb: 0, usd: 0, cny: 0 }} 
            icon={<Landmark className="h-4 w-4 text-muted-foreground" />} 
            onEdit={() => handleOpenEditBalance('deposits_payable')}
            linkTo="/tee/cooperative/members"
            onClick={() => setConverterData({ open: true, balances: accountBalances['deposits_payable'] || { kip: 0, thb: 0, usd: 0, cny: 0 }, title: 'ເງິນຝາກສະມາຊິກ (Deposits)' })}
          />
          <SummaryCard 
            title="ລາຍຮັບລວມ (Total Income)" 
            balances={summaryData.totalIncome} 
            icon={<TrendingUp className="h-4 w-4 text-green-600" />} 
            onClick={() => setConverterData({ open: true, balances: summaryData.totalIncome, title: 'ລາຍຮັບລວມ (Total Income)' })}
          />
          <SummaryCard 
            title="ລາຍຈ່າຍລວມ (Total Expenses)" 
            balances={summaryData.totalExpenses} 
            icon={<MinusCircle className="h-4 w-4 text-red-600" />} 
            onClick={() => setConverterData({ open: true, balances: summaryData.totalExpenses, title: 'ລາຍຈ່າຍລວມ (Total Expenses)' })}
          />
          <SummaryCard 
            title="ກຳໄລສຸດທິ (Net Profit)" 
            balances={summaryData.netProfit} 
            variant="highlight"
            icon={<TrendingUp className="h-4 w-4 text-green-600" />} 
            onClick={() => setConverterData({ open: true, balances: summaryData.netProfit, title: 'ກຳໄລສຸດທິ (Net Profit)' })}
          />
          </div>
          </TabsContent>

        <CurrencyConverterDialog 
          open={converterData.open} 
          onOpenChange={(open) => setConverterData(prev => ({ ...prev, open }))}
          balances={converterData.balances}
          title={converterData.title}
        />

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
                {editingAccountId === 'investments' && (
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="w-full mt-2"
                    onClick={() => setNewBalance(summaryData.totalInvestments)}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    ດຶງຍອດຈາກລະບົບການລົງທຶນ (Sync with Investment System)
                  </Button>
                )}
                {editingAccountId === 'deposits_payable' && (
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="w-full mt-2"
                    onClick={() => setNewBalance(summaryData.totalDeposits)}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    ດຶງຍອດຈາກລະບົບເງິນຝາກ (Sync with Deposit System)
                  </Button>
                )}
                {editingAccountId === 'fixed_assets' && (
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="w-full mt-2"
                    onClick={() => setNewBalance(summaryData.totalFixedAssets)}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    ດຶງຍອດຈາກລະບົບສິນຊັບຄົງທີ່ (Sync with Fixed Assets System)
                  </Button>
                )}
                {editingAccountId === 'ar_trade' && (
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="w-full mt-2"
                    onClick={() => setNewBalance(summaryData.totalAr)}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    ດຶງຍອດຈາກລະບົບລູກໜີ້ການຄ້າ (Sync with Trade Receivables System)
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

        <TabsContent value="journal" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="max-w-3xl mx-auto">
            <Card className="lg:col-span-1 border-none shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-6">
              <CardTitle className="text-xl">ບັນທຶກລາຍການ (Journal Entry)</CardTitle>
              <p className="text-sm text-muted-foreground">ເລືອກເຫດການທີ່ເກີດຂຶ້ນຈິງ, ລະບົບຈະລົງບັນຊີໃຫ້ອັດຕະໂນມັດ</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddTransaction} className="grid gap-6">
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">ເຫດການ (Action)</Label>
                  <Select value={selectedActionId} onValueChange={setSelectedActionId}>
                    <SelectTrigger className="h-10 bg-background/50"><SelectValue placeholder="ເລືອກເຫດການທີ່ເກີດຂຶ້ນ..." /></SelectTrigger>
                    <SelectContent>
                      {journalActions.map(action => (
                        <SelectItem key={action.id} value={action.id}>{action.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedActionId !== 'custom' && selectedActionId !== '' && (
                  <div className="grid gap-2">
                    <Label className="text-sm font-medium">ຊ່ອງທາງການຊຳລະ</Label>
                    <Select value={paymentAccountId} onValueChange={setPaymentAccountId}>
                      <SelectTrigger className="h-10 bg-background/50"><SelectValue placeholder="ເລືອກບັນຊີຊຳລະ" /></SelectTrigger>
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
                      <Label className="text-sm font-medium">Debit (ເດບິດ)</Label>
                      <Select value={debitAccountId} onValueChange={setDebitAccountId}>
                        <SelectTrigger className="h-10 bg-background/50"><SelectValue placeholder="ເລືອກບັນຊີ" /></SelectTrigger>
                        <SelectContent>{accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.code})</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-sm font-medium">Credit (ເຄຣດິດ)</Label>
                      <Select value={creditAccountId} onValueChange={setCreditAccountId}>
                        <SelectTrigger className="h-10 bg-background/50"><SelectValue placeholder="ເລືອກບັນຊີ" /></SelectTrigger>
                        <SelectContent>{accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.code})</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="date" className="text-sm font-medium">ວັນທີ</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant={"outline"} className="w-full justify-start text-left font-normal h-10 bg-background/50">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : <span>ເລືອກວັນທີ</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} initialFocus /></PopoverContent>
                  </Popover>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description" className="text-sm font-medium">ຄຳອະທິບາຍ</Label>
                  <Textarea id="description" placeholder="ເຊັ່ນ: ຮັບເງິນຄ່າຫຸ້ນຈາກ ທ້າວ ກ." className="bg-background/50 min-h-[100px]" value={description} onChange={(e) => setDescription(e.target.value)} required />
                </div>

                <div className="grid gap-2">
                  <Label className="text-sm font-medium">ຈຳນວນເງິນ (Amount)</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-[10px] text-muted-foreground uppercase font-bold">KIP</Label><Input type="number" className="h-10 bg-background/50" value={amount.kip || ''} onChange={e => handleAmountChange('kip', e.target.value)} /></div>
                    <div><Label className="text-[10px] text-muted-foreground uppercase font-bold">THB</Label><Input type="number" className="h-10 bg-background/50" value={amount.thb || ''} onChange={e => handleAmountChange('thb', e.target.value)} /></div>
                    <div><Label className="text-[10px] text-muted-foreground uppercase font-bold">USD</Label><Input type="number" className="h-10 bg-background/50" value={amount.usd || ''} onChange={e => handleAmountChange('usd', e.target.value)} /></div>
                    <div><Label className="text-[10px] text-muted-foreground uppercase font-bold">CNY</Label><Input type="number" className="h-10 bg-background/50" value={amount.cny || ''} onChange={e => handleAmountChange('cny', e.target.value)} /></div>
                  </div>
                </div>

                <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"><PlusCircle className="mr-2 h-5 w-5" />ເພີ່ມທຸລະກຳ</Button>
              </form>
            </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Card className="lg:col-span-2 border-none shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-6">
              <div className="flex flex-col gap-6">
                <CardTitle className="text-xl">ປະຫວັດທຸລະກຳ</CardTitle>
                <div className="flex flex-wrap items-center gap-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                          "w-[240px] justify-start text-left font-normal h-10 bg-background/50",
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
                    <SelectTrigger className="w-[180px] h-10 bg-background/50">
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
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="ຄົ້ນຫາຄຳອະທິບາຍ..."
                      className="pl-9 h-10 bg-background/50"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {(searchQuery || selectedAccountId !== 'all' || dateRange) && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-10 rounded-full">
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
        </TabsContent>
      </Tabs>
      </main>
    </div>
  );
}
