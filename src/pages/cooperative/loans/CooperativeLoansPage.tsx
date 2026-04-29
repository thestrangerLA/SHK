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
import { ArrowLeft, PlusCircle, MoreHorizontal, ChevronDown, Banknote, AlertTriangle, FileText, Search, TrendingUp, Download } from "lucide-react";
import { format, getYear } from 'date-fns';
import type { Loan, CooperativeMember, LoanRepayment, CurrencyValues } from '@/lib/types';
import { listenToCooperativeLoans, deleteLoan, listenToAllRepayments, updateLoan } from '@/services/cooperativeLoanService';
import { listenToCooperativeMembers } from '@/services/cooperativeMemberService';
import { Badge } from '@/components/ui/badge';
import { useClientRouter } from '@/hooks/useClientRouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// @ts-ignore
import html2pdf from 'html2pdf.js';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { UserNav } from '@/components/UserNav';
import { useSearchParams } from 'react-router-dom';

const formatCurrency = (value: number) => {
    if (isNaN(value)) return '0';
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
};

const initialCurrencyValues: Omit<CurrencyValues, 'cny'> = { kip: 0, thb: 0, usd: 0 };
const currencies: (keyof Omit<CurrencyValues, 'cny'>)[] = ['kip', 'thb', 'usd'];

const SummaryStatCard = ({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
);

const MultiCurrencySummaryCard = ({ title, balances, icon }: { title: string, balances: CurrencyValues, icon: React.ReactNode }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            {Object.entries(balances).map(([currency, value]) => {
                if (value === 0) return null;
                return (
                    <div key={currency} className="text-xl font-bold">
                        {formatCurrency(value as number)} <span className="text-xs text-muted-foreground">{String(currency).toUpperCase()}</span>
                    </div>
                )
            })}
            {Object.values(balances).every(v => v === 0) && <div className="text-2xl font-bold">0</div>}
        </CardContent>
    </Card>
)

const LoanTable = ({ 
    id,
    loading, 
    loans, 
    memberMap, 
    handleRowClick, 
    handleDeleteClick,
    handleApproveLoan
}: { 
    id?: string,
    loading: boolean, 
    loans: any[], 
    memberMap: Record<string, string>, 
    handleRowClick: (id: string) => void, 
    handleDeleteClick: (e: React.MouseEvent, loan: Loan) => void,
    handleApproveLoan: (loanId: string) => void
}) => (
    <Card id={id}>
        <CardContent className="pt-6">
            <div className="mb-4 text-center hidden show-on-pdf">
                <h2 className="text-xl font-bold">ລາຍງານສິນເຊື່ອສະຫະກອນ</h2>
                <p className="text-sm text-muted-foreground">ວັນທີອອກລາຍງານ: {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>ລະຫັດ/ຊື່</TableHead>
                        <TableHead className="text-right">ເງິນຕົ້ນ</TableHead>
                        <TableHead className="text-right">ຍອດຕ້ອງຈ່າຍ</TableHead>
                        <TableHead className="text-right">ຈ່າຍແລ້ວ</TableHead>
                        <TableHead className="text-right">ຍອດຄ້າງ</TableHead>
                        <TableHead className="text-right">ກຳໄລ</TableHead>
                        <TableHead>ວັນທີ</TableHead>
                        <TableHead>ສະຖານະ</TableHead>
                        <TableHead className="text-right no-pdf">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow><TableCell colSpan={10} className="text-center h-24">ກຳລັງໂຫລດ...</TableCell></TableRow>
                    ) : loans.length > 0 ? (
                        loans.map(loan => (
                            <TableRow key={loan.id} onClick={() => handleRowClick(loan.id)} className="cursor-pointer hover:bg-muted/50">
                                <TableCell>
                                    <div className="font-mono">{loan.loanCode}</div>
                                    <div>{loan.memberId ? memberMap[loan.memberId] : loan.debtorName || 'N/A'}</div>
                                </TableCell>
                                <TableCell className="text-right">
                                     {currencies.map(c => {
                                        const amount = loan.amount[c] || 0;
                                        return amount > 0 ? <div key={c}>{formatCurrency(amount)} {String(c).toUpperCase()}</div> : null;
                                    })}
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                    {currencies.map(c => {
                                        const amount = loan.repaymentAmount[c] || 0;
                                        return (loan.amount[c] || 0) > 0 ? <div key={c}>{formatCurrency(amount)} {String(c).toUpperCase()}</div> : null;
                                    })}
                                </TableCell>
                                 <TableCell className="text-right text-green-600">
                                    {currencies.map(c => {
                                        const amount = loan.totalPaid[c] || 0;
                                        return (loan.amount?.[c] || 0) > 0 || amount > 0 ? <div key={c}>{formatCurrency(amount)} {String(c).toUpperCase()}</div> : null;
                                    })}
                                </TableCell>
                                 <TableCell className="text-right text-red-600">
                                    {currencies.map(c => {
                                         if ((loan.amount?.[c] || 0) === 0 && (loan.totalPaid[c] || 0) === 0) return null;
                                         const amount = loan.outstandingBalance[c] || 0;
                                         return <div key={c}>{formatCurrency(amount)} {String(c).toUpperCase()}</div>;
                                    })}
                                </TableCell>
                                 <TableCell className="text-right text-blue-500">
                                    {currencies.map(c => {
                                        const amount = loan.profit[c] || 0;
                                        return (loan.amount?.[c] || 0) > 0 ? <div key={c}>{formatCurrency(amount)} {String(c).toUpperCase()}</div> : null;
                                    })}
                                </TableCell>
                                <TableCell>{format(loan.applicationDate, 'dd/MM/yyyy')}</TableCell>
                                <TableCell>
                                    <Badge variant={loan.calculatedStatus === 'ຈ່າຍໝົດແລ້ວ' ? 'default' : (loan.calculatedStatus === 'ລໍການອະນຸມັດ' ? 'outline' : 'destructive')}>
                                        {loan.calculatedStatus === 'ຍັງຄ້າງ' 
                                            ? `ຈ່າຍແລ້ວ ${loan.paymentPercentage.toFixed(0)}%` 
                                            : loan.calculatedStatus}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right no-pdf">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button aria-haspopup="true" size="icon" variant="ghost" onClick={(e) => e.stopPropagation()}>
                                                <MoreHorizontal className="h-4 w-4" />
                                                <span className="sr-only">Toggle menu</span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuGroup>
                                                <DropdownMenuLabel>ການດຳເນີນການ</DropdownMenuLabel>
                                                {loan.status === 'pending' && (
                                                    <DropdownMenuItem 
                                                        className="text-green-600 font-medium"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleApproveLoan(loan.id);
                                                        }}
                                                    >
                                                        ອະນຸມັດ (Approve)
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem 
                                                    className="text-red-500"
                                                    onClick={(e) => handleDeleteClick(e, loan)}
                                                >
                                                    ລົບ
                                                </DropdownMenuItem>
                                            </DropdownMenuGroup>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow><TableCell colSpan={10} className="text-center h-24">ບໍ່ມີຂໍ້ມູນສິນເຊື່ອ</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
);

export default function CooperativeLoansPage() {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [repayments, setRepayments] = useState<LoanRepayment[]>([]);
    const [members, setMembers] = useState<CooperativeMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchParams] = useSearchParams();
    const router = useClientRouter();
    const { toast } = useToast();

    const [loanToDelete, setLoanToDelete] = useState<Loan | null>(null);
    const [selectedYear, setSelectedYear] = useState<number | null>(new Date().getFullYear());
    const [currencyFilter, setCurrencyFilter] = useState<'ALL' | 'KIP' | 'THB' | 'USD'>('ALL');
    const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
    const [activeTab, setActiveTab] = useState('outstanding');


    useEffect(() => {
        const unsubscribeLoans = listenToCooperativeLoans(setLoans, () => setLoading(false));
        const unsubscribeMembers = listenToCooperativeMembers(setMembers);
        const unsubscribeRepayments = listenToAllRepayments(setRepayments);
        return () => {
            unsubscribeLoans();
            unsubscribeMembers();
            unsubscribeRepayments();
        };
    }, []);

    const availableYears = useMemo(() => {
        const years = new Set(loans.map(l => getYear(l.applicationDate)));
        return Array.from(years).sort((a, b) => (b as number) - (a as number));
    }, [loans]);

    const memberMap = useMemo(() => {
        return members.reduce((acc, member) => {
            acc[member.id] = member.name;
            return acc;
        }, {} as Record<string, string>);
    }, [members]);

    const loansWithDetails = useMemo(() => {
        const filteredByYear = loans.filter(loan => {
            if (!selectedYear) return true;
            return getYear(loan.applicationDate) === selectedYear;
        });
        
        const filteredByCurrency = currencyFilter === 'ALL'
            ? filteredByYear
            : filteredByYear.filter(loan => (loan.amount[currencyFilter.toLowerCase() as keyof Loan['amount']] || 0) > 0);

        const filteredByNameAndCode = filteredByCurrency.filter(loan => {
            if (!searchQuery) return true;
            const borrowerName = loan.memberId ? memberMap[loan.memberId] : loan.debtorName;
            const searchTerm = searchQuery.toLowerCase();
            const nameMatch = borrowerName?.toLowerCase().includes(searchTerm);
            const codeMatch = loan.loanCode?.toLowerCase().includes(searchTerm);
            return nameMatch || codeMatch;
        });

        const detailed = filteredByNameAndCode
        .sort((a, b) => a.loanCode.localeCompare(b.loanCode))
        .map(loan => {
            const loanRepayments = repayments.filter(r => r.loanId === loan.id);
            
            const totalPaid: Omit<CurrencyValues, 'cny'> = { kip: 0, thb: 0, usd: 0 };
            const outstandingBalance: Omit<CurrencyValues, 'cny'> = { kip: 0, thb: 0, usd: 0 };
            const profit: Omit<CurrencyValues, 'cny'> = { kip: 0, thb: 0, usd: 0 };

            currencies.forEach(c => {
                const totalToRepay = loan.repaymentAmount[c] || 0;
                
                totalPaid[c] = loanRepayments.reduce((sum, r) => sum + (r.amountPaid?.[c] || 0), 0);
                outstandingBalance[c] = totalToRepay - totalPaid[c];
                
                // Profit is the difference between what's to be repaid and the principal
                profit[c] = totalToRepay - (loan.amount[c] || 0);
            });
            
            const totalOutstanding = currencies.reduce((sum, c) => sum + outstandingBalance[c], 0);
            let calculatedStatus: 'ຈ່າຍໝົດແລ້ວ' | 'ຍັງຄ້າງ' | 'ລໍການອະນຸມັດ' = 'ຍັງຄ້າງ';
            if (loan.status === 'pending') {
                calculatedStatus = 'ລໍການອະນຸມັດ';
            } else if (totalOutstanding <= 0.01) {
                calculatedStatus = 'ຈ່າຍໝົດແລ້ວ';
            }

            let paymentPercentage = 0;
            const primaryCurrency = currencies.find(c => (loan.repaymentAmount[c] || 0) > 0);
            if (primaryCurrency) {
                const totalToRepay = loan.repaymentAmount[primaryCurrency] || 0;
                const paid = totalPaid[primaryCurrency] || 0;
                paymentPercentage = totalToRepay > 0 ? (paid / totalToRepay) * 100 : 0;
            }

            return { ...loan, totalPaid, outstandingBalance, profit, calculatedStatus, paymentPercentage };
        });

        if (activeTab === 'outstanding') {
            return detailed.filter(l => l.calculatedStatus === 'ຍັງຄ້າງ' || l.calculatedStatus === 'ລໍການອະນຸມັດ');
        } else {
            return detailed.filter(l => l.calculatedStatus === 'ຈ່າຍໝົດແລ້ວ');
        }
    }, [loans, repayments, selectedYear, currencyFilter, searchQuery, memberMap, activeTab]);

    const summary = useMemo(() => {
        const totalLoanCount = loansWithDetails.length;
        const pendingCount = loansWithDetails.filter(l => l.status === 'pending').length;
        const overdueCount = loansWithDetails.filter(l => l.calculatedStatus === 'ຍັງຄ້າງ').length;
        
        const totalOutstanding = loansWithDetails.reduce((acc, loan) => {
            if (loan.calculatedStatus === 'ຍັງຄ້າງ') {
                 currencies.forEach(c => {
                     acc[c] += loan.outstandingBalance[c] || 0;
                 });
            }
            return acc;
        }, { kip: 0, thb: 0, usd: 0, cny: 0 } as CurrencyValues);

        const totalProfit = loansWithDetails.reduce((acc, loan) => {
            currencies.forEach(c => {
                acc[c] += loan.profit[c] || 0;
            });
            return acc;
        }, { kip: 0, thb: 0, usd: 0, cny: 0 } as CurrencyValues);


        return { totalLoanCount, pendingCount, overdueCount, totalOutstanding, totalProfit };
    }, [loansWithDetails]);


    const handleRowClick = (loanId: string) => {
        router.push(`/tee/cooperative/loans/${loanId}`);
    };

    const handleDeleteClick = (e: React.MouseEvent, loan: Loan) => {
        e.stopPropagation();
        setLoanToDelete(loan);
    };

    const confirmDelete = async () => {
        if (!loanToDelete) return;
        try {
            await deleteLoan(loanToDelete.id);
            toast({
                title: "ລົບສິນເຊື່ອສຳເລັດ",
                description: `ສິນເຊື່ອລະຫັດ ${loanToDelete.loanCode} ໄດ້ຖືກລົບອອກແລ້ວ.`,
            });
        } catch (error) {
            console.error("Error deleting loan:", error);
            toast({
                title: "ເກີດຂໍ້ຜິດພາດ",
                description: "ບໍ່ສາມາດລົບສິນເຊື່ອໄດ້.",
                variant: "destructive",
            });
        } finally {
            setLoanToDelete(null);
        }
    };

    const handleApproveLoan = async (loanId: string) => {
        try {
            await updateLoan(loanId, { status: 'approved' });
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

    const exportToPDF = () => {
        const element = document.getElementById(`loan-table-${activeTab}`);
        if (!element) return;

        const fileName = `ລາຍງານສິນເຊື່ອ_${activeTab === 'outstanding' ? 'ຍັງຄ້າງ' : 'ຈ່າຍໝົດແລ້ວ'}_${format(new Date(), 'ddMMyyyy')}.pdf`;

        const opt = {
            margin: 10,
            filename: fileName,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };

        (html2pdf() as any).set(opt).from(element).save();
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
                            <Banknote className="h-6 w-6 text-primary" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight">ລະບົບສິນເຊື່ອສະຫະກອນ</h1>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative hidden lg:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="ຄົ້ນຫາຊື່ ຫຼື ລະຫັດກູ້ຢືມ..."
                            className="pl-9 h-10 w-[250px] bg-background/50"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="flex items-center gap-2 h-9">
                                <span>{currencyFilter === 'ALL' ? 'ທຸກສະກຸນເງິນ' : currencyFilter}</span>
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setCurrencyFilter('ALL')}>ທຸກສະກຸນເງິນ</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setCurrencyFilter('KIP')}>KIP</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setCurrencyFilter('THB')}>THB</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setCurrencyFilter('USD')}>USD</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="flex items-center gap-2 h-9">
                                <span>{selectedYear ? `ປີ ${selectedYear + 543}` : 'ທຸກໆປີ'}</span>
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedYear(null)}>ທຸກໆປີ</DropdownMenuItem>
                            {availableYears.map(year => (
                                <DropdownMenuItem key={year} onClick={() => setSelectedYear(year)}>
                                    ປີ {year + 543}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="outline" size="sm" onClick={exportToPDF} className="h-9">
                        <Download className="mr-2 h-4 w-4" />
                        Export PDF
                    </Button>
                    <Button size="sm" asChild className="h-9">
                        <Link to="/tee/cooperative/loans/new">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            ສ້າງຄຳຮ້ອງສິນເຊື່ອ
                        </Link>
                    </Button>
                    <UserNav />
                </div>
            </header>
            <main className="flex-1 p-4 sm:px-6 md:py-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <Card className="card-hover border-none shadow-sm bg-card/50 backdrop-blur-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">ສັນຍາທັງໝົດ</CardTitle>
                            <div className="bg-blue-100 p-1.5 rounded-lg">
                                <FileText className="h-4 w-4 text-blue-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{summary.totalLoanCount} <span className="text-sm font-normal text-muted-foreground">ສັນຍາ</span></div>
                        </CardContent>
                    </Card>
                    <Card className="card-hover border-none shadow-sm bg-card/50 backdrop-blur-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">ຍອດເງິນກູ້ຄົງຄ້າງ</CardTitle>
                            <div className="bg-purple-100 p-1.5 rounded-lg">
                                <Banknote className="h-4 w-4 text-purple-600" />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-1">
                            {Object.entries(summary.totalOutstanding).filter(([,v]) => (v as number) > 0).map(([c, v]) => (
                                <div key={c} className="flex justify-between items-center">
                                    <span className="text-xs font-medium text-muted-foreground uppercase">{c}</span>
                                    <span className="text-sm font-bold">{formatCurrency(v as number)}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                    <Card className="card-hover border-none shadow-sm bg-card/50 backdrop-blur-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">ລວມກຳໄລ</CardTitle>
                            <div className="bg-green-100 p-1.5 rounded-lg">
                                <TrendingUp className="h-4 w-4 text-green-600" />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-1">
                            {Object.entries(summary.totalProfit).filter(([,v]) => (v as number) > 0).map(([c, v]) => (
                                <div key={c} className="flex justify-between items-center">
                                    <span className="text-xs font-medium text-muted-foreground uppercase">{c}</span>
                                    <span className="text-sm font-bold text-green-600">{formatCurrency(v as number)}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                    <Card className="card-hover border-none shadow-sm bg-red-50/50 backdrop-blur-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-red-700">ໜີ້ຄ້າງຊຳລະ</CardTitle>
                            <div className="bg-red-100 p-1.5 rounded-lg">
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-red-700">{summary.overdueCount} <span className="text-sm font-normal text-red-600/70">ສັນຍາ</span></div>
                        </CardContent>
                    </Card>
                </div>
                
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="flex items-center justify-between mb-6">
                        <TabsList className="bg-background/50 backdrop-blur-sm p-1 border">
                            <TabsTrigger value="outstanding" className="px-6">ຍັງຄ້າງ (Outstanding)</TabsTrigger>
                            <TabsTrigger value="paid" className="px-6">ຈ່າຍໝົດແລ້ວ (Paid Off)</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="outstanding" className="mt-0">
                        <LoanTable 
                            id="loan-table-outstanding"
                            loading={loading} 
                            loans={loansWithDetails} 
                            memberMap={memberMap} 
                            handleRowClick={handleRowClick} 
                            handleDeleteClick={handleDeleteClick} 
                            handleApproveLoan={handleApproveLoan}
                        />
                    </TabsContent>
                    
                    <TabsContent value="paid" className="mt-0">
                        <LoanTable 
                            id="loan-table-paid"
                            loading={loading} 
                            loans={loansWithDetails} 
                            memberMap={memberMap} 
                            handleRowClick={handleRowClick} 
                            handleDeleteClick={handleDeleteClick} 
                            handleApproveLoan={handleApproveLoan}
                        />
                    </TabsContent>
                </Tabs>
            </main>
            <AlertDialog open={!!loanToDelete} onOpenChange={(open) => !open && setLoanToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>ຢືນຢັນການລົບ</AlertDialogTitle>
                        <AlertDialogDescription>
                            ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລົບສິນເຊື່ອລະຫັດ "{loanToDelete?.loanCode}" ຂອງ "{loanToDelete?.memberId ? memberMap[loanToDelete.memberId] : loanToDelete?.debtorName}"? 
                            ການກະທຳນີ້ຈະລົບຂໍ້ມູນການຊຳລະຄືນທັງໝົດທີ່ກ່ຽວຂ້ອງ ແລະ ບໍ່ສາມາດຍ້ອນກັບໄດ້.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel variant="outline" size="default" onClick={(e) => e.stopPropagation()}>ຍົກເລີກ</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete}>ຢືນຢັນ</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
