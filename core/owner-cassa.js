import {
  ref,
  reactive,
  computed,
  watch,
  nextTick,
  onMounted,
} from "https://cdn.jsdelivr.net/npm/vue@3.5.13/dist/vue.esm-browser.prod.js";
import {
  supabase,
  callRpc,
  getServerNowMs,
  formatMi,
  inputToMi,
  formatSpacedIntInput,
  translateError,
} from "./supabase.js?v=1.3.1";
import {
  CONSUMABLE_QUICK_TAGS,
  classifyShiftCountProducts,
} from "./finance.js?v=1.3.1";

const QUICK_EXP_BUMPS = [1000, 2000, 5000, 10000, 20000];

export const OwnerCassa = {
  name: "OwnerCassa",
  props: {
    cafe: { type: Object, required: true },
    products: { type: Array, default: () => [] },
    stockItems: { type: Array, default: () => [] },
    monthShifts: { type: Array, default: () => [] },
    activeWorkers: { type: Array, default: () => [] },
    serverDate: { type: String, required: true },
    canWrite: { type: Boolean, default: true },
  },
  emits: ["saved", "notify", "open-menu", "draft-change"],
  setup(props, { emit }) {
    const busy = ref(false);
    const workDate = ref(props.serverDate || new Date().toISOString().slice(0, 10));
    const shiftType = ref("full");
    const salesEntryMode = ref("direct");
    const selectedWorkerId = ref("");
    const shiftNote = ref("");
    const clientTxId = ref("");

    const qtyByProduct = reactive({});
    const expenses = ref([]);
    const unclassifiedExpText = ref("");
    const todayInvoiceItems = ref([]);

    const handoverState = reactive({
      lockedOpening: false,
      startedAt: "",
      opening: {},
      closing: {},
    });

    const saleInputRef = ref(null);
    const saleModal = reactive({ product: null, qtyText: "" });
    const dailyExpModal = reactive({
      open: false,
      selectedTag: CONSUMABLE_QUICK_TAGS[0],
      amountText: "",
    });
    const closeModalOpen = ref(false);

    const generateTxId = () => {
      const rnd =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : Date.now() + "_" + Math.random().toString(36).slice(2, 10);
      return "csh_" + rnd;
    };

    const currentTimeHHMM = () => {
      try {
        return new Intl.DateTimeFormat("en-GB", {
          timeZone: "Africa/Tunis",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(new Date(getServerNowMs()));
      } catch {
        return new Date().toTimeString().slice(0, 5);
      }
    };

    const hasStock = computed(() => Boolean(props.cafe?.features?.stock));
    const isWorkerOwner = computed(() => props.cafe?.work_pattern === "worker_owner");
    const isOwnerWithWorker = computed(
      () => props.cafe?.work_pattern === "owner_with_worker" && props.activeWorkers.length > 0
    );

    const allowedShiftTypes = computed(() => {
      if (isWorkerOwner.value) {
        return [
          { val: "morning", label: "صباحي" },
          { val: "evening", label: "مسائي" },
        ];
      }
      return [{ val: "full", label: "يوم كامل" }];
    });

    const takenSlots = computed(() =>
      props.monthShifts
        .filter((s) => s.work_date === workDate.value)
        .map((s) => s.shift_type)
    );

    const activeProducts = computed(() => props.products.filter((p) => p.active));

    const shiftCountSplit = computed(() =>
      classifyShiftCountProducts(props.products, props.stockItems)
    );

    const countableIdSet = computed(
      () => new Set(shiftCountSplit.value.countable.map((x) => x.product.id))
    );
    const isCountableProduct = (prodId) => countableIdSet.value.has(prodId);

    const addedInShiftByStockId = computed(() => {
      const map = {};
      for (const it of todayInvoiceItems.value) {
        if (!it.stock_item_id) continue;
        map[it.stock_item_id] = (map[it.stock_item_id] || 0) + Number(it.converted_qty || 0);
      }
      return map;
    });

    const handoverRows = computed(() =>
      shiftCountSplit.value.countable.map(({ product, stockItem }) => {
        const rawOpen = String(handoverState.opening[product.id] ?? "").trim();
        const rawClose = String(handoverState.closing[product.id] ?? "").trim();
        const hasBoth = rawOpen !== "" && rawClose !== "";
        const openVal = rawOpen !== "" ? inputToMi(rawOpen) : 0;
        const closeVal = rawClose !== "" ? inputToMi(rawClose) : 0;
        const added = Number(addedInShiftByStockId.value[stockItem.id] || 0);
        const consumed = hasBoth ? openVal + added - closeVal : 0;
        const isInvalid = hasBoth && consumed < 0;
        const totalMi = !isInvalid && consumed > 0 ? consumed * Number(product.price_mi || 0) : 0;
        return {
          product,
          stockItem,
          hasBoth,
          openVal,
          closeVal,
          added,
          consumed,
          isInvalid,
          totalMi,
        };
      })
    );

    const hasInvalidHandover = computed(
      () => salesEntryMode.value === "shift_count" && handoverRows.value.some((r) => r.isInvalid)
    );

    const effectiveQtyByProduct = computed(() => {
      const out = {};
      for (const p of activeProducts.value) {
        const q = Number(qtyByProduct[p.id] || 0);
        if (q > 0) out[p.id] = q;
      }
      if (salesEntryMode.value === "shift_count" && hasStock.value && shiftCountSplit.value.countable.length) {
        for (const row of handoverRows.value) {
          delete out[row.product.id];
          if (row.hasBoth && row.consumed > 0) out[row.product.id] = row.consumed;
        }
      }
      return out;
    });

    const recordedSalesList = computed(() => {
      const map = effectiveQtyByProduct.value;
      const list = [];
      for (const p of props.products) {
        const qty = Number(map[p.id] || 0);
        if (qty > 0) {
          list.push({ product: p, qty, amountMi: qty * Number(p.price_mi || 0) });
        }
      }
      return list;
    });

    const selectedWorkerWageMi = computed(() => {
      if (!isOwnerWithWorker.value || !selectedWorkerId.value) return 0;
      const w = props.activeWorkers.find((x) => x.id === selectedWorkerId.value);
      return Number(w?.default_wage_mi || 0);
    });

    const salesTotalMi = computed(() =>
      recordedSalesList.value.reduce((a, ln) => a + ln.amountMi, 0)
    );
    const expensesTotalMi = computed(() =>
      expenses.value.reduce((a, ex) => a + Number(ex.amount_mi || 0), 0)
    );
    const shiftNetMi = computed(
      () => salesTotalMi.value - expensesTotalMi.value - selectedWorkerWageMi.value
    );
    const hasDraftData = computed(
      () =>
        recordedSalesList.value.length > 0 ||
        expenses.value.length > 0 ||
        Object.values(handoverState.opening).some((v) => String(v || "").trim() !== "")
    );

    const emitDraftSummary = () => {
      emit("draft-change", {
        hasData: hasDraftData.value,
        itemsCount: recordedSalesList.value.length,
        salesMi: salesTotalMi.value,
      });
    };

    const draftKey = () => (props.cafe?.id ? "cc_owner_cassa_" + props.cafe.id : "");

    const saveDraft = () => {
      const k = draftKey();
      if (!k) return;
      try {
        localStorage.setItem(
          k,
          JSON.stringify({
            workDate: workDate.value,
            shiftType: shiftType.value,
            salesEntryMode: salesEntryMode.value,
            selectedWorkerId: selectedWorkerId.value,
            clientTxId: clientTxId.value,
            shiftNote: shiftNote.value,
            qtyByProduct: { ...qtyByProduct },
            expenses: expenses.value,
            handoverState: {
              lockedOpening: handoverState.lockedOpening,
              startedAt: handoverState.startedAt,
              opening: { ...handoverState.opening },
              closing: { ...handoverState.closing },
            },
          })
        );
      } catch {
        // ignore storage quota errors
      }
      emitDraftSummary();
    };

    const clearDraft = () => {
      Object.keys(qtyByProduct).forEach((k) => delete qtyByProduct[k]);
      expenses.value = [];
      unclassifiedExpText.value = "";
      shiftNote.value = "";
      selectedWorkerId.value = "";
      handoverState.lockedOpening = false;
      handoverState.startedAt = "";
      handoverState.opening = {};
      handoverState.closing = {};
      workDate.value = props.serverDate || workDate.value;
      clientTxId.value = generateTxId();
      pickDefaultShiftType();
      saveDraft();
    };

    const pickDefaultShiftType = () => {
      if (!isWorkerOwner.value) {
        shiftType.value = "full";
        return;
      }
      const free = allowedShiftTypes.value.find((o) => !takenSlots.value.includes(o.val));
      shiftType.value = free ? free.val : "evening";
    };

    const loadDraft = () => {
      Object.keys(qtyByProduct).forEach((k) => delete qtyByProduct[k]);
      expenses.value = [];
      unclassifiedExpText.value = "";
      shiftNote.value = "";
      selectedWorkerId.value = "";
      handoverState.lockedOpening = false;
      handoverState.startedAt = "";
      handoverState.opening = {};
      handoverState.closing = {};
      workDate.value = props.serverDate || new Date().toISOString().slice(0, 10);
      salesEntryMode.value =
        props.cafe?.settings?.sales_entry_mode === "shift_count" && hasStock.value
          ? "shift_count"
          : "direct";
      clientTxId.value = generateTxId();
      pickDefaultShiftType();

      const k = draftKey();
      if (k) {
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const d = JSON.parse(raw);
            if (d && typeof d === "object") {
              if (d.workDate) workDate.value = d.workDate;
              if (d.shiftType && allowedShiftTypes.value.some((o) => o.val === d.shiftType)) {
                shiftType.value = d.shiftType;
              }
              if (d.salesEntryMode === "shift_count" || d.salesEntryMode === "direct") {
                salesEntryMode.value = d.salesEntryMode;
              }
              if (typeof d.selectedWorkerId === "string") selectedWorkerId.value = d.selectedWorkerId;
              if (d.clientTxId) clientTxId.value = d.clientTxId;
              if (typeof d.shiftNote === "string") shiftNote.value = d.shiftNote;
              if (d.qtyByProduct && typeof d.qtyByProduct === "object") {
                Object.assign(qtyByProduct, d.qtyByProduct);
              }
              if (Array.isArray(d.expenses)) expenses.value = d.expenses;
              if (d.handoverState && typeof d.handoverState === "object") {
                handoverState.lockedOpening = Boolean(d.handoverState.lockedOpening);
                handoverState.startedAt = d.handoverState.startedAt || "";
                handoverState.opening = { ...(d.handoverState.opening || {}) };
                handoverState.closing = { ...(d.handoverState.closing || {}) };
              }
            }
          }
        } catch {
          // ignore corrupted draft
        }
      }
      emitDraftSummary();
    };

    const resetTxId = () => {
      clientTxId.value = generateTxId();
      saveDraft();
    };

    const loadTodayInvoiceItems = async () => {
      if (!props.cafe?.id || !hasStock.value || !workDate.value) {
        todayInvoiceItems.value = [];
        return;
      }
      try {
        const { data: invs } = await supabase
          .from("stock_invoices")
          .select("id, status")
          .eq("cafe_id", props.cafe.id)
          .eq("work_date", workDate.value);
        const ids = (invs || [])
          .filter((i) => i.status !== "rejected" && i.status !== "reversed")
          .map((i) => i.id);
        if (!ids.length) {
          todayInvoiceItems.value = [];
          return;
        }
        const { data: items } = await supabase
          .from("stock_invoice_items")
          .select("stock_item_id, converted_qty")
          .in("invoice_id", ids);
        todayInvoiceItems.value = items || [];
      } catch {
        todayInvoiceItems.value = [];
      }
    };

    const shiftTypeLabel = (t) => ({ full: "يوم كامل", morning: "صباحي", evening: "مسائي" }[t] || t);

    const productCategoryClass = (cat) => {
      const c = String(cat || "").toLowerCase();
      if (c.includes("ساخن") || c.includes("قهوة") || c === "hot") return "cat-hot";
      if (c.includes("بارد") || c.includes("ماء") || c === "cold") return "cat-cold";
      if (c.includes("مأكول") || c.includes("حلوي") || c === "food") return "cat-food";
      if (c.includes("ترفي") || c.includes("ألعاب") || c.includes("شيش") || c === "fun") return "cat-fun";
      return "cat-cold";
    };

    const productStockFooter = (p) => {
      if (!hasStock.value || !p.stock_item_id || Number(p.stock_deduct_qty || 0) <= 0) {
        return { text: "تحضير مباشر", cls: "" };
      }
      const st = props.stockItems.find((x) => x.id === p.stock_item_id);
      if (!st) return { text: "تحضير مباشر", cls: "" };
      const soldQty = Number(qtyByProduct[p.id] || 0) * Number(p.stock_deduct_qty || 1);
      const avail = Math.max(0, Number(st.current_qty || 0) - soldQty);
      if (avail <= 0) return { text: "نفد (0 " + st.unit + ")", cls: "danger" };
      if (st.low_threshold > 0 && avail <= st.low_threshold) {
        return { text: "منخفض: " + avail + " " + st.unit, cls: "warn" };
      }
      return { text: "المخزون: " + avail + " " + st.unit, cls: "" };
    };

    const selectShiftType = (val) => {
      shiftType.value = val;
      resetTxId();
    };

    const selectAssistantWorker = (id) => {
      selectedWorkerId.value = id;
      resetTxId();
    };

    const onWorkDateChange = () => {
      resetTxId();
      loadTodayInvoiceItems();
    };

    const setSalesEntryMode = (mode) => {
      salesEntryMode.value = mode;
      saveDraft();
    };

    const onHandoverInput = (side, prodId, rawVal) => {
      handoverState[side][prodId] = formatSpacedIntInput(rawVal);
      if (side === "opening" && !handoverState.startedAt) {
        handoverState.startedAt = new Date(getServerNowMs()).toISOString();
      }
      resetTxId();
    };

    const bumpHandoverVal = (side, prodId, delta) => {
      if (side === "opening" && handoverState.lockedOpening) return;
      const cur = inputToMi(handoverState[side][prodId] ?? "");
      onHandoverInput(side, prodId, String(Math.max(0, cur + delta)));
    };

    const fillOpeningFromSystemStock = () => {
      for (const { product, stockItem } of shiftCountSplit.value.countable) {
        handoverState.opening[product.id] = formatMi(Math.max(0, Number(stockItem.current_qty || 0)));
      }
      handoverState.startedAt = new Date(getServerNowMs()).toISOString();
      resetTxId();
      emit("notify", { text: "تمت التعبئة برصيد النظام — راجع الأعداد ثم ثبّت الاستلام.", type: "ok" });
    };

    const toggleOpeningLock = () => {
      if (!handoverState.lockedOpening) {
        const hasAny = shiftCountSplit.value.countable.some(
          ({ product }) => String(handoverState.opening[product.id] ?? "").trim() !== ""
        );
        if (!hasAny) {
          return emit("notify", { text: "أدخل رصيد الاستلام لسلعة واحدة على الأقل أولاً.", type: "err" });
        }
        if (!handoverState.startedAt) handoverState.startedAt = new Date(getServerNowMs()).toISOString();
        handoverState.lockedOpening = true;
        emit("notify", { text: "تم تثبيت رصيد الاستلام.", type: "ok" });
      } else {
        handoverState.lockedOpening = false;
      }
      saveDraft();
    };

    const openSaleModal = async (p) => {
      saleModal.product = p;
      saleModal.qtyText = qtyByProduct[p.id] > 0 ? formatMi(qtyByProduct[p.id]) : "";
      await nextTick();
      saleInputRef.value?.focus();
    };

    const bumpSaleQty = (delta) => {
      const next = Math.max(0, inputToMi(saleModal.qtyText) + delta);
      saleModal.qtyText = next > 0 ? formatMi(next) : "";
    };

    const confirmSaleModal = () => {
      if (!saleModal.product) return;
      const q = inputToMi(saleModal.qtyText);
      if (q <= 0) return emit("notify", { text: "أدخل كمية أكبر من صفر.", type: "err" });
      qtyByProduct[saleModal.product.id] = q;
      saleModal.product = null;
      resetTxId();
    };

    const clearProductSale = (prodId) => {
      delete qtyByProduct[prodId];
      resetTxId();
    };

    const openDailyExpenseModal = () => {
      dailyExpModal.open = true;
      dailyExpModal.selectedTag = CONSUMABLE_QUICK_TAGS[0];
      dailyExpModal.amountText = "";
    };

    const bumpDailyExpAmount = (deltaMi) => {
      const next = Math.max(0, inputToMi(dailyExpModal.amountText) + deltaMi);
      dailyExpModal.amountText = next > 0 ? formatMi(next) : "";
    };

    const pushTaggedExpenseIfTyped = () => {
      const amt = inputToMi(dailyExpModal.amountText);
      if (amt <= 0) return false;
      const lbl = dailyExpModal.selectedTag;
      const existing = expenses.value.find((e) => e.label === lbl);
      if (existing) {
        existing.amount_mi = amt;
        existing.time = currentTimeHHMM();
      } else {
        expenses.value.push({ label: lbl, amount_mi: amt, time: currentTimeHHMM() });
      }
      dailyExpModal.amountText = "";
      resetTxId();
      return true;
    };

    const selectDailyExpenseTag = (tag) => {
      pushTaggedExpenseIfTyped();
      dailyExpModal.selectedTag = tag;
    };

    const addDailyTaggedExpense = () => {
      if (!pushTaggedExpenseIfTyped()) {
        return emit("notify", { text: "أدخل المبلغ بالمليم أولاً.", type: "err" });
      }
      emit("notify", { text: "تمت إضافة " + dailyExpModal.selectedTag + ".", type: "ok" });
    };

    const finishDailyExpenseModal = () => {
      pushTaggedExpenseIfTyped();
      dailyExpModal.open = false;
    };

    const closeDailyExpenseModal = () => {
      dailyExpModal.open = false;
      dailyExpModal.amountText = "";
    };

    const addUnclassifiedExpense = () => {
      const amt = inputToMi(unclassifiedExpText.value);
      if (amt <= 0) return emit("notify", { text: "أدخل المبلغ بالمليم أولاً.", type: "err" });
      expenses.value.push({ label: "مصروف غير مصنف", amount_mi: amt, time: currentTimeHHMM() });
      unclassifiedExpText.value = "";
      resetTxId();
    };

    const removeExpense = (idx) => {
      expenses.value.splice(idx, 1);
      resetTxId();
    };

    const confirmResetCassa = () => {
      if (!confirm("تصفير الكاسة المفتوحة ومسح المبيعات والمصاريف غير المحفوظة؟")) return;
      clearDraft();
      emit("notify", { text: "تم تصفير الكاسة.", type: "ok" });
    };

    const openCloseModal = () => {
      if (!props.canWrite) return emit("notify", { text: "وضع القراءة فقط مفعل حالياً.", type: "err" });
      if (inputToMi(unclassifiedExpText.value) > 0) {
        return emit("notify", { text: "كتبت مبلغاً في «مصروف آخر» ولم تضغط على «إضافة».", type: "err" });
      }
      if (hasInvalidHandover.value) {
        return emit("notify", { text: "يوجد صنف رصيد تسليمه أكبر من الاستلام — راجع الجرد.", type: "err" });
      }
      if (!recordedSalesList.value.length && !expenses.value.length) {
        return emit("notify", { text: translateError("EMPTY_SHIFT"), type: "err" });
      }
      closeModalOpen.value = true;
    };

    const executeCloseCassa = async () => {
      if (!navigator.onLine) {
        return emit("notify", { text: "لا يوجد اتصال بالإنترنت — مسوّدة الكاسة محفوظة محلياً.", type: "err" });
      }
      const salesPayload = recordedSalesList.value.map((ln) => ({
        product_id: ln.product.id,
        qty: Math.round(ln.qty),
      }));
      const expensesPayload = expenses.value
        .filter((ex) => Number(ex.amount_mi) > 0)
        .map((ex) => ({
          label: ex.label || "مصروف يومي",
          amount_mi: Math.round(Number(ex.amount_mi)),
          time: ex.time || "",
        }));

      let handoverPayload = null;
      if (salesEntryMode.value === "shift_count" && hasStock.value && shiftCountSplit.value.countable.length) {
        const items = handoverRows.value
          .filter((r) => r.hasBoth)
          .map((r) => ({
            product_id: r.product.id,
            stock_item_id: r.stockItem.id,
            name: r.product.name,
            unit: r.stockItem.unit,
            opening_qty: r.openVal,
            added_qty: r.added,
            closing_qty: r.closeVal,
            consumed_qty: r.consumed,
            price_mi: Number(r.product.price_mi || 0),
            total_mi: r.totalMi,
          }));
        if (items.length) {
          handoverPayload = {
            mode: "shift_count",
            started_at: handoverState.startedAt || new Date(getServerNowMs()).toISOString(),
            ended_at: new Date(getServerNowMs()).toISOString(),
            items,
          };
        }
      }

      if (!clientTxId.value) clientTxId.value = generateTxId();
      saveDraft();

      busy.value = true;
      try {
        await callRpc("submit_shift_with_handover", {
          p_client_tx_id: clientTxId.value,
          p_work_date: workDate.value,
          p_shift_type: isWorkerOwner.value ? shiftType.value : "full",
          p_sales: salesPayload,
          p_expenses: expensesPayload,
          p_note: shiftNote.value,
          p_session_version: null,
          p_reopen_shift_id: null,
          p_cafe_id: props.cafe.id,
          p_worker_member_id: isOwnerWithWorker.value ? (selectedWorkerId.value || null) : null,
          p_auto_approve: true,
          p_handover: handoverPayload,
        });

        closeModalOpen.value = false;
        clearDraft();
        emit("notify", { text: "تم إغلاق الكاسة وحفظ اليومية واعتمادها بنجاح.", type: "ok" });
        emit("saved");
      } catch (e) {
        emit("notify", { text: translateError(e), type: "err" });
      } finally {
        busy.value = false;
      }
    };

    watch(() => props.cafe?.id, () => {
      loadDraft();
      loadTodayInvoiceItems();
    });

    watch([salesTotalMi, hasDraftData], emitDraftSummary);

    onMounted(() => {
      loadDraft();
      loadTodayInvoiceItems();
    });

    return {
      CONSUMABLE_QUICK_TAGS,
      QUICK_EXP_BUMPS,
      busy,
      workDate,
      shiftType,
      allowedShiftTypes,
      takenSlots,
      selectedWorkerId,
      selectedWorkerWageMi,
      salesEntryMode,
      shiftNote,
      hasStock,
      isWorkerOwner,
      isOwnerWithWorker,
      activeProducts,
      shiftCountSplit,
      handoverState,
      handoverRows,
      isCountableProduct,
      qtyByProduct,
      expenses,
      unclassifiedExpText,
      recordedSalesList,
      salesTotalMi,
      expensesTotalMi,
      shiftNetMi,
      hasDraftData,
      saleInputRef,
      saleModal,
      dailyExpModal,
      closeModalOpen,
      formatMi,
      inputToMi,
      formatSpacedIntInput,
      shiftTypeLabel,
      productCategoryClass,
      productStockFooter,
      selectShiftType,
      selectAssistantWorker,
      onWorkDateChange,
      setSalesEntryMode,
      onHandoverInput,
      bumpHandoverVal,
      fillOpeningFromSystemStock,
      toggleOpeningLock,
      openSaleModal,
      bumpSaleQty,
      confirmSaleModal,
      clearProductSale,
      openDailyExpenseModal,
      selectDailyExpenseTag,
      bumpDailyExpAmount,
      addDailyTaggedExpense,
      finishDailyExpenseModal,
      closeDailyExpenseModal,
      addUnclassifiedExpense,
      removeExpense,
      confirmResetCassa,
      openCloseModal,
      executeCloseCassa,
      resetTxId,
    };
  },
  template: `
    <div>
      <!-- ملخص الكاسة الحيّة -->
      <div class="cc-cassa-hero">
        <div class="cc-cassa-hero-top">
          <div class="cc-cassa-lbl">صافي الكاسة الحالية</div>
          <div class="cc-cassa-val">
            <bdi class="num-ltr">{{ formatMi(shiftNetMi) }}</bdi> <small>مي</small>
          </div>
        </div>
        <div class="cc-cassa-split">
          <div>
            <div class="cc-cassa-lbl">المبيعات ▲</div>
            <strong><bdi class="num-ltr">{{ formatMi(salesTotalMi) }}</bdi> مي</strong>
          </div>
          <div>
            <div class="cc-cassa-lbl">{{ selectedWorkerWageMi > 0 ? 'المصاريف + الأجر ▼' : 'المصاريف ▼' }}</div>
            <strong><bdi class="num-ltr">{{ formatMi(expensesTotalMi + selectedWorkerWageMi) }}</bdi> مي</strong>
          </div>
        </div>
      </div>

      <!-- التاريخ والحصة (والمساعد إن وُجد) -->
      <div class="card" style="padding:10px 12px;">
        <div class="row" style="gap:8px;">
          <input
            type="date"
            v-model="workDate"
            @change="onWorkDateChange"
            class="ltr"
            style="width:auto; flex:1; padding:7px 8px; font-size:0.88rem;"
          />
          <div v-if="isWorkerOwner" class="cc-segment" style="margin:0; flex:1.1;">
            <button
              type="button"
              v-for="opt in allowedShiftTypes"
              :key="opt.val"
              class="cc-seg-btn cc-tap"
              :class="{ active: shiftType === opt.val }"
              style="padding:7px 4px; font-size:0.8rem;"
              @click="selectShiftType(opt.val)"
            >
              {{ opt.label }}<span v-if="takenSlots.includes(opt.val)" style="color:var(--warn);">•</span>
            </button>
          </div>
          <button
            v-if="hasDraftData"
            type="button"
            class="btn btn-sm btn-danger-soft"
            @click="confirmResetCassa"
          >
            تصفير
          </button>
        </div>

        <div v-if="isOwnerWithWorker" style="margin-top:8px;">
          <div class="muted" style="font-size:0.76rem; margin-bottom:4px;">احتساب أجر العامل المساعد اليوم:</div>
          <div class="cc-chips" style="margin:0;">
            <button
              type="button"
              class="cc-chip cc-tap"
              :class="{ active: selectedWorkerId === '' }"
              @click="selectAssistantWorker('')"
            >
              بدون أجر
            </button>
            <button
              type="button"
              v-for="w in activeWorkers"
              :key="w.id"
              class="cc-chip cc-tap"
              :class="{ active: selectedWorkerId === w.id }"
              @click="selectAssistantWorker(w.id)"
            >
              {{ w.display_name }} (<bdi class="num-ltr">{{ formatMi(w.default_wage_mi) }}</bdi> مي)
            </button>
          </div>
        </div>

        <div v-if="takenSlots.includes(shiftType)" style="margin-top:6px; font-size:0.78rem; color:var(--danger); font-weight:700;">
          ⚠️ توجد يومية مسجّلة مسبقاً لهذه الحصة في هذا التاريخ.
        </div>
      </div>

      <!-- تبديل طريقة الإدخال عند وجود سلع مربوطة بالمخزن -->
      <div v-if="hasStock && shiftCountSplit.countable.length" class="cc-segment">
        <button
          type="button"
          class="cc-seg-btn cc-tap"
          :class="{ active: salesEntryMode === 'shift_count' }"
          @click="setSalesEntryMode('shift_count')"
        >
          📦 جرد الوردية
        </button>
        <button
          type="button"
          class="cc-seg-btn cc-tap"
          :class="{ active: salesEntryMode === 'direct' }"
          @click="setSalesEntryMode('direct')"
        >
          ☕ إدخال مباشر
        </button>
      </div>

      <!-- أ) جرد الوردية (استلام <- تسليم) -->
      <div v-if="salesEntryMode === 'shift_count' && hasStock && shiftCountSplit.countable.length" class="card">
        <div class="row" style="margin-bottom:8px;">
          <div>
            <strong style="font-size:0.94rem;">جرد الوردية (استلام ← تسليم)</strong>
            <div class="muted" style="font-size:0.75rem;">سجّل رصيد البدء ثم النهاية ليُحسب المستهلك تلقائياً</div>
          </div>
          <span v-if="handoverState.lockedOpening" class="badge badge-ok">✓ تم الاستلام</span>
        </div>

        <div class="cc-quick-grid" style="margin-bottom:10px;">
          <button
            type="button"
            class="btn btn-sm btn-outline"
            @click="fillOpeningFromSystemStock"
            :disabled="handoverState.lockedOpening"
          >
            ⚡ تعبئة برصيد النظام
          </button>
          <button
            type="button"
            class="btn btn-sm"
            :class="handoverState.lockedOpening ? 'btn-outline' : 'btn-primary'"
            @click="toggleOpeningLock"
          >
            {{ handoverState.lockedOpening ? 'تعديل الاستلام' : '✓ تثبيت الاستلام' }}
          </button>
        </div>

        <div
          v-for="row in handoverRows"
          :key="row.product.id"
          class="cc-handover-row"
          :class="{ 'has-consumed': row.consumed > 0, 'has-error': row.isInvalid }"
        >
          <div class="row" style="margin-bottom:6px;">
            <strong style="font-size:0.9rem;">{{ row.product.name }}</strong>
            <span class="muted" style="font-size:0.78rem;">
              <bdi class="num-ltr">{{ formatMi(row.product.price_mi) }}</bdi> مي / {{ row.stockItem.unit }}
            </span>
          </div>

          <div class="grid-2" style="grid-template-columns:1fr 1fr; gap:8px;">
            <div>
              <label style="display:block; font-size:0.74rem; color:var(--muted); font-weight:700; margin-bottom:3px;">
                الاستلام ({{ row.stockItem.unit }})
              </label>
              <div class="cc-stepper">
                <button type="button" class="cc-step-btn cc-tap" style="min-width:28px; height:36px;" :disabled="handoverState.lockedOpening" @click="bumpHandoverVal('opening', row.product.id, -1)">-</button>
                <input
                  type="tel"
                  inputmode="numeric"
                  class="ltr cc-step-input"
                  style="flex:1;"
                  :disabled="handoverState.lockedOpening"
                  :value="handoverState.opening[row.product.id] ?? ''"
                  @input="onHandoverInput('opening', row.product.id, $event.target.value)"
                  :placeholder="String(row.stockItem.current_qty)"
                />
                <button type="button" class="cc-step-btn plus cc-tap" style="min-width:28px; height:36px;" :disabled="handoverState.lockedOpening" @click="bumpHandoverVal('opening', row.product.id, 1)">+</button>
              </div>
            </div>
            <div>
              <label style="display:block; font-size:0.74rem; color:var(--primary-dark); font-weight:700; margin-bottom:3px;">
                التسليم (النهاية)
              </label>
              <div class="cc-stepper">
                <button type="button" class="cc-step-btn cc-tap" style="min-width:28px; height:36px;" @click="bumpHandoverVal('closing', row.product.id, -1)">-</button>
                <input
                  type="tel"
                  inputmode="numeric"
                  class="ltr cc-step-input"
                  style="flex:1;"
                  :value="handoverState.closing[row.product.id] ?? ''"
                  @input="onHandoverInput('closing', row.product.id, $event.target.value)"
                  placeholder="0"
                />
                <button type="button" class="cc-step-btn plus cc-tap" style="min-width:28px; height:36px;" @click="bumpHandoverVal('closing', row.product.id, 1)">+</button>
              </div>
            </div>
          </div>

          <div class="row" style="margin-top:6px; font-size:0.78rem;">
            <span v-if="row.added > 0" class="badge badge-info">+ وارد فواتير: <bdi class="num-ltr">{{ row.added }}</bdi></span>
            <span v-else class="muted" style="font-size:0.74rem;">رصيد النظام: <strong class="num-ltr">{{ row.stockItem.current_qty }}</strong></span>
            <strong v-if="row.isInvalid" style="color:var(--danger);">⚠️ التسليم أكبر من الاستلام</strong>
            <strong v-else-if="row.hasBoth && row.consumed > 0" style="color:var(--ok);">
              المستهلك: <bdi class="num-ltr">{{ row.consumed }}</bdi> ← <bdi class="num-ltr">{{ formatMi(row.totalMi) }}</bdi> مي
            </strong>
            <span v-else class="muted">{{ row.hasBoth ? 'المستهلك: 0' : 'أدخل الاستلام والتسليم' }}</span>
          </div>
        </div>

        <!-- أصناف التحضير المباشر -->
        <div v-if="shiftCountSplit.direct.length" style="margin-top:12px; padding-top:10px; border-top:1px solid var(--border);">
          <strong style="display:block; font-size:0.86rem; color:var(--muted); margin-bottom:8px;">أصناف التحضير المباشر</strong>
          <div class="cc-prod-grid">
            <button
              v-for="item in shiftCountSplit.direct"
              :key="item.product.id"
              type="button"
              class="cc-prod-card cc-tap"
              :class="[productCategoryClass(item.product.category), qtyByProduct[item.product.id] > 0 ? 'registered' : '']"
              @click="openSaleModal(item.product)"
            >
              <div class="cc-prod-title">{{ item.product.name }}</div>
              <div v-if="qtyByProduct[item.product.id] > 0" class="cc-prod-sold">
                ✓ <bdi class="num-ltr">{{ qtyByProduct[item.product.id] }}</bdi> {{ item.product.sale_unit }}
              </div>
              <div v-else class="cc-prod-price">
                <bdi class="num-ltr">{{ formatMi(item.product.price_mi) }}</bdi> مي / {{ item.product.sale_unit }}
              </div>
              <div class="cc-prod-foot">تحضير مباشر</div>
            </button>
          </div>
        </div>
      </div>

      <!-- ب) الإدخال المباشر بالبطاقات -->
      <div v-else class="card">
        <strong style="display:block; font-size:0.92rem; margin-bottom:8px;">اضغط على السلعة لتسجيل البيع</strong>
        <div v-if="!activeProducts.length" style="text-align:center; padding:14px 4px;">
          <p class="muted" style="margin:0 0 12px;">لم تضف سلع المقهى بعد (القهوة، الماء، الشاي...).</p>
          <button type="button" class="btn btn-primary" @click="$emit('open-menu')">
            + إضافة سلع المقهى الآن
          </button>
        </div>
        <div v-else class="cc-prod-grid">
          <button
            v-for="p in activeProducts"
            :key="p.id"
            type="button"
            class="cc-prod-card cc-tap"
            :class="[productCategoryClass(p.category), qtyByProduct[p.id] > 0 ? 'registered' : '']"
            @click="openSaleModal(p)"
          >
            <div class="cc-prod-title">{{ p.name }}</div>
            <div v-if="qtyByProduct[p.id] > 0" class="cc-prod-sold">
              ✓ <bdi class="num-ltr">{{ qtyByProduct[p.id] }}</bdi> {{ p.sale_unit }}
            </div>
            <div v-else class="cc-prod-price">
              <bdi class="num-ltr">{{ formatMi(p.price_mi) }}</bdi> مي / {{ p.sale_unit }}
            </div>
            <div class="cc-prod-foot" :class="productStockFooter(p).cls">
              {{ productStockFooter(p).text }}
            </div>
          </button>
        </div>
      </div>

      <!-- المصاريف اليومية -->
      <div class="card">
        <div class="row" style="margin-bottom:8px;">
          <strong>المصاريف اليومية ({{ expenses.length }})</strong>
          <button type="button" class="btn btn-sm btn-primary" @click="openDailyExpenseModal">
            + مواد يومية (بالضغط)
          </button>
        </div>

        <form @submit.prevent="addUnclassifiedExpense" class="row" style="flex-wrap:nowrap; margin-bottom:6px;">
          <input
            type="tel"
            inputmode="numeric"
            :value="unclassifiedExpText"
            @input="unclassifiedExpText = formatSpacedIntInput($event.target.value)"
            class="ltr"
            style="flex:1; text-align:center; font-weight:700;"
            placeholder="مصروف آخر بالمليم..."
          />
          <button type="submit" class="btn btn-outline" style="border-color:var(--primary); color:var(--primary-dark); flex-shrink:0;">إضافة</button>
        </form>

        <div v-if="!expenses.length" class="muted" style="text-align:center; padding:4px 0; font-size:0.82rem;">
          لا توجد مصاريف يومية مسجّلة.
        </div>
        <div v-for="(ex, idx) in expenses" :key="idx" class="cc-cassa-list-row">
          <div style="min-width:0; flex:1;">
            <strong style="font-size:0.88rem;">{{ ex.label }}</strong>
            <span v-if="ex.time" class="muted num-ltr" style="margin-right:6px; font-size:0.75rem;">{{ ex.time }}</span>
          </div>
          <div class="row" style="flex-wrap:nowrap; gap:6px;">
            <strong style="color:var(--danger); font-size:0.88rem;"><bdi class="num-ltr">{{ formatMi(ex.amount_mi) }}</bdi> مي</strong>
            <button type="button" class="btn btn-sm btn-danger-soft" @click="removeExpense(idx)">×</button>
          </div>
        </div>
      </div>

      <!-- المبيعات المسجّلة -->
      <div class="card" v-if="recordedSalesList.length">
        <div class="row" style="margin-bottom:6px;">
          <strong>مبيعات الكاسة ({{ recordedSalesList.length }})</strong>
          <span class="badge badge-ok">محفوظة تلقائياً</span>
        </div>
        <div v-for="ln in recordedSalesList" :key="ln.product.id" class="cc-cassa-list-row">
          <div style="min-width:0; flex:1;">
            <strong style="font-size:0.88rem;">{{ ln.product.name }}</strong>
            <span class="muted" style="margin-right:4px; font-size:0.8rem;">(<bdi class="num-ltr">{{ ln.qty }}</bdi> {{ ln.product.sale_unit }})</span>
          </div>
          <div class="row" style="flex-wrap:nowrap; gap:6px;">
            <strong style="color:var(--ok); font-size:0.88rem;"><bdi class="num-ltr">{{ formatMi(ln.amountMi) }}</bdi> مي</strong>
            <button
              v-if="salesEntryMode === 'direct' || !isCountableProduct(ln.product.id)"
              type="button"
              class="btn btn-sm btn-danger-soft"
              @click="clearProductSale(ln.product.id)"
            >×</button>
          </div>
        </div>
      </div>

      <!-- ملاحظة اختيارية -->
      <div class="card" style="padding:10px;">
        <input type="text" v-model.trim="shiftNote" maxlength="500" @input="resetTxId" placeholder="ملاحظة اختيارية لليومية..." />
      </div>

      <!-- زر إغلاق الكاسة -->
      <button
        type="button"
        class="btn btn-primary btn-block"
        style="min-height:48px; font-size:0.96rem;"
        :disabled="busy || !canWrite"
        @click="openCloseModal"
      >
        🔒 إغلاق الكاسة وحفظ يومية ({{ workDate }})
      </button>

      <!-- نافذة تسجيل كمية سلعة -->
      <div v-if="saleModal.product" class="modal-backdrop" style="z-index:65;" @click.self="saleModal.product = null">
        <div class="modal">
          <div class="cc-sheet-handle"></div>
          <div class="row" style="margin-bottom:8px;">
            <div>
              <h3 style="margin:0;">{{ saleModal.product.name }}</h3>
              <div class="muted" style="font-size:0.82rem;">
                <bdi class="num-ltr">{{ formatMi(saleModal.product.price_mi) }}</bdi> مي / {{ saleModal.product.sale_unit }}
              </div>
            </div>
            <button type="button" class="btn btn-sm btn-outline" @click="saleModal.product = null">إغلاق</button>
          </div>

          <form @submit.prevent="confirmSaleModal">
            <div class="field">
              <label>الكمية المباعة ({{ saleModal.product.sale_unit }})</label>
              <div class="cc-chips">
                <button type="button" class="cc-chip cc-tap ltr" @click="bumpSaleQty(-1)">-1</button>
                <button type="button" class="cc-chip cc-tap ltr" @click="bumpSaleQty(1)">+1</button>
                <button type="button" class="cc-chip cc-tap ltr" @click="bumpSaleQty(5)">+5</button>
                <button type="button" class="cc-chip cc-tap ltr" @click="bumpSaleQty(10)">+10</button>
                <button type="button" class="cc-chip cc-tap" @click="saleModal.qtyText = ''">مسح</button>
              </div>
              <input
                ref="saleInputRef"
                type="tel"
                inputmode="numeric"
                :value="saleModal.qtyText"
                @input="saleModal.qtyText = formatSpacedIntInput($event.target.value)"
                class="ltr"
                style="text-align:center; font-size:1.3rem; font-weight:800; padding:10px;"
                placeholder="0"
              />
            </div>

            <div class="card" style="background:#f9fafb; padding:10px; margin-bottom:12px;">
              <div class="row">
                <span class="muted">المجموع:</span>
                <strong style="color:var(--primary); font-size:1.05rem;">
                  <bdi class="num-ltr">{{ formatMi(inputToMi(saleModal.qtyText) * Number(saleModal.product.price_mi || 0)) }}</bdi> مي
                </strong>
              </div>
            </div>

            <div class="row" style="gap:8px;">
              <button type="submit" class="btn btn-primary" style="flex:2;">✓ حفظ الكمية</button>
              <button
                v-if="qtyByProduct[saleModal.product.id] > 0"
                type="button"
                class="btn btn-danger-soft"
                style="flex:1;"
                @click="clearProductSale(saleModal.product.id); saleModal.product = null"
              >حذف</button>
            </div>
          </form>
        </div>
      </div>

      <!-- نافذة المواد اليومية -->
      <div v-if="dailyExpModal.open" class="modal-backdrop" style="z-index:65;" @click.self="closeDailyExpenseModal">
        <div class="modal">
          <div class="cc-sheet-handle"></div>
          <div class="row" style="margin-bottom:10px;">
            <h3 style="margin:0;">المصاريف والمواد اليومية</h3>
            <button type="button" class="btn btn-sm btn-outline" @click="closeDailyExpenseModal">إغلاق</button>
          </div>

          <div class="cc-chips" style="margin-bottom:10px; max-height:175px; overflow-y:auto;">
            <button
              v-for="tag in CONSUMABLE_QUICK_TAGS"
              :key="tag"
              type="button"
              class="cc-chip cc-tap"
              :class="{ active: dailyExpModal.selectedTag === tag }"
              @click="selectDailyExpenseTag(tag)"
            >
              {{ tag }}
            </button>
          </div>

          <form @submit.prevent="addDailyTaggedExpense">
            <div class="field">
              <label>المبلغ بالمليم ({{ dailyExpModal.selectedTag }})</label>
              <div class="cc-chips">
                <button
                  type="button"
                  v-for="amt in QUICK_EXP_BUMPS"
                  :key="amt"
                  class="cc-chip cc-tap num-ltr"
                  @click="bumpDailyExpAmount(amt)"
                >
                  +{{ formatMi(amt) }}
                </button>
                <button type="button" class="cc-chip cc-tap" @click="dailyExpModal.amountText = ''">مسح</button>
              </div>
              <input
                type="tel"
                inputmode="numeric"
                :value="dailyExpModal.amountText"
                @input="dailyExpModal.amountText = formatSpacedIntInput($event.target.value)"
                class="ltr"
                style="text-align:center; font-size:1.3rem; font-weight:800; padding:10px;"
                placeholder="0"
              />
            </div>

            <div class="cc-quick-grid" style="margin-bottom:0;">
              <button type="submit" class="btn btn-outline" style="border-color:var(--primary); color:var(--primary-dark);">+ إضافة</button>
              <button type="button" class="btn btn-primary" @click="finishDailyExpenseModal">✓ حفظ وإغلاق</button>
            </div>
          </form>
        </div>
      </div>

      <!-- نافذة تأكيد إغلاق الكاسة -->
      <div v-if="closeModalOpen" class="modal-backdrop" style="z-index:65;" @click.self="!busy && (closeModalOpen = false)">
        <div class="modal">
          <div class="cc-sheet-handle"></div>
          <div class="row" style="margin-bottom:10px;">
            <div>
              <h3 style="margin:0;">إغلاق كاسة <bdi class="num-ltr">{{ workDate }}</bdi></h3>
              <div class="muted" style="font-size:0.82rem;">{{ shiftTypeLabel(shiftType) }} • اعتماد وخصم مخزون مباشر</div>
            </div>
            <button type="button" class="btn btn-sm btn-outline" :disabled="busy" @click="closeModalOpen = false">إلغاء</button>
          </div>

          <div class="card" style="background:#f9fafb; line-height:1.95; font-size:0.9rem;">
            <div class="row"><span>إجمالي المبيعات</span><strong style="color:var(--ok);"><bdi class="num-ltr">{{ formatMi(salesTotalMi) }}</bdi> مي</strong></div>
            <div class="row"><span>المصاريف اليومية</span><strong style="color:var(--danger);"><bdi class="num-ltr">-{{ formatMi(expensesTotalMi) }}</bdi> مي</strong></div>
            <div v-if="selectedWorkerWageMi > 0" class="row"><span>أجر العامل المساعد</span><strong style="color:var(--danger);"><bdi class="num-ltr">-{{ formatMi(selectedWorkerWageMi) }}</bdi> مي</strong></div>
            <hr class="divider" />
            <div class="row" style="font-size:1.05rem;">
              <strong>الصافي المحفوظ</strong>
              <strong :style="{ color: shiftNetMi >= 0 ? 'var(--primary)' : 'var(--danger)' }">
                <bdi class="num-ltr">{{ formatMi(shiftNetMi) }}</bdi> مي
              </strong>
            </div>
          </div>

          <button type="button" class="btn btn-primary btn-block" :disabled="busy" @click="executeCloseCassa">
            {{ busy ? 'جارٍ الحفظ والاعتماد...' : '✓ تأكيد إغلاق الكاسة' }}
          </button>
        </div>
      </div>
    </div>
  `,
};
