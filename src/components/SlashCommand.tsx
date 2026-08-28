"use client";

import { Extension } from "@tiptap/core";
import type { Editor, Range } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import type { SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance } from "tippy.js";
import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react";

import "tippy.js/dist/tippy.css";

interface SlashItem {
  title: string;
  description: string;
  icon: string;
  command: (props: { editor: Editor; range: Range }) => void;
}

interface SlashCommandListRef {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

const ITEMS: SlashItem[] = [
  {
    title: "Texto",
    description: "Párrafo simple",
    icon: "¶",
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    title: "Título 1",
    description: "Encabezado grande",
    icon: "H1",
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run(),
  },
  {
    title: "Título 2",
    description: "Encabezado medio",
    icon: "H2",
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run(),
  },
  {
    title: "Título 3",
    description: "Encabezado chico",
    icon: "H3",
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run(),
  },
  {
    title: "Lista con viñetas",
    description: "Puntos",
    icon: "•",
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: "Lista numerada",
    description: "1. 2. 3.",
    icon: "1.",
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: "Lista de tareas",
    description: "Checkboxes",
    icon: "☑",
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    title: "Toggle",
    description: "Bloque colapsable",
    icon: "▸",
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "details",
          content: [
            { type: "detailsSummary", content: [{ type: "paragraph" }] },
            { type: "detailsContent", content: [{ type: "paragraph" }] },
          ],
        })
        .run(),
  },
  {
    title: "Callout",
    description: "Bloque destacado",
    icon: "💡",
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({ type: "callout", attrs: { icon: "💡" }, content: [{ type: "paragraph" }] })
        .run(),
  },
  {
    title: "Tabla",
    description: "4 x 4 con encabezado",
    icon: "⊞",
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).insertTable({ rows: 4, cols: 4, withHeaderRow: true }).run(),
  },
  {
    title: "Columnas",
    description: "Dos columnas",
    icon: "▥",
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertColumnLayout().run(),
  },
  {
    title: "Cita",
    description: "Bloque quote",
    icon: "❝",
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: "Código",
    description: "Bloque de código",
    icon: "</>",
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: "Imagen",
    description: "Por URL",
    icon: "🖼",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      const url = window.prompt("URL de la imagen:", "https://");
      if (url && url.trim() && url.trim() !== "https://") {
        editor.chain().focus().setImage({ src: url.trim() }).run();
      }
    },
  },
  {
    title: "Divisor",
    description: "Línea separadora",
    icon: "—",
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
];

const SlashCommandList = forwardRef<SlashCommandListRef, SuggestionProps<SlashItem>>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => setSelectedIndex(0), [props.items]);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) props.command(item);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((i) => (i + props.items.length - 1) % props.items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((i) => (i + 1) % props.items.length);
        return true;
      }
      if (event.key === "Enter") {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (!props.items.length) {
    return <div className="slash-menu slash-menu-empty">Sin resultados</div>;
  }

  return (
    <div className="slash-menu">
      {props.items.map((item, index) => (
        <button
          key={item.title}
          type="button"
          className={`slash-item${index === selectedIndex ? " is-active" : ""}`}
          onMouseEnter={() => setSelectedIndex(index)}
          onClick={() => selectItem(index)}
        >
          <span className="slash-item-icon">{item.icon}</span>
          <span className="slash-item-text">
            <span className="slash-item-title">{item.title}</span>
            <span className="slash-item-desc">{item.description}</span>
          </span>
        </button>
      ))}
    </div>
  );
});

SlashCommandList.displayName = "SlashCommandList";

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        startOfLine: false,
        command: ({ editor, range, props }: { editor: Editor; range: Range; props: SlashItem }) => {
          props.command({ editor, range });
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        items: ({ query }: { query: string }) =>
          ITEMS.filter((item) => item.title.toLowerCase().includes(query.toLowerCase())).slice(0, 10),
        render: () => {
          let component: ReactRenderer | null = null;
          let popup: Instance | null = null;

          return {
            onStart: (props: SuggestionProps<SlashItem>) => {
              component = new ReactRenderer(SlashCommandList, {
                props,
                editor: props.editor,
              });
              if (!props.clientRect) return;
              popup = tippy(document.body, {
                getReferenceClientRect: () => props.clientRect?.() ?? new DOMRect(),
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
                theme: "slash",
              });
            },
            onUpdate: (props: SuggestionProps<SlashItem>) => {
              component?.updateProps(props);
              if (props.clientRect) {
                popup?.setProps({ getReferenceClientRect: () => props.clientRect?.() ?? new DOMRect() });
              }
            },
            onKeyDown: (props: SuggestionKeyDownProps) => {
              if (props.event.key === "Escape") {
                popup?.hide();
                return true;
              }
              const ref = component?.ref as SlashCommandListRef | null;
              return ref?.onKeyDown(props) ?? false;
            },
            onExit: () => {
              popup?.destroy();
              component?.destroy();
            },
          };
        },
      }),
    ];
  },
});
