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
import { ArrowLeft, Download, FileText, Printer, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfMonth, endOfMonth, isWithinInterval, getYear, getMonth } from "date-fns";
import { LAO_MONTHS } from '@/lib/date-utils';
import type { CooperativeDeposit, CurrencyValues } from '@/lib/types';
import { listenToCooperativeDeposits } from '@/services/cooperativeDepositService';
import { UserNav } from '@/components/UserNav';
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
// @ts-ignore
import html2pdf from 'html2pdf.js';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
};

export default function MonthlyTransactionReport() {
    const [deposits, setDeposits] = useState<CooperativeDeposit[]>([]);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [activeTab, setActiveTab] = useState<string>(new Date().getMonth().toString());
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const unsubscribe = listenToCooperativeDeposits(setDeposits);
        return () => unsubscribe();
    }, []);

    const monthlyData = useMemo(() => {
        const data: { [key: string]: CooperativeDeposit[] } = {};
        for (let i = 0; i < 12; i++) {
            const start = new Date(selectedYear, i, 1);
            const end = endOfMonth(start);
            data[i.toString()] = deposits.filter(d => 
                isWithinInterval(d.date, { start, end })
            ).sort((a, b) => a.date.getTime() - b.date.getTime());
        }
        return data;
    }, [deposits, selectedYear]);

    const chartData = useMemo(() => {
        return LAO_MONTHS.map((month, index) => {
            const data = monthlyData[index.toString()] || [];
            const depositsOnly = data.filter(d => d.kip > 0 || d.thb > 0 || d.usd > 0 || (d.cny || 0) > 0);
            const withdrawalsOnly = data.filter(d => d.kip < 0 || d.thb < 0 || d.usd < 0 || (d.cny || 0) < 0);
            
            return {
                name: month,
                deposits: depositsOnly.reduce((sum, d) => sum + (d.kip || 0), 0),
                withdrawals: Math.abs(withdrawalsOnly.reduce((sum, d) => sum + (d.kip || 0), 0))
            };
        });
    }, [monthlyData]);

    const exportToPDF = (monthIndex: string) => {
        const element = document.getElementById(`report-table-${monthIndex}`);
        if (!element) return;

        const monthName = LAO_MONTHS[parseInt(monthIndex)];
        const yearLao = selectedYear + 543;
        const fileName = `ລາຍງານ_${monthName}_${yearLao}.pdf`;

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
                            <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight">ລາຍງານການຝາກ-ຖອນປະຈຳເດືອນ</h1>
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
                <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
                    <CardHeader className="pb-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <CardTitle className="text-xl">ລາຍລະອຽດການເຄື່ອນໄຫວ</CardTitle>
                                <CardDescription>ເລືອກເດືອນເພື່ອເບິ່ງລາຍການຝາກ ແລະ ຖອນ</CardDescription>
                            </div>
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <div className="relative w-full md:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="ຄົ້ນຫາຊື່ສະມາຊິກ..."
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
                                        <CardTitle className="text-lg text-center">ສະຫຼຸບການຝາກ-ຖອນເງິນລາຍປີ {selectedYear + 543}</CardTitle>
                                        <CardDescription className="text-center">ປຽບທຽບຍອດເງິນຝາກ ແລະ ຖອນ (KIP) ໃນແຕ່ລະເດືອນ</CardDescription>
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
                                                <Bar dataKey="deposits" name="ຍອດຝາກ" fill="#16a34a" radius={[4, 4, 0, 0]} barSize={20} />
                                                <Bar dataKey="withdrawals" name="ຍອດຖອນ" fill="#dc2626" radius={[4, 4, 0, 0]} barSize={20} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                                {LAO_MONTHS.map((month, index) => {
                                    const currentMonthData = monthlyData[index.toString()] || [];
                                    const filteredMonthData = currentMonthData.filter(d => 
                                        !searchQuery || d.memberName.toLowerCase().includes(searchQuery.toLowerCase())
                                    );
                                    const depositsOnly = filteredMonthData.filter(d => d.kip > 0 || d.thb > 0 || d.usd > 0 || (d.cny || 0) > 0);
                                    const withdrawalsOnly = filteredMonthData.filter(d => d.kip < 0 || d.thb < 0 || d.usd < 0 || (d.cny || 0) < 0);

                                const renderTable = (data: CooperativeDeposit[], title: string, type: 'deposit' | 'withdrawal') => (
                                    <div className="mb-8">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>ວັນທີ</TableHead>
                                                    <TableHead>ຊື່ສະມາຊິກ</TableHead>
                                                    <TableHead className="text-right">KIP</TableHead>
                                                    <TableHead className="text-right">THB</TableHead>
                                                    <TableHead className="text-right">USD</TableHead>
                                                    <TableHead className="text-right">CNY</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {data.length > 0 ? (
                                                    <>
                                                        {data.map((d) => (
                                                            <TableRow key={d.id}>
                                                                <TableCell>{format(d.date, 'dd/MM/yyyy')}</TableCell>
                                                                <TableCell className="font-medium">{d.memberName}</TableCell>
                                                                <TableCell className={cn("text-right font-mono", d.kip < 0 ? "text-red-600" : "text-green-600")}>
                                                                    {d.kip !== 0 ? (d.kip > 0 ? '+' : '') + formatCurrency(d.kip) : '0'}
                                                                </TableCell>
                                                                <TableCell className={cn("text-right font-mono", d.thb < 0 ? "text-red-600" : "text-green-600")}>
                                                                    {d.thb !== 0 ? (d.thb > 0 ? '+' : '') + formatCurrency(d.thb) : '0'}
                                                                </TableCell>
                                                                <TableCell className={cn("text-right font-mono", d.usd < 0 ? "text-red-600" : "text-green-600")}>
                                                                    {d.usd !== 0 ? (d.usd > 0 ? '+' : '') + formatCurrency(d.usd) : '0'}
                                                                </TableCell>
                                                                <TableCell className={cn("text-right font-mono", d.cny < 0 ? "text-red-600" : "text-green-600")}>
                                                                    {d.cny !== 0 ? (d.cny > 0 ? '+' : '') + formatCurrency(d.cny) : '0'}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                        <TableRow className="bg-muted/50 font-bold">
                                                            <TableCell colSpan={2} className="text-center">ລວມ{title}</TableCell>
                                                            <TableCell className={cn("text-right font-mono", data.reduce((acc, curr) => acc + curr.kip, 0) < 0 ? "text-red-600" : "text-green-600")}>
                                                                {formatCurrency(data.reduce((acc, curr) => acc + curr.kip, 0))}
                                                            </TableCell>
                                                            <TableCell className={cn("text-right font-mono", data.reduce((acc, curr) => acc + curr.thb, 0) < 0 ? "text-red-600" : "text-green-600")}>
                                                                {formatCurrency(data.reduce((acc, curr) => acc + curr.thb, 0))}
                                                            </TableCell>
                                                            <TableCell className={cn("text-right font-mono", data.reduce((acc, curr) => acc + curr.usd, 0) < 0 ? "text-red-600" : "text-green-600")}>
                                                                {formatCurrency(data.reduce((acc, curr) => acc + curr.usd, 0))}
                                                            </TableCell>
                                                            <TableCell className={cn("text-right font-mono", data.reduce((acc, curr) => acc + curr.cny, 0) < 0 ? "text-red-600" : "text-green-600")}>
                                                                {formatCurrency(data.reduce((acc, curr) => acc + curr.cny, 0))}
                                                            </TableCell>
                                                        </TableRow>
                                                    </>
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={6} className="h-12 text-center text-muted-foreground italic">
                                                            ບໍ່ມີລາຍການ{title}
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                );

                                return (
                                    <TabsContent key={index} value={index.toString()}>
                                        <div id={`report-table-${index}`} className="p-4 bg-white rounded-md border">
                                            <div className="mb-4 text-center hidden show-on-pdf">
                                                <h2 className="text-xl font-bold">ລາຍງານການຝາກ-ຖອນເງິນປະຈຳເດືອນ</h2>
                                                <p className="text-lg">ເດືອນ {month} ປີ {selectedYear + 543}</p>
                                            </div>
                                            
                                            <Tabs defaultValue="deposit" className="w-full">
                                                <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/30">
                                                    <TabsTrigger value="deposit" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
                                                        ລາຍການຝາກ
                                                    </TabsTrigger>
                                                    <TabsTrigger value="withdrawal" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
                                                        ລາຍການຖອນ
                                                    </TabsTrigger>
                                                </TabsList>
                                                
                                                <TabsContent value="deposit" className="mt-0">
                                                    {renderTable(depositsOnly, "ລາຍການຝາກ", 'deposit')}
                                                </TabsContent>
                                                
                                                <TabsContent value="withdrawal" className="mt-0">
                                                    {renderTable(withdrawalsOnly, "ລາຍການຖອນ", 'withdrawal')}
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
