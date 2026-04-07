/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, addDoc, deleteDoc, doc, onSnapshot, getDoc, updateDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import type { CooperativeMember, CooperativeDeposit } from '../lib/types';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';
import { createTransaction } from './cooperativeAccountingService';

const COLLECTION_NAME = 'cooperativeMembers';

export const listenToCooperativeMembers = (callback: (members: CooperativeMember[]) => void) => {
  return onSnapshot(collection(db, COLLECTION_NAME), (snapshot) => {
    const members = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      joinDate: doc.data().joinDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as CooperativeMember[];
    callback(members);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, COLLECTION_NAME);
  });
};

export const addCooperativeMember = async (member: Omit<CooperativeMember, 'id' | 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...member,
      createdAt: new Date(),
    });

    // Automatically create accounting transaction for initial deposits
    if (member.deposits && (member.deposits.kip > 0 || member.deposits.thb > 0 || member.deposits.usd > 0 || member.deposits.cny > 0)) {
      await createTransaction(
        'cash',
        'capital',
        member.deposits,
        `ເງິນຝາກເລີ່ມຕົ້ນສະມາຊິກ: ${member.name}`,
        member.joinDate
      );
    }

    return docRef;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
  }
};

export const deleteCooperativeMember = async (id: string) => {
  try {
    return await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
  }
};

export const getCooperativeMember = async (id: string) => {
  const docRef = doc(db, COLLECTION_NAME, id);
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
        joinDate: docSnap.data().joinDate?.toDate(),
        createdAt: docSnap.data().createdAt?.toDate(),
      } as CooperativeMember;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${COLLECTION_NAME}/${id}`);
  }
};

export const updateCooperativeMember = async (id: string, member: Partial<CooperativeMember>) => {
  const docRef = doc(db, COLLECTION_NAME, id);
  try {
    return await updateDoc(docRef, member);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
  }
};

export const getAllCooperativeMemberIds = async () => {
  try {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME));
    return snapshot.docs.map(doc => ({ id: doc.id }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
  }
};

export const listenToCooperativeDepositsForMember = (memberId: string, callback: (deposits: CooperativeDeposit[]) => void) => {
  const q = query(collection(db, 'cooperativeDeposits'), where('memberId', '==', memberId));
  return onSnapshot(q, (snapshot) => {
    const deposits = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as CooperativeDeposit[];
    callback(deposits);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'cooperativeDeposits');
  });
};
