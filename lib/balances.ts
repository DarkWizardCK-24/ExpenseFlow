import { GroupMember, GroupExpense, GroupSettlement, DebtSimplification, SplitType } from '@/types';

export interface MemberBalanceInfo {
  memberId: string;
  name: string;
  totalPaid: number;
  totalShare: number;
  netBalance: number; // positive = owed money, negative = owes money
}

export function computeGroupBalances(
  members: GroupMember[],
  expenses: GroupExpense[],
  settlements: GroupSettlement[]
): MemberBalanceInfo[] {
  const map: Record<string, { totalPaid: number; totalShare: number; netSettlement: number }> = {};

  for (const m of members) {
    map[m.id] = { totalPaid: 0, totalShare: 0, netSettlement: 0 };
  }

  // 1. Accumulate expenses
  for (const exp of expenses) {
    const paidBy = exp.paidBy;
    if (map[paidBy]) {
      map[paidBy].totalPaid += exp.amount;
    }

    if (exp.splits) {
      for (const [memberId, share] of Object.entries(exp.splits)) {
        if (map[memberId]) {
          map[memberId].totalShare += share;
        }
      }
    }
  }

  // 2. Accumulate settlements
  // If `from` pays `to` an amount X:
  // `from` paid off debt, so netSettlement for `from` increases by X (+X)
  // `to` received payment, so netSettlement for `to` decreases by X (-X)
  for (const set of settlements) {
    if (map[set.from]) {
      map[set.from].netSettlement += set.amount;
    }
    if (map[set.to]) {
      map[set.to].netSettlement -= set.amount;
    }
  }

  return members.map((m) => {
    const data = map[m.id] || { totalPaid: 0, totalShare: 0, netSettlement: 0 };
    const netBalance = data.totalPaid - data.totalShare + data.netSettlement;
    return {
      memberId: m.id,
      name: m.name,
      totalPaid: Math.round(data.totalPaid * 100) / 100,
      totalShare: Math.round(data.totalShare * 100) / 100,
      netBalance: Math.round(netBalance * 100) / 100,
    };
  });
}

/**
 * Greedy minimum-transaction algorithm to simplify debts
 */
export function simplifyDebts(memberBalances: MemberBalanceInfo[]): DebtSimplification[] {
  interface Account {
    memberId: string;
    amount: number;
  }

  const debtors: Account[] = [];
  const creditors: Account[] = [];

  for (const mb of memberBalances) {
    const val = Math.round(mb.netBalance * 100) / 100;
    if (val < -0.01) {
      debtors.push({ memberId: mb.memberId, amount: -val }); // positive debt amount
    } else if (val > 0.01) {
      creditors.push({ memberId: mb.memberId, amount: val });
    }
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions: DebtSimplification[] = [];

  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const settledAmount = Math.min(debtor.amount, creditor.amount);
    const roundedSettled = Math.round(settledAmount * 100) / 100;

    if (roundedSettled > 0.01) {
      transactions.push({
        from: debtor.memberId,
        to: creditor.memberId,
        amount: roundedSettled,
      });
    }

    debtor.amount = Math.round((debtor.amount - settledAmount) * 100) / 100;
    creditor.amount = Math.round((creditor.amount - settledAmount) * 100) / 100;

    if (debtor.amount <= 0.01) {
      dIdx++;
    }
    if (creditor.amount <= 0.01) {
      cIdx++;
    }
  }

  return transactions;
}

/**
 * Calculate split allocations based on split type
 */
export function calculateSplits(
  totalAmount: number,
  memberIds: string[],
  splitType: SplitType,
  inputs: Record<string, number> // exact amounts, percentages, or shares
): Record<string, number> {
  const result: Record<string, number> = {};
  if (memberIds.length === 0 || totalAmount <= 0) return result;

  if (splitType === 'equal') {
    const rawPerPerson = totalAmount / memberIds.length;
    let distributed = 0;

    memberIds.forEach((id, idx) => {
      if (idx === memberIds.length - 1) {
        // give any penny remainder to the last person
        result[id] = Math.round((totalAmount - distributed) * 100) / 100;
      } else {
        const share = Math.floor(rawPerPerson * 100) / 100;
        result[id] = share;
        distributed += share;
      }
    });
  } else if (splitType === 'exact') {
    for (const id of memberIds) {
      result[id] = Math.round((inputs[id] || 0) * 100) / 100;
    }
  } else if (splitType === 'percentage') {
    let distributed = 0;
    memberIds.forEach((id, idx) => {
      const pct = inputs[id] || 0;
      if (idx === memberIds.length - 1) {
        result[id] = Math.round((totalAmount - distributed) * 100) / 100;
      } else {
        const share = Math.round(((pct / 100) * totalAmount) * 100) / 100;
        result[id] = share;
        distributed += share;
      }
    });
  } else if (splitType === 'shares') {
    const totalShares = memberIds.reduce((sum, id) => sum + (inputs[id] || 1), 0);
    if (totalShares <= 0) {
      return calculateSplits(totalAmount, memberIds, 'equal', {});
    }

    let distributed = 0;
    memberIds.forEach((id, idx) => {
      const shares = inputs[id] || 1;
      if (idx === memberIds.length - 1) {
        result[id] = Math.round((totalAmount - distributed) * 100) / 100;
      } else {
        const share = Math.round(((shares / totalShares) * totalAmount) * 100) / 100;
        result[id] = share;
        distributed += share;
      }
    });
  }

  return result;
}
