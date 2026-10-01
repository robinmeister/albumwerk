import { Price } from "../../../utils/types";

// Product catalog vocabulary for photo pricing — mirrors how print shops and
// album platforms structure their price lists: product type + size.
export type PriceCategory = "digital" | "print" | "canvas" | "poster" | "other";

export const CATEGORY_ORDER: PriceCategory[] = [
  "digital",
  "print",
  "canvas",
  "poster",
  "other",
];

export const CATEGORY_LABELS: Record<PriceCategory, string> = {
  digital: "Digitale Datei",
  print: "Abzug",
  canvas: "Leinwand",
  poster: "Poster",
  other: "Sonstiges",
};

// common lab formats offered as autocomplete suggestions; free text stays allowed
export const SIZE_SUGGESTIONS: Record<PriceCategory, string[]> = {
  digital: [],
  print: ["9×13 cm", "10×15 cm", "13×18 cm", "15×20 cm", "20×30 cm", "30×45 cm"],
  canvas: ["30×45 cm", "40×60 cm", "60×90 cm", "80×120 cm"],
  poster: ["30×45 cm", "50×75 cm", "60×90 cm"],
  other: [],
};

export function categoryOf(price: Price): PriceCategory {
  const c = (price as any).category as PriceCategory | undefined;
  if (c && CATEGORY_ORDER.includes(c)) return c;
  // legacy records without category
  return price.isDownloadable ? "digital" : "other";
}

// "Abzug 13×18 cm", "Digitale Datei" — used when the admin leaves the title empty
export function priceTitle(category: PriceCategory, size: string): string {
  return size ? `${CATEGORY_LABELS[category]} ${size}` : CATEGORY_LABELS[category];
}

// sort inside a category by physical size (first number), then price
function sizeValue(price: Price): number {
  const m = ((price as any).size ?? price.title ?? "").match(/\d+/);
  return m ? parseInt(m[0], 10) : Number.MAX_SAFE_INTEGER;
}

function sortPrices(prices: Price[]): Price[] {
  return [...prices].sort((a, b) => {
    const catDiff =
      CATEGORY_ORDER.indexOf(categoryOf(a)) - CATEGORY_ORDER.indexOf(categoryOf(b));
    if (catDiff !== 0) return catDiff;
    const sizeDiff = sizeValue(a) - sizeValue(b);
    if (sizeDiff !== 0) return sizeDiff;
    return parseFloat(String(a.amount)) - parseFloat(String(b.amount));
  });
}

export function groupPrices(prices: Price[]): { category: PriceCategory; items: Price[] }[] {
  const sorted = sortPrices(prices);
  return CATEGORY_ORDER.map((category) => ({
    category,
    items: sorted.filter((p) => categoryOf(p) === category),
  })).filter((g) => g.items.length > 0);
}

// "Klassik-Paket · 10 Bilder" — used when the admin leaves the title empty
export function packageTitle(numberOfImages: number | string): string {
  return `Paket mit ${numberOfImages} Bildern`;
}

// typical photographer packages: X images included for a flat price, each
// additional image at a fixed rate
export const STANDARD_PACKAGES: {
  title: string;
  numberOfImages: number;
  totalPrice: string;
  singlePrice: string;
  description: string;
}[] = [
  { title: "Kennenlern-Paket", numberOfImages: 5, totalPrice: "59", singlePrice: "10",
    description: "5 Bilder deiner Wahl in voller Auflösung" },
  { title: "Klassik-Paket", numberOfImages: 10, totalPrice: "99", singlePrice: "8",
    description: "10 Bilder deiner Wahl in voller Auflösung" },
  { title: "Premium-Paket", numberOfImages: 25, totalPrice: "199", singlePrice: "6",
    description: "25 Bilder deiner Wahl in voller Auflösung" },
  { title: "Komplett-Paket", numberOfImages: 40, totalPrice: "279", singlePrice: "5",
    description: "40 Bilder deiner Wahl in voller Auflösung" },
];

// one-click starter catalog with typical German lab prices — everything stays
// editable afterwards
export const STANDARD_CATALOG: {
  category: PriceCategory;
  size: string;
  amount: number;
  isDownloadable: boolean;
  labSku?: string;
  description: string;
}[] = [
  { category: "digital", size: "", amount: 15, isDownloadable: true,
    description: "Bild in voller Auflösung als Download" },
  { category: "print", size: "10×15 cm", amount: 3.5, isDownloadable: false, labSku: "GLOBAL-PHO-4X6",
    description: "Klassischer Fotoabzug, glänzend oder matt" },
  { category: "print", size: "13×18 cm", amount: 5, isDownloadable: false,
    description: "Klassischer Fotoabzug, glänzend oder matt" },
  { category: "print", size: "15×20 cm", amount: 8, isDownloadable: false,
    description: "Klassischer Fotoabzug, glänzend oder matt" },
  { category: "print", size: "20×30 cm", amount: 12, isDownloadable: false,
    description: "Fotoabzug in Vergrößerung" },
  { category: "print", size: "30×45 cm", amount: 19, isDownloadable: false,
    description: "Fotoabzug in Vergrößerung" },
  { category: "canvas", size: "40×60 cm", amount: 79, isDownloadable: false,
    description: "Foto auf Leinwand, auf Keilrahmen gespannt" },
  { category: "canvas", size: "60×90 cm", amount: 119, isDownloadable: false,
    description: "Foto auf Leinwand, auf Keilrahmen gespannt" },
  { category: "poster", size: "50×75 cm", amount: 29, isDownloadable: false,
    description: "Posterdruck auf Premiumpapier" },
];

// Die kuratierte Prodigi-Auswahl ist der Teil des Startkatalogs, der eine
// Artikelnummer trägt — eine zweite Liste liefe nur auseinander.
export const LAB_PRODUCTS: { sku: string; label: string }[] = STANDARD_CATALOG
  .filter((e) => e.labSku)
  .map((e) => ({ sku: e.labSku!, label: priceTitle(e.category, e.size) }));
