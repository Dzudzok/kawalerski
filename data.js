/* =========================================================================
   DANE OFERTY — JEDYNY PLIK, KTÓRY EDYTUJESZ, ŻEBY ZMIENIĆ TREŚĆ.
   - Każdy koszt to kwota NA OSOBĘ w zł (ile kosztuje 1 uczestnika).
   - Strona sama policzy: sumę na osobę ORAZ Twoją realną cenę z uwzględnieniem,
     że Pan Młody nie płaci (jego część dzielona jest na płacących => ×11/10).
   ========================================================================= */

// --- Uczestnicy (11 osób) ---
// pays:false => ta osoba nie płaci, jej koszt rozkłada się na pozostałych.
const PARTICIPANTS = [
  { name: "Dawid Gajdosz",    pays: false, tag: "Pan Młody 🤵" },
  { name: "Mateusz Durczok",  pays: true,  tag: "świadek / organizator" },
  { name: "Damian Künzel",    pays: true },
  { name: "Dawid Drąszcz",    pays: true },
  { name: "Adam Jeleń",       pays: true },
  { name: "Kamil Zerzoń",     pays: true },
  { name: "Krzysztof Ziętek", pays: true },
  { name: "Andrzej Nawrot",   pays: true },
  { name: "Patryk Neuman",    pays: true },
  { name: "Damian Durczok",   pays: true },
  { name: "Artur Szkoła",     pays: true },
];

const BUDGET_TARGET = 2000; // zł / os
const TRIP_DATES = "Piątek – Niedziela (3 noce)"; // wyświetlane w nagłówku opcji

// --- Opcje wyjazdu ---
const OPTIONS = [
  {
    id: "split",
    emoji: "🏖️",
    title: "SPLIT",
    country: "Chorwacja 🇭🇷",
    subtitle: "Cały dom z basenem tylko dla nas",
    badges: ["📅 30.07 – 02.08.2026", "Ocena 7,6 / 10 (220 opinii)", "Lokalizacja 7,7", "3 noce • 11 osób"],
    place: "Apartament z balkonem z widokiem na morze",
    address: "Domovinskog Rata 129, Podstrana, Split",
    mapQuery: "Domovinskog Rata 129, Podstrana, Split, Croatia",
    mapImage: "assets/split-mapa.png",
    bookingLink: "https://www.booking.com/hotel/hr/vacation-rentals-croatia.pl.html?checkin=2026-07-30&checkout=2026-08-02&group_adults=11&group_children=0&no_rooms=2&dest_id=-96492&dest_type=city&sb_price_type=total&type=total#hotelTmpl",
    images: [
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/314734365.jpg?k=5e054f689ce1eb9cf5db4d67c1cdc81ad7ea55d3d3d441fa0af8f91c1fa54516&o=",
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/160955094.jpg?k=1e94dfdc07a297205a5b5ef1e55f8f4c9f6828f6ac44dd53144c327195f39afd&o=",
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/268952689.jpg?k=fa0becb25c83a45d1fb9dfd0855ce016d46d2b9cba05276252e8e087b5714c11&o=",
    ],
    flightThere: "Pt 20:35  Katowice ✈ 22:15  Split",
    flightBack: "Nd 22:45  Split ✈ 00:30  Katowice",
    costs: [
      { label: "Samolot (tam i z powrotem)", amount: 540, icon: "✈️" },
      { label: "Apartament / dom z basenem",  amount: 526, icon: "🏠", note: "5 789 zł za 11 os • do centrum Uberem" },
      { label: "Wejścia na imprezy",          amount: 100, icon: "🎉", note: "ok. 100 zł wejście" },
      { label: "Uber: dom – lotnisko – hotel", amount: 75,  icon: "🚕" },
      { label: "Jedzenie (pt–sb–nd)",          amount: 250, icon: "🍖", note: "SZACUNEK – grill, śniadania grupowe; sob. restauracja każdy za siebie" },
    ],
    nearby: [
      { name: "Pałac Dioklecjana", dist: "8 km" },
      { name: "Centrum Splitu / People's Square", dist: "8 km" },
      { name: "Kompleks archeologiczny w Solinie", dist: "6 km" },
      { name: "Split City Museum", dist: "8 km" },
    ],
    highlights: [
      "🏊 Cały dom z basenem tylko dla nas",
      "🍖 Grill dla 11 os + wspólne śniadania",
      "🏖️ Plaża • Morze • Imprezy",
      "🏛️ Centrum Splitu i Pałac Dioklecjana",
      "🚤 Opcjonalnie: łódź na morzu (4h)",
      "🍽️ Sobota: wyjście do restauracji (każdy za siebie)",
    ],
  },

  {
    id: "dubrovnik",
    emoji: "🌅",
    title: "DUBROVNIK",
    country: "Chorwacja 🇭🇷",
    subtitle: "Apartament w centrum (bez basenu)",
    badges: ["📅 31.07 – 02.08.2026", "🟠 Wylot w PIĄTEK (nie czw. jak Split)", "2 noce • 11 osób", "Apartament • bez basenu"],
    place: "Apartments Villa Dadić",
    address: "Dubrovnik, Chorwacja",
    mapQuery: "Apartments Villa Dadic, Dubrovnik, Croatia",
    bookingLink: "https://www.booking.com/hotel/hr/apartments-villa-dadic.pl.html?checkin=2026-07-31&checkout=2026-08-02&group_adults=11&group_children=0&no_rooms=2&dest_id=-79996&dest_type=city&sb_price_type=total&type=total#hotelTmpl",
    images: [
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/225631530.jpg?k=cba9138f133339bd77d33daef5ec93fda3b5484d033a8745d1bd87b488e8749a&o=",
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/333523341.jpg?k=c4aade682b304ca2d19c07b059b5091ed1af40710f6d821b82ecf0fdede5c475&o=",
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/546474378.jpg?k=fd0739624d73ede1fb98e228b5759cacf8eee5f7e1447c3d5ee788e113cf3fcd&o=",
    ],
    flightThere: "Pt 13:20  Katowice ✈ 15:05  Dubrovnik",
    flightBack: "Nd 21:05  Dubrovnik ✈ 22:50  Katowice",
    flightNote: "⚠️ Wylot w PIĄTEK — o 1 dzień krócej niż Split (2 noce zamiast 3)",
    costs: [
      { label: "Samolot (tam i z powrotem)", amount: 342, icon: "✈️" },
      { label: "Apartament w centrum",        amount: 540, icon: "🏠", note: "5 943 zł za 11 os • bez basenu" },
      { label: "Wejścia na imprezy",          amount: 100, icon: "🎉", note: "ok. 100 zł wejście" },
      { label: "Uber: dom – lotnisko – hotel", amount: 75,  icon: "🚕" },
      { label: "Jedzenie (pt wiecz.–sb–nd)",   amount: 220, icon: "🍽️", note: "SZACUNEK – śniadania grupowe; sob. restauracja każdy za siebie (bez grilla)" },
    ],
    nearby: [
      { name: "Stare Miasto Dubrovnik", dist: "centrum" },
      { name: "Plaża / Morze", dist: "blisko" },
    ],
    highlights: [
      "🌅 Apartament dla nas w centrum Dubrownika",
      "🏖️ Plaża • Morze • Imprezy",
      "🏛️ Stare Miasto Dubrovnik",
      "🍽️ Sobota: wyjście do restauracji (każdy za siebie)",
      "❌ Bez basenu • bez grilla",
      "📅 2 noce (krócej niż Split)",
    ],
  },

  {
    id: "opcja3",
    emoji: "❓",
    title: "OPCJA 3",
    country: "TODO",
    subtitle: "TODO: nazwa / lokalizacja",
    badges: [],
    place: "",
    address: "",
    mapQuery: "",
    bookingLink: "",
    images: [],
    flightThere: "",
    flightBack: "",
    costs: [],
    nearby: [],
    highlights: ["TODO: uzupełnij"],
  },
];
