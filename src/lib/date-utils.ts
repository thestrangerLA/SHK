/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const LAO_MONTHS = [
    "ມັງກອນ", "ກຸມພາ", "ມີນາ", "ເມສາ", "ພຶດສະພາ", "ມິຖຸນາ",
    "ກໍລະກົດ", "ສິງຫາ", "ກັນຍາ", "ຕຸລາ", "ພະຈິກ", "ທັນວາ"
];

export const LAO_MONTHS_SHORT = [
    "ມັງກອນ", "ກຸມພາ", "ມີນາ", "ເມສາ", "ພຶດສະພາ", "ມິຖຸນາ",
    "ກໍລະກົດ", "ສິງຫາ", "ກັນຍາ", "ຕຸລາ", "ພະຈິກ", "ທັນວາ"
];

export const getLaoMonthName = (monthIndex: number, short = false) => {
    return short ? LAO_MONTHS_SHORT[monthIndex] : LAO_MONTHS[monthIndex];
};

export const calculateMembershipDuration = (joinDate: Date | string | number, asOf: Date = new Date()) => {
    if (!joinDate) return 'ບໍ່ລະບຸ';
    const start = new Date(joinDate);
    const end = new Date(asOf);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'ບໍ່ລະບຸ';
    
    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    
    if (months < 0) {
        years--;
        months += 12;
    }
    
    const yearStr = years > 0 ? `${years} ປີ` : '';
    const monthStr = months > 0 ? `${months} ເດືອນ` : '';
    
    if (years === 0 && months === 0) return 'ຫາກໍ່ສະໝັກ';
    
    return [yearStr, monthStr].filter(Boolean).join(' ');
};

export const getMembershipMonths = (joinDate: Date | string | number, asOf: Date = new Date()) => {
    const start = new Date(joinDate);
    const end = new Date(asOf);
    
    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    
    if (months < 0) {
        years--;
        months += 12;
    }
    
    return (years * 12) + months;
};
