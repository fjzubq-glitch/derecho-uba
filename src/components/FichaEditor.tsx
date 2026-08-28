"use client";

import React, { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import { TableKit } from "@tiptap/extension-table";
import { Loader2, Check, X, Bold, Italic, List, ListOrdered, Heading2, Heading3, Undo, Redo, Quote, Code, Minus, Highlight as HighlightIcon } from "@/components/icons";

const btnStyle: React.CSSProperties = {
  background: "none",
  border: "1px solid transparent",
  color: "var(--color-text-muted)",
  padding: "6px 8px",
  cursor: "pointer",
  borderRadius: "4px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

function ToolbarButton({ active, onClick, title, children }: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`tb-btn${active ? " is-active" : ""}`}
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      title={title}
      style={btnStyle}
    >
      {children}
    </button>
  );
}

export default function FichaEditor({
  initialTitulo,
  initialContenido,
  onSave,
  onCancel,
  saving,
}: {
  initialTitulo: string;
  initialContenido: string;
  onSave: (t: string, c: string) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const [titulo, setTitulo] = useState(initialTitulo);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Highlight,
      TextStyle,
      Color,
      TableKit,
    ],
    content: initialContenido,
    editorProps: {
      attributes: {
        class: "tiptap",
        style: "min-height:320px",
      },
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Título de la ficha"
        aria-label="Título de la ficha"
        style={{
          width: "100%",
          background: "var(--color-ink)",
          border: "1px solid var(--color-line-soft)",
          borderRadius: 0,
          padding: "12px 16px",
          fontSize: "16px",
          fontFamily: "var(--font-fraunces), serif",
          color: "var(--color-text)",
          outline: "none",
        }}
      />

      <div className="ficha-toolbar" style={{ display: "flex", flexWrap: "wrap", gap: "4px", border: "1px solid var(--color-line-soft)", borderBottom: "none", padding: "8px", background: "var(--color-ink)" }}>
        <ToolbarButton
          title="Negrita"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold style={{ width: "15px", height: "15px" }} />
        </ToolbarButton>
        <ToolbarButton
          title="Cursiva"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic style={{ width: "15px", height: "15px" }} />
        </ToolbarButton>
        <ToolbarButton
          title="Resaltar"
          active={editor.isActive("highlight")}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
        >
          <HighlightIcon style={{ width: "15px", height: "15px" }} />
        </ToolbarButton>
        <span style={{ width: "1px", height: "20px", background: "var(--color-line-soft)", margin: "0 4px", alignSelf: "center" }} />
        {[
          { color: "#E05555", label: "Rojo" },
          { color: "#D4769A", label: "Rosa" },
          { color: "#B99A62", label: "Dorado" },
          { color: "#6B9E78", label: "Verde" },
          { color: "#5B8DB8", label: "Azul" },
          { color: "#9B7ED8", label: "Violeta" },
        ].map((c) => (
           <button
            key={c.color}
            type="button"
            title={c.label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().setColor(c.color).run()}
            style={{
              width: "18px",
              height: "18px",
              borderRadius: "50%",
              background: c.color,
              border: editor.isActive("textStyle", { color: c.color }) ? "2px solid var(--color-text)" : "2px solid transparent",
              cursor: "pointer",
              padding: 0,
              transition: "border-color 0.15s ease, transform 0.15s ease",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.2)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          />
        ))}
        <button
          type="button"
          title="Color normal"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().unsetColor().run()}
          style={{
            width: "18px",
            height: "18px",
            borderRadius: "50%",
            background: "var(--color-text)",
            border: !editor.isActive("textStyle") ? "2px solid var(--color-gold)" : "2px solid transparent",
            cursor: "pointer",
            padding: 0,
            transition: "border-color 0.15s ease, transform 0.15s ease",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.2)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
        />
        <ToolbarButton
          title="Encabezado 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 style={{ width: "15px", height: "15px" }} />
        </ToolbarButton>
        <ToolbarButton
          title="Encabezado 3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 style={{ width: "15px", height: "15px" }} />
        </ToolbarButton>
        <ToolbarButton
          title="Lista con viñetas"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List style={{ width: "15px", height: "15px" }} />
        </ToolbarButton>
        <ToolbarButton
          title="Lista numerada"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered style={{ width: "15px", height: "15px" }} />
        </ToolbarButton>
        <ToolbarButton
          title="Cita"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote style={{ width: "15px", height: "15px" }} />
        </ToolbarButton>
        <ToolbarButton
          title="Código"
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <Code style={{ width: "15px", height: "15px" }} />
        </ToolbarButton>
        <ToolbarButton
          title="Línea separadora"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus style={{ width: "15px", height: "15px" }} />
        </ToolbarButton>
        <span style={{ width: "1px", height: "20px", background: "var(--color-line-soft)", margin: "0 4px", alignSelf: "center" }} />
        <ToolbarButton
          title="Insertar tabla"
          onClick={() => editor.chain().focus().insertTable({ rows: 4, cols: 4, withHeaderRow: true }).run()}
        >
          <span style={{ fontSize: "13px", fontWeight: 700 }}>⊞</span>
        </ToolbarButton>
        <ToolbarButton
          title="Añadir fila"
          onClick={() => editor.chain().focus().addRowAfter().run()}
        >
          <span style={{ fontSize: "11px" }}>F+</span>
        </ToolbarButton>
        <ToolbarButton
          title="Añadir columna"
          onClick={() => editor.chain().focus().addColumnAfter().run()}
        >
          <span style={{ fontSize: "11px" }}>C+</span>
        </ToolbarButton>
        <ToolbarButton
          title="Eliminar tabla"
          onClick={() => editor.chain().focus().deleteTable().run()}
        >
          <span style={{ fontSize: "11px" }}>✕⊞</span>
        </ToolbarButton>
        <span style={{ flex: 1 }} />
        <ToolbarButton title="Deshacer" onClick={() => editor.chain().focus().undo().run()}>
          <Undo style={{ width: "15px", height: "15px" }} />
        </ToolbarButton>
        <ToolbarButton title="Rehacer" onClick={() => editor.chain().focus().redo().run()}>
          <Redo style={{ width: "15px", height: "15px" }} />
        </ToolbarButton>
      </div>

      <div style={{ border: "1px solid var(--color-line-soft)", background: "var(--color-ink)" }}>
        <EditorContent editor={editor} />
      </div>

      <div className="flex justify-end gap-3" style={{ paddingTop: "12px" }}>
        <button onClick={onCancel} style={{ background: "none", border: "1px solid var(--color-line)", color: "var(--color-text-muted)", padding: "10px 20px", cursor: "pointer", fontFamily: "var(--font-inter)" }}>
          <X style={{ width: "14px", height: "14px", display: "inline-block", verticalAlign: "middle", marginRight: "6px" }} />
          Cancelar
        </button>
        <button
          onClick={() => onSave(titulo, editor.getHTML())}
          disabled={saving}
          style={{ background: "var(--color-gold)", color: "var(--color-ink)", border: "none", padding: "10px 20px", cursor: saving ? "not-allowed" : "pointer", fontFamily: "var(--font-inter)", display: "flex", alignItems: "center", gap: "8px", opacity: saving ? 0.6 : 1 }}
        >
          {saving ? <Loader2 style={{ width: "14px", height: "14px", animation: "spin 1s linear infinite" }} /> : <Check style={{ width: "14px", height: "14px" }} />}
          Guardar
        </button>
      </div>
    </div>
  );
}
