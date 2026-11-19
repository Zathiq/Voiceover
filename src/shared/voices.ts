export type GeminiPrebuiltVoice = 'Kore' | 'Charon' | 'Puck' | 'Zephyr' | 'Fenrir';

export type VoiceCategory = 'Narration' | 'Commercial' | 'Dialogue' | 'Calm';

export type VoiceGender = 'female' | 'male';

export type GenderFilter = 'all' | VoiceGender;

export type LanguageCode =
  | 'en-US'
  | 'es-ES'
  | 'fr-FR'
  | 'de-DE'
  | 'ja-JP'
  | 'hi-IN'
  | 'pt-BR'
  | 'ar-XA';

export interface LanguageOption {
  code: LanguageCode;
  name: string;
  nativeName: string;
  shortCode: string;
  isRtl?: boolean;
  styleDirective: string;
  starterScript: string;
  dialogueStarter: Array<{ speaker: 'A' | 'B'; text: string }>;
}

export interface VoiceSamplePreset {
  id: string;
  name: string;
  role: string;
  language: LanguageCode;
  gender: VoiceGender;
  category: VoiceCategory;
  prebuiltVoice: GeminiPrebuiltVoice;
  timbre: string;
  bestFor: string;
  defaultStyle: string;
  sampleText: string;
  avatarUrl: string;
  initials: string;
}

export interface DeliveryTonePreset {
  id: string;
  label: string;
  directive: string;
}

export interface ScriptTemplate {
  id: string;
  title: string;
  category: string;
  language: LanguageCode;
  recommendedVoiceId: string;
  mode: 'single' | 'dialogue';
  text?: string;
  dialogue?: Array<{ speaker: 'A' | 'B'; text: string }>;
  secondaryVoiceId?: string;
}

const AVATAR_CLARA = '/src/assets/images/voice_actor_clara_1795071278297.jpg';
const AVATAR_MARCUS = '/src/assets/images/voice_actor_marcus_1795071279201.jpg';
const AVATAR_THEO = '/src/assets/images/voice_actor_theo_1795071280169.jpg';
const AVATAR_ELENA = '/src/assets/images/voice_actor_elena_1795071279466.jpg';
const AVATAR_DEVON = '/src/assets/images/voice_actor_devon_1795071278814.jpg';

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    code: 'en-US',
    name: 'English',
    nativeName: 'English',
    shortCode: 'EN',
    styleDirective: 'Spoken in natural native English',
    starterScript:
      'Every great story begins with a voice that knows when to lean forward and when to let a pause breathe. Customize pitch, speaking speed, and voice gender below, audition any studio preset, and export clean broadcast WAV audio.',
    dialogueStarter: [
      {
        speaker: 'A',
        text: 'Welcome back to the studio. <breath> Today we are comparing how speaking speed and pitch shape a thirty-second spot.',
      },
      {
        speaker: 'B',
        text: 'That is my favorite test. Lowering the pace slightly turns a quick announcement into a memorable conversation.',
      },
    ],
  },
  {
    code: 'es-ES',
    name: 'Spanish',
    nativeName: 'Español',
    shortCode: 'ES',
    styleDirective: 'Spoken in natural native Spanish with clear Iberian and neutral broadcast diction',
    starterScript:
      'Toda gran historia comienza con una voz capaz de marcar el ritmo justo en cada pausa. Ajusta el tono, la velocidad y el estilo vocal para transformar tu guion en audio limpio de calidad de estudio.',
    dialogueStarter: [
      {
        speaker: 'A',
        text: 'Bienvenidos de nuevo al estudio. <breath> Hoy probamos cómo el ritmo de la voz cambia por completo un anuncio breve.',
      },
      {
        speaker: 'B',
        text: 'Es increíble la diferencia. Con una entonación más cálida y pausada, cada frase gana mucha más cercanía.',
      },
    ],
  },
  {
    code: 'fr-FR',
    name: 'French',
    nativeName: 'Français',
    shortCode: 'FR',
    styleDirective: 'Spoken in natural native French with refined Parisian studio articulation',
    starterScript:
      'Chaque grand récit commence par une voix qui sait quand accélérer et quand laisser respirer un silence. Personnalisez la hauteur, la vitesse et le timbre pour créer une voix off prête pour la diffusion.',
    dialogueStarter: [
      {
        speaker: 'A',
        text: 'Bienvenue au studio. <breath> Aujourd’hui, nous explorons comment la vitesse de diction transforme un spot audio.',
      },
      {
        speaker: 'B',
        text: 'C’est frappant dès les premières secondes. Une pause bien placée capte immédiatement l’attention de l’auditeur.',
      },
    ],
  },
  {
    code: 'de-DE',
    name: 'German',
    nativeName: 'Deutsch',
    shortCode: 'DE',
    styleDirective: 'Spoken in natural native Standard German with crisp studio articulation',
    starterScript:
      'Jede starke Geschichte beginnt mit einer Stimme, die das richtige Tempo und die passende Klangfarbe trifft. Passen Sie Tonhöhe, Sprechgeschwindigkeit und Stil an und exportieren Sie sauberes WAV-Audio.',
    dialogueStarter: [
      {
        speaker: 'A',
        text: 'Willkommen zurück im Studio. <breath> Heute testen wir, wie Tonhöhe und Tempo die Wirkung eines kurzen Beitrags verändern.',
      },
      {
        speaker: 'B',
        text: 'Der Unterschied ist sofort hörbar. Schon eine etwas ruhigere Kadenz lässt den gesamten Text deutlich souveräner klingen.',
      },
    ],
  },
  {
    code: 'ja-JP',
    name: 'Japanese',
    nativeName: '日本語',
    shortCode: 'JA',
    styleDirective: 'Spoken in natural native Japanese with clear standard Tokyo broadcast pronunciation',
    starterScript:
      '印象に残る物語は、間の取り方を知る声から始まります。声の高さや話す速度、ナレーターのトーンを自在に調整し、クリアなスタジオ品質の音声をすぐに書き出せます。',
    dialogueStarter: [
      {
        speaker: 'A',
        text: 'スタジオへようこそ。<breath> 今日は話すスピードと声のトーンで、ナレーションの印象がどう変わるかを聴き比べます。',
      },
      {
        speaker: 'B',
        text: 'ほんの少し落ち着いたテンポにするだけで、言葉の説得力がぐっと増しますね。',
      },
    ],
  },
  {
    code: 'hi-IN',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    shortCode: 'HI',
    styleDirective: 'Spoken in natural native Hindi with crisp, warm Indian studio broadcast pronunciation',
    starterScript:
      'हर यादगार कहानी की शुरुआत एक ऐसी आवाज़ से होती है जो सही गति और ठहराव को समझती है। अपनी स्क्रिप्ट के अनुसार पिच, बोलने की गति और आवाज़ का अंदाज़ चुनें और तुरंत स्पष्ट स्टूडियो ऑडियो तैयार करें।',
    dialogueStarter: [
      {
        speaker: 'A',
        text: 'स्टूडियो में आपका फिर से स्वागत है। <breath> आज हम देख रहे हैं कि बोलने की गति और स्वर का उतार-चढ़ाव किसी संदेश को कितना असरदार बनाता है।',
      },
      {
        speaker: 'B',
        text: 'बिल्कुल सही कहा। सही जगह पर लिया गया छोटा सा विराम सुनने वाले का ध्यान तुरंत खींच लेता है।',
      },
    ],
  },
  {
    code: 'pt-BR',
    name: 'Portuguese',
    nativeName: 'Português',
    shortCode: 'PT',
    styleDirective: 'Spoken in natural native Brazilian Portuguese with clear studio diction',
    starterScript:
      'Toda grande história começa com uma voz que sabe o momento certo de dar ênfase e de deixar a pausa respirar. Ajuste o tom, a velocidade de fala e o estilo para gerar locuções nítidas em formato WAV.',
    dialogueStarter: [
      {
        speaker: 'A',
        text: 'Bem-vindos de volta ao estúdio. <breath> Hoje vamos mostrar como o ritmo e a altura da voz mudam totalmente uma narração.',
      },
      {
        speaker: 'B',
        text: 'Faz toda a diferença. Um ritmo mais natural deixa o roteiro muito mais envolvente logo nos primeiros segundos.',
      },
    ],
  },
  {
    code: 'ar-XA',
    name: 'Arabic',
    nativeName: 'العربية',
    shortCode: 'AR',
    isRtl: true,
    styleDirective: 'Spoken in natural Modern Standard Arabic with clear, resonant broadcast diction',
    starterScript:
      'تبدأ كل قصة مؤثرة بصوت يعرف متى يبرز المعنى ومتى يمنح الوقفة حقها. خصّص طبقة الصوت وسرعة الإلقاء وأسلوب الأداء لتحويل نصوصك إلى تعليق صوتي نقي بجودة الاستوديو.',
    dialogueStarter: [
      {
        speaker: 'A',
        text: 'أهلاً بكم مجدداً في الاستوديو. <breath> اليوم نستعرض كيف تغيّر سرعة الإلقاء وطبقة الصوت أثر الرسالة الصوتية.',
      },
      {
        speaker: 'B',
        text: 'الفرق واضح منذ اللحظة الأولى. الإيقاع المتزن يمنح كل جملة حضوراً ووضوحاً أكبر لدى المستمع.',
      },
    ],
  },
];

export const VOICE_SAMPLES: VoiceSamplePreset[] = [
  // English (en-US)
  {
    id: 'clara-doc',
    name: 'Clara',
    role: 'Documentary Narrator',
    language: 'en-US',
    gender: 'female',
    category: 'Narration',
    prebuiltVoice: 'Kore',
    timbre: 'Warm, articulate mezzo',
    bestFor: 'Documentaries, explainer films, editorial essays',
    defaultStyle: 'Warm, measured, authoritative documentary narrator with crisp articulation',
    sampleText:
      'Every quiet detail shapes the story long before the first frame appears on screen.',
    avatarUrl: AVATAR_CLARA,
    initials: 'CL',
  },
  {
    id: 'marcus-cinema',
    name: 'Marcus',
    role: 'Cinema & Trailer',
    language: 'en-US',
    gender: 'male',
    category: 'Narration',
    prebuiltVoice: 'Charon',
    timbre: 'Deep resonant baritone',
    bestFor: 'Trailers, brand manifestos, dramatic narration',
    defaultStyle: 'Deep, grounded cinematic baritone with calm authority and deliberate pacing',
    sampleText:
      'Beyond the northern ridge, the winter storm finally broke over the coastal highway.',
    avatarUrl: AVATAR_MARCUS,
    initials: 'MA',
  },
  {
    id: 'theo-promo',
    name: 'Theo',
    role: 'Upbeat Commercial Host',
    language: 'en-US',
    gender: 'male',
    category: 'Commercial',
    prebuiltVoice: 'Puck',
    timbre: 'Bright, nimble tenor',
    bestFor: 'Product launches, social spots, lively intros',
    defaultStyle: 'Bright, upbeat, friendly commercial voice with crisp energy and natural smile',
    sampleText:
      'Meet the simplest way to turn rough drafts into broadcast-ready voiceovers in seconds.',
    avatarUrl: AVATAR_THEO,
    initials: 'TH',
  },
  {
    id: 'elena-audiobook',
    name: 'Elena',
    role: 'Audiobook Storyteller',
    language: 'en-US',
    gender: 'female',
    category: 'Calm',
    prebuiltVoice: 'Zephyr',
    timbre: 'Soft, expressive alto',
    bestFor: 'Fiction audiobooks, memoirs, intimate storytelling',
    defaultStyle: 'Gentle, intimate audiobook storyteller with warm lyrical cadence',
    sampleText:
      'She paused beside the lighthouse rail, listening to the harbor bells fade into the mist.',
    avatarUrl: AVATAR_ELENA,
    initials: 'EL',
  },
  {
    id: 'devon-explainer',
    name: 'Devon',
    role: 'Product & Brand Lead',
    language: 'en-US',
    gender: 'male',
    category: 'Commercial',
    prebuiltVoice: 'Fenrir',
    timbre: 'Crisp, confident baritone',
    bestFor: 'Keynotes, product demos, B2B brand spots',
    defaultStyle: 'Confident, direct, polished product narrator with clean studio punch',
    sampleText:
      'Built for precision, engineered for clarity, and ready whenever your production schedule moves.',
    avatarUrl: AVATAR_DEVON,
    initials: 'DE',
  },
  {
    id: 'clara-news',
    name: 'Clara · Desk',
    role: 'Broadcast News Anchor',
    language: 'en-US',
    gender: 'female',
    category: 'Dialogue',
    prebuiltVoice: 'Kore',
    timbre: 'Neutral, brisk soprano',
    bestFor: 'Daily briefings, interviews, corporate updates',
    defaultStyle: 'Clear, poised broadcast news anchor with crisp diction and steady journalistic rhythm',
    sampleText:
      'Good evening. Regional transit authorities announced new overnight rail lines starting this autumn.',
    avatarUrl: AVATAR_CLARA,
    initials: 'CD',
  },

  // Spanish (es-ES)
  {
    id: 'es-sofia-doc',
    name: 'Sofía',
    role: 'Narradora Documental',
    language: 'es-ES',
    gender: 'female',
    category: 'Narration',
    prebuiltVoice: 'Kore',
    timbre: 'Cálida y articulada',
    bestFor: 'Documentales, reportajes, vídeos corporativos',
    defaultStyle: 'Warm, authoritative Spanish documentary narrator with clear studio diction',
    sampleText:
      'Cada pequeño detalle da forma a la historia mucho antes de que aparezca la primera imagen.',
    avatarUrl: AVATAR_CLARA,
    initials: 'SO',
  },
  {
    id: 'es-mateo-cinema',
    name: 'Mateo',
    role: 'Voz Cinematográfica',
    language: 'es-ES',
    gender: 'male',
    category: 'Narration',
    prebuiltVoice: 'Charon',
    timbre: 'Barítono profundo',
    bestFor: 'Tráilers, manifiestos de marca, narrativa épica',
    defaultStyle: 'Deep, grounded Spanish cinematic baritone with calm authority',
    sampleText:
      'Más allá de la cordillera, la tormenta de invierno por fin dio paso a la calma costera.',
    avatarUrl: AVATAR_MARCUS,
    initials: 'MT',
  },
  {
    id: 'es-lucia-calm',
    name: 'Lucía',
    role: 'Audiolibros y Relatos',
    language: 'es-ES',
    gender: 'female',
    category: 'Calm',
    prebuiltVoice: 'Zephyr',
    timbre: 'Suave y expresiva',
    bestFor: 'Audiolibros, bienestar, narración íntima',
    defaultStyle: 'Gentle, lyrical Spanish audiobook narrator with soothing rhythm',
    sampleText:
      'Se detuvo junto al mirador del puerto, escuchando el suave eco de las campanas entre la niebla.',
    avatarUrl: AVATAR_ELENA,
    initials: 'LU',
  },
  {
    id: 'es-diego-promo',
    name: 'Diego',
    role: 'Locutor Comercial',
    language: 'es-ES',
    gender: 'male',
    category: 'Commercial',
    prebuiltVoice: 'Puck',
    timbre: 'Ágil y cercano',
    bestFor: 'Anuncios, lanzamientos de producto, pódcast',
    defaultStyle: 'Bright, upbeat Spanish commercial host with energetic conversational flow',
    sampleText:
      'Descubre la manera más sencilla de convertir tus guiones en locuciones de estudio en segundos.',
    avatarUrl: AVATAR_THEO,
    initials: 'DI',
  },

  // French (fr-FR)
  {
    id: 'fr-camille-doc',
    name: 'Camille',
    role: 'Voix Documentaire',
    language: 'fr-FR',
    gender: 'female',
    category: 'Narration',
    prebuiltVoice: 'Kore',
    timbre: 'Claire et posée',
    bestFor: 'Documentaires, musées, films institutionnels',
    defaultStyle: 'Warm, articulate French documentary narrator with refined clarity',
    sampleText:
      'Chaque détail discret façonne le récit bien avant que la première image n’apparaisse à l’écran.',
    avatarUrl: AVATAR_CLARA,
    initials: 'CA',
  },
  {
    id: 'fr-henri-cinema',
    name: 'Henri',
    role: 'Narration Cinéma',
    language: 'fr-FR',
    gender: 'male',
    category: 'Narration',
    prebuiltVoice: 'Charon',
    timbre: 'Baryton grave et calme',
    bestFor: 'Bandes-annonces, récits historiques, luxe',
    defaultStyle: 'Deep, poised French cinematic voice with measured dramatic weight',
    sampleText:
      'Au-delà de la crête, la tempête hivernale s’est enfin dissipée au-dessus de la côte.',
    avatarUrl: AVATAR_MARCUS,
    initials: 'HE',
  },
  {
    id: 'fr-amelie-calm',
    name: 'Amélie',
    role: 'Livre Audio & Détente',
    language: 'fr-FR',
    gender: 'female',
    category: 'Calm',
    prebuiltVoice: 'Zephyr',
    timbre: 'Douce et veloutée',
    bestFor: 'Livres audio, méditation, contes',
    defaultStyle: 'Soft, intimate French storyteller with unhurried melodic cadence',
    sampleText:
      'Elle marqua une pause près du phare, écoutant le souffle régulier des vagues dans la brume.',
    avatarUrl: AVATAR_ELENA,
    initials: 'AM',
  },
  {
    id: 'fr-lucas-promo',
    name: 'Lucas',
    role: 'Animateur & Spot Pub',
    language: 'fr-FR',
    gender: 'male',
    category: 'Commercial',
    prebuiltVoice: 'Puck',
    timbre: 'Dynamique et souriant',
    bestFor: 'Publicités, présentations produit, podcasts',
    defaultStyle: 'Bright, engaging French commercial host with crisp modern delivery',
    sampleText:
      'Transformez vos textes en voix off de qualité studio en quelques secondes seulement.',
    avatarUrl: AVATAR_THEO,
    initials: 'LC',
  },

  // German (de-DE)
  {
    id: 'de-hannah-doc',
    name: 'Hannah',
    role: 'Dokumentarsprecherin',
    language: 'de-DE',
    gender: 'female',
    category: 'Narration',
    prebuiltVoice: 'Kore',
    timbre: 'Klar und ausgewogen',
    bestFor: 'Dokumentationen, Erklärfilme, Nachrichten',
    defaultStyle: 'Clear, poised German documentary narrator with crisp broadcast precision',
    sampleText:
      'Jedes leise Detail prägt die Geschichte, noch lange bevor das erste Bild auf der Leinwand erscheint.',
    avatarUrl: AVATAR_CLARA,
    initials: 'HA',
  },
  {
    id: 'de-lukas-brand',
    name: 'Lukas',
    role: 'Marken- & Produktstimme',
    language: 'de-DE',
    gender: 'male',
    category: 'Commercial',
    prebuiltVoice: 'Fenrir',
    timbre: 'Souveräner Bariton',
    bestFor: 'Keynotes, Produktdemos, B2B-Spots',
    defaultStyle: 'Confident, polished German brand narrator with clean studio punch',
    sampleText:
      'Entwickelt für Präzision, geschaffen für Klarheit und bereit für jeden engen Zeitplan.',
    avatarUrl: AVATAR_DEVON,
    initials: 'LK',
  },
  {
    id: 'de-klara-calm',
    name: 'Klara',
    role: 'Hörbuch & Erzählung',
    language: 'de-DE',
    gender: 'female',
    category: 'Calm',
    prebuiltVoice: 'Zephyr',
    timbre: 'Sanft und einfühlsam',
    bestFor: 'Hörbücher, Entspannung, literarische Texte',
    defaultStyle: 'Gentle, expressive German audiobook narrator with calm rhythm',
    sampleText:
      'Sie blieb am Geländer des Leuchtturms stehen und lauschte den fernen Hafenklängen im Nebel.',
    avatarUrl: AVATAR_ELENA,
    initials: 'KL',
  },
  {
    id: 'de-max-cinema',
    name: 'Maximilian',
    role: 'Kino & Reportage',
    language: 'de-DE',
    gender: 'male',
    category: 'Dialogue',
    prebuiltVoice: 'Charon',
    timbre: 'Tief und resonant',
    bestFor: 'Reportagen, Podcasts, dramatische Stoffe',
    defaultStyle: 'Deep, grounded German studio host with resonant warmth',
    sampleText:
      'Hinter dem nördlichen Grat löste sich der Wintersturm endlich über der Küstenstraße auf.',
    avatarUrl: AVATAR_MARCUS,
    initials: 'MX',
  },

  // Japanese (ja-JP)
  {
    id: 'ja-haruka-doc',
    name: 'Haruka · はるか',
    role: 'Documentary & News',
    language: 'ja-JP',
    gender: 'female',
    category: 'Narration',
    prebuiltVoice: 'Kore',
    timbre: 'Clear, poised mezzo',
    bestFor: 'Documentaries, tutorials, corporate narration',
    defaultStyle: 'Clear, poised Japanese narrator with natural broadcast cadence',
    sampleText:
      '画面に最初の映像が映し出されるずっと前から、静かな細部が物語を形づくっています。',
    avatarUrl: AVATAR_CLARA,
    initials: 'HR',
  },
  {
    id: 'ja-kenji-cinema',
    name: 'Kenji · 健二',
    role: 'Deep Narration',
    language: 'ja-JP',
    gender: 'male',
    category: 'Narration',
    prebuiltVoice: 'Charon',
    timbre: 'Calm, deep baritone',
    bestFor: 'Trailers, documentaries, brand films',
    defaultStyle: 'Deep, calm Japanese documentary narrator with deliberate pacing',
    sampleText:
      '北の尾根を越えたところで、冬の嵐はようやく海沿いの道の上で静まりました。',
    avatarUrl: AVATAR_MARCUS,
    initials: 'KJ',
  },
  {
    id: 'ja-yui-calm',
    name: 'Yui · 結衣',
    role: 'Audiobook & Calm',
    language: 'ja-JP',
    gender: 'female',
    category: 'Calm',
    prebuiltVoice: 'Zephyr',
    timbre: 'Soft, gentle tone',
    bestFor: 'Audiobooks, wellness guides, essays',
    defaultStyle: 'Soft, soothing Japanese storyteller with gentle expressive phrasing',
    sampleText:
      '彼女は灯台の手すりのそばで立ち止まり、霧の中に溶けていく港の鐘の音に耳を澄ませました。',
    avatarUrl: AVATAR_ELENA,
    initials: 'YU',
  },
  {
    id: 'ja-ren-promo',
    name: 'Ren · 蓮',
    role: 'Commercial & Host',
    language: 'ja-JP',
    gender: 'male',
    category: 'Commercial',
    prebuiltVoice: 'Puck',
    timbre: 'Bright, lively tenor',
    bestFor: 'Product intros, social promos, podcasts',
    defaultStyle: 'Bright, friendly Japanese commercial host with crisp upbeat energy',
    sampleText:
      '思いついた原稿を、わずか数秒でスタジオ品質のナレーションへ仕上げましょう。',
    avatarUrl: AVATAR_THEO,
    initials: 'RN',
  },

  // Hindi (hi-IN)
  {
    id: 'hi-ananya-doc',
    name: 'Ananya · अनन्या',
    role: 'Broadcast & Documentary',
    language: 'hi-IN',
    gender: 'female',
    category: 'Narration',
    prebuiltVoice: 'Kore',
    timbre: 'Crisp, warm studio voice',
    bestFor: 'Documentaries, news explainers, e-learning',
    defaultStyle: 'Clear, poised Hindi documentary narrator with articulate pronunciation',
    sampleText:
      'हर छोटी बारीकी उस कहानी को आकार देती है, जो पर्दे पर पहले दृश्य से पहले ही शुरू हो जाती है।',
    avatarUrl: AVATAR_CLARA,
    initials: 'AN',
  },
  {
    id: 'hi-aarav-brand',
    name: 'Aarav · आरव',
    role: 'Brand & Commercial',
    language: 'hi-IN',
    gender: 'male',
    category: 'Commercial',
    prebuiltVoice: 'Fenrir',
    timbre: 'Confident, polished baritone',
    bestFor: 'Ad spots, product videos, announcements',
    defaultStyle: 'Confident, engaging Hindi commercial voice with clean studio energy',
    sampleText:
      'सटीक उच्चारण और स्पष्ट स्टूडियो ध्वनि के साथ अपने विचारों को तुरंत प्रभावशाली आवाज़ दें।',
    avatarUrl: AVATAR_DEVON,
    initials: 'AA',
  },
  {
    id: 'hi-meera-calm',
    name: 'Meera · मीरा',
    role: 'Storyteller & Wellness',
    language: 'hi-IN',
    gender: 'female',
    category: 'Calm',
    prebuiltVoice: 'Zephyr',
    timbre: 'Gentle, lyrical alto',
    bestFor: 'Audiobooks, poetry, guided reflection',
    defaultStyle: 'Soft, expressive Hindi storyteller with warm unhurried cadence',
    sampleText:
      'वह शांत झील के किनारे कुछ पल ठहरी और शाम की हल्की हवा में घुली खामोशी को महसूस किया।',
    avatarUrl: AVATAR_ELENA,
    initials: 'ME',
  },
  {
    id: 'hi-kabir-cinema',
    name: 'Kabir · कबीर',
    role: 'Deep Narration & Host',
    language: 'hi-IN',
    gender: 'male',
    category: 'Dialogue',
    prebuiltVoice: 'Charon',
    timbre: 'Resonant deep baritone',
    bestFor: 'Podcasts, trailers, long-form narration',
    defaultStyle: 'Deep, grounded Hindi narrator with warm conversational presence',
    sampleText:
      'उत्तरी पहाड़ियों के पार ढलते सूरज ने पूरी घाटी को सुनहरी शांति से भर दिया।',
    avatarUrl: AVATAR_MARCUS,
    initials: 'KB',
  },

  // Portuguese (pt-BR)
  {
    id: 'pt-beatriz-doc',
    name: 'Beatriz',
    role: 'Narradora Editorial',
    language: 'pt-BR',
    gender: 'female',
    category: 'Narration',
    prebuiltVoice: 'Kore',
    timbre: 'Clara e envolvente',
    bestFor: 'Documentários, cursos, apresentações',
    defaultStyle: 'Warm, articulate Brazilian Portuguese narrator with broadcast clarity',
    sampleText:
      'Cada detalhe silencioso molda a história muito antes da primeira cena aparecer na tela.',
    avatarUrl: AVATAR_CLARA,
    initials: 'BE',
  },
  {
    id: 'pt-rafael-brand',
    name: 'Rafael',
    role: 'Locutor Institucional',
    language: 'pt-BR',
    gender: 'male',
    category: 'Commercial',
    prebuiltVoice: 'Fenrir',
    timbre: 'Firme e moderno',
    bestFor: 'Vídeos de produto, campanhas, branding',
    defaultStyle: 'Confident, modern Brazilian Portuguese brand voice with crisp delivery',
    sampleText:
      'Projetado para clareza, feito para agilidade e pronto para acompanhar o ritmo da sua produção.',
    avatarUrl: AVATAR_DEVON,
    initials: 'RF',
  },
  {
    id: 'pt-marina-calm',
    name: 'Marina',
    role: 'Audiolivros & Bem-Estar',
    language: 'pt-BR',
    gender: 'female',
    category: 'Calm',
    prebuiltVoice: 'Zephyr',
    timbre: 'Suave e acolhedora',
    bestFor: 'Audiolivros, meditação, narrativas calmas',
    defaultStyle: 'Soft, soothing Brazilian Portuguese storyteller with gentle phrasing',
    sampleText:
      'Ela parou perto do cais ao entardecer, ouvindo o som suave da maré contra as pedras.',
    avatarUrl: AVATAR_ELENA,
    initials: 'MR',
  },
  {
    id: 'pt-gabriel-host',
    name: 'Gabriel',
    role: 'Apresentador & Podcast',
    language: 'pt-BR',
    gender: 'male',
    category: 'Dialogue',
    prebuiltVoice: 'Puck',
    timbre: 'Leve e comunicativo',
    bestFor: 'Podcasts, chamadas comerciais, redes sociais',
    defaultStyle: 'Upbeat, friendly Brazilian Portuguese host with natural conversational spark',
    sampleText:
      'Transforme seus roteiros em locuções limpas com qualidade de estúdio em poucos segundos.',
    avatarUrl: AVATAR_THEO,
    initials: 'GB',
  },

  // Arabic (ar-XA)
  {
    id: 'ar-layla-doc',
    name: 'Layla · ليلى',
    role: 'Broadcast & Documentary',
    language: 'ar-XA',
    gender: 'female',
    category: 'Narration',
    prebuiltVoice: 'Kore',
    timbre: 'Poised, crisp studio voice',
    bestFor: 'Documentaries, news briefings, educational films',
    defaultStyle: 'Clear, authoritative Modern Standard Arabic broadcast narrator',
    sampleText:
      'كل تفصيل هادئ يصنع ملامح القصة قبل أن يظهر المشهد الأول على الشاشة.',
    avatarUrl: AVATAR_CLARA,
    initials: 'LY',
  },
  {
    id: 'ar-tariq-cinema',
    name: 'Tariq · طارق',
    role: 'Deep Documentary',
    language: 'ar-XA',
    gender: 'male',
    category: 'Narration',
    prebuiltVoice: 'Charon',
    timbre: 'Deep resonant baritone',
    bestFor: 'Trailers, cultural films, dramatic narration',
    defaultStyle: 'Deep, dignified Modern Standard Arabic narrator with steady cinematic cadence',
    sampleText:
      'خلف التلال الشمالية، هدأت العاصفة الشتوية أخيراً فوق الطريق الساحلي.',
    avatarUrl: AVATAR_MARCUS,
    initials: 'TQ',
  },
  {
    id: 'ar-noor-calm',
    name: 'Noor · نور',
    role: 'Audiobook Storyteller',
    language: 'ar-XA',
    gender: 'female',
    category: 'Calm',
    prebuiltVoice: 'Zephyr',
    timbre: 'Soft, lyrical alto',
    bestFor: 'Audiobooks, literature, calm narration',
    defaultStyle: 'Gentle, warm Modern Standard Arabic storyteller with serene pacing',
    sampleText:
      'توقفت عند شرفة المنارة بهدوء، تصغي إلى أصداء الميناء وهي تتلاشى في الضباب.',
    avatarUrl: AVATAR_ELENA,
    initials: 'NR',
  },
  {
    id: 'ar-omar-promo',
    name: 'Omar · عمر',
    role: 'Commercial & Host',
    language: 'ar-XA',
    gender: 'male',
    category: 'Commercial',
    prebuiltVoice: 'Puck',
    timbre: 'Bright, engaging tenor',
    bestFor: 'Commercials, promos, lively explainers',
    defaultStyle: 'Upbeat, crisp Modern Standard Arabic commercial presenter',
    sampleText:
      'حوّل نصوصك إلى تعليق صوتي احترافي بجودة الاستوديو في ثوانٍ معدودة.',
    avatarUrl: AVATAR_THEO,
    initials: 'OM',
  },
];

export const DELIVERY_TONES: DeliveryTonePreset[] = [
  {
    id: 'default',
    label: 'Signature',
    directive: '',
  },
  {
    id: 'broadcast',
    label: 'Broadcast',
    directive: 'Crisp studio broadcast clarity, poised and authoritative',
  },
  {
    id: 'storyteller',
    label: 'Storyteller',
    directive: 'Warm, expressive narrative flow with natural emotional inflection',
  },
  {
    id: 'energetic',
    label: 'Upbeat',
    directive: 'Bright, engaging commercial energy with confident emphasis',
  },
  {
    id: 'calm',
    label: 'Calm',
    directive: 'Soft, calm, unhurried delivery with gentle phrasing',
  },
  {
    id: 'dramatic',
    label: 'Cinematic',
    directive: 'Measured, dramatic theatrical weight with deliberate pauses',
  },
];

export const SCRIPT_TEMPLATES: ScriptTemplate[] = [
  {
    id: 'product-launch',
    title: 'Product Launch Spot',
    category: 'English · Commercial',
    language: 'en-US',
    recommendedVoiceId: 'devon-explainer',
    mode: 'single',
    text: 'Great audio should never wait on a booking calendar. With Cadence Studio, type your script, shape pitch and pacing, and export clean broadcast WAV masters in moments.',
  },
  {
    id: 'doc-intro',
    title: 'Documentary Opening',
    category: 'English · Narration',
    language: 'en-US',
    recommendedVoiceId: 'clara-doc',
    mode: 'single',
    text: 'At five thousand meters above sea level, the air thins and the wind writes its own architecture across the salt flats. For decades, researchers believed nothing could endure here—until a winter survey changed everything.',
  },
  {
    id: 'es-documentary',
    title: 'Documental en Español',
    category: 'Español · Narration',
    language: 'es-ES',
    recommendedVoiceId: 'es-sofia-doc',
    mode: 'single',
    text: 'Al amanecer, la niebla se levanta lentamente sobre los valles del norte, revelando caminos trazados hace siglos por viajeros y pastores.',
  },
  {
    id: 'ja-commercial',
    title: '日本語ブランド紹介',
    category: '日本語 · Commercial',
    language: 'ja-JP',
    recommendedVoiceId: 'ja-ren-promo',
    mode: 'single',
    text: '新しいアイデアを、最も伝わる声で届けましょう。トーンもスピードも思いのままに整えて、数秒でクリアな音声を書き出せます。',
  },
  {
    id: 'podcast-exchange',
    title: 'Podcast Two-Host Intro',
    category: 'English · Dialogue',
    language: 'en-US',
    recommendedVoiceId: 'marcus-cinema',
    secondaryVoiceId: 'theo-promo',
    mode: 'dialogue',
    dialogue: [
      {
        speaker: 'A',
        text: 'Welcome back to Soundcraft Weekly. <breath> Today we are talking about why voice pacing matters more than studio gear.',
      },
      {
        speaker: 'B',
        text: 'Honestly, that took me years to learn. You can have the cleanest microphone in the world, and still lose listeners in ten seconds if the rhythm feels rushed.',
      },
      {
        speaker: 'A',
        text: 'Exactly. A half-second pause before a key line carries more weight than any compressor ever could.',
      },
    ],
  },
];

export function getLanguageByCode(code: string): LanguageOption {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code) ?? SUPPORTED_LANGUAGES[0];
}

export function getVoicePresetById(id: string): VoiceSamplePreset | undefined {
  return VOICE_SAMPLES.find((v) => v.id === id);
}

export function getVoicesByLanguage(language: LanguageCode): VoiceSamplePreset[] {
  return VOICE_SAMPLES.filter((v) => v.language === language);
}

export function formatPitchLabel(pitch: number): string {
  if (pitch === 0) return 'Natural (0 st)';
  const sign = pitch > 0 ? '+' : '';
  if (pitch <= -4) return `Deep (${sign}${pitch} st)`;
  if (pitch < 0) return `Lower (${sign}${pitch} st)`;
  if (pitch >= 4) return `Bright (${sign}${pitch} st)`;
  return `Higher (${sign}${pitch} st)`;
}

export function formatSpeedLabel(speed: number): string {
  const formatted = `${speed.toFixed(2)}×`;
  if (speed <= 0.82) return `Slow (${formatted})`;
  if (speed < 0.95) return `Relaxed (${formatted})`;
  if (speed <= 1.05) return `Standard (${formatted})`;
  if (speed < 1.22) return `Brisk (${formatted})`;
  return `Fast (${formatted})`;
}
