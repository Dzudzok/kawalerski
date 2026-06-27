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
