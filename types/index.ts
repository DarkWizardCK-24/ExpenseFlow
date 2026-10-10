export type TransactionType = 'income' | 'expense';

export type PaymentMethod = 'UPI' | 'Card' | 'Cash' | 'Bank';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  photoURL?: string;
  currency: string;
  monthlyBudget: number;
  plan: 'free' | 'pro';
  prefs: {
    notif: boolean;
    alerts: boolean;
    weekly: boolean;
  };
  createdAt?: string;
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
  color: string;
  isDefault?: boolean;
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  date: string; // YYYY-MM-DD or ISO string
  paymentMethod: PaymentMethod;
  note?: string;
  receiptURL?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GoalLog {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  note?: string;
  createdAt: string;
}

export interface Goal {
  id: string;
  name: string;
  category: 'Travel' | 'Gadget' | 'Safety' | 'Education' | 'Home' | 'Vehicle' | 'Other';
  emoji: string;
  target: number;
  saved: number;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  icon: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

export type SplitGroupCategory = 'Trip' | 'Home' | 'Food' | 'Party' | 'Ride' | 'Work';

export interface GroupMember {
  id: string;
  name: string;
  uid?: string;
  email?: string;
  avatarColor?: string;
}

export interface SplitGroup {
  id: string;
  name: string;
  category: SplitGroupCategory;
  emoji: string;
  ownerUid: string;
  memberUids: string[];
  members: GroupMember[];
  createdAt: string;
}

export type SplitType = 'equal' | 'exact' | 'percentage' | 'shares';

export interface GroupExpense {
  id: string;
  title: string;
  amount: number;
  categoryId: string;
  paidBy: string; // memberId
  splitType: SplitType;
  splits: Record<string, number>; // memberId -> split amount
  createdAt: string;
  createdBy: string;
}

export interface GroupSettlement {
  id: string;
  from: string; // memberId
  to: string; // memberId
  amount: number;
  createdAt: string;
}

export interface GroupActivityLog {
  id: string;
  type: 'added' | 'edited' | 'deleted' | 'settled' | 'created';
  message: string;
  createdAt: string;
  actorUid?: string;
}

export interface DebtSimplification {
  from: string; // memberId
  to: string; // memberId
  amount: number;
}
