import './styles.scss';

import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import React, { useEffect } from 'react';

export default function ReadOnlyTipTap({ content }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight,
    ],
    content: content || '',
    editable: false, // 设置为只读模式
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl max-w-none',
      },
    },
  });

  // 当content属性变化时更新编辑器内容
  useEffect(() => {
    if (editor && content) {
      // 只有当内容真正不同时才更新
      if (editor.getHTML() !== content) {
        editor.commands.setContent(content);
      }
    }
  }, [content, editor]);

  return (
    <div className="readonly-tiptap">
      <EditorContent editor={editor} />
    </div>
  );
}
