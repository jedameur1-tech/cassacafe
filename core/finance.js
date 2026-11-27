// =====================================================================
// CassaCafe v1.3.1 — Pure Financial & Operational Engine (No Network/DOM)
// =====================================================================

const TUNISIA_MONTHS_AR = [
  "جانفي", "فيفري", "مارس", "أفريل", "ماي", "جوان",
  "جويلية", "أوت", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export const CONSUMABLE_QUICK_TAGS = [
  "سكر", "حليب", "شكولين", "مواد تنظيف", "جافال", "سائل غسيل",
  "شاي", "ماء زهر", "كؤوس بلورية", "كؤوس ورقية كبيرة", "كؤوس ورقية صغيرة",
  "Agitateurs", "Pailles", "رامي", "برتقال / ليمون",
];

export const TUNISIA_STARTER_PACK = {
  stockItems: [
    { name: "بن", unit: "غرام", pack_label: "كيس / كغ", pack_size: 1000, unit_cost_mi: 22, low_threshold: 1000, current_qty: 5000 },
    { name: "ماء 1.5ل", unit: "قارورة", pack_label: "ستيكة", pack_size: 6, unit_cost_mi: 0, low_threshold: 12, current_qty: 60 },
    { name: "ماء 1ل", unit: "قارورة", pack_label: "ستيكة", pack_size: 6, unit_cost_mi: 0, low_threshold: 12, current_qty: 60 },
    { name: "ماء 0.5ل", unit: "قارورة", pack_label: "ستيكة", pack_size: 12, unit_cost_mi: 0, low_threshold: 24, current_qty: 100 },
    { name: "قوزوز Boite", unit: "علبة", pack_label: "صندوق", pack_size: 24, unit_cost_mi: 0, low_threshold: 12, current_qty: 80 },
    { name: "قازوز بلار", unit: "قارورة", pack_label: "كاجو", pack_size: 24, unit_cost_mi: 0, low_threshold: 12, current_qty: 80 },
    { name: "كايك", unit: "قطعة", pack_label: "علبة", pack_size: 12, unit_cost_mi: 0, low_threshold: 8, current_qty: 40 },
    { name: "مرطبات", unit: "قطعة", pack_label: "علبة", pack_size: 12, unit_cost_mi: 0, low_threshold: 8, current_qty: 30 },
  ],
  products: [
    { name: "بن", category: "ساخن", price_mi: 150, sale_unit: "غرام", stock_name: "بن", stock_deduct_qty: 1 },
    { name: "شاي", category: "ساخن", price_mi: 1000, sale_unit: "كأس", stock_name: "", stock_deduct_qty: 0 },
    { name: "ماء 1.5ل", category: "بارد", price_mi: 1500, sale_unit: "قارورة", stock_name: "ماء 1.5ل", stock_deduct_qty: 1 },
    { name: "ماء 1ل", category: "بارد", price_mi: 1000, sale_unit: "قارورة", stock_name: "ماء 1ل", stock_deduct_qty: 1 },
    { name: "ماء 0.5ل", category: "بارد", price_mi: 800, sale_unit: "قارورة", stock_name: "ماء 0.5ل", stock_deduct_qty: 1 },
    { name: "عصير ليمون", category: "بارد", price_mi: 1500, sale_unit: "كأس", stock_name: "", stock_deduct_qty: 0 },
    { name: "عصير برتقال", category: "بارد", price_mi: 2000, sale_unit: "كأس", stock_name: "", stock_deduct_qty: 0 },
    { name: "قوزوز Boite", category: "بارد", price_mi: 2000, sale_unit: "علبة", stock_name: "قوزوز Boite", stock_deduct_qty: 1 },
    { name: "قازوز بلار", category: "بارد", price_mi: 1500, sale_unit: "قارورة", stock_name: "قازوز بلار", stock_deduct_qty: 1 },
    { name: "كايك", category: "مأكولات", price_mi: 1000, sale_unit: "قطعة", stock_name: "كايك", stock_deduct_qty: 1 },
    { name: "مرطبات", category: "مأكولات", price_mi: 1500, sale_unit: "قطعة", stock_name: "مرطبات", stock_deduct_qty: 1 },
    { name: "رامي", category: "ترفيه", price_mi: 2000, sale_unit: "طرح", stock_name: "", stock_deduct_qty: 0 },
  ],
};

export function formatArabicMonthLabel(monthKey) {
  const s = String(monthKey || "").trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(s)) return s || "—";
  const [y, m] = s.split("-");
  const idx = parseInt(m, 10) - 1;
  return `${TUNISIA_MONTHS_AR[idx] || m} ${y}`;
}

export function addMonthsToDateStr(isoDate, months) {
  const mCount = Math.max(1, parseInt(months, 10) || 1);
  const parts = String(isoDate || "").trim().split("-").map(Number);
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return "";
  const totalM = (parts[1] - 1) + mCount;
  const y = parts[0] + Math.floor(totalM / 12);
  const m = ((totalM % 12) + 12) % 12;
  const maxDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const d = Math.min(parts[2], maxDay);
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function diffDaysIso(fromDate, toDate) {
  if (!fromDate || !toDate) return null;
  const a = String(fromDate).trim().split("-").map(Number);
  const b = String(toDate).trim().split("-").map(Number);
  if (a.length !== 3 || b.length !== 3) return null;
  const tA = Date.UTC(a[0], a[1] - 1, a[2]);
  const tB = Date.UTC(b[0], b[1] - 1, b[2]);
  if (!Number.isFinite(tA) || !Number.isFinite(tB)) return null;
  return Math.round((tB - tA) / 86400000);
}

// تصعيد التذكير: قبل 10 أيام <- قبل 5 أيام <- قبل يوم <- ينتهي اليوم / منتهٍ
export function evaluateSubscriptionReminder(dueDate, todayIso, dismissedStage = "") {
  if (!dueDate) return { shouldShow: false, stage: "none", daysLeft: null, label: "", canDismiss: false, dismissLabel: "" };
  const daysLeft = diffDaysIso(todayIso, dueDate);
  if (daysLeft === null) return { shouldShow: false, stage: "none", daysLeft: null, label: "", canDismiss: false, dismissLabel: "" };

  let stage = "none";
  if (daysLeft <= 0) stage = "expired";
  else if (daysLeft === 1) stage = "d1";
  else if (daysLeft <= 5) stage = "d5";
  else if (daysLeft <= 10) stage = "d10";

  const rank = { none: 0, d10: 1, d5: 2, d1: 3, expired: 4 };
  const curRank = rank[stage] || 0;
  const disRank = rank[String(dismissedStage || "")] || 0;
  const shouldShow = stage === "expired" || (curRank > 0 && disRank < curRank);

  let label = "";
  if (daysLeft < 0) {
    const absD = Math.abs(daysLeft);
    label = absD === 1 ? "متأخر منذ يوم واحد" : (absD === 2 ? "متأخر منذ يومين" : `متأخر منذ ${absD} أيام`);
  } else if (daysLeft === 0) {
    label = "مستحق اليوم";
  } else if (daysLeft === 1) {
    label = "مستحق غداً (باقي يوم واحد)";
  } else if (daysLeft === 2) {
    label = "متبقي يومان";
  } else {
    label = `متبقي ${daysLeft} أيام`;
  }

  let dismissLabel = "";
  if (stage === "d10") dismissLabel = "تجاهل (تذكير قبل 5 أيام)";
  else if (stage === "d5") dismissLabel = "تجاهل (تذكير قبل يوم)";
  else if (stage === "d1") dismissLabel = "تجاهل اليوم";

  return {
    shouldShow,
    stage,
    daysLeft,
    label,
    canDismiss: stage === "d10" || stage === "d5" || stage === "d1",
    dismissLabel,
  };
}

// تحويل ذكي لكمية الشراء حسب العبوة (مع قاعدة البن بالغرام إذا تجاوز 100)
export function convertPurchaseQuantity(stockItem, enteredQty, byUnit = false) {
  const q = Math.max(0, Number(enteredQty || 0));
  if (!stockItem || q <= 0) return { units: 0, isDirectGrams: false };
  const packSize = Math.max(1, parseInt(stockItem.pack_size, 10) || 1);
  const unitLower = String(stockItem.unit || "").toLowerCase().trim();
  const isGramItem = unitLower === "غرام" || unitLower === "غ" || unitLower === "g" || unitLower === "gram";

  if (!byUnit && isGramItem && packSize >= 1000 && q > 100) {
    return { units: Math.round(q), isDirectGrams: true };
  }
  return { units: byUnit ? Math.round(q) : Math.round(q * packSize), isDirectGrams: false };
}

// المتوسط المرجّح المتحرك للتكلفة عند الشراء
export function calcWeightedAvgCostMi(prevQty, prevCostMi, addedQty, addedCostMi) {
  const addQ = Number(addedQty || 0);
  const addC = Number(addedCostMi || 0);
  const pCost = Math.max(0, Number(prevCostMi || 0));
  if (addQ <= 0 || addC <= 0) return Math.round(pCost);
  const pQty = Math.max(0, Number(prevQty || 0));
  if (pQty <= 0 || pCost <= 0) return Math.round(addC / addQ);
  return Math.round(((pQty * pCost) + addC) / (pQty + addQ));
}

// تحديد السلع المؤهلة لجرد الوردية (ربط 1:1 فريد مع مادة مخزن)
export function classifyShiftCountProducts(products = [], stockItems = []) {
  const stockById = new Map((stockItems || []).map((st) => [st.id, st]));
  const linkCountByStockId = new Map();
  for (const p of products || []) {
    if (!p?.active || !p.stock_item_id) continue;
    linkCountByStockId.set(p.stock_item_id, (linkCountByStockId.get(p.stock_item_id) || 0) + 1);
  }

  const countable = [];
  const direct = [];

  for (const p of products || []) {
    if (!p?.active) continue;
    const st = p.stock_item_id ? stockById.get(p.stock_item_id) : null;
    const isOneToOne = Boolean(
      st &&
      st.active &&
      Number(p.stock_deduct_qty || 0) === 1 &&
      linkCountByStockId.get(st.id) === 1
    );
    if (isOneToOne) {
      countable.push({ product: p, stockItem: st });
    } else {
      direct.push({ product: p, stockItem: st || null });
    }
  }
  return { countable, direct };
}

// حساب الربح التشغيلي الحقيقي، السيولة النقدية الفعلية، وتفصيل المصاريف للشهر
export function computeMonthFinancialReport({
  shifts = [],
  shiftSales = [],
  invoices = [],
  fixedExpenses = [],
  stockItems = [],
}) {
  const stockById = new Map();
  let currentStockValueMi = 0;
  const missingCostSet = new Set();

  for (const st of stockItems || []) {
    if (!st) continue;
    stockById.set(st.id, st);
    const qty = Number(st.current_qty || 0);
    const cost = Math.max(0, Number(st.unit_cost_mi || 0));
    if (qty > 0 && cost > 0) {
      currentStockValueMi += qty * cost;
    }
    if (st.active && cost <= 0) {
      missingCostSet.add(st.name);
    }
  }

  const approvedShifts = (shifts || []).filter((s) => s && s.status === "approved");
  const approvedShiftIds = new Set(approvedShifts.map((s) => s.id));

  let salesMi = 0;
  let shiftExpensesMi = 0;
  let wagesMi = 0;
  for (const s of approvedShifts) {
    salesMi += Number(s.sales_total_mi || 0);
    shiftExpensesMi += Number(s.expenses_total_mi || 0);
    wagesMi += Number(s.wage_mi || 0);
  }

  let cogsMi = 0;
  for (const ln of shiftSales || []) {
    if (!ln || !approvedShiftIds.has(ln.shift_id) || !ln.stock_item_id) continue;
    const stockUsed = Number(ln.stock_deduct_total || 0);
    if (stockUsed <= 0) continue;
    const stObj = stockById.get(ln.stock_item_id);
    const snapCost = Number(ln.unit_cost_snapshot_mi || 0);
    const liveCost = stObj ? Number(stObj.unit_cost_mi || 0) : 0;
    const unitCost = snapCost > 0 ? snapCost : Math.max(0, liveCost);
    if (unitCost > 0) {
      cogsMi += stockUsed * unitCost;
    } else if (stObj?.name) {
      missingCostSet.add(stObj.name);
    }
  }

  const approvedInvs = (invoices || []).filter((i) => i && i.status === "approved");
  let invoicesTotalMi = 0;
  let supplierCreditMi = 0;
  let workerPaidInvoicesMi = 0;
  for (const inv of approvedInvs) {
    const amt = Number(inv.total_amount_mi || 0);
    invoicesTotalMi += amt;
    if (inv.payment_source === "supplier_credit") supplierCreditMi += amt;
    if (inv.payment_source === "worker_cash") workerPaidInvoicesMi += amt;
  }
  const paidInvoicesMi = Math.max(0, invoicesTotalMi - supplierCreditMi);

  let fixedPaidMi = 0;
  let fixedUnpaidMi = 0;
  let fixedPaidCount = 0;
  for (const fe of fixedExpenses || []) {
    if (!fe) continue;
    const amt = Number(fe.amount_mi || 0);
    if (fe.paid_at) {
      fixedPaidMi += amt;
      fixedPaidCount += 1;
    } else {
      fixedUnpaidMi += amt;
    }
  }

  cogsMi = Math.round(cogsMi);
  currentStockValueMi = Math.round(currentStockValueMi);

  // تصنيف المصاريف لنافذة التفصيل (قار / مخزون / مختلف)
  const fixedAndBillsMi = Math.round(fixedPaidMi);
  const stockPurchasesMi = Math.round(invoicesTotalMi);
  const miscExpensesMi = Math.round(shiftExpensesMi);
  const totalExpensesWithoutWagesMi = Math.round(fixedAndBillsMi + stockPurchasesMi + miscExpensesMi);
  const grandTotalWithWagesMi = Math.round(totalExpensesWithoutWagesMi + wagesMi);

  // السيولة النقدية الفعلية (لا تخصم كريدي المزوّد غير المدفوع نقداً بعد)
  const cashNetMi = Math.round(salesMi - shiftExpensesMi - wagesMi - paidInvoicesMi - fixedPaidMi);
  // الربح التشغيلي الحقيقي (يعتمد تكلفة البضاعة المباعة فعلياً)
  const trueOperatingProfitMi = Math.round(salesMi - cogsMi - wagesMi - shiftExpensesMi - fixedPaidMi);

  const missingCostItems = Array.from(missingCostSet);

  return {
    daysCount: approvedShifts.length,
    salesMi: Math.round(salesMi),
    shiftExpensesMi: Math.round(shiftExpensesMi),
    wagesMi: Math.round(wagesMi),
    cogsMi,
    invoicesTotalMi: Math.round(invoicesTotalMi),
    paidInvoicesMi: Math.round(paidInvoicesMi),
    invoicesCount: approvedInvs.length,
    supplierCreditMi: Math.round(supplierCreditMi),
    workerPaidInvoicesMi: Math.round(workerPaidInvoicesMi),
    fixedPaidMi: Math.round(fixedPaidMi),
    fixedPaidCount,
    fixedUnpaidMi: Math.round(fixedUnpaidMi),
    fixedAndBillsMi,
    stockPurchasesMi,
    miscExpensesMi,
    totalExpensesWithoutWagesMi,
    grandTotalWithWagesMi,
    cashNetMi,
    trueOperatingProfitMi,
    currentStockValueMi,
    missingCostItems,
    hasMissingCosts: missingCostItems.length > 0,
  };
}
