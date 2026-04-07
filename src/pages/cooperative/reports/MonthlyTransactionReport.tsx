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
import { ArrowLeft, Download, FileText, Printer } from "lucide-react";
import { format, startOfMonth, endOfMonth, isWithinInterval, getYear, getMonth } from "date-fns";
import { LAO_MONTHS } from '@/lib/date-utils';
import type { CooperativeDeposit, CurrencyValues } from '@/lib/types';
import { listenToCooperativeDeposits } from '@/services/cooperativeDepositService';
import { UserNav } from '@/components/UserNav';
import { cn } from "@/lib/utils";
// @ts-ignore
import html2pdf from 'html2pdf.js';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
};

export default function MonthlyTransactionReport() {
    const [deposits, setDeposits] = useState<CooperativeDeposit[]>([]);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [activeTab, setActiveTab] = useState<string>(new Date().getMonth().toString());

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
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                        <Link to="/tee/cooperative/members">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <h1 className="text-xl font-bold tracking-tight">ລາຍງານການຝາກ-ຖອນປະຈຳເດືອນ</h1>
                </div>
                <div className="flex items-center gap-2">
                    <select 
                        className="bg-background border rounded px-2 py-1 text-sm"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    >
                        {[2024, 2025, 2026, 2027].map(y => (
                            <option key={y} value={y}>{y + 543}</option>
                        ))}
                    </select>
                    <UserNav />
                </div>
            </header>

            <main className="flex-1 p-4 sm:px-6 sm:py-0">
                <Card className="mt-4">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>ລາຍລະອຽດການເຄື່ອນໄຫວ</CardTitle>
                                <CardDescription>ເລືອກເດືອນເພື່ອເບິ່ງລາຍການຝາກ ແລະ ຖອນ</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => exportToPDF(activeTab)}>
                                <Download className="mr-2 h-4 w-4" />
                                Export PDF (ເດືອນນີ້)
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid grid-cols-4 lg:grid-cols-12 h-auto mb-4">
                                {LAO_MONTHS.map((month, index) => (
                                    <TabsTrigger key={index} value={index.toString()} className="text-xs py-2">
                                        {month}
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            {LAO_MONTHS.map((month, index) => (
                                <TabsContent key={index} value={index.toString()}>
                                    <div id={`report-table-${index}`} className="p-4 bg-white rounded-md border">
                                        <div className="mb-4 text-center hidden show-on-pdf">
                                            <h2 className="text-xl font-bold">ລາຍງານການຝາກ-ຖອນເງິນປະຈຳເດືອນ</h2>
                                            <p className="text-lg">ເດືອນ {month} ປີ {selectedYear + 543}</p>
                                        </div>
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
                                                {monthlyData[index.toString()]?.length > 0 ? (
                                                    monthlyData[index.toString()].map((d) => (
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
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                                            ບໍ່ມີຂໍ້ມູນການເຄື່ອນໄຫວໃນເດືອນນີ້
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </TabsContent>
                            ))}
                        </Tabs>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
