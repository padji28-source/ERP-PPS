import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

export interface ProductionOrder {
  id: string;
  client: string;
  poNumber?: string;
  product: string;
  qty: number;
  stage: string;       // Kanban column mapping
  vendor: string;      // Actual vendor/tempat
  deadline: string;
  status: string;      // 'On Process', 'Selesai', 'Blocked'
  note: string;
  qtyKirim: string;
  tglKirim: string;
  qtyMasuk: string;
  target: string;
  aktual: string;
  selisih: string;
  confirmQty?: number;
  bom?: { material: string, qty: string, unit: string }[];
}

const monthMap: Record<string, number> = {
  'jan': 0, 'januari': 0, 'feb': 1, 'februari': 1, 'mar': 2, 'maret': 2, 
  'apr': 3, 'april': 3, 'may': 4, 'mei': 4, 'jun': 5, 'juni': 5, 
  'jul': 6, 'juli': 6, 'aug': 7, 'agustus': 7, 'sep': 8, 'september': 8, 
  'oct': 9, 'oktober': 9, 'nov': 10, 'november': 10, 'dec': 11, 'desember': 11
};

export const getDeadlineDelta = (dl: string) => {
  if (!dl || dl === '-') return Math.pow(10, 5); // Huge value if no deadline
  let monthVal = -1;
  let dayVal = -1;
  const dlLower = dl.toLowerCase();
  for (const [key, value] of Object.entries(monthMap)) {
    if (dlLower.includes(key)) {
      monthVal = value;
      break;
    }
  }
  const match = dl.match(/\d+/);
  if (match) {
    dayVal = parseInt(match[0], 10);
  }

  if (monthVal === -1 || dayVal === -1) return Math.pow(10, 5);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Estimate for current year
  const targetDate = new Date(today.getFullYear(), monthVal, dayVal);

  // If the inferred date is more than 6 months in the past, assume it means next year
  if (targetDate.getTime() < today.getTime() - (180 * 24 * 60 * 60 * 1000)) {
    targetDate.setFullYear(today.getFullYear() + 1);
  }

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const formatDeadlineLabel = (dl: string) => {
  const delta = getDeadlineDelta(dl);
  if (delta >= Math.pow(10, 5)) return dl;
  if (delta < 0) return `${Math.abs(delta)} hari telat`;
  if (delta === 0) return 'Hari ini';
  if (delta === 1) return 'Besok';
  if (delta <= 7) return `${delta} hari lagi`;
  return dl;
};

export async function fetchProductionData(): Promise<ProductionOrder[]> {
  try {
    const qs = await getDocs(collection(db, 'sales_orders'));
    const finalOrders: ProductionOrder[] = [];
    qs.forEach(doc => {
      finalOrders.push({ ...doc.data(), id: doc.id } as ProductionOrder);
    });
    return finalOrders;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'sales_orders');
    return [];
  }
}
