-- ===========================================================================
-- Supabase: tabela na głosy + uprawnienia.
-- Uruchom to w Supabase → SQL Editor → New query → Run.
-- ===========================================================================

create table if not exists public.kawalerski_votes (
  name        text primary key,           -- imię i nazwisko uczestnika (1 głos / osoba)
  option_id   text not null,              -- id opcji: 'split' | 'dubrovnik' | 'opcja3'
  updated_at  timestamptz not null default now()
);

-- Włącz Row Level Security
alter table public.kawalerski_votes enable row level security;

-- Pozwól wszystkim (anon) czytać i zapisywać głosy.
-- To prywatna ankieta dla znajomych — w pełni otwarte uprawnienia są tu OK.
drop policy if exists "anon read"   on public.kawalerski_votes;
drop policy if exists "anon insert" on public.kawalerski_votes;
drop policy if exists "anon update" on public.kawalerski_votes;

create policy "anon read"   on public.kawalerski_votes for select using (true);
create policy "anon insert" on public.kawalerski_votes for insert with check (true);
create policy "anon update" on public.kawalerski_votes for update using (true) with check (true);

-- (opcjonalnie) realtime — żeby wyniki odświeżały się na żywo
alter publication supabase_realtime add table public.kawalerski_votes;


-- ===========================================================================
-- CZAT GRUPOWY — uruchom też ten blok (jeśli już masz głosowanie, wystarczy ten kawałek).
-- ===========================================================================
create table if not exists public.kawalerski_chat (
  id          bigint generated always as identity primary key,
  name        text not null,             -- kto napisał
  text        text not null,             -- treść wiadomości
  created_at  timestamptz not null default now()
);

alter table public.kawalerski_chat enable row level security;

drop policy if exists "chat read"   on public.kawalerski_chat;
drop policy if exists "chat insert" on public.kawalerski_chat;
create policy "chat read"   on public.kawalerski_chat for select using (true);
create policy "chat insert" on public.kawalerski_chat for insert with check (true);

alter publication supabase_realtime add table public.kawalerski_chat;


-- ===========================================================================
-- WPŁATY (panel /admin) — kto ile wpłacił. Nadpisuje kwoty z data.js.
-- ===========================================================================
create table if not exists public.kawalerski_payments (
  name        text primary key,          -- imię i nazwisko uczestnika
  paid        numeric not null default 0,-- wpłacona kwota w zł
  updated_at  timestamptz not null default now()
);

alter table public.kawalerski_payments enable row level security;

drop policy if exists "pay read"   on public.kawalerski_payments;
drop policy if exists "pay insert" on public.kawalerski_payments;
drop policy if exists "pay update" on public.kawalerski_payments;
create policy "pay read"   on public.kawalerski_payments for select using (true);
create policy "pay insert" on public.kawalerski_payments for insert with check (true);
create policy "pay update" on public.kawalerski_payments for update using (true) with check (true);

alter publication supabase_realtime add table public.kawalerski_payments;
