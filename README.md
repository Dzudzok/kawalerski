# Kawalerski Dawida — strona z głosowaniem 🍺

Statyczna strona (GitHub Pages) + mała baza Supabase do zapamiętywania głosów.
3 opcje wyjazdu, pełne koszty na osobę, głosowanie, **większość wygrywa**.

## Co gdzie edytować
- **`data.js`** — CAŁA treść: uczestnicy + 3 opcje (koszty, zdjęcia, atrakcje). To jedyny plik z danymi.
- **`config.js`** — klucze Supabase (URL + anon key).
- reszta (`index.html`, `styles.css`, `app.js`) — kod, raczej nie ruszasz.

Każdy koszt w `data.js` to **kwota na 1 osobę**. Strona sama liczy:
- sumę bazową na osobę,
- **Twoją realną cenę** (Pan Młody nie płaci → jego część dzielona na płacących = ×11/10).

## Włączenie głosowania (Supabase) — ~5 min
1. Wejdź na https://supabase.com → załóż darmowy projekt.
2. Otwórz **SQL Editor → New query**, wklej zawartość `supabase-setup.sql`, kliknij **Run**.
3. Wejdź w **Project Settings → API** i skopiuj:
   - **Project URL** → wklej do `config.js` jako `SUPABASE_URL`
   - **anon public** key → wklej do `config.js` jako `SUPABASE_ANON_KEY`
4. Zapisz, wypchnij na GitHub. Gotowe — głosy są wspólne dla wszystkich.

> Dopóki `config.js` ma placeholdery, strona działa w **trybie podglądu**
> (głosy zapisują się tylko w Twojej przeglądarce — dobre do testów).

## Publikacja na GitHub Pages
Repo jest publiczne. W GitHub: **Settings → Pages → Source: Deploy from a branch →
Branch: `main` / `root` → Save**. Po chwili strona będzie pod:
`https://<user>.github.io/<repo>/`

## Uzupełnij brakujące dane
W `data.js` opcje 2 (Dubrovnik) i 3 mają `TODO` — dodaj koszty, zdjęcia i atrakcje
w tym samym formacie co Opcja 1 (Split).
