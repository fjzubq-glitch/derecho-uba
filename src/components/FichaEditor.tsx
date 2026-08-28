"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { useEditor, EditorContent, NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer, NodeViewProps } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import { TableKit } from "@tiptap/extension-table";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Details, DetailsSummary, DetailsContent } from "@tiptap/extension-details";
import Image from "@tiptap/extension-image";
import { SlashCommand } from "@/components/SlashCommand";
import BlockHandle from "@/components/BlockHandle";
import { Loader2, Check, X, Bold, Italic, List, ListOrdered, Heading2, Heading3, Undo, Redo, Quote, Code, Minus, Highlight as HighlightIcon } from "@/components/icons";

const HIGHLIGHT_COLORS = ["#E05555", "#D4769A", "#B99A62", "#6B9E78", "#5B8DB8", "#9B7ED8"];
const COLOR_LABELS = ["Rojo", "Rosa", "Dorado", "Verde", "Azul", "Violeta"];

const isValidImageUrl = (url: string): boolean =>
  /^https?:\/\/.+/i.test(url) || /^data:image\//i.test(url);

function CalloutView({ node, updateAttributes }: NodeViewProps) {
  const icon = node.attrs.icon || "💡";
  return (
    <NodeViewWrapper className="callout-node" data-type="callout" data-icon={icon}>
      <button
        type="button"
        className="callout-icon"
        contentEditable={false}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          const next = window.prompt("Emoji para el callout (ej. 💡 ⚠️ 📌 ✅ 📝):", icon);
          if (next && next.trim()) updateAttributes({ icon: next.trim() });
        }}
        title="Cambiar icono"
      >
        {icon}
      </button>
      <NodeViewContent className="callout-content" />
    </NodeViewWrapper>
  );
}

const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes() {
    return {
      icon: {
        default: "💡",
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-icon") || "💡",
        renderHTML: (attrs) => ({ "data-icon": attrs.icon || "💡" }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "callout" }), 0];
  },
  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
  },
});

function TodoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function ToggleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function CalloutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M11 12h1v4h1" />
    </svg>
  );
}

function ColumnsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="7" height="16" rx="1" />
      <rect x="14" y="4" width="7" height="16" rx="1" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    columnList: {
      insertColumnLayout: () => ReturnType;
      addColumn: () => ReturnType;
      removeColumn: () => ReturnType;
    };
  }
}

const Column = Node.create({
  name: "column",
  content: "block+",
  isolating: true,
  parseHTML() {
    return [{ tag: 'div[data-type="column"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "column" }), 0];
  },
});

const ColumnList = Node.create({
  name: "columnList",
  group: "block",
  content: "column{2,}",
  parseHTML() {
    return [{ tag: 'div[data-type="columnList"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "columnList" }), 0];
  },
  addCommands() {
    return {
      insertColumnLayout:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            content: [
              { type: "column", content: [{ type: "paragraph" }] },
              { type: "column", content: [{ type: "paragraph" }] },
            ],
          }),
      addColumn:
        () =>
        ({ state, dispatch }) => {
          const { $from } = state.selection;
          let listPos = -1;
          let listNode = null;
          for (let d = $from.depth; d > 0; d--) {
            const node = $from.node(d);
            if (node.type.name === "columnList") {
              listPos = $from.before(d);
              listNode = node;
              break;
            }
          }
          if (!listNode) return false;
          const newColumn = state.schema.nodes.column.createAndFill();
          if (!newColumn) return false;
          if (dispatch) {
            const tr = state.tr.insert(listPos + listNode.nodeSize - 1, newColumn);
            dispatch(tr);
          }
          return true;
        },
      removeColumn:
        () =>
        ({ state, dispatch }) => {
          const { $from } = state.selection;
          let colPos = -1;
          let colNode = null;
          let colDepth = -1;
          for (let d = $from.depth; d > 0; d--) {
            const node = $from.node(d);
            if (node.type.name === "column") {
              colPos = $from.before(d);
              colNode = node;
              colDepth = d;
              break;
            }
          }
          if (!colNode) return false;
          const listNode = $from.node(colDepth - 1);
          if (!listNode || listNode.childCount <= 2) return false;
          if (dispatch) {
            const tr = state.tr.delete(colPos, colPos + colNode.nodeSize);
            dispatch(tr);
          }
          return true;
        },
    };
  },
});

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
  autoSave,
}: {
  initialTitulo: string;
  initialContenido: string;
  onSave: (t: string, c: string) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  autoSave?: boolean;
}) {
  const [titulo, setTitulo] = useState(initialTitulo);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const onSaveRef = useRef(onSave);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);
  const tituloRef = useRef(titulo);
  useEffect(() => { tituloRef.current = titulo; }, [titulo]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestHTML = useRef(initialContenido);
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Highlight,
      TextStyle,
      Color,
      TableKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Details,
      DetailsSummary,
      DetailsContent,
      Callout,
      Column,
      ColumnList,
      Image.configure({ inline: false, allowBase64: true }),
      SlashCommand,
    ],
    content: initialContenido,
    editorProps: {
      attributes: {
        class: "tiptap",
        style: "min-height:320px",
      },
      handleKeyDown: (_view, event) => {
        const mod = event.metaKey || event.ctrlKey;
        const ed = editorRef.current;
        if (!ed) return false;
        if (mod && event.key.toLowerCase() === "s") {
          event.preventDefault();
          onSaveRef.current(tituloRef.current, ed.getHTML()).catch(() => {});
          return true;
        }
        if (mod && event.shiftKey && event.key.toLowerCase() === "h") {
          event.preventDefault();
          ed.chain().focus().toggleHighlight().run();
          return true;
        }
        if (mod && event.shiftKey && /^Digit[1-6]$/.test(event.code)) {
          event.preventDefault();
          ed.chain().focus().setColor(HIGHLIGHT_COLORS[parseInt(event.code.slice(5), 10) - 1]).run();
          return true;
        }
        return false;
      },
    },
  });

  editorRef.current = editor;

  const scheduleSave = useCallback(() => {
    if (!autoSave || !editor) return;
    latestHTML.current = editor.getHTML();
    setSaveStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await onSaveRef.current(tituloRef.current, latestHTML.current);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    }, 1500);
  }, [autoSave, editor]);

  useEffect(() => {
    if (!autoSave || !editor) return;
    const onUpdate = () => scheduleSave();
    editor.on("update", onUpdate);
    return () => {
      try {
        editor.off("update", onUpdate);
      } catch {
        /* editor ya destruido */
      }
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        onSaveRef.current(tituloRef.current, latestHTML.current).catch(() => {});
      }
    };
  }, [autoSave, editor, scheduleSave]);

  if (!editor) {
    return null;
  }

  const insertToggle = () => {
    if (editor.isActive("details")) {
      editor.chain().focus().unsetDetails().run();
      return;
    }
    if (!editor.state.selection.empty) {
      editor.chain().focus().setDetails().run();
      return;
    }
    editor
      .chain()
      .focus()
      .insertContent({
        type: "details",
        content: [
          { type: "detailsSummary", content: [{ type: "paragraph" }] },
          { type: "detailsContent", content: [{ type: "paragraph" }] },
        ],
      })
      .run();
  };

  return (
    <div className="space-y-4">
      <input
        type="text"
        className="ficha-title"
        value={titulo}
        onChange={(e) => { setTitulo(e.target.value); scheduleSave(); }}
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
        {HIGHLIGHT_COLORS.map((color, i) => (
           <button
            key={color}
            type="button"
            title={COLOR_LABELS[i]}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().setColor(color).run()}
            style={{
              width: "18px",
              height: "18px",
              borderRadius: "50%",
              background: color,
              border: editor.isActive("textStyle", { color }) ? "2px solid var(--color-text)" : "2px solid transparent",
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
          title="Lista de tareas (to-do)"
          active={editor.isActive("taskList")}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
        >
          <TodoIcon />
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
          title="Bloque toggle (colapsable)"
          active={editor.isActive("details")}
          onClick={insertToggle}
        >
          <ToggleIcon />
        </ToolbarButton>
        <ToolbarButton
          title="Callout (bloque destacado)"
          active={editor.isActive("callout")}
          onClick={() => editor.chain().focus().insertContent({ type: "callout", attrs: { icon: "💡" }, content: [{ type: "paragraph" }] }).run()}
        >
          <CalloutIcon />
        </ToolbarButton>
        <ToolbarButton
          title="Insertar imagen (URL)"
          onClick={() => {
            const url = window.prompt("URL de la imagen:", "https://");
            if (url && isValidImageUrl(url.trim())) {
              editor.chain().focus().setImage({ src: url.trim() }).run();
            }
          }}
        >
          <ImageIcon />
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
        <span style={{ width: "1px", height: "20px", background: "var(--color-line-soft)", margin: "0 4px", alignSelf: "center" }} />
        <ToolbarButton
          title="Insertar columnas (2)"
          active={editor.isActive("columnList")}
          onClick={() => editor.chain().focus().insertColumnLayout().run()}
        >
          <ColumnsIcon />
        </ToolbarButton>
        <ToolbarButton
          title="Añadir columna"
          onClick={() => editor.chain().focus().addColumn().run()}
        >
          <span style={{ fontSize: "11px" }}>C+</span>
        </ToolbarButton>
        <ToolbarButton
          title="Quitar columna"
          onClick={() => editor.chain().focus().removeColumn().run()}
        >
          <span style={{ fontSize: "11px" }}>C−</span>
        </ToolbarButton>
        <span style={{ flex: 1 }} />
        <ToolbarButton title="Deshacer" onClick={() => editor.chain().focus().undo().run()}>
          <Undo style={{ width: "15px", height: "15px" }} />
        </ToolbarButton>
        <ToolbarButton title="Rehacer" onClick={() => editor.chain().focus().redo().run()}>
          <Redo style={{ width: "15px", height: "15px" }} />
        </ToolbarButton>
      </div>

      <div className="ficha-editor-body" style={{ position: "relative", border: "1px solid var(--color-line-soft)", background: "var(--color-ink)" }}>
        <BlockHandle editor={editor} />
        <EditorContent editor={editor} />
        <BubbleMenu editor={editor} options={{ placement: "top", offset: 8 }} updateDelay={80}>
          <div className="bubble-menu">
            <button
              type="button"
              title="Negrita"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().toggleBold().run()}
              className="bm-btn"
            >
              <Bold style={{ width: "15px", height: "15px" }} />
            </button>
            <button
              type="button"
              title="Cursiva"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className="bm-btn"
            >
              <Italic style={{ width: "15px", height: "15px" }} />
            </button>
            <button
              type="button"
              title="Resaltar"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              className="bm-btn"
            >
              <HighlightIcon style={{ width: "15px", height: "15px" }} />
            </button>
            <span className="bm-sep" />
            {HIGHLIGHT_COLORS.map((color, i) => (
              <button
                key={color}
                type="button"
                title={COLOR_LABELS[i]}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().setColor(color).run()}
                className="bm-color"
                style={{ background: color }}
              />
            ))}
            <button
              type="button"
              title="Color normal"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().unsetColor().run()}
              className="bm-color bm-color-reset"
            />
          </div>
        </BubbleMenu>
      </div>

      <div className="flex items-center justify-between gap-3" style={{ paddingTop: "12px" }}>
        <div style={{ fontSize: "12px", fontFamily: "var(--font-ibm-plex-mono)", color: "var(--color-text-faint)", minHeight: "16px" }}>
          {autoSave && saveStatus === "saving" && "Guardando…"}
          {autoSave && saveStatus === "saved" && "Guardado ✓"}
          {autoSave && saveStatus === "error" && "Error al guardar"}
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} style={{ background: "none", border: "1px solid var(--color-line)", color: "var(--color-text-muted)", padding: "10px 20px", cursor: "pointer", fontFamily: "var(--font-inter)" }}>
            <X style={{ width: "14px", height: "14px", display: "inline-block", verticalAlign: "middle", marginRight: "6px" }} />
            {autoSave ? "Cerrar" : "Cancelar"}
          </button>
          {!autoSave && (
            <button
              onClick={() => onSave(titulo, editor.getHTML())}
              disabled={saving}
              style={{ background: "var(--color-gold)", color: "var(--color-ink)", border: "none", padding: "10px 20px", cursor: saving ? "not-allowed" : "pointer", fontFamily: "var(--font-inter)", display: "flex", alignItems: "center", gap: "8px", opacity: saving ? 0.6 : 1 }}
            >
              {saving ? <Loader2 style={{ width: "14px", height: "14px", animation: "spin 1s linear infinite" }} /> : <Check style={{ width: "14px", height: "14px" }} />}
              Guardar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
