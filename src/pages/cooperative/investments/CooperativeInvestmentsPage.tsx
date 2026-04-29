/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";
import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PlusCircle, TrendingUp, Search, X, Download, MoreHorizontal, Trash2, BookOpen } from "lucide-react";
import { format } from 'date-fns';
import type { CooperativeInvestment, CurrencyValues } from '@/lib/types';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { addInvestment, listenToCooperativeInvestments, deleteInvestment } from '@/services/cooperativeInvestmentService';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { UserNav } from '@/components/UserNav';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const formatCurrency = (value: number) => {
    if (isNaN(value)) return '0';
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
};

export default function CooperativeInvestmentsPage() {
    const [investments, setInvestments] = useState<CooperativeInvestment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [investmentToDelete, setInvestmentToDelete] = useState<CooperativeInvestment | null>(null);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const { toast } = useToast();

    // Form state
    const [newTitle, setNewTitle] = useState('');
    const [newAmount, setNewAmount] = useState({ kip: 0, thb: 0, usd: 0, cny: 0 });
    const [newDate, setNewDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    useEffect(() => {
        const unsubscribe = listenToCooperativeInvestments((data) => {
            setInvestments(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleAddInvestment = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addInvestment({
                title: newTitle,
                amount: newAmount,
                date: new Date(newDate),
            });
            toast({
                title: "ເພີ່ມການລົງທຶນສຳເລັດ",
                description: `ການລົງທຶນ "${newTitle}" ໄດ້ຖືກບັນທຶກແລ້ວ.`,
            });
            setIsAddDialogOpen(false);
            setNewTitle('');
            setNewAmount({ kip: 0, thb: 0, usd: 0, cny: 0 });
            setNewDate(format(new Date(), 'yyyy-MM-dd'));
        } catch (error) {
            toast({
                title: "ເກີດຂໍ້ຜິດພາດ",
                description: "ບໍ່ສາມາດເພີ່ມການລົງທຶນໄດ້.",
                variant: "destructive",
            });
        }
    };

    const filteredInvestments = useMemo(() => {
        return investments.filter(inv => 
            inv.title.toLowerCase().includes(searchQuery.toLowerCase())
        ).sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [investments, searchQuery]);

    const totals = useMemo(() => {
        return filteredInvestments.reduce((acc, inv) => {
            acc.kip += inv.amount.kip || 0;
            acc.thb += inv.amount.thb || 0;
            acc.usd += inv.amount.usd || 0;
            return acc;
        }, { kip: 0, thb: 0, usd: 0 });
    }, [filteredInvestments]);

    const handleDelete = async () => {
        if (!investmentToDelete) return;
        try {
            await deleteInvestment(investmentToDelete.id);
            toast({
                title: "ລົບການລົງທຶນສຳເລັດ",
                description: `ການລົງທຶນ "${investmentToDelete.title}" ໄດ້ຖືກລົບອອກແລ້ວ.`,
            });
        } catch (error) {
            toast({
                title: "ເກີດຂໍ້ຜິດພາດ",
                description: "ບໍ່ສາມາດລົບການລົງທຶນໄດ້.",
                variant: "destructive",
            });
        } finally {
            setInvestmentToDelete(null);
        }
    };

    return (
        <div className="flex min-h-screen w-full flex-col bg-gradient-to-br from-background via-background to-primary/5">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 backdrop-blur-md px-4 sm:px-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" asChild>
                        <Link to="/tee/cooperative">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-xl">
                            <TrendingUp className="h-6 w-6 text-primary" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight">ການລົງທຶນຂອງສະຫະກອນ</h1>
                    </div>
                    <Button variant="outline" size="sm" className="h-9 ml-2" asChild>
                        <Link to="/tee/cooperative/accounting">
                            <BookOpen className="mr-2 h-4 w-4" />
                            ໄປທີ່ໜ້າການບັນຊີ
                        </Link>
                    </Button>
                </div>
                <div className="flex items-center gap-3">
                    <UserNav />
                </div>
            </header>

            <main className="flex-1 p-4 sm:px-6 md:py-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="card-hover border-none shadow-sm bg-card/50 backdrop-blur-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">ລວມການລົງທຶນ (KIP)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(totals.kip)} KIP</div>
                        </CardContent>
                    </Card>
                    <Card className="card-hover border-none shadow-sm bg-card/50 backdrop-blur-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">ລວມການລົງທຶນ (THB)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(totals.thb)} THB</div>
                        </CardContent>
                    </Card>
                    <Card className="card-hover border-none shadow-sm bg-card/50 backdrop-blur-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">ລວມການລົງທຶນ (USD)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(totals.usd)} USD</div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
                    <CardHeader className="pb-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <CardTitle className="text-xl">ລາຍການລົງທຶນ</CardTitle>
                                <CardDescription>ຕິດຕາມການລົງທຶນທັງໝົດຂອງສະຫະກອນ</CardDescription>
                            </div>
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <div className="relative w-full md:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="ຄົ້ນຫາການລົງທຶນ..."
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
                                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm" className="h-10">
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            ເພີ່ມການລົງທຶນ
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[425px]">
                                        <form onSubmit={handleAddInvestment}>
                                            <DialogHeader>
                                                <DialogTitle>ເພີ່ມການລົງທຶນໃໝ່</DialogTitle>
                                                <DialogDescription>
                                                    ກະລຸນາປ້ອນຂໍ້ມູນການລົງທຶນທີ່ຕ້ອງການບັນທຶກ.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="grid gap-4 py-4">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="title">ຫົວຂໍ້ການລົງທຶນ</Label>
                                                    <Input
                                                        id="title"
                                                        value={newTitle}
                                                        onChange={(e) => setNewTitle(e.target.value)}
                                                        placeholder="ຕົວຢ່າງ: ຊື້ຫຸ້ນໃນບໍລິສັດ..."
                                                        required
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="kip">ຈຳນວນເງິນ (KIP)</Label>
                                                        <Input
                                                            id="kip"
                                                            type="number"
                                                            value={newAmount.kip}
                                                            onChange={(e) => setNewAmount({ ...newAmount, kip: parseFloat(e.target.value) || 0 })}
                                                        />
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="thb">ຈຳນວນເງິນ (THB)</Label>
                                                        <Input
                                                            id="thb"
                                                            type="number"
                                                            value={newAmount.thb}
                                                            onChange={(e) => setNewAmount({ ...newAmount, thb: parseFloat(e.target.value) || 0 })}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="usd">ຈຳນວນເງິນ (USD)</Label>
                                                        <Input
                                                            id="usd"
                                                            type="number"
                                                            value={newAmount.usd}
                                                            onChange={(e) => setNewAmount({ ...newAmount, usd: parseFloat(e.target.value) || 0 })}
                                                        />
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="date">ວັນທີລົງທຶນ</Label>
                                                        <Input
                                                            id="date"
                                                            type="date"
                                                            value={newDate}
                                                            onChange={(e) => setNewDate(e.target.value)}
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button type="submit">ບັນທຶກການລົງທຶນ</Button>
                                            </DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-xl border bg-background/50 overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead>ລາຍການ</TableHead>
                                        <TableHead className="text-right">ຈຳນວນເງິນ</TableHead>
                                        <TableHead>ວັນທີ</TableHead>
                                        <TableHead className="w-[100px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">ກຳລັງໂຫລດ...</TableCell>
                                        </TableRow>
                                    ) : filteredInvestments.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">ບໍ່ມີຂໍ້ມູນການລົງທຶນ</TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredInvestments.map((inv) => (
                                            <TableRow key={inv.id} className="hover:bg-muted/30 transition-colors">
                                                <TableCell className="font-medium">{inv.title}</TableCell>
                                                <TableCell className="text-right">
                                                    {inv.amount.kip > 0 && <div>{formatCurrency(inv.amount.kip)} KIP</div>}
                                                    {inv.amount.thb > 0 && <div>{formatCurrency(inv.amount.thb)} THB</div>}
                                                    {inv.amount.usd > 0 && <div>{formatCurrency(inv.amount.usd)} USD</div>}
                                                </TableCell>
                                                <TableCell>{format(inv.date, 'dd/MM/yyyy')}</TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuGroup>
                                                                <DropdownMenuLabel>ການຈັດການ</DropdownMenuLabel>
                                                                <DropdownMenuItem 
                                                                    className="text-destructive focus:text-destructive"
                                                                    onClick={() => setInvestmentToDelete(inv)}
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                    ລົບລາຍການ
                                                                </DropdownMenuItem>
                                                            </DropdownMenuGroup>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </main>

            <AlertDialog open={!!investmentToDelete} onOpenChange={(open) => !open && setInvestmentToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>ຢືນຢັນການລົບ</AlertDialogTitle>
                        <AlertDialogDescription>
                            ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລົບການລົງທຶນ "{investmentToDelete?.title}"? ການກະທຳນີ້ບໍ່ສາມາດຍ້ອນກັບໄດ້.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel variant="outline" size="default">ຍົກເລີກ</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            ຢືນຢັນການລົບ
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
