/* =========================================================================
   DANE WYJAZDU (strona informacyjna) — edytujesz tu wszystko.
   Kwoty w zł. Kurs EUR ustawiasz w TRIP.eurRate.
   ========================================================================= */

const TRIP = {
  title: "SPLIT",
  country: "Chorwacja 🇭🇷",
  dates: "30.07 – 02.08.2026",
  datesLong: "czw. 30.07 → nd. 02.08.2026 • 3 noce",
  eurRate: 4.30, // przelicznik EUR→zł (do minibusa)
};

/* Uczestnicy: 8 płacących + Pan Młody (nie płaci, ale leci).
   paid = wpłacona zaliczka w zł. */
const PARTICIPANTS = [
  { name: "Dawid Gajdosz",    pays: false, tag: "Pan Młody 🤵", paid: 0 },
  { name: "Mateusz Durczok",  pays: true,  tag: "świadek / organizator", paid: 1050 },
  { name: "Adam Jeleń",       pays: true,  paid: 1050 },
  { name: "Kamil Zerzoń",     pays: true,  paid: 1050 },
  { name: "Krzysztof Ziętek", pays: true,  paid: 1050 },
  { name: "Patryk Neuman",    pays: true,  paid: 1050 },
  { name: "Andrzej Nawrot",   pays: true,  paid: 1000 },
  { name: "Damian Durczok",   pays: true,  paid: 1000 },
  { name: "Dawid Drąszcz",    pays: true,  paid: 0, note: "da jutro" },
];

/* Koszty stałe (wspólne) — to składa się na „udział na osobę". */
const COSTS = {
  flightTotal: 5452,        // Wizz Air razem
  apartmentTotal: 5897.41,  // domek Airbnb razem
  minibusEUR: 230,          // prywatny minibus dla ekipy (lotnisko ⇄ domek)
};

/* Płatności / terminy do wyróżnienia */
const PAYMENTS = {
  apartmentPaid: 3414,          // zapłacone za domek "dziś"
  apartmentDue: 2482,           // do dopłaty za domek
  apartmentDueDate: "15.07.2026",
};

/* Lot — Wizz Air */
const FLIGHT = {
  airline: "Wizz Air",
  out:  { no: "W6 1267", from: "Katowice (KTW)", to: "Split (SPU)", dep: "30.07.2026 20:35", arr: "30.07.2026 22:15" },
  back: { no: "W6 1268", from: "Split (SPU)", to: "Katowice (KTW)", dep: "02.08.2026 22:45", arr: "03.08.2026 00:30" },
  total: 5452,
  bookings: [
    { code: "DIZEFI", amount: 628,  who: "Krzysztof" },
    { code: "PGU9PB", amount: 2312, who: "Mateusz, Adam, Damian, Andrzej" },
    { code: "ZSW6GK", amount: 2512, who: "Dawid (P.M.), Dawid Drąszcz, Patryk, Kamil" },
  ],
};

/* Domek — Airbnb */
const APARTMENT = {
  name: "Domek z jacuzzi 🛁 (Airbnb)",
  area: "Okolice Stobreč / Krilo — na południe od Splitu, przy morzu",
  link: "https://www.airbnb.pl/rooms/6026054",
  mapLink: "https://www.airbnb.pl/rooms/6026054/location",
  mapImage: "assets/domek-mapa.png",
  images: [
    "https://a0.muscache.com/im/pictures/51b68bc0-020e-4397-92c0-b66659b7ac57.jpg?im_w=1200",
    "https://a0.muscache.com/im/pictures/9c27a247-728b-4398-99bd-ab3c92a05c68.jpg?im_w=1200",
    "https://a0.muscache.com/im/pictures/f3d45756-7188-4e6c-84c7-20cc88c39e3e.jpg?im_w=1200",
    "https://a0.muscache.com/im/pictures/ad4c1c5b-a9c4-490c-9a42-fc4ea980cb26.jpg?im_w=1200",
    "https://a0.muscache.com/im/pictures/f8655bbf-6819-4bc5-9c46-12e645336dba.jpg?im_w=1200",
    "https://a0.muscache.com/im/pictures/c6b729d6-73bf-45a9-9725-710fa0eb0833.jpg?im_w=1200",
  ],
  checkin: "czw., 30 lip • po 16:00",
  checkout: "niedz., 2 sie • przed 10:00",
  selfCheckin: "Samodzielne zameldowanie ze skrytki 🔑",
  maxGuests: 10,
  rules: [
    "👥 Maksymalnie 10 gości",
    "🚭 Zakaz palenia",
    "🐾 Zakaz zwierząt",
    "🎉 Zakaz organizowania imprez",
    "🔇 Cisza po 22:00 (no noise after 10 p.m.)",
  ],
  before: [
    "🗑️ Wyrzuć śmieci — zielone kubły na końcu ulicy",
    "🔌 Wyłącz urządzenia — ale NIGDY nie wyłączaj jacuzzi 🛁",
    "🔒 Zamknij główne wejście na klucz",
    "🔑 Zostaw klucze na stole",
  ],
};

/* Co jeszcze dochodzi (płatne osobno / na miejscu) */
const EXTRAS = [
  "🍺 Alkohol",
  "🍽️ Jedzenie",
  "🎉 Imprezy / atrakcje",
  "🚗 Dojazd do lotniska w Katowicach",
];
