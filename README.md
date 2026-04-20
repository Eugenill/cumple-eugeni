# 30 anys d'Eugeni

Un àlbum col·lectiu — webapp per al 30è aniversari de l'Eugeni. Amics i
família poden pujar fotos i vídeos de moments, amb data, nom i persones
que hi surten. Després de cada pujada es mostra una línia del temps i
una xarxa amb les persones que hi apareixen.

- **Frontend:** Next.js 14 (App Router) + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Storage)
- **Auth:** contrasenya compartida (cookie HTTP-only)
- **Idioma:** Català
- **Deploy recomanat:** Vercel (gratuït)

---

## 1. Preparar Supabase (gratuït)

1. Crea un compte a [supabase.com](https://supabase.com) i un nou projecte
   (pla *Free* — 500 MB DB + 1 GB Storage).
2. A **SQL Editor**, executa tot el contingut de
   [`supabase/schema.sql`](./supabase/schema.sql).
3. A **Storage**, crea un bucket anomenat `moments` i marca'l com a
   **Public**. Això permet que les fotos siguin visibles per qui entri al
   lloc amb la contrasenya.
4. A **Project Settings → API**, apunta:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY` *(mai al navegador)*

## 2. Executar en local

```bash
cp .env.local.example .env.local
# Omple les 4 variables amb els valors de Supabase i la contrasenya

npm install
npm run dev
```

Obre [http://localhost:3000](http://localhost:3000). Et demanarà la
contrasenya que has posat a `SITE_PASSWORD` (per defecte `eugeni30`).

## 3. Deploy gratuït a Vercel

1. Puja el repositori a GitHub.
2. A [vercel.com/new](https://vercel.com/new), importa el projecte.
3. A **Environment Variables**, afegeix:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SITE_PASSWORD` — contrasenya per als convidats
   - `ADMIN_PASSWORD` — contrasenya mestra (només per a tu)
   - `SUPABASE_BUCKET` *(opcional, per defecte `moments`)*
4. **Deploy**. En menys d'un minut tindràs una URL tipus
   `https://cumple-eugeni.vercel.app`.

> Alternatives gratuïtes: **Netlify**, **Cloudflare Pages** o
> **Railway** (amb plantilla de Next.js).

## 4. Estructura

```
Cumple Eugeni/
├── middleware.ts              # Protecció per contrasenya
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Layout + tipografia + fons
│   │   ├── globals.css        # Tailwind + estils propis
│   │   ├── page.tsx           # Portada (hero + stats + xarxa + línia del temps)
│   │   ├── login/page.tsx     # Formulari de contrasenya
│   │   ├── pujar/page.tsx     # Formulari de pujada
│   │   └── api/
│   │       ├── login/route.ts
│   │       ├── logout/route.ts
│   │       └── moments/route.ts   # Creació de moment + pujada a Storage
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Timeline.tsx
│   │   ├── MomentCard.tsx     # Cartó tipus Polaroid amb galeria
│   │   ├── PeopleGraph.tsx    # Xarxa amb react-force-graph-2d
│   │   └── UploadForm.tsx
│   └── lib/
│       ├── supabase/
│       │   ├── browser.ts
│       │   └── server.ts      # Clients admin (service_role) i public
│       └── utils.ts           # Formatació de dates en català, tipus
└── supabase/
    └── schema.sql             # Taules, RLS, vista agregada
```

## 5. Model de dades

- **`moments`** — un registre per cada record (títol, descripció, data, pujat_per)
- **`persones`** — nom únic per cada persona
- **`moment_persones`** — N a N entre moments i persones
- **`mitjans`** — fotos/vídeos lligats a un moment (path a Storage, tipus)
- **`vista_moments`** — vista agregada que retorna cada moment amb les
  seves persones i mitjans en una sola consulta

## 6. Com editar o esborrar un record

**Convidats:** Quan algú puja un record, rep un **enllaç privat** (ex:
`/record/abc123/editar?codi=xxxxx`). Aquest enllaç només funciona per al
record que acaba de pujar i li permet editar-lo o esborrar-lo quan vulgui.
Han de guardar-se l&apos;enllaç (WhatsApp a ells mateixos, marcadors, etc.).

**Administrador (tu):** Si fas login amb `ADMIN_PASSWORD` en comptes de
`SITE_PASSWORD`, a la capçalera apareix el botó **Admin** que et porta a
`/admin`, una pàgina amb tots els records i el botó **Gestionar** per a
cadascun. Pots editar i esborrar qualsevol, encara que el convidat hagi
perdut el seu enllaç privat.

## 7. Personalització ràpida

- **Paleta**: `tailwind.config.ts` → `colors.cream`, `colors.sepia`, `colors.accent`
- **Tipografies**: `src/app/globals.css` (per defecte Cormorant Garamond + Inter + Caveat)
- **Copy**: textos de la portada a `src/app/page.tsx` i `src/app/login/page.tsx`
- **Contrasenya**: variable `SITE_PASSWORD`

## 8. Idees per més endavant

- Reaccions (♥) i comentaris per record
- Filtre per persona o per any
- Exportar l'àlbum a PDF o a un vídeo final per al sopar del 30è
- Notificacions a Telegram quan algú puja un moment

---

Fet amb ♥ per celebrar 30 anys plens de moments.
