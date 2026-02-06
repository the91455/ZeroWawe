const adjectives = [
    "cilgin", "hizli", "sessiz", "parlak", "keskin", "derin", "gizli", "mavi", "atesli", "serin",
    "vahsi", "nazik", "uysal", "asi", "ozgur", "cesur", "korkusuz", "atilgan", "soguk", "sicak",
    "keskin", "yumusak", "hizli", "yavas", "parlak", "mat", "eski", "yeni", "buyuk", "kucuk",
    "uzun", "kisa", "genc", "yasli", "zengin", "fakir", "mutlu", "uzgun", "guclu", "zayif",
    "akilli", "saf", "temiz", "kirli", "guzel", "cirkin", "sicak", "soguk", "aydinlik", "karanlik",
    "kizgin", "sakin", "korkunc", "sevimli", "agir", "hafif", "yuksek", "alcak", "tatli", "aci",
    "taze", "bayat", "dolgun", "ince", "genis", "dar", "parlak", "solgun", "vahsi", "evcil",
    "hizli", "atik", "dingin", "coskulu", "derin", "yuzeyel", "parlak", "puslu", "berrak", "bulanlik"
];

const nouns = [
    "darbeli", "bulut", "dalga", "golge", "ruzgar", "kartal", "aslan", "kaplan", "yildiz", "gece",
    "gunes", "toprak", "deniz", "nehir", "dag", "vadi", "orman", "ates", "buz", "toz",
    "kurt", "ahin", "atmaca", "baykus", "marti", "yunus", "balina", "kopekbaligi", "kaplumbaga", "tavsan",
    "tilki", "ayi", "geyik", "zurafa", "fil", "aslan", "kaplan", "pars", "vaak", "porsuk",
    "simsek", "firtina", "hortum", "deprem", "volkan", "magma", "kristal", "elmas", "zumrut", "yakut",
    "safir", "obsidyen", "granit", "mermer", "kuvars", "kehribar", "gumus", "altin", "platin", "bakir",
    "demir", "celik", "titanyum", "kobalt", "nikel", "neon", "argon", "helyum", "hidrojen", "oksijen",
    "karbon", "silikon", "fosfor", "kükürt", "klor", "potasyum", "kalsiyum", "magnezyum", "sodyum", "lityum"
];

export const generateNickname = () => {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    // 6-character hex suffix for trillions of combinations
    const hex = Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    return `${adj}_${noun}_${hex}`;
};
