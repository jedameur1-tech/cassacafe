import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/+esm";

export const APP_VERSION = "1.3.1";
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
  METHOD_NOT_ALLOWED: "طريقة الطلب غير مدعومة.",
  UNKNOWN_ACTION: "العملية المطلوبة غير معروفة.",
  SERVER_ERROR: "حدث خطأ في الخادم، أعد المحاولة بعد لحظة.",
  NETWORK_TIMEOUT: "تأخر الاتصال بالخادم، تحقق من الإنترنت وأعد المحاولة.",
  CREATE_FAILED: "تعذّر إنشاء المقهى، تحقق من البيانات وأعد المحاولة.",
  CREATE_CAFE_FAILED: "تعذّر إنشاء سجل المقهى.",
  UPDATE_FAILED: "تعذّر حفظ التعديلات، أعد المحاولة.",
  OWNER_AUTH_FAILED: "تعذّر إنشاء حساب المالك، تحقق من البريد الإلكتروني.",
  WORKER_AUTH_FAILED: "تعذّر إنشاء حساب العامل.",
  CHECK_SLOT_FAILED: "تعذّر فحص حالة مقعد العامل.",
  RESET_FAILED: "تعذّر تصفير مقعد العامل، أعد المحاولة.",
  RETIRE_FAILED: "تعذّر إنهاء حساب العامل السابق.",
  PIN_UPDATE_FAILED: "تعذّر تحديث رمز PIN، أعد المحاولة.",
  ORPHAN_CLEANUP_FAILED: "تعذّر تنظيف حساب سابق مرتبط بالمقعد، أعد المحاولة.",
  INVALID_JSON: "بيانات الطلب غير صالحة.",
  INVALID_PAYLOAD: "بيانات العملية غير صالحة.",
  PAYLOAD_TOO_LARGE: "حجم البيانات المرسلة أكبر من الحد المسموح.",
  INVALID_TX_ID: "معرّف العملية غير صالح، حدّث الصفحة وأعد المحاولة.",
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
  INVALID_MOVE_TYPE: "نوع حركة المخزن غير صالح.",
  INVALID_PRODUCT: "السلعة غير موجودة أو غير مفعّلة في هذا المقهى.",
  INVALID_STOCK_ITEM: "مادة المخزن غير موجودة أو غير مفعّلة.",
  INVALID_PAYMENT_SOURCE: "مصدر الدفع غير صالح.",
  INVALID_SHIFT_TYPE: "نوع الحصة غير صالح لهذا النمط.",
  INVALID_MONTH_KEY: "صيغة الشهر غير صالحة.",
  IMMUTABLE_COLUMN: "لا يمكن تعديل البيانات الأساسية لهذا السجل.",
  EMPTY_SHIFT: "لا يمكن إرسال يومية فارغة دون مبيعات أو مصاريف.",
  EMPTY_INVOICE: "لا يمكن إرسال فاتورة فارغة دون مواد.",
  SHIFT_SLOT_ALREADY_EXISTS: "توجد يومية مسجّلة مسبقاً لنفس الحصة في هذا اليوم.",
  FEATURE_DISABLED: "هذه الميزة غير مفعّلة لهذا المقهى.",
  WORKER_NO_LOGIN: "هذا العامل ليس لديه حساب دخول في النمط الحالي.",
  WORKER_NOT_FOUND: "العامل غير موجود.",
  WORKER_REQUIRED: "يجب تحديد العامل عند اختيار الدفع من كاسة العامل.",
  WORKER_HAS_UNSETTLED_ITEMS: "لا يمكن تعطيل أو تصفير المقعد قبل تسوية يوميات وفواتير العامل المعلّقة.",
  WORKER_HAS_CARRY_OVER: "يوجد رصيد مرحّل متبقٍ بذمّة هذا العامل.",
  CONCURRENT_RESET: "توجد عملية أخرى جارية على حساب هذا العامل، أعد المحاولة بعد لحظة.",
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
  NOTHING_TO_SETTLE: "لا توجد تسوية أو يوميات وفواتير معتمدة للتسوية.",
  SETUP_ALREADY_DONE: "تم إكمال إعداد اسم العامل مسبقاً.",
  SUBSCRIPTION_INACTIVE: "اشتراك المقهى متوقّف أو منتهٍ.",
  SESSION_RESET: "تم تصفير جلسة العامل أو تغيير رمزه، أعد تسجيل الدخول.",
};

export function translateError(err) {
  const raw = String(typeof err === "string" ? err : err?.message || "حدث خطأ غير متوقع").trim();
  if (ERROR_MAP[raw]) return ERROR_MAP[raw];
  const low = raw.toLowerCase();
  if (low.includes("failed to fetch") || low.includes("load failed") || low.includes("networkerror")) {
    return "تعذّر الاتصال بالخادم، تحقق من اتصال الإنترنت.";
  }
  if (low.includes("abort")) {
    return ERROR_MAP.NETWORK_TIMEOUT;
  }
  if (low.includes("cafes_code_key")) {
    return "رمز المقهى مستعمل مسبقاً، اختر رمزاً آخر.";
  }
  if (low.includes("duplicate key")) {
    return "هذا السجل موجود مسبقاً.";
  }
  if (low.includes("already been registered") || low.includes("already exists")) {
    return "البريد الإلكتروني مستعمل مسبقاً في حساب آخر.";
  }
  if (low.includes("invalid login credentials")) {
    return "بيانات الدخول غير صحيحة.";
  }
  if (low.includes("banned")) {
    return "هذا الحساب موقوف، راجع المشرف أو المالك.";
  }
  if (low.includes("rate limit")) {
    return "محاولات كثيرة متتالية، انتظر قليلاً ثم أعد المحاولة.";
  }
  if (low.includes("row-level security")) {
    return "ليست لديك صلاحية لتعديل هذه البيانات أو أن الاشتراك غير نشط.";
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

export async function callManageAccounts(payload, { timeoutMs = 20_000 } = {}) {
  const send = async (token) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-accounts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      let data = {};
      try { data = await res.json(); } catch { data = {}; }
      return { res, data };
    } catch (e) {
      if (e?.name === "AbortError" || String(e?.message || "").toLowerCase().includes("abort")) {
        throw new Error("NETWORK_TIMEOUT");
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
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

let _serverOffsetMs = 0;

export function getServerNowMs() {
  return Math.round(Date.now() + _serverOffsetMs);
}

export async function getServerTime() {
  const t0 = Date.now();
  const { data, error } = await supabase.rpc("get_server_time");
  if (error) throw error;
  if (data?.epoch_ms) {
    const t1 = Date.now();
    const rtt = Math.max(0, t1 - t0);
    _serverOffsetMs = Math.round(Number(data.epoch_ms) - (t1 - rtt / 2));
  }
  return data;
}

export async function callRpc(fnName, params = {}, { timeoutMs = 20_000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const q = supabase.rpc(fnName, params);
    const { data, error } = await (q.abortSignal ? q.abortSignal(controller.signal) : q);
    if (error) throw error;
    return data;
  } catch (e) {
    if (e?.name === "AbortError" || String(e?.message || "").toLowerCase().includes("abort")) {
      throw new Error("NETWORK_TIMEOUT");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// ===== تنسيق المليم (المعتمد في worker.html و owner.html المحدّثة) مع فواصل الآلاف =====
export function formatMi(mi) {
  const n = Math.round(Number(mi || 0));
  if (!Number.isFinite(n) || n === 0) return "0";
  const sign = n < 0 ? "-" : "";
  const formatted = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${sign}${formatted}`;
}

export function formatMiLabel(mi) {
  return `${formatMi(mi)} مي`;
}

// تحويل إدخال المليم (أرقام عربية أو إنجليزية أو فراغات أو سالب) إلى عدد صحيح
export function inputToMi(val, { allowNegative = false } = {}) {
  if (typeof val === "number") {
    if (!Number.isFinite(val) || val === 0) return 0;
    const rounded = Math.round(val);
    return allowNegative ? rounded : Math.max(0, rounded);
  }
  const s = String(val ?? "0")
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069\u00A0]/g, "")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u2212\u2013\u2014﹣－]/g, "-")
    .split(".")[0]
    .split("٫")[0]
    .replace(/[^\d-]/g, "");
  if (!s || s === "-") return 0;
  const isNeg = allowNegative && s.includes("-");
  const digits = s.replace(/\D/g, "");
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n) || n === 0) return 0;
  return isNeg ? -n : n;
}

export function formatSpacedIntInput(val, { allowNegative = false } = {}) {
  const raw = String(val ?? "")
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069\u00A0]/g, "")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u2212\u2013\u2014﹣－]/g, "-")
    .split(".")[0]
    .split("٫")[0];
  const isNeg = allowNegative && raw.includes("-");
  const digits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (!digits) return isNeg ? "-" : "";
  const spaced = digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return isNeg ? `-${spaced}` : spaced;
}

// ===== دوال التحويل الحقيقي بالدينار (للتوافق التام مع super-admin.html والملفات القديمة) =====
export function miToTnd(mi) {
  const n = Number(mi || 0);
  if (!Number.isFinite(n)) return "0.000";
  const sign = n < 0 ? "-" : "";
  const abs = Math.round(Math.abs(n));
  const whole = Math.floor(abs / 1000);
  const frac = String(abs % 1000).padStart(3, "0");
  return `${sign}${whole}.${frac}`;
}

export function tndToMi(val, { allowNegative = false } = {}) {
  const s = String(val ?? "0")
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[,٫]/g, ".")
    .replace(/\s+/g, "")
    .trim();
  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  const mi = Math.round(n * 1000);
  return allowNegative ? mi : Math.max(0, mi);
}

export function escapeHtmlText(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// منع انقلاب الأرقام والتواريخ ورموز الفواتير داخل النصوص العربية
export function formatMixedRtlText(str) {
  if (str === null || str === undefined || str === "") return "";
  const s = String(str);
  const rx = /#\d+|\d{4}-\d{2}(?:-\d{2})?(?:\s+\d{2}:\d{2})?|[+\-]?\d{1,3}(?:[\s\u00A0]\d{3})+(?!\d)|[+\-]?\d+(?:[.,:/]\d+)?/g;
  let out = "";
  let last = 0;
  let m;
  while ((m = rx.exec(s)) !== null) {
    if (m.index > last) out += escapeHtmlText(s.slice(last, m.index));
    out += `<span class="num-ltr" dir="ltr">${escapeHtmlText(m[0]).replace(/\s+/g, "\u00A0")}</span>`;
    last = m.index + m[0].length;
    if (m[0].length === 0) rx.lastIndex++;
  }
  if (last < s.length) out += escapeHtmlText(s.slice(last));
  return out;
}

// عزل النصوص والأرقام في الإشعارات والرسائل النصية (ntfy / واتساب)
export function bidiIsolatePlain(val) {
  const clean = String(val ?? "").replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "").trim();
  const locked = clean.replace(/\s+/g, "\u00A0\u200E").replace(/([-/:|+.,_]+)/g, "\u200E$1\u200E");
  return `\u2066\u200E${locked}\u200E\u2069`;
}

export function formatNotifMiPlain(mi) {
  return `${bidiIsolatePlain(formatMi(mi))}\u00A0مي`;
}

export function formatNotifDatePlain(isoOrDate) {
  if (!isoOrDate) return "";
  return `\u2066\u200E${String(isoOrDate).trim().slice(0, 10).replace(/-/g, "\u200E-\u200E")}\u200E\u2069`;
}

export function daysRemaining(isoDate, nowMs = getServerNowMs()) {
  if (!isoDate) return 0;
  const ts = new Date(isoDate).getTime();
  if (!Number.isFinite(ts)) return 0;
  return Math.ceil((ts - Number(nowMs || getServerNowMs())) / 86400000);
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

export function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("ar-TN", {
      timeZone: "Africa/Tunis",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return String(iso).slice(0, 16).replace("T", " ");
  }
}

export function formatWaPhone(phone) {
  let digits = String(phone || "")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 8) digits = `216${digits}`;
  if (digits.length < 8 || digits.length > 15) return "";
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
