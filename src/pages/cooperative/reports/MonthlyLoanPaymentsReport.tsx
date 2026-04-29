/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Download, Search, X, Receipt, User, CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, endOfMonth, isWithinInterval } from "date-fns";
import { LAO_MONTHS } from '@/lib/date-utils';
import type { Loan, LoanRepayment, CooperativeMember } from '@/lib/types';
import { listenToCooperativeLoans, listenToAllRepayments } from '@/services/cooperativeLoanService';
import { listenToCooperativeMembers } from '@/services/cooperativeMemberService';
import { UserNav } from '@/components/UserNav';
import { cn } from "@/lib/utils";
// @ts-ignore
import html2pdf from 'html2pdf.js';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
};

export default function MonthlyRepaymentsReport() {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [repayments, setRepayments] = useState<LoanRepayment[]>([]);
    const [members, setMembers] = useState<CooperativeMember[]>([]);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [activeTab, setActiveTab] = useState<string>(new Date().getMonth().toString());
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const unsubLoans = listenToCooperativeLoans(setLoans);
        const unsubRepayments = listenToAllRepayments(setRepayments);
        const unsubMembers = listenToCooperativeMembers(setMembers);
        return () => {
            unsubLoans();
            unsubRepayments();
            unsubMembers();
        };
    }, []);

    const memberMap = useMemo(() => {
        const map: Record<string, string> = {};
        members.forEach(m => { map[m.id] = m.name; });
        return map;
    }, [members]);

    const loanMap = useMemo(() => {
        const map: Record<string, Loan> = {};
        loans.forEach(l => { map[l.id] = l; });
        return map;
    }, [loans]);

    const formattedRepayments = useMemo(() => {
        return repayments.map(r => ({
            id: r.id,
            date: r.repaymentDate,
            name: loanMap[r.loanId] ? (loanMap[r.loanId].memberId ? (memberMap[loanMap[r.loanId].memberId!] || loanMap[r.loanId].debtorName) : loanMap[r.loanId].debtorName) : '...',
            memberName: loanMap[r.loanId]?.debtorName || '...',
            phone: members.find(m => m.id === loanMap[r.loanId]?.memberId)?.memberId || '', // Just a placeholder for more info if needed
            amount: r.amountPaid,
            loanCode: loanMap[r.loanId]?.loanCode || '...',
            note: r.note || '',
            type: 'repayment'
        }));
    }, [repayments, loanMap, memberMap, members]);

    const monthlyData = useMemo(() => {
        const data: { [key: string]: any[] } = {};
        
        for (let i = 0; i < 12; i++) {
            const start = new Date(selectedYear, i, 1);
            const end = endOfMonth(start);
            data[i.toString()] = formattedRepayments.filter(t => 
                isWithinInterval(t.date, { start, end })
            ).sort((a, b) => b.date.getTime() - a.date.getTime()); // Latest first
        }
        return data;
    }, [formattedRepayments, selectedYear]);

    const exportToPDF = (monthIndex: string) => {
        const element = document.getElementById(`repayment-report-table-${monthIndex}`);
        if (!element) return;

        const monthName = LAO_MONTHS[parseInt(monthIndex)];
        const fileName = `ລາຍງານການຊຳລະສິນເຊື່ອ_${monthName}_${selectedYear}.pdf`;

        const opt = {
            margin: 10,
            filename: fileName,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        (html2pdf() as any).set(opt).from(element).save();
    };

    return (
        <div className="flex min-h-screen w-full flex-col bg-gradient-to-br from-background via-background to-primary/5">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 backdrop-blur-md px-4 sm:px-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" asChild>
                        <Link to="/tee/cooperative/reports">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-2 rounded-xl">
                            <Receipt className="h-6 w-6 text-green-600" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight">ລາຍງານການຊຳລະສິນເຊື່ອ</h1>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Select 
                        value={String(selectedYear)}
                        onValueChange={(v) => setSelectedYear(parseInt(v))}
                    >
                        <SelectTrigger className="w-32 h-9 bg-background/50">
                            <SelectValue placeholder="ປີ" />
                        </SelectTrigger>
                        <SelectContent>
                            {[2024, 2025, 2026, 2027].map(y => (
                                <SelectItem key={y} value={String(y)}>{y + 543}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <UserNav />
                </div>
            </header>

            <main className="flex-1 p-4 sm:px-6 md:py-8">
                <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm mx-auto max-w-6xl">
                    <CardHeader className="pb-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <CardTitle className="text-xl">ສະຫຼຸບການຊຳລະເງິນກູ້</CardTitle>
                                <CardDescription>ເບິ່ງລາຍຊື່ຜູ້ຊຳລະ ແລະ ຈຳນວນເງິນໃນແຕ່ລະເດືອນ</CardDescription>
                            </div>
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <div className="relative w-full md:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="ຄົ້ນຫາຊື່..."
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
                                <Button variant="outline" size="sm" className="h-10" onClick={() => exportToPDF(activeTab)}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Export PDF
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="flex flex-wrap h-auto p-1 bg-muted/50 rounded-xl mb-8">
                                {LAO_MONTHS.map((month, index) => (
                                    <TabsTrigger key={index} value={index.toString()} className="flex-1 min-w-[80px] py-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                        {month}
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            {LAO_MONTHS.map((month, index) => {
                                const currentMonthData = monthlyData[index.toString()] || [];
                                const filteredMonthData = currentMonthData.filter(t => 
                                    !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.loanCode.toLowerCase().includes(searchQuery.toLowerCase())
                                );

                                return (
                                    <TabsContent key={index} value={index.toString()} className="mt-0 focus-visible:outline-none">
                                        <div id={`repayment-report-table-${index}`} className="p-6 bg-white rounded-2xl border shadow-sm">
                                            <div className="flex items-center justify-between mb-8 pb-4 border-b">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center">
                                                        <CalendarDays className="h-6 w-6 text-green-600" />
                                                    </div>
                                                    <div>
                                                        <h2 className="text-xl font-bold text-slate-900">ລາຍການຊຳລະປະຈຳເດືອນ {month}</h2>
                                                        <p className="text-sm text-muted-foreground">ສົກປີ {selectedYear + 543}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">ຍອດລວມທັງໝົດ (KIP)</p>
                                                    <p className="text-2xl font-black text-green-600 font-mono">
                                                        {formatCurrency(filteredMonthData.reduce((acc, curr) => acc + (curr.amount.kip || 0), 0))}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="overflow-x-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="bg-slate-50/50">
                                                            <TableHead className="w-[120px]">ວັນທີຊຳລະ</TableHead>
                                                            <TableHead className="w-[150px]">ລະຫັດສິນເຊື່ອ</TableHead>
                                                            <TableHead>ຊື່ຜູ້ຊຳລະ</TableHead>
                                                            <TableHead className="text-right">ຈຳນວນເງິນ (KIP)</TableHead>
                                                            <TableHead className="text-right">ຈຳນວນເງິນ (THB)</TableHead>
                                                            <TableHead className="text-right">ໝາຍເຫດ</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {filteredMonthData.length > 0 ? (
                                                            filteredMonthData.map((t) => (
                                                                <TableRow key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                                                                    <TableCell className="font-medium text-slate-600">
                                                                        {format(t.date, 'dd/MM/yyyy')}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                                                            {t.loanCode}
                                                                        </span>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                                                <User className="h-4 w-4" />
                                                                            </div>
                                                                            <span className="font-bold text-slate-800">{t.name}</span>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="text-right font-mono font-bold text-green-600">
                                                                        {t.amount.kip !== 0 ? formatCurrency(t.amount.kip) : '-'}
                                                                    </TableCell>
                                                                    <TableCell className="text-right font-mono text-slate-500">
                                                                        {t.amount.thb !== 0 ? formatCurrency(t.amount.thb) : '-'}
                                                                    </TableCell>
                                                                    <TableCell className="text-right text-xs text-muted-foreground italic">
                                                                        {t.note || '-'}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))
                                                        ) : (
                                                            <TableRow>
                                                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground animate-pulse">
                                                                    <div className="flex flex-col items-center justify-center gap-2">
                                                                        <Search className="h-8 w-8 opacity-20" />
                                                                        <p className="italic">ບອບມີລາຍການຊຳລະໃນເດືອນນີ້</p>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </div>

                                            {filteredMonthData.length > 0 && (
                                                <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t">
                                                    <div className="bg-slate-50 p-4 rounded-xl">
                                                        <p className="text-xs font-bold text-slate-500 uppercase mb-2">ສະຫຼຸບສະກຸນເງິນອື່ນ (THB)</p>
                                                        <p className="text-lg font-bold font-mono text-slate-700">
                                                            {formatCurrency(filteredMonthData.reduce((acc, curr) => acc + (curr.amount.thb || 0), 0))} <span className="text-sm font-normal">THB</span>
                                                        </p>
                                                    </div>
                                                    <div className="bg-slate-50 p-4 rounded-xl">
                                                        <p className="text-xs font-bold text-slate-500 uppercase mb-2">ສະຫຼຸບສະກຸນເງິນອື່ນ (USD)</p>
                                                        <p className="text-lg font-bold font-mono text-slate-700">
                                                            {formatCurrency(filteredMonthData.reduce((acc, curr) => acc + (curr.amount.usd || 0), 0))} <span className="text-sm font-normal">USD</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>
                                );
                            })}
                        </Tabs>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
