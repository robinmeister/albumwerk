import { IconButton } from "@astryxdesign/core/IconButton";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import {
  Bold,
  Code,
  Code2,
  FileCode,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";
import * as stylex from "@stylexjs/stylex";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ReactElement, ReactNode, useEffect, useState } from "react";

type Props = {
  label: string;
  value: string;
  onChange: (html: string) => void;
  /** Height of the writing area before it starts to scroll. */
  minHeight?: number;
};

const s = stylex.create({
  wrapper: { display: "flex", flexDirection: "column", gap: 6 },
  frame: {
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-element)",
    backgroundColor: "var(--color-background-surface)",
    overflow: "hidden",
  },
  toolbar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 2,
    padding: 6,
    borderBottom: "1px solid var(--color-border)",
    backgroundColor: "var(--color-background-muted)",
  },
  separator: {
    width: 1,
    alignSelf: "stretch",
    marginInline: 4,
    backgroundColor: "var(--color-border)",
  },
  spacer: { flex: 1 },
  content: (minHeight: number) => ({
    padding: "12px 16px",
    minHeight,
    maxHeight: 640,
    overflowY: "auto",
  }),
  source: { padding: 8 },
});

function ToolButton({
  icon,
  label,
  isActive,
  isDisabled,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  isActive?: boolean;
  isDisabled?: boolean;
  onClick: () => void;
}) {
  return (
    <IconButton
      icon={icon}
      label={label}
      tooltip={label}
      size="sm"
      variant={isActive ? "secondary" : "ghost"}
      isDisabled={isDisabled}
      onClick={onClick}
    />
  );
}

function Toolbar({ editor }: { editor: Editor }): ReactElement {
  // v3 no longer re-renders on every transaction, so the button states are
  // subscribed to explicitly.
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bulletList: e.isActive("bulletList"),
      orderedList: e.isActive("orderedList"),
      blockquote: e.isActive("blockquote"),
      link: e.isActive("link"),
      code: e.isActive("code"),
      codeBlock: e.isActive("codeBlock"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const promptLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const href = window.prompt("Link-Ziel (leer lassen zum Entfernen)", previous ?? "https://");
    if (href === null) return;
    if (href.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
  };

  return (
    <>
      <ToolButton icon={<Bold />} label="Fett" isActive={state.bold}
        onClick={() => editor.chain().focus().toggleBold().run()} />
      <ToolButton icon={<Italic />} label="Kursiv" isActive={state.italic}
        onClick={() => editor.chain().focus().toggleItalic().run()} />
      <ToolButton icon={<Underline />} label="Unterstrichen" isActive={state.underline}
        onClick={() => editor.chain().focus().toggleUnderline().run()} />
      <ToolButton icon={<Strikethrough />} label="Durchgestrichen" isActive={state.strike}
        onClick={() => editor.chain().focus().toggleStrike().run()} />

      <span {...stylex.props(s.separator)} />

      <ToolButton icon={<Heading2 />} label="Überschrift" isActive={state.h2}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
      <ToolButton icon={<Heading3 />} label="Unterüberschrift" isActive={state.h3}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
      <ToolButton icon={<List />} label="Aufzählung" isActive={state.bulletList}
        onClick={() => editor.chain().focus().toggleBulletList().run()} />
      <ToolButton icon={<ListOrdered />} label="Nummerierte Liste" isActive={state.orderedList}
        onClick={() => editor.chain().focus().toggleOrderedList().run()} />
      <ToolButton icon={<Quote />} label="Zitat" isActive={state.blockquote}
        onClick={() => editor.chain().focus().toggleBlockquote().run()} />
      <ToolButton icon={<Minus />} label="Trennlinie"
        onClick={() => editor.chain().focus().setHorizontalRule().run()} />

      <span {...stylex.props(s.separator)} />

      <ToolButton icon={<LinkIcon />} label="Link" isActive={state.link} onClick={promptLink} />
      <ToolButton icon={<Code />} label="Code (inline)" isActive={state.code}
        onClick={() => editor.chain().focus().toggleCode().run()} />
      <ToolButton icon={<Code2 />} label="Code-Block" isActive={state.codeBlock}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()} />

      <span {...stylex.props(s.separator)} />

      <ToolButton icon={<Undo2 />} label="Rückgängig" isDisabled={!state.canUndo}
        onClick={() => editor.chain().focus().undo().run()} />
      <ToolButton icon={<Redo2 />} label="Wiederholen" isDisabled={!state.canRedo}
        onClick={() => editor.chain().focus().redo().run()} />
    </>
  );
}

// Rich text editor for the admin-maintained legal pages. Markdown shortcuts
// (`## `, `- `, `1. `, `> `, ```` ``` ````, `**bold**`) come from StarterKit's
// input rules; the HTML toggle exposes the stored markup for direct editing.
export default function RichTextEditor(props: Props): ReactElement {
  const { label, value, onChange, minHeight = 320 } = props;
  const [showSource, setShowSource] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false, autolink: true },
      }),
    ],
    content: value,
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
    editorProps: { attributes: { class: "rich-text", "aria-label": label } },
  });

  // Pull in changes that came from outside (settings load, template generator,
  // or the HTML view). Guarded against the editor's own updates echoing back.
  useEffect(() => {
    if (!editor || value === editor.getHTML()) return;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  return (
    <div {...stylex.props(s.wrapper)}>
      <Text type="supporting" color="secondary">{label}</Text>

      <div {...stylex.props(s.frame)}>
        <div {...stylex.props(s.toolbar)}>
          {editor && !showSource && <Toolbar editor={editor} />}
          <span {...stylex.props(s.spacer)} />
          <ToolButton
            icon={<FileCode />}
            label={showSource ? "Zurück zum Editor" : "HTML bearbeiten"}
            isActive={showSource}
            onClick={() => setShowSource((v) => !v)}
          />
        </div>

        {showSource ? (
          <div {...stylex.props(s.source)}>
            <TextArea
              width="100%"
              rows={20}
              label={`${label} (HTML)`}
              isLabelHidden
              value={value}
              onChange={onChange}
            />
          </div>
        ) : (
          <EditorContent editor={editor} {...stylex.props(s.content(minHeight))} />
        )}
      </div>

      {showSource && (
        <Text type="supporting" color="secondary">
          Beim Zurückwechseln wird das HTML normalisiert — Tags, die der Editor nicht kennt, gehen dabei verloren.
        </Text>
      )}
    </div>
  );
}
