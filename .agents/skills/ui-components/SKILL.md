---
name: ui-components
description: >
  Use when creating, improving, or refactoring specific UI components: cards,
  buttons, modals, forms, tables, navbars, footers. Covers states, animations,
  glassmorphism, and framework integration. Triggers: "card", "button", "modal",
  "form", "component", "navbar", "footer", "tab", "spinner", "skeleton".
---

# UI Components Skill

## Estados de componentes

Todo componente necesita:
- **Default** — Estado normal
- **Hover** — Cursor encima
- **Active** — Clic presionado
- **Disabled** — No interactuable (opacity 0.5)
- **Loading** — Cargando (spinner o skeleton)
- **Error** — Estado de error (borde rojo, mensaje)

## Card Pattern

```css
.card {
  background: var(--color-card);
  border: 1px solid var(--color-border-soft);
  border-radius: 14px;
  padding: 24px;
  transition: background 0.25s ease, border-color 0.25s ease, transform 0.25s ease;
}

.card:hover {
  background: var(--color-card-hover);
  border-color: var(--color-border);
  transform: translateY(-3px);
}
```

### Borde lateral animado (left accent)

```css
.card-accent {
  position: relative;
}

.card-accent::before {
  content: "";
  position: absolute;
  top: 10px;    /* No llega a esquinas redondeadas */
  left: 0;
  bottom: 10px;
  width: 2px;
  background: var(--color-primary);
  transform: scaleY(0);
  transform-origin: top;
  transition: transform 0.3s ease;
}

.card-accent:hover::before {
  transform: scaleY(1);
}
```

## Button Pattern

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  cursor: pointer;
  font-family: var(--font-body);
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn:active { transform: scale(0.98); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Variantes */
.btn-primary {
  background: var(--color-primary);
  color: var(--color-bg);
  padding: 10px 20px;
  border-radius: 8px;
}

.btn-secondary {
  background: transparent;
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
  padding: 10px 20px;
  border-radius: 8px;
}

.btn-ghost {
  background: transparent;
  color: var(--color-text-muted);
  padding: 8px 12px;
}

/* Tamaños */
.btn-sm { height: 32px; font-size: 12px; }
.btn-md { height: 40px; font-size: 14px; }
.btn-lg { height: 48px; font-size: 16px; }
```

## Glassmorphism Component

```css
.glass {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
}
```

## Animaciones

### Card entrance
```css
@keyframes cardIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.card-reveal {
  animation: cardIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
}
```

### Skeleton loader
```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(90deg, var(--color-card) 25%, var(--color-card-hover) 50%, var(--color-card) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 14px;
}
```

### Spinner
```css
@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
```

## Labels y tags

```css
.label {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}
```

## Framework: React/Next.js

- **Inline styles** para valores dinámicos (colores de props, delays de animación)
- **CSS classes** para patrones reutilizables (card-reveal, glass, btn)
- **className** para utilidades Tailwind (flex, gap, items-center)
- **onMouseEnter/Leave** para estados hover con JS
- **style={{}}** para overrides puntuales

## Ejemplo vivo: derecho-uba

- **Cards**: `article { border-radius: 14px; }` global
- **Hover**: `.card-hover` con borde dorado izquierdo scaleY animation
- **Labels**: IBM Plex Mono 9px, letter-spacing 0.14em, uppercase
- **Títulos**: Fraunces, weight 400-500
- **Botones**: outline dorado, ghost para secundarios
- **Glassmorphism**: blur(12px), rgba(255,255,255,0.03)
- **Skeletons**: shimmer gradient con border-radius 14px
