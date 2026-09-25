// ---------------------------------------------------------------------------
// Question catalog — single source of truth for the interview form.
//
// The app stores answers as rows of InterviewAnswer keyed by `question.key`.
// Adding a new question here later requires NO database migration:
//   - the form renders it automatically,
//   - validation is generated from the catalog,
//   - the detail page, CSV export and Sheets sync read it automatically.
// ---------------------------------------------------------------------------

export type QuestionType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "radio"
  | "multiselect";

export type QuestionGroup =
  | "store"
  | "sales"
  | "online"
  | "delivery"
  | "revenue"
  | "trust"
  | "discovery";

export interface QuestionOption {
  value: string;
  label: string;
}

export interface DependsOn {
  /** Parent question key. */
  key: string;
  /** Show this question when the parent answer matches. */
  when: "equals" | "in" | "notEquals";
  /** Single value for equals/notEquals, array for in. */
  value: string | string[];
}

export interface Question {
  key: string;
  step: number;
  group: QuestionGroup;
  label: string;
  hint?: string;
  placeholder?: string;
  type: QuestionType;
  required: boolean;
  options?: QuestionOption[];
  min?: number;
  max?: number;
  suffix?: string;
  dependsOn?: DependsOn;
}

export const STEP_COUNT = 7;

export const STEP_TITLES: Record<number, string> = {
  1: "اطلاعات فروشگاه",
  2: "وضعیت فعلی فروش",
  3: "فروش اینترنتی",
  4: "خرید و دریافت",
  5: "مدل درآمد",
  6: "اعتماد و امکانات",
  7: "کشف و بینش",
};

export const STEP_TITLES_EN: Record<number, string> = {
  1: "store",
  2: "sales",
  3: "online",
  4: "delivery",
  5: "revenue",
  6: "trust",
  7: "discovery",
};

export const QUESTIONS: Question[] = [
  // ------------------------------------------------ Step 1 — Store info
  {
    key: "store_name",
    step: 1,
    group: "store",
    label: "نام فروشگاه",
    hint: "نام فروشگاه یا واحد فروش قطعات",
    placeholder: "مثلاً: قطعات یدکی بهار",
    type: "text",
    required: true,
  },
  {
    key: "activity_type",
    step: 1,
    group: "store",
    label: "نوع فعالیت",
    type: "select",
    required: true,
    options: [
      { value: "original", label: "قطعات یدکی اصل" },
      { value: "aftermarket", label: "قطعات یدکی تعویضی / متفرقه" },
      { value: "consumable", label: "لوازم مصرفی (فیلتر، روغن و…)" },
      { value: "wholesale", label: "عمده‌فروش قطعات" },
      { value: "online", label: "فروش اینترنتی قطعات" },
      { value: "garage_shop", label: "تعمیرگاه + فروش قطعات" },
      { value: "other", label: "سایر" },
    ],
  },
  {
    key: "years_active",
    step: 1,
    group: "store",
    label: "سابقه فعالیت",
    type: "select",
    required: true,
    options: [
      { value: "lt1", label: "کمتر از ۱ سال" },
      { value: "1-3", label: "۱ تا ۳ سال" },
      { value: "3-7", label: "۳ تا ۷ سال" },
      { value: "7-15", label: "۷ تا ۱۵ سال" },
      { value: "gt15", label: "بیش از ۱۵ سال" },
    ],
  },
  {
    key: "product_count",
    step: 1,
    group: "store",
    label: "تعداد تقریبی انواع قطعات",
    hint: "حدود چند نوع قطعه در فروشگاه دارید؟",
    placeholder: "مثلاً ۵۰۰",
    type: "number",
    required: true,
    min: 0,
  },
  {
    key: "car_brands",
    step: 1,
    group: "store",
    label: "خودروهای اصلی",
    hint: "بیشتر برای کدام خودروها قطعه دارید؟",
    type: "multiselect",
    required: true,
    options: [
      { value: "irankhodro", label: "ایران‌خودرو (پژو، سمند، دنا)" },
      { value: "saipa", label: "سایپا (پراید، تیبا، شاهین)" },
      { value: "pars", label: "پارس‌خودرو / ایسوزو" },
      { value: "european", label: "وارداتی اروپایی" },
      { value: "asian", label: "وارداتی آسیایی (کره‌ای / ژاپنی)" },
      { value: "chinese", label: "خودروهای چینی" },
      { value: "motorcycle", label: "موتورسیکلت" },
    ],
  },
  // ------------------------------------------------ Step 2 — Current sales
  {
    key: "how_clients_find",
    step: 2,
    group: "sales",
    label: "مشتری‌ها معمولاً چگونه قطعه پیدا می‌کنند؟",
    type: "multiselect",
    required: true,
    options: [
      { value: "walk_in", label: "مراجعه حضوری / سر زدن" },
      { value: "phone", label: "تماس تلفنی" },
      { value: "messenger", label: "پیامک / تلگرام / واتساپ" },
      { value: "referral", label: "معرفی از آشنایان" },
      { value: "garage_ref", label: "توصیه تعمیرگاه" },
    ],
  },
  {
    key: "call_before_visit_percent",
    step: 2,
    group: "sales",
    label: "چند درصد مشتری‌ها قبل از مراجعه تماس می‌گیرند؟",
    hint: "تخمین شما از بین ۰ تا ۱۰۰",
    type: "number",
    suffix: "٪",
    required: true,
    min: 0,
    max: 100,
  },
  {
    key: "out_of_stock_often",
    step: 2,
    group: "sales",
    label: "آیا پیش می‌آید قطعه‌ای که خواسته می‌شود موجود نباشد؟",
    type: "radio",
    required: true,
    options: [
      { value: "daily", label: "هر روز" },
      { value: "weekly", label: "چند بار در هفته" },
      { value: "monthly", label: "هفته‌ای یک‌بار یا کمتر" },
      { value: "rarely", label: "به‌ندرت" },
    ],
  },
  {
    key: "when_out_of_stock",
    step: 2,
    group: "sales",
    label: "وقتی قطعه موجود نیست چه اتفاقی می‌افتد؟",
    type: "multiselect",
    required: true,
    options: [
      { value: "ask_later", label: "به مشتری می‌گوییم بعداً مراجعه کند" },
      { value: "source_peer", label: "از فروشندگان همکار تأمین می‌کنیم" },
      { value: "order", label: "سفارش می‌گیریم و بعداً تحویل می‌دهیم" },
      { value: "lose_customer", label: "مشتری به جای دیگری مراجعه می‌کند" },
    ],
  },
  {
    key: "biggest_problem",
    step: 2,
    group: "sales",
    label: "بزرگ‌ترین مشکل فروشگاه شما چیست؟",
    type: "textarea",
    required: true,
    placeholder: "مثلاً پیدا نکردن قطعه، قیمت‌گذاری، مشتری‌یابی…",
  },
  {
    key: "find_part_time",
    step: 2,
    group: "sales",
    label: "پیدا کردن قطعه مناسب برای یک مشتری معمولاً چقدر زمان می‌برد؟",
    hint: "از لحظه پرس‌وجو تا پیدا شدن قطعه",
    type: "select",
    required: true,
    options: [
      { value: "minutes", label: "چند دقیقه" },
      { value: "hour", label: "کمتر از یک ساعت" },
      { value: "half_day", label: "نصف روز" },
      { value: "day", label: "یک روز" },
      { value: "longer", label: "بیشتر از یک روز" },
    ],
  },
  {
    key: "wrong_part_mistakes",
    step: 2,
    group: "sales",
    label: "آیا اشتباه در تشخیص قطعه یا سازگاری برای مشتریان اتفاق می‌افتد؟",
    type: "radio",
    required: true,
    options: [
      { value: "rarely", label: "به‌ندرت" },
      { value: "sometimes", label: "گاهی پیش می‌آید" },
      { value: "often", label: "اغلب پیش می‌آید" },
    ],
  },
  // ------------------------------------------------ Step 3 — Online sales
  {
    key: "has_online_sales",
    step: 3,
    group: "online",
    label: "آیا تاکنون فروش اینترنتی داشته‌اید؟",
    type: "radio",
    required: true,
    options: [
      { value: "yes", label: "بله، دارم" },
      { value: "had", label: "قبلاً داشتم" },
      { value: "never", label: "خیر، نداشته‌ام" },
    ],
  },
  {
    key: "online_method",
    step: 3,
    group: "online",
    label: "از چه روشی فروش اینترنتی انجام می‌دهید؟",
    type: "multiselect",
    required: true,
    dependsOn: { key: "has_online_sales", when: "in", value: ["yes", "had"] },
    options: [
      { value: "instagram", label: "اینستاگرام" },
      { value: "messenger", label: "تلگرام / واتساپ" },
      { value: "classifieds", label: "دیوار / شیپور" },
      { value: "own_site", label: "سایت شخصی" },
      { value: "marketplace", label: "فروشگاه‌های آنلاین (دیجی‌کالا و…)" },
    ],
  },
  {
    key: "online_experience",
    step: 3,
    group: "online",
    label: "تجربه فروش اینترنتی شما چگونه بوده است؟",
    type: "radio",
    required: true,
    dependsOn: { key: "has_online_sales", when: "in", value: ["yes", "had"] },
    options: [
      { value: "great", label: "خیلی رضایت‌بخش" },
      { value: "good", label: "نسبتاً خوب" },
      { value: "average", label: "متوسط" },
      { value: "weak", label: "ضعیف" },
      { value: "bad", label: "بد" },
    ],
  },
  {
    key: "online_stopped_reason",
    step: 3,
    group: "online",
    label: "چه چیزی باعث شد فروش اینترنتی را کنار بگذارید؟",
    type: "textarea",
    required: true,
    dependsOn: { key: "has_online_sales", when: "equals", value: "had" },
    placeholder: "مثلاً جواب‌گویی زیاد، اعتماد مشتری، هزینه…",
  },
  {
    key: "online_never_reason",
    step: 3,
    group: "online",
    label: "چرا تاکنون فروش اینترنتی نداشته‌اید؟",
    type: "textarea",
    required: true,
    dependsOn: { key: "has_online_sales", when: "equals", value: "never" },
    placeholder: "مثلاً بلد نیستم، نیازی نیست، مشتری حضوری دارم…",
  },
  {
    key: "site_benefit",
    step: 3,
    group: "online",
    label: "یک سایت معرفی و فروش قطعات چه مزیتی برای کسب‌وکار شما دارد؟",
    type: "multiselect",
    required: true,
    options: [
      { value: "customers", label: "افزایش تعداد مشتری" },
      { value: "reach", label: "دسترسی به مشتری در شهرهای دیگر" },
      { value: "inventory_info", label: "نشان دادن موجودی و اطلاع‌رسانی" },
      { value: "price_transparency", label: "شفافیت قیمت برای مشتری" },
      { value: "cheap_ads", label: "تبلیغ کم‌هزینه" },
      { value: "no_benefit", label: "هیچ مزیتی نمی‌بینم" },
    ],
  },
  {
    key: "usage_barriers",
    step: 3,
    group: "online",
    label: "چه چیزی باعث می‌شود از چنین سایتی استفاده نکنید؟",
    type: "multiselect",
    required: true,
    options: [
      { value: "trust", label: "اعتماد نکردن به خرید آنلاین" },
      { value: "complexity", label: "پیچیدگی ثبت محصول" },
      { value: "tech_fear", label: "نیاز به تخصص فنی" },
      { value: "cost", label: "هزینه ثبت و کمیسیون" },
      { value: "race_down", label: "بی‌اعتمادی به شفاف‌شدن قیمت‌ها" },
      { value: "refund_fear", label: "نگرانی از مرجوعی / فسخ سفارش" },
      { value: "none", label: "مورد خاصی نمی‌بینم" },
    ],
  },
  {
    key: "willing_register_products",
    step: 3,
    group: "online",
    label: "آیا حاضرید محصولات‌تان را در سایت ثبت کنید؟",
    type: "radio",
    required: true,
    options: [
      { value: "yes", label: "بله" },
      { value: "with_help", label: "بله، ولی با کمک" },
      { value: "no", label: "خیر" },
    ],
  },
  {
    key: "register_time",
    step: 3,
    group: "online",
    label: "به‌نظر شما ثبت هر محصول چقدر زمان می‌برد؟",
    type: "select",
    required: true,
    options: [
      { value: "lt15", label: "زیر ۱۵ دقیقه" },
      { value: "half_day", label: "نصف روز" },
      { value: "day", label: "یک روز کاری" },
      { value: "week", label: "یک هفته یا بیشتر" },
    ],
  },
  {
    key: "who_enters_products",
    step: 3,
    group: "online",
    label: "چه کسی باید محصولات را وارد سایت کند؟",
    type: "radio",
    required: true,
    options: [
      { value: "owner", label: "خودم / کارمندم" },
      { value: "platform", label: "پلتفرم باید ثبت کند" },
      { value: "paid_service", label: "خدمت پولی ثبت محصول" },
    ],
  },
  // ------------------------------------------------ Step 4 — Purchase & delivery
  {
    key: "delivery_preference",
    step: 4,
    group: "delivery",
    label: "مشتری ترجیحاً چگونه قطعه را دریافت کند؟",
    type: "radio",
    required: true,
    options: [
      { value: "in_person", label: "دریافت حضوری از فروشگاه" },
      { value: "garage", label: "ارسال مستقیم به تعمیرگاه مشتری" },
      { value: "post", label: "پست" },
      { value: "courier", label: "پیک" },
      { value: "depends", label: "بستگی به مشتری دارد" },
    ],
  },
  {
    key: "reservation_useful",
    step: 4,
    group: "delivery",
    label: "آیا «رزرو قطعه + دریافت حضوری» برای شما مفید است؟",
    type: "radio",
    required: true,
    options: [
      { value: "yes", label: "بله" },
      { value: "no", label: "خیر" },
      { value: "unsure", label: "بی‌نظرم" },
    ],
  },
  {
    key: "reservation_not_good_reason",
    step: 4,
    group: "delivery",
    label: "چرا رزرو حضوری برای شما مناسب نیست؟",
    type: "textarea",
    required: true,
    dependsOn: { key: "reservation_useful", when: "equals", value: "no" },
    placeholder: "مثلاً مشتری تلفنی هم تماس نمی‌گیرد…",
  },
  {
    key: "no_show_problem",
    step: 4,
    group: "delivery",
    label: "اگر مشتری رزرو کند ولی مراجعه نکند چه مشکلی ایجاد می‌شود؟",
    type: "radio",
    required: true,
    options: [
      { value: "loss", label: "خیلی مشکل‌ساز است / ضرر مالی دارد" },
      { value: "somewhat", label: "تا حدی مشکل دارد" },
      { value: "rare", label: "به‌ندرت پیش می‌آید" },
      { value: "no_problem", label: "مشکلی ندارد" },
    ],
  },
  {
    key: "prepay_ok",
    step: 4,
    group: "delivery",
    label: "آیا پرداخت قبل از مراجعه و دریافت قطعه مناسب است؟",
    type: "radio",
    required: true,
    options: [
      { value: "yes", label: "بله" },
      { value: "no", label: "خیر" },
      { value: "depends", label: "بستگی به مبلغ دارد" },
    ],
  },
  {
    key: "required_info_before_buy",
    step: 4,
    group: "delivery",
    label: "چه اطلاعاتی باید قبل از خرید به مشتری نمایش داده شود؟",
    type: "multiselect",
    required: true,
    options: [
      { value: "photo", label: "عکس قطعه" },
      { value: "price", label: "قیمت دقیق" },
      { value: "stock", label: "موجودی" },
      { value: "brand", label: "برند / کیفیت" },
      { value: "compatibility", label: "سازگاری با خودرو" },
      { value: "delivery_time", label: "زمان تحویل" },
      { value: "warranty", label: "ضمانت / مرجوعی" },
    ],
  },
  // ------------------------------------------------ Step 5 — Revenue model
  {
    key: "willing_pay_platform",
    step: 5,
    group: "revenue",
    label: "آیا حاضرید بابت مشتری جدید / فروش موفق مبلغی به پلتفرم بدهید؟",
    type: "radio",
    required: true,
    options: [
      { value: "yes", label: "بله" },
      { value: "maybe", label: "شاید" },
      { value: "no", label: "خیر" },
    ],
  },
  {
    key: "not_willing_reason",
    step: 5,
    group: "revenue",
    label: "چه دلیلی دارد که حاضر نیستید برای پلتفرم مبلغی بدهید؟",
    type: "textarea",
    required: true,
    dependsOn: { key: "willing_pay_platform", when: "equals", value: "no" },
    placeholder: "مثلاً حاشیه سود کم، هزینه اضافه، بی‌اعتمادی…",
  },
  {
    key: "revenue_model",
    step: 5,
    group: "revenue",
    label: "کدام مدل درآمدی برای شما قابل قبول است؟",
    type: "multiselect",
    required: true,
    options: [
      { value: "commission", label: "درصد از فروش" },
      { value: "subscription", label: "اشتراک ماهانه" },
      { value: "fixed", label: "مبلغ ثابت" },
      { value: "hybrid", label: "ترکیبی" },
      { value: "dont_know", label: "نمی‌دانم" },
    ],
  },
  {
    key: "suggested_commission",
    step: 5,
    group: "revenue",
    label: "درصد کمیسیون پیشنهادی شما برای هر فروش چقدر است؟",
    hint: "عدد بین ۰ تا ۱۰۰",
    suffix: "٪",
    type: "number",
    required: true,
    min: 0,
    max: 100,
    dependsOn: { key: "willing_pay_platform", when: "notEquals", value: "no" },
  },
  {
    key: "commission_pay_time",
    step: 5,
    group: "revenue",
    label: "چه زمانی برای پرداخت کمیسیون مناسب است؟",
    type: "radio",
    required: true,
    dependsOn: { key: "willing_pay_platform", when: "notEquals", value: "no" },
    options: [
      { value: "per_sale", label: "بعد از هر فروش" },
      { value: "end_month", label: "پایان ماه" },
      { value: "periodic", label: "دوره‌ای" },
      { value: "never", label: "ترجیح می‌دهم کلاً پرداخت نکنم" },
    ],
  },
  {
    key: "free_register_plus_commission_ok",
    step: 5,
    group: "revenue",
    label: "ثبت رایگان فروشگاه + کمیسیون از فروش برای شما قابل قبول است؟",
    type: "radio",
    required: true,
    options: [
      { value: "yes", label: "بله" },
      { value: "no", label: "خیر" },
      { value: "see", label: "باید شرایط را ببینم" },
    ],
  },
  // ------------------------------------------------ Step 6 — Trust & features
  {
    key: "trust_factors",
    step: 6,
    group: "trust",
    label: "چه چیزی باعث اعتماد شما به یک پلتفرم می‌شود؟",
    type: "multiselect",
    required: true,
    options: [
      { value: "record", label: "سابقه و اعتبار پلتفرم" },
      { value: "reviews", label: "نظرات و امتیاز مشتری‌ها" },
      { value: "contract", label: "قرارداد رسمی" },
      { value: "support", label: "پشتیبانی واقعی انسانی" },
      { value: "settlement", label: "تسویه به‌موقع حساب" },
      { value: "transparency", label: "شفافیت قوانین و کمیسیون" },
    ],
  },
  {
    key: "show_store_info_problem",
    step: 6,
    group: "trust",
    label: "نمایش اطلاعات فروشگاه (آدرس، شماره تماس) برای مشتری مشکلی دارد؟",
    type: "radio",
    required: true,
    options: [
      { value: "no", label: "مشکلی ندارد" },
      { value: "yes", label: "مشکل دارد" },
      { value: "conditions", label: "با شرایط خاصی قبول دارم" },
    ],
  },
  {
    key: "chat_needed",
    step: 6,
    group: "trust",
    label: "آیا چت مستقیم مشتری و فروشنده لازم است؟",
    type: "radio",
    required: true,
    options: [
      { value: "yes", label: "بله، لازم است" },
      { value: "no", label: "نیازی نیست" },
      { value: "unsure", label: "بی‌نظرم" },
    ],
  },
  {
    key: "essential_features",
    step: 6,
    group: "trust",
    label: "کدام امکانات برای شما ضروری‌ترند؟",
    type: "multiselect",
    required: true,
    options: [
      { value: "live_stock", label: "موجودی لحظه‌ای" },
      { value: "advanced_search", label: "جستجوی سریع با کد فنی / شماره قطعه" },
      { value: "online_payment", label: "پرداخت آنلاین" },
      { value: "reservation", label: "قابلیت رزرو" },
      { value: "ratings", label: "امتیازدهی فروشنده" },
      { value: "support", label: "پشتیبانی و آموزش ثبت محصول" },
      { value: "fast_registration", label: "ثبت سریع و ساده محصول" },
    ],
  },
  // ------------------------------------------------ Step 7 — Discovery
  {
    key: "one_problem_to_solve",
    step: 7,
    group: "discovery",
    label: "اگر فقط یک مشکل فروشگاه شما حل شود، چه چیزی باشد؟",
    type: "textarea",
    required: true,
    placeholder: "مثلاً یافتن قطعه نایاب، جذب مشتری بیشتر…",
  },
  {
    key: "ideal_site_role",
    step: 7,
    group: "discovery",
    label: "سایت ایده‌آل از نظر شما دقیقاً چه کاری باید انجام دهد؟",
    type: "textarea",
    required: true,
    placeholder: "توضیح دهید سایت دلخواه شما چه امکانی داشته باشد…",
  },
  {
    key: "usage_avoid_reasons",
    step: 7,
    group: "discovery",
    label: "چه چیزی باعث می‌شود شما از سایت استفاده نکنید؟",
    type: "multiselect",
    required: true,
    options: [
      { value: "no_customers", label: "مشتری آنلاین نداشته باشد" },
      { value: "low_orders", label: "سفارش‌ها همیشگی و پایدار نباشد" },
      { value: "hard_use", label: "استفاده از سایت سخت باشد" },
      { value: "high_cost", label: "هزینه‌ها زیاد باشد" },
      { value: "mistrust", label: "به پلتفرم اعتماد نکنم" },
      { value: "competition", label: "سایر فروشندگان سواستفاده قیمتی کنند" },
    ],
  },
  {
    key: "seen_similar",
    step: 7,
    group: "discovery",
    label: "نمونه مشابهی دیده‌اید؟",
    type: "radio",
    required: true,
    options: [
      { value: "yes", label: "بله، دیده‌ام" },
      { value: "heard", label: "شنیده‌ام ولی استفاده نکرده‌ام" },
      { value: "no", label: "خیر، ندیده‌ام" },
    ],
  },
  {
    key: "will_register",
    step: 7,
    group: "discovery",
    label: "اگر سایت آماده باشد، آیا فروشگاه خود را در آن ثبت می‌کنید؟",
    type: "radio",
    required: true,
    options: [
      { value: "yes", label: "بله" },
      { value: "maybe", label: "احتمالاً" },
      { value: "unsure", label: "نامطمئنم" },
      { value: "no", label: "خیر" },
    ],
  },
  {
    key: "will_register_reason",
    step: 7,
    group: "discovery",
    label: "دلیل پاسخ سؤال قبل چیست؟",
    type: "textarea",
    required: true,
    placeholder: "چرا بله، شاید یا خیر؟",
  },
];

export const QUESTION_MAP: ReadonlyMap<string, Question> = new Map(
  QUESTIONS.map((q) => [q.key, q]),
);

export function getQuestion(key: string): Question | undefined {
  return QUESTION_MAP.get(key);
}

export function isQuestionVisible(question: Question, answers: Record<string, unknown>): boolean {
  if (!question.dependsOn) return true;
  const { key, when, value } = question.dependsOn;
  const current = answers[key];
  if (current === undefined || current === null || current === "") return false;
  if (when === "equals") {
    return current === value;
  }
  if (when === "notEquals") {
    return current !== value;
  }
  // "in"
  if (Array.isArray(value)) {
    return value.includes(String(current));
  }
  return String(current) === value;
}

export function questionsForStep(step: number): Question[] {
  return QUESTIONS.filter((q) => q.step === step);
}

export function visibleQuestionsForStep(
  step: number,
  answers: Record<string, unknown>,
): Question[] {
  return questionsForStep(step).filter((q) => isQuestionVisible(q, answers));
}

export function questionGroups(): QuestionGroup[] {
  return ["store", "sales", "online", "delivery", "revenue", "trust", "discovery"];
}

export function groupTitle(group: QuestionGroup): string {
  const step = QUESTIONS.find((q) => q.group === group)?.step;
  return step ? STEP_TITLES[step] : group;
}