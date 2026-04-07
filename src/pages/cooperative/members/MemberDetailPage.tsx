/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";
import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Users, Trash2, PlusCircle, Edit, MinusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, getYear, getMonth } from "date-fns";
import { LAO_MONTHS } from '@/lib/date-utils';
import type { CooperativeMember, CooperativeDeposit, CooperativeWithdrawal, Loan, CurrencyValues } from '@/lib/types';
import { listenToCooperativeDepositsForMember, getCooperativeMember } from '@/services/cooperativeMemberService';
import { addCooperativeDeposit, deleteCooperativeDeposit } from '@/services/cooperativeDepositService';
import { listenToCooperativeWithdrawalsForMember, addCooperativeWithdrawal, deleteCooperativeWithdrawal } from '@/services/cooperativeWithdrawalService';
import { listenToLoansByMember } from '@/services/cooperativeLoanService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddDepositDialog } from './_components/AddDepositDialog';
import { AddWithdrawalDialog } from './_components/AddWithdrawalDialog';
import { EditMemberDialog } from './_components/EditMemberDialog';
import { cn } from '@/lib/utils';

const currencies: (keyof CurrencyValues)[] = ['kip', 'thb', 'usd', 'cny'];

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
};

export default function MemberDetailPage() {
    const { id } = useParams();
    const { toast } = useToast();
    const [member, setMember] = useState<CooperativeMember | null>(null);
    const [deposits, setDeposits] = useState<CooperativeDeposit[]>([]);
    const [withdrawals, setWithdrawals] = useState<CooperativeWithdrawal[]>([]);
    const [loans, setLoans] = useState<Loan[]>([]);
    const [isAddDepositOpen, setAddDepositOpen] = useState(false);
    const [isAddWithdrawalOpen, setAddWithdrawalOpen] = useState(false);
    const [isEditMemberOpen, setEditMemberOpen] = useState(false);
    const [depositToDelete, setDepositToDelete] = useState<string | null>(null);
    const [withdrawalToDelete, setWithdrawalToDelete] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        
        const fetchMember = async () => {
            const data = await getCooperativeMember(id);
            setMember(data);
            setLoading(false);
        };
        
        fetchMember();
        
        const unsubscribeDeposits = listenToCooperativeDepositsForMember(id, setDeposits);
        const unsubscribeWithdrawals = listenToCooperativeWithdrawalsForMember(id, setWithdrawals);
        const unsubscribeLoans = listenToLoansByMember(id, setLoans);
        return () => {
            unsubscribeDeposits();
            unsubscribeWithdrawals();
            unsubscribeLoans();
        };
    }, [id]);

    const totalDeposits = useMemo(() => {
        if (!member) return { kip: 0, thb: 0, usd: 0, cny: 0 };
        
        const sum = deposits.reduce((acc, d) => {
            acc.kip += d.kip || 0;
            acc.thb += d.thb || 0;
            acc.usd += d.usd || 0;
            acc.cny += d.cny || 0;
            return acc;
        }, { 
            kip: member.deposits?.kip || 0, 
            thb: member.deposits?.thb || 0, 
            usd: member.deposits?.usd || 0,
            cny: member.deposits?.cny || 0
        });

        withdrawals.forEach(w => {
            sum.kip -= w.kip || 0;
            sum.thb -= w.thb || 0;
            sum.usd -= w.usd || 0;
            sum.cny -= w.cny || 0;
        });

        return sum;
    }, [deposits, withdrawals, member]);

    const totalLoans = useMemo(() => {
        return loans.reduce((sum, l) => {
            sum.kip += l.amount?.kip || 0;
            sum.thb += l.amount?.thb || 0;
            sum.usd += l.amount?.usd || 0;
            sum.cny += l.amount?.cny || 0;
            return sum;
        }, { kip: 0, thb: 0, usd: 0, cny: 0 });
    }, [loans]);

     const chartData = useMemo(() => {
        const currentYear = getYear(new Date());
        const monthlyDeposits: { [key: string]: number } = {};

        for(let i = 0; i < 12; i++) {
            const monthName = LAO_MONTHS[i];
            monthlyDeposits[monthName] = 0;
        }

        deposits.forEach(deposit => {
            if (getYear(deposit.date) === currentYear) {
                const monthName = LAO_MONTHS[getMonth(deposit.date)];
                monthlyDeposits[monthName] += deposit.kip || 0; // Charting KIP for now
            }
        });

        return Object.keys(monthlyDeposits).map(month => ({
            month,
            deposit: monthlyDeposits[month],
        }));

    }, [deposits]);

    const handleAddDeposit = async (deposit: Omit<CooperativeDeposit, 'id' | 'createdAt' | 'memberName' | 'memberId'>) => {
        if (!member) return;
        try {
            await addCooperativeDeposit({
                memberId: member.id,
                memberName: member.name,
                ...deposit
            });
            toast({ title: "ເພີ່ມເງິນຝາກສຳເລັດ" });
        } catch (error) {
            toast({ title: "ເກີດຂໍ້ຜິດພາດ", variant: "destructive" });
        }
    };

    const handleDeleteDeposit = async (id: string) => {
        setDepositToDelete(id);
    };

    const confirmDeleteDeposit = async () => {
        if (!depositToDelete) return;
        try {
            await deleteCooperativeDeposit(depositToDelete);
            toast({ title: "ລຶບລາຍການສຳເລັດ" });
        } catch (error) {
            toast({ title: "ເກີດຂໍ້ຜິດພາດ", variant: "destructive" });
        } finally {
            setDepositToDelete(null);
        }
    };

    const handleAddWithdrawal = async (withdrawal: Omit<CooperativeWithdrawal, 'id' | 'createdAt' | 'memberName' | 'memberId'>) => {
        if (!member) return;
        try {
            await addCooperativeWithdrawal({
                memberId: member.id,
                memberName: member.name,
                ...withdrawal
            });
            toast({ title: "ຖອນເງິນສຳເລັດ" });
        } catch (error) {
            toast({ title: "ເກີດຂໍ້ຜິດພາດ", variant: "destructive" });
        }
    };

    const handleDeleteWithdrawal = async (id: string) => {
        setWithdrawalToDelete(id);
    };

    const confirmDeleteWithdrawal = async () => {
        if (!withdrawalToDelete) return;
        try {
            await deleteCooperativeWithdrawal(withdrawalToDelete);
            toast({ title: "ລຶບລາຍການສຳເລັດ" });
        } catch (error) {
            toast({ title: "ເກີດຂໍ້ຜິດພາດ", variant: "destructive" });
        } finally {
            setWithdrawalToDelete(null);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen w-full flex-col bg-muted/40 p-4 sm:px-6 md:gap-8">
                 <Skeleton className="h-14 w-full" />
                 <Skeleton className="h-[100px] w-full mt-4" />
                 <Skeleton className="h-[400px] w-full mt-4" />
            </div>
        );
    }

    if (!member) {
        return (
            <div className="flex justify-center items-center h-screen">
                <h1>Member not found</h1>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                    <Link to="/tee/cooperative/members">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex items-center gap-2">
                    <Users className="h-6 w-6 text-primary" />
                    <h1 className="text-xl font-bold tracking-tight">{member.name}</h1>
                </div>
                 <div className="ml-auto flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditMemberOpen(true)}><Edit className="mr-2 h-4 w-4"/> ແກ້ໄຂຂໍ້ມູນ</Button>
                    <Button size="sm" variant="destructive" onClick={() => setAddWithdrawalOpen(true)}><MinusCircle className="mr-2 h-4 w-4" /> ຖອນເງິນ</Button>
                    <Button size="sm" onClick={() => setAddDepositOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> ເພີ່ມເງິນຝາກ</Button>
                </div>
            </header>
            <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8">
                <Tabs defaultValue="info" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 mb-8">
                        <TabsTrigger value="info">ຂໍ້ມູນສະມາຊິກ</TabsTrigger>
                        <TabsTrigger value="history">ປະຫວັດການເງິນ</TabsTrigger>
                        <TabsTrigger value="loans">ຂໍ້ມູນສິນເຊື່ອ</TabsTrigger>
                        <TabsTrigger value="overview">ພາບລວມ</TabsTrigger>
                    </TabsList>

                    <TabsContent value="info" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardDescription>ລະຫັດສະມາຊິກ</CardDescription>
                                    <CardTitle className="text-2xl">{member.memberId}</CardTitle>
                                </CardHeader>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardDescription>ວັນທີສະໝັກ</CardDescription>
                                    <CardTitle className="text-2xl">{format(new Date(member.joinDate), 'dd')}/{getMonth(new Date(member.joinDate)) + 1}/{getYear(new Date(member.joinDate)) + 543}</CardTitle>
                                </CardHeader>
                            </Card>
                        </div>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>ຍອດເງິນຝາກລວມ</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center p-4 border rounded-lg bg-background">
                                    <p className="text-xs text-muted-foreground mb-1">KIP</p>
                                    <p className="text-xl font-bold text-green-600">{formatCurrency(totalDeposits.kip)}</p>
                                </div>
                                <div className="text-center p-4 border rounded-lg bg-background">
                                    <p className="text-xs text-muted-foreground mb-1">THB</p>
                                    <p className="text-xl font-bold text-green-600">{formatCurrency(totalDeposits.thb)}</p>
                                </div>
                                <div className="text-center p-4 border rounded-lg bg-background">
                                    <p className="text-xs text-muted-foreground mb-1">USD</p>
                                    <p className="text-xl font-bold text-green-600">{formatCurrency(totalDeposits.usd)}</p>
                                </div>
                                <div className="text-center p-4 border rounded-lg bg-background">
                                    <p className="text-xs text-muted-foreground mb-1">CNY</p>
                                    <p className="text-xl font-bold text-green-600">{formatCurrency(totalDeposits.cny)}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="history" className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle>ປະຫວັດການຝາກເງິນ</CardTitle>
                                    <Button size="sm" variant="outline" onClick={() => setAddDepositOpen(true)}><PlusCircle className="h-4 w-4 mr-2" /> ເພີ່ມ</Button>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>ວັນທີ</TableHead>
                                                <TableHead className="text-right">KIP</TableHead>
                                                <TableHead className="text-right">THB</TableHead>
                                                <TableHead className="text-right">USD</TableHead>
                                                <TableHead className="text-right">CNY</TableHead>
                                                <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {deposits.length > 0 ? deposits.map(deposit => (
                                                <TableRow key={deposit.id}>
                                                    <TableCell>{format(deposit.date, 'dd/MM/yyyy')}</TableCell>
                                                    <TableCell className="text-right font-mono">{formatCurrency(deposit.kip || 0)}</TableCell>
                                                    <TableCell className="text-right font-mono">{formatCurrency(deposit.thb || 0)}</TableCell>
                                                    <TableCell className="text-right font-mono">{formatCurrency(deposit.usd || 0)}</TableCell>
                                                    <TableCell className="text-right font-mono">{formatCurrency(deposit.cny || 0)}</TableCell>
                                                    <TableCell>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteDeposit(deposit.id)}>
                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center h-24">ຍັງບໍ່ມີປະຫວັດການຝາກເງິນ</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle>ປະຫວັດການຖອນເງິນ</CardTitle>
                                    <Button size="sm" variant="outline" onClick={() => setAddWithdrawalOpen(true)}><MinusCircle className="h-4 w-4 mr-2" /> ຖອນ</Button>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>ວັນທີ</TableHead>
                                                <TableHead className="text-right">KIP</TableHead>
                                                <TableHead className="text-right">THB</TableHead>
                                                <TableHead className="text-right">USD</TableHead>
                                                <TableHead className="text-right">CNY</TableHead>
                                                <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {withdrawals.length > 0 ? withdrawals.map(withdrawal => (
                                                <TableRow key={withdrawal.id}>
                                                    <TableCell>{format(withdrawal.date, 'dd/MM/yyyy')}</TableCell>
                                                    <TableCell className="text-right font-mono text-red-600">{formatCurrency(withdrawal.kip || 0)}</TableCell>
                                                    <TableCell className="text-right font-mono text-red-600">{formatCurrency(withdrawal.thb || 0)}</TableCell>
                                                    <TableCell className="text-right font-mono text-red-600">{formatCurrency(withdrawal.usd || 0)}</TableCell>
                                                    <TableCell className="text-right font-mono text-red-600">{formatCurrency(withdrawal.cny || 0)}</TableCell>
                                                    <TableCell>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteWithdrawal(withdrawal.id)}>
                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center h-24">ຍັງບໍ່ມີປະຫວັດການຖອນເງິນ</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="loans" className="space-y-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>ຍອດເງິນກູ້ລວມ</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center p-4 border rounded-lg bg-background">
                                    <p className="text-xs text-muted-foreground mb-1">KIP</p>
                                    <p className="text-xl font-bold text-red-600">{formatCurrency(totalLoans.kip)}</p>
                                </div>
                                <div className="text-center p-4 border rounded-lg bg-background">
                                    <p className="text-xs text-muted-foreground mb-1">THB</p>
                                    <p className="text-xl font-bold text-red-600">{formatCurrency(totalLoans.thb)}</p>
                                </div>
                                <div className="text-center p-4 border rounded-lg bg-background">
                                    <p className="text-xs text-muted-foreground mb-1">USD</p>
                                    <p className="text-xl font-bold text-red-600">{formatCurrency(totalLoans.usd)}</p>
                                </div>
                                <div className="text-center p-4 border rounded-lg bg-background">
                                    <p className="text-xs text-muted-foreground mb-1">CNY</p>
                                    <p className="text-xl font-bold text-red-600">{formatCurrency(totalLoans.cny)}</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>ລາຍການເງິນກູ້</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>ລະຫັດກູ້</TableHead>
                                            <TableHead>ປະເພດ</TableHead>
                                            <TableHead className="text-right">ຈຳນວນ</TableHead>
                                            <TableHead>ສະຖານະ</TableHead>
                                            <TableHead className="w-12"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loans.length > 0 ? loans.map(loan => (
                                            <TableRow key={loan.id}>
                                                <TableCell className="font-medium">{loan.loanCode}</TableCell>
                                                <TableCell>{loan.loanType}</TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {currencies.map(c => (loan.amount?.[c] || 0) > 0 ? <div key={c}>{formatCurrency(loan.amount?.[c] || 0)} {String(c).toUpperCase()}</div> : null)}
                                                </TableCell>
                                                <TableCell>
                                                    <span className={cn(
                                                        "px-2 py-1 rounded-full text-[10px] font-medium",
                                                        loan.status === 'approved' ? "bg-green-100 text-green-700" :
                                                        loan.status === 'rejected' ? "bg-red-100 text-red-700" :
                                                        "bg-yellow-100 text-yellow-700"
                                                    )}>
                                                        {loan.status === 'approved' ? 'ອະນຸມັດ' : loan.status === 'rejected' ? 'ປະຕິເສດ' : 'ລໍຖ້າ'}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon" asChild>
                                                        <Link to={`/tee/cooperative/loans/${loan.id}`}>
                                                            <Edit className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">ຍັງບໍ່ມີລາຍການເງິນກູ້</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="overview" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>ພາບລວມການຝາກເງິນ (KIP) ປີ {getYear(new Date()) + 543}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                 <ResponsiveContainer width="100%" height={400}>
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="month" />
                                        <YAxis tickFormatter={(value) => formatCurrency(value as number)} />
                                        <Tooltip formatter={(value) => [`${formatCurrency(value as number)} KIP`, "ເງິນຝາກ"]} />
                                        <Legend />
                                        <Bar dataKey="deposit" fill="#10b981" name="ເງິນຝາກ" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>
            <AddDepositDialog 
                open={isAddDepositOpen} 
                onOpenChange={setAddDepositOpen}
                onAddDeposit={handleAddDeposit}
                memberName={member.name}
            />
            <AddWithdrawalDialog
                open={isAddWithdrawalOpen}
                onOpenChange={setAddWithdrawalOpen}
                onAddWithdrawal={handleAddWithdrawal}
                memberName={member.name}
            />
            <EditMemberDialog
                open={isEditMemberOpen}
                onOpenChange={setEditMemberOpen}
                member={member}
                onMemberUpdate={setMember}
            />

            <AlertDialog open={!!depositToDelete} onOpenChange={(open) => !open && setDepositToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບລາຍການຝາກເງິນນີ້?</AlertDialogTitle>
                        <AlertDialogDescription>
                            ການກະທຳນີ້ບໍ່ສາມາດກູ້ຄືນໄດ້.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel variant="outline" size="default">ຍົກເລີກ</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteDeposit} className="bg-red-600 hover:bg-red-700">ຢືນຢັນການລຶບ</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!withdrawalToDelete} onOpenChange={(open) => !open && setWithdrawalToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບລາຍການຖອນເງິນນີ້?</AlertDialogTitle>
                        <AlertDialogDescription>
                            ການກະທຳນີ້ບໍ່ສາມາດກູ້ຄືນໄດ້.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel variant="outline" size="default">ຍົກເລີກ</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteWithdrawal} className="bg-red-600 hover:bg-red-700">ຢືນຢັນການລຶບ</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
