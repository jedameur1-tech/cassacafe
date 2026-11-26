import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

export const APP_VERSION = "1.0.0-mvp";
export const SUPABASE_URL = "https://xdbnwvbxgrfquetysrmc.supabase.co";
export const SUPABASE_KEY = "ضع_مفتاح_sb_publishable_هنا";

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
  worker_owner: "عامل صباحاً + المالك مساءً",
  two_workers: "عاملان (صباحي + مسائي)",
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

const ERROR_MAP = {
  UNAUTHORIZED: "انتهت الجلسة، أعد تسجيل الدخول.",
  INVALID_TOKEN: "جلسة غير صالحة، أعد تسجيل الدخول.",
  FORBIDDEN: "ليست لديك صلاحية لتنفيذ هذه العملية.",
  SUPER_ADMIN_ONLY: "هذه العملية حصرية للمشرف العام.",
  INVALID_CODE: "رمز المقهى يجب أن يكون من 3 إلى 12 حرفاً/رقماً إنجليزياً صغيراً دون فراغات.",
  INVALID_CAFE_NAME: "اسم المقهى قصير جداً.",
  INVALID_OWNER_CREDENTIALS: "تحقق من بريد المالك وكلمة السر (6 أحرف على الأقل).",
  CAFE_NOT_FOUND: "المقهى غير موجود.",
  OWNER_NOT_FOUND: "حساب المالك غير موجود.",
  WEAK_PASSWORD: "كلمة السر يجب أن تكون 6 أحرف على الأقل.",
  INVALID_PIN: "رمز PIN يجب أن يتكوّن من 4 إلى 8 أرقام فقط.",
  WORKER_NO_LOGIN: "هذا العامل ليس لديه حساب دخول في النمط الحالي.",
  WORKER_NOT_FOUND: "العامل غير موجود.",
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

export async function callManageAccounts(payload) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("UNAUTHORIZED");
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-accounts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
  });

  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok || data?.error) {
    throw new Error(data?.error || `HTTP_${res.status}`);
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

export function tndToMi(val) {
  const cleaned = String(val ?? "0").replace(",", ".").trim();
  const num = Number(cleaned);
  return Number.isFinite(num) && num >= 0 ? Math.round(num * 1000) : 0;
}

export function daysRemaining(isoDate) {
  if (!isoDate) return 0;
  const diff = new Date(isoDate).getTime() - Date.now();
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
