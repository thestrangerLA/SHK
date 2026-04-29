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
import { ArrowLeft, Download, FileText, Printer, Search, X, Handshake, CreditCard, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { LAO_MONTHS } from '@/lib/date-utils';
import type { Loan, LoanRepayment, CurrencyValues, CooperativeMember } from '@/lib/types';
import { listenToCooperativeLoans, listenToAllRepayments } from '@/services/cooperativeLoanService';
import { listenToCooperativeMembers } from '@/services/cooperativeMemberService';
import { UserNav } from '@/components/UserNav';
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
// @ts-ignore
import html2pdf from 'html2pdf.js';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
};

export default function LoanTransactionReport() {
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

    const disbursements = useMemo(() => {
        return loans.filter(l => l.status === 'approved').map(l => ({
            id: l.id,
            date: l.createdAt || l.applicationDate, // Approved date would be better but we use createdAt for simplified grouping
            name: l.memberId ? (memberMap[l.memberId] || '...') : (l.debtorName || '...'),
            amount: l.amount,
            code: l.loanCode,
            type: 'disbursement'
        }));
    }, [loans, memberMap]);

    const formattedRepayments = useMemo(() => {
        return repayments.map(r => ({
            id: r.id,
            date: r.repaymentDate,
            name: loanMap[r.loanId] ? (loanMap[r.loanId].memberId ? memberMap[loanMap[r.loanId].memberId!] : loanMap[r.loanId].debtorName) : '...',
            amount: r.amountPaid,
            code: loanMap[r.loanId]?.loanCode || '...',
            type: 'repayment'
        }));
    }, [repayments, loanMap, memberMap]);

    const monthlyData = useMemo(() => {
        const data: { [key: string]: any[] } = {};
        const allTransactions = [...disbursements, ...formattedRepayments];
        
        for (let i = 0; i < 12; i++) {
            const start = new Date(selectedYear, i, 1);
            const end = endOfMonth(start);
            data[i.toString()] = allTransactions.filter(t => 
                isWithinInterval(t.date, { start, end })
            ).sort((a, b) => a.date.getTime() - b.date.getTime());
        }
        return data;
    }, [disbursements, formattedRepayments, selectedYear]);

    const chartData = useMemo(() => {
        return LAO_MONTHS.map((month, index) => {
            const data = monthlyData[index.toString()] || [];
            const monthDisbursements = data.filter(t => t.type === 'disbursement');
            const monthRepayments = data.filter(t => t.type === 'repayment');
            
            return {
                name: month,
                disbursements: monthDisbursements.reduce((sum, t) => sum + (t.amount.kip || 0), 0),
                repayments: monthRepayments.reduce((sum, t) => sum + (t.amount.kip || 0), 0)
            };
        });
    }, [monthlyData]);

    const exportToPDF = (monthIndex: string) => {
        const element = document.getElementById(`loan-report-table-${monthIndex}`);
        if (!element) return;

        const monthName = LAO_MONTHS[parseInt(monthIndex)];
        const yearLao = selectedYear + 543;
        const fileName = `ລາຍງານສິນເຊື່ອ_${monthName}_${yearLao}.pdf`;

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
                        <div className="bg-primary/10 p-2 rounded-xl">
                            <Handshake className="h-6 w-6 text-primary" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight">ລາຍງານການຈ່າຍສິນເຊື່ອ ແລະ ຮັບຊຳລະ</h1>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Select 
                        value={String(selectedYear)}
                        onValueChange={(v) => setSelectedYear(parseInt(v))}
                    >
                        <SelectTrigger className="w-32 h-9 bg-background/50 text-xs sm:text-sm">
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
                <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
                    <CardHeader className="pb-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <CardTitle className="text-xl">ລາຍລະອຽດການເຄື່ອນໄຫວສິນເຊື່ອ</CardTitle>
                                <CardDescription>ເບິ່ງການຈ່າຍເງິນກູ້ອະນຸມັດ ແລະ ການຊຳລະຄືນ</CardDescription>
                            </div>
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <div className="relative w-full md:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="ຄົ້ນຫາຊື່ ຫຼື ລະຫັດ..."
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
                                <TabsTrigger value="chart" className="flex-1 min-w-[120px] py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm font-bold">
                                    ສະຫຼຸບຜົນ (Chart)
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="chart">
                                <Card className="border-none shadow-none bg-transparent">
                                    <CardHeader className="px-0">
                                        <CardTitle className="text-lg text-center">ສະຫຼຸບການເຄື່ອນໄຫວສິນເຊື່ອລາຍປີ {selectedYear + 543}</CardTitle>
                                        <CardDescription className="text-center">ປຽບທຽບຍອດການຈ່າຍເງິນກູ້ ແລະ ຮັບຊຳລະຄືນ (KIP)</CardDescription>
                                    </CardHeader>
                                    <CardContent className="px-0 h-[400px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                                <XAxis 
                                                    dataKey="name" 
                                                    axisLine={false} 
                                                    tickLine={false} 
                                                    tick={{ fill: '#6b7280', fontSize: 12 }}
                                                />
                                                <YAxis 
                                                    axisLine={false} 
                                                    tickLine={false} 
                                                    tick={{ fill: '#6b7280', fontSize: 12 }}
                                                    tickFormatter={(value) => `${value / 1000000}M`}
                                                />
                                                <Tooltip 
                                                    cursor={{ fill: '#f3f4f6' }}
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                    formatter={(value: number) => [formatCurrency(value), '']}
                                                />
                                                <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
                                                <Bar dataKey="disbursements" name="ຈ່າຍເງິນກູ້" fill="#dc2626" radius={[4, 4, 0, 0]} barSize={20} />
                                                <Bar dataKey="repayments" name="ຮັບຊຳລະຄືນ" fill="#16a34a" radius={[4, 4, 0, 0]} barSize={20} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {LAO_MONTHS.map((month, index) => {
                                const currentMonthData = monthlyData[index.toString()] || [];
                                const filteredMonthData = currentMonthData.filter(t => 
                                    !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.code.toLowerCase().includes(searchQuery.toLowerCase())
                                );
                                const disbursementsOnly = filteredMonthData.filter(t => t.type === 'disbursement');
                                const repaymentsOnly = filteredMonthData.filter(t => t.type === 'repayment');

                                const renderTable = (data: any[], title: string, type: 'disbursement' | 'repayment') => (
                                    <div className="mb-8 overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-muted/20">
                                                    <TableHead className="w-[100px]">ວັນທີ</TableHead>
                                                    <TableHead className="w-[120px]">ລະຫັດ</TableHead>
                                                    <TableHead>ລາຍລະອຽດ</TableHead>
                                                    <TableHead className="text-right whitespace-nowrap">KIP</TableHead>
                                                    <TableHead className="text-right whitespace-nowrap">THB</TableHead>
                                                    <TableHead className="text-right whitespace-nowrap">USD</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {data.length > 0 ? (
                                                    <>
                                                        {data.map((t) => (
                                                            <TableRow key={t.id} className="hover:bg-muted/50 transition-colors">
                                                                <TableCell className="whitespace-nowrap">{format(t.date, 'dd/MM/yyyy')}</TableCell>
                                                                <TableCell className="font-mono text-xs">{t.code}</TableCell>
                                                                <TableCell className="font-medium">{t.name}</TableCell>
                                                                <TableCell className={cn("text-right font-mono font-semibold", type === 'disbursement' ? "text-red-600" : "text-green-600")}>
                                                                    {t.amount.kip !== 0 ? formatCurrency(t.amount.kip) : '-'}
                                                                </TableCell>
                                                                <TableCell className={cn("text-right font-mono", type === 'disbursement' ? "text-red-400" : "text-green-400")}>
                                                                    {t.amount.thb !== 0 ? formatCurrency(t.amount.thb) : '-'}
                                                                </TableCell>
                                                                <TableCell className={cn("text-right font-mono", type === 'disbursement' ? "text-red-400" : "text-green-400")}>
                                                                    {t.amount.usd !== 0 ? formatCurrency(t.amount.usd) : '-'}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                        <TableRow className="bg-muted/30 font-bold border-t-2 border-primary/20">
                                                            <TableCell colSpan={3} className="text-center py-4">ລວມ{title}</TableCell>
                                                            <TableCell className={cn("text-right font-mono text-lg", type === 'disbursement' ? "text-red-600" : "text-green-600")}>
                                                                {formatCurrency(data.reduce((acc, curr) => acc + (curr.amount.kip || 0), 0))}
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono">
                                                                {formatCurrency(data.reduce((acc, curr) => acc + (curr.amount.thb || 0), 0))}
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono border-r-0">
                                                                {formatCurrency(data.reduce((acc, curr) => acc + (curr.amount.usd || 0), 0))}
                                                            </TableCell>
                                                        </TableRow>
                                                    </>
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">
                                                            ບໍ່ມີ{title}ໃນເດືອນນີ້
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                );

                                return (
                                    <TabsContent key={index} value={index.toString()}>
                                        <div id={`loan-report-table-${index}`} className="p-4 bg-white rounded-xl border-dashed border-2">
                                            <div className="mb-6 text-center space-y-1">
                                                <div className="flex items-center justify-center gap-2 mb-2">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <Handshake className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <h2 className="text-xl font-extrabold tracking-tight">ລູກສິດສິນເຊື່ອ: ລາຍງານການເຄື່ອນໄຫວ</h2>
                                                </div>
                                                <p className="text-sm text-muted-foreground">ປະຈຳເດືອນ {month} ສົກປີ {selectedYear + 543}</p>
                                                <div className="w-32 h-1 bg-primary mx-auto rounded-full opacity-20" />
                                            </div>
                                            
                                            <Tabs defaultValue="disbursement" className="w-full">
                                                <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted/40 p-1 rounded-lg">
                                                    <TabsTrigger value="disbursement" className="rounded-md data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
                                                        <CreditCard className="mr-2 h-4 w-4" />
                                                        ຈ່າຍເງິນກູ້ (Disbursement)
                                                    </TabsTrigger>
                                                    <TabsTrigger value="repayment" className="rounded-md data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
                                                        <TrendingUp className="mr-2 h-4 w-4" />
                                                        ຮັບຊຳລະຄືນ (Repayment)
                                                    </TabsTrigger>
                                                </TabsList>
                                                
                                                <TabsContent value="disbursement" className="mt-0 focus-visible:outline-none">
                                                    {renderTable(disbursementsOnly, "ລາຍການຈ່າຍເງິນກູ້", 'disbursement')}
                                                </TabsContent>
                                                
                                                <TabsContent value="repayment" className="mt-0 focus-visible:outline-none">
                                                    {renderTable(repaymentsOnly, "ລາຍການຮັບຊຳລະຄືນ", 'repayment')}
                                                </TabsContent>
                                            </Tabs>
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

