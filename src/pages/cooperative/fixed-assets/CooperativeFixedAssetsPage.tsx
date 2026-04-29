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
import { ArrowLeft, PlusCircle, Building, Search, X, Download, MoreHorizontal, Trash2, MapPin, Calendar, BookOpen } from "lucide-react";
import { format } from 'date-fns';
import type { FixedAsset, CurrencyValues } from '@/lib/types';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { addFixedAsset, listenToFixedAssets, deleteFixedAsset } from '@/services/cooperativeFixedAssetService';
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

export default function CooperativeFixedAssetsPage() {
    const [assets, setAssets] = useState<FixedAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [assetToDelete, setAssetToDelete] = useState<FixedAsset | null>(null);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const { toast } = useToast();

    // Form state
    const [newCode, setNewCode] = useState('');
    const [newName, setNewName] = useState('');
    const [newPrice, setNewPrice] = useState({ kip: 0, thb: 0, usd: 0, cny: 0 });
    const [newDate, setNewDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [newLocation, setNewLocation] = useState('');
    const [newLife, setNewLife] = useState(5);
    const [newStatus, setNewStatus] = useState<FixedAsset['status']>('active');

    useEffect(() => {
        const unsubscribe = listenToFixedAssets((data) => {
            setAssets(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleAddAsset = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addFixedAsset({
                code: newCode,
                name: newName,
                purchasePrice: newPrice,
                purchaseDate: new Date(newDate),
                location: newLocation,
                usefulLifeYears: newLife,
                residualValue: { kip: 0, thb: 0, usd: 0, cny: 0 },
                status: newStatus,
            });
            toast({
                title: "ເພີ່ມສິນຊັບສຳເລັດ",
                description: `ສິນຊັບ "${newName}" ໄດ້ຖືກບັນທຶກແລ້ວ.`,
            });
            setIsAddDialogOpen(false);
            setNewCode('');
            setNewName('');
            setNewPrice({ kip: 0, thb: 0, usd: 0, cny: 0 });
            setNewDate(format(new Date(), 'yyyy-MM-dd'));
            setNewLocation('');
            setNewLife(5);
            setNewStatus('active');
        } catch (error) {
            toast({
                title: "ເກີດຂໍ້ຜິດພາດ",
                description: "ບໍ່ສາມາດເພີ່ມສິນຊັບໄດ້.",
                variant: "destructive",
            });
        }
    };

    const filteredAssets = useMemo(() => {
        return assets.filter(asset => 
            asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.code.toLowerCase().includes(searchQuery.toLowerCase())
        ).sort((a, b) => b.purchaseDate.getTime() - a.purchaseDate.getTime());
    }, [assets, searchQuery]);

    const totalValue = useMemo(() => {
        return filteredAssets.reduce((acc, asset) => {
            acc.kip += asset.purchasePrice.kip || 0;
            acc.thb += asset.purchasePrice.thb || 0;
            acc.usd += asset.purchasePrice.usd || 0;
            return acc;
        }, { kip: 0, thb: 0, usd: 0 });
    }, [filteredAssets]);

    const handleDelete = async () => {
        if (!assetToDelete) return;
        try {
            await deleteFixedAsset(assetToDelete.id);
            toast({
                title: "ລົບສິນຊັບຄົງທີ່ສຳເລັດ",
                description: `ສິນຊັບ "${assetToDelete.name}" ໄດ້ຖືກລົບອອກແລ້ວ.`,
            });
        } catch (error) {
            toast({
                title: "ເກີດຂໍ້ຜິດພາດ",
                description: "ບໍ່ສາມາດລົບສິນຊັບໄດ້.",
                variant: "destructive",
            });
        } finally {
            setAssetToDelete(null);
        }
    };

    const getStatusBadge = (status: FixedAsset['status']) => {
        switch (status) {
            case 'active':
                return <Badge variant="default" className="bg-green-500 hover:bg-green-600">ໃຊ້ງານຢູ່</Badge>;
            case 'disposed':
                return <Badge variant="destructive">ຈຳໜ່າຍແລ້ວ</Badge>;
            case 'maintenance':
                return <Badge variant="outline" className="text-orange-500 border-orange-500">ກຳລັງສ້ອມແປງ</Badge>;
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
                            <Building className="h-6 w-6 text-primary" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight">ສິນຊັບຄົງທີ່</h1>
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
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">ລວມມູນຄ່າສິນຊັບ (KIP)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(totalValue.kip)} KIP</div>
                        </CardContent>
                    </Card>
                    <Card className="card-hover border-none shadow-sm bg-card/50 backdrop-blur-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">ລວມມູນຄ່າສິນຊັບ (THB)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(totalValue.thb)} THB</div>
                        </CardContent>
                    </Card>
                    <Card className="card-hover border-none shadow-sm bg-card/50 backdrop-blur-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">ລວມມູນຄ່າສິນຊັບ (USD)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(totalValue.usd)} USD</div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
                    <CardHeader className="pb-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <CardTitle className="text-xl">ລາຍການສິນຊັບຄົງທີ່</CardTitle>
                                <CardDescription>ຈັດການ ແລະ ຕິດຕາມສິນຊັບຄົງທີ່ຂອງສະຫະກອນ</CardDescription>
                            </div>
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <div className="relative w-full md:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="ຄົ້ນຫາສິນຊັບ..."
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
                                            ເພີ່ມສິນຊັບ
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[500px]">
                                        <form onSubmit={handleAddAsset}>
                                            <DialogHeader>
                                                <DialogTitle>ເພີ່ມສິນຊັບຄົງທີ່ໃໝ່</DialogTitle>
                                                <DialogDescription>
                                                    ກະລຸນາປ້ອນຂໍ້ມູນສິນຊັບທີ່ຕ້ອງການບັນທຶກ.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="grid gap-4 py-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="code">ລະຫັດສິນຊັບ</Label>
                                                        <Input
                                                            id="code"
                                                            value={newCode}
                                                            onChange={(e) => setNewCode(e.target.value)}
                                                            placeholder="ຕົວຢ່າງ: FA-001"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="name">ຊື່ສິນຊັບ</Label>
                                                        <Input
                                                            id="name"
                                                            value={newName}
                                                            onChange={(e) => setNewName(e.target.value)}
                                                            placeholder="ຕົວຢ່າງ: ຄອມພິວເຕີ..."
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="kip">ລາຄາຊື້ (KIP)</Label>
                                                        <Input
                                                            id="kip"
                                                            type="number"
                                                            value={newPrice.kip}
                                                            onChange={(e) => setNewPrice({ ...newPrice, kip: parseFloat(e.target.value) || 0 })}
                                                        />
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="thb">ລາຄາຊື້ (THB)</Label>
                                                        <Input
                                                            id="thb"
                                                            type="number"
                                                            value={newPrice.thb}
                                                            onChange={(e) => setNewPrice({ ...newPrice, thb: parseFloat(e.target.value) || 0 })}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="usd">ລາຄາຊື້ (USD)</Label>
                                                        <Input
                                                            id="usd"
                                                            type="number"
                                                            value={newPrice.usd}
                                                            onChange={(e) => setNewPrice({ ...newPrice, usd: parseFloat(e.target.value) || 0 })}
                                                        />
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="date">ວັນທີຊື້</Label>
                                                        <Input
                                                            id="date"
                                                            type="date"
                                                            value={newDate}
                                                            onChange={(e) => setNewDate(e.target.value)}
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="location">ສະຖານທີ່ຕັ້ງ</Label>
                                                        <Input
                                                            id="location"
                                                            value={newLocation}
                                                            onChange={(e) => setNewLocation(e.target.value)}
                                                            placeholder="ຕົວຢ່າງ: ຫ້ອງການຊັ້ນ 1"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="life">ອາຍຸການໃຊ້ງານ (ປີ)</Label>
                                                        <Input
                                                            id="life"
                                                            type="number"
                                                            value={newLife}
                                                            onChange={(e) => setNewLife(parseInt(e.target.value) || 0)}
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="status">ສະຖານະ</Label>
                                                    <Select value={newStatus} onValueChange={(v: any) => setNewStatus(v)}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="ເລືອກສະຖານະ" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="active">ໃຊ້ງານຢູ່</SelectItem>
                                                            <SelectItem value="maintenance">ກຳລັງສ້ອມແປງ</SelectItem>
                                                            <SelectItem value="disposed">ຈຳໜ່າຍແລ້ວ</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button type="submit">ບັນທຶກສິນຊັບ</Button>
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
                                        <TableHead>ລະຫັດ/ຊື່ສິນຊັບ</TableHead>
                                        <TableHead className="text-right">ລາຄາຊື້</TableHead>
                                        <TableHead>ສະຖານທີ່/ວັນທີ</TableHead>
                                        <TableHead>ສະຖານະ</TableHead>
                                        <TableHead className="w-[100px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">ກຳລັງໂຫລດ...</TableCell>
                                        </TableRow>
                                    ) : filteredAssets.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">ບໍ່ມີຂໍ້ມູນສິນຊັບ</TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredAssets.map((asset) => (
                                            <TableRow key={asset.id} className="hover:bg-muted/30 transition-colors">
                                                <TableCell>
                                                    <div className="font-mono text-xs text-muted-foreground">{asset.code}</div>
                                                    <div className="font-medium">{asset.name}</div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {asset.purchasePrice.kip > 0 && <div>{formatCurrency(asset.purchasePrice.kip)} KIP</div>}
                                                    {asset.purchasePrice.thb > 0 && <div>{formatCurrency(asset.purchasePrice.thb)} THB</div>}
                                                    {asset.purchasePrice.usd > 0 && <div>{formatCurrency(asset.purchasePrice.usd)} USD</div>}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                        <MapPin className="h-3 w-3" />
                                                        {asset.location}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                        <Calendar className="h-3 w-3" />
                                                        {format(asset.purchaseDate, 'dd/MM/yyyy')}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{getStatusBadge(asset.status)}</TableCell>
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
                                                                    onClick={() => setAssetToDelete(asset)}
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

            <AlertDialog open={!!assetToDelete} onOpenChange={(open) => !open && setAssetToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>ຢືນຢັນການລົບ</AlertDialogTitle>
                        <AlertDialogDescription>
                            ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລົບສິນຊັບ "{assetToDelete?.name}"? ການກະທຳນີ້ບໍ່ສາມາດຍ້ອນກັບໄດ້.
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
