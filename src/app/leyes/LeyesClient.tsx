"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { Search, ExternalLink, ChevronDown, Loader2, ArrowLeft } from "@/components/icons";

interface LeyResultado {
  id: string;
  tipo: string;
  numero: string;
  anio: string;
  dependencia: string;
  fecha: string;
  descripcion: string;
  resumen: string;
  url: string;
  consolidatedUrl?: string | null;
  textoUrl?: string | null;
  label?: string;
}

interface NormaDetalle {
  id: string;
  tipo: string;
  numero: string;
  anio: string;
  dependencia: string;
  fecha: string;
  titulo: string;
  resumen: string;
  textoOriginalUrl: string | null;
  textoActualizadoUrl: string | null;
  modificaciones: string;
  urlInfoleg: string;
}

const TIPOS_NORMA = [
  { value: "", label: "Todos los tipos" },
  { value: "Ley", label: "Ley" },
  { value: "Decreto", label: "Decreto" },
  { value: "Resolución", label: "Resolución" },
  { value: "Disposición", label: "Disposición" },
  { value: "Decisión Administrativa", label: "Decisión Administrativa" },
  { value: "Acordada", label: "Acordada" },
  { value: "Ordenanza", label: "Ordenanza" },
];

export default function LeyesClient() {
  const [query, setQuery] = useState("");
  const [tipo, setTipo] = useState("");
  const [numero, setNumero] = useState("");
  const [anio, setAnio] = useState("");
  const [resultados, setResultados] = useState<LeyResultado[]>([]);
  const [total, setTotal] = useState(0);
  const [paginas, setPaginas] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNorma, setSelectedNorma] = useState<NormaDetalle | null>(null);
  const [loadingNorma, setLoadingNorma] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buscar = useCallback(async (p = 1, q?: string, t?: string, n?: string, a?: string) => {
    const searchQ = q ?? query;
    const searchT = t ?? tipo;
    const searchN = n ?? numero;
    const searchA = a ?? anio;

    if (!searchQ && !searchT && !searchN) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (searchQ) params.set("q", searchQ);
      if (searchT) params.set("tipo", searchT);
      if (searchN) params.set("numero", searchN);
      if (searchA) params.set("anio", searchA);
      params.set("page", String(p));

      const res = await fetch(`/api/leyes/search?${params}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al buscar");
      }

      const data = await res.json();
      setResultados(data.resultados || []);
      setTotal(data.total || 0);
      setPaginas(data.paginas || 0);
      setPage(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setResultados([]);
    } finally {
      setLoading(false);
    }
  }, [query, tipo, numero, anio]);

  const handleTextChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      buscar(1, value, undefined, undefined, undefined);
    }, 400);
  }, [buscar]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      buscar(1);
    }
  }, [buscar]);

  const handleSelectNorma = useCallback(async (id: string) => {
    setLoadingNorma(true);
    try {
      const res = await fetch(`/api/leyes/norma/${id}`);
      if (!res.ok) throw new Error("Error al cargar norma");
      const data = await res.json();
      setSelectedNorma(data);
    } catch {
      window.open(`https://servicios.infoleg.gob.ar/infolegInternet/verNorma.do?id=${id}`, "_blank");
    } finally {
      setLoadingNorma(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const formatearTipoNumero = (r: LeyResultado) => {
    const parts = [r.tipo];
    if (r.numero) parts.push(r.numero);
    if (r.anio) parts.push(`/ ${r.anio}`);
    return parts.join(" ");
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-ink)" }}>
      {/* Botón volver — posición fija a la izquierda */}
      <Link
        href="/"
        className="flex items-center gap-2"
        style={{
          position: "fixed",
          top: "24px",
          left: "24px",
          zIndex: 80,
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          fontFamily: "var(--font-ibm-plex-mono)",
          fontSize: "11px",
          letterSpacing: "0.06em",
          color: "var(--color-text-muted)",
          textDecoration: "none",
          padding: "8px 14px",
          borderRadius: "8px",
          border: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(5,7,12,0.8)",
          backdropFilter: "blur(6px)",
          transition: "color 0.2s ease, border-color 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--color-gold)";
          e.currentTarget.style.borderColor = "rgba(185,154,98,0.3)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--color-text-muted)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
        }}
      >
        <ArrowLeft style={{ width: "14px", height: "14px" }} />
        Inicio
      </Link>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "16px 24px 96px" }}>
        {/* Header */}
        <div style={{ marginBottom: "20px" }}>
          <div
            className="flex items-center gap-3"
            style={{
              marginBottom: "14px",
              fontFamily: "var(--font-ibm-plex-mono)",
              fontSize: "10px",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--color-gold)",
            }}
          >
            <span style={{ width: "20px", height: "1px", background: "var(--color-gold-dim)" }} />
            Buscador
          </div>
          <h1
            style={{
              fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
              fontSize: "clamp(26px, 4vw, 34px)",
              fontWeight: 400,
              letterSpacing: "-0.01em",
              color: "var(--color-text)",
              marginBottom: "8px",
            }}
          >
            Normas y{" "}
            <span style={{ color: "#B99A62", fontStyle: "italic" }}>Leyes</span>
          </h1>
          <p
            style={{
              fontFamily: "var(--font-ibm-plex-mono)",
              fontSize: "12px",
              color: "var(--color-text-faint)",
              letterSpacing: "0.04em",
            }}
          >
            Legislación argentina · Nación y Provincia de Buenos Aires
          </p>
        </div>

        {/* Accesos rápidos — chips compactos arriba del card */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
          {[
            { label: "Constitución Nacional", query: "Constitución Nacional" },
            { label: "Código Civil", query: "Código Civil y Comercial" },
            { label: "Código Penal", query: "Código Penal" },
            { label: "LCT", query: "Ley de Contrato de Trabajo" },
            { label: "LGS", query: "Ley 19.550" },
          ].map((item) => (
            <button
              key={item.query}
              onClick={() => {
                setQuery(item.query);
                buscar(1, item.query, undefined, undefined, undefined);
              }}
              style={{
                borderRadius: "20px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                padding: "6px 14px",
                fontFamily: "var(--font-ibm-plex-mono)",
                fontSize: "10px",
                letterSpacing: "0.04em",
                color: "#8A8E9C",
                cursor: "pointer",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(185,154,98,0.3)";
                e.currentTarget.style.color = "#D9B77E";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                e.currentTarget.style.color = "#8A8E9C";
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Buscador */}
        <div
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.01))",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "14px",
            padding: "24px",
            marginBottom: "28px",
          }}
        >
          {/* Input principal — sin caja, solo border-bottom */}
          <div style={{ position: "relative", marginBottom: "18px", paddingBottom: "14px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <div
              style={{
                position: "absolute",
                left: "-4px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "23px",
                height: "23px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {loading && (
                <div
                  style={{
                    position: "absolute",
                    inset: "-3px",
                    borderRadius: "50%",
                    border: "2px solid transparent",
                    borderTopColor: "#5DCAA5",
                    borderRightColor: "rgba(93,202,165,0.3)",
                    animation: "spin-glow 1s linear infinite",
                  }}
                />
              )}
              <Search
                style={{
                  width: "15px",
                  height: "15px",
                  color: loading ? "#5DCAA5" : "#8A8E9C",
                  transition: "color 0.2s ease",
                }}
              />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => handleTextChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Buscar por nombre, tema o número de norma..."
              style={{
                width: "100%",
                padding: "0 0 0 24px",
                background: "transparent",
                border: "none",
                color: "var(--color-text)",
                fontFamily: "var(--font-inter)",
                fontSize: "15px",
                fontWeight: 300,
                outline: "none",
              }}
            />
          </div>

          {/* Filtros — CSS Grid 2fr 1fr 1fr auto */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "14px", alignItems: "end" }}>
            <div>
              <label style={{ display: "block", fontFamily: "var(--font-ibm-plex-mono)", fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#6A6E7C", marginBottom: "8px" }}>
                Tipo
              </label>
              <div style={{ position: "relative" }}>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  style={{
                    width: "100%",
                    height: "44px",
                    padding: "0 32px 0 14px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: "8px",
                    color: tipo ? "var(--color-text)" : "var(--color-text-muted)",
                    fontFamily: "var(--font-inter)",
                    fontSize: "13px",
                    fontWeight: 300,
                    outline: "none",
                    appearance: "none",
                    cursor: "pointer",
                    transition: "border-color 0.2s ease",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(185,154,98,0.3)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}
                >
                  {TIPOS_NORMA.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <ChevronDown
                  style={{
                    position: "absolute",
                    right: "11px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "14px",
                    height: "14px",
                    color: "var(--color-text-muted)",
                    pointerEvents: "none",
                  }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontFamily: "var(--font-ibm-plex-mono)", fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#6A6E7C", marginBottom: "8px" }}>
                N°
              </label>
              <input
                type="number"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="—"
                min="1"
                style={{
                  width: "100%",
                  height: "44px",
                  padding: "0 14px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "8px",
                  color: "var(--color-text)",
                  fontFamily: "var(--font-ibm-plex-mono)",
                  fontSize: "13px",
                  outline: "none",
                  transition: "border-color 0.2s ease",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(185,154,98,0.3)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}
              />
            </div>
            <div>
              <label style={{ display: "block", fontFamily: "var(--font-ibm-plex-mono)", fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#6A6E7C", marginBottom: "8px" }}>
                Año
              </label>
              <input
                type="number"
                value={anio}
                onChange={(e) => setAnio(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="—"
                min="1853"
                max="2030"
                style={{
                  width: "100%",
                  height: "44px",
                  padding: "0 14px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "8px",
                  color: "var(--color-text)",
                  fontFamily: "var(--font-ibm-plex-mono)",
                  fontSize: "13px",
                  outline: "none",
                  transition: "border-color 0.2s ease",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(185,154,98,0.3)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}
              />
            </div>
            <button
              onClick={() => buscar(1)}
              disabled={loading || (!query && !tipo && !numero)}
              style={{
                height: "44px",
                padding: "0 24px",
                background: "transparent",
                border: "1px solid #B99A62",
                borderRadius: "8px",
                color: "#D9B77E",
                fontFamily: "var(--font-inter)",
                fontSize: "13px",
                fontWeight: 400,
                cursor: loading || (!query && !tipo && !numero) ? "not-allowed" : "pointer",
                opacity: loading || (!query && !tipo && !numero) ? 0.5 : 1,
                transition: "border-color 0.2s ease, color 0.2s ease",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.borderColor = "#D9B77E";
                  e.currentTarget.style.color = "#E8C99A";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#B99A62";
                e.currentTarget.style.color = "#D9B77E";
              }}
            >
              {loading ? "Buscando..." : "Buscar"}
            </button>
          </div>
        </div>

        {/* Resultados */}
        {error && (
          <div
            style={{
              padding: "14px 18px",
              background: "rgba(198, 90, 79, 0.1)",
              border: "1px solid rgba(198, 90, 79, 0.3)",
              borderRadius: "14px",
              color: "var(--color-danger)",
              fontSize: "13px",
              marginBottom: "20px",
            }}
          >
            {error}
          </div>
        )}

        {total > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
            <span
              style={{
                fontFamily: "var(--font-ibm-plex-mono)",
                fontSize: "11px",
                color: "var(--color-text-faint)",
                letterSpacing: "0.04em",
                whiteSpace: "nowrap",
              }}
            >
              {total.toLocaleString("es-AR")} norma{total !== 1 ? "s" : ""} encontrada{total !== 1 ? "s" : ""}
              {paginas > 1 && ` · Página ${page} de ${paginas}`}
            </span>
            <span style={{ flex: 1, height: "1px", background: "var(--color-line-soft)" }} />
          </div>
        )}

        {resultados.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {resultados.map((r, i) => {
              const esPrincipal = i === 0;
              const textoLink = r.consolidatedUrl || r.textoUrl || null;

              if (esPrincipal) {
                return (
                  <div
                    key={r.id}
                    style={{
                      position: "relative",
                      background: "linear-gradient(180deg, rgba(76, 175, 125, 0.055), rgba(76, 175, 125, 0.015))",
                      border: "1px solid rgba(76, 175, 125, 0.42)",
                      borderRadius: "14px",
                      boxShadow: "0 0 26px rgba(76, 175, 125, 0.10)",
                      padding: "20px 22px 20px 25px",
                      overflow: "hidden",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: "3px",
                        background: "linear-gradient(180deg, #4CAF7D, rgba(76, 175, 125, 0.12))",
                      }}
                    />
                    <div className="flex items-center gap-2" style={{ marginBottom: "9px", flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                          fontSize: "17px",
                          fontWeight: 500,
                          color: "var(--color-text)",
                        }}
                      >
                        {formatearTipoNumero(r)}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-ibm-plex-mono)",
                          fontSize: "9px",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "#7FD9A8",
                          background: "rgba(76, 175, 125, 0.12)",
                          border: "1px solid rgba(76, 175, 125, 0.35)",
                          padding: "3px 8px",
                        }}
                      >
                        Mejor coincidencia
                      </span>
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-inter)",
                        fontSize: "15px",
                        fontWeight: 600,
                        color: "var(--color-text)",
                        marginBottom: "5px",
                        lineHeight: 1.35,
                      }}
                    >
                      {r.descripcion || r.label}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-ibm-plex-mono)",
                        fontSize: "11px",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {r.dependencia}
                      {r.fecha ? <span style={{ marginLeft: "10px", color: "var(--color-text-faint)" }}>{r.fecha}</span> : null}
                    </div>
                    {r.resumen && (
                      <div
                        style={{
                          fontFamily: "var(--font-inter)",
                          fontSize: "12.5px",
                          color: "var(--color-text-faint)",
                          marginTop: "10px",
                          lineHeight: 1.55,
                        }}
                      >
                        {r.resumen.length > 240 ? r.resumen.slice(0, 240) + "..." : r.resumen}
                      </div>
                    )}
                    <div style={{ marginTop: "16px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      {textoLink && (
                        <a
                          href={textoLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "7px",
                            background: "#4CAF7D",
                            color: "#0C0B09",
                            padding: "10px 20px",
                            fontFamily: "var(--font-inter)",
                            fontSize: "13px",
                            fontWeight: 600,
                            textDecoration: "none",
                            transition: "background 0.2s ease",
                            boxShadow: "0 0 16px rgba(76, 175, 125, 0.20)",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#5FBF8E")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "#4CAF7D")}
                        >
                          Ver texto completo
                          <ExternalLink style={{ width: "12px", height: "12px" }} />
                        </a>
                      )}
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "7px",
                          background: "none",
                          border: "1px solid var(--color-line)",
                          color: "var(--color-text-muted)",
                          padding: "10px 18px",
                          fontFamily: "var(--font-inter)",
                          fontSize: "13px",
                          textDecoration: "none",
                          transition: "border-color 0.2s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--color-gold-dim)")}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--color-line)")}
                      >
                        Ver en InfoLeg
                        <ExternalLink style={{ width: "11px", height: "11px" }} />
                      </a>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={r.id}
                  onClick={() => handleSelectNorma(r.id)}
                  style={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-line-soft)",
                    borderRadius: "14px",
                    padding: "15px 18px 15px 20px",
                    cursor: "pointer",
                    transition: "border-color 0.15s ease, background 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-gold-dim)";
                    e.currentTarget.style.background = "var(--color-card-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-line-soft)";
                    e.currentTarget.style.background = "var(--color-card)";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
                          fontSize: "14px",
                          fontWeight: 500,
                          color: "var(--color-gold)",
                          marginBottom: "4px",
                        }}
                      >
                        {formatearTipoNumero(r)}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-ibm-plex-mono)",
                          fontSize: "10.5px",
                          color: "var(--color-text-muted)",
                          marginBottom: "6px",
                        }}
                      >
                        {r.dependencia}
                        {r.fecha && (
                          <span style={{ marginLeft: "10px", color: "var(--color-text-faint)" }}>{r.fecha}</span>
                        )}
                      </div>
                      {r.descripcion && (
                        <div
                          style={{
                            fontFamily: "var(--font-inter)",
                            fontSize: "13px",
                            color: "var(--color-text)",
                            lineHeight: 1.45,
                          }}
                        >
                          {r.descripcion}
                        </div>
                      )}
                      {r.resumen && (
                        <div
                          style={{
                            fontFamily: "var(--font-inter)",
                            fontSize: "11.5px",
                            color: "var(--color-text-faint)",
                            marginTop: "6px",
                            lineHeight: 1.5,
                          }}
                        >
                          {r.resumen.length > 180 ? r.resumen.slice(0, 180) + "..." : r.resumen}
                        </div>
                      )}
                    </div>
                    {r.textoUrl ? (
                      <a
                        href={r.textoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Ver texto de la norma"
                        className="flex items-center gap-1 flex-shrink-0"
                        style={{
                          fontFamily: "var(--font-ibm-plex-mono)",
                          fontSize: "9px",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: "var(--color-text-muted)",
                          textDecoration: "none",
                          border: "1px solid var(--color-line)",
                          padding: "5px 9px",
                          marginTop: "2px",
                          transition: "border-color 0.2s ease, color 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "var(--color-gold-dim)";
                          e.currentTarget.style.color = "var(--color-gold)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "var(--color-line)";
                          e.currentTarget.style.color = "var(--color-text-muted)";
                        }}
                      >
                        Texto
                        <ExternalLink style={{ width: "10px", height: "10px" }} />
                      </a>
                    ) : (
                      <ExternalLink
                        style={{
                          width: "14px",
                          height: "14px",
                          color: "var(--color-text-faint)",
                          flexShrink: 0,
                          marginTop: "4px",
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Paginación */}
        {paginas > 1 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", marginTop: "32px" }}>
            {page > 1 && (
              <button
                onClick={() => buscar(page - 1)}
                disabled={loading}
                style={{
                  background: "none",
                  border: "1px solid var(--color-line)",
                  color: "var(--color-text-muted)",
                  padding: "9px 18px",
                  fontFamily: "var(--font-ibm-plex-mono)",
                  fontSize: "11px",
                  letterSpacing: "0.04em",
                  cursor: loading ? "default" : "pointer",
                  transition: "border-color 0.2s ease, color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-gold-dim)";
                  e.currentTarget.style.color = "var(--color-gold)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-line)";
                  e.currentTarget.style.color = "var(--color-text-muted)";
                }}
              >
                ← Anterior
              </button>
            )}
            <span
              style={{
                fontFamily: "var(--font-ibm-plex-mono)",
                fontSize: "11px",
                color: "var(--color-text-faint)",
                letterSpacing: "0.06em",
              }}
            >
              {page} / {paginas}
            </span>
            {page < paginas && (
              <button
                onClick={() => buscar(page + 1)}
                disabled={loading}
                style={{
                  background: "none",
                  border: "1px solid var(--color-line)",
                  color: "var(--color-text-muted)",
                  padding: "9px 18px",
                  fontFamily: "var(--font-ibm-plex-mono)",
                  fontSize: "11px",
                  letterSpacing: "0.04em",
                  cursor: loading ? "default" : "pointer",
                  transition: "border-color 0.2s ease, color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-gold-dim)";
                  e.currentTarget.style.color = "var(--color-gold)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-line)";
                  e.currentTarget.style.color = "var(--color-text-muted)";
                }}
              >
                Siguiente →
              </button>
            )}
          </div>
        )}

        {/* Empty state */}
        {!loading && resultados.length === 0 && !error && total === 0 && (
          <div style={{ textAlign: "center", padding: "72px 20px" }}>
            <div
              className="flex items-center justify-center"
              style={{
                width: "52px",
                height: "52px",
                margin: "0 auto 20px",
                borderRadius: "50%",
                border: "1px solid var(--color-line)",
              }}
            >
              <Search style={{ width: "20px", height: "20px", color: "var(--color-text-faint)" }} />
            </div>
            <div
              style={{
                fontFamily: "var(--font-inter)",
                fontSize: "15px",
                color: "var(--color-text)",
                marginBottom: "8px",
              }}
            >
              Buscá leyes, decretos y códigos
            </div>
            <div
              style={{
                fontFamily: "var(--font-ibm-plex-mono)",
                fontSize: "11px",
                color: "var(--color-text-faint)",
                letterSpacing: "0.04em",
              }}
            >
              Datos provistos por InfoLeg · Ministerio de Justicia
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && resultados.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <Loader2
              style={{
                width: "22px",
                height: "22px",
                color: "var(--color-gold)",
                animation: "spin 1s linear infinite",
              }}
            />
            <div
              style={{
                fontFamily: "var(--font-ibm-plex-mono)",
                fontSize: "11px",
                letterSpacing: "0.06em",
                color: "var(--color-text-faint)",
                marginTop: "14px",
              }}
            >
              Buscando...
            </div>
          </div>
        )}
      </div>

      {/* Modal detalle norma */}
      {selectedNorma && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.7)",
            padding: "20px",
          }}
          onClick={() => setSelectedNorma(null)}
        >
          <div
            style={{
              background: "var(--color-card)",
              border: "1px solid var(--color-line)",
              borderRadius: "14px",
              maxWidth: "640px",
              width: "100%",
              maxHeight: "80vh",
              overflow: "auto",
              padding: "28px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-fraunces)",
                    fontSize: "20px",
                    fontWeight: 500,
                    color: "var(--color-gold)",
                    marginBottom: "6px",
                  }}
                >
                  {selectedNorma.tipo} {selectedNorma.numero} / {selectedNorma.anio}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-inter)",
                    fontSize: "12px",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {selectedNorma.dependencia}
                  {selectedNorma.fecha && <span style={{ marginLeft: "12px" }}>{selectedNorma.fecha}</span>}
                </div>
              </div>
              <button
                onClick={() => setSelectedNorma(null)}
                style={{
                  background: "none",
                  border: "1px solid var(--color-line)",
                  color: "var(--color-text-muted)",
                  width: "32px",
                  height: "32px",
                  cursor: "pointer",
                  fontSize: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>

            {selectedNorma.titulo && (
              <div
                style={{
                  fontFamily: "var(--font-inter)",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "var(--color-text)",
                  marginBottom: "16px",
                  lineHeight: 1.4,
                  textTransform: "uppercase",
                }}
              >
                {selectedNorma.titulo}
              </div>
            )}

            {selectedNorma.resumen && (
              <div style={{ marginBottom: "20px" }}>
                <div
                  style={{
                    fontFamily: "var(--font-ibm-plex-mono)",
                    fontSize: "10px",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--color-text-faint)",
                    marginBottom: "6px",
                  }}
                >
                  Resumen
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-inter)",
                    fontSize: "13px",
                    color: "var(--color-text-muted)",
                    lineHeight: 1.5,
                  }}
                >
                  {selectedNorma.resumen}
                </div>
              </div>
            )}

            {selectedNorma.modificaciones && (
              <div
                style={{
                  fontFamily: "var(--font-inter)",
                  fontSize: "12px",
                  color: "var(--color-text-faint)",
                  marginBottom: "20px",
                  padding: "10px 14px",
                  background: "var(--color-ink)",
                  border: "1px solid var(--color-line-soft)",
                  borderRadius: "10px",
                }}
              >
                {selectedNorma.modificaciones}
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {selectedNorma.textoActualizadoUrl && (
                <a
                  href={selectedNorma.textoActualizadoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "var(--color-gold)",
                    color: "var(--color-ink)",
                    padding: "10px 18px",
                    fontFamily: "var(--font-inter)",
                    fontSize: "13px",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Texto actualizado
                  <ExternalLink style={{ width: "12px", height: "12px" }} />
                </a>
              )}
              {selectedNorma.textoOriginalUrl && (
                <a
                  href={selectedNorma.textoOriginalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "none",
                    border: "1px solid var(--color-line)",
                    color: "var(--color-text-muted)",
                    padding: "10px 18px",
                    fontFamily: "var(--font-inter)",
                    fontSize: "13px",
                    textDecoration: "none",
                  }}
                >
                  Texto original
                  <ExternalLink style={{ width: "12px", height: "12px" }} />
                </a>
              )}
              <a
                href={selectedNorma.urlInfoleg}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "none",
                  border: "1px solid var(--color-line)",
                  color: "var(--color-text-faint)",
                  padding: "10px 18px",
                  fontFamily: "var(--font-ibm-plex-mono)",
                  fontSize: "11px",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--color-gold-dim)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--color-line)")}
              >
                Ver en InfoLeg
                <ExternalLink style={{ width: "11px", height: "11px" }} />
              </a>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } @keyframes spin-glow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
