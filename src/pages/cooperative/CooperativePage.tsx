/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Landmark, Users, FilePieChart, Handshake, BookOpen, TrendingUp, Building, FileText } from "lucide-react"
import { Link } from 'react-router-dom'
import { Button } from "@/components/ui/button"

import { UserNav } from "@/components/UserNav"

export default function CooperativePage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-br from-background via-background to-primary/5">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 backdrop-blur-md px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" asChild>
            <Link to="/">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">ກັບໄປໜ້າຫຼັກ</span>
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-xl">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gradient">ລະບົບສະຫະກອນອິດສະລາມ</h1>
          </div>
        </div>
        <UserNav />
      </header>
      <main className="flex-1 flex flex-col items-center py-12 px-4">
        <div className="text-center mb-12 space-y-2">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">ຍິນດີຕ້ອນຮັບເຂົ້າສູ່ລະບົບ</h2>
          <p className="text-muted-foreground text-lg">ເລືອກເມນູທີ່ທ່ານຕ້ອງການຈັດການຂໍ້ມູນ</p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 w-full max-w-7xl">
          <Link to="/tee/cooperative/accounting">
            <Card className="card-hover border-none shadow-sm cursor-pointer h-full bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-xl font-bold">ການບັນຊີ</CardTitle>
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Landmark className="h-6 w-6 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  ບັນທຶກລາຍຮັບ-ລາຍຈ່າຍ ແລະ ເບິ່ງພາບລວມການເງິນຂອງສະຫະກອນ
                </p>
              </CardContent>
            </Card>
          </Link>
          
          <Link to="/tee/cooperative/income-expense">
            <Card className="card-hover border-none shadow-sm cursor-pointer h-full bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-xl font-bold">ລາຍຮັບ-ລາຍຈ່າຍ</CardTitle>
                <div className="bg-green-100 p-2 rounded-lg">
                  <BookOpen className="h-6 w-6 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  ເບິ່ງລາຍການເຄື່ອນໄຫວບັນຊີທັງໝົດ ແລະ ປະຫວັດທຸລະກຳ
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/tee/cooperative/members">
            <Card className="card-hover border-none shadow-sm cursor-pointer h-full bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-xl font-bold">ສະມາຊິກ ແລະ ເງິນຝາກ</CardTitle>
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  ຈັດການຂໍ້ມູນສະມາຊິກ, ປະຫວັດການຝາກ-ຖອນ ແລະ ຍອດເງິນຄົງເຫຼືອ
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/tee/cooperative/loans">
            <Card className="card-hover border-none shadow-sm cursor-pointer h-full bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-xl font-bold">ລະບົບສິນເຊື່ອ</CardTitle>
                <div className="bg-orange-100 p-2 rounded-lg">
                  <Handshake className="h-6 w-6 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  ສ້າງສັນຍາສິນເຊື່ອ, ຕິດຕາມການຊຳລະ ແລະ ຄິດໄລ່ກຳໄລ
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/tee/cooperative/investments">
            <Card className="card-hover border-none shadow-sm cursor-pointer h-full bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-xl font-bold">ການລົງທຶນ</CardTitle>
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-indigo-600" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  ບັນທຶກ ແລະ ຕິດຕາມການລົງທຶນຂອງສະຫະກອນໃນໂຄງການຕ່າງໆ
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/tee/cooperative/fixed-assets">
            <Card className="card-hover border-none shadow-sm cursor-pointer h-full bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-xl font-bold">ສິນຊັບຄົງທີ່</CardTitle>
                <div className="bg-amber-100 p-2 rounded-lg">
                  <Building className="h-6 w-6 text-amber-600" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  ຈັດການ ແລະ ຕິດຕາມສິນຊັບຄົງທີ່, ຄ່າເສື່ອມລາຄາ ແລະ ອຸປະກອນ
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/tee/cooperative/ar">
            <Card className="card-hover border-none shadow-sm cursor-pointer h-full bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-xl font-bold">ລູກໜີ້ການຄ້າ</CardTitle>
                <div className="bg-rose-100 p-2 rounded-lg">
                  <FileText className="h-6 w-6 text-rose-600" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  ຕິດຕາມລູກໜີ້ການຄ້າ, ໃບບິນຄ້າງຊຳລະ ແລະ ກຳນົດການຊຳລະເງິນ
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/tee/cooperative/reports" className="md:col-span-2 lg:col-span-3 xl:col-span-2">
            <Card className="card-hover border-none shadow-sm cursor-pointer h-full bg-primary text-primary-foreground">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-xl font-bold">ລາຍງານທັງໝົດ</CardTitle>
                <div className="bg-white/20 p-2 rounded-lg">
                  <FilePieChart className="h-6 w-6 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-primary-foreground/90 leading-relaxed">
                  ສະຫຼຸບລາຍງານການຝາກ-ຖອນ, ສິນເຊື່ອ, ລາຍຮັບ-ລາຍຈ່າຍ ແລະ ຜົນປະກອບການ
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  )
}
