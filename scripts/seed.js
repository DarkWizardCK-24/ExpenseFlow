/**
 * ExpenseFlow Firebase Seeding Utility
 * 
 * Usage:
 *   node scripts/seed.js <YOUR_USER_UID>
 * 
 * Note: When running the app, default categories are automatically seeded
 * upon first user registration or login via `lib/seed-data.ts`.
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, writeBatch, collection } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const DEFAULT_CATEGORIES = [
  { id: 'food', name: 'Food & Dining', emoji: '🍔', color: '#10b981', isDefault: true },
  { id: 'travel', name: 'Travel & Transport', emoji: '✈️', color: '#06b6d4', isDefault: true },
  { id: 'shopping', name: 'Shopping', emoji: '🛍️', color: '#f59e0b', isDefault: true },
  { id: 'bills', name: 'Bills & Utilities', emoji: '⚡', color: '#ef4444', isDefault: true },
  { id: 'fun', name: 'Fun & Entertainment', emoji: '🎉', color: '#8b5cf6', isDefault: true },
  { id: 'others', name: 'Others', emoji: '📦', color: '#64748b', isDefault: true },
];

async function seedUserCategories(uid) {
  if (!uid) {
    console.error('Please specify a user UID: node scripts/seed.js <UID>');
    process.exit(1);
  }

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log(`Seeding categories for user: ${uid}...`);
  const batch = writeBatch(db);

  for (const cat of DEFAULT_CATEGORIES) {
    const catRef = doc(collection(db, 'users', uid, 'categories'), cat.id);
    batch.set(catRef, {
      name: cat.name,
      emoji: cat.emoji,
      color: cat.color,
      isDefault: true,
    });
  }

  await batch.commit();
  console.log('Categories seeded successfully!');
  process.exit(0);
}

const targetUid = process.argv[2];
seedUserCategories(targetUid);
