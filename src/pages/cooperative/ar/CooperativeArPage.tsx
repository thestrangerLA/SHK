/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";
import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PlusCircle, Search, X, Download, MoreHorizontal, Trash2, Calendar, User, FileText, CheckCircle2, Clock, AlertCircle, Coins } from "lucide-react";
import { format } from 'date-fns';
import type { TradeReceivable, CurrencyValues, TradeReceivablePayment } from '@/lib/types';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addTradeReceivable, listenToTradeReceivables, deleteTradeReceivable, updateTradeReceivable, listenToAllArPayments } from '@/services/cooperativeArService';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { UserNav } from '@/components/UserNav';
import { Badge } from '@/components/ui/badge';
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

export default function CooperativeArPage() {
    const navigate = useNavigate();
    const [receivables, setReceivables] = useState<TradeReceivable[]>([]);
    const [arPayments, setArPayments] = useState<TradeReceivablePayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCurrency, setSelectedCurrency] = useState<keyof Omit<CurrencyValues, 'cny'>>('kip');
    const [itemToDelete, setItemToDelete] = useState<TradeReceivable | null>(null);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const { toast } = useToast();

    // Form state
    const [customerName, setCustomerName] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [amount, setAmount] = useState({ kip: 0, thb: 0, usd: 0, cny: 0 });
    const [cost, setCost] = useState({ kip: 0, thb: 0, usd: 0, cny: 0 });
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [dueDate, setDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [status, setStatus] = useState<TradeReceivable['status']>('pending');

    useEffect(() => {
        const unsubscribe = listenToTradeReceivables((data) => {
            setReceivables(data);
            setLoading(false);
        });
        const unsubscribePayments = listenToAllArPayments((data) => {
            setArPayments(data);
        });
        return () => {
            unsubscribe();
            unsubscribePayments();
        };
    }, []);

    const handleAddReceivable = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addTradeReceivable({
                customerName,
                invoiceNumber,
                amount,
                cost,
                date: new Date(date),
                dueDate: new Date(dueDate),
                status,
            });
            toast({
                title: "ເພີ່ມລູກໜີ້ສຳເລັດ",
                description: `ລູກໜີ້ "${customerName}" ໄດ້ຖືກບັນທຶກແລ້ວ.`,
            });
            setIsAddDialogOpen(false);
            resetForm();
        } catch (error) {
            toast({
                title: "ເກີດຂໍ້ຜິດພາດ",
                description: "ບໍ່ສາມາດເພີ່ມຂໍ້ມູນໄດ້.",
                variant: "destructive",
            });
        }
    };

    const resetForm = () => {
        setCustomerName('');
        setInvoiceNumber('');
        setAmount({ kip: 0, thb: 0, usd: 0, cny: 0 });
        setCost({ kip: 0, thb: 0, usd: 0, cny: 0 });
        setDate(format(new Date(), 'yyyy-MM-dd'));
        setDueDate(format(new Date(), 'yyyy-MM-dd'));
        setStatus('pending');
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        try {
            await deleteTradeReceivable(itemToDelete.id);
            toast({
                title: "ລົບຂໍ້ມູນສຳເລັດ",
            });
        } catch (error) {
            toast({
                title: "ເກີດຂໍ້ຜິດພາດ",
                variant: "destructive",
            });
        } finally {
            setItemToDelete(null);
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: TradeReceivable['status']) => {
        try {
            await updateTradeReceivable(id, { status: newStatus });
            toast({
                title: "ອັບເດດສະຖານະສຳເລັດ",
            });
        } catch (error) {
            toast({
                title: "ເກີດຂໍ້ຜິດພາດ",
                variant: "destructive",
            });
        }
    };

    const filteredReceivables = useMemo(() => {
        return receivables.filter(item => 
            item.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [receivables, searchQuery]);

    const totalValue = useMemo(() => {
        const outstanding = { kip: 0, thb: 0, usd: 0 };
        const paid = { kip: 0, thb: 0, usd: 0 };

        filteredReceivables.forEach(item => {
            outstanding.kip += (item.amount.kip || 0);
            outstanding.thb += (item.amount.thb || 0);
            outstanding.usd += (item.amount.usd || 0);
        });

        arPayments.forEach(payment => {
            paid.kip += (payment.amountPaid?.kip || 0);
            paid.thb += (payment.amountPaid?.thb || 0);
            paid.usd += (payment.amountPaid?.usd || 0);
        });

        // Outstanding is total amount minus total paid
        const actualOutstanding = {
            kip: outstanding.kip - paid.kip,
            thb: outstanding.thb - paid.thb,
            usd: outstanding.usd - paid.usd
        };

        return { outstanding: actualOutstanding, paid };
    }, [filteredReceivables, arPayments]);

    const profitData = useMemo(() => {
        const result = { 
            realized: { kip: 0, thb: 0, usd: 0 }, 
            pending: { kip: 0, thb: 0, usd: 0 } 
        };

        filteredReceivables.forEach(item => {
            // Get total paid for this specific item
            const itemPayments = arPayments.filter(p => p.arId === item.id);
            const itemPaid = { kip: 0, thb: 0, usd: 0 };
            itemPayments.forEach(p => {
                itemPaid.kip += (p.amountPaid?.kip || 0);
                itemPaid.thb += (p.amountPaid?.thb || 0);
                itemPaid.usd += (p.amountPaid?.usd || 0);
            });

            const currencies: (keyof Omit<CurrencyValues, 'cny'>)[] = ['kip', 'thb', 'usd'];
            
            currencies.forEach(c => {
                const cost = item.cost?.[c] || 0;
                const totalAmount = item.amount[c] || 0;
                const potentialProfit = Math.max(0, totalAmount - cost);
                
                // Realized profit: amount received beyond the cost
                const realized = Math.max(0, itemPaid[c] - cost);
                // Realized profit cannot exceed potential profit
                const actualRealized = Math.min(realized, potentialProfit);
                
                // Pending profit: remaining potential profit to be realized
                const pending = potentialProfit - actualRealized;

                result.realized[c] += actualRealized;
                result.pending[c] += pending;
            });
        });

        return result;
    }, [filteredReceivables, arPayments]);

    const getStatusBadge = (status: TradeReceivable['status']) => {
        switch (status) {
            case 'paid':
                return <Badge variant="default" className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" /> ຊຳລະແລ້ວ</Badge>;
            case 'pending':
                return <Badge variant="outline" className="text-blue-500 border-blue-500"><Clock className="h-3 w-3 mr-1" /> ຄ້າງຊຳລະ</Badge>;
            case 'overdue':
                return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" /> ກາຍກຳນົດ</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
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
                            <User className="h-6 w-6 text-primary" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight">ລູກໜີ້ການຄ້າ (Trade Receivables)</h1>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="h-9 bg-primary hover:bg-primary/90 shadow-sm">
                                <PlusCircle className="h-4 w-4 mr-2" />
                                ເພີ່ມລູກໜີ້ໃໝ່
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                            <form onSubmit={handleAddReceivable}>
                                <DialogHeader>
                                    <DialogTitle>ເພີ່ມລູກໜີ້ການຄ້າໃໝ່</DialogTitle>
                                    <DialogDescription>ກະລຸນາປ້ອນລາຍລະອຽດຂອງລູກໜີ້ ແລະ ໃບບິນ</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="customer">ຊື່ລູກຄ້າ</Label>
                                        <Input id="customer" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="invoice">ເລກທີໃບບິນ</Label>
                                        <Input id="invoice" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} required />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="kip">ລາຄາຂາຍ (KIP)</Label>
                                            <Input id="kip" type="number" value={amount.kip} onChange={(e) => setAmount({ ...amount, kip: Number(e.target.value) })} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="cost_kip">ລາຄາຊື້/ຕົ້ນທຶນ (KIP)</Label>
                                            <Input id="cost_kip" type="number" value={cost.kip} onChange={(e) => setCost({ ...cost, kip: Number(e.target.value) })} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="thb">ລາຄາຂາຍ (THB)</Label>
                                            <Input id="thb" type="number" value={amount.thb} onChange={(e) => setAmount({ ...amount, thb: Number(e.target.value) })} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="cost_thb">ລາຄາຊື້/ຕົ້ນທຶນ (THB)</Label>
                                            <Input id="cost_thb" type="number" value={cost.thb} onChange={(e) => setCost({ ...cost, thb: Number(e.target.value) })} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="date">ວັນທີອອກບິນ</Label>
                                            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="dueDate">ວັນທີຄົບກຳນົດ</Label>
                                            <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="status">ສະຖານະ</Label>
                                        <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="pending">ຄ້າງຊຳລະ</SelectItem>
                                                <SelectItem value="paid">ຊຳລະແລ້ວ</SelectItem>
                                                <SelectItem value="overdue">ກາຍກຳນົດ</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>ຍົກເລີກ</Button>
                                    <Button type="submit">ບັນທຶກ</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                    <UserNav />
                </div>
            </header>

            <main className="flex-1 p-4 sm:px-6 md:py-8 space-y-6">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Coins className="h-4 w-4" />
                        <span className="text-sm font-medium">ເລືອກສະກຸນເງິນສະແດງຜົນ:</span>
                        <Select value={selectedCurrency} onValueChange={(v: any) => setSelectedCurrency(v)}>
                            <SelectTrigger className="w-[100px] h-8 bg-background/50 border-none shadow-none font-bold text-primary">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="kip">KIP</SelectItem>
                                <SelectItem value="thb">THB</SelectItem>
                                <SelectItem value="usd">USD</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="card-hover border-none shadow-sm bg-card/50 backdrop-blur-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">ລວມລູກໜີ້ຄ້າງຊຳລະ ({selectedCurrency.toUpperCase()})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalValue.outstanding[selectedCurrency])} {selectedCurrency.toUpperCase()}</div>
                        </CardContent>
                    </Card>
                    <Card className="card-hover border-none shadow-sm bg-green-50/50 border-green-100">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-green-700 uppercase">ລວມທີ່ຊຳລະແລ້ວ ({selectedCurrency.toUpperCase()})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalValue.paid[selectedCurrency])} {selectedCurrency.toUpperCase()}</div>
                            <p className="text-xs text-muted-foreground mt-1">ຍອດລວມການຮັບຊຳລະທັງໝົດ</p>
                        </CardContent>
                    </Card>
                    <Card className="card-hover border-none shadow-sm bg-green-50/50 border-green-100">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-green-700 uppercase">ກຳໄລທີ່ໄດ້ຮັບແລ້ວ ({selectedCurrency.toUpperCase()})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{formatCurrency(profitData.realized[selectedCurrency])} {selectedCurrency.toUpperCase()}</div>
                            <p className="text-xs text-muted-foreground mt-1">ຄຳນວນຈາກລາຍການທີ່ຊຳລະແລ້ວ</p>
                        </CardContent>
                    </Card>
                    <Card className="card-hover border-none shadow-sm bg-amber-50/50 border-amber-100">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-amber-700 uppercase">ກຳໄລທີ່ຄາດວ່າຈະໄດ້ ({selectedCurrency.toUpperCase()})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-amber-600">{formatCurrency(profitData.pending[selectedCurrency])} {selectedCurrency.toUpperCase()}</div>
                            <p className="text-xs text-muted-foreground mt-1">ຄຳນວນຈາກລາຍການທີ່ຍັງຄ້າງຊຳລະ</p>
                        </CardContent>
                    </Card>
                </div>

                <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
                    <CardHeader className="pb-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <CardTitle className="text-xl">ລາຍການລູກໜີ້ການຄ້າ</CardTitle>
                                <CardDescription>ຕິດຕາມ ແລະ ຈັດການລາຍການລູກໜີ້ທີ່ຄ້າງຊຳລະ</CardDescription>
                            </div>
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="ຄົ້ນຫາຊື່ລູກຄ້າ/ເລກບິນ..."
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
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-xl border bg-background/30 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead>ວັນທີ</TableHead>
                                        <TableHead>ລູກຄ້າ</TableHead>
                                        <TableHead>ເລກທີໃບບິນ</TableHead>
                                        <TableHead className="text-right">ລາຄາຂາຍ</TableHead>
                                        <TableHead className="text-right">ຕົ້ນທຶນ</TableHead>
                                        <TableHead className="text-right">ກຳໄລທີ່ໄດ້ຮັບ</TableHead>
                                        <TableHead>ວັນທີຄົບກຳນົດ</TableHead>
                                        <TableHead>ສະຖານະ</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">ກຳລັງໂຫລດຂໍ້ມູນ...</TableCell>
                                        </TableRow>
                                    ) : filteredReceivables.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">ບໍ່ພົບຂໍ້ມູນລູກໜີ້</TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredReceivables.map((item) => {
                                            // Calculate realized profit for this item
                                            const itemPayments = arPayments.filter(p => p.arId === item.id);
                                            const itemPaid = { kip: 0, thb: 0, usd: 0 };
                                            itemPayments.forEach(p => {
                                                itemPaid.kip += (p.amountPaid?.kip || 0);
                                                itemPaid.thb += (p.amountPaid?.thb || 0);
                                                itemPaid.usd += (p.amountPaid?.usd || 0);
                                            });

                                            const realizedProfitKip = Math.min(
                                                Math.max(0, itemPaid.kip - (item.cost?.kip || 0)),
                                                Math.max(0, (item.amount.kip || 0) - (item.cost?.kip || 0))
                                            );
                                            const realizedProfitThb = Math.min(
                                                Math.max(0, itemPaid.thb - (item.cost?.thb || 0)),
                                                Math.max(0, (item.amount.thb || 0) - (item.cost?.thb || 0))
                                            );
                                            
                                            return (
                                                <TableRow 
                                                    key={item.id} 
                                                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                                                    onClick={() => navigate(`/tee/cooperative/ar/${item.id}`)}
                                                >
                                                    <TableCell className="font-medium">{format(item.date, 'dd/MM/yyyy')}</TableCell>
                                                    <TableCell>{item.customerName}</TableCell>
                                                    <TableCell className="font-mono text-xs">{item.invoiceNumber}</TableCell>
                                                    <TableCell className="text-right font-mono">
                                                        {item.amount.kip > 0 && <div>{formatCurrency(item.amount.kip)} KIP</div>}
                                                        {item.amount.thb > 0 && <div>{formatCurrency(item.amount.thb)} THB</div>}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-muted-foreground">
                                                        {item.cost?.kip > 0 && <div>{formatCurrency(item.cost.kip)} KIP</div>}
                                                        {item.cost?.thb > 0 && <div>{formatCurrency(item.cost.thb)} THB</div>}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono font-bold text-green-600">
                                                        {realizedProfitKip > 0 && <div>{formatCurrency(realizedProfitKip)} KIP</div>}
                                                        {realizedProfitThb > 0 && <div>{formatCurrency(realizedProfitThb)} THB</div>}
                                                        {realizedProfitKip <= 0 && realizedProfitThb <= 0 && <div className="text-muted-foreground font-normal italic text-xs">ຍັງບໍ່ມີກຳໄລ</div>}
                                                    </TableCell>
                                                    <TableCell>{format(item.dueDate, 'dd/MM/yyyy')}</TableCell>
                                                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                                                    <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-48">
                                                            <DropdownMenuGroup>
                                                                <DropdownMenuLabel>ການຈັດການ</DropdownMenuLabel>
                                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/tee/cooperative/ar/${item.id}`); }}>
                                                                    <FileText className="h-4 w-4 mr-2" />
                                                                    ເບິ່ງລາຍລະອຽດ
                                                                </DropdownMenuItem>
                                                            </DropdownMenuGroup>
                                                            <DropdownMenuGroup>
                                                                <DropdownMenuLabel className="border-t mt-2 pt-2">ຈັດການສະຖານະ</DropdownMenuLabel>
                                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleUpdateStatus(item.id, 'paid'); }}>
                                                                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                                                                    ຊຳລະແລ້ວ
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleUpdateStatus(item.id, 'pending'); }}>
                                                                    <Clock className="h-4 w-4 mr-2 text-blue-500" />
                                                                    ຄ້າງຊຳລະ
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleUpdateStatus(item.id, 'overdue'); }}>
                                                                    <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
                                                                    ກາຍກຳນົດ
                                                                </DropdownMenuItem>
                                                            </DropdownMenuGroup>
                                                            <DropdownMenuGroup>
                                                                <DropdownMenuLabel className="border-t mt-2 pt-2">ອື່ນໆ</DropdownMenuLabel>
                                                                <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); setItemToDelete(item); }}>
                                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                                    ລົບລາຍການ
                                                                </DropdownMenuItem>
                                                            </DropdownMenuGroup>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                                );
                                            })
                                        )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </main>

            <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລົບ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            ການລົບຂໍ້ມູນລູກໜີ້ "{itemToDelete?.customerName}" ຈະບໍ່ສາມາດກູ້ຄືນໄດ້.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel variant="outline" size="default">ຍົກເລີກ</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>ຢືນຢັນການລົບ</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
