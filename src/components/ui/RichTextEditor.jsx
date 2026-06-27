import React, { useRef, useEffect } from 'react';
import {
  Bold, Italic, Underline, List, ListOrdered,
  Heading2, Undo, Redo, RemoveFormatting,
} from 'lucide-react';

// Lightweight, dependency-free rich text editor built on a contentEditable
// surface and document.execCommand. Emits its HTML via onChange so callers can
// store it as a string. Good enough for admin-authored note/instruction text
// without pulling in a heavy editor library.
const RichTextEditor = ({
  value = '',
  onChange,
  placeholder = 'Type here…',
  minHeight = 200,
  disabled = false,
}) => {
  const ref = useRef(null);

  // Push external value into the editable div, but only when it actually
  // differs from what's already rendered — otherwise we'd reset the caret on
  // every keystroke while the user is typing.
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || '')) {
      ref.current.innerHTML = value || '';
    }
  }, [value]);

  const emitChange = () => onChange?.(ref.current?.innerHTML || '');

  const exec = (command, arg = null) => {
    if (disabled) return;
    document.execCommand(command, false, arg);
    ref.current?.focus();
    emitChange();
  };

  const Btn = ({ cmd, arg, title, children }) => (
    <button
      type="button"
      title={title}
      aria-label={title}
      // onMouseDown + preventDefault keeps the editor's selection while clicking.
      onMouseDown={(e) => { e.preventDefault(); exec(cmd, arg); }}
      className="p-1.5 rounded hover:bg-slate-100 text-slate-600 disabled:opacity-40"
      disabled={disabled}
    >
      {children}
    </button>
  );

  return (
    <div className={`border border-slate-300 rounded-lg overflow-hidden ${disabled ? 'opacity-60' : ''}`}>
      <style>{`
        .rte-content:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8;
          pointer-events: none;
        }
        .rte-content ul { list-style: disc; padding-left: 1.5rem; }
        .rte-content ol { list-style: decimal; padding-left: 1.5rem; }
        .rte-content h2 { font-size: 1.125rem; font-weight: 700; margin: 0.5rem 0; }
      `}</style>

      <div className="flex items-center gap-0.5 flex-wrap border-b border-slate-200 bg-slate-50 px-2 py-1">
        <Btn cmd="bold" title="Bold"><Bold size={16} /></Btn>
        <Btn cmd="italic" title="Italic"><Italic size={16} /></Btn>
        <Btn cmd="underline" title="Underline"><Underline size={16} /></Btn>
        <span className="w-px h-5 bg-slate-200 mx-1" />
        <Btn cmd="formatBlock" arg="<h2>" title="Heading"><Heading2 size={16} /></Btn>
        <Btn cmd="insertUnorderedList" title="Bullet list"><List size={16} /></Btn>
        <Btn cmd="insertOrderedList" title="Numbered list"><ListOrdered size={16} /></Btn>
        <span className="w-px h-5 bg-slate-200 mx-1" />
        <Btn cmd="undo" title="Undo"><Undo size={16} /></Btn>
        <Btn cmd="redo" title="Redo"><Redo size={16} /></Btn>
        <Btn cmd="removeFormat" title="Clear formatting"><RemoveFormatting size={16} /></Btn>
      </div>

      <div
        ref={ref}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={emitChange}
        onBlur={emitChange}
        data-placeholder={placeholder}
        className="rte-content px-3 py-2 text-sm text-slate-800 leading-relaxed focus:outline-none overflow-auto"
        style={{ minHeight }}
      />
    </div>
  );
};

export default RichTextEditor;
