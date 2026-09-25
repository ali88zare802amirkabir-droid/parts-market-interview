# پژوهش بازار قطعات خودرو — ابزار مصاحبه با فروشندگان

برنامهٔ تحت وب موبایل‌اول برای انجام و مدیریت مصاحبه‌های پژوهشی با فروشندگان
قطعات خودرو، در فاز تحقیق بازار یک بازارگاه آنلاین قطعات. برگهٔ مصاحبه شامل ۴۰
سؤال در ۷ مرحله است و با توجه به پاسخ‌ها سؤالات شرطی نمایش داده می‌شود.

این برنامه **خودِ بازارگاه نیست**؛ فقط ابزار گردآوری و تحلیل دادهٔ مصاحبه‌هاست.
ویژگی‌های بازارگاه (ثبت محصول، سبد خرید، پرداخت و …) در نقشهٔ راه بخش آخر آمده است.

## امکانات

- فرم مصاحبهٔ چندمرحله‌ای (۷ مرحله + مرحلهٔ مرور) با سؤالات شرطی
- ذخیرهٔ خودکار پیش‌نویس در `localStorage` و ادامه از همان‌جا
- داشبورد آماری: تمایل به ثبت‌نام، کمیسیون، مدل درآمدی، روش پرداخت و تحویل و …
- فهرست مصاحبه‌ها با جستجو، فیلتر (وضعیت / نتیجه) و مرتب‌سازی
- ثبت یادداشت روی هر مصاحبه
- خروجی CSV سازگار با Excel (با BOM برای متن فارسی)
- همگام‌سازی دوستانه با Google Sheets (نباید ذخیرهٔ مصاحبه را شکست بدهد)
- ورود ادمین با JWT و رمز هش‌شده
- واسط فارسی، راست‌به‌چپ و موبایل‌اول با حالت روشن/تیره

## تکنولوژی‌ها

- **فرانت**: Next.js 15 (App Router) + React 19 + Tailwind CSS 4 + lucide-react
- **بک‌اند**: Route Handlers + Prisma + Zod
- **پایگاه داده**: PostgreSQL (تولید) / SQLite (تست)
- **احراز هویت**: JWT (jose) + bcryptjs
- **تست**: Vitest

## ساختار پروژه

```
prisma/
  schema.prisma        # اسکیمای پروداکشن (PostgreSQL)
  schema.test.prisma   # اسکیمای تست (SQLite) — باید با پروداکشن همگام بماند
  seed.ts              # ۱۲ مصاحبهٔ نمونه
  hash-password.ts     # اسکریپت تولید هش رمز
lib/
  questions.ts         # کاتالوگ سؤالات (منبع حقیقت فرم/اعتبارسنجی/خروجی)
  validate.ts          # اعتبارسنجی زودی با قاعده‌های شرطی
  answers.ts           # نرمال‌سازی پاسخ‌ها و تشخیص تکمیل‌بودن
  repo.ts              # لایهٔ پایگاه داده
  interview-service.ts # تحلیل ورودی → ذخیره + همگام‌سازی Sheets
  dashboard.ts         # محاسبات آماری
  csv.ts               # ساخت فایل CSV
  sheets.ts            # سرویس Google Sheets
  auth.ts / password.ts  # JWT / bcrypt (جدا برای سازگاری با Edge)
  api.ts               # helperهای پاسخ و requireAdmin
app/
  api/…                # تمام Route Handlerها
  (main)/…             # صفحات داشبورد، مصاحبه‌ها، فرم و …
  login/page.tsx
components/
  interview/interview-form.tsx  # فرم چندمرحله‌ای
  …
```

## اجرای محلی

پیش‌نیاز: Node.js 20+ و یک PostgreSQL `DATABASE_URL`.

```bash
npm install

# ۱. ساخت اسکیمای بانک اطلاعاتی
npm run prisma:generate
npm run prisma:push          # همنگام‌سازی اسکیمای بانک (db push)

# ۲. (اختیاری) مصاحبه‌های نمونه
npm run prisma:seed

# ۳. ساخت فایل .env از روی .env.example با مقادیر واقعی
#    و تولید هش رمز ادمین:
npm run hash:password -- "رمز شما"

# ۴. توسعه
npm run dev
```

ورود به برنامه: `/login` با نام کاربری `ADMIN_USERNAME` و همان رمز.
در محیط توسعه اگر `ADMIN_PASSWORD_HASH` تنظیم نشده باشد، مقدار پیش‌فرض
`admin` / `Interview2026!` فعال است (فقط خارج از production).

### تست

```bash
npm test          # یک‌بار اجرا (اسکیمای SQLite تست را می‌سازد)
npm run test:watch
```

اجرای کامل پیش از تحویل:

```bash
npm run typecheck && npm test && npm run build
```

## استقرار روی Render

دو راه:

1. **از روی این مخزن**: فایل `render.yaml` در ریشه قرار دارد. در Render
   روی «Blueprint» کلیک کنید و مخزن را انتخاب کنید. Postgres و Web Service
   خودکار ساخته می‌شوند.
2. **دستی**: Web Service بسازید، Repository را متصل کنید، مرورگر را روی
   Node/Next تنظیم و این‌ها را وارد کنید:
   - Build Command: `npm ci && npx prisma db push --skip-generate && npm run build`
   - Start Command: `npm run start`
   - یک Postgres بسازید و `DATABASE_URL` را با آدرس داخلی آن پر کنید.

متغیرهای محیطی (به `render.yaml` و `.env.example` مراجعه کنید):

| متغیر | توضیح |
| --- | --- |
| `DATABASE_URL` | اتصال PostgreSQL |
| `JWT_SECRET` | کلید امضای نشست (تصادفی و امن) |
| `ADMIN_USERNAME` | نام کاربری ادمین |
| `ADMIN_PASSWORD_HASH` | هش bcrypt رمز (با `npm run hash:password` بسازید) |
| `NODE_ENV` | `production` در استقرار |
| `GOOGLE_SHEETS_ENABLED` | `true` / `false` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | ایمیل سرویس‌اکانت |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | کلید خصوصی (با `\n` واقعی) |
| `GOOGLE_SHEET_ID` | شناسهٔ شیت |
| `GOOGLE_SHEET_RANGE` | مثل `Sheet1` |

> کلید خصوصی سرویس‌اکانت‌های گوگل حاوی `\n` هستند؛ باید به‌صورت واقعی
> (نه اسکیپ‌شده) در مقدار متغیر قرار گیرند.

همگام‌سازی Sheets با وضعیت‌های `PENDING` / `SYNCED` / `FAILED` روی هر مصاحبه
پیگیری می‌شود و از مسیر `/api/sync?mode=missing|all` قابل تکرار است.

## فرضیات

- **⚠️ همگام‌سازی اسکیمای تست**: `prisma/schema.test.prisma` باید دستی با
  `schema.prisma` همگام بماند. کاتالوگ سؤالات در `lib/questions.ts` مرجع است؛
  افزودن سؤال با تغییر ستون همراه نیست چون پاسخ‌ها در ردیف‌های جدول
  `InterviewAnswer` ذخیره می‌شوند (بدون نیاز به migration).
- برای سازگاری با SQLite در تست، آرایه‌ها و JSONها (`carBrands`، `answerData`)
  به‌صورت رشتهٔ JSON در ستون‌های `String` ذخیره می‌شوند.
- نشست‌ها Stateless با JWT هستند (بدون جدول Session) — مناسب Edge و میانی‌نر.
- همگام‌سازی Google Sheets «تلاشِ بهتر» (best-effort) است و هیچ‌وقت ذخیرهٔ
  مصاحبه را شکست نمی‌دهد؛ در شکست، وضعیت `FAILED` ثبت و فقط هشدار نمایش داده می‌شود.
- ردیف‌های خروجی CSV و Sheets از یک تابع ستون‌ساز مشترک ساخته می‌شوند تا
  چینش ستون‌ها یکسان بماند.
- در استقرارها دسترسی مستقیم به PostgreSQL با psql در دسترس نیست؛ بنابراین
  migration در Build Command و Push هنگام توسعه استفاده می‌شود.

## نقشهٔ راه (به این نسخه تعلق ندارد)

- **بازارگاه**: صفحهٔ فروشگاه، ثبت محصول، سبد خرید، پرداخت و درگاه
- **مدیریت چندکاربره**: نقش‌ها و سطح دسترسی، بازنشانی رمز
- **تحلیل پیشرفته**: نمودارهای تعاملی، فیلتر بازهٔ زمانی، خروجی PDF
- **همگام‌سازی دوطرفهٔ Sheets** و افزودن ستون‌های سفارشی
- **چندزبانه** (از جمله انگلیسی) و افراد بدون واسط مغولی
  *(در AP بیشتر فارسی است؛ این مورد ناقص است)*