/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Calendar as CalendarIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { format, startOfYear, endOfYear, isWithinInterval, getMonth, getYear } from 'date-fns';
import { LAO_MONTHS } from '@/lib/date-utils';
import { listenToCooperativeTransactions } from '@/services/cooperativeAccountingService';
import { listenToTradeReceivables, listenToAllArPayments } from '@/services/cooperativeArService';
import { defaultAccounts } from '@/services/cooperativeChartOfAccounts';
import type { Transaction, CurrencyValues, TradeReceivable, TradeReceivablePayment } from '@/lib/types';

const currencies: (keyof CurrencyValues)[] = ['kip', 'thb', 'usd', 'cny'];
const initialCurrencyValues: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
};

export default function IncomeStatementPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [receivables, setReceivables] = useState<TradeReceivable[]>([]);
    const [arPayments, setArPayments] = useState<TradeReceivablePayment[]>([]);
    const [startDate, setStartDate] = useState<Date | undefined>(startOfYear(new Date()));
    const [endDate, setEndDate] = useState<Date | undefined>(endOfYear(new Date()));

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

    const reportData = useMemo(() => {
        const filteredTransactions = transactions.filter(tx => {
            if (!startDate || !endDate) return true;
            return isWithinInterval(tx.date, { start: startDate, end: endDate });
        });

        const incomeByAccount: Record<string, CurrencyValues> = {};
        const expenseByAccount: Record<string, CurrencyValues> = {};
        const totalIncome: CurrencyValues = { ...initialCurrencyValues };
        const totalExpense: CurrencyValues = { ...initialCurrencyValues };

        filteredTransactions.forEach(tx => {
            const account = defaultAccounts.find(a => a.id === tx.accountId);
            if (!account) return;

            const multiplier = tx.type === 'debit' ? 1 : -1;
            
            if (account.type === 'income') {
                if (!incomeByAccount[account.id]) incomeByAccount[account.id] = { ...initialCurrencyValues };
                currencies.forEach(c => {
                    const amount = (tx.amount?.[c] || 0) * multiplier * -1; // Invert for income
                    incomeByAccount[account.id][c] += amount;
                    totalIncome[c] += amount;
                });
            } else if (account.type === 'expense') {
                if (!expenseByAccount[account.id]) expenseByAccount[account.id] = { ...initialCurrencyValues };
                currencies.forEach(c => {
                    const amount = (tx.amount?.[c] || 0) * multiplier;
                    expenseByAccount[account.id][c] += amount;
                    totalExpense[c] += amount;
                });
            }
        });
        
        const netProfit = currencies.reduce((acc, c) => {
            acc[c] = totalIncome[c] - totalExpense[c];
            return acc;
        }, { ...initialCurrencyValues });

        // Add realized profit from Trade Receivables
        const tradeProfit: CurrencyValues = { ...initialCurrencyValues };
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
                totalIncome[c] += actualRealized;
                netProfit[c] += actualRealized;
            });
        });

        return { incomeByAccount, expenseByAccount, totalIncome, totalExpense, netProfit, tradeProfit };
    }, [transactions, receivables, arPayments, startDate, endDate]);

    return (
        <div className="flex min-h-screen w-full flex-col bg-gradient-to-br from-background via-background to-primary/5">
            <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-md px-4 sm:px-6">
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" asChild>
                    <Link to="/tee/cooperative/reports">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-xl">
                        <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">ໃບລາຍງານຜົນໄດ້ຮັບ (Income Statement)</h1>
                </div>
            </header>
            <main className="flex-1 p-4 sm:px-6 md:py-8 space-y-6 max-w-7xl mx-auto w-full">
                <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold">ໂຕກອງລາຍງານ</CardTitle>
                        <CardContent className="flex flex-col md:flex-row md:items-end gap-6 pt-4 px-0">
                            <div className="grid gap-2">
                                <Label htmlFor="start-date">ວັນທີເລີ່ມຕົ້ນ</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button id="start-date" variant={"outline"} className="w-[200px] justify-start text-left font-normal bg-background/50">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {startDate ? format(startDate, "dd/MM/yyyy") : <span>ເລືອກ</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus /></PopoverContent>
                                </Popover>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="end-date">ວັນທີສິ້ນສຸດ</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button id="end-date" variant={"outline"} className="w-[200px] justify-start text-left font-normal bg-background/50">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {endDate ? format(endDate, "dd/MM/yyyy") : <span>ເລືອກ</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus /></PopoverContent>
                                </Popover>
                            </div>
                        </CardContent>
                    </CardHeader>
                </Card>
                <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">Income Statement</CardTitle>
                        <CardDescription className="text-lg">
                            ແຕ່ {startDate ? `${startDate.getDate()} ${LAO_MONTHS[getMonth(startDate)]} ${getYear(startDate) + 543}` : '...'} ຫາ {endDate ? `${endDate.getDate()} ${LAO_MONTHS[getMonth(endDate)]} ${getYear(endDate) + 543}` : '...'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-2xl border-none overflow-hidden bg-card/50 backdrop-blur-sm shadow-sm">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="font-bold">ລາຍການ</TableHead>
                                        {currencies.map(c => <TableHead key={c} className="text-right uppercase font-bold">{c}</TableHead>)}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow className="font-bold bg-muted/20"><TableCell colSpan={5} className="text-lg">ລາຍຮັບ</TableCell></TableRow>
                                    {Object.entries(reportData.incomeByAccount).map(([accountId, balances]) => (
                                        <TableRow key={accountId} className="hover:bg-muted/30">
                                            <TableCell className="pl-8 font-medium">{defaultAccounts.find(a => a.id === accountId)?.name}</TableCell>
                                            {currencies.map(c => <TableCell key={c} className="text-right font-mono">{formatCurrency(balances[c])}</TableCell>)}
                                        </TableRow>
                                    ))}
                                    {currencies.some(c => reportData.tradeProfit[c] > 0) && (
                                        <TableRow className="hover:bg-muted/30">
                                            <TableCell className="pl-8 font-medium">ກຳໄລຈາກລູກໜີ້ການຄ້າ (Trade Profit)</TableCell>
                                            {currencies.map(c => <TableCell key={c} className="text-right font-mono">{formatCurrency(reportData.tradeProfit[c])}</TableCell>)}
                                        </TableRow>
                                    )}
                                    <TableRow className="font-bold bg-muted/40">
                                        <TableCell className="text-lg">ລວມລາຍຮັບ</TableCell>
                                        {currencies.map(c => <TableCell key={c} className="text-right font-mono text-lg">{formatCurrency(reportData.totalIncome[c])}</TableCell>)}
                                    </TableRow>
                                    <TableRow className="font-bold bg-muted/20"><TableCell colSpan={5} className="text-lg">ລາຍຈ່າຍ</TableCell></TableRow>
                                    {Object.entries(reportData.expenseByAccount).map(([accountId, balances]) => (
                                        <TableRow key={accountId} className="hover:bg-muted/30">
                                            <TableCell className="pl-8 font-medium">{defaultAccounts.find(a => a.id === accountId)?.name}</TableCell>
                                            {currencies.map(c => <TableCell key={c} className="text-right font-mono">({formatCurrency(balances[c])})</TableCell>)}
                                        </TableRow>
                                    ))}
                                    <TableRow className="font-bold bg-muted/40">
                                        <TableCell className="text-lg">ລວມລາຍຈ່າຍ</TableCell>
                                        {currencies.map(c => <TableCell key={c} className="text-right font-mono text-lg">({formatCurrency(reportData.totalExpense[c])})</TableCell>)}
                                    </TableRow>
                                </TableBody>
                                <TableFooter>
                                    <TableRow className="font-bold text-2xl bg-primary/10">
                                        <TableCell>ກຳໄລ / (ຂາດທຶນ) ສຸດທິ</TableCell>
                                        {currencies.map(c => <TableCell key={c} className={`text-right font-mono ${reportData.netProfit[c] < 0 ? 'text-red-600' : 'text-green-700'}`}>{formatCurrency(reportData.netProfit[c])}</TableCell>)}
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
