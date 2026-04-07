/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Account } from '../lib/types';

export const defaultAccounts: Account[] = [
  { id: 'cash', code: '101', name: 'ເງິນສົດ (Cash)', type: 'asset' },
  { id: 'bank_bcel', code: '102', name: 'ບັນຊີ BCEL', type: 'asset' },
  { id: 'bank_bcel_cash', code: '102.1', name: 'ບັນຊີ BCEL ເງິນສົດ', type: 'asset' },
  { id: 'ar_trade', code: '103', name: 'ລູກໜີ້ການຄ້າ (A/R)', type: 'asset' },
  { id: 'ar_murabaha', code: '103.1', name: 'ລູກໜີ້ການຄ້າກຳໄລ (Murabaha)', type: 'asset' },
  { id: 'investments', code: '104', name: 'ສິນຊັບລົງທຶນ (Investments)', type: 'asset' },
  { id: 'fixed_assets', code: '105', name: 'ສິນຊັບຄົງທີ່ (Fixed Assets)', type: 'asset' },
  { id: 'deposits_payable', code: '201', name: 'ເງິນຝາກສະມາຊິກ (Deposits)', type: 'liability' },
  { id: 'capital', code: '301', name: 'ທຶນຮຸ້ນ (Share Capital)', type: 'equity' },
  { id: 'income_murabaha', code: '401', name: 'ລາຍຮັບຈາກກຳໄລ Murabaha', type: 'income' },
  { id: 'unearned_income', code: '202', name: 'ກຳໄລລໍຖ້າຮັບ (Unearned Income)', type: 'liability' },
  { id: 'income_fees', code: '402', name: 'ລາຍຮັບຄ່າທຳນຽມ', type: 'income' },
  { id: 'expense_admin', code: '501', name: 'ລາຍຈ່າຍບໍລິຫານ', type: 'expense' },
  { id: 'expense_salary', code: '502', name: 'ລາຍຈ່າຍເງິນເດືອນ', type: 'expense' },
];
