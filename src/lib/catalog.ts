export type Category = "groceries" | "gifts" | "books" | "travel" | "software" | "home" | "electronics" | "wellness";
export const CATEGORIES: Record<Category, { label: string; glyph: string }> = {
  groceries: { label: "Groceries", glyph: "◐" },
  gifts: { label: "Gifts", glyph: "✦" },
  books: { label: "Books", glyph: "▤" },
  travel: { label: "Travel", glyph: "➶" },
  software: { label: "Software", glyph: "⌘" },
  home: { label: "Home", glyph: "⌂" },
  electronics: { label: "Electronics", glyph: "⚡" },
  wellness: { label: "Wellness", glyph: "❋" },
};
export type Item = { id: string; name: string; merchant: string; category: Category; price: number; tags: string[]; blurb: string };
// A fictional sandbox marketplace. Prices are in the leash currency.
export const CATALOG: Item[] = [
  { id: "g1", name: "Weekly produce box", merchant: "Greenrow Market", category: "groceries", price: 32, tags: ["vegetables", "fruit", "fresh", "weekly", "healthy"], blurb: "Seasonal veg and fruit for two." },
  { id: "g2", name: "Oat milk, 6-pack", merchant: "Greenrow Market", category: "groceries", price: 14.5, tags: ["milk", "oat", "dairy-free", "coffee"], blurb: "Barista blend." },
  { id: "g3", name: "Single-origin coffee beans 500g", merchant: "Kettle & Crow", category: "groceries", price: 18, tags: ["coffee", "beans", "morning"], blurb: "Washed Ethiopian, light roast." },
  { id: "g4", name: "Pantry restock bundle", merchant: "Greenrow Market", category: "groceries", price: 46, tags: ["pasta", "rice", "olive oil", "pantry", "staples"], blurb: "Pasta, rice, oil, tinned tomatoes." },
  { id: "g5", name: "Birthday cake (serves 8)", merchant: "Crumb Theory", category: "groceries", price: 38, tags: ["cake", "birthday", "party", "dessert"], blurb: "Chocolate or lemon, same-day." },
  { id: "f1", name: "Hand-thrown ceramic mug", merchant: "Slow Clay Studio", category: "gifts", price: 29, tags: ["pottery", "ceramic", "mug", "handmade", "gift"], blurb: "Speckled glaze, 350ml." },
  { id: "f2", name: "Beginner pottery class voucher", merchant: "Slow Clay Studio", category: "gifts", price: 55, tags: ["pottery", "class", "experience", "gift", "craft"], blurb: "Two-hour wheel session." },
  { id: "f3", name: "Pressed-flower notebook", merchant: "Paper Fern", category: "gifts", price: 17, tags: ["stationery", "notebook", "journal", "gift", "flowers"], blurb: "A5, dot grid." },
  { id: "f4", name: "Scented candle trio", merchant: "Wick & Moor", category: "gifts", price: 34, tags: ["candle", "home", "gift", "cosy"], blurb: "Fig, cedar, sea salt." },
  { id: "f5", name: "Fresh flower bouquet", merchant: "Petal Post", category: "gifts", price: 42, tags: ["flowers", "bouquet", "anniversary", "birthday", "gift"], blurb: "Delivered tomorrow." },
  { id: "f6", name: "Board game: Tidewater", merchant: "Meeple Yard", category: "gifts", price: 39, tags: ["board game", "games", "family", "gift", "party"], blurb: "2–5 players, 45 min." },
  { id: "b1", name: "The Overstory (paperback)", merchant: "Ledger Books", category: "books", price: 16, tags: ["novel", "fiction", "trees", "book"], blurb: "Pulitzer-winning novel." },
  { id: "b2", name: "Atomic Habits (hardcover)", merchant: "Ledger Books", category: "books", price: 22, tags: ["habits", "self-help", "productivity", "book"], blurb: "Small changes, big results." },
  { id: "b3", name: "Ceramics for beginners", merchant: "Ledger Books", category: "books", price: 24, tags: ["pottery", "ceramic", "craft", "book", "how-to"], blurb: "Illustrated guide." },
  { id: "b4", name: "Audiobook credit", merchant: "Murmur Audio", category: "books", price: 12, tags: ["audiobook", "listening", "commute"], blurb: "One title, keep forever." },
  { id: "t1", name: "Airport train ticket", merchant: "Railway Direct", category: "travel", price: 19, tags: ["train", "airport", "transport", "ticket"], blurb: "Flexible, valid 30 days." },
  { id: "t2", name: "Airport lounge day pass", merchant: "Gateway Lounges", category: "travel", price: 45, tags: ["lounge", "airport", "flight", "layover"], blurb: "3 hours, food included." },
  { id: "t3", name: "eSIM 10GB, 30 days", merchant: "Roamly", category: "travel", price: 21, tags: ["esim", "data", "roaming", "travel", "phone"], blurb: "Works in 120+ countries." },
  { id: "t4", name: "City museum pass (48h)", merchant: "CityPass Co", category: "travel", price: 64, tags: ["museum", "sightseeing", "city", "weekend"], blurb: "Skip-the-line at 12 museums." },
  { id: "t5", name: "Hotel night, boutique", merchant: "Nightingale Stays", category: "travel", price: 139, tags: ["hotel", "stay", "weekend", "night"], blurb: "Free cancellation." },
  { id: "s1", name: "Password manager, 1 year", merchant: "Vaultly", category: "software", price: 36, tags: ["security", "passwords", "software", "subscription"], blurb: "Family plan, 6 seats." },
  { id: "s2", name: "Cloud storage 200GB, 1 year", merchant: "Driftbox", category: "software", price: 30, tags: ["storage", "backup", "photos", "subscription"], blurb: "Photo backup included." },
  { id: "s3", name: "Language app, 3 months", merchant: "Parla", category: "software", price: 27, tags: ["language", "learning", "spanish", "french", "app"], blurb: "Speaking drills with AI." },
  { id: "s4", name: "VPN, 6 months", merchant: "Tunnelwise", category: "software", price: 33, tags: ["vpn", "privacy", "travel", "security"], blurb: "No-logs, 60 countries." },
  { id: "h1", name: "Replacement water filter (3)", merchant: "Clearline Home", category: "home", price: 26, tags: ["filter", "water", "kitchen", "refill"], blurb: "Fits most jugs." },
  { id: "h2", name: "Laundry pods, 60", merchant: "Clearline Home", category: "home", price: 19, tags: ["laundry", "cleaning", "refill", "household"], blurb: "Eco, unscented." },
  { id: "h3", name: "LED bulbs, warm (4)", merchant: "Lumen Lane", category: "home", price: 15, tags: ["bulbs", "light", "lamp", "household"], blurb: "E27, 2700K." },
  { id: "h4", name: "Houseplant: Monstera", merchant: "Petal Post", category: "home", price: 31, tags: ["plant", "green", "decor", "gift"], blurb: "40cm, ceramic pot." },
  { id: "e1", name: "USB-C charger 65W", merchant: "Voltyard", category: "electronics", price: 35, tags: ["charger", "usb-c", "laptop", "phone"], blurb: "GaN, two ports." },
  { id: "e2", name: "Wireless earbuds", merchant: "Voltyard", category: "electronics", price: 79, tags: ["earbuds", "audio", "music", "headphones"], blurb: "ANC, 24h battery." },
  { id: "e3", name: "Phone case, recycled", merchant: "Voltyard", category: "electronics", price: 22, tags: ["phone", "case", "protection"], blurb: "Drop tested 2m." },
  { id: "e4", name: "Mechanical keyboard", merchant: "Keyhaus", category: "electronics", price: 119, tags: ["keyboard", "desk", "work", "typing"], blurb: "Hot-swap, tactile." },
  { id: "w1", name: "Vitamin D3, 90 days", merchant: "Sunday Apothecary", category: "wellness", price: 13, tags: ["vitamin", "supplement", "health", "winter"], blurb: "1000 IU softgels." },
  { id: "w2", name: "Yoga class 5-pack", merchant: "Still Point Studio", category: "wellness", price: 60, tags: ["yoga", "fitness", "class", "stretch"], blurb: "Any studio, 3 months." },
  { id: "w3", name: "Sleep mask + earplugs", merchant: "Sunday Apothecary", category: "wellness", price: 18, tags: ["sleep", "travel", "rest", "flight"], blurb: "Contoured silk." },
  { id: "w4", name: "Running socks (3 pairs)", merchant: "Stride Supply", category: "wellness", price: 24, tags: ["running", "socks", "fitness"], blurb: "Blister-free merino." },
];
export const MERCHANTS = Array.from(new Set(CATALOG.map((i) => i.merchant))).sort();
export const byId = (id: string) => CATALOG.find((i) => i.id === id);

export const CURRENCIES = { USD: "$", EUR: "€", GBP: "£", CAD: "C$", AUD: "A$", SGD: "S$" } as const;
export type Currency = keyof typeof CURRENCIES;
export const money = (n: number, c: Currency) => new Intl.NumberFormat("en", { style: "currency", currency: c }).format(n);

export function search(q: string, limit = 14): Item[] {
  const words = q.toLowerCase().split(/[^a-z0-9-]+/).filter((w) => w.length > 2);
  const scored = CATALOG.map((i) => {
    const hay = `${i.name} ${i.tags.join(" ")} ${i.category} ${i.blurb} ${i.merchant}`.toLowerCase();
    const s = words.reduce((a, w) => a + (hay.includes(w) ? (i.tags.some((t) => t.includes(w)) ? 3 : 1) : 0), 0);
    return { i, s };
  }).sort((a, b) => b.s - a.s);
  const hits = scored.filter((x) => x.s > 0).map((x) => x.i);
  return (hits.length ? hits : CATALOG).slice(0, limit);
}
