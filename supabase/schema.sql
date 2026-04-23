-- =========================================================
-- Esquema de base de dades per a "Cumple Eugeni"
-- Executa aquest fitxer al SQL editor de Supabase
-- =========================================================

-- Extensions
create extension if not exists "pgcrypto";

-- =========================================================
-- Taula: persones (qui apareix als moments)
-- =========================================================
create table if not exists public.persones (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  creat_el timestamptz not null default now()
);

-- =========================================================
-- Taula: moments (cada record carregat)
-- =========================================================
create table if not exists public.moments (
  id uuid primary key default gen_random_uuid(),
  titol text not null,
  descripcio text,
  data_moment date not null,
  pujat_per text,
  edit_token uuid not null default gen_random_uuid(),
  creat_el timestamptz not null default now()
);

-- Afegeix edit_token si la taula ja existia sense aquesta columna
alter table public.moments
  add column if not exists edit_token uuid not null default gen_random_uuid();

create index if not exists moments_data_idx on public.moments (data_moment desc);

-- =========================================================
-- Taula: mitjans (fotos i vídeos lligats a un moment)
-- =========================================================
create table if not exists public.mitjans (
  id uuid primary key default gen_random_uuid(),
  moment_id uuid not null references public.moments(id) on delete cascade,
  path text not null,           -- ruta dins del bucket de Storage
  tipus text not null default 'imatge' check (tipus in ('imatge')),
  ordre int not null default 0,
  creat_el timestamptz not null default now()
);

create index if not exists mitjans_moment_idx on public.mitjans (moment_id);

-- =========================================================
-- Taula pivot: moment_persones (N a N)
-- =========================================================
create table if not exists public.moment_persones (
  moment_id uuid not null references public.moments(id) on delete cascade,
  persona_id uuid not null references public.persones(id) on delete cascade,
  primary key (moment_id, persona_id)
);

create index if not exists moment_persones_persona_idx on public.moment_persones (persona_id);

-- =========================================================
-- Taula: reaccions (emojis que la gent deixa a un moment)
-- Una persona (per nom) pot posar cada emoji un sol cop
-- per moment. Es fa servir `lower(persona_nom)` per ser
-- insensible a majúscules.
-- =========================================================
create table if not exists public.reaccions (
  id uuid primary key default gen_random_uuid(),
  moment_id uuid not null references public.moments(id) on delete cascade,
  persona_nom text not null,
  emoji text not null,
  creat_el timestamptz not null default now()
);

create unique index if not exists reaccions_unique_idx
  on public.reaccions (moment_id, lower(persona_nom), emoji);

create index if not exists reaccions_moment_idx on public.reaccions (moment_id);

-- =========================================================
-- Row Level Security
-- L'app fa les escriptures amb la service_role (server-side)
-- i les lectures amb la anon key, així que:
--   - Permetem SELECT a tothom
--   - Bloquegem INSERT/UPDATE/DELETE amb anon
-- =========================================================
alter table public.persones enable row level security;
alter table public.moments enable row level security;
alter table public.mitjans enable row level security;
alter table public.moment_persones enable row level security;
alter table public.reaccions enable row level security;

drop policy if exists "llegir persones" on public.persones;
drop policy if exists "llegir moments" on public.moments;
drop policy if exists "llegir mitjans" on public.mitjans;
drop policy if exists "llegir moment_persones" on public.moment_persones;
drop policy if exists "llegir reaccions" on public.reaccions;

create policy "llegir persones" on public.persones for select using (true);
create policy "llegir moments" on public.moments for select using (true);
create policy "llegir mitjans" on public.mitjans for select using (true);
create policy "llegir moment_persones" on public.moment_persones for select using (true);
create policy "llegir reaccions" on public.reaccions for select using (true);

-- =========================================================
-- Vista pràctica: moments amb persones i mitjans agregats
-- =========================================================
create or replace view public.vista_moments as
select
  m.id,
  m.titol,
  m.descripcio,
  m.data_moment,
  m.pujat_per,
  m.creat_el,
  coalesce(
    (select json_agg(json_build_object('id', p.id, 'nom', p.nom) order by p.nom)
     from public.moment_persones mp
     join public.persones p on p.id = mp.persona_id
     where mp.moment_id = m.id), '[]'::json
  ) as persones,
  coalesce(
    (select json_agg(json_build_object('id', mi.id, 'path', mi.path, 'tipus', mi.tipus) order by mi.ordre)
     from public.mitjans mi
     where mi.moment_id = m.id), '[]'::json
  ) as mitjans,
  coalesce(
    (select json_agg(json_build_object('emoji', re.emoji, 'persona_nom', re.persona_nom) order by re.creat_el)
     from public.reaccions re
     where re.moment_id = m.id), '[]'::json
  ) as reaccions
from public.moments m;

-- =========================================================
-- Storage: crea el bucket 'moments' manualment al dashboard
-- o executa aquesta comanda un cop amb privilegis:
--   insert into storage.buckets (id, name, public) values ('moments', 'moments', true);
-- Política de lectura pública:
--   create policy "llegir mitjans public" on storage.objects
--   for select using (bucket_id = 'moments');
-- =========================================================
