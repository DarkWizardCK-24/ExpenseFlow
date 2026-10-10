import { Category } from '@/types';
import { db } from './firebase';
import { collection, doc, writeBatch, getDocs } from 'firebase/firestore';

export const DEFAULT_CATEGORIES: Array<Omit<Category, 'id'> & { id?: string }> = [
  { id: 'food', name: 'Food & Dining', emoji: '🍔', color: '#10b981', isDefault: true },
  { id: 'travel', name: 'Travel & Transport', emoji: '✈️', color: '#06b6d4', isDefault: true },
  { id: 'shopping', name: 'Shopping', emoji: '🛍️', color: '#f59e0b', isDefault: true },
  { id: 'bills', name: 'Bills & Utilities', emoji: '⚡', color: '#ef4444', isDefault: true },
  { id: 'fun', name: 'Fun & Entertainment', emoji: '🎉', color: '#8b5cf6', isDefault: true },
  { id: 'others', name: 'Others', emoji: '📦', color: '#64748b', isDefault: true },
];

export async function seedDefaultCategories(uid: string) {
  try {
    const catsRef = collection(db, 'users', uid, 'categories');
    const snap = await getDocs(catsRef);
    if (snap.empty) {
      const batch = writeBatch(db);
      for (const cat of DEFAULT_CATEGORIES) {
        const catDoc = doc(catsRef, cat.id);
        batch.set(catDoc, {
          name: cat.name,
          emoji: cat.emoji,
          color: cat.color,
          isDefault: true,
        });
      }
      await batch.commit();
    }
  } catch (error) {
    console.error('Error seeding categories:', error);
  }
}
