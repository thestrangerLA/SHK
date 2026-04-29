/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";
import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Trash2, Calendar as CalendarIcon, PlusCircle, Edit, Save, CheckCircle2, Clock, AlertCircle, Trash } from "lucide-react";
import { format } from "date-fns";
import type { TradeReceivable, TradeReceivablePayment, CurrencyValues } from '@/lib/types';
import { listenToTradeReceivable, listenToArPayments, addArPayment, deleteArPayment, updateTradeReceivable, deleteTradeReceivable } from '@/services/cooperativeArService';
import { createTransaction, deleteTransactionGroup } from '@/services/cooperativeAccountingService';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number) => {
    if (isNaN(value)) return '0';
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
};

const currencies: (keyof Omit<CurrencyValues, 'cny'>)[] = ['kip', 'thb', 'usd'];

type NewPayment = {
    id: string;
    date: Date;
    note?: string;
    amountPaid: Omit<CurrencyValues, 'cny'>;
};

export default function ArDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [ar, setAr] = useState<TradeReceivable | null>(null);
    const [payments, setPayments] = useState<TradeReceivablePayment[]>([]);
    const [loading, setLoading] = useState(true);

    const [paymentToDelete, setPaymentToDelete] = useState<TradeReceivablePayment | null>(null);
    const [itemToDelete, setItemToDelete] = useState<TradeReceivable | null>(null);
    const [newPayments, setNewPayments] = useState<NewPayment[]>([]);

    const [isEditing, setIsEditing] = useState(false);
    const [editedData, setEditedData] = useState<Partial<TradeReceivable>>({});

    useEffect(() => {
        if (!id) return;

        const unsubscribeAr = listenToTradeReceivable(id, (data) => {
            if (data) {
                setAr(data);
                setEditedData(data);
            }
            setLoading(false);
        });

        const unsubscribePayments = listenToArPayments(id, setPayments);
        
        return () => {
            unsubscribeAr();
            unsubscribePayments();
        };
    }, [id]);

    const { totalPaid, outstandingBalance, profit, realizedProfit } = useMemo(() => {
        const paid: Omit<CurrencyValues, 'cny'> = { kip: 0, thb: 0, usd: 0 };
        const outstanding: Omit<CurrencyValues, 'cny'> = ar?.amount ? { ...ar.amount } : { kip: 0, thb: 0, usd: 0 };
        const calculatedProfit: Omit<CurrencyValues, 'cny'> = { kip: 0, thb: 0, usd: 0 };
        const realized: Omit<CurrencyValues, 'cny'> = { kip: 0, thb: 0, usd: 0 };

        if (ar) {
            payments.forEach((p) => {
                currencies.forEach(c => {
                    paid[c] += p.amountPaid?.[c] || 0;
                });
            });

            currencies.forEach(c => {
                outstanding[c] = (ar.amount[c] || 0) - paid[c];
                
                const cost = ar.cost?.[c] || 0;
                const totalAmount = ar.amount[c] || 0;
                const potentialProfit = Math.max(0, totalAmount - cost);
                
                // Realized profit: amount received beyond the cost
                const actualRealized = Math.min(
                    Math.max(0, paid[c] - cost),
                    potentialProfit
                );
                
                calculatedProfit[c] = potentialProfit;
                realized[c] = actualRealized;
            });
        }
        
        return { totalPaid: paid, outstandingBalance: outstanding, profit: calculatedProfit, realizedProfit: realized };
    }, [payments, ar]);

    const handleSave = async () => {
        if (!ar || !id) return;
        try {
            await updateTradeReceivable(id, editedData);
            toast({ title: 'ອັບເດດຂໍ້ມູນສຳເລັດ' });
            setIsEditing(false);
        } catch (error) {
            toast({ title: 'ເກີດຂໍ້ຜິດພາດ', variant: 'destructive' });
        }
    };

    const handleDeleteItem = async () => {
        if (!id) return;
        try {
            await deleteTradeReceivable(id);
            toast({ title: "ລົບລາຍການລູກໜີ້ສຳເລັດ" });
            navigate('/tee/cooperative/ar');
        } catch (error) {
            toast({ title: "ເກີດຂໍ້ຜິດພາດໃນການລົບ", variant: "destructive" });
        }
    };

    const handleDeletePayment = (e: React.MouseEvent, payment: TradeReceivablePayment) => {
        e.stopPropagation();
        setPaymentToDelete(payment);
    };

    const confirmDeletePayment = async () => {
        if (!paymentToDelete) return;
        try {
            // Delete associated accounting transaction if it exists
            if (paymentToDelete.transactionGroupId) {
                await deleteTransactionGroup(paymentToDelete.transactionGroupId);
            }
            
            await deleteArPayment(paymentToDelete.id);
            toast({ title: "ລົບການຊຳລະສຳເລັດ" });
        } catch (error) {
            toast({ title: "ເກີດຂໍ້ຜິດພາດ", variant: "destructive" });
        } finally {
            setPaymentToDelete(null);
        }
    };

    const handleAddNewPaymentRow = () => {
        setNewPayments(prev => [...prev, { id: uuidv4(), date: new Date(), amountPaid: { kip: 0, thb: 0, usd: 0 } }]);
    };

    const handleNewPaymentChange = (id: string, field: string, value: any) => {
        setNewPayments(prev => prev.map(p => {
            if (p.id === id) {
                if (field.startsWith('amountPaid.')) {
                    const currency = field.split('.')[1] as keyof Omit<CurrencyValues, 'cny'>;
                    return { ...p, amountPaid: { ...p.amountPaid, [currency]: Number(value) }};
                }
                return { ...p, [field]: value };
            }
            return p;
        }));
    };

    const removeNewPaymentRow = (id: string) => {
        setNewPayments(prev => prev.filter(p => p.id !== id));
    };

    const handleConfirmPayments = async () => {
        const validPayments = newPayments.filter(p => currencies.some(c => (p.amountPaid[c] || 0) > 0));
        if (validPayments.length === 0) {
            toast({ title: "ບໍ່ມີລາຍການຊຳລະ", description: "ກະລຸນາປ້ອນຈຳນວນເງິນຢ່າງໜ້ອຍໜຶ່ງລາຍການ", variant: "destructive"});
            return;
        }

        try {
            const paymentsWithTx = [];
            
            // Link to Accounting Journal
            for (const payment of validPayments) {
                const txGroupId = await createTransaction(
                    'cash', // Debit Cash
                    'ar_trade', // Credit A/R Trade
                    { ...payment.amountPaid, cny: 0 },
                    `ຮັບຊຳລະຈາກລູກໜີ້: ${ar.customerName} (ບິນ: ${ar.invoiceNumber})`,
                    payment.date
                );
                
                paymentsWithTx.push({
                    ...payment,
                    transactionGroupId: txGroupId
                });
            }

            await addArPayment(id!, paymentsWithTx);

            toast({ title: "ບັນທຶກການຊຳລະສຳເລັດ" });
            setNewPayments([]);
        } catch (error) {
            toast({ title: "ເກີດຂໍ້ຜິດພາດໃນການບັນທຶກ", variant: "destructive"});
        }
    };

    if (loading) return <div className="text-center p-8">ກຳລັງໂຫລດ...</div>;
    if (!ar) return <div className="text-center p-8">ບໍ່ພົບຂໍ້ມູນລູກໜີ້.</div>;

    const isFullyPaid = currencies.every(c => outstandingBalance[c] <= 0);

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4">
                <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                    <Link to="/tee/cooperative/ar"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <h1 className="text-xl font-bold tracking-tight">ລາຍລະອຽດລູກໜີ້: {ar.customerName}</h1>
            </header>
            <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>ຂໍ້ມູນລູກໜີ້</CardTitle>
                                <CardDescription>ລາຍລະອຽດການຊື້-ຂາຍ ແລະ ຍອດຄ້າງຊຳລະ</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                {isEditing ? (
                                    <Button size="sm" onClick={handleSave}><Save className="mr-2 h-4 w-4"/>ບັນທຶກ</Button>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}><Edit className="mr-2 h-4 w-4"/>ແກ້ໄຂ</Button>
                                        <Button size="sm" variant="destructive" onClick={() => setItemToDelete(ar)}><Trash className="mr-2 h-4 w-4"/>ລົບ</Button>
                                    </div>
                                )}
                                <Badge variant={isFullyPaid ? 'default' : 'destructive'}>
                                    {isFullyPaid ? 'ຊຳລະຄົບແລ້ວ' : 'ຍັງຄ້າງຊຳລະ'}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="space-y-4">
                                    <div className="grid gap-1.5">
                                        <Label>ຊື່ລູກໜີ້</Label>
                                        {isEditing ? (
                                            <Input value={editedData.customerName || ''} onChange={e => setEditedData({...editedData, customerName: e.target.value})} />
                                        ) : (
                                            <div className="p-2 bg-muted rounded-md">{ar.customerName}</div>
                                        )}
                                    </div>
                                    <div className="grid gap-1.5">
                                        <Label>ເລກທີບິນ/ສັນຍາ</Label>
                                        {isEditing ? (
                                            <Input value={editedData.invoiceNumber || ''} onChange={e => setEditedData({...editedData, invoiceNumber: e.target.value})} />
                                        ) : (
                                            <div className="p-2 bg-muted rounded-md font-mono">{ar.invoiceNumber}</div>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="grid gap-1.5">
                                        <Label>ວັນທີເຮັດລາຍການ</Label>
                                        <div className="p-2 bg-muted rounded-md">{format(ar.date, 'dd/MM/yyyy')}</div>
                                    </div>
                                    <div className="grid gap-1.5">
                                        <Label>ວັນຄົບກຳນົດ</Label>
                                        <div className="p-2 bg-muted rounded-md">{format(ar.dueDate, 'dd/MM/yyyy')}</div>
                                    </div>
                                </div>
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ສະກຸນເງິນ</TableHead>
                                        <TableHead className="text-right">ລາຄາຕົ້ນທຶນ</TableHead>
                                        <TableHead className="text-right">ລາຄາຂາຍ</TableHead>
                                        <TableHead className="text-right">ຈ່າຍແລ້ວ</TableHead>
                                        <TableHead className="text-right">ຍອດຄົງເຫຼືອ</TableHead>
                                        <TableHead className="text-right">ກຳໄລທີ່ໄດ້ຮັບ</TableHead>
                                        <TableHead className="text-right">ກຳໄລ (ຄາດການ)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {currencies.map(c => {
                                        const amount = ar.amount[c] || 0;
                                        const cost = ar.cost?.[c] || 0;
                                        if (amount === 0 && cost === 0) return null;
                                        return (
                                            <TableRow key={c}>
                                                <TableCell className="font-bold uppercase">{c}</TableCell>
                                                <TableCell className="text-right">
                                                    {isEditing ? (
                                                        <Input 
                                                            type="number" 
                                                            className="h-8 text-right w-32 ml-auto" 
                                                            value={editedData.cost?.[c] || 0} 
                                                            onChange={e => setEditedData({
                                                                ...editedData, 
                                                                cost: { ...(editedData.cost || {kip:0, thb:0, usd:0, cny:0}), [c]: Number(e.target.value) }
                                                            })} 
                                                        />
                                                    ) : (
                                                        formatCurrency(cost)
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {isEditing ? (
                                                        <Input 
                                                            type="number" 
                                                            className="h-8 text-right w-32 ml-auto" 
                                                            value={editedData.amount?.[c] || 0} 
                                                            onChange={e => setEditedData({
                                                                ...editedData, 
                                                                amount: { ...(editedData.amount || {kip:0, thb:0, usd:0, cny:0}), [c]: Number(e.target.value) }
                                                            })} 
                                                        />
                                                    ) : (
                                                        formatCurrency(amount)
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right text-green-600">{formatCurrency(totalPaid[c])}</TableCell>
                                                <TableCell className="text-right font-bold text-red-600">{formatCurrency(outstandingBalance[c])}</TableCell>
                                                <TableCell className="text-right font-bold text-green-600">{formatCurrency(realizedProfit[c])}</TableCell>
                                                <TableCell className="text-right font-bold text-blue-600">{formatCurrency(profit[c])}</TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5"/> ສະຖານະການຊຳລະ</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>ຄວາມຄືບໜ້າການຊຳລະ</span>
                                    <span className="font-bold">
                                        {currencies.map(c => ar.amount[c] > 0 ? `${Math.round((totalPaid[c] / ar.amount[c]) * 100)}% (${c.toUpperCase()})` : null).filter(Boolean).join(', ')}
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-primary transition-all duration-500" 
                                        style={{ width: `${Math.min(100, Math.max(...currencies.map(c => ar.amount[c] > 0 ? (totalPaid[c] / ar.amount[c]) * 100 : 0)))}%` }}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t space-y-3">
                                <div className="flex items-center gap-2 text-sm">
                                    <CheckCircle2 className={cn("h-4 w-4", isFullyPaid ? "text-green-500" : "text-muted-foreground")} />
                                    <span>{isFullyPaid ? "ຊຳລະຄົບຖ້ວນແລ້ວ" : "ຍັງມີຍອດຄ້າງຊຳລະ"}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <AlertCircle className={cn("h-4 w-4", ar.status === 'overdue' ? "text-red-500" : "text-muted-foreground")} />
                                    <span>{ar.status === 'overdue' ? "ກາຍກຳນົດຊຳລະ" : "ຍັງຢູ່ໃນກຳນົດຊຳລະ"}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>ເພີ່ມການຊຳລະ</CardTitle>
                        <CardDescription>ບັນທຶກການຮັບເງິນຈາກລູກໜີ້</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {newPayments.map((p, index) => (
                                <div key={p.id} className="flex flex-wrap items-center gap-4 p-4 border rounded-lg bg-background/50">
                                    <div className="grid gap-1.5">
                                        <Label className="text-xs">ວັນທີ</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant={"outline"} className="w-[160px] justify-start text-left font-normal h-10">
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {p.date ? format(p.date, "dd/MM/yyyy") : <span>ເລືອກວັນທີ</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar mode="single" selected={p.date} onSelect={(date) => handleNewPaymentChange(p.id, 'date', date)} initialFocus />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    
                                    {currencies.map(c => (
                                        (ar.amount[c] || 0) > 0 &&
                                        <div key={c} className="grid gap-1.5">
                                            <Label className="text-xs uppercase">{c}</Label>
                                            <Input 
                                                type="number" 
                                                value={p.amountPaid[c]} 
                                                onChange={(e) => handleNewPaymentChange(p.id, `amountPaid.${c}`, e.target.value)} 
                                                className="h-10 w-[140px] text-right"
                                            />
                                        </div>
                                    ))}
                                    
                                    <div className="grid gap-1.5 flex-1 min-w-[200px]">
                                        <Label className="text-xs">ໝາຍເຫດ</Label>
                                        <Input 
                                            value={p.note || ''} 
                                            onChange={e => handleNewPaymentChange(p.id, 'note', e.target.value)} 
                                            placeholder="ລາຍລະອຽດການຊຳລະ..." 
                                            className="h-10"
                                        />
                                    </div>
                                    
                                    <Button variant="ghost" size="icon" className="mt-6" onClick={() => removeNewPaymentRow(p.id)}>
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </div>
                            ))}
                            
                            <div className="flex justify-between items-center pt-2">
                                <Button variant="outline" onClick={handleAddNewPaymentRow}>
                                    <PlusCircle className="mr-2 h-4 w-4"/>ເພີ່ມລາຍການຊຳລະ
                                </Button>
                                {newPayments.length > 0 && (
                                    <Button onClick={handleConfirmPayments}>ບັນທຶກທັງໝົດ</Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>ປະຫວັດການຮັບຊຳລະ</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ວັນທີ</TableHead>
                                    <TableHead>ຈຳນວນເງິນ</TableHead>
                                    <TableHead>ໝາຍເຫດ</TableHead>
                                    <TableHead className="text-right">ການຈັດການ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payments.length > 0 ? (
                                    payments.map((p) => (
                                        <TableRow key={p.id}>
                                            <TableCell className="font-medium">{format(p.paymentDate, 'dd/MM/yyyy')}</TableCell>
                                            <TableCell>
                                                {currencies.map(c => (
                                                    (p.amountPaid?.[c] > 0) && <div key={c} className="font-mono">{formatCurrency(p.amountPaid[c])} {c.toUpperCase()}</div>
                                                ))}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{p.note || '-'}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={(e) => handleDeletePayment(e, p)}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">ບໍ່ມີປະຫວັດການຊຳລະ</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </main>

            <AlertDialog open={!!paymentToDelete} onOpenChange={(open) => !open && setPaymentToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>ຢືນຢັນການລົບ</AlertDialogTitle>
                        <AlertDialogDescription>
                            ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລົບລາຍການຊຳລະນີ້? ການກະທຳນີ້ບໍ່ສາມາດຍ້ອນກັບໄດ້.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel variant="outline" size="default">ຍົກເລີກ</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeletePayment} className="bg-red-600 hover:bg-red-700">ຢືນຢັນການລົບ</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>ຢືນຢັນການລົບລູກໜີ້</AlertDialogTitle>
                        <AlertDialogDescription>
                            ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລົບລາຍການລູກໜີ້ "{itemToDelete?.customerName}"? ຂໍ້ມູນທັງໝົດລວມທັງປະຫວັດການຊຳລະຈະຖືກລົບອອກຖາວອນ.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel variant="outline" size="default">ຍົກເລີກ</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteItem} className="bg-red-600 hover:bg-red-700">ຢືນຢັນການລົບ</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
