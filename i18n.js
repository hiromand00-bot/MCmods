/* ==========================================================================
   MCmods i18n — classic script (works inlined in the single-file build).
   Only the interface is translated. Project titles, summaries and descriptions
   always stay in the language the platform published them in.
   ========================================================================== */
(function () {
  const LANGS = [
    { code: "en", label: "English", dir: "ltr" },
    { code: "fa", label: "فارسی", dir: "rtl" },
    { code: "ar", label: "العربية", dir: "rtl" },
    { code: "es", label: "Español", dir: "ltr" },
    { code: "ru", label: "Русский", dir: "ltr" },
  ];

  const S = {
    en: {
      "nav.browse": "Browse",
      "nav.favorites": "Favorites",
      "nav.bedrock": "Bedrock",
      "nav.account": "Account",
      "search.placeholder": "Search mods, modpacks, shaders…",
      "search.submit": "Search",
      "hero.title": 'Find the content your<br /><span class="grad">world is missing</span>',
      "hero.lede":
        "One dark-green home for everything Minecraft: <strong>mods, resource packs, data packs, shaders and modpacks</strong>. Search and filter across both big platforms, then grab the file you need. The live feed drops 10 fresh projects every minute.",
      "stat.projects": "projects in the index",
      "stat.platforms": "mod platforms",
      "stat.refresh": "feed refresh",
      "tab.mods": "Mods",
      "tab.resourcepacks": "Resource packs",
      "tab.datapacks": "Data packs",
      "tab.shaders": "Shaders",
      "tab.modpacks": "Modpacks",
      "feed.title": "Live feed",
      "feed.sub": "10 fresh projects pulled every minute from the platforms.",
      "feed.refresh": "Refresh now",
      "feed.starting": "starting…",
      "feed.fetching": "fetching 10 {type}…",
      "feed.landed": "{n} new {type} just landed",
      "feed.next": "next 10 {type} in {s}s",
      "feed.paused": "feed paused — {err}",
      "filter.source": "Source",
      "filter.sort": "Sort by",
      "filter.loader": "Mod loader",
      "filter.version": "Game version",
      "filter.categories": "Categories",
      "filter.clear": "Clear all filters",
      "filter.anyVersion": "Any version",
      "sort.relevance": "Relevance",
      "sort.downloads": "Downloads",
      "sort.follows": "Followers",
      "sort.newest": "Newest",
      "sort.updated": "Recently updated",
      "source.all": "All",
      "res.more": "Load more {type}",
      "res.loading": "Loading {type}…",
      "res.none": "No {type} matched those filters. Try clearing one or two.",
      "res.failed": "Could not load {type}: {err}",
      "res.count": "{total} {type} found · showing {shown}",
      "res.resultsFor": "Results for “{q}”",
      "type.mods": "mods",
      "type.resourcepacks": "resource packs",
      "type.datapacks": "data packs",
      "type.shaders": "shaders",
      "type.modpacks": "modpacks",
      "fav.title": "Your favorites",
      "fav.sub": "Saved in this browser. Click a card to open it again.",
      "fav.empty": "Nothing saved yet — tap the heart on any card.",
      "welcome.title": "Welcome to MCmods",
      "welcome.body":
        "Browse mods, resource packs, data packs, shaders and modpacks for Java — plus a separate Bedrock page. The live feed drops 10 fresh projects every minute.",
      "welcome.start": "Start browsing",
      "welcome.dismiss": "Don't show again",
      "welcome.back": "Welcome back — {n} favorites are waiting for you.",
      "footer.about":
        "MCmods is an independent browser. Project data and downloads come from Modrinth and CurseForge, and every download points back to the original project.",
      "footer.legal": "Not affiliated with Mojang, Microsoft, Modrinth or CurseForge.",
      "modal.download": "Download latest file",
      "modal.openPage": "Open project page",
      "modal.save": "♡ Save",
      "modal.saved": "♥ Saved",
      "modal.close": "Close",
      "modal.about": "About",
      "modal.versions": "Versions ({n})",
      "modal.gallery": "Gallery ({n})",
      "bedrock.title": "Bedrock add-ons",
      "bedrock.sub":
        "Bedrock has its own content: add-ons, worlds, skin packs and texture packs. Everything here links back to the original publisher.",
      "bedrock.search": "Search add-ons, worlds, packs…",
      "bedrock.empty": "Nothing matched — try another word.",
      "bedrock.note":
        "Bedrock content is not on Modrinth, and CurseForge needs a server-side API key, so this page is a curated list that opens the original source.",
      "bedrock.visit": "Open source page",
      "account.title": "Your account",
      "account.sub": "Sign in with Google, Microsoft or GitHub and send your own project for review.",
      "account.signin": "Sign in",
      "account.signout": "Sign out",
      "account.signedInAs": "Signed in as {email}",
      "account.guest": "Not signed in",
      "account.submit": "Submit a project",
      "account.name": "Project name",
      "account.link": "Project link",
      "account.type": "Type",
      "account.desc": "Short description",
      "account.send": "Send for review",
      "account.thanks": "Sent. The owner reviews every submission before it goes live.",
      "account.error": "Could not send: {err}",
      "account.mine": "My submissions",
      "account.pending": "Pending review",
      "account.approved": "Approved",
      "account.rejected": "Rejected",
      "account.owner": "Owner review panel",
      "account.approve": "Approve",
      "account.reject": "Reject",
      "account.setup":
        "Sign-in is not configured yet. Add your OAuth app IDs and a token endpoint (see README → Accounts), or send your project by GitHub issue or email.",
      "account.issue": "Send as a GitHub issue",
      "account.email": "Email the owner",
      "account.none": "No submissions yet.",
    },
    fa: {
      "nav.browse": "مرور",
      "nav.favorites": "علاقه‌مندی‌ها",
      "nav.bedrock": "بدراک",
      "nav.account": "حساب",
      "search.placeholder": "جست‌وجوی مود، مودپک، شیدر…",
      "search.submit": "جست‌وجو",
      "hero.title": 'محتوایی را پیدا کن<br /><span class="grad">که دنیایت کم دارد</span>',
      "hero.lede":
        "همه‌ی ماینکرفت در یک خانه‌ی سبز تیره: <strong>مود، resource pack، data pack، شیدر و مودپک</strong>. جست‌وجو و فیلتر روی هر دو پلتفرم بزرگ، بعد فایل مورد نیازت را بردار. فید زنده هر دقیقه ۱۰ پروژه‌ی تازه می‌آورد.",
      "stat.projects": "پروژه در فهرست",
      "stat.platforms": "پلتفرم مود",
      "stat.refresh": "به‌روزرسانی فید",
      "tab.mods": "مودها",
      "tab.resourcepacks": "Resource pack",
      "tab.datapacks": "Data pack",
      "tab.shaders": "شیدرها",
      "tab.modpacks": "مودپک‌ها",
      "feed.title": "فید زنده",
      "feed.sub": "هر دقیقه ۱۰ پروژه‌ی تازه از پلتفرم‌ها.",
      "feed.refresh": "همین حالا",
      "feed.starting": "شروع…",
      "feed.fetching": "دریافت ۱۰ {type}…",
      "feed.landed": "{n} {type} تازه رسید",
      "feed.next": "۱۰ {type} بعدی در {s} ثانیه",
      "feed.paused": "فید متوقف شد — {err}",
      "filter.source": "منبع",
      "filter.sort": "ترتیب",
      "filter.loader": "لودر",
      "filter.version": "نسخه‌ی بازی",
      "filter.categories": "دسته‌بندی",
      "filter.clear": "پاک کردن همه‌ی فیلترها",
      "filter.anyVersion": "همه‌ی نسخه‌ها",
      "sort.relevance": "مرتبط‌ترین",
      "sort.downloads": "بیشترین دانلود",
      "sort.follows": "بیشترین دنبال‌کننده",
      "sort.newest": "تازه‌ترین",
      "sort.updated": "آخرین به‌روزرسانی",
      "source.all": "همه",
      "res.more": "بیشتر",
      "res.loading": "در حال بارگذاری…",
      "res.none": "با این فیلترها چیزی پیدا نشد. یکی دو فیلتر را بردار.",
      "res.failed": "بارگذاری ناموفق بود: {err}",
      "res.count": "{total} نتیجه · {shown} نمایش",
      "res.resultsFor": "نتایج «{q}»",
      "type.mods": "مودها",
      "type.resourcepacks": "resource packها",
      "type.datapacks": "data packها",
      "type.shaders": "شیدرها",
      "type.modpacks": "مودپک‌ها",
      "fav.title": "علاقه‌مندی‌های تو",
      "fav.sub": "در همین مرورگر ذخیره می‌شود. روی هر کارت بزن تا باز شود.",
      "fav.empty": "هنوز چیزی ذخیره نشده — قلب روی هر کارت را بزن.",
      "welcome.title": "به MCmods خوش آمدی",
      "welcome.body":
        "مود، resource pack، data pack، شیدر و مودپک برای جاوا — و یک صفحه‌ی جدا برای بدراک. فید زنده هر دقیقه ۱۰ پروژه‌ی تازه می‌آورد.",
      "welcome.start": "شروع مرور",
      "welcome.dismiss": "دیگر نشان نده",
      "welcome.back": "خوش برگشتی — {n} علاقه‌مندی منتظرت است.",
      "footer.about":
        "MCmods یک مرورگر مستقل است. داده و دانلودها از Modrinth و CurseForge می‌آید و هر دانلود به پروژه‌ی اصلی اشاره می‌کند.",
      "footer.legal": "وابسته به Mojang، Microsoft، Modrinth یا CurseForge نیست.",
      "modal.download": "دانلود آخرین فایل",
      "modal.openPage": "صفحه‌ی پروژه",
      "modal.save": "♡ ذخیره",
      "modal.saved": "♥ ذخیره شد",
      "modal.close": "بستن",
      "modal.about": "درباره",
      "modal.versions": "نسخه‌ها ({n})",
      "modal.gallery": "گالری ({n})",
      "bedrock.title": "افزونه‌های بدراک",
      "bedrock.sub":
        "بدراک محتوای خودش را دارد: افزونه، دنیا، اسکین و پک بافت. هر مورد به ناشر اصلی لینک می‌شود.",
      "bedrock.search": "جست‌وجوی افزونه، دنیا، پک…",
      "bedrock.empty": "چیزی پیدا نشد — کلمه‌ی دیگری را امتحان کن.",
      "bedrock.note":
        "محتوای بدراک در Modrinth نیست و CurseForge کلید API می‌خواهد؛ پس این صفحه فهرستی منتخب است که منبع اصلی را باز می‌کند.",
      "bedrock.visit": "باز کردن صفحه‌ی منبع",
      "account.title": "حساب کاربری",
      "account.sub": "با گوگل، مایکروسافت یا گیت‌هاب وارد شو و پروژه‌ات را برای بررسی بفرست.",
      "account.signin": "ورود",
      "account.signout": "خروج",
      "account.signedInAs": "وارد شده‌ای با {email}",
      "account.guest": "وارد نشده‌ای",
      "account.submit": "ارسال پروژه",
      "account.name": "نام پروژه",
      "account.link": "لینک پروژه",
      "account.type": "نوع",
      "account.desc": "توضیح کوتاه",
      "account.send": "ارسال برای بررسی",
      "account.thanks": "فرستاده شد. مالک هر ارسال را قبل از انتشار بررسی می‌کند.",
      "account.error": "ارسال نشد: {err}",
      "account.mine": "ارسال‌های من",
      "account.pending": "در انتظار بررسی",
      "account.approved": "تأییدشده",
      "account.rejected": "ردشده",
      "account.owner": "پنل بررسی مالک",
      "account.approve": "تأیید",
      "account.reject": "رد",
      "account.setup":
        "ورود هنوز تنظیم نشده. شناسه‌ی اپ OAuth و یک مسیر تبدیل کد لازم است (README → Accounts)؛ یا پروژه را با گیت‌هاب/ایمیل بفرست.",
      "account.issue": "ارسال با گیت‌هاب",
      "account.email": "ایمیل به مالک",
      "account.none": "هنوز ارسالی نداری.",
    },
    ar: {
      "nav.browse": "تصفح",
      "nav.favorites": "المفضلة",
      "nav.bedrock": "بيدروك",
      "nav.account": "الحساب",
      "search.placeholder": "ابحث عن مودات، حزم، شيدر…",
      "search.submit": "بحث",
      "hero.title": 'اعثر على المحتوى<br /><span class="grad">الذي ينقص عالمك</span>',
      "hero.lede":
        "كل ما يخص ماينكرافت في مكان واحد داكن: <strong>مودات، حزم موارد، حزم بيانات، شيدر وحزم مودات</strong>. ابحث وفلتر على المنصتين ثم حمّل الملف. التغذية الحية تجلب 10 مشاريع كل دقيقة.",
      "stat.projects": "مشروع في الفهرس",
      "stat.platforms": "منصات",
      "stat.refresh": "تحديث التغذية",
      "tab.mods": "مودات",
      "tab.resourcepacks": "حزم موارد",
      "tab.datapacks": "حزم بيانات",
      "tab.shaders": "شيدر",
      "tab.modpacks": "حزم مودات",
      "feed.title": "التغذية الحية",
      "feed.sub": "10 مشاريع جديدة كل دقيقة.",
      "feed.refresh": "تحديث الآن",
      "feed.starting": "جارٍ البدء…",
      "feed.fetching": "جارٍ جلب 10 {type}…",
      "feed.landed": "وصل {n} {type} جديد",
      "feed.next": "10 {type} التالية بعد {s} ثانية",
      "feed.paused": "توقفت التغذية — {err}",
      "filter.source": "المصدر",
      "filter.sort": "الترتيب",
      "filter.loader": "المحمّل",
      "filter.version": "إصدار اللعبة",
      "filter.categories": "التصنيفات",
      "filter.clear": "مسح كل الفلاتر",
      "filter.anyVersion": "أي إصدار",
      "sort.relevance": "الأكثر صلة",
      "sort.downloads": "الأكثر تحميلًا",
      "sort.follows": "الأكثر متابعة",
      "sort.newest": "الأحدث",
      "sort.updated": "آخر تحديث",
      "source.all": "الكل",
      "res.more": "المزيد",
      "res.loading": "جارٍ التحميل…",
      "res.none": "لا نتائج بهذه الفلاتر. جرّب إزالة فلتر أو اثنين.",
      "res.failed": "تعذّر التحميل: {err}",
      "res.count": "{total} نتيجة · عرض {shown}",
      "res.resultsFor": "نتائج «{q}»",
      "type.mods": "مودات",
      "type.resourcepacks": "حزم موارد",
      "type.datapacks": "حزم بيانات",
      "type.shaders": "شيدر",
      "type.modpacks": "حزم مودات",
      "fav.title": "مفضلتك",
      "fav.sub": "محفوظة في هذا المتصفح.",
      "fav.empty": "لا شيء محفوظ بعد — اضغط القلب على أي بطاقة.",
      "welcome.title": "مرحبًا بك في MCmods",
      "welcome.body":
        "مودات وحزم موارد وحزم بيانات وشيدر وحزم مودات لجافا — وصفحة منفصلة لبيدروك. التغذية الحية تجلب 10 مشاريع كل دقيقة.",
      "welcome.start": "ابدأ التصفح",
      "welcome.dismiss": "لا تُظهر مجددًا",
      "welcome.back": "مرحبًا بعودتك — {n} مفضلة بانتظارك.",
      "footer.about":
        "MCmods متصفح مستقل. البيانات والتحميلات من Modrinth وCurseForge، وكل تحميل يعود إلى المشروع الأصلي.",
      "footer.legal": "غير مرتبط بـ Mojang أو Microsoft أو Modrinth أو CurseForge.",
      "modal.download": "تحميل آخر ملف",
      "modal.openPage": "صفحة المشروع",
      "modal.save": "♡ حفظ",
      "modal.saved": "♥ محفوظ",
      "modal.close": "إغلاق",
      "modal.about": "حول",
      "modal.versions": "الإصدارات ({n})",
      "modal.gallery": "المعرض ({n})",
      "bedrock.title": "إضافات بيدروك",
      "bedrock.sub": "بيدروك له محتواه الخاص: إضافات وعوالم وحزم اسكن وحزم موارد.",
      "bedrock.search": "بحث في الإضافات والعوالم…",
      "bedrock.empty": "لا نتائج — جرّب كلمة أخرى.",
      "bedrock.note":
        "محتوى بيدروك ليس على Modrinth، وCurseForge يحتاج مفتاح API؛ لذا هذه قائمة مختارة تفتح المصدر الأصلي.",
      "bedrock.visit": "فتح المصدر",
      "account.title": "حسابك",
      "account.sub": "سجّل بجوجل أو مايكروسوفت أو GitHub وأرسل مشروعك للمراجعة.",
      "account.signin": "تسجيل الدخول",
      "account.signout": "خروج",
      "account.signedInAs": "مسجّل باسم {email}",
      "account.guest": "غير مسجّل",
      "account.submit": "أرسل مشروعًا",
      "account.name": "اسم المشروع",
      "account.link": "رابط المشروع",
      "account.type": "النوع",
      "account.desc": "وصف قصير",
      "account.send": "إرسال للمراجعة",
      "account.thanks": "تم الإرسال. يراجع المالك كل طلب قبل النشر.",
      "account.error": "تعذّر الإرسال: {err}",
      "account.mine": "طلباتي",
      "account.pending": "قيد المراجعة",
      "account.approved": "مقبول",
      "account.rejected": "مرفوض",
      "account.owner": "لوحة مراجعة المالك",
      "account.approve": "قبول",
      "account.reject": "رفض",
      "account.setup":
        "تسجيل الدخول غير مهيأ. أضف معرّفات OAuth ومسار تبديل الرمز (README → Accounts) أو أرسل المشروع عبر GitHub أو البريد.",
      "account.issue": "إرسال عبر GitHub",
      "account.email": "مراسلة المالك",
      "account.none": "لا طلبات بعد.",
    },
    es: {
      "nav.browse": "Explorar",
      "nav.favorites": "Favoritos",
      "nav.bedrock": "Bedrock",
      "nav.account": "Cuenta",
      "search.placeholder": "Busca mods, modpacks, shaders…",
      "search.submit": "Buscar",
      "hero.title": 'Encuentra el contenido<br /><span class="grad">que le falta a tu mundo</span>',
      "hero.lede":
        "Un hogar verde oscuro para todo Minecraft: <strong>mods, resource packs, data packs, shaders y modpacks</strong>. Busca y filtra en las dos plataformas y descarga el archivo que necesites. El feed en vivo trae 10 proyectos nuevos cada minuto.",
      "stat.projects": "proyectos en el índice",
      "stat.platforms": "plataformas",
      "stat.refresh": "recarga del feed",
      "tab.mods": "Mods",
      "tab.resourcepacks": "Resource packs",
      "tab.datapacks": "Data packs",
      "tab.shaders": "Shaders",
      "tab.modpacks": "Modpacks",
      "feed.title": "Feed en vivo",
      "feed.sub": "10 proyectos nuevos cada minuto.",
      "feed.refresh": "Actualizar",
      "feed.starting": "iniciando…",
      "feed.fetching": "cargando 10 {type}…",
      "feed.landed": "{n} {type} nuevos",
      "feed.next": "próximos 10 {type} en {s}s",
      "feed.paused": "feed en pausa — {err}",
      "filter.source": "Fuente",
      "filter.sort": "Ordenar",
      "filter.loader": "Loader",
      "filter.version": "Versión",
      "filter.categories": "Categorías",
      "filter.clear": "Borrar filtros",
      "filter.anyVersion": "Cualquier versión",
      "sort.relevance": "Relevancia",
      "sort.downloads": "Descargas",
      "sort.follows": "Seguidores",
      "sort.newest": "Nuevos",
      "sort.updated": "Actualizados",
      "source.all": "Todo",
      "res.more": "Cargar más",
      "res.loading": "Cargando…",
      "res.none": "Nada coincide con esos filtros. Quita uno o dos.",
      "res.failed": "No se pudo cargar: {err}",
      "res.count": "{total} resultados · mostrando {shown}",
      "res.resultsFor": "Resultados de «{q}»",
      "type.mods": "mods",
      "type.resourcepacks": "resource packs",
      "type.datapacks": "data packs",
      "type.shaders": "shaders",
      "type.modpacks": "modpacks",
      "fav.title": "Tus favoritos",
      "fav.sub": "Guardados en este navegador.",
      "fav.empty": "Nada guardado todavía — toca el corazón de una tarjeta.",
      "welcome.title": "Bienvenido a MCmods",
      "welcome.body":
        "Mods, resource packs, data packs, shaders y modpacks para Java — y una página aparte para Bedrock. El feed trae 10 proyectos nuevos cada minuto.",
      "welcome.start": "Empezar",
      "welcome.dismiss": "No mostrar de nuevo",
      "welcome.back": "Bienvenido de vuelta — {n} favoritos te esperan.",
      "footer.about":
        "MCmods es un navegador independiente. Los datos y descargas vienen de Modrinth y CurseForge, y cada descarga apunta al proyecto original.",
      "footer.legal": "Sin relación con Mojang, Microsoft, Modrinth ni CurseForge.",
      "modal.download": "Descargar último archivo",
      "modal.openPage": "Abrir proyecto",
      "modal.save": "♡ Guardar",
      "modal.saved": "♥ Guardado",
      "modal.close": "Cerrar",
      "modal.about": "Acerca de",
      "modal.versions": "Versiones ({n})",
      "modal.gallery": "Galería ({n})",
      "bedrock.title": "Add-ons de Bedrock",
      "bedrock.sub": "Bedrock tiene su propio contenido: add-ons, mundos, skins y texturas.",
      "bedrock.search": "Buscar add-ons, mundos, packs…",
      "bedrock.empty": "Sin resultados — prueba otra palabra.",
      "bedrock.note":
        "El contenido de Bedrock no está en Modrinth y CurseForge necesita una clave; esta página es una lista curada que abre la fuente original.",
      "bedrock.visit": "Abrir fuente",
      "account.title": "Tu cuenta",
      "account.sub": "Entra con Google, Microsoft o GitHub y envía tu proyecto para revisión.",
      "account.signin": "Entrar",
      "account.signout": "Salir",
      "account.signedInAs": "Sesión de {email}",
      "account.guest": "Sin sesión",
      "account.submit": "Enviar un proyecto",
      "account.name": "Nombre",
      "account.link": "Enlace",
      "account.type": "Tipo",
      "account.desc": "Descripción corta",
      "account.send": "Enviar a revisión",
      "account.thanks": "Enviado. El dueño revisa cada envío antes de publicarlo.",
      "account.error": "No se pudo enviar: {err}",
      "account.mine": "Mis envíos",
      "account.pending": "Pendientes",
      "account.approved": "Aprobados",
      "account.rejected": "Rechazados",
      "account.owner": "Panel del dueño",
      "account.approve": "Aprobar",
      "account.reject": "Rechazar",
      "account.setup":
        "El acceso aún no está configurado. Añade tus IDs OAuth y un endpoint de token (README → Accounts) o envía el proyecto por GitHub o email.",
      "account.issue": "Enviar por GitHub",
      "account.email": "Escribir al dueño",
      "account.none": "Aún no hay envíos.",
    },
    ru: {
      "nav.browse": "Обзор",
      "nav.favorites": "Избранное",
      "nav.bedrock": "Bedrock",
      "nav.account": "Аккаунт",
      "search.placeholder": "Поиск модов, модпаков, шейдеров…",
      "search.submit": "Найти",
      "hero.title": 'Найди то, чего<br /><span class="grad">не хватает твоему миру</span>',
      "hero.lede":
        "Всё для Minecraft в одном тёмно-зелёном месте: <strong>моды, ресурспаки, датапаки, шейдеры и модпаки</strong>. Ищите и фильтруйте по обеим платформам и скачивайте файл. Живая лента приносит 10 новых проектов каждую минуту.",
      "stat.projects": "проектов в индексе",
      "stat.platforms": "платформы",
      "stat.refresh": "обновление ленты",
      "tab.mods": "Моды",
      "tab.resourcepacks": "Ресурспаки",
      "tab.datapacks": "Датапаки",
      "tab.shaders": "Шейдеры",
      "tab.modpacks": "Модпаки",
      "feed.title": "Живая лента",
      "feed.sub": "10 новых проектов каждую минуту.",
      "feed.refresh": "Обновить",
      "feed.starting": "запуск…",
      "feed.fetching": "загрузка 10 {type}…",
      "feed.landed": "{n} новых {type}",
      "feed.next": "следующие 10 {type} через {s} с",
      "feed.paused": "лента на паузе — {err}",
      "filter.source": "Источник",
      "filter.sort": "Сортировка",
      "filter.loader": "Загрузчик",
      "filter.version": "Версия игры",
      "filter.categories": "Категории",
      "filter.clear": "Сбросить фильтры",
      "filter.anyVersion": "Любая версия",
      "sort.relevance": "По релевантности",
      "sort.downloads": "По загрузкам",
      "sort.follows": "По подпискам",
      "sort.newest": "Новые",
      "sort.updated": "Обновлённые",
      "source.all": "Все",
      "res.more": "Показать ещё",
      "res.loading": "Загрузка…",
      "res.none": "Ничего не найдено. Снимите один-два фильтра.",
      "res.failed": "Не удалось загрузить: {err}",
      "res.count": "{total} результатов · показано {shown}",
      "res.resultsFor": "Результаты «{q}»",
      "type.mods": "моды",
      "type.resourcepacks": "ресурспаки",
      "type.datapacks": "датапаки",
      "type.shaders": "шейдеры",
      "type.modpacks": "модпаки",
      "fav.title": "Ваше избранное",
      "fav.sub": "Хранится в этом браузере.",
      "fav.empty": "Пока пусто — нажмите сердечко на карточке.",
      "welcome.title": "Добро пожаловать в MCmods",
      "welcome.body":
        "Моды, ресурспаки, датапаки, шейдеры и модпаки для Java — плюс отдельная страница Bedrock. Лента приносит 10 новых проектов каждую минуту.",
      "welcome.start": "Начать",
      "welcome.dismiss": "Больше не показывать",
      "welcome.back": "С возвращением — вас ждут {n} избранных.",
      "footer.about":
        "MCmods — независимый браузер. Данные и загрузки берутся из Modrinth и CurseForge, каждая ссылка ведёт к оригинальному проекту.",
      "footer.legal": "Не связан с Mojang, Microsoft, Modrinth или CurseForge.",
      "modal.download": "Скачать последний файл",
      "modal.openPage": "Страница проекта",
      "modal.save": "♡ Сохранить",
      "modal.saved": "♥ Сохранено",
      "modal.close": "Закрыть",
      "modal.about": "Описание",
      "modal.versions": "Версии ({n})",
      "modal.gallery": "Галерея ({n})",
      "bedrock.title": "Аддоны Bedrock",
      "bedrock.sub": "У Bedrock свой контент: аддоны, миры, скины и наборы текстур.",
      "bedrock.search": "Поиск аддонов, миров…",
      "bedrock.empty": "Ничего не найдено — попробуйте другое слово.",
      "bedrock.note":
        "Контента Bedrock нет на Modrinth, а CurseForge требует ключ API, поэтому это кураторский список со ссылками на источник.",
      "bedrock.visit": "Открыть источник",
      "account.title": "Аккаунт",
      "account.sub": "Войдите через Google, Microsoft или GitHub и отправьте проект на проверку.",
      "account.signin": "Войти",
      "account.signout": "Выйти",
      "account.signedInAs": "Вы вошли как {email}",
      "account.guest": "Гость",
      "account.submit": "Отправить проект",
      "account.name": "Название",
      "account.link": "Ссылка",
      "account.type": "Тип",
      "account.desc": "Краткое описание",
      "account.send": "Отправить на проверку",
      "account.thanks": "Отправлено. Владелец проверяет каждую заявку.",
      "account.error": "Не удалось отправить: {err}",
      "account.mine": "Мои заявки",
      "account.pending": "На проверке",
      "account.approved": "Принято",
      "account.rejected": "Отклонено",
      "account.owner": "Панель владельца",
      "account.approve": "Принять",
      "account.reject": "Отклонить",
      "account.setup":
        "Вход не настроен. Добавьте OAuth-идентификаторы и endpoint токена (README → Accounts) или отправьте проект через GitHub/почту.",
      "account.issue": "Отправить через GitHub",
      "account.email": "Написать владельцу",
      "account.none": "Заявок пока нет.",
    },
  };

  const STORAGE_KEY = "mcmods:lang";
  const DEFAULT = "en";

  function normalise(code) {
    const base = String(code || "").toLowerCase().split("-")[0];
    return S[base] ? base : null;
  }

  function detect() {
    try {
      const saved = normalise(localStorage.getItem(STORAGE_KEY));
      if (saved) return saved;
    } catch {
      /* storage can be blocked */
    }
    const preferred = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
    for (const code of preferred) {
      const match = normalise(code);
      if (match) return match;
    }
    return DEFAULT;
  }

  let current = detect();

  function t(key, vars) {
    const table = S[current] || S[DEFAULT];
    let value = table[key];
    if (value === undefined) value = S[DEFAULT][key];
    if (value === undefined) return key;
    if (vars) {
      for (const name of Object.keys(vars)) {
        value = value.split(`{${name}}`).join(String(vars[name]));
      }
    }
    return value;
  }

  function dirOf(code) {
    const lang = LANGS.find((item) => item.code === code);
    return lang ? lang.dir : "ltr";
  }

  function apply(root) {
    const scope = root || document;
    document.documentElement.lang = current;
    document.documentElement.dir = dirOf(current);

    scope.querySelectorAll("[data-i18n]").forEach((node) => {
      node.textContent = t(node.dataset.i18n);
    });
    scope.querySelectorAll("[data-i18n-html]").forEach((node) => {
      node.innerHTML = t(node.dataset.i18nHtml);
    });
    scope.querySelectorAll("[data-i18n-attr]").forEach((node) => {
      for (const pair of node.dataset.i18nAttr.split(";")) {
        const [attribute, key] = pair.split(":").map((part) => part && part.trim());
        if (attribute && key) node.setAttribute(attribute, t(key));
      }
    });
    document.querySelectorAll("[data-lang-select]").forEach((select) => {
      select.value = current;
    });
  }

  function setLang(code) {
    const next = normalise(code) || DEFAULT;
    current = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    apply();
    document.dispatchEvent(new CustomEvent("mcmods:lang", { detail: { lang: next } }));
  }

  function mountSwitchers() {
    document.querySelectorAll("[data-lang-select]").forEach((select) => {
      if (select.dataset.langReady) return;
      select.dataset.langReady = "1";
      select.innerHTML = LANGS.map(
        (lang) => `<option value="${lang.code}">${lang.label}</option>`,
      ).join("");
      select.value = current;
      select.setAttribute("aria-label", "Language");
      select.addEventListener("change", (event) => setLang(event.target.value));
    });
  }

  window.MCModsI18n = { t, apply, setLang, getLang: () => current, dirOf, LANGS, mountSwitchers };

  document.addEventListener("DOMContentLoaded", () => {
    mountSwitchers();
    apply();
  });
})();
