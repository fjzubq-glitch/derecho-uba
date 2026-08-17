import React from "react";

interface InkStampProps {
  size: number;
  titulo: string;
  subtitulo: string;
  children?: React.ReactNode;
  color?: string;
  rotate?: number;
  className?: string;
  style?: React.CSSProperties;
}

/** Sello de tinta tipo expediente: anillos, leyenda circular y contenido central. */
export default function InkStamp({
  size,
  titulo,
  subtitulo,
  children,
  color = "var(--color-stamp)",
  rotate = -8,
  className,
  style,
}: InkStampProps) {
  const uid = React.useId().replace(/:/g, "s");
  const topPath = "M 15 50 A 35 35 0 0 1 85 50";
  const bottomPath = "M 85 50 A 35 35 0 0 1 15 50";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={{ transform: `rotate(${rotate}deg)`, ...style }}
      aria-hidden
    >
      <defs>
        <filter id={`${uid}-tinta`} x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={7} result="ruido" />
          <feDisplacementMap in="SourceGraphic" in2="ruido" scale="2.1" />
        </filter>
        <path id={`${uid}-arco-top`} d={topPath} />
        <path id={`${uid}-arco-bottom`} d={bottomPath} />
      </defs>

      <g filter={`url(#${uid}-tinta)`} fill="none" stroke={color} opacity="0.92">
        {/* Anillo exterior + anillo punteado interior */}
        <circle cx="50" cy="50" r="41.5" strokeWidth="2" />
        <circle cx="50" cy="50" r="37.5" strokeWidth="1" strokeDasharray="1.5 4" opacity="0.85" />

        {/* Leyenda circular */}
        <text
          fontFamily="var(--font-ibm-plex-mono), monospace"
          fontSize="7.4"
          fontWeight="500"
          letterSpacing="1.2"
          fill={color}
          stroke="none"
        >
          <textPath href={`#${uid}-arco-top`} startOffset="50%" textAnchor="middle">
            {titulo}
          </textPath>
          <textPath href={`#${uid}-arco-bottom`} startOffset="50%" textAnchor="middle">
            {subtitulo}
          </textPath>
        </text>

        {/* Centro: balanza de la justicia */}
        <g stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="50" y1="32" x2="50" y2="66" />
          <line x1="42" y1="66" x2="58" y2="66" />
          <line x1="45" y1="68" x2="55" y2="68" />
          <line x1="36" y1="40" x2="64" y2="40" />
          <circle cx="50" cy="36" r="2.6" />
          <line x1="36" y1="40" x2="33" y2="52" />
          <line x1="36" y1="40" x2="39" y2="52" />
          <path d="M29 52 Q33 56 37 52" />
          <line x1="64" y1="40" x2="61" y2="52" />
          <line x1="64" y1="40" x2="67" y2="52" />
          <path d="M57 52 Q61 56 65 52" />
        </g>

        {children}
      </g>
    </svg>
  );
}