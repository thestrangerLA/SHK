/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { format, startOfDay, isWithinInterval, startOfMonth, endOfMonth, getYear, setMonth, getMonth } from "date-fns";
import { LAO_MONTHS, calculateMembershipDuration } from '@/lib/date-utils';
import { ArrowLeft, Users, Calendar as CalendarIcon, Trash2, PlusCircle, MoreHorizontal, PiggyBank, ChevronDown, Search, TrendingUp, FileText } from "lucide-react";
import type { CooperativeMember, CooperativeDeposit, Loan, LoanRepayment, CooperativeInvestment, CurrencyValues } from '@/lib/types';
import { listenToCooperativeMembers, addCooperativeMember, deleteCooperativeMember } from '@/services/cooperativeMemberService';
import { listenToCooperativeDeposits, addCooperativeDeposit, deleteCooperativeDeposit } from '@/services/cooperativeDepositService';
import { listenToCooperativeInvestments } from '@/services/cooperativeInvestmentService';
import { listenToCooperativeLoans, listenToAllRepayments } from '@/services/cooperativeLoanService';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AddDepositDialog } from './_components/AddDepositDialog';
import { WithdrawDepositDialog } from './_components/WithdrawDepositDialog';
import { UserNav } from '@/components/UserNav';
import { cn } from "@/lib/utils";

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
};

const initialCurrencyValues: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };
const currencies: (keyof CurrencyValues)[] = ['kip', 'thb', 'usd', 'cny'];


const AddMemberDialog = ({ onAddMember }: { onAddMember: (member: Omit<CooperativeMember, 'id' | 'createdAt'>) => Promise<void> }) => {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [memberId, setMemberId] = useState('');
    const [name, setName] = useState('');
    const [joinDate, setJoinDate] = useState<Date | undefined>(new Date());
    const [deposits, setDeposits] = useState({ kip: 0, thb: 0, usd: 0, cny: 0 });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!memberId || !name || !joinDate) {
            toast({ title: "ຂໍ້ມູນບໍ່ຄົບຖ້ວນ", variant: "destructive" });
            return;
        }

        try {
            await onAddMember({
                memberId,
                name,
                joinDate: startOfDay(joinDate),
                deposits,
            });
            toast({ title: "ເພີ່ມສະມາຊິກສຳເລັດ" });
            setOpen(false);
            // Reset form
            setMemberId('');
            setName('');
            setJoinDate(new Date());
            setDeposits({ kip: 0, thb: 0, usd: 0, cny: 0 });
        } catch (error) {
            console.error("Error adding member:", error);
            toast({ title: "ເກີດຂໍ້ຜິດພາດ", variant: "destructive" });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" />ເພີ່ມສະມາຊິກ</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>ເພີ່ມສະມາຊິກໃໝ່</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="memberId">ລະຫັດສະມາຊິກ</Label>
                        <Input id="memberId" value={memberId} onChange={e => setMemberId(e.target.value)} required />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="name">ຊື່-ນາມສະກຸນ</Label>
                        <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="joinDate">ວັນທີສະໝັກ</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {joinDate ? format(joinDate, "PPP") : <span>ເລືອກວັນທີ</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar 
                                    mode="single" 
                                    selected={joinDate} 
                                    onSelect={setJoinDate} 
                                    initialFocus 
                                    captionLayout="dropdown"
                                    fromYear={2000}
                                    toYear={new Date().getFullYear() + 10}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                     <div className="grid gap-2">
                        <Label>ເງິນຝາກເລີ່ມຕົ້ນ</Label>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                           <Input type="number" placeholder="KIP" value={deposits.kip || ''} onChange={e => setDeposits(p => ({...p, kip: Number(e.target.value)}))} />
                           <Input type="number" placeholder="THB" value={deposits.thb || ''} onChange={e => setDeposits(p => ({...p, thb: Number(e.target.value)}))} />
                           <Input type="number" placeholder="USD" value={deposits.usd || ''} onChange={e => setDeposits(p => ({...p, usd: Number(e.target.value)}))} />
                           <Input type="number" placeholder="CNY" value={deposits.cny || ''} onChange={e => setDeposits(p => ({...p, cny: Number(e.target.value)}))} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>ຍົກເລີກ</Button>
                        <Button type="submit">ບັນທຶກ</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default function CooperativeMembersPage() {
    const [members, setMembers] = useState<CooperativeMember[]>([]);
    const [deposits, setDeposits] = useState<CooperativeDeposit[]>([]);
    const [investments, setInvestments] = useState<CooperativeInvestment[]>([]);
    const [loans, setLoans] = useState<Loan[]>([]);
    const [repayments, setRepayments] = useState<LoanRepayment[]>([]);
    const [displayMonth, setDisplayMonth] = useState<Date>(new Date());
    const [selectedMember, setSelectedMember] = useState<CooperativeMember | null>(null);
    const [isAddDepositOpen, setAddDepositOpen] = useState(false);
    const [isWithdrawDepositOpen, setWithdrawDepositOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
    const [depositToDelete, setDepositToDelete] = useState<string | null>(null);
    const { toast } = useToast();
    const navigate = useNavigate();

    const [viewingStatsType, setViewingStatsType] = useState<'none' | 'deposits' | 'withdrawals'>('none');

    useEffect(() => {
        const unsubscribeMembers = listenToCooperativeMembers(setMembers);
        const unsubscribeDeposits = listenToCooperativeDeposits(setDeposits);
        const unsubscribeInvestments = listenToCooperativeInvestments(setInvestments);
        const unsubscribeLoans = listenToCooperativeLoans(setLoans, () => {});
        const unsubscribeRepayments = listenToAllRepayments(setRepayments);
        return () => {
            unsubscribeMembers();
            unsubscribeDeposits();
            unsubscribeInvestments();
            unsubscribeLoans();
            unsubscribeRepayments();
        };
    }, []);
    
    const membersWithTotalDeposits = useMemo(() => {
        const endOfSelectedMonth = endOfMonth(displayMonth);
        
        const filteredMembers = members.filter(member => {
            const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                member.memberId.toLowerCase().includes(searchQuery.toLowerCase());
            const joinedBeforeOrInMonth = new Date(member.joinDate) <= endOfSelectedMonth;
            return matchesSearch && joinedBeforeOrInMonth;
        });

        return filteredMembers.map(member => {
            const memberDeposits = deposits.filter(d => d.memberId === member.id && new Date(d.date) <= endOfSelectedMonth);
            const totalDeposits = {
                kip: (member.deposits?.kip || 0) + memberDeposits.reduce((sum, d) => sum + (d.kip || 0), 0),
                thb: (member.deposits?.thb || 0) + memberDeposits.reduce((sum, d) => sum + (d.thb || 0), 0),
                usd: (member.deposits?.usd || 0) + memberDeposits.reduce((sum, d) => sum + (d.usd || 0), 0),
                cny: (member.deposits?.cny || 0) + memberDeposits.reduce((sum, d) => sum + (d.cny || 0), 0),
            };
            const shares = Math.floor(totalDeposits.kip / 100000);
            return { ...member, totalDeposits, shares, deposits: deposits.filter(d => d.memberId === member.id) };
        }).sort((a,b) => (a.memberId > b.memberId) ? 1 : -1);
    }, [members, deposits, searchQuery, displayMonth]);
    
    const filteredDeposits = (memberDeposits: CooperativeDeposit[]) => {
        const start = startOfMonth(displayMonth);
        const end = endOfMonth(displayMonth);
        return memberDeposits.filter(d => isWithinInterval(d.date, { start, end }));
    };
    
    const grandTotalDeposits = useMemo(() => {
        return membersWithTotalDeposits.reduce((sum, m) => {
            sum.kip += m.totalDeposits.kip;
            sum.thb += m.totalDeposits.thb;
            sum.usd += m.totalDeposits.usd;
            sum.cny += m.totalDeposits.cny;
            return sum;
        }, { kip: 0, thb: 0, usd: 0, cny: 0 });
    }, [membersWithTotalDeposits]);

    const totalInvestments = useMemo(() => {
        return investments.reduce((acc, investment) => {
            currencies.forEach(c => {
                acc[c] = (acc[c] || 0) + (investment.amount?.[c] || 0);
            });
            return acc;
        }, { ...initialCurrencyValues });
    }, [investments]);
    
    const totalOutstandingLoan = useMemo(() => {
         const outstanding: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };
         loans.forEach(loan => {
             const loanRepayments = repayments.filter(r => r.loanId === loan.id);
             currencies.forEach(c => {
                const totalToRepay = loan.repaymentAmount[c] || 0;
                const paidForCurrency = loanRepayments.reduce((sum, r) => sum + (r.amountPaid?.[c] || 0), 0);
                const outstandingForLoan = totalToRepay - paidForCurrency;
                if (outstandingForLoan > 0) {
                   outstanding[c] += outstandingForLoan;
                }
             })
         });
         return outstanding;
    }, [loans, repayments]);

    const totalCooperativeMoney = useMemo(() => {
        const total = { ...initialCurrencyValues };
        currencies.forEach(c => {
            total[c] = (grandTotalDeposits[c] || 0) + (totalInvestments[c] || 0) + (totalOutstandingLoan[c] || 0);
        });
        return total;
    }, [grandTotalDeposits, totalInvestments, totalOutstandingLoan]);

    const monthlyStats = useMemo(() => {
        const start = startOfMonth(displayMonth);
        const end = endOfMonth(displayMonth);
        
        const stats = {
            deposits: { ...initialCurrencyValues },
            withdrawals: { ...initialCurrencyValues }
        };

        deposits.forEach(d => {
            if (isWithinInterval(d.date, { start, end })) {
                currencies.forEach(c => {
                    const val = d[c] || 0;
                    if (val > 0) {
                        stats.deposits[c] += val;
                    } else if (val < 0) {
                        stats.withdrawals[c] += Math.abs(val);
                    }
                });
            }
        });

        return stats;
    }, [deposits, displayMonth]);


    const handleAddMember = async (member: Omit<CooperativeMember, 'id' | 'createdAt'>) => {
        await addCooperativeMember(member);
    };

    const handleDeleteMember = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setMemberToDelete(id);
    };
    
    const confirmDeleteMember = async () => {
        if (!memberToDelete) return;
        try {
            await deleteCooperativeMember(memberToDelete);
            toast({ title: "ລຶບສະມາຊິກສຳເລັດ" });
        } catch (error) {
            toast({ title: "ເກີດຂໍ້ຜິດພາດ", variant: "destructive" });
        } finally {
            setMemberToDelete(null);
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
    
    const handleAddDeposit = async (deposit: Omit<CooperativeDeposit, 'id' | 'createdAt' | 'memberName' | 'memberId'>) => {
        if (!selectedMember) return;
        try {
            await addCooperativeDeposit({
                memberId: selectedMember.id,
                memberName: selectedMember.name,
                ...deposit
            });
            toast({ title: "ເພີ່ມເງິນຝາກສຳເລັດ" });
        } catch (error) {
            toast({ title: "ເກີດຂໍ້ຜິດພາດ", variant: "destructive" });
        }
    };
     const handleWithdrawDeposit = async (withdrawal: Omit<CooperativeDeposit, 'id' | 'createdAt' | 'memberName' | 'memberId'>) => {
        if (!selectedMember) return;
        try {
            await addCooperativeDeposit({
                memberId: selectedMember.id,
                memberName: selectedMember.name,
                date: withdrawal.date,
                kip: -Math.abs(withdrawal.kip),
                thb: -Math.abs(withdrawal.thb),
                usd: -Math.abs(withdrawal.usd),
                cny: -Math.abs(withdrawal.cny),
            });
            toast({ title: "ບັນທຶກການຖອນເງິນສຳເລັດ" });
        } catch (error) {
            toast({ title: "ເກີດຂໍ້ຜິດພາດໃນການຖອນເງິນ", variant: "destructive" });
        }
    };
    
    const openAddDepositDialog = (member: CooperativeMember) => {
        setSelectedMember(member);
        setAddDepositOpen(true);
    }
     const openWithdrawDepositDialog = (member: CooperativeMember) => {
        setSelectedMember(member);
        setWithdrawDepositOpen(true);
    };
    
    const MonthYearSelector = () => {
        const currentYear = getYear(new Date());
        const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
        years.push(2025);
        const uniqueYears = [...new Set(years)].sort();

        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                        {displayMonth ? `${LAO_MONTHS[getMonth(displayMonth)]} ${getYear(displayMonth) + 543}` : 'Select Month'}
                        <ChevronDown className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {uniqueYears.map(year => (
                         <div key={year}>
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                    <span>{year + 543}</span>
                                </DropdownMenuSubTrigger>
                                <DropdownMenuPortal>
                                    <DropdownMenuSubContent>
                                        {LAO_MONTHS.map((monthName, monthIndex) => (
                                            <DropdownMenuItem 
                                                key={monthIndex} 
                                                onClick={() => {
                                                    const newDate = new Date(year, monthIndex, 1);
                                                    setDisplayMonth(newDate);
                                                }}
                                            >
                                                {monthName}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuSubContent>
                                 </DropdownMenuPortal>
                            </DropdownMenuSub>
                         </div>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        );
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
                            <Users className="h-6 w-6 text-primary" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight">ລະບົບບັນຊີສະມາຊິກ ແລະ ເງິນຝາກ</h1>
                    </div>
                </div>
                 <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" asChild className="hidden md:flex">
                        <Link to="/tee/cooperative/reports/monthly">
                            <FileText className="mr-2 h-4 w-4" />
                            ລາຍງານປະຈຳເດືອນ
                        </Link>
                    </Button>
                    <MonthYearSelector />
                    <AddMemberDialog onAddMember={handleAddMember} />
                    <UserNav />
                </div>
            </header>
            <main className="flex-1 p-4 sm:px-6 md:py-8">
                 <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
                    <Card className="card-hover border-none shadow-sm bg-card/50 backdrop-blur-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">ສະມາຊິກທັງໝົດ</CardTitle>
                            <div className="bg-blue-100 p-1.5 rounded-lg">
                                <Users className="h-4 w-4 text-blue-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{membersWithTotalDeposits.length} <span className="text-sm font-normal text-muted-foreground">ຄົນ</span></div>
                        </CardContent>
                    </Card>
                    <Card className="card-hover border-none shadow-sm bg-card/50 backdrop-blur-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">ຍອດເງິນຝາກລວມທັງໝົດ</CardTitle>
                            <div className="bg-purple-100 p-1.5 rounded-lg">
                                <PiggyBank className="h-4 w-4 text-purple-600" />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-1">
                            {Object.entries(grandTotalDeposits).filter(([,v]) => (v as number) > 0).map(([c, v]) => (
                                <div key={c} className="flex justify-between items-center">
                                    <span className="text-xs font-medium text-muted-foreground uppercase">{c}</span>
                                    <span className="text-sm font-bold">{formatCurrency(v as number)}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                    <Card className="card-hover border-none shadow-sm bg-green-50/50 backdrop-blur-sm cursor-pointer" onClick={() => setViewingStatsType('deposits')}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-green-700">ຍອດຝາກປະຈຳເດືອນ</CardTitle>
                            <div className="bg-green-100 p-1.5 rounded-lg">
                                <TrendingUp className="h-4 w-4 text-green-600" />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-1">
                            {Object.entries(monthlyStats.deposits).filter(([,v]) => (v as number) > 0).map(([c, v]) => (
                                <div key={c} className="flex justify-between items-center">
                                    <span className="text-xs font-medium text-green-600/70 uppercase">{c}</span>
                                    <span className="text-sm font-bold text-green-700">{formatCurrency(v as number)}</span>
                                </div>
                            ))}
                            {Object.values(monthlyStats.deposits).every(v => v === 0) && <p className="text-sm text-muted-foreground">ບໍ່ມີລາຍການ</p>}
                        </CardContent>
                    </Card>
                    <Card className="card-hover border-none shadow-sm bg-red-50/50 backdrop-blur-sm cursor-pointer" onClick={() => setViewingStatsType('withdrawals')}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-red-700">ຍອດຖອນປະຈຳເດືອນ</CardTitle>
                            <div className="bg-red-100 p-1.5 rounded-lg">
                                <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-1">
                            {Object.entries(monthlyStats.withdrawals).filter(([,v]) => (v as number) > 0).map(([c, v]) => (
                                <div key={c} className="flex justify-between items-center">
                                    <span className="text-xs font-medium text-red-600/70 uppercase">{c}</span>
                                    <span className="text-sm font-bold text-red-700">{formatCurrency(v as number)}</span>
                                </div>
                            ))}
                            {Object.values(monthlyStats.withdrawals).every(v => v === 0) && <p className="text-sm text-muted-foreground">ບໍ່ມີລາຍການ</p>}
                        </CardContent>
                    </Card>
                </div>
                <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
                    <CardHeader className="pb-4">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <CardTitle className="text-xl">ລາຍຊື່ສະມາຊິກ</CardTitle>
                                <CardDescription>ກົດທີ່ລາຍການເພື່ອເບິ່ງປະຫວັດການຝາກເງິນ</CardDescription>
                            </div>
                            <div className="relative w-full md:w-80">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder="ຄົ້ນຫາຕາມຊື່ ຫຼື ລະຫັດ..."
                                    className="pl-9 h-10 bg-background/50"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                             {membersWithTotalDeposits.map(member => {
                                const monthlyDeposits = filteredDeposits(member.deposits);
                                return (
                                <AccordionItem value={member.id} key={member.id}>
                                    <div className="relative flex items-center group">
                                        <AccordionTrigger className="hover:bg-muted/50 px-4 rounded-md flex-1 pr-24">
                                            <div className="flex justify-between items-center w-full">
                                                <div className="text-left">
                                                    <p className="font-semibold">{member.name} <span className="font-mono text-xs text-muted-foreground">({member.memberId})</span></p>
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm text-muted-foreground">
                                                        <span>ສະໝັກວັນທີ: {member.joinDate && !isNaN(new Date(member.joinDate).getTime()) ? format(new Date(member.joinDate), 'dd/MM/yyyy') : 'ບໍ່ລະບຸ'}</span>
                                                        <span className="text-[10px] sm:text-xs bg-primary/5 px-2 py-0.5 rounded-full text-primary font-medium w-fit">
                                                            ເປັນສະມາຊິກມາແລ້ວ: {member.joinDate ? calculateMembershipDuration(member.joinDate, endOfMonth(displayMonth)) : 'ບໍ່ລະບຸ'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4 mr-8">
                                                    <div className="text-right text-sm">
                                                        <p className="font-bold text-blue-600">{member.shares} ຫຸ້ນ</p>
                                                    </div>
                                                    <div className="text-right text-xs">
                                                        <p>KIP: <span className="font-semibold">{formatCurrency(member.totalDeposits.kip)}</span></p>
                                                        <p>THB: <span className="font-semibold">{formatCurrency(member.totalDeposits.thb)}</span></p>
                                                        <p>USD: <span className="font-semibold">{formatCurrency(member.totalDeposits.usd)}</span></p>
                                                        <p>CNY: <span className="font-semibold">{formatCurrency(member.totalDeposits.cny)}</span></p>
                                                    </div>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <div className="absolute right-10 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1">
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="hidden sm:flex h-8 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                onClick={() => navigate(`/tee/cooperative/members/${member.id}`)}
                                            >
                                                ເບິ່ງລາຍລະອຽດ
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuGroup>
                                                        <DropdownMenuLabel>ການດຳເນີນການ</DropdownMenuLabel>
                                                        <DropdownMenuItem onSelect={() => navigate(`/tee/cooperative/members/${member.id}`)}>ເບິ່ງໜ້າລາຍລະອຽດ</DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => openAddDepositDialog(member)}>ເພີ່ມເງິນຝາກ</DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => openWithdrawDepositDialog(member)} className="text-orange-600">ຖອນເງິນຝາກ</DropdownMenuItem>
                                                        <DropdownMenuItem className="text-red-500" onSelect={(e) => handleDeleteMember(e, member.id)}>ລຶບສະມາຊິກ</DropdownMenuItem>
                                                    </DropdownMenuGroup>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                    <AccordionContent className="p-4 bg-muted/20">
                                         <h4 className="font-semibold mb-2">ປະຫວັດການເຄື່ອນໄຫວເງິນຝາກເດືອນ {displayMonth ? LAO_MONTHS[getMonth(displayMonth)] : ''}</h4>
                                         {monthlyDeposits.length > 0 ? (
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
                                                    {monthlyDeposits.map(deposit => (
                                                        <TableRow key={deposit.id} className={deposit.kip < 0 || deposit.thb < 0 || deposit.usd < 0 || deposit.cny < 0 ? 'bg-red-50/50' : ''}>
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
                                                    ))}
                                                </TableBody>
                                            </Table>
                                         ) : (
                                             <p className="text-sm text-muted-foreground text-center py-4">ບໍ່ມີການເຄື່ອນໄຫວໃນເດືອນນີ້.</p>
                                         )}
                                    </AccordionContent>
                                </AccordionItem>
                            )})}
                        </Accordion>
                         {membersWithTotalDeposits.length === 0 && (
                            <div className="text-center text-muted-foreground py-16">
                                ຍັງບໍ່ມີສະມາຊິກ. ກົດ "ເພີ່ມສະມາຊິກ" ເພື່ອເລີ່ມຕົ້ນ.
                            </div>
                         )}
                    </CardContent>
                </Card>
            </main>
            {selectedMember && (
                <AddDepositDialog
                    open={isAddDepositOpen}
                    onOpenChange={setAddDepositOpen}
                    onAddDeposit={handleAddDeposit}
                    memberName={selectedMember.name}
                />
            )}
             {selectedMember && (
                <WithdrawDepositDialog
                    open={isWithdrawDepositOpen}
                    onOpenChange={setWithdrawDepositOpen}
                    onWithdrawDeposit={handleWithdrawDeposit}
                    memberName={selectedMember.name}
                />
            )}

            <Dialog open={viewingStatsType !== 'none'} onOpenChange={(open) => !open && setViewingStatsType('none')}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            ລາຍລະອຽດ{viewingStatsType === 'deposits' ? 'ການຝາກ' : 'ການຖອນ'}ເງິນປະຈຳເດືອນ {LAO_MONTHS[getMonth(displayMonth)]} {getYear(displayMonth) + 543}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
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
                                {deposits
                                    .filter(d => {
                                        const start = startOfMonth(displayMonth);
                                        const end = endOfMonth(displayMonth);
                                        if (!isWithinInterval(d.date, { start, end })) return false;
                                        
                                        const hasPositive = (d.kip || 0) > 0 || (d.thb || 0) > 0 || (d.usd || 0) > 0 || (d.cny || 0) > 0;
                                        const hasNegative = (d.kip || 0) < 0 || (d.thb || 0) < 0 || (d.usd || 0) < 0 || (d.cny || 0) < 0;
                                        
                                        return viewingStatsType === 'deposits' ? hasPositive : hasNegative;
                                    })
                                    .sort((a, b) => b.date.getTime() - a.date.getTime())
                                    .map(d => (
                                        <TableRow key={d.id}>
                                            <TableCell>{format(d.date, 'dd/MM/yyyy')}</TableCell>
                                            <TableCell className="font-medium">{d.memberName}</TableCell>
                                            <TableCell className={cn("text-right font-mono", viewingStatsType === 'withdrawals' ? 'text-red-600' : 'text-green-600')}>
                                                {formatCurrency(Math.abs(d.kip || 0))}
                                            </TableCell>
                                            <TableCell className={cn("text-right font-mono", viewingStatsType === 'withdrawals' ? 'text-red-600' : 'text-green-600')}>
                                                {formatCurrency(Math.abs(d.thb || 0))}
                                            </TableCell>
                                            <TableCell className={cn("text-right font-mono", viewingStatsType === 'withdrawals' ? 'text-red-600' : 'text-green-600')}>
                                                {formatCurrency(Math.abs(d.usd || 0))}
                                            </TableCell>
                                            <TableCell className={cn("text-right font-mono", viewingStatsType === 'withdrawals' ? 'text-red-600' : 'text-green-600')}>
                                                {formatCurrency(Math.abs(d.cny || 0))}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                {deposits.filter(d => {
                                    const start = startOfMonth(displayMonth);
                                    const end = endOfMonth(displayMonth);
                                    if (!isWithinInterval(d.date, { start, end })) return false;
                                    const hasPositive = (d.kip || 0) > 0 || (d.thb || 0) > 0 || (d.usd || 0) > 0 || (d.cny || 0) > 0;
                                    const hasNegative = (d.kip || 0) < 0 || (d.thb || 0) < 0 || (d.usd || 0) < 0 || (d.cny || 0) < 0;
                                    return viewingStatsType === 'deposits' ? hasPositive : hasNegative;
                                }).length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            ບໍ່ມີລາຍການໃນເດືອນນີ້
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!memberToDelete} onOpenChange={(open) => !open && setMemberToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບສະມາຊິກຄົນນີ້?</AlertDialogTitle>
                        <AlertDialogDescription>
                            ການກະທຳນີ້ຈະລຶບຂໍ້ມູນເງິນຝາກທັງໝົດຂອງສະມາຊິກຄົນນີ້ອອກໄປນຳ ແລະ ບໍ່ສາມາດກູ້ຄືນໄດ້.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel variant="outline" size="default">ຍົກເລີກ</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteMember} className="bg-red-600 hover:bg-red-700">ຢືນຢັນການລຶບ</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

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
        </div>
    );
}
