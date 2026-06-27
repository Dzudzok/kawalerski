/* =========================================================================
   DANE OFERTY — TO JEST JEDYNY PLIK, KTÓRY EDYTUJESZ, ŻEBY ZMIENIĆ TREŚĆ.
   - Każdy koszt to kwota NA OSOBĘ w zł (ile kosztuje 1 uczestnika).
   - Strona sama policzy: sumę na osobę ORAZ Twoją realną cenę z uwzględnieniem,
     że Pan Młody nie płaci (jego część dzielona jest na płacących).
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

// --- Opcje wyjazdu ---
// costs: lista pozycji { label, amount (zł/os), note?, link? }
// images: lista URL do podglądu (np. zdjęcia apartamentu)
// highlights: punkty "co w cenie / atrakcje"
const OPTIONS = [
  {
    id: "split",
    title: "Opcja 1 — SPLIT 🇭🇷",
    subtitle: "Chorwacja • cały dom z basenem dla nas",
    bookingLink: "https://www.booking.com/Share-DxPR8Qw",
    images: [
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/314734365.jpg?k=5e054f689ce1eb9cf5db4d67c1cdc81ad7ea55d3d3d441fa0af8f91c1fa54516&o=",
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/160955094.jpg?k=1e94dfdc07a297205a5b5ef1e55f8f4c9f6828f6ac44dd53144c327195f39afd&o=",
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/268952689.jpg?k=fa0becb25c83a45d1fb9dfd0855ce016d46d2b9cba05276252e8e087b5714c11&o=",
    ],
    flight: "✈️ Katowice 20:35 → Split 22:15  |  powrót: Split 22:45 → Katowice 00:30",
    costs: [
      { label: "Samolot (tam i z powrotem)", amount: 540 },
      { label: "Apartament / dom z basenem",  amount: 526, note: "5 789 zł za 11 os • do centrum Uberem" },
      { label: "Wejścia na imprezy",          amount: 100, note: "ok. 100 zł wejście" },
      { label: "Uber: dom – lotnisko – hotel", amount: 75 },
      { label: "Jedzenie (pt–sb–nd)",         amount: 250, note: "SZACUNEK – grill, śniadania grupowe, sob. restauracja każdy za siebie" },
    ],
    highlights: [
      "Cały dom z basenem tylko dla nas 🏊",
      "Grill dla 11 os + wspólne śniadania",
      "Plaża • Morze • Imprezy • Centrum Splitu",
      "Opcjonalnie: łódź na morzu (4h)",
      "Sobota: wyjście do restauracji (każdy za siebie)",
    ],
  },

  {
    id: "dubrovnik",
    title: "Opcja 2 — DUBROVNIK 🇭🇷",
    subtitle: "Chorwacja",
    bookingLink: "", // TODO: wklej link
    images: [], // TODO: wklej linki do zdjęć
    flight: "✈️ TODO: godziny lotu",
    costs: [
      { label: "Samolot (tam i z powrotem)", amount: 301 },
      // TODO: dodaj apartament, jedzenie, transport, imprezy ...
    ],
    highlights: [
      "TODO: uzupełnij atrakcje i co w cenie",
    ],
  },

  {
    id: "opcja3",
    title: "Opcja 3 — ??? ",
    subtitle: "TODO: nazwa / lokalizacja",
    bookingLink: "",
    images: [],
    flight: "",
    costs: [
      // TODO: dodaj pozycje kosztów { label, amount }
    ],
    highlights: [
      "TODO: uzupełnij",
    ],
  },
];

const BUDGET_TARGET = 2000; // zł / os
