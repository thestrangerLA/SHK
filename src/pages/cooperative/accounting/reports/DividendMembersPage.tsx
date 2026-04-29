/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Calendar as CalendarIcon } from "lucide-react";
import { listenToCooperativeTransactions } from '@/services/cooperativeAccountingService';
import { defaultAccounts } from '@/services/cooperativeChartOfAccounts';
import { listenToCooperativeMembers } from '@/services/cooperativeMemberService';
import { listenToCooperativeDeposits } from '@/services/cooperativeDepositService';
import { listenToCooperativeDividendStructure } from '@/services/cooperativeDividendService';
import type { Transaction, CurrencyValues, CooperativeMember, CooperativeDeposit, DividendItem } from '@/lib/types';
import { getYear, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import { calculateMembershipDuration, getMembershipMonths } from '@/lib/date-utils';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const currencies: (keyof CurrencyValues)[] = ['kip', 'thb', 'usd', 'cny'];
const initialCurrencyValues: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };
const SHARE_VALUE_KIP = 100000;

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
};

export default function DividendMembersPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [members, setMembers] = useState<CooperativeMember[]>([]);
    const [deposits, setDeposits] = useState<CooperativeDeposit[]>([]);
    const [dividendStructure, setDividendStructure] = useState<DividendItem[]>([]);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [minMonths, setMinMonths] = useState<number>(12);
    const [exchangeRates, setExchangeRates] = useState({
        thb: 700,
        usd: 25000,
        cny: 3500,
    });

    useEffect(() => {
        const unsubscribeTxs = listenToCooperativeTransactions(setTransactions);
        const unsubscribeMembers = listenToCooperativeMembers(setMembers);
        const unsubscribeDeposits = listenToCooperativeDeposits(setDeposits);
        const unsubscribeDividend = listenToCooperativeDividendStructure(setDividendStructure);
        return () => {
            unsubscribeTxs();
            unsubscribeMembers();
            unsubscribeDeposits();
            unsubscribeDividend();
        };
    }, []);

    const memberDividendPercentage = useMemo(() => {
        const memberItem = dividendStructure.find(item => 
            item.name.includes('ສະມາຊິກ') || 
            item.name.toLowerCase().includes('member')
        );
        return memberItem ? memberItem.percentage : 0.40; // Fallback to 40%
    }, [dividendStructure]);

    const availableYears = useMemo(() => {
        const years = new Set<number>(transactions.map(t => getYear(t.date)));
        const currentYear = new Date().getFullYear();
        years.add(currentYear);
        return Array.from(years).sort((a, b) => (b as number) - (a as number));
    }, [transactions]);

    const netProfitInCurrencies = useMemo(() => {
        const yearDate = new Date(selectedYear, 0, 1);
        const startDate = startOfYear(yearDate);
        const endDate = endOfYear(yearDate);

        const filteredTransactions = transactions.filter(tx => isWithinInterval(tx.date, { start: startDate, end: endDate }));

        const totalIncome = { ...initialCurrencyValues };
        const totalExpense = { ...initialCurrencyValues };

        filteredTransactions.forEach(tx => {
            const account = defaultAccounts.find(a => a.id === tx.accountId);
            if (!account) return;
            const multiplier = tx.type === 'debit' ? 1 : -1;
            currencies.forEach(c => {
                 const amount = (tx.amount?.[c] || 0) * multiplier;
                 if (account.type === 'income') totalIncome[c] -= amount;
                else if (account.type === 'expense') totalExpense[c] += amount;
            });
        });
        
        return currencies.reduce((acc, c) => {
            acc[c] = totalIncome[c] - totalExpense[c];
            return acc;
        }, { ...initialCurrencyValues });
    }, [transactions, selectedYear]);

     const totalNetProfitInLak = useMemo(() => {
        return (
            (netProfitInCurrencies.kip || 0) +
            (netProfitInCurrencies.thb || 0) * exchangeRates.thb +
            (netProfitInCurrencies.usd || 0) * exchangeRates.usd +
            (netProfitInCurrencies.cny || 0) * exchangeRates.cny
        );
    }, [netProfitInCurrencies, exchangeRates]);

    const memberData = useMemo(() => {
        const now = new Date();
        const yearEndDate = endOfYear(new Date(selectedYear, 0, 1));
        // Use current date for duration display if it's the current year, otherwise end of year
        const durationRefDate = selectedYear === now.getFullYear() ? now : yearEndDate;

        const membersWithDeposits = members
            .filter(member => {
                if (!member.joinDate) return false;
                const joinDate = new Date(member.joinDate);
                if (isNaN(joinDate.getTime())) return false;
                
                // Filter based on the duration as of the reference date (today for current year, end of year for past)
                const currentMonths = getMembershipMonths(member.joinDate, durationRefDate);
                return currentMonths >= minMonths;
            })
            .map(member => {
                const memberDeposits = deposits.filter(d => d.memberId === member.id && new Date(d.date) <= yearEndDate);
                const totalDepositKip = (member.deposits?.kip || 0) + memberDeposits.reduce((sum, d) => sum + (d.kip || 0), 0);
                const shares = Math.floor(totalDepositKip / SHARE_VALUE_KIP);
                const membershipDuration = calculateMembershipDuration(member.joinDate, durationRefDate);
                return { ...member, totalDepositKip, shares, membershipDuration };
            });

        const totalShares = membersWithDeposits.reduce((sum, m) => sum + m.shares, 0);
        
        const memberDividendPoolInLak = totalNetProfitInLak * memberDividendPercentage;

        const dividendPerShareInLak = totalShares > 0 ? memberDividendPoolInLak / totalShares : 0;

        const membersWithDividend = membersWithDeposits.map(m => {
            const dividendInLak = m.shares * dividendPerShareInLak;
            return { ...m, dividendInLak };
        }).sort((a, b) => {
            const idA = parseInt(a.memberId) || 0;
            const idB = parseInt(b.memberId) || 0;
            return idA - idB;
        });
        
        return { membersWithDividend, totalShares, memberDividendPoolInLak, dividendPerShareInLak };
    }, [members, deposits, totalNetProfitInLak, minMonths, selectedYear]);
    
    const handleRateChange = (currency: 'thb' | 'usd' | 'cny', value: string) => {
        setExchangeRates(prev => ({
            ...prev,
            [currency]: Number(value) || 0
        }));
    };

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
                        <Users className="h-6 w-6 text-primary" />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">ລາຍງານການປັນຜົນໃຫ້ສະມາຊິກ</h1>
                </div>
            </header>
            <main className="flex-1 p-4 sm:px-6 md:py-8 space-y-6 max-w-7xl mx-auto w-full">
                 <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold">ໂຕກອງ ແລະ ອັດຕາແລກປ່ຽນ</CardTitle>
                        <CardContent className="flex flex-col md:flex-row md:items-end gap-6 pt-4 px-0">
                             <div className="grid gap-2">
                                <Label htmlFor="year-selector">ເລືອກປີ</Label>
                                 <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button id="year-selector" variant="outline" className="w-[200px] justify-start text-left font-normal bg-background/50">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {selectedYear ? `ປີ ${selectedYear + 543}` : 'ເລືອກປີ'}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        {availableYears.map(year => (
                                            <DropdownMenuItem key={year} onSelect={() => setSelectedYear(year)}>
                                                {year + 543}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="min-months">ອາຍຸການເປັນສະມາຊິກຂັ້ນຕ່ຳ (ເດືອນ)</Label>
                                <Input 
                                    id="min-months"
                                    type="number" 
                                    value={minMonths} 
                                    onChange={(e) => setMinMonths(Number(e.target.value) || 0)} 
                                    className="bg-background/50 w-[200px]" 
                                />
                            </div>
                            <div className="grid gap-2 flex-1">
                                <Label>ອັດຕາແລກປ່ຽນ THB</Label>
                                <Input type="number" value={exchangeRates.thb} onChange={(e) => handleRateChange('thb', e.target.value)} className="bg-background/50" />
                            </div>
                            <div className="grid gap-2 flex-1">
                                <Label>ອັດຕາແລກປ່ຽນ USD</Label>
                                <Input type="number" value={exchangeRates.usd} onChange={(e) => handleRateChange('usd', e.target.value)} className="bg-background/50" />
                            </div>
                            <div className="grid gap-2 flex-1">
                                <Label>ອັດຕາແລກປ່ຽນ CNY</Label>
                                <Input type="number" value={exchangeRates.cny} onChange={(e) => handleRateChange('cny', e.target.value)} className="bg-background/50" />
                            </div>
                        </CardContent>
                    </CardHeader>
                </Card>
                <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">ການປັນຜົນໃຫ້ສະມາຊິກ ປີ {selectedYear + 543}</CardTitle>
                         <CardDescription className="text-lg">
                            ກຳໄລສຸດທິທັງໝົດຂອງສະຫະກອນໃນປີ {selectedYear + 543}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-6 border-none rounded-2xl bg-card shadow-sm glass-dark">
                                <h4 className="text-sm font-bold text-muted-foreground mb-2">ກຳໄລສຸດທິລວມ (LAK)</h4>
                                <p className={`text-3xl font-bold font-mono ${totalNetProfitInLak < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                    {formatCurrency(totalNetProfitInLak)}
                                </p>
                            </div>
                           
                            <div className="p-6 border-none rounded-2xl bg-blue-50 shadow-sm border-l-8 border-blue-500">
                                <h3 className="font-bold text-blue-800 mb-2">ກຳໄລສ່ວນຂອງສະມາຊິກ ({Math.round(memberDividendPercentage * 100)}%)</h3>
                                 <div className="text-3xl font-bold text-blue-700 font-mono">
                                    {formatCurrency(memberData.memberDividendPoolInLak)} LAK
                                </div>
                            </div>
                             <div className="p-6 border-none rounded-2xl bg-amber-50 shadow-sm border-l-8 border-amber-500">
                                <h3 className="font-bold text-amber-800 mb-2">ເງິນປັນຜົນຕໍ່ຫຸ້ນ</h3>
                                 <div className="text-3xl font-bold text-amber-700 font-mono">
                                    {formatCurrency(memberData.dividendPerShareInLak)} LAK
                                </div>
                                <p className="text-xs text-amber-600 mt-2 font-medium">ຄຳນວນຈາກ: ຍອດເງິນປັນຜົນສະມາຊິກ / ຈຳນວນຫຸ້ນທັງໝົດ ({memberData.totalShares} ຫຸ້ນ)</p>
                            </div>
                        </div>

                      <div className="rounded-2xl border-none overflow-hidden bg-card/50 backdrop-blur-sm shadow-sm">
                        <Table>
                          <TableHeader>
                              <TableRow className="bg-muted/50">
                                  <TableHead className="font-bold">ລະຫັດ</TableHead>
                                  <TableHead className="font-bold">ຊື່ສະມາຊິກ</TableHead>
                                  <TableHead className="font-bold">ອາຍຸການເປັນສະມາຊິກ</TableHead>
                                  <TableHead className="text-right font-bold">ເງິນຝາກ (KIP)</TableHead>
                                  <TableHead className="text-right font-bold">ຈຳນວນຫຸ້ນ</TableHead>
                                  <TableHead className="text-right font-bold">ປັນຜົນ (LAK)</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {memberData.membersWithDividend.map((member) => (
                                  <TableRow key={member.id} className="hover:bg-muted/30">
                                      <TableCell className="font-mono font-medium">{member.memberId}</TableCell>
                                      <TableCell className="font-medium">{member.name}</TableCell>
                                      <TableCell className="text-sm text-muted-foreground">{member.membershipDuration}</TableCell>
                                      <TableCell className="text-right font-mono">{formatCurrency(member.totalDepositKip)}</TableCell>
                                      <TableCell className="text-right font-bold text-lg">{member.shares}</TableCell>
                                      <TableCell className="text-right font-mono text-green-600 font-bold text-lg">
                                          {formatCurrency(member.dividendInLak)}
                                      </TableCell>
                                  </TableRow>
                              ))}
                          </TableBody>
                          <TableFooter>
                              <TableRow className="bg-primary/5 font-bold">
                                  <TableCell colSpan={4} className="text-right text-lg">ລວມທັງໝົດ</TableCell>
                                  <TableCell className="text-right text-2xl">{memberData.totalShares}</TableCell>
                                  <TableCell className="text-right font-mono text-green-700 text-2xl">
                                      {formatCurrency(memberData.memberDividendPoolInLak)}
                                  </TableCell>
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
