---
name: web-design
description: >
  Use when designing, redesigning, or creating the visual UI of any website or web app.
  Covers layout, color systems, typography, responsive design, accessibility, and
  visual hierarchy. Front-load triggers: "diseñar", "rediseñar", "UI", "layout",
  "color palette", "tipografía", "responsive", "landing page", "dashboard".
---

# Web Design Skill

## Flujo de trabajo

1. **Brief** — Entender propósito, audiencia, marca
2. **Sistema de colores** — Primario, secundario, acento, neutrales
3. **Tipografía** — Par de fuentes, escala (display/title/body/caption)
4. **Layout** — Grid, espaciado (sistema de 4px/8px), jerarquía
5. **Componentes** — Cards, botones, forms, nav
6. **Responsive** — Mobile-first, breakpoints
7. **Accesibilidad** — Contraste WCAG, aria, navegación por teclado

## Principios de diseño visual

- **Jerarquía**: Lo más importante = más grande y bold
- **Consistencia**: Reutilizar tokens, nunca hardcodear colores
- **Espaciado**: Múltiplos de 4px o 8px
- **Contraste**: Mínimo 4.5:1 para texto legible
- **Contención**: Menos es más, no sobrecargar la UI

## Sistema de diseño (Design Tokens)

Definir en CSS custom properties o theme config:

```css
:root {
  /* Colores */
  --color-primary: #B99A62;
  --color-bg: #0C0B09;
  --color-card: #171512;
  --color-text: #ECE9E1;
  --color-text-muted: #9C9689;
  --color-border: #2C2822;
  --color-border-soft: #211E1A;

  /* Tipografía */
  --font-heading: 'Fraunces', Georgia, serif;
  --font-body: 'Inter', -apple-system, sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;

  /* Escala de texto */
  --text-display: clamp(40px, 5vw, 62px);
  --text-title: clamp(24px, 3.2vw, 28px);
  --text-body: 15px;
  --text-caption: 11px;
  --text-micro: 10px;

  /* Espaciado */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;

  /* Border radius */
  --radius-sm: 8px;
  --radius-md: 10px;
  --radius-lg: 14px;

  /* Sombras */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.4);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.5);
}
```

## Responsive Design

```css
/* Mobile-first */
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 640px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 1024px) {
  .grid { grid-template-columns: repeat(3, 1fr); }
}
```

## Glassmorphism

```css
.glass {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
}
```

## Accesibilidad

- Contraste mínimo 4.5:1 para texto normal
- Contraste 3:1 para texto grande (18px+ bold o 24px+)
- Todos los elementos interactivos accesibles por teclado
- Labels explícitos en inputs
- `aria-label` en botones sin texto visible
- `role="button"` en elementos clickeables no nativos

## Ejemplo vivo: derecho-uba

- **Paleta**: bronce #B99A62, fondo oscuro #0C0B09, card #171512
- **Fuentes**: Fraunces (títulos), Inter (body), IBM Plex Mono (labels)
- **Cards**: border-radius 14px, glassmorphism, borde dorado izquierdo animado
- **Responsive**: mobile-first, 1 columna → 3 columnas
- **Labels**: IBM Plex Mono 9px, letter-spacing 0.14em, uppercase
