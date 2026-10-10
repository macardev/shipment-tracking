export type Lang = 'tr' | 'en' | 'ar';

type Dict = Record<string, string>;

const tr: Dict = {
  'brand.tagline': 'Yükünüzü canlı 3D izleyin',
  'track.title': 'Yükünüz şu an nerede?',
  'track.subtitle': 'Konteynerinizi taşıyan gemiyi dünya haritasında ve Süveyş Kanalı’nda 3D olarak izleyin.',
  'track.placeholder': 'Takip numarası (ör. SYR-24001)',
  'track.button': 'Takip Et',
  'track.samples': 'Demo sevkiyatlar:',
  'track.notFound': 'Bu numarayla bir sevkiyat bulunamadı.',
  'track.loading': 'Sevkiyat aranıyor…',
  'track.f1.t': '3D canlı görünüm',
  'track.f1.d': 'Gemiyi su üzerinde, oyun kalitesinde izleyin.',
  'track.f2.t': 'Her cihazda akıcı',
  'track.f2.d': 'Telefonunuza göre kalite otomatik ayarlanır.',
  'track.f3.t': 'Tahmini varış',
  'track.f3.d': 'Liman, geçiş noktaları ve ETA tek ekranda.',
  'track.demoNote': 'Demo sürüm: veriler örnektir, gemi konumu simüle edilir.',
  'sample.inCanal': 'Süveyş Kanalı’nda',
  'sample.redSea': 'Kızıldeniz’de',
  'sample.arriving': 'Varışa yakın',

  'detail.back': 'Geri',
  'detail.status.beforeDeparture': 'Yükleme bekleniyor',
  'detail.status.atSea': 'Yolda',
  'detail.status.inCanal': 'Süveyş Kanalı’ndan geçiyor',
  'detail.status.arrived': 'Limana ulaştı',
  'detail.container': 'Konteyner',
  'detail.bl': 'Konşimento',
  'detail.vessel': 'Gemi',
  'detail.cargo': 'Yük',
  'detail.location': 'Şu anki konum',
  'detail.speed': 'Hız',
  'detail.eta': 'Tahmini varış',
  'detail.etaIn': '{d} gün {h} sa sonra',
  'detail.etaInHours': '{h} sa {m} dk sonra',
  'detail.progress': 'Yolculuk',
  'detail.timeline': 'Zaman çizelgesi',
  'detail.kn': 'knot',
  'detail.sim': 'Simülasyon x{n}',
  'detail.live': 'Canlı',
  'detail.backToLive': 'Canlıya dön',

  'view.globe': 'Dünya',
  'view.suez': 'Süveyş 3D',
  'view.zoomSuez': 'Süveyş Kanalı’na yakınlaş',
  'view.watchCanal': 'Kanal geçişini izle',
  'cam.follow': 'Takip',
  'cam.free': 'Serbest',
  'cam.cinematic': 'Sinematik',
  'speed.title': 'Zaman hızı',
  'quality.title': 'Görüntü',
  'quality.auto': 'Otomatik',
  'quality.low': 'Pil tasarrufu',
  'quality.mid': 'Dengeli',
  'quality.high': 'Yüksek',
  'loading.3d': '3D sahne hazırlanıyor…',
  'loading.device': 'Cihazınıza göre ayarlanıyor…',
  'hud.canal': 'Kanal ilerlemesi',
  'hud.yourContainer': 'Sizin konteyneriniz',
  'toast.canalExit': 'Gemi kanaldan çıktı, Süveyş Körfezi’ne geçti.',
  'toast.replay': 'Tekrar izle',
  'toast.globe': 'Dünyaya dön',
  'toast.speedUp': 'Süveyş görünümü x60 hızlandırıldı. Canlı için “x1” seçin.',
  'fallback.title': 'Cihazınız 3D görünümü desteklemiyor',
  'fallback.desc': 'Rota 2D harita olarak gösteriliyor.',

  'place.portSaid': 'Port Said',
  'place.ismailia': 'İsmailiye',
  'place.suez': 'Süveyş',
  'place.bridge': 'Barış Köprüsü',
  'place.bitter': 'Büyük Acı Göl',

  'area.port': 'Limanda',
  'area.marmara': 'Marmara Denizi',
  'area.dardanelles': 'Çanakkale Boğazı',
  'area.aegean': 'Ege Denizi',
  'area.med': 'Akdeniz',
  'area.suezCanal': 'Süveyş Kanalı',
  'area.gulfOfSuez': 'Süveyş Körfezi',
  'area.redSea': 'Kızıldeniz',
  'area.babElMandeb': 'Bab-ül Mendeb',
  'area.gulfOfAden': 'Aden Körfezi',
  'area.arabianSea': 'Umman Denizi',
  'area.gulfOfOman': 'Umman Körfezi',
  'area.hormuz': 'Hürmüz Boğazı',
  'area.persianGulf': 'Basra Körfezi',

  'ms.gateIn': 'Konteyner limana girdi',
  'ms.loaded': 'Gemiye yüklendi',
  'ms.departed': 'Gemi limandan ayrıldı',
  'ms.dardanelles': 'Çanakkale Boğazı geçişi',
  'ms.suezEnter': 'Süveyş Kanalı girişi',
  'ms.suezExit': 'Süveyş Kanalı çıkışı',
  'ms.babElMandeb': 'Bab-ül Mendeb geçişi',
  'ms.hormuz': 'Hürmüz Boğazı geçişi',
  'ms.arrived': 'Varış limanına ulaştı',
  'ms.discharged': 'Gemiden indirildi',
};

const en: Dict = {
  'brand.tagline': 'Watch your cargo live in 3D',
  'track.title': 'Where is your cargo right now?',
  'track.subtitle': 'Follow the ship carrying your container on a 3D globe and through the Suez Canal.',
  'track.placeholder': 'Tracking number (e.g. SYR-24001)',
  'track.button': 'Track',
  'track.samples': 'Demo shipments:',
  'track.notFound': 'No shipment found for this number.',
  'track.loading': 'Searching shipment…',
  'track.f1.t': 'Live 3D view',
  'track.f1.d': 'See the ship on the water in game quality.',
  'track.f2.t': 'Smooth on any device',
  'track.f2.d': 'Quality adapts to your phone automatically.',
  'track.f3.t': 'Estimated arrival',
  'track.f3.d': 'Ports, checkpoints and ETA on one screen.',
  'track.demoNote': 'Demo version: sample data, ship position is simulated.',
  'sample.inCanal': 'In the Suez Canal',
  'sample.redSea': 'In the Red Sea',
  'sample.arriving': 'Arriving soon',

  'detail.back': 'Back',
  'detail.status.beforeDeparture': 'Awaiting loading',
  'detail.status.atSea': 'In transit',
  'detail.status.inCanal': 'Transiting the Suez Canal',
  'detail.status.arrived': 'Arrived at port',
  'detail.container': 'Container',
  'detail.bl': 'Bill of lading',
  'detail.vessel': 'Vessel',
  'detail.cargo': 'Cargo',
  'detail.location': 'Current location',
  'detail.speed': 'Speed',
  'detail.eta': 'Estimated arrival',
  'detail.etaIn': 'in {d} d {h} h',
  'detail.etaInHours': 'in {h} h {m} min',
  'detail.progress': 'Voyage',
  'detail.timeline': 'Timeline',
  'detail.kn': 'kn',
  'detail.sim': 'Simulation x{n}',
  'detail.live': 'Live',
  'detail.backToLive': 'Back to live',

  'view.globe': 'Globe',
  'view.suez': 'Suez 3D',
  'view.zoomSuez': 'Zoom into the Suez Canal',
  'view.watchCanal': 'Watch canal transit',
  'cam.follow': 'Follow',
  'cam.free': 'Free',
  'cam.cinematic': 'Cinematic',
  'speed.title': 'Time speed',
  'quality.title': 'Graphics',
  'quality.auto': 'Auto',
  'quality.low': 'Battery saver',
  'quality.mid': 'Balanced',
  'quality.high': 'High',
  'loading.3d': 'Preparing 3D scene…',
  'loading.device': 'Tuning for your device…',
  'hud.canal': 'Canal progress',
  'hud.yourContainer': 'Your container',
  'toast.canalExit': 'The ship has left the canal and entered the Gulf of Suez.',
  'toast.replay': 'Replay',
  'toast.globe': 'Back to globe',
  'toast.speedUp': 'Suez view sped up to x60. Choose “x1” for live.',
  'fallback.title': 'Your device does not support the 3D view',
  'fallback.desc': 'Showing the route on a 2D map.',

  'place.portSaid': 'Port Said',
  'place.ismailia': 'Ismailia',
  'place.suez': 'Suez',
  'place.bridge': 'Peace Bridge',
  'place.bitter': 'Great Bitter Lake',

  'area.port': 'At port',
  'area.marmara': 'Sea of Marmara',
  'area.dardanelles': 'Dardanelles',
  'area.aegean': 'Aegean Sea',
  'area.med': 'Mediterranean Sea',
  'area.suezCanal': 'Suez Canal',
  'area.gulfOfSuez': 'Gulf of Suez',
  'area.redSea': 'Red Sea',
  'area.babElMandeb': 'Bab-el-Mandeb',
  'area.gulfOfAden': 'Gulf of Aden',
  'area.arabianSea': 'Arabian Sea',
  'area.gulfOfOman': 'Gulf of Oman',
  'area.hormuz': 'Strait of Hormuz',
  'area.persianGulf': 'Persian Gulf',

  'ms.gateIn': 'Gate in at terminal',
  'ms.loaded': 'Loaded on vessel',
  'ms.departed': 'Vessel departed',
  'ms.dardanelles': 'Dardanelles transit',
  'ms.suezEnter': 'Suez Canal entry',
  'ms.suezExit': 'Suez Canal exit',
  'ms.babElMandeb': 'Bab-el-Mandeb transit',
  'ms.hormuz': 'Strait of Hormuz transit',
  'ms.arrived': 'Arrived at destination',
  'ms.discharged': 'Discharged from vessel',
};

const ar: Dict = {
  'brand.tagline': 'تابع شحنتك مباشرة بتقنية ثلاثية الأبعاد',
  'track.title': 'أين شحنتك الآن؟',
  'track.subtitle': 'تابع السفينة التي تحمل حاويتك على كرة أرضية ثلاثية الأبعاد وعبر قناة السويس.',
  'track.placeholder': 'رقم التتبع (مثال SYR-24001)',
  'track.button': 'تتبع',
  'track.samples': 'شحنات تجريبية:',
  'track.notFound': 'لم يتم العثور على شحنة بهذا الرقم.',
  'track.loading': 'جارٍ البحث عن الشحنة…',
  'track.f1.t': 'عرض مباشر ثلاثي الأبعاد',
  'track.f1.d': 'شاهد السفينة على الماء بجودة الألعاب.',
  'track.f2.t': 'سلس على كل الأجهزة',
  'track.f2.d': 'تتكيف الجودة تلقائيًا مع هاتفك.',
  'track.f3.t': 'موعد الوصول المتوقع',
  'track.f3.d': 'الموانئ ونقاط العبور وموعد الوصول في شاشة واحدة.',
  'track.demoNote': 'نسخة تجريبية: البيانات نموذجية وموقع السفينة محاكى.',
  'sample.inCanal': 'في قناة السويس',
  'sample.redSea': 'في البحر الأحمر',
  'sample.arriving': 'على وشك الوصول',

  'detail.back': 'رجوع',
  'detail.status.beforeDeparture': 'بانتظار التحميل',
  'detail.status.atSea': 'في الطريق',
  'detail.status.inCanal': 'تعبر قناة السويس',
  'detail.status.arrived': 'وصلت إلى الميناء',
  'detail.container': 'الحاوية',
  'detail.bl': 'بوليصة الشحن',
  'detail.vessel': 'السفينة',
  'detail.cargo': 'الحمولة',
  'detail.location': 'الموقع الحالي',
  'detail.speed': 'السرعة',
  'detail.eta': 'الوصول المتوقع',
  'detail.etaIn': 'بعد {d} يوم {h} ساعة',
  'detail.etaInHours': 'بعد {h} ساعة {m} دقيقة',
  'detail.progress': 'الرحلة',
  'detail.timeline': 'الجدول الزمني',
  'detail.kn': 'عقدة',
  'detail.sim': 'محاكاة x{n}',
  'detail.live': 'مباشر',
  'detail.backToLive': 'العودة إلى المباشر',

  'view.globe': 'الكرة الأرضية',
  'view.suez': 'السويس 3D',
  'view.zoomSuez': 'التكبير إلى قناة السويس',
  'view.watchCanal': 'شاهد عبور القناة',
  'cam.follow': 'تتبع',
  'cam.free': 'حر',
  'cam.cinematic': 'سينمائي',
  'speed.title': 'سرعة الوقت',
  'quality.title': 'الرسومات',
  'quality.auto': 'تلقائي',
  'quality.low': 'توفير البطارية',
  'quality.mid': 'متوازن',
  'quality.high': 'عالية',
  'loading.3d': 'جارٍ تجهيز المشهد…',
  'loading.device': 'جارٍ الضبط حسب جهازك…',
  'hud.canal': 'التقدم في القناة',
  'hud.yourContainer': 'حاويتك',
  'toast.canalExit': 'غادرت السفينة القناة ودخلت خليج السويس.',
  'toast.replay': 'إعادة',
  'toast.globe': 'العودة إلى الكرة الأرضية',
  'toast.speedUp': 'تم تسريع عرض السويس إلى x60. اختر “x1” للعرض المباشر.',
  'fallback.title': 'جهازك لا يدعم العرض ثلاثي الأبعاد',
  'fallback.desc': 'يتم عرض المسار على خريطة ثنائية الأبعاد.',

  'place.portSaid': 'بورسعيد',
  'place.ismailia': 'الإسماعيلية',
  'place.suez': 'السويس',
  'place.bridge': 'جسر السلام',
  'place.bitter': 'البحيرة المرة الكبرى',

  'area.port': 'في الميناء',
  'area.marmara': 'بحر مرمرة',
  'area.dardanelles': 'مضيق الدردنيل',
  'area.aegean': 'بحر إيجه',
  'area.med': 'البحر المتوسط',
  'area.suezCanal': 'قناة السويس',
  'area.gulfOfSuez': 'خليج السويس',
  'area.redSea': 'البحر الأحمر',
  'area.babElMandeb': 'باب المندب',
  'area.gulfOfAden': 'خليج عدن',
  'area.arabianSea': 'بحر العرب',
  'area.gulfOfOman': 'خليج عُمان',
  'area.hormuz': 'مضيق هرمز',
  'area.persianGulf': 'الخليج العربي',

  'ms.gateIn': 'دخول الحاوية إلى المحطة',
  'ms.loaded': 'تم التحميل على السفينة',
  'ms.departed': 'غادرت السفينة الميناء',
  'ms.dardanelles': 'عبور الدردنيل',
  'ms.suezEnter': 'دخول قناة السويس',
  'ms.suezExit': 'الخروج من قناة السويس',
  'ms.babElMandeb': 'عبور باب المندب',
  'ms.hormuz': 'عبور مضيق هرمز',
  'ms.arrived': 'الوصول إلى ميناء الوجهة',
  'ms.discharged': 'تم التفريغ من السفينة',
};

const DICTS: Record<Lang, Dict> = { tr, en, ar };
const LOCALES: Record<Lang, string> = { tr: 'tr-TR', en: 'en-GB', ar: 'ar-AE' };

let current: Lang = 'tr';
const listeners = new Set<() => void>();

function readStored(): Lang | null {
  try {
    const v = localStorage.getItem('seyir.lang');
    return v === 'tr' || v === 'en' || v === 'ar' ? v : null;
  } catch {
    return null;
  }
}

export function initLang() {
  current = readStored() ?? (navigator.language.startsWith('ar') ? 'ar' : navigator.language.startsWith('tr') ? 'tr' : 'en');
  applyDir();
}

function applyDir() {
  document.documentElement.lang = current;
  document.documentElement.dir = current === 'ar' ? 'rtl' : 'ltr';
}

export function getLang(): Lang {
  return current;
}

export function setLang(l: Lang) {
  current = l;
  try {
    localStorage.setItem('seyir.lang', l);
  } catch {
    /* depolama kapalı olabilir */
  }
  applyDir();
  listeners.forEach((fn) => fn());
}

export function onLangChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function t(key: string, vars?: Record<string, string | number>): string {
  let s = DICTS[current][key] ?? DICTS.en[key] ?? key;
  if (vars) for (const k in vars) s = s.replace(`{${k}}`, String(vars[k]));
  return s;
}

export function fmtDateTime(ms: number): string {
  return new Intl.DateTimeFormat(LOCALES[current], {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(ms);
}
