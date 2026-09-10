"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Search, ExternalLink, ChevronDown, Loader2 } from "@/components/icons";

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
      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "40px 22px 80px" }}>
        {/* Header */}
        <div style={{ marginBottom: "36px" }}>
          <h1
            style={{
              fontFamily: "var(--font-fraunces), 'Fraunces', Georgia, serif",
              fontSize: "clamp(26px, 4vw, 34px)",
              fontWeight: 500,
              color: "var(--color-text)",
              marginBottom: "8px",
            }}
          >
            Normas y <span style={{ color: "var(--color-gold)" }}>Leyes</span>
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

        {/* Buscador */}
        <div
          style={{
            background: "var(--color-card)",
            border: "1px solid var(--color-line)",
            padding: "20px",
            marginBottom: "24px",
          }}
        >
          {/* Input principal */}
          <div style={{ position: "relative", marginBottom: "16px" }}>
            <Search
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "16px",
                height: "16px",
                color: "var(--color-text-muted)",
              }}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => handleTextChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Buscar por texto libre..."
              style={{
                width: "100%",
                padding: "12px 14px 12px 42px",
                background: "var(--color-ink)",
                border: "1px solid var(--color-line)",
                color: "var(--color-text)",
                fontFamily: "var(--font-inter)",
                fontSize: "14px",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-gold-dim)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-line)")}
            />
          </div>

          {/* Filtros */}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
            <div style={{ flex: "1 1 160px" }}>
              <div style={{ position: "relative" }}>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 32px 10px 12px",
                    background: "var(--color-ink)",
                    border: "1px solid var(--color-line)",
                    color: tipo ? "var(--color-text)" : "var(--color-text-muted)",
                    fontFamily: "var(--font-inter)",
                    fontSize: "13px",
                    outline: "none",
                    appearance: "none",
                    cursor: "pointer",
                  }}
                >
                  {TIPOS_NORMA.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  style={{
                    position: "absolute",
                    right: "10px",
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
            <div style={{ flex: "0 1 100px" }}>
              <input
                type="number"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="N°"
                min="1"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "var(--color-ink)",
                  border: "1px solid var(--color-line)",
                  color: "var(--color-text)",
                  fontFamily: "var(--font-inter)",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>
            <div style={{ flex: "0 1 80px" }}>
              <input
                type="number"
                value={anio}
                onChange={(e) => setAnio(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Año"
                min="1853"
                max="2030"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "var(--color-ink)",
                  border: "1px solid var(--color-line)",
                  color: "var(--color-text)",
                  fontFamily: "var(--font-inter)",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>
          </div>

          <button
            onClick={() => buscar(1)}
            disabled={loading || (!query && !tipo && !numero)}
            style={{
              background: "var(--color-gold)",
              color: "var(--color-ink)",
              border: "none",
              padding: "10px 28px",
              fontFamily: "var(--font-inter)",
              fontSize: "13px",
              fontWeight: 600,
              cursor: loading || (!query && !tipo && !numero) ? "not-allowed" : "pointer",
              opacity: loading || (!query && !tipo && !numero) ? 0.5 : 1,
              transition: "opacity 0.2s",
            }}
          >
            {loading ? "Buscando..." : "Buscar"}
          </button>
        </div>

        {/* Resultados */}
        {error && (
          <div
            style={{
              padding: "14px 18px",
              background: "rgba(198, 90, 79, 0.1)",
              border: "1px solid rgba(198, 90, 79, 0.3)",
              color: "var(--color-danger)",
              fontSize: "13px",
              marginBottom: "20px",
            }}
          >
            {error}
          </div>
        )}

        {total > 0 && (
          <div
            style={{
              fontFamily: "var(--font-ibm-plex-mono)",
              fontSize: "11px",
              color: "var(--color-text-faint)",
              letterSpacing: "0.04em",
              marginBottom: "16px",
            }}
          >
            {total.toLocaleString("es-AR")} norma{total !== 1 ? "s" : ""} encontrada{total !== 1 ? "s" : ""}
            {paginas > 1 && ` · Página ${page} de ${paginas}`}
          </div>
        )}

        {resultados.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {resultados.map((r) => (
              <div
                key={r.id}
                onClick={() => handleSelectNorma(r.id)}
                style={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-line-soft)",
                  padding: "16px 18px",
                  cursor: "pointer",
                  transition: "border-color 0.15s, background 0.15s",
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
                        fontFamily: "var(--font-fraunces)",
                        fontSize: "15px",
                        fontWeight: 500,
                        color: "var(--color-gold)",
                        marginBottom: "4px",
                      }}
                    >
                      {formatearTipoNumero(r)}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-inter)",
                        fontSize: "12px",
                        color: "var(--color-text-muted)",
                        marginBottom: "6px",
                      }}
                    >
                      {r.dependencia}
                      {r.fecha && (
                        <span style={{ marginLeft: "12px", color: "var(--color-text-faint)" }}>
                          {r.fecha}
                        </span>
                      )}
                    </div>
                    {r.descripcion && (
                      <div
                        style={{
                          fontFamily: "var(--font-inter)",
                          fontSize: "13px",
                          color: "var(--color-text)",
                          lineHeight: 1.4,
                        }}
                      >
                        {r.descripcion}
                      </div>
                    )}
                    {r.resumen && (
                      <div
                        style={{
                          fontFamily: "var(--font-inter)",
                          fontSize: "12px",
                          fontStyle: "italic",
                          color: "var(--color-text-faint)",
                          marginTop: "6px",
                          lineHeight: 1.4,
                        }}
                      >
                        {r.resumen.length > 200 ? r.resumen.slice(0, 200) + "..." : r.resumen}
                      </div>
                    )}
                  </div>
                  <ExternalLink
                    style={{
                      width: "14px",
                      height: "14px",
                      color: "var(--color-text-faint)",
                      flexShrink: 0,
                      marginTop: "4px",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Paginación */}
        {paginas > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "28px" }}>
            {page > 1 && (
              <button
                onClick={() => buscar(page - 1)}
                disabled={loading}
                style={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-line)",
                  color: "var(--color-text-muted)",
                  padding: "8px 16px",
                  fontFamily: "var(--font-ibm-plex-mono)",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                ← Anterior
              </button>
            )}
            <span
              style={{
                padding: "8px 16px",
                fontFamily: "var(--font-ibm-plex-mono)",
                fontSize: "12px",
                color: "var(--color-text-faint)",
              }}
            >
              {page} / {paginas}
            </span>
            {page < paginas && (
              <button
                onClick={() => buscar(page + 1)}
                disabled={loading}
                style={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-line)",
                  color: "var(--color-text-muted)",
                  padding: "8px 16px",
                  fontFamily: "var(--font-ibm-plex-mono)",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Siguiente →
              </button>
            )}
          </div>
        )}

        {/* Empty state */}
        {!loading && resultados.length === 0 && !error && total === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              color: "var(--color-text-faint)",
            }}
          >
            <Search style={{ width: "32px", height: "32px", marginBottom: "16px", opacity: 0.3 }} />
            <div
              style={{
                fontFamily: "var(--font-inter)",
                fontSize: "14px",
                marginBottom: "8px",
              }}
            >
              Buscá leyes, decretos, resoluciones y otras normas
            </div>
            <div
              style={{
                fontFamily: "var(--font-ibm-plex-mono)",
                fontSize: "11px",
                letterSpacing: "0.04em",
              }}
            >
              Datos provistos por InfoLeg · Ministerio de Justicia
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && resultados.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <Loader2
              style={{
                width: "24px",
                height: "24px",
                color: "var(--color-gold)",
                animation: "spin 1s linear infinite",
              }}
            />
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

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
