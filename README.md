# Derecho UBA - Plataforma de Estudio

Portal de cursada para la carrera de Derecho de la UBA: clases, transcripciones, podcasts, archivos y enlaces de cada materia, con panel de administración y analytics.

## Stack

- **Next.js 15** (App Router) + **Tailwind CSS v4** + TypeScript
- **Supabase** (Postgres + RLS)
- **Cloudflare R2** (storage de audios)
- Deploy en **Vercel**

## Configuración

### 1. Variables de entorno (`.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=tu_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

R2_ACCOUNT_ID=tu_account_id
R2_ACCESS_KEY_ID=tu_access_key
R2_SECRET_ACCESS_KEY=tu_secret_key
R2_BUCKET_NAME=derecho-uba-audios
R2_PUBLIC_URL=tu_r2_public_url

ADMIN_PASSWORD=tu_password_admin
ADMIN_NOMBRE=tu_nombre_de_admin   # Server-only: excluye al admin de las estadísticas
NEXT_PUBLIC_ADMIN_NOMBRE=tu_nombre_de_admin  # Cliente: mismo valor para el filtro en tracking
```

### 2. Base de datos

Ejecutar en Supabase SQL Editor:

1. `supabase-schema.sql` — tablas `materias`, `clases`, `archivos`, `reproducciones`
2. `analytics-schema.sql` — tabla `actividad` + vistas de analytics
3. `migrations/*.sql` — migraciones adicionales según necesidad

### 3. Desarrollar

```bash
npm run dev
```

Disponible en http://localhost:3000

### 4. Deploy en Vercel

Conectar el repo, configurar las mismas variables de entorno y deploy.

## Estructura

```
src/app/
├── page.tsx                         # Home / "Mis materias"
├── dashboard/
│   ├── page.tsx                     # Redirige a /
│   ├── [materia]/page.tsx           # Detalle de materia (clases + filtros)
│   └── [materia]/clase/[numero]/    # Detalle de clase (player, offline, transcripción)
├── admin/page.tsx                   # Panel de administración (password)
└── api/
    ├── admin/*                      # Gestión de contenido (protegido con cookie de sesión)
    ├── upload*                      # Upload chunked a R2 (protegido)
    ├── materias/*                   # Lectura pública de materias/clases
    ├── analytics/                   # Incremento de play_count
    ├── track/                       # Log de actividad
    └── stream/[archivoId]           # Streaming de audio desde R2

src/lib/
├── auth.ts                          # Sesión admin (cookie HTTP-only firmada)
├── supabase.ts                      # Clientes Supabase (anon + service role)
├── r2.ts                            # Cliente Cloudflare R2
├── tracking.ts                      # Tracking de actividad (excluye admin)
└── utils.ts

src/components/
├── PortalHeader.tsx                 # Header con acceso a admin cuando hay sesión
├── PortalFooter.tsx
├── AdminUpload.tsx                  # Formulario de subida de contenido
├── AdminManage.tsx                  # Edición/borrado de contenido
├── AdminShortcut.tsx                # Atajo Ctrl/Cmd+Shift+A a /admin
└── icons.tsx
```

## Características

- ✅ Home con grilla de materias (estado: En curso / Finalizada)
- ✅ Detalle de materia con filtros por tipo de contenido (audios, transcripciones, podcasts, archivos, enlaces)
- ✅ Detalle de clase con reproductor de audio, velocidad, resume, offline y transcripción
- ✅ Panel admin: upload, edición, borrado, nota por archivo, estado de materia
- ✅ Analytics: reproducciones, visitas, contenido popular, actividad reciente
- ✅ Sesión admin por cookie HTTP-only firmada (sin contraseña hardcodeada)
- ✅ Los admin no incrementan contadores al navegar

## Seguridad

- Todos los endpoints de escritura (`/api/admin*`, `/api/upload*`, `/api/debug*`) verifican la cookie de sesión admin.
- RLS: solo lectura pública; las escrituras van por API con `service_role` (bypasea RLS). No hay políticas de escritura abiertas al anon key.
- La contraseña admin se lee de `ADMIN_PASSWORD` (sin fallback en código).
