/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import type { FixedAsset } from '../lib/types';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';

const COLLECTION_NAME = 'cooperativeFixedAssets';

export const listenToFixedAssets = (callback: (assets: FixedAsset[]) => void) => {
  return onSnapshot(collection(db, COLLECTION_NAME), (snapshot) => {
    const assets = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      purchaseDate: doc.data().purchaseDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as FixedAsset[];
    callback(assets);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, COLLECTION_NAME);
  });
};

export const addFixedAsset = async (asset: Omit<FixedAsset, 'id' | 'createdAt'>) => {
  try {
    await addDoc(collection(db, COLLECTION_NAME), {
      ...asset,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
  }
};

export const updateFixedAsset = async (id: string, asset: Partial<FixedAsset>) => {
  try {
    const assetRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(assetRef, asset);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, COLLECTION_NAME);
  }
};

export const deleteFixedAsset = async (id: string) => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, COLLECTION_NAME);
  }
};
