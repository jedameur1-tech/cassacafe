import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/+esm";

export const APP_VERSION = "1.2.1-mvp";
export const SUPABASE_URL = "https://xdbnwvbxgrfquetysrmc.supabase.co";
export const SUPABASE_KEY = "sb_publishable_FDMJB3p2nOFQcRrZTeznyQ_J3744hCd";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export const WORK_PATTERNS = {
  owner_only: "المالك فقط",
  owner_with_worker: "المالك + عامل مساعد (دون حساب)",
  worker_only: "عامل واحد (حساب دخول)",
  worker_owner: "المالك + عامل (بالتناوب: صباحي / مسائي)",
  two_workers: "عاملان (بالتناوب: صباحي / مسائي)",
};

export const FEATURE_LABELS = {
  stock: "المخزن والفواتير",
  credit: "الكريدي (الذمم)",
  waste: "التالف والضياع",
  partners: "الشركاء",
  tables: "الطاولات",
  maintenance: "الصيانة",
  trial_feedback: "ملاحظات التجربة",
};

const WEAK_PINS = new Set([
  "123456", "654321", "012345", "543210", "234567",
  "345678", "456789", "567890", "987654", "112233",
  "123123", "121212", "1234567", "12345678", "87654321",
]);

export function isStrongPin(pin) {
  const s = String(pin || "").trim();
  return /^\d{6,8}$/.test(s) && !/^(\d)\1+$/.test(s) && !WEAK_PINS.has(s);
}

export function generateRandomPin() {
  for (let i = 0; i < 30; i++) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    const pin = String(100000 + (arr[0] % 900000));
    if (isStrongPin(pin)) return pin;
  }
  return "482917";
}

const ERROR_MAP = {
  UNAUTHORIZED: "انتهت الجلسة، أعد تسجيل الدخول.",
  INVALID_TOKEN: "جلسة غير صالحة، أعد تسجيل الدخول.",
  FORBIDDEN: "ليست لديك صلاحية لتنفيذ هذه العملية.",
  NOT_AUTHORIZED: "ليست لديك صلاحية لتنفيذ هذه العملية.",
  SUPER_ADMIN_ONLY: "هذه العملية حصرية للمشرف العام.",
  INVALID_JSON: "بيانات الطلب غير صالحة.",
  INVALID_PAYLOAD: "بيانات العملية غير صالحة.",
  PAYLOAD_TOO_LARGE: "حجم البيانات المرسلة أكبر من الحد المسموح.",
  INVALID_CODE: "رمز المقهى يجب أن يكون من 3 إلى 12 حرفاً أو رقماً إنجليزياً صغيراً دون فراغات.",
  INVALID_LOGIN_TARGET: "رمز المقهى غير صحيح أو حساب العامل غير مفعّل.",
  INVALID_CAFE_NAME: "اسم المقهى يجب أن يكون بين حرفين و80 حرفاً.",
  INVALID_PATTERN: "نمط العمل غير صالح.",
  INVALID_OWNER_CREDENTIALS: "تحقق من بريد المالك وكلمة السر (6 أحرف على الأقل).",
  CAFE_NOT_FOUND: "المقهى غير موجود.",
  CAFE_REQUIRED: "يجب تحديد المقهى المستهدف.",
  OWNER_NOT_FOUND: "حساب المالك غير موجود.",
  WEAK_PASSWORD: "كلمة السر يجب أن تكون 6 أحرف على الأقل دون فراغات فقط.",
  INVALID_PIN: "رمز PIN يجب أن يتكوّن من 6 إلى 8 أرقام غير مكرّرة أو متسلسلة.",
  INVALID_SLOT: "مقعد العامل غير صالح.",
  INVALID_EXTEND_DAYS: "عدد أيام التمديد غير صالح.",
  INVALID_DATE: "التاريخ غير صالح أو خارج النطاق المسموح.",
  INVALID_NAME: "الاسم يجب أن يكون بين حرفين و60 حرفاً.",
  INVALID_WAGE: "قيمة الأجر غير صالحة.",
  INVALID_QTY: "الكمية غير صالحة.",
  INVALID_AMOUNT: "المبلغ غير صالح.",
  INVALID_PRODUCT: "السلعة غير موجودة أو غير مفعّلة في هذا المقهى.",
  INVALID_STOCK_ITEM: "مادة المخزن غير موجودة أو غير مفعّلة.",
  INVALID_PAYMENT_SOURCE: "مصدر الدفع غير صالح.",
  INVALID_SHIFT_TYPE: "نوع الحصة غير صالح لهذا النمط.",
  INVALID_MONTH_KEY: "صيغة الشهر غير صالحة.",
  EMPTY_SHIFT: "لا يمكن إرسال يومية فارغة دون مبيعات أو مصاريف.",
  EMPTY_INVOICE: "لا يمكن إرسال فاتورة فارغة دون مواد.",
  SHIFT_SLOT_ALREADY_EXISTS: "توجد يومية مسجّلة مسبقاً لنفس الحصة في هذا اليوم.",
  FEATURE_DISABLED: "هذه الميزة غير مفعّلة لهذا المقهى.",
  WORKER_NO_LOGIN: "هذا العامل ليس لديه حساب دخول في النمط الحالي.",
  WORKER_NOT_FOUND: "العامل غير موجود.",
  WORKER_REQUIRED: "يجب تحديد العامل عند اختيار الدفع من كاسة العامل.",
  WORKER_HAS_UNSETTLED_ITEMS: "لا يمكن تصفير المقعد قبل تسوية يوميات وفواتير العامل المعلّقة.",
  WORKER_HAS_CARRY_OVER: "يوجد رصيد مرحّل متبقٍ بذمّة هذا العامل.",
  CONCURRENT_RESET: "توجد عملية تصفير أخرى جارية، أعد المحاولة بعد لحظة.",
  STALE_SETTLEMENT_SELECTION: "تغيّرت حالة إحدى اليوميات أو الفواتير، حدّث الصفحة وأعد المحاولة.",
  SHIFT_NOT_FOUND: "اليومية غير موجودة.",
  SHIFT_NOT_PENDING: "اليومية ليست في حالة انتظار للاعتماد.",
  SHIFT_NOT_REOPENED: "اليومية غير مفتوحة للتعديل.",
  SHIFT_CANNOT_BE_REOPENED: "لا يمكن إعادة فتح هذه اليومية.",
  SHIFT_ALREADY_SETTLED: "تمّت تسوية هذه اليومية ولا يمكن تعديلها.",
  SHIFT_MUST_BE_REOPENED_FIRST: "أعد فتح اليومية المعتمدة أولاً لعكس المخزون قبل حذفها.",
  INVOICE_NOT_FOUND: "الفاتورة غير موجودة.",
  INVOICE_NOT_PENDING: "الفاتورة ليست في حالة انتظار.",
  INVOICE_NOT_APPROVED: "الفاتورة ليست معتمدة لعكسها.",
  INVOICE_ALREADY_SETTLED: "تمّت تسوية هذه الفاتورة ولا يمكن عكسها.",
  NOTHING_TO_SETTLE: "لا توجد يوميات أو فواتير معتمدة ولا باقٍ مرحّل للتسوية.",
  SETUP_ALREADY_DONE: "تم إكمال إعداد اسم العامل مسبقاً.",
  SUBSCRIPTION_INACTIVE: "اشتراك المقهى متوقّف أو منتهٍ.",
  SESSION_RESET: "تم تصفير جلسة العامل، أعد تسجيل الدخول.",
};

export function translateError(err) {
  const raw = typeof err === "string" ? err : err?.message || "حدث خطأ غير متوقع";
  if (ERROR_MAP[raw]) return ERROR_MAP[raw];
  if (raw.includes("duplicate key") || raw.includes("cafes_code_key")) {
    return "رمز المقهى مستعمل مسبقاً، اختر رمزاً آخر.";
  }
  if (raw.includes("already been registered") || raw.includes("already exists")) {
    return "البريد الإلكتروني مستعمل مسبقاً في حساب آخر.";
  }
  if (raw.includes("Invalid login credentials")) {
    return "البريد الإلكتروني أو كلمة السر غير صحيحة.";
  }
  return raw;
}

async function getValidAccessToken(forceRefresh = false) {
  if (forceRefresh) {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data?.session?.access_token) throw new Error("UNAUTHORIZED");
    return data.session.access_token;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("UNAUTHORIZED");

  const expiresMs = (session.expires_at || 0) * 1000;
  if (expiresMs && expiresMs - Date.now() < 60_000) {
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data?.session?.access_token) {
      return data.session.access_token;
    }
  }
  return session.access_token;
}

export async function callManageAccounts(payload) {
  const send = async (token) => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-accounts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    let data = {};
    try { data = await res.json(); } catch { data = {}; }
    return { res, data };
  };

  let token = await getValidAccessToken(false);
  let { res, data } = await send(token);

  if (res.status === 401) {
    token = await getValidAccessToken(true);
    ({ res, data } = await send(token));
  }

  if (!res.ok || data?.error) {
    const err = new Error(data?.error || `HTTP_${res.status}`);
    err.details = data;
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function getServerTime() {
  const { data, error } = await supabase.rpc("get_server_time");
  if (error) throw error;
  return data;
}

export function miToTnd(mi) {
  const num = Number(mi || 0);
  return (num / 1000).toFixed(3);
}

export function tndToMi(val, { allowNegative = false } = {}) {
  const cleaned = String(val ?? "0").replace(",", ".").trim();
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return 0;
  if (!allowNegative && num < 0) return 0;
  return Math.round(num * 1000);
}

export function daysRemaining(isoDate, nowMs = Date.now()) {
  if (!isoDate) return 0;
  const diff = new Date(isoDate).getTime() - Number(nowMs || Date.now());
  return Math.ceil(diff / 86400000);
}

export function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("ar-TN", {
      timeZone: "Africa/Tunis",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso));
  } catch {
    return String(iso).slice(0, 10);
  }
}

export function formatWaPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 8) return `216${digits}`;
  if (digits.startsWith("00")) return digits.slice(2);
  return digits;
}

export async function logAppError({ cafeId = null, role = "", screen = "", message = "" }) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    await supabase.from("app_errors").insert({
      cafe_id: cafeId,
      user_id: session.user.id,
      app_role: role,
      screen,
      message: String(message).slice(0, 500),
      browser_info: navigator.userAgent.slice(0, 200),
      app_version: APP_VERSION,
    });
  } catch {
    // تجاهل فشل التسجيل لتفادي حلقة أخطاء
  }
}
