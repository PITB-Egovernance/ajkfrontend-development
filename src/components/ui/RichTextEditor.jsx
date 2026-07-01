import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Bold, Italic, Underline, Strikethrough,
  List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Indent, Outdent,
  Undo, Redo, RemoveFormatting,
  Highlighter, Baseline, ChevronDown, CaseSensitive,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const FONTS = [
  { label: 'Arial',           value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Calibri',         value: 'Calibri, sans-serif' },
  { label: 'Georgia',         value: 'Georgia, serif' },
  { label: 'Helvetica',       value: 'Helvetica, Arial, sans-serif' },
  { label: 'Verdana',         value: 'Verdana, sans-serif' },
  { label: 'Tahoma',          value: 'Tahoma, sans-serif' },
  { label: 'Trebuchet MS',    value: '"Trebuchet MS", sans-serif' },
  { label: 'Courier New',     value: '"Courier New", Courier, monospace' },
  { label: 'Impact',          value: 'Impact, fantasy' },
  { label: 'Comic Sans MS',   value: '"Comic Sans MS", cursive' },
];

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 48, 72];

const TEXT_CASES = [
  { label: 'Sentence case', value: 'sentence', example: 'Aa' },
  { label: 'UPPERCASE',     value: 'upper',    example: 'AA' },
  { label: 'lowercase',     value: 'lower',    example: 'aa' },
  { label: 'Title Case',    value: 'title',    example: 'Aa Bb' },
  { label: 'tOGGLE cASE',  value: 'toggle',   example: 'aAbB' },
];

const FORMAT_BLOCKS = [
  { label: 'Normal',    tag: 'p'  },
  { label: 'Heading 1', tag: 'h1' },
  { label: 'Heading 2', tag: 'h2' },
  { label: 'Heading 3', tag: 'h3' },
];

const TEXT_COLORS = [
  '#000000', '#1C1C1C', '#3D3D3D', '#595959', '#808080', '#A6A6A6', '#D1D1D1', '#FFFFFF',
  '#C00000', '#FF0000', '#FF6600', '#FF9900', '#FFCC00', '#FFFF00', '#99CC00', '#00B050',
  '#00CCFF', '#0070C0', '#003399', '#7030A0', '#FF00FF', '#FF6699', '#FF9966', '#FFFF99',
  '#CCFFCC', '#CCFFFF', '#99CCFF', '#CC99FF',
];

const HIGHLIGHT_COLORS = [
  { label: 'None',       value: 'transparent' },
  { label: 'Yellow',     value: '#FFFF00' },
  { label: 'Cyan',       value: '#00FFFF' },
  { label: 'Lime',       value: '#00FF00' },
  { label: 'Pink',       value: '#FFB6C1' },
  { label: 'Orange',     value: '#FFA500' },
  { label: 'Light Blue', value: '#ADD8E6' },
  { label: 'Lavender',   value: '#E6E6FA' },
  { label: 'Peach',      value: '#FFDAB9' },
];

const LINE_SPACINGS = ['1', '1.15', '1.5', '2', '2.5', '3'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const transformCase = (type, text) => {
  switch (type) {
    case 'upper':    return text.toUpperCase();
    case 'lower':    return text.toLowerCase();
    case 'title':    return text.replace(/\b\w/g, c => c.toUpperCase());
    case 'sentence': return text.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, c => c.toUpperCase());
    case 'toggle':   return text.split('').map(c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join('');
    default:         return text;
  }
};

// Walk all text nodes in a fragment and transform their text.
const applyTextCaseToFragment = (fragment, type) => {
  const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_TEXT, null, false);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(n => { n.textContent = transformCase(type, n.textContent); });
};

// Serialize a DocumentFragment to an HTML string.
const fragmentToHtml = (fragment) => {
  const div = document.createElement('div');
  div.appendChild(fragment.cloneNode(true));
  return div.innerHTML;
};

// ─── Component ────────────────────────────────────────────────────────────────

const RichTextEditor = ({
  value = '',
  onChange,
  placeholder = 'Type here…',
  minHeight = 200,
  disabled = false,
}) => {
  const ref = useRef(null);

  // Toolbar UI state
  const [fontFamily,     setFontFamily]     = useState('Arial, sans-serif');
  const [fontSize,       setFontSize]       = useState(12);
  const [fontSizeInput,  setFontSizeInput]  = useState('12');
  const [textColor,      setTextColor]      = useState('#000000');
  const [hlColor,        setHlColor]        = useState('transparent');
  const [lineSpacing,    setLineSpacing]    = useState('1.5');
  const [currentFormat,  setCurrentFormat]  = useState('Normal');

  // Dropdown open states — only one open at a time via closeAll()
  const [fontOpen,    setFontOpen]    = useState(false);
  const [sizeOpen,    setSizeOpen]    = useState(false);
  const [formatOpen,  setFormatOpen]  = useState(false);
  const [caseOpen,    setCaseOpen]    = useState(false);
  const [colorOpen,   setColorOpen]   = useState(false);
  const [hlOpen,      setHlOpen]      = useState(false);
  const [spacingOpen, setSpacingOpen] = useState(false);

  const closeAll = () => {
    setFontOpen(false); setSizeOpen(false); setFormatOpen(false);
    setCaseOpen(false); setColorOpen(false); setHlOpen(false); setSpacingOpen(false);
  };

  // Push external value into the div only when it genuinely differs.
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || '')) {
      ref.current.innerHTML = value || '';
    }
  }, [value]);

  const emitChange = useCallback(() => onChange?.(ref.current?.innerHTML || ''), [onChange]);

  useEffect(() => {
    document.execCommand('styleWithCSS', false, true);
  }, []);

  // Close all pickers on outside click.
  useEffect(() => {
    const close = (e) => {
      if (!e.target.closest('.rte-picker-anchor')) closeAll();
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const exec = useCallback((cmd, arg = null) => {
    if (disabled) return;
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    emitChange();
  }, [disabled, emitChange]);

  // ── Font family ────────────────────────────────────────────────────────────
  const applyFont = (font) => {
    setFontFamily(font);
    setFontOpen(false);
    if (disabled) return;
    ref.current?.focus();
    document.execCommand('fontName', false, font);
    emitChange();
  };

  // ── Font size ──────────────────────────────────────────────────────────────
  const applyFontSize = useCallback((pt) => {
    if (disabled) return;
    ref.current?.focus();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    if (sel.isCollapsed) {
      // No selection — just track the size state; the next typed char will not
      // automatically pick it up (execCommand limitation), so we insert a
      // zero-width span to seed the style at the cursor position.
      setFontSize(pt);
      setFontSizeInput(String(pt));
      return;
    }

    // Wrap selected content in a span with explicit font-size.
    const range = sel.getRangeAt(0);
    const fragment = range.cloneContents();
    const span = document.createElement('span');
    span.style.fontSize = `${pt}pt`;
    span.appendChild(fragment);
    range.deleteContents();
    range.insertNode(span);

    // Restore selection around the new span.
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    sel.removeAllRanges();
    sel.addRange(newRange);

    setFontSize(pt);
    setFontSizeInput(String(pt));
    setSizeOpen(false);
    emitChange();
  }, [disabled, emitChange]);

  const commitSizeInput = () => {
    const pt = parseInt(fontSizeInput, 10);
    if (pt >= 1 && pt <= 400) applyFontSize(pt);
    else setFontSizeInput(String(fontSize));
    setSizeOpen(false);
  };

  // ── Text case ──────────────────────────────────────────────────────────────
  const applyCase = useCallback((type) => {
    setCaseOpen(false);
    if (disabled) return;
    ref.current?.focus();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || sel.isCollapsed) return;

    const range = sel.getRangeAt(0);
    const fragment = range.cloneContents();
    applyTextCaseToFragment(fragment, type);
    const html = fragmentToHtml(fragment);
    range.deleteContents();
    document.execCommand('insertHTML', false, html);
    emitChange();
  }, [disabled, emitChange]);

  // ── Text / highlight colour ────────────────────────────────────────────────
  const applyTextColor = (color) => {
    setTextColor(color);
    setColorOpen(false);
    exec('foreColor', color);
  };

  const applyHighlight = (color) => {
    setHlColor(color);
    setHlOpen(false);
    if (color === 'transparent') { exec('hiliteColor', 'transparent'); exec('backColor', 'transparent'); }
    else exec('hiliteColor', color);
  };

  // ── Line spacing ───────────────────────────────────────────────────────────
  const applyLineSpacing = (val) => {
    setLineSpacing(val);
    setSpacingOpen(false);
    if (!ref.current) return;
    const sel = window.getSelection();
    let node = sel?.rangeCount ? sel.getRangeAt(0).commonAncestorContainer : null;
    if (node?.nodeType === Node.TEXT_NODE) node = node.parentNode;
    while (node && node !== ref.current) {
      if (['p','h1','h2','h3','h4','li','div','blockquote'].includes(node.tagName?.toLowerCase())) {
        node.style.lineHeight = val; emitChange(); return;
      }
      node = node.parentNode;
    }
    ref.current.style.lineHeight = val;
    emitChange();
  };

  // ── Block format ───────────────────────────────────────────────────────────
  const applyFormat = (item) => {
    setCurrentFormat(item.label);
    setFormatOpen(false);
    exec('formatBlock', item.tag === 'p' ? 'p' : `<${item.tag}>`);
  };

  // ── Toolbar sub-components ─────────────────────────────────────────────────
  const Btn = ({ cmd, arg, title, children }) => (
    <button
      type="button" title={title} aria-label={title}
      onMouseDown={(e) => { e.preventDefault(); exec(cmd, arg); }}
      disabled={disabled}
      className="p-1.5 rounded text-slate-600 hover:bg-slate-200 disabled:opacity-40 transition-colors"
    >
      {children}
    </button>
  );

  const Sep = () => <span className="w-px h-5 bg-slate-200 mx-0.5 flex-shrink-0" />;

  const DropBtn = ({ label, title, open, onToggle, minW = 72, children }) => (
    <div className="rte-picker-anchor">
      <button
        type="button" title={title}
        onMouseDown={(e) => { e.preventDefault(); closeAll(); onToggle(); }}
        disabled={disabled}
        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 rounded hover:bg-slate-200 border border-slate-200 bg-white whitespace-nowrap"
        style={{ minWidth: minW }}
      >
        {label} <ChevronDown size={11} className="flex-shrink-0" />
      </button>
      {open && children}
    </div>
  );

  const currentFontLabel = FONTS.find(f => f.value === fontFamily)?.label ?? 'Arial';

  return (
    <div className={`border border-slate-300 rounded-lg overflow-hidden ${disabled ? 'opacity-60' : ''}`}>
      <style>{`
        .rte-content:empty:before { content: attr(data-placeholder); color: #94a3b8; pointer-events: none; }
        .rte-content ul  { list-style: disc;    padding-left: 1.5rem; }
        .rte-content ol  { list-style: decimal; padding-left: 1.5rem; }
        .rte-content h1  { font-size: 1.5rem;   font-weight: 700; margin: 0.5rem 0; }
        .rte-content h2  { font-size: 1.25rem;  font-weight: 700; margin: 0.5rem 0; }
        .rte-content h3  { font-size: 1.1rem;   font-weight: 600; margin: 0.4rem 0; }
        .rte-content p   { margin: 0.25rem 0; }
        .rte-picker      { position: absolute; z-index: 9999; background: #fff; border: 1px solid #e2e8f0;
                           border-radius: 8px; box-shadow: 0 6px 20px rgba(0,0,0,.13); padding: 8px;
                           margin-top: 2px; }
        .rte-picker-anchor { position: relative; display: inline-flex; }
      `}</style>

      {/* ── Row 1: Font · Size · Format · B I U S · Case ─────────────────── */}
      <div className="flex items-center gap-0.5 flex-wrap border-b border-slate-100 bg-slate-50 px-2 py-1">

        {/* Font family */}
        <DropBtn label={currentFontLabel} title="Font Family" open={fontOpen}
          onToggle={() => setFontOpen(o => !o)} minW={110}>
          <div className="rte-picker" style={{ minWidth: 170, maxHeight: 260, overflowY: 'auto' }}>
            <p className="text-xs text-slate-500 font-semibold mb-1 px-1">Font</p>
            {FONTS.map(f => (
              <button key={f.value} type="button"
                onMouseDown={(e) => { e.preventDefault(); applyFont(f.value); }}
                style={{ fontFamily: f.value }}
                className={`block w-full text-left px-3 py-1.5 text-sm rounded hover:bg-slate-100 ${fontFamily === f.value ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'text-slate-800'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </DropBtn>

        {/* Font size */}
        <div className="rte-picker-anchor">
          <div className="flex items-center border border-slate-200 rounded bg-white overflow-hidden">
            <input
              type="number" min="1" max="400"
              value={fontSizeInput}
              onChange={(e) => setFontSizeInput(e.target.value)}
              onBlur={commitSizeInput}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitSizeInput(); } }}
              disabled={disabled}
              className="w-9 text-center text-xs font-medium text-slate-700 py-1 border-none outline-none bg-transparent"
              title="Font size (pt)"
            />
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); closeAll(); setSizeOpen(o => !o); }}
              disabled={disabled}
              className="px-0.5 py-1 text-slate-400 hover:bg-slate-100 border-l border-slate-200"
            >
              <ChevronDown size={11} />
            </button>
          </div>
          {sizeOpen && (
            <div className="rte-picker" style={{ minWidth: 70, maxHeight: 220, overflowY: 'auto', right: 0 }}>
              {FONT_SIZES.map(s => (
                <button key={s} type="button"
                  onMouseDown={(e) => { e.preventDefault(); applyFontSize(s); }}
                  className={`block w-full text-left px-3 py-1 text-sm rounded hover:bg-slate-100 ${fontSize === s ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'text-slate-700'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <Sep />

        {/* Block format */}
        <DropBtn label={currentFormat} title="Paragraph Style" open={formatOpen}
          onToggle={() => setFormatOpen(o => !o)} minW={80}>
          <div className="rte-picker" style={{ minWidth: 130 }}>
            {FORMAT_BLOCKS.map(item => (
              <button key={item.tag} type="button"
                onMouseDown={(e) => { e.preventDefault(); applyFormat(item); }}
                className={`block w-full text-left px-3 py-1.5 text-sm rounded hover:bg-slate-100 ${currentFormat === item.label ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'text-slate-700'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </DropBtn>

        <Sep />

        {/* B I U S */}
        <Btn cmd="bold"          title="Bold (Ctrl+B)">       <Bold          size={15} /></Btn>
        <Btn cmd="italic"        title="Italic (Ctrl+I)">     <Italic        size={15} /></Btn>
        <Btn cmd="underline"     title="Underline (Ctrl+U)">  <Underline     size={15} /></Btn>
        <Btn cmd="strikeThrough" title="Strikethrough">       <Strikethrough size={15} /></Btn>

        <Sep />

        {/* Text case */}
        <DropBtn label={<span className="flex items-center gap-1"><CaseSensitive size={14} /> Aa</span>}
          title="Change Case" open={caseOpen} onToggle={() => setCaseOpen(o => !o)} minW={58}>
          <div className="rte-picker" style={{ minWidth: 160 }}>
            <p className="text-xs text-slate-500 font-semibold mb-1 px-1">Change Case</p>
            {TEXT_CASES.map(c => (
              <button key={c.value} type="button"
                onMouseDown={(e) => { e.preventDefault(); applyCase(c.value); }}
                className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm rounded hover:bg-slate-100 text-slate-700"
              >
                <span className="w-10 text-xs font-mono text-slate-400">{c.example}</span>
                {c.label}
              </button>
            ))}
          </div>
        </DropBtn>

        <Sep />

        {/* Undo / Redo / Clear */}
        <Btn cmd="undo" title="Undo (Ctrl+Z)"><Undo size={15} /></Btn>
        <Btn cmd="redo" title="Redo (Ctrl+Y)"><Redo size={15} /></Btn>
        <Btn cmd="removeFormat" title="Clear Formatting"><RemoveFormatting size={15} /></Btn>
      </div>

      {/* ── Row 2: Colors · Align · Lists · Indent · Spacing ─────────────── */}
      <div className="flex items-center gap-0.5 flex-wrap border-b border-slate-200 bg-slate-50 px-2 py-1">

        {/* Text colour */}
        <div className="rte-picker-anchor">
          <button type="button" title="Text Color"
            onMouseDown={(e) => { e.preventDefault(); closeAll(); setColorOpen(o => !o); }}
            disabled={disabled}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 flex flex-col items-center gap-0.5"
          >
            <Baseline size={15} />
            <span className="w-4 h-1 rounded-sm" style={{ backgroundColor: textColor }} />
          </button>
          {colorOpen && (
            <div className="rte-picker" style={{ minWidth: 180 }}>
              <p className="text-xs text-slate-500 font-semibold mb-2 px-1">Text Color</p>
              <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(8, 1.5rem)' }}>
                {TEXT_COLORS.map(c => (
                  <button key={c} type="button" title={c}
                    onMouseDown={(e) => { e.preventDefault(); applyTextColor(c); }}
                    className="w-6 h-6 rounded border border-slate-200 hover:scale-110 transition-transform"
                    style={{ backgroundColor: c, outline: textColor === c ? '2px solid #059669' : 'none', outlineOffset: 1 }}
                  />
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2 border-t border-slate-100 pt-2">
                <span className="text-xs text-slate-500">Custom:</span>
                <input type="color" value={textColor} onChange={(e) => applyTextColor(e.target.value)}
                  className="w-8 h-6 rounded border border-slate-200 cursor-pointer p-0" />
              </div>
            </div>
          )}
        </div>

        {/* Highlight colour */}
        <div className="rte-picker-anchor">
          <button type="button" title="Highlight Color"
            onMouseDown={(e) => { e.preventDefault(); closeAll(); setHlOpen(o => !o); }}
            disabled={disabled}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 flex flex-col items-center gap-0.5"
          >
            <Highlighter size={15} />
            <span className="w-4 h-1 rounded-sm border border-slate-200"
              style={{ backgroundColor: hlColor === 'transparent' ? '#fff' : hlColor }} />
          </button>
          {hlOpen && (
            <div className="rte-picker" style={{ minWidth: 168 }}>
              <p className="text-xs text-slate-500 font-semibold mb-2 px-1">Highlight Color</p>
              <div className="flex flex-wrap gap-1">
                {HIGHLIGHT_COLORS.map(c => (
                  <button key={c.value} type="button" title={c.label}
                    onMouseDown={(e) => { e.preventDefault(); applyHighlight(c.value); }}
                    className="w-7 h-7 rounded border hover:scale-110 transition-transform flex items-center justify-center text-xs"
                    style={{
                      backgroundColor: c.value === 'transparent' ? '#fff' : c.value,
                      borderColor: hlColor === c.value ? '#059669' : '#e2e8f0',
                      borderWidth: hlColor === c.value ? 2 : 1,
                    }}
                  >
                    {c.value === 'transparent' && <span className="text-slate-400">✕</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <Sep />

        {/* Alignment */}
        <Btn cmd="justifyLeft"   title="Align Left">    <AlignLeft    size={15} /></Btn>
        <Btn cmd="justifyCenter" title="Align Center">  <AlignCenter  size={15} /></Btn>
        <Btn cmd="justifyRight"  title="Align Right">   <AlignRight   size={15} /></Btn>
        <Btn cmd="justifyFull"   title="Justify">       <AlignJustify size={15} /></Btn>

        <Sep />

        {/* Lists + indent */}
        <Btn cmd="insertUnorderedList" title="Bullet List">     <List        size={15} /></Btn>
        <Btn cmd="insertOrderedList"   title="Numbered List">   <ListOrdered size={15} /></Btn>
        <Btn cmd="outdent"             title="Decrease Indent"> <Outdent     size={15} /></Btn>
        <Btn cmd="indent"              title="Increase Indent"> <Indent      size={15} /></Btn>

        <Sep />

        {/* Line spacing */}
        <DropBtn
          label={
            <span className="flex items-center gap-1">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
                <polyline points="8 4 5 7 2 4"/><polyline points="8 20 5 17 2 20"/>
              </svg>
              {lineSpacing}
            </span>
          }
          title="Line Spacing" open={spacingOpen}
          onToggle={() => setSpacingOpen(o => !o)} minW={60}>
          <div className="rte-picker" style={{ minWidth: 110 }}>
            <p className="text-xs text-slate-500 font-semibold mb-1 px-1">Line Spacing</p>
            {LINE_SPACINGS.map(s => (
              <button key={s} type="button"
                onMouseDown={(e) => { e.preventDefault(); applyLineSpacing(s); }}
                className={`block w-full text-left px-3 py-1.5 text-sm rounded hover:bg-slate-100 ${lineSpacing === s ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'text-slate-700'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </DropBtn>
      </div>

      {/* ── Editor surface ────────────────────────────────────────────────── */}
      <div
        ref={ref}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={emitChange}
        onBlur={emitChange}
        data-placeholder={placeholder}
        className="rte-content px-3 py-2 text-sm text-slate-800 focus:outline-none overflow-auto"
        style={{ minHeight, lineHeight: lineSpacing, fontFamily }}
      />
    </div>
  );
};

export default RichTextEditor;
