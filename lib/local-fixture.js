/** Sample leaderboard payload for local dev (MOCK_LEADERBOARD=1). */
export default {
  generatedAt: "2026-05-27T12:00:00.000Z",
  pagination: {
    totalPages: 1,
    pagesFetched: 1,
    truncated: false,
    maxPages: 200,
    perPage: 100,
    subscriberCap: 20000,
  },
  totals: {
    activeSubscribers: 1482,
    companies: 12,
    attributedReaders: 1133,
    personalEmailReaders: 349,
  },
  companies: [
    { company: "Döhler", count: 42, domains: ["doehler.com", "doehler.com.br"], logoDomain: "doehler.com" },
    { company: "IFF", count: 38, domains: ["iff.com"], logoDomain: "iff.com" },
    { company: "Givaudan", count: 31, domains: ["givaudan.com"], logoDomain: "givaudan.com" },
    { company: "Symrise", count: 28, domains: ["symrise.com"], logoDomain: "symrise.com" },
    { company: "Kerry", count: 24, domains: ["kerry.com"], logoDomain: "kerry.com" },
    { company: "Citrosuco", count: 19, domains: ["citrosuco.com.br"], logoDomain: "citrosuco.com.br" },
    { company: "Cutrale", count: 17, domains: ["cutrale.com"], logoDomain: "cutrale.com" },
    { company: "Tropicana", count: 15, domains: ["tropicana.com"], logoDomain: "tropicana.com" },
    { company: "PepsiCo", count: 12, domains: ["pepsico.com"], logoDomain: "pepsico.com" },
    { company: "Tetra Pak", count: 9, domains: ["tetrapak.com"], logoDomain: "tetrapak.com" },
    { company: "Fritz-Kola", count: 6, domains: ["fritz-kola.com"], logoDomain: "fritz-kola.com" },
    { company: "Spindrift", count: 4, domains: ["drinkspindrift.com"], logoDomain: "drinkspindrift.com" },
  ],
};
