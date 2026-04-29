/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Landmark, Calendar as CalendarIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { format, startOfDay, getMonth, getYear } from 'date-fns';
import { LAO_MONTHS } from '@/lib/date-utils';
import { listenToCooperativeTransactions, getAccountBalances } from '@/services/cooperativeAccountingService';
import { defaultAccounts } from '@/services/cooperativeChartOfAccounts';
import type { Transaction, CurrencyValues } from '@/lib/types';

const currencies: (keyof CurrencyValues)[] = ['kip', 'thb', 'usd', 'cny'];
const initialCurrencyValues: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
};

export default function BalanceSheetPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [asOfDate, setAsOfDate] = useState<Date | undefined>(new Date());

    useEffect(() => {
        const unsubscribe = listenToCooperativeTransactions(setTransactions);
        return () => unsubscribe();
    }, []);

    const reportData = useMemo(() => {
        const filteredTransactions = transactions.filter(tx => {
            if (!asOfDate) return true;
            return tx.date <= startOfDay(asOfDate);
        });

        const balances = getAccountBalances(filteredTransactions);

        const assets = { ...initialCurrencyValues };
        const liabilities = { ...initialCurrencyValues };
        const equity = { ...initialCurrencyValues };
        
        const assetAccounts: Record<string, CurrencyValues> = {};
        const liabilityAccounts: Record<string, CurrencyValues> = {};
        const equityAccounts: Record<string, CurrencyValues> = {};

        defaultAccounts.forEach(account => {
            const balance = balances[account.id] || { ...initialCurrencyValues };
            if (account.type === 'asset') {
                assetAccounts[account.id] = balance;
                currencies.forEach(c => assets[c] += balance[c]);
            } else if (account.type === 'liability') {
                liabilityAccounts[account.id] = balance;
                currencies.forEach(c => liabilities[c] += balance[c] * -1); // Liabilities are credit balances
            } else if (account.type === 'equity') {
                equityAccounts[account.id] = balance;
                currencies.forEach(c => equity[c] += balance[c] * -1); // Equity are credit balances
            } else if (account.type === 'income') {
                 currencies.forEach(c => equity[c] += balance[c] * -1); // Retained Earnings
            } else if (account.type === 'expense') {
                currencies.forEach(c => equity[c] += balance[c] * -1); // Retained Earnings
            }
        });
        
        const totalLiabilitiesAndEquity = currencies.reduce((acc, c) => {
            acc[c] = liabilities[c] + equity[c];
            return acc;
        }, { ...initialCurrencyValues });

        return { assetAccounts, liabilityAccounts, equityAccounts, assets, liabilities, equity, totalLiabilitiesAndEquity };

    }, [transactions, asOfDate]);

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
                        <Landmark className="h-6 w-6 text-primary" />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">ໃບສະຫຼຸບຊັບສິນ (Balance Sheet)</h1>
                </div>
            </header>
            <main className="flex-1 p-4 sm:px-6 md:py-8 space-y-6 max-w-7xl mx-auto w-full">
                <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold">ໂຕກອງລາຍງານ</CardTitle>
                        <CardContent className="flex flex-col md:flex-row md:items-end gap-4 pt-4 px-0">
                            <div className="grid gap-2">
                                <Label htmlFor="as-of-date">ຂໍ້ມູນ ณ ວັນທີ</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button id="as-of-date" variant={"outline"} className="w-[200px] justify-start text-left font-normal bg-background/50">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {asOfDate ? format(asOfDate, "dd/MM/yyyy") : <span>ເລືອກ</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={asOfDate} onSelect={setAsOfDate} initialFocus /></PopoverContent>
                                </Popover>
                            </div>
                        </CardContent>
                    </CardHeader>
                </Card>
                <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">Balance Sheet</CardTitle>
                        <CardDescription className="text-lg">
                            ຂໍ້ມູນ ณ ວັນທີ {asOfDate ? `${asOfDate.getDate()} ${LAO_MONTHS[getMonth(asOfDate)]} ${getYear(asOfDate) + 543}` : '...'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-2 gap-8">
                             <div className="space-y-4">
                                <h3 className="text-lg font-bold mb-2 text-primary border-b pb-2">ສິນຊັບ (Assets)</h3>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="font-bold">ບັນຊີ</TableHead>
                                            {currencies.map(c => <TableHead key={c} className="text-right uppercase font-bold">{c}</TableHead>)}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(reportData.assetAccounts).map(([accountId, balances]) => (
                                            <TableRow key={accountId} className="hover:bg-muted/30">
                                                <TableCell className="font-medium">{defaultAccounts.find(a => a.id === accountId)?.name}</TableCell>
                                                {currencies.map(c => <TableCell key={c} className="text-right font-mono">{formatCurrency(balances[c])}</TableCell>)}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                    <TableFooter>
                                        <TableRow className="font-bold bg-primary/5">
                                            <TableCell className="text-lg">ລວມສິນຊັບ</TableCell>
                                            {currencies.map(c => <TableCell key={c} className="text-right text-lg font-mono">{formatCurrency(reportData.assets[c])}</TableCell>)}
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold mb-2 text-primary border-b pb-2">ໜີ້ສິນ ແລະ ທຶນ (Liabilities and Equity)</h3>
                                 <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="font-bold">ບັນຊີ</TableHead>
                                            {currencies.map(c => <TableHead key={c} className="text-right uppercase font-bold">{c}</TableHead>)}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow className="font-bold bg-muted/20"><TableCell colSpan={5}>ໜີ້ສິນ</TableCell></TableRow>
                                        {Object.entries(reportData.liabilityAccounts).map(([accountId, balances]) => (
                                            <TableRow key={accountId} className="hover:bg-muted/30">
                                                <TableCell className="pl-8 font-medium">{defaultAccounts.find(a => a.id === accountId)?.name}</TableCell>
                                                {currencies.map(c => <TableCell key={c} className="text-right font-mono">{formatCurrency(balances[c] * -1)}</TableCell>)}
                                            </TableRow>
                                        ))}
                                         <TableRow className="font-bold bg-muted/40">
                                            <TableCell>ລວມໜີ້ສິນ</TableCell>
                                            {currencies.map(c => <TableCell key={c} className="text-right font-mono">{formatCurrency(reportData.liabilities[c])}</TableCell>)}
                                        </TableRow>
                                         <TableRow className="font-bold bg-muted/20"><TableCell colSpan={5}>ທຶນ</TableCell></TableRow>
                                         {Object.entries(reportData.equityAccounts).map(([accountId, balances]) => (
                                            <TableRow key={accountId} className="hover:bg-muted/30">
                                                <TableCell className="pl-8 font-medium">{defaultAccounts.find(a => a.id === accountId)?.name}</TableCell>
                                                {currencies.map(c => <TableCell key={c} className="text-right font-mono">{formatCurrency(balances[c] * -1)}</TableCell>)}
                                            </TableRow>
                                        ))}
                                         <TableRow className="font-bold bg-muted/40">
                                            <TableCell>ລວມທຶນ</TableCell>
                                            {currencies.map(c => <TableCell key={c} className="text-right font-mono">{formatCurrency(reportData.equity[c])}</TableCell>)}
                                        </TableRow>
                                    </TableBody>
                                    <TableFooter>
                                        <TableRow className="font-bold bg-primary/5">
                                            <TableCell className="text-lg">ລວມໜີ້ສິນ ແລະ ທຶນ</TableCell>
                                            {currencies.map(c => <TableCell key={c} className="text-right text-lg font-mono">{formatCurrency(reportData.totalLiabilitiesAndEquity[c])}</TableCell>)}
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
