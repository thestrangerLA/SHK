/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, addDoc, deleteDoc, doc, onSnapshot, updateDoc, query, where, getDocs, writeBatch, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Loan, LoanRepayment, CurrencyValues } from '../lib/types';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';
import { createTransaction } from './cooperativeAccountingService';

const LOANS_COLLECTION = 'cooperativeLoans';
const REPAYMENTS_COLLECTION = 'cooperativeLoanRepayments';

export const listenToCooperativeLoans = (callback: (loans: Loan[]) => void, onLoadingComplete?: () => void) => {
  return onSnapshot(collection(db, LOANS_COLLECTION), (snapshot) => {
    const loans = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      applicationDate: doc.data().applicationDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as Loan[];
    callback(loans);
    if (onLoadingComplete) onLoadingComplete();
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, LOANS_COLLECTION);
  });
};

export const listenToLoan = (id: string, callback: (loan: Loan | null) => void) => {
  return onSnapshot(doc(db, LOANS_COLLECTION, id), (docSnap) => {
    if (docSnap.exists()) {
      callback({
        id: docSnap.id,
        ...docSnap.data(),
        applicationDate: docSnap.data().applicationDate?.toDate(),
        createdAt: docSnap.data().createdAt?.toDate(),
      } as Loan);
    } else {
      callback(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `${LOANS_COLLECTION}/${id}`);
  });
};

export const listenToLoansByMember = (memberId: string, callback: (loans: Loan[]) => void) => {
  const q = query(collection(db, LOANS_COLLECTION), where('memberId', '==', memberId));
  return onSnapshot(q, (snapshot) => {
    const loans = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      applicationDate: doc.data().applicationDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as Loan[];
    callback(loans);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, LOANS_COLLECTION);
  });
};

export const addLoan = async (loan: Omit<Loan, 'id' | 'createdAt' | 'status'>) => {
  try {
    const docRef = await addDoc(collection(db, LOANS_COLLECTION), {
      ...loan,
      status: 'pending',
      createdAt: new Date(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, LOANS_COLLECTION);
  }
};

export const updateLoan = async (id: string, loan: Partial<Loan>) => {
  try {
    // If status is changing to approved, create accounting transactions
    if (loan.status === 'approved') {
      const loanSnap = await getDoc(doc(db, LOANS_COLLECTION, id));
      if (loanSnap.exists()) {
        const loanData = loanSnap.data() as Loan;
        
        // 1. Record the principal payout: Debit Murabaha Receivables (103.1), Credit Cash (101)
        await createTransaction(
          'ar_murabaha',
          'cash',
          loanData.amount,
          `ອະນຸມັດສິນເຊື່ອ (ເງິນຕົ້ນ): ${loanData.loanCode}`,
          new Date()
        );

        // 2. Record the profit as unearned: Debit Murabaha Receivables (103.1), Credit Unearned Income (202)
        const profit: CurrencyValues = {
          kip: (loanData.repaymentAmount.kip || 0) - (loanData.amount.kip || 0),
          thb: (loanData.repaymentAmount.thb || 0) - (loanData.amount.thb || 0),
          usd: (loanData.repaymentAmount.usd || 0) - (loanData.amount.usd || 0),
          cny: (loanData.repaymentAmount.cny || 0) - (loanData.amount.cny || 0),
        };

        const hasProfit = (Object.values(profit) as number[]).some(v => v > 0);
        if (hasProfit) {
          await createTransaction(
            'ar_murabaha',
            'unearned_income',
            profit,
            `ກຳໄລສິນເຊື່ອລໍຖ້າຮັບ (Unearned Profit): ${loanData.loanCode}`,
            new Date()
          );
        }
      }
    }
    return await updateDoc(doc(db, LOANS_COLLECTION, id), loan);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${LOANS_COLLECTION}/${id}`);
  }
};

export const deleteLoan = async (id: string) => {
  try {
    return await deleteDoc(doc(db, LOANS_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${LOANS_COLLECTION}/${id}`);
  }
};

export const listenToAllRepayments = (callback: (repayments: LoanRepayment[]) => void) => {
  return onSnapshot(collection(db, REPAYMENTS_COLLECTION), (snapshot) => {
    const repayments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      repaymentDate: doc.data().repaymentDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as LoanRepayment[];
    callback(repayments);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, REPAYMENTS_COLLECTION);
  });
};

export const listenToRepaymentsForLoan = (loanId: string, callback: (repayments: LoanRepayment[]) => void) => {
  const q = query(collection(db, REPAYMENTS_COLLECTION), where('loanId', '==', loanId));
  return onSnapshot(q, (snapshot) => {
    const repayments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      repaymentDate: doc.data().repaymentDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as LoanRepayment[];
    callback(repayments);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, REPAYMENTS_COLLECTION);
  });
};

export const addLoanRepayment = async (loanId: string, repayments: any[]) => {
  const batch = writeBatch(db);
  const loanSnap = await getDoc(doc(db, LOANS_COLLECTION, loanId));
  const loanData = loanSnap.exists() ? loanSnap.data() as Loan : null;

  // Get existing repayments to calculate current total paid before this batch
  const repaymentsSnap = await getDocs(query(collection(db, REPAYMENTS_COLLECTION), where('loanId', '==', loanId)));
  const existingRepayments = repaymentsSnap.docs.map(d => d.data() as LoanRepayment);
  
  const currencies: (keyof CurrencyValues)[] = ['kip', 'thb', 'usd', 'cny'];
  const currentTotalPaid: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };
  
  existingRepayments.forEach(r => {
    currencies.forEach(c => {
      currentTotalPaid[c] += (r.amountPaid?.[c] || 0);
    });
  });

  for (const r of repayments) {
    const docRef = doc(collection(db, REPAYMENTS_COLLECTION));
    batch.set(docRef, {
      loanId,
      repaymentDate: r.date,
      amountPaid: r.amount,
      note: r.note,
      createdAt: new Date(),
    });

    // Automatically create accounting transaction for each repayment
    // 1. Record the cash receipt: Debit Cash (101), Credit Murabaha Receivables (103.1)
    await createTransaction(
      'cash',
      'ar_murabaha',
      r.amount,
      `ຊຳລະສິນເຊື່ອ: ${loanData?.loanCode || loanId}`,
      r.date
    );

    // 2. Recognize profit portion as income: Debit Unearned Income (202), Credit Murabaha Income (401)
    // Logic: Principal First. Only recognize profit after principal is fully paid.
    if (loanData) {
      const profitPortion: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };
      
      currencies.forEach(c => {
        const totalPrincipal = loanData.amount[c] || 0;
        const paidBefore = currentTotalPaid[c];
        const payment = r.amount[c] || 0;
        const paidAfter = paidBefore + payment;

        if (paidBefore >= totalPrincipal) {
          // Already paid principal, everything is profit
          profitPortion[c] = payment;
        } else if (paidAfter > totalPrincipal) {
          // This payment crosses the principal threshold
          profitPortion[c] = paidAfter - totalPrincipal;
        } else {
          // Still paying principal
          profitPortion[c] = 0;
        }

        // Update currentTotalPaid for next iteration
        currentTotalPaid[c] = paidAfter;
      });

      const hasProfitPortion = (Object.values(profitPortion) as number[]).some(v => v > 0);
      if (hasProfitPortion) {
        await createTransaction(
          'unearned_income',
          'income_murabaha',
          profitPortion,
          `ຮັບຮູ້ກຳໄລສິນເຊື່ອ (Realized Profit): ${loanData.loanCode}`,
          r.date
        );
      }
    }
  }

  try {
    return await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, REPAYMENTS_COLLECTION);
  }
};

export const updateLoanRepayment = async (id: string, repayment: Partial<LoanRepayment>) => {
  try {
    return await updateDoc(doc(db, REPAYMENTS_COLLECTION, id), repayment);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${REPAYMENTS_COLLECTION}/${id}`);
  }
};

export const deleteLoanRepayment = async (id: string) => {
  try {
    return await deleteDoc(doc(db, REPAYMENTS_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${REPAYMENTS_COLLECTION}/${id}`);
  }
};
