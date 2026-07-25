# Derecho UBA - Plataforma de Estudio

## Instrucciones para configuración

### 1. Crear cuenta en Supabase
- Ir a https://supabase.com
- Crear nuevo proyecto "derecho-uba"
- Copiar:
  - **Project URL**: `https://czmqprvzjsqagpvmspag.supabase.co`
  - **anon key** (API Keys → Project API keys)
  - **service_role key** (API Keys → Project API keys → Copy service_role secret)

### 2. Crear bucket en Cloudflare R2
- Ir a https://dash.cloudflare.com
- Crear bucket `derecho-uba-audios`
- Hacerlo **Private**
- Copiar:
  - **Account ID**
  - **Access Key ID**
  - **Secret Access Key**
  - **Public URL** del bucket

### 3. Configurar variables de entorno
Crear archivo `.env.local` en la raíz del proyecto con:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

R2_ACCOUNT_ID=tu_account_id
R2_ACCESS_KEY_ID=tu_access_key
R2_SECRET_ACCESS_KEY=tu_secret_key
R2_BUCKET_NAME=derecho-uba-audios
R2_PUBLIC_URL=tu_r2_public_url
```

### 4. Ejecutar schema en Supabase
- Ir a https://supabase.com/dashboard/project/czmqprvzjsqagpvmspag/sql
- Pegar el contenido de `supabase-schema.sql`
- Ejecutar

### 5. Ejecutar el proyecto

```bash
npm run dev
```

El proyecto estará disponible en http://localhost:3000

### 6. Deploy en Vercel
- Crear cuenta en https://vercel.com
- Conectar el repositorio
- Agregar variables de entorno
- Deploy

## Estructura del proyecto

```
app/
├── page.tsx                    # Login con magic link
├── layout.tsx
├── dashboard/                  # Área de estudiantes
│   ├── page.tsx                # Lista de 3 materias
│   ├── [materia]/              # Lista de clases por materia
│   │   └── page.tsx
│   └── [materia]/[clase]/      # Detalle de clase (pendiente)
│       └── page.tsx
└── admin/                      # Panel de administración
    └── page.tsx

lib/
├── supabase.ts                 # Cliente Supabase
├── r2.ts                       # Cliente Cloudflare R2
└── utils.ts

components/
├── ui/
│   ├── GlassCard.tsx
│   └── Button.tsx
├── icons.tsx                   # Iconos SVG personalizados
├── AudioPlayer.tsx
├── YouTubeCard.tsx
├── TranscriptionViewer.tsx
├── MateriaCard.tsx
└── AdminUpload.tsx
```

## Características

- ✅ Dashboard con tema oscuro (Dark Glassmorphism)
- ✅ 3 materias: Contratos I, Contratos II, Derecho Comercial
- ✅ Sistema de login con magic link (Supabase Auth)
- ✅ Upload de audios desde PC
- ✅ Link externo para YouTube (cuenta como vista)
- ✅ Transcripciones: Google Drive o texto directo
- ✅ Analytics (reproducciones por archivo)
- ✅ Storage gratis en Cloudflare R2

## Próximos pasos

1. Completar la vista de detalle de clase (`[materia]/[clase]/page.tsx`)
2. Configurar variables de entorno
3. Ejecutar el schema en Supabase
4. Probar el upload de archivos
