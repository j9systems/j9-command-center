import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Italic, List, ListOrdered, Heading2, Undo, Redo } from 'lucide-react'

interface RichTextEditorProps {
  content: string
  onSave: (html: string) => void
  onCancel: () => void
  saving?: boolean
}

export default function RichTextEditor({ content, onSave, onCancel, saving }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm max-w-none min-h-[120px] px-3 py-2 focus:outline-none text-text-primary',
      },
    },
  })

  if (!editor) return null

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-black/20">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-surface/50 flex-wrap">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded hover:bg-surface-hover transition-colors ${editor.isActive('bold') ? 'bg-purple-muted text-purple' : 'text-text-secondary'}`}
          title="Bold"
        >
          <Bold size={14} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded hover:bg-surface-hover transition-colors ${editor.isActive('italic') ? 'bg-purple-muted text-purple' : 'text-text-secondary'}`}
          title="Italic"
        >
          <Italic size={14} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1.5 rounded hover:bg-surface-hover transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-purple-muted text-purple' : 'text-text-secondary'}`}
          title="Heading"
        >
          <Heading2 size={14} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded hover:bg-surface-hover transition-colors ${editor.isActive('bulletList') ? 'bg-purple-muted text-purple' : 'text-text-secondary'}`}
          title="Bullet List"
        >
          <List size={14} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded hover:bg-surface-hover transition-colors ${editor.isActive('orderedList') ? 'bg-purple-muted text-purple' : 'text-text-secondary'}`}
          title="Ordered List"
        >
          <ListOrdered size={14} />
        </button>
        <div className="w-px h-4 bg-border mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-1.5 rounded hover:bg-surface-hover transition-colors text-text-secondary disabled:opacity-30"
          title="Undo"
        >
          <Undo size={14} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-1.5 rounded hover:bg-surface-hover transition-colors text-text-secondary disabled:opacity-30"
          title="Redo"
        >
          <Redo size={14} />
        </button>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />

      {/* Actions */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-border">
        <button
          onClick={() => onSave(editor.getHTML())}
          disabled={saving}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-4 py-1.5 rounded-lg bg-purple text-white hover:bg-purple-hover transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-4 py-1.5 rounded-lg border border-border text-text-secondary hover:text-text-primary transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
