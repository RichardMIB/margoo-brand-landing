/**
 * Todo o conteúdo da landing (textos, links, contatos, fotos).
 * Componentes não têm texto solto: leem daqui. Fonte: referencia/prototipo.html (aprovado) + CLAUDE.md.
 *
 * PENDÊNCIAS — não inventar dados:
 * - WhatsApp de Margarida e Edna: `phone: null` até a loja enviar os números.
 *   Enquanto for null, o cartão mostra "[NÚMERO]" e aponta para #atendimento.
 * - FOTOS PROVISÓRIAS: capturas de tela da loja online (referencia/img*). Para produção,
 *   trocar pelos originais das sessões de fotos e rodar `npm run images`.
 */
import images from './images.generated.json'

// ---------- Tipos ----------

export type PhotoId = keyof typeof images

export interface Photo {
  id: PhotoId
  /** Descrição em português da peça/cena (nunca "imagem"). */
  alt: string
  /** Enquadramento dentro da moldura (CSS object-position). */
  objectPosition?: string
}

export interface Link {
  label: string
  href: string
}

export interface Consultant {
  name: string
  role: string
  /** Telefone com DDD, ex.: "(85) 99999-9999". null = pendente. */
  phone: string | null
}

export interface OpeningHours {
  /** Dias no formato schema.org (JSON-LD). */
  days: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday')[]
  opens: string
  closes: string
  label: string
}

// ---------- Dados do negócio ----------

export const anchors = {
  top: 'topo',
  collections: 'ocasioes',
  showcase: 'vitrine',
  store: 'loja',
  contact: 'atendimento',
} as const

const ONLINE_STORE = 'https://margoobrand.com.br/'

export const business = {
  name: 'Margoo Brand',
  logo: 'MARGOOBRAND',
  onlineStore: ONLINE_STORE,
  instagram: { handle: '@margoobrand_', url: 'https://www.instagram.com/margoobrand_/' },
  address: {
    street: 'Av. Beira Mar, 3960',
    unit: 'Loja 16',
    gallery: 'Galeria Via Scala',
    neighborhood: 'Meireles',
    city: 'Fortaleza',
    region: 'CE',
    country: 'BR',
  },
  /** URL universal do Google Maps (abre o app no celular). */
  mapsUrl:
    'https://www.google.com/maps/search/?api=1&query=' +
    encodeURIComponent('Av. Beira Mar, 3960, Loja 16, Galeria Via Scala, Meireles, Fortaleza - CE'),
  hours: [
    {
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '09:00',
      closes: '19:00',
      label: 'Segunda a sexta, das 9h às 19h',
    },
    { days: ['Saturday'], opens: '09:00', closes: '14:00', label: 'Sábado, das 9h às 14h' },
  ] satisfies OpeningHours[],
  priceRange: 'R$300 a R$1.500',
  credit: 'Site por DataCode Studio',
} as const

export const whatsappMessage =
  'Olá! Vim pelo site da Margoo Brand e quero ajuda para escolher uma peça.'

export const consultants: Consultant[] = [
  { name: 'Margarida', role: 'Consultora', phone: null }, // PENDENTE: número da loja
  { name: 'Edna', role: 'Consultora', phone: null }, // PENDENTE: número da loja
]

/** Texto exibido no lugar do número enquanto ele é pendente. */
export const phonePlaceholder = '[NÚMERO]'

// ---------- Seções (na ordem da página) ----------

export const a11y = {
  skipLink: 'Pular para o conteúdo',
  mainId: 'conteudo',
  navLabel: 'Principal',
}

export const header = {
  nav: [
    { label: 'Coleções', href: `#${anchors.collections}` },
    { label: 'A loja', href: `#${anchors.store}` },
    { label: 'Atendimento', href: `#${anchors.contact}` },
  ] satisfies Link[],
  cta: { label: 'Falar no WhatsApp', href: `#${anchors.contact}` } satisfies Link,
}

export const hero = {
  kicker: 'Boutique feminina na Beira-Mar, Fortaleza',
  title: 'Para mulheres que se expressam através do que vestem.',
  lead: 'Alfaiataria, tricot, bordados e peças de festa escolhidas uma a uma. Prove na nossa nova loja na Galeria Via Scala ou peça ajuda a uma consultora pelo WhatsApp.',
  primary: { label: 'Falar com uma consultora', href: `#${anchors.contact}` } satisfies Link,
  secondary: { label: 'Ver a loja online', href: ONLINE_STORE } satisfies Link,
  collageLabel: 'Peças da coleção',
  photos: {
    main: {
      id: 'vestido-assimetrico',
      alt: 'Modelo com vestido assimétrico creme em estúdio',
      caption: 'Vestido assimétrico',
    },
    second: { id: 'jaqueta-strass', alt: 'Modelo com jaqueta preta de mangas com strass dourado' },
    third: { id: 'corset-vermelho', alt: 'Modelo com corset e saia vermelhos de cetim' },
  } satisfies Record<string, Photo & { caption?: string }>,
}

export const marquee = {
  label: 'Linhas da coleção',
  primary: ['Alfaiataria', 'Tricot', 'Bordados', 'Festa', 'Cetim'],
  outline: ['Renda', 'Laise', 'Crepe', 'Malha canelada', 'Tafetá'],
}

export const facts = {
  label: 'Diferenciais',
  items: [
    { title: 'Até 12x', text: 'no cartão, na loja e online' },
    { title: 'Presencial e online', text: 'prove na loja ou receba em casa' },
    { title: 'Seg a sex, 9h às 19h', text: 'sábado, das 9h às 14h' },
  ],
}

export const occasions = {
  title: 'Uma ocasião, um look.',
  lead: 'Do escritório ao casamento no fim de tarde. Escolha por onde começar e veja as peças disponíveis na loja online.',
  items: [
    {
      title: 'Alfaiataria',
      text: 'Para o trabalho e os dias de presença',
      href: ONLINE_STORE,
      photo: { id: 'alfaiataria-colete', alt: 'Modelo com colete de alfaiataria e calça pantalona off white' },
    },
    {
      title: 'Festa',
      text: 'Para as noites importantes',
      href: ONLINE_STORE,
      photo: { id: 'vestido-ombro', alt: 'Modelo com vestido midi amarelo-manteiga de um ombro só e fenda assimétrica' },
    },
    {
      title: 'Vestidos',
      text: 'Leveza para os dias de sol',
      href: ONLINE_STORE,
      photo: { id: 'vestido-estampado', alt: 'Modelo com vestido longo tomara que caia marrom com bordado claro' },
    },
    {
      title: 'Renda e bordados',
      text: 'Detalhes feitos para serem notados',
      href: ONLINE_STORE,
      photo: { id: 'renda-branca', alt: 'Modelo com vestido longo de renda branca com babados nas mangas' },
    },
    {
      title: 'Tricot',
      text: 'Essenciais arrumados sem esforço',
      href: ONLINE_STORE,
      photo: { id: 'body-tricot', alt: 'Modelo com body cinza de gola alta e calça risca de giz' },
    },
  ] satisfies { title: string; text: string; href: string; photo: Photo }[],
}

export const showcase = {
  label: 'Vitrine em movimento',
  title: 'Na vitrine agora',
  lead: 'Peças que acabaram de chegar à loja. Role para ver todas.',
  items: [
    {
      label: 'Camisa de seda e linho',
      href: ONLINE_STORE,
      photo: { id: 'camisa-seda', alt: 'Modelo com camisa azul-marinho de seda e linho' },
    },
    {
      label: 'Vestido de malha canelada',
      href: ONLINE_STORE,
      photo: { id: 'malha-canelada', alt: 'Modelo com vestido de malha canelada caramelo com recorte preto' },
    },
    {
      label: 'Vestido de tule com babados',
      href: ONLINE_STORE,
      photo: { id: 'tule-babados', alt: 'Modelo com vestido longo de tule com babados estampado' },
    },
    {
      label: 'Vestido vermelho com babado',
      href: ONLINE_STORE,
      photo: { id: 'vermelho-babado', alt: 'Modelo com vestido curto vermelho com barra em babado' },
    },
    {
      label: 'Off white de um ombro',
      href: ONLINE_STORE,
      photo: {
        id: 'retrato-off',
        alt: 'Retrato de modelo com vestido off white de um ombro só',
        objectPosition: 'center top',
      },
    },
  ] satisfies { label: string; href: string; photo: Photo }[],
}

export const steps = {
  title: 'Prove com calma, do jeito que preferir.',
  items: [
    { title: 'Mande o que gostou', text: 'Um print do Instagram ou da loja online pelo WhatsApp já basta.' },
    { title: 'Separamos no seu tamanho', text: 'A consultora confirma a disponibilidade e sugere peças para combinar.' },
    { title: 'Prove na loja ou receba em casa', text: 'Pagamento em até 12x no cartão, presencial ou online.' },
  ],
}

export const storeSection = {
  title: 'Estamos de casa nova.',
  lead: 'A loja agora fica na Galeria Via Scala, anexa ao Hotel Gran Marquise. Vitrine renovada toda semana e espaço para provar com calma.',
  addressLines: [
    `${business.address.street}, ${business.address.unit}`,
    `${business.address.gallery}, ${business.address.neighborhood}, ${business.address.city}`,
  ],
  photo: {
    id: 'fachada',
    alt: 'Fachada da loja Margoo Brand com letreiro em neon azul na Galeria Via Scala',
  } satisfies Photo,
  primary: { label: 'Como chegar', href: business.mapsUrl } satisfies Link,
  secondary: { label: 'Avisar que vou passar', href: `#${anchors.contact}` } satisfies Link,
}

export const contact = {
  title: 'Prefere conversar antes?',
  lead: 'Nossas consultoras ajudam a escolher o tamanho, combinar peças e separar o look para você provar na loja.',
  cta: 'Chamar no WhatsApp',
  /** Monta a legenda do cartão: "Consultora, WhatsApp (85) 9…" ou "[NÚMERO]". */
  phoneLabel: (c: Consultant) => `${c.role}, WhatsApp ${c.phone ?? phonePlaceholder}`,
}

export const finale = {
  label: 'Encerramento',
  title: 'Cada detalhe conta.',
  text: 'Galeria Via Scala, Av. Beira Mar, 3960. Esperamos sua visita.',
  cta: { label: 'Como chegar', href: business.mapsUrl } satisfies Link,
}

export const footer = {
  instagramLabel: 'Instagram',
  onlineStoreLabel: 'Loja online',
  onlineStoreText: 'margoobrand.com.br',
}
