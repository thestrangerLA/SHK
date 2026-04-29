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
import { ArrowLeft, Trash2, Calendar as CalendarIcon, PlusCircle, Edit, Save } from "lucide-react";
import { format, addYears } from "date-fns";
import type { Loan, LoanRepayment, CurrencyValues, CooperativeMember } from '@/lib/types';
import { listenToRepaymentsForLoan, listenToLoan, deleteLoanRepayment, updateLoanRepayment, addLoanRepayment, updateLoan } from '@/services/cooperativeLoanService';
import { getCooperativeMember } from '@/services/cooperativeMemberService';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';

const formatCurrency = (value: number) => {
    if (isNaN(value)) return '0';
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
};

const currencies: (keyof Omit<CurrencyValues, 'cny'>)[] = ['kip', 'thb', 'usd'];

type NewRepayment = {
    id: string;
    date: Date;
    note?: string;
    amount: Omit<CurrencyValues, 'cny'>;
};

export default function LoanDetailPage() {
    const { id } = useParams();
    const { toast } = useToast();
    const [loan, setLoan] = useState<Loan | null>(null);
    const [member, setMember] = useState<CooperativeMember | null>(null);
    const [repayments, setRepayments] = useState<LoanRepayment[]>([]);
    const [loading, setLoading] = useState(true);

    const [repaymentToDelete, setRepaymentToDelete] = useState<LoanRepayment | null>(null);
    const [newRepayments, setNewRepayments] = useState<NewRepayment[]>([]);

    const [isEditingDuration, setIsEditingDuration] = useState(false);
    const [editedDuration, setEditedDuration] = useState<number>(0);

    const [isEditingDetails, setIsEditingDetails] = useState(false);
    const [editedLoanCode, setEditedLoanCode] = useState('');
    const [editedPurpose, setEditedPurpose] = useState('');


    useEffect(() => {
        if (!id) return;

        const unsubscribeLoan = listenToLoan(id, async (loanData) => {
            if (loanData) {
                setLoan(loanData);
                setEditedDuration(loanData.durationYears || 0);
                setEditedLoanCode(loanData.loanCode || '');
                setEditedPurpose(loanData.purpose || '');
                if (loanData.memberId && (!member || member.id !== loanData.memberId)) {
                    const memberData = await getCooperativeMember(loanData.memberId);
                    setMember(memberData);
                }
            }
            setLoading(false);
        });

        const unsubscribeRepayments = listenToRepaymentsForLoan(id, setRepayments);
        
        return () => {
            unsubscribeLoan();
            unsubscribeRepayments();
        };
    }, [id, member]);

     const { totalPaid, outstandingBalance, totalLoanWithInterest, repaymentSchedule } = useMemo(() => {
        const paid: Omit<CurrencyValues, 'cny'> = { kip: 0, thb: 0, usd: 0 };
        let outstanding: Omit<CurrencyValues, 'cny'> = loan?.repaymentAmount ? { ...loan.repaymentAmount } : { kip: 0, thb: 0, usd: 0 };

        const schedule: any[] = [];
        
        if (loan) {
            let runningBalance = { ...loan.repaymentAmount };

            const sortedRepayments = [...repayments].sort((a, b) => a.repaymentDate.getTime() - b.repaymentDate.getTime());

            sortedRepayments.forEach((r) => {
                 currencies.forEach(c => {
                    paid[c] += r.amountPaid?.[c] || 0;
                    runningBalance[c] -= (r.amountPaid?.[c] || 0);
                });
                
                schedule.push({
                    ...r,
                    outstandingBalance: { ...runningBalance }
                });
            });

            outstanding = { ...runningBalance };
        }
        
        return { 
            totalPaid: paid, 
            outstandingBalance: outstanding, 
            totalLoanWithInterest: loan?.repaymentAmount || { kip: 0, thb: 0, usd: 0 },
            repaymentSchedule: schedule.sort((a, b) => b.repaymentDate.getTime() - a.repaymentDate.getTime())
        };
    }, [repayments, loan]);

    const handleSaveDuration = async () => {
        if (!loan) return;
        try {
            await updateLoan(loan.id, { durationYears: editedDuration });
            toast({ title: 'ອັບເດດໄລຍະເວລາສຳເລັດ' });
            setIsEditingDuration(false);
        } catch (error) {
            toast({ title: 'ເກີດຂໍ້ຜິດພາດ', variant: 'destructive' });
        }
    };

    const handleSaveDetails = async () => {
        if (!loan) return;
        try {
            await updateLoan(loan.id, { 
                loanCode: editedLoanCode,
                purpose: editedPurpose
            });
            toast({ title: 'ອັບເດດຂໍ້ມູນສິນເຊື່ອສຳເລັດ' });
            setIsEditingDetails(false);
        } catch (error) {
            toast({ title: 'ເກີດຂໍ້ຜິດພາດ', variant: 'destructive' });
        }
    };

    const handleApproveLoan = async () => {
        if (!loan) return;
        try {
            await updateLoan(loan.id, { status: 'approved' });
            toast({
                title: "ອະນຸມັດສຳເລັດ",
                description: "ສິນເຊື່ອໄດ້ຮັບການອະນຸມັດ ແລະ ບັນທຶກລາຍການບັນຊີແລ້ວ.",
            });
        } catch (error) {
            console.error("Error approving loan:", error);
            toast({
                title: "ເກີດຂໍ້ຜິດພາດ",
                description: "ບໍ່ສາມາດອະນຸມັດສິນເຊື່ອໄດ້.",
                variant: "destructive",
            });
        }
    };

    const handleDeleteClick = (e: React.MouseEvent, repayment: LoanRepayment) => {
        e.stopPropagation();
        setRepaymentToDelete(repayment);
    };

    const confirmDelete = async () => {
        if (!repaymentToDelete) return;
        try {
            await deleteLoanRepayment(repaymentToDelete.id);
            toast({
                title: "ລົບການຊຳລະສຳເລັດ",
            });
        } catch (error) {
            console.error("Error deleting repayment:", error);
            toast({
                title: "ເກີດຂໍ້ຜິດພາດ",
                variant: "destructive",
            });
        } finally {
            setRepaymentToDelete(null);
        }
    };

    const handleAddNewRepaymentRow = () => {
        setNewRepayments(prev => [...prev, { id: uuidv4(), date: new Date(), amount: { kip: 0, thb: 0, usd: 0 } }]);
    };

    const handleNewRepaymentChange = (id: string, field: 'date' | 'note' | `amount.${keyof Omit<CurrencyValues, 'cny'>}`, value: any) => {
        setNewRepayments(prev => prev.map(r => {
            if (r.id === id) {
                if (field.startsWith('amount.')) {
                    const currency = field.split('.')[1] as keyof Omit<CurrencyValues, 'cny'>;
                    return { ...r, amount: { ...r.amount, [currency]: Number(value) }};
                }
                return { ...r, [field]: value };
            }
            return r;
        }));
    };

    const removeNewRepaymentRow = (id: string) => {
        setNewRepayments(prev => prev.filter(r => r.id !== id));
    };

    const handleConfirmRepayments = async () => {
        const validRepayments = newRepayments.filter(r => (r.amount.kip || 0) > 0 || (r.amount.thb || 0) > 0 || (r.amount.usd || 0) > 0);
        if (validRepayments.length === 0) {
            toast({ title: "ບໍ່ມີລາຍການຊຳລະ", description: "ກະລຸນາປ້ອນຈຳນວນເງິນຢ່າງໜ້ອຍໜຶ່ງລາຍການ", variant: "destructive"});
            return;
        }

        try {
            await addLoanRepayment(id!, validRepayments);
            toast({ title: "ບັນທຶກການຊຳລະສຳເລັດ" });
            setNewRepayments([]);
        } catch (error) {
            console.error("Error confirming repayments:", error);
            toast({ title: "ເກີດຂໍ້ຜິດພາດໃນການບັນທຶກ", variant: "destructive"});
        }
    };


    if (loading) return <div className="text-center p-8">Loading loan details...</div>;
    if (!loan) return <div className="text-center p-8">Loan not found.</div>;

    const totalOutstandingValue = Object.values(outstandingBalance).reduce((sum, val) => (sum as number) + (val as number), 0) as number;

    const dueDate = loan.durationYears ? addYears(loan.applicationDate, loan.durationYears) : null;


    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                    <Link to="/tee/cooperative/loans"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <h1 className="text-xl font-bold tracking-tight">ລາຍລະອຽດສິນເຊື່ອ: {loan.loanCode}</h1>
            </header>
            <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8">
                 <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                <span>ສະຫຼຸບຂໍ້ມູນສິນເຊື່ອ</span>
                                <div className="flex items-center gap-2">
                                    {loan.status === 'pending' && (
                                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={handleApproveLoan}>ອະນຸມັດ (Approve)</Button>
                                    )}
                                    {isEditingDetails ? (
                                        <Button size="sm" onClick={handleSaveDetails}><Save className="mr-2 h-4 w-4"/>ບັນທຶກ</Button>
                                    ) : (
                                        <Button size="sm" variant="outline" onClick={() => setIsEditingDetails(true)}><Edit className="mr-2 h-4 w-4"/>ແກ້ໄຂ</Button>
                                    )}
                                    <Badge variant={loan.status === 'pending' ? 'outline' : (totalOutstandingValue <= 0 ? 'default' : 'destructive')}>
                                        {loan.status === 'pending' ? 'ລໍການອະນຸມັດ' : (totalOutstandingValue <= 0 ? 'ຈ່າຍໝົດແລ້ວ' : 'ຍັງຄ້າງ')}
                                    </Badge>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold whitespace-nowrap">ລະຫັດສິນເຊື່ອ:</span>
                                    {isEditingDetails ? (
                                        <Input value={editedLoanCode} onChange={e => setEditedLoanCode(e.target.value)} className="h-8" />
                                    ) : (
                                        <span>{loan.loanCode}</span>
                                    )}
                                </div>
                                <div><span className="font-semibold">ຜູ້ກູ້ຢືມ:</span> {loan.memberId ? member?.name : loan.debtorName || '...'}</div>
                                <div className="flex items-center gap-2 col-span-1 md:col-span-2">
                                    <span className="font-semibold whitespace-nowrap">ຈຸດປະສົງ:</span>
                                    {isEditingDetails ? (
                                        <Input value={editedPurpose} onChange={e => setEditedPurpose(e.target.value)} className="h-8 flex-1" />
                                    ) : (
                                        <span>{loan.purpose || '-'}</span>
                                    )}
                                </div>
                            </div>
                            <Table className="mt-4">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ສະກຸນເງິນ</TableHead>
                                        <TableHead className="text-right">ເງິນຕົ້ນ</TableHead>
                                        <TableHead className="text-right">ຍອດຕ້ອງຈ່າຍ</TableHead>
                                        <TableHead className="text-right">ຈ່າຍແລ້ວ</TableHead>
                                        <TableHead className="text-right">ຍອດຄົງເຫຼືອ</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {currencies.map(c => {
                                        const principal = loan.amount[c] || 0;
                                        if (principal === 0 && (loan.repaymentAmount[c] || 0) === 0) return null;
                                        return (
                                            <TableRow key={c}>
                                                <TableCell className="font-semibold uppercase">{c}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(principal)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(totalLoanWithInterest[c] || 0)}</TableCell>
                                                <TableCell className="text-right text-green-600">{formatCurrency(totalPaid[c] || 0)}</TableCell>
                                                <TableCell className="text-right font-bold text-red-600">{formatCurrency(outstandingBalance[c] || 0)}</TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2"><CalendarIcon className="h-5 w-5"/> ໄລຍະເວລາ</CardTitle>
                             {isEditingDuration ? (
                                <Button size="sm" onClick={handleSaveDuration}><Save className="mr-2 h-4 w-4"/>ບັນທຶກ</Button>
                            ) : (
                                <Button size="sm" variant="outline" onClick={() => setIsEditingDuration(true)}><Edit className="mr-2 h-4 w-4"/>ແກ້ໄຂ</Button>
                            )}
                        </CardHeader>
                        <CardContent className="text-sm space-y-2">
                            <div className="flex justify-between">
                                <span>ວັນທີເລີ່ມສັນຍາ:</span>
                                <strong>{format(loan.applicationDate, 'dd/MM/yyyy')}</strong>
                            </div>
                            <div className="flex justify-between">
                                <span>ວັນຄົບກຳນົດ:</span>
                                <strong>{dueDate ? format(dueDate, 'dd/MM/yyyy') : 'N/A'}</strong>
                            </div>
                             <div className="flex justify-between items-center">
                                <span>ໄລຍະເວລາ:</span>
                                {isEditingDuration ? (
                                    <Input 
                                        type="number" 
                                        value={editedDuration} 
                                        onChange={(e) => setEditedDuration(Number(e.target.value))}
                                        className="w-20 h-8"
                                    />
                                ) : (
                                    <strong>{loan.durationYears || 'N/A'} ປີ</strong>
                                )}
                            </div>
                        </CardContent>
                    </Card>


                    <Card>
                        <CardHeader>
                            <CardTitle>ເພີ່ມການຊຳລະຄືນ</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {newRepayments.map((r, index) => (
                                    <div key={r.id} className="flex items-center gap-2 p-2 border rounded-md">
                                         <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant={"outline"} className="w-[150px] justify-start text-left font-normal h-9">
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {r.date ? format(r.date, "dd/MM/yy") : <span>ເລືອກວັນທີ</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={r.date} onSelect={(date) => handleNewRepaymentChange(r.id, 'date', date)} initialFocus /></PopoverContent>
                                        </Popover>
                                        {currencies.map(c => (
                                            (loan.amount[c] || 0) > 0 &&
                                            <div key={c} className="flex items-center gap-1">
                                                <Label htmlFor={`new-repayment-${c}-${index}`} className="uppercase text-xs">{c}</Label>
                                                <Input id={`new-repayment-${c}-${index}`} type="number" value={r.amount[c]} onChange={(e) => handleNewRepaymentChange(r.id, `amount.${c}`, e.target.value)} className="h-9 w-[100px] text-right"/>
                                            </div>
                                        ))}
                                        <Textarea value={r.note} onChange={e => handleNewRepaymentChange(r.id, 'note', e.target.value)} placeholder="ໝາຍເຫດ" className="h-9 flex-1" />
                                        <Button variant="ghost" size="icon" onClick={() => removeNewRepaymentRow(r.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 flex justify-between">
                                <Button variant="outline" onClick={handleAddNewRepaymentRow}><PlusCircle className="mr-2 h-4 w-4"/>ເພີ່ມລາຍການຊຳລະ</Button>
                                {newRepayments.length > 0 && <Button onClick={handleConfirmRepayments}>ຢືນຢັນການຊຳລະ</Button>}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>ປະຫວັດການຊຳລະ</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ວັນທີຈ່າຍ</TableHead>
                                        <TableHead>ຍອດຈ່າຍ</TableHead>
                                        <TableHead>ຍອດຄົງເຫຼືອ</TableHead>
                                        <TableHead className="text-center">ລຶບ</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {repaymentSchedule.length > 0 ? (
                                        repaymentSchedule.map((r) => (
                                            <TableRow key={r.id}>
                                                <TableCell>{format(r.repaymentDate, 'dd/MM/yyyy')}</TableCell>
                                                <TableCell>
                                                    {currencies.map(c => (
                                                        (r.amountPaid?.[c] > 0) && <div key={c}>{formatCurrency(r.amountPaid[c])} {c.toUpperCase()}</div>
                                                    ))}
                                                </TableCell>
                                                 <TableCell>
                                                    {currencies.map(c => (
                                                        (loan.amount?.[c] > 0) && <div key={c}>{formatCurrency(r.outstandingBalance[c])} {c.toUpperCase()}</div>
                                                    ))}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button variant="ghost" size="icon" onClick={(e) => handleDeleteClick(e, r)}>
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center h-24">ບໍ່ມີປະຫວັດການຊຳລະ</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    
                 </div>
                 <AlertDialog open={!!repaymentToDelete} onOpenChange={(open) => !open && setRepaymentToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>ຢືນຢັນການລົບ</AlertDialogTitle>
                            <AlertDialogDescription>
                                ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລົບລາຍການຊຳລະນີ້? ການກະທຳນີ້ບໍ່ສາມາດຍ້ອນກັບໄດ້.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel variant="outline" size="default" onClick={(e) => { e.stopPropagation(); setRepaymentToDelete(null); }}>ຍົກເລີກ</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmDelete}>ຢືນຢັນ</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </main>
        </div>
    );
}
