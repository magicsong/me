import './styles.scss'

import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import React from 'react'

const MenuBar = ({ editor }) => {
  if (!editor) {
    return null
  }

  return (
    <div className="border rounded-md p-2 mb-2 bg-gray-50">
      <div className="flex flex-wrap items-center gap-1">
        <div className="flex items-center border-r pr-1 mr-1">
          <button 
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} 
            className={`px-2 py-1 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-200 font-bold' : ''}`}
          >
            H1
          </button>
          <button 
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
            className={`px-2 py-1 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200 font-bold' : ''}`}
          >
            H2
          </button>
          <button 
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} 
            className={`px-2 py-1 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-200 font-bold' : ''}`}
          >
            H3
          </button>
          <button 
            onClick={() => editor.chain().focus().setParagraph().run()} 
            className={`px-2 py-1 rounded hover:bg-gray-200 ${editor.isActive('paragraph') ? 'bg-gray-200 font-bold' : ''}`}
          >
            P
          </button>
        </div>
        <div className="flex items-center border-r pr-1 mr-1">
          <button 
            onClick={() => editor.chain().focus().toggleBold().run()} 
            className={`px-2 py-1 rounded hover:bg-gray-200 ${editor.isActive('bold') ? 'bg-gray-200 font-bold' : ''}`}
          >
            B
          </button>
          <button 
            onClick={() => editor.chain().focus().toggleItalic().run()} 
            className={`px-2 py-1 rounded hover:bg-gray-200 ${editor.isActive('italic') ? 'bg-gray-200 italic' : ''}`}
          >
            I
          </button>
          <button 
            onClick={() => editor.chain().focus().toggleStrike().run()} 
            className={`px-2 py-1 rounded hover:bg-gray-200 ${editor.isActive('strike') ? 'bg-gray-200 line-through' : ''}`}
          >
            S
          </button>
          <button 
            onClick={() => editor.chain().focus().toggleHighlight().run()} 
            className={`px-2 py-1 rounded hover:bg-gray-200 ${editor.isActive('highlight') ? 'bg-yellow-200' : ''}`}
          >
            H
          </button>
        </div>
        <div className="flex items-center">
          <button 
            onClick={() => editor.chain().focus().setTextAlign('left').run()} 
            className={`px-2 py-1 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'left' }) ? 'bg-gray-200' : ''}`}
            title="左对齐"
          >
            ←
          </button>
          <button 
            onClick={() => editor.chain().focus().setTextAlign('center').run()} 
            className={`px-2 py-1 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'center' }) ? 'bg-gray-200' : ''}`}
            title="居中"
          >
            ↔
          </button>
          <button 
            onClick={() => editor.chain().focus().setTextAlign('right').run()} 
            className={`px-2 py-1 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'right' }) ? 'bg-gray-200' : ''}`}
            title="右对齐"
          >
            →
          </button>
          <button 
            onClick={() => editor.chain().focus().setTextAlign('justify').run()} 
            className={`px-2 py-1 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'justify' }) ? 'bg-gray-200' : ''}`}
            title="两端对齐"
          >
            ⇱⇲
          </button>
        </div>
      </div>
    </div>
  )
}

export default ({ content, onChange, placeholder }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight,
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange && onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl focus:outline-none max-w-none min-h-[150px] p-4 border rounded-md',
        ...(placeholder ? {'data-placeholder': placeholder} : {}),
      },
    },
  })

  return (
    <div className="tiptap-editor-wrapper">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} className="prose-container" />
    </div>
  )
}