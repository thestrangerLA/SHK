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
import { ArrowLeft, Users, Calendar as CalendarIcon, Printer, Trash2, PlusCircle, Save } from "lucide-react";
import { listenToCooperativeTransactions } from '@/services/cooperativeAccountingService';
import { defaultAccounts } from '@/services/cooperativeChartOfAccounts';
import { listenToCooperativeDividendStructure, updateCooperativeDividendStructure } from '@/services/cooperativeDividendService';
import type { Transaction, CurrencyValues, DividendItem } from '@/lib/types';
import { getYear, startOfYear, endOfYear, isWithinInterval } from 'date-fns';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const currencies: (keyof CurrencyValues)[] = ['kip', 'thb', 'usd', 'cny'];
const initialCurrencyValues: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
};

export default function DividendPage() {
    const { toast } = useToast();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [dividendStructure, setDividendStructure] = useState<DividendItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const unsubscribeTxs = listenToCooperativeTransactions(setTransactions);
        const unsubscribeDividend = listenToCooperativeDividendStructure(setDividendStructure);
        return () => {
            unsubscribeTxs();
            unsubscribeDividend();
        };
    }, []);

    const availableYears = useMemo(() => {
        const years = new Set<number>(transactions.map(t => getYear(t.date)));
        const currentYear = new Date().getFullYear();
        years.add(currentYear);
        return Array.from(years).sort((a, b) => (b as number) - (a as number));
    }, [transactions]);

    const netProfit = useMemo(() => {
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
                 if (account.type === 'income') {
                    totalIncome[c] -= amount;
                } else if (account.type === 'expense') {
                    totalExpense[c] += amount;
                }
            });
        });
        
        return currencies.reduce((acc, c) => {
            acc[c] = totalIncome[c] - totalExpense[c];
            return acc;
        }, { ...initialCurrencyValues });
    }, [transactions, selectedYear]);

    const totalPercentage = useMemo(() => {
        return dividendStructure.reduce((sum, item) => sum + (item.percentage || 0), 0);
    }, [dividendStructure]);
    
    const handleDividendChange = (id: string, field: 'name' | 'percentage', value: string | number) => {
        setDividendStructure(prev => prev.map(item => {
            if (item.id === id) {
                if (field === 'percentage' && (typeof value === 'string' || typeof value === 'number')) {
                    return { ...item, percentage: Number(value) / 100 };
                }
                if (field === 'name' && typeof value === 'string') {
                    return { ...item, name: value };
                }
            }
            return item;
        }));
    };

    const addDividendRow = () => {
        setDividendStructure(prev => [...prev, { id: Date.now().toString(), name: '', percentage: 0 }]);
    };

    const removeDividendRow = (id: string) => {
        setDividendStructure(prev => prev.filter(item => item.id !== id));
    };

    const handleSaveStructure = async () => {
        setIsSaving(true);
        try {
            await updateCooperativeDividendStructure(dividendStructure);
            toast({ title: 'ບັນທຶກໂຄງສ້າງປັນຜົນສຳເລັດ' });
        } catch (error) {
            toast({ title: 'ເກີດຂໍ້ຜິດພາດໃນການບັນທຶກ', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
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
                    <h1 className="text-xl font-bold tracking-tight">ການປັນຜົນກຳໄລ</h1>
                </div>
            </header>
            <main className="flex-1 p-4 sm:px-6 md:py-8 space-y-6 max-w-7xl mx-auto w-full">
                 <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold">ໂຕກອງ</CardTitle>
                        <CardContent className="flex flex-col md:flex-row md:items-end gap-4 pt-4 px-0">
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
                        </CardContent>
                    </CardHeader>
                </Card>
                <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">ການປັນຜົນ</CardTitle>
                         <CardDescription className="text-lg">
                            ກຳໄລສຸດທິຂອງປີ {selectedYear + 543}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {Object.entries(netProfit).map(([currency, value]) => (
                                <div key={currency} className="p-6 border-none rounded-2xl bg-card shadow-sm glass-dark">
                                    <h4 className="text-sm font-bold text-muted-foreground uppercase mb-2">{currency}</h4>
                                    <p className={`text-3xl font-bold font-mono ${(value as number) < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                        {formatCurrency(value as number)}
                                    </p>
                                </div>
                            ))}
                        </div>
                      <div className="rounded-2xl border-none overflow-hidden bg-card/50 backdrop-blur-sm shadow-sm">
                        <Table>
                          <TableHeader>
                              <TableRow className="bg-muted/50">
                                  <TableHead className="w-1/3 font-bold">ຜູ້ຮັບຜົນປະໂຫຍດ</TableHead>
                                  <TableHead className="w-[120px] text-center font-bold">ເປີເຊັນ (%)</TableHead>
                                  {currencies.map(c => <TableHead key={c} className="text-right uppercase font-bold">{c}</TableHead>)}
                                  <TableHead className="w-[50px]"><span className="sr-only">Actions</span></TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {dividendStructure.map((item) => (
                                  <TableRow key={item.id} className="hover:bg-muted/30">
                                      <TableCell className="font-medium p-3">
                                          <Input value={item.name} onChange={(e) => handleDividendChange(item.id, 'name', e.target.value)} className="h-10 bg-background/50"/>
                                      </TableCell>
                                      <TableCell className="text-center p-3">
                                           <Input 
                                              type="number"
                                              value={item.percentage * 100} 
                                              onChange={(e) => handleDividendChange(item.id, 'percentage', e.target.value)}
                                              className="h-10 text-center bg-background/50"
                                          />
                                      </TableCell>
                                      {currencies.map(c => (
                                          <TableCell key={c} className="text-right font-mono p-3">
                                              {formatCurrency(netProfit[c] * item.percentage)}
                                          </TableCell>
                                      ))}
                                      <TableCell className="p-3">
                                          <Button variant="ghost" size="icon" className="h-10 w-10 text-red-500 hover:bg-red-50" onClick={() => removeDividendRow(item.id)}>
                                              <Trash2 className="h-5 w-5" />
                                          </Button>
                                      </TableCell>
                                  </TableRow>
                              ))}
                          </TableBody>
                          <TableFooter>
                              <TableRow className="bg-primary/5 font-bold">
                                  <TableCell className="text-lg">ລວມທັງໝົດ</TableCell>
                                  <TableCell className="text-center text-lg">{formatCurrency(totalPercentage * 100)}%</TableCell>
                                  {currencies.map(c => (
                                      <TableCell key={c} className="text-right font-mono text-lg">
                                          {formatCurrency(netProfit[c] * totalPercentage)}
                                      </TableCell>
                                  ))}
                                  <TableCell></TableCell>
                              </TableRow>
                          </TableFooter>
                        </Table>
                      </div>
                      <div className="flex flex-col sm:flex-row justify-between gap-4">
                          <Button onClick={addDividendRow} variant="outline" className="h-12 px-6 bg-background/50">
                              <PlusCircle className="mr-2 h-5 w-5" />
                              ເພີ່ມລາຍການ
                          </Button>
                          <div className="flex gap-3">
                            <Button onClick={handleSaveStructure} disabled={isSaving} className="h-12 px-6">
                                <Save className="mr-2 h-5 w-5"/>
                                {isSaving ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກໂຄງສ້າງ'}
                            </Button>
                            <Button onClick={() => window.print()} variant="secondary" className="h-12 px-6">
                                <Printer className="mr-2 h-5 w-5" />
                                ພິມ
                            </Button>
                          </div>
                      </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
