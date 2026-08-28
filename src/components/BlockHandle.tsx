"use client";

import React, { useState } from "react";
import { DragHandle } from "@tiptap/extension-drag-handle-react";
import type { Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";

interface HandleData {
  editor: Editor;
  node: PMNode | null;
  pos: number;
}

function deleteBlock(editor: Editor, data: HandleData | null) {
  if (!data || !data.node || data.pos < 0) return;
  editor.chain().focus().deleteRange({ from: data.pos, to: data.pos + data.node.nodeSize }).run();
}

function duplicateBlock(editor: Editor, data: HandleData | null) {
  if (!data || !data.node || data.pos < 0) return;
  const json = data.node.toJSON();
  editor.chain().focus().insertContentAt(data.pos + data.node.nodeSize, json).run();
}

function addBelow(editor: Editor, data: HandleData | null) {
  if (!data || !data.node || data.pos < 0) return;
  editor.chain().focus().insertContentAt(data.pos + data.node.nodeSize, { type: "paragraph" }).run();
}

export default function BlockHandle({ editor }: { editor: Editor }) {
  const [current, setCurrent] = useState<HandleData | null>(null);
  const [menuData, setMenuData] = useState<HandleData | null>(null);
  const [open, setOpen] = useState(false);

  const toggleMenu = () => {
    if (open) {
      setOpen(false);
      return;
    }
    if (current && current.node) {
      setMenuData(current);
      setOpen(true);
    }
  };

  return (
    <DragHandle editor={editor} onNodeChange={(data: HandleData) => setCurrent(data)}>
      <div className="block-handle" contentEditable={false}>
        <button
          type="button"
          className="block-handle-btn"
          title="Opciones del bloque"
          onMouseDown={(e) => e.preventDefault()}
          onClick={toggleMenu}
        >
          ⠿
        </button>
        {open && menuData && menuData.node && (
          <div className="block-handle-menu" onMouseDown={(e) => e.preventDefault()}>
            <button onClick={() => { deleteBlock(editor, menuData); setOpen(false); }}>🗑 Eliminar</button>
            <button onClick={() => { duplicateBlock(editor, menuData); setOpen(false); }}>⧉ Duplicar</button>
            <button onClick={() => { addBelow(editor, menuData); setOpen(false); }}>＋ Añadir abajo</button>
          </div>
        )}
      </div>
    </DragHandle>
  );
}
