/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";
import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Trash2, Search, RefreshCw, X, ExternalLink, ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { deleteTransactionGroup, listenToCooperativeTransactions } from '@/services/cooperativeAccountingService';
import { listenToTradeReceivables, listenToAllArPayments } from '@/services/cooperativeArService';
import { defaultAccounts } from '@/services/cooperativeChartOfAccounts';
import type { Transaction, CurrencyValues, TradeReceivable, TradeReceivablePayment } from '@/lib/types';
import { format, isSameMonth, isSameYear, getYear, setMonth, getMonth, isWithinInterval, startOfYear, endOfYear, startOfMonth, endOfMonth } from 'date-fns';
import { LAO_MONTHS } from '@/lib/date-utils';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { UserNav } from '@/components/UserNav';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const currencies: (keyof CurrencyValues)[] = ['kip', 'thb', 'usd', 'cny'];
const initialCurrencyValues: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
}

const SummaryCard = ({ title, balances, titleClassName }: { title: string, balances: CurrencyValues, titleClassName?: string }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${titleClassName}`}>{title}</CardTitle>
        </CardHeader>
        <CardContent>
            {currencies.map(c => (
                (balances[c] || 0) !== 0 && (
                    <div key={c} className="text-lg font-bold">
                        <span className="font-semibold uppercase text-muted-foreground">{c}: </span>
                        <span className={balances[c] < 0 ? 'text-red-600' : 'text-green-600'}>{formatCurrency(balances[c] || 0)}</span>
                    </div>)
            ))}
            {Object.values(balances).every(v => v === 0) && <div className="text-lg font-bold text-muted-foreground">-</div>}
        </CardContent>
    </Card>
);

const calculateSummary = (transactions: Transaction[], receivables: TradeReceivable[], arPayments: TradeReceivablePayment[], startDate?: Date, endDate?: Date): { income: CurrencyValues; expense: CurrencyValues; net: CurrencyValues; tradeProfit: CurrencyValues } => {
    const income = { ...initialCurrencyValues };
    const expense = { ...initialCurrencyValues };
    const tradeProfit = { ...initialCurrencyValues };

    transactions.forEach(tx => {
        const account = defaultAccounts.find(a => a.id === tx.accountId);
        if (!account || (account.type !== 'income' && account.type !== 'expense')) return;

        const multiplier = tx.type === 'debit' ? 1 : -1;
        
        currencies.forEach(c => {
            const amount = (tx.amount?.[c] || 0) * multiplier;
            if (account.type === 'income') {
                income[c] -= amount;
            } else if (account.type === 'expense') {
                expense[c] += amount;
            }
        });
    });

    // Add realized profit from Trade Receivables
    receivables.forEach(item => {
        const itemPayments = arPayments.filter(p => {
            const isMatch = p.arId === item.id;
            if (!isMatch) return false;
            if (!startDate || !endDate) return true;
            return isWithinInterval(p.paymentDate, { start: startDate, end: endDate });
        });

        const itemPaid = { kip: 0, thb: 0, usd: 0, cny: 0 };
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
            tradeProfit[c] += actualRealized;
            income[c] += actualRealized;
        });
    });

    const net = currencies.reduce((acc, c) => {
        acc[c] = income[c] - expense[c];
        return acc;
    }, { ...initialCurrencyValues });

    return { income, expense, net, tradeProfit };
};

export default function CooperativeIncomeExpensePage() {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [receivables, setReceivables] = useState<TradeReceivable[]>([]);
    const [arPayments, setArPayments] = useState<TradeReceivablePayment[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTxGroup, setSelectedTxGroup] = useState<Transaction[] | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [filter, setFilter] = useState<{ year: number | 'all'; month: number | 'all' }>({
        year: new Date().getFullYear(),
        month: new Date().getMonth(),
    });

    useEffect(() => {
        const unsubscribe = listenToCooperativeTransactions(setTransactions);
        const unsubscribeAr = listenToTradeReceivables(setReceivables);
        const unsubscribeArPayments = listenToAllArPayments(setArPayments);
        return () => {
            unsubscribe();
            unsubscribeAr();
            unsubscribeArPayments();
        };
    }, []);

    const filteredTransactions = useMemo(() => {
        const allTxs: (Transaction | { id: string, date: Date, description: string, accountId: string, amount: CurrencyValues, type: 'debit' | 'credit', isVirtual?: boolean })[] = [...transactions];

        // Generate virtual profit transactions
        receivables.forEach(item => {
            const itemPayments = arPayments.filter(p => p.arId === item.id).sort((a, b) => a.paymentDate.getTime() - b.paymentDate.getTime());
            
            currencies.forEach(c => {
                const cost = item.cost?.[c] || 0;
                const totalAmount = item.amount[c] || 0;
                const potentialProfit = Math.max(0, totalAmount - cost);
                
                if (potentialProfit <= 0) return;

                let cumulativePaid = 0;
                itemPayments.forEach(p => {
                    const amountPaid = p.amountPaid?.[c] || 0;
                    const previousPaid = cumulativePaid;
                    cumulativePaid += amountPaid;

                    const totalRealizedSoFar = Math.max(0, Math.min(previousPaid - cost, potentialProfit));
                    const totalRealizedAfter = Math.max(0, Math.min(cumulativePaid - cost, potentialProfit));
                    const profitInThisPayment = totalRealizedAfter - totalRealizedSoFar;

                    if (profitInThisPayment > 0) {
                        // Check if this virtual transaction already exists in the list for this currency
                        const existing = allTxs.find(t => t.id === `profit-${p.id}`);
                        if (existing) {
                            existing.amount[c] = (existing.amount[c] || 0) + profitInThisPayment;
                        } else {
                            allTxs.push({
                                id: `profit-${p.id}`,
                                date: p.paymentDate,
                                description: `ກຳໄລຈາກການຮັບຊຳລະ: ${item.customerName} (${item.description})`,
                                accountId: 'income_trade_profit',
                                amount: { ...initialCurrencyValues, [c]: profitInThisPayment },
                                type: 'credit', // Income is credit
                                isVirtual: true
                            });
                        }
                    }
                });
            });
        });

        return allTxs.filter(tx => {
            if (!tx.date) return false;
            const txYear = getYear(tx.date);
            const txMonth = getMonth(tx.date);

            const yearMatch = filter.year === 'all' || txYear === filter.year;
            const monthMatch = filter.month === 'all' || txMonth === filter.month;
            const searchMatch = !searchQuery || tx.description.toLowerCase().includes(searchQuery.toLowerCase());

            if (!searchMatch) return false;

            if (filter.year !== 'all' && filter.month !== 'all') {
                return yearMatch && monthMatch;
            }
            if (filter.year !== 'all') {
                return yearMatch;
            }
            if (filter.month !== 'all') {
                return monthMatch;
            }
            return true;
        }).sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [transactions, receivables, arPayments, filter, searchQuery]);

    const summaryForSelectedPeriod = useMemo(() => {
        let startDate: Date | undefined;
        let endDate: Date | undefined;

        if (filter.year !== 'all' && filter.month !== 'all') {
            const baseDate = new Date(filter.year as number, filter.month as number, 1);
            startDate = startOfMonth(baseDate);
            endDate = endOfMonth(baseDate);
        } else if (filter.year !== 'all') {
            const baseDate = new Date(filter.year as number, 0, 1);
            startDate = startOfYear(baseDate);
            endDate = endOfYear(baseDate);
        }

        // Use raw transactions here to avoid double counting with virtual transactions in filteredTransactions
        const periodTxs = transactions.filter(tx => {
            if (!startDate || !endDate) return true;
            return isWithinInterval(tx.date, { start: startDate, end: endDate });
        });

        return calculateSummary(periodTxs, receivables, arPayments, startDate, endDate);
    }, [transactions, receivables, arPayments, filter]);

    const summaryForThisMonth = useMemo(() => {
        const now = new Date();
        const thisMonthTxs = transactions.filter(tx => tx.date && isSameMonth(tx.date, now) && isSameYear(tx.date, now));
        return calculateSummary(thisMonthTxs, receivables, arPayments, startOfMonth(now), endOfMonth(now));
    }, [transactions, receivables, arPayments]);

    const summaryForThisYear = useMemo(() => {
        const now = new Date();
        const thisYearTxs = transactions.filter(tx => tx.date && isSameYear(tx.date, now));
        return calculateSummary(thisYearTxs, receivables, arPayments, startOfYear(now), endOfYear(now));
    }, [transactions, receivables, arPayments]);

    const handleViewDetail = (tx: Transaction) => {
        const group = transactions.filter(t => t.transactionGroupId === tx.transactionGroupId);
        setSelectedTxGroup(group);
        setIsDetailOpen(true);
    };

    const handleDeleteTransaction = async (transaction: Transaction) => {
        const groupId = transaction.transactionGroupId;
        
        if (!groupId) {
            toast({
                title: "ຂໍ້ມູນຜິດພາດ",
                description: "ບໍ່ພົບ ID ຂອງກຸ່ມທຸລະກຳ",
                variant: "destructive"
            });
            return;
        }
        try {
            await deleteTransactionGroup(groupId);
            toast({
                title: "ລຶບທຸລະກຳສຳເລັດ"
            });
        } catch (error) {
            console.error('Error deleting transaction group:', error);
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            toast({
                title: 'ເກີດຂໍ້ຜິດພາດ',
                description: `ບໍ່ສາມາດລຶບທຸລະກຳໄດ້: ${errorMsg}`,
                variant: 'destructive',
            });
        }
    };

    const MonthYearSelector = () => {
        const currentYear = getYear(new Date());
        const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
        years.push(2025);
        const uniqueYears = [...new Set(years)].sort((a, b) => b - a);

        return (
            <div className="flex gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-40 justify-between h-9 bg-background/50">
                            {filter.month === 'all' ? 'ທຸກໆເດືອນ' : LAO_MONTHS[filter.month as number]}
                            <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => setFilter(f => ({ ...f, month: 'all' }))}>
                            ທຸກໆເດືອນ
                        </DropdownMenuItem>
                        {LAO_MONTHS.map((name, i) => (
                            <DropdownMenuItem key={i} onClick={() => setFilter(f => ({ ...f, month: i }))}>
                                {name} (ເດືອນ {i + 1})
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-32 justify-between h-9 bg-background/50">
                            {filter.year === 'all' ? 'ທຸກໆປີ' : `ປີ ${filter.year + 543}`}
                            <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32">
                        <DropdownMenuItem onClick={() => setFilter(f => ({ ...f, year: 'all' }))}>
                            ທຸກໆປີ
                        </DropdownMenuItem>
                        {uniqueYears.map(y => (
                            <DropdownMenuItem key={y} onClick={() => setFilter(f => ({ ...f, year: y }))}>
                                ປີ {y + 543}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        );
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
                        <h1 className="text-xl font-bold tracking-tight">ລາຍຮັບ-ລາຍຈ່າຍ (ສະຫະກອນ)</h1>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => window.location.reload()} title="ໂຫຼດຂໍ້ມູນໃໝ່" className="h-9 w-9 rounded-full">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button asChild variant="outline" size="sm" className="h-9">
                        <Link to="/tee/cooperative/accounting">
                             ໄປທີ່ໜ້າບັນຊີ
                        </Link>
                    </Button>
                    <MonthYearSelector />
                    <UserNav />
                </div>
            </header>
            <main className="flex-1 p-4 sm:px-6 md:py-8 space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <SummaryCard title="ລາຍຮັບລວມ (ເດືອນນີ້)" balances={summaryForThisMonth.income} titleClassName="text-blue-600" />
                    <SummaryCard title="ລາຍຈ່າຍລວມ (ເດືອນນີ້)" balances={summaryForThisMonth.expense} titleClassName="text-red-600" />
                    <SummaryCard title="ກຳໄລ/ຂາດທຶນ (ເດືອນນີ້)" balances={summaryForThisMonth.net} titleClassName="text-primary" />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <SummaryCard title="ລາຍຮັບລວມ (ປີນີ້)" balances={summaryForThisYear.income} titleClassName="text-blue-600" />
                    <SummaryCard title="ລາຍຈ່າຍລວມ (ປີນີ້)" balances={summaryForThisYear.expense} titleClassName="text-red-600" />
                    <SummaryCard title="ກຳໄລ/ຂາດທຶນ (ປີນີ້)" balances={summaryForThisYear.net} titleClassName="text-primary" />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <SummaryCard title="ລາຍຮັບລວມ (ທີ່ເລືອກ)" balances={summaryForSelectedPeriod.income} titleClassName="text-blue-600" />
                    <SummaryCard title="ລາຍຈ່າຍລວມ (ທີ່ເລືອກ)" balances={summaryForSelectedPeriod.expense} titleClassName="text-red-600" />
                    <SummaryCard title="ກຳໄລ/ຂາດທຶນສຸດທິ (ທີ່ເລືອກ)" balances={summaryForSelectedPeriod.net} titleClassName="text-primary" />
                </div>
                <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
                    <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6">
                        <div>
                            <CardTitle className="text-xl">ລາຍການທຸລະກຳຫຼ້າສຸດ</CardTitle>
                            <CardDescription>ສະແດງທຸກລາຍການເຄື່ອນໄຫວທາງການເງິນ</CardDescription>
                        </div>
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="ຄົ້ນຫາລາຍລະອຽດ..."
                                className="pl-9 pr-9 h-10 bg-background/50"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
                                    onClick={() => setSearchQuery('')}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ວັນທີ</TableHead>
                                    <TableHead>ລາຍລະອຽດ</TableHead>
                                    <TableHead>ໝວດໝູ່</TableHead>
                                    <TableHead>ປະເພດ</TableHead>
                                    {currencies.map(c => <TableHead key={c} className="text-right uppercase">{c}</TableHead>)}
                                    <TableHead><span className="sr-only">Actions</span></TableHead>
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {filteredTransactions.map(tx => {
                                    const account = defaultAccounts.find(a => a.id === tx.accountId);
                                    if (!account || (account.type !== 'income' && account.type !== 'expense')) {
                                        return null;
                                    }

                                    const isIncome = account.type === 'income';
                                    const effectiveType = (isIncome && tx.type === 'credit') || (!isIncome && tx.type === 'debit') ? 'income' : 'expense';

                                    return (
                                        <TableRow key={tx.id}>
                                            <TableCell>{format(tx.date, "dd/MM/yyyy")}</TableCell>
                                            <TableCell>
                                                {'isVirtual' in tx ? (
                                                    <span className="font-medium text-primary">{tx.description}</span>
                                                ) : (
                                                    <button 
                                                        className="text-left hover:text-primary hover:underline transition-colors font-medium"
                                                        onClick={() => handleViewDetail(tx as Transaction)}
                                                    >
                                                        {tx.description}
                                                    </button>
                                                )}
                                            </TableCell>
                                            <TableCell>{account.name}</TableCell>
                                            <TableCell>
                                                 <Badge variant={effectiveType === 'income' ? 'default' : 'destructive'} className={effectiveType === 'income' ? 'bg-green-100 text-green-800' : ''}>
                                                    {effectiveType === 'income' ? 'ລາຍຮັບ' : 'ລາຍຈ່າຍ'}
                                                </Badge>
                                            </TableCell>
                                            {currencies.map(c => {
                                                const amount = tx.amount[c] || 0;
                                                return (
                                                    <TableCell key={c} className={`text-right font-mono ${amount > 0 ? (effectiveType === 'income' ? 'text-green-600' : 'text-red-600') : ''}`}>
                                                        {amount > 0 ? formatCurrency(amount) : '-'}
                                                    </TableCell>
                                                )
                                            })}
                                            <TableCell>
                                                {!('isVirtual' in tx) ? (
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>ຢືນຢັນການລົບ?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    ການກະທຳນີ້ຈະລຶບທັງລາຍການ Debit ແລະ Credit ທີ່ກ່ຽວຂ້ອງ. ບໍ່ສາມາດຍົກເລີກໄດ້.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel variant="outline" size="default">ຍົກເລີກ</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteTransaction(tx as Transaction)}>ຢືນຢັນ</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                ) : (
                                                    <Badge variant="outline" className="text-[10px] opacity-50">Auto</Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )
                                }).filter(Boolean)}
                            </TableBody>
                        </Table>
                         {filteredTransactions.length === 0 && <div className="text-center py-8 text-muted-foreground">ບໍ່ມີທຸລະກຳໃນເດືອນທີ່ເລືອກ</div>}
                    </CardContent>
                </Card>

                <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>ລາຍລະອຽດທຸລະກຳ</DialogTitle>
                            <DialogDescription>
                                ຂໍ້ມູນການລົງບັນຊີທັງໝົດໃນກຸ່ມທຸລະກຳນີ້
                            </DialogDescription>
                        </DialogHeader>
                        {selectedTxGroup && selectedTxGroup.length > 0 && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-3 rounded-lg">
                                    <div>
                                        <span className="text-muted-foreground">ວັນທີ:</span>
                                        <p className="font-medium">{format(selectedTxGroup[0].date, "dd/MM/yyyy")}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">ຄຳອະທິບາຍ:</span>
                                        <p className="font-medium">{selectedTxGroup[0].description}</p>
                                    </div>
                                </div>
                                <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead>ຜັງບັນຊີ</TableHead>
                                                <TableHead>ປະເພດ</TableHead>
                                                <TableHead className="text-right">ຈຳນວນເງິນ</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {selectedTxGroup.map(entry => {
                                                const acc = defaultAccounts.find(a => a.id === entry.accountId);
                                                return (
                                                    <TableRow key={entry.id}>
                                                        <TableCell className="font-medium">{acc?.name || entry.accountId}</TableCell>
                                                        <TableCell>
                                                            <Badge variant={entry.type === 'debit' ? 'outline' : 'secondary'} className={entry.type === 'debit' ? 'border-blue-200 text-blue-700' : 'bg-green-50 text-green-700 border-green-200'}>
                                                                {entry.type === 'debit' ? 'Debit (ເດບິດ)' : 'Credit (ເຄຣດິດ)'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono">
                                                            {currencies.map(c => entry.amount[c] > 0 && (
                                                                <div key={c}>
                                                                    {formatCurrency(entry.amount[c])} <span className="text-[10px] uppercase text-muted-foreground">{c}</span>
                                                                </div>
                                                            ))}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}
                        <DialogFooter className="flex justify-between items-center sm:justify-between">
                            <div className="flex gap-2">
                                {selectedTxGroup && selectedTxGroup.length > 0 && (selectedTxGroup[0].description.includes(':') || selectedTxGroup[0].description.includes('ສິນເຊື່ອ')) && (
                                    <Button 
                                        variant="outline" 
                                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                        onClick={() => {
                                            const parts = selectedTxGroup[0].description.split(':');
                                            const code = parts.length > 1 ? parts[parts.length - 1].trim() : '';
                                            navigate(`/tee/cooperative/loans?search=${code}`);
                                            setIsDetailOpen(false);
                                        }}
                                    >
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        ເບິ່ງຂໍ້ມູນສິນເຊື່ອ
                                    </Button>
                                )}
                            </div>
                            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>ປິດ</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    );
}
