import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Bold, Italic, Underline, Strikethrough,
  List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Indent, Outdent,
  Undo, Redo, RemoveFormatting,
  Highlighter, Baseline, ChevronDown, CaseSensitive,
  Link2, Unlink, Image as ImageIcon, Loader2,
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

const escapeHtml = (str) =>
  String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Only web links, mail/phone links, in-page anchors and site-relative paths are allowed —
// never javascript:/data:/vbscript:. A bare "example.com" gets https:// in front.
export const normalizeLinkUrl = (raw) => {
  const v = String(raw ?? '').trim();
  if (!v) return null;
  if (/^(javascript|data|vbscript|file):/i.test(v)) return null;
  if (/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(v)) return v;
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return null; // some other scheme
  return /^[^\s/]+\.[^\s/]+/.test(v) ? `https://${v}` : null;
};

// Images: http(s) or a site-relative path only.
export const normalizeImageUrl = (raw) => {
  const v = String(raw ?? '').trim();
  return /^(https?:\/\/|\/)/i.test(v) ? v : null;
};

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// New images go in at a presentable size (never full width) so there is room to write beside
// and around them; click an image to change its size or alignment.
const DEFAULT_IMAGE_WIDTH = 300;
const IMAGE_SIZES = [
  { label: 'Small',  title: 'Small (150 px)',  width: '150px' },
  { label: 'Medium', title: 'Medium (300 px)', width: '300px' },
  { label: 'Large',  title: 'Large (500 px)',  width: '500px' },
  { label: 'Full',   title: 'Full width',      width: '100%' },
];
const IMAGE_ALIGNS = [
  { key: 'inline', label: 'Inline', title: 'In the line of text' },
  { key: 'left',   label: 'Left',   title: 'Left, text wraps on the right' },
  { key: 'center', label: 'Center', title: 'Centered on its own line' },
  { key: 'right',  label: 'Right',  title: 'Right, text wraps on the left' },
];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Where the image sits, by dropping it: left third = floats left (text wraps on its right), right
// third = floats right (text wraps on its left), middle = its own line (text above and below).
const dropZone = (x, rect) => {
  const f = rect.width > 0 ? (x - rect.left) / rect.width : 0.5;
  if (f < 0.33) return 'left';
  if (f > 0.67) return 'right';
  return 'center';
};

const ZONE_HINT = {
  left:   'Image on the left · text wraps on the right',
  right:  'Image on the right · text wraps on the left',
  center: 'Image on its own line · text above and below',
};

// Text position under the pointer (Chrome/Edge/Safari vs Firefox spell it differently).
const rangeFromPoint = (x, y) => {
  if (document.caretRangeFromPoint) return document.caretRangeFromPoint(x, y);
  if (document.caretPositionFromPoint) {
    const pos = document.caretPositionFromPoint(x, y);
    if (!pos) return null;
    const range = document.createRange();
    range.setStart(pos.offsetNode, pos.offset);
    range.collapse(true);
    return range;
  }
  return null;
};

// Same look the toolbar's Left / Center / Right / Inline buttons give.
const alignImageElement = (img, kind) => {
  const st = img.style;
  st.float = ''; st.display = ''; st.margin = ''; st.marginLeft = ''; st.marginRight = ''; st.marginTop = ''; st.marginBottom = '';
  if (kind === 'left')   { st.float = 'left';  st.margin = '4px 14px 8px 0'; }
  if (kind === 'right')  { st.float = 'right'; st.margin = '4px 0 8px 14px'; }
  if (kind === 'center') { st.display = 'block'; st.marginLeft = 'auto'; st.marginRight = 'auto'; st.marginTop = '8px'; st.marginBottom = '8px'; }
};

const MIN_IMAGE_WIDTH = 40;
const RESIZE_CORNERS = [
  { key: 'nw', cursor: 'nwse-resize', style: { top: -6, left: -6 } },
  { key: 'ne', cursor: 'nesw-resize', style: { top: -6, right: -6 } },
  { key: 'sw', cursor: 'nesw-resize', style: { bottom: -6, left: -6 } },
  { key: 'se', cursor: 'nwse-resize', style: { bottom: -6, right: -6 } },
];

// ─── Component ────────────────────────────────────────────────────────────────

const RichTextEditor = ({
  value = '',
  onChange,
  placeholder = 'Type here…',
  minHeight = 200,
  disabled = false,
  // async (File) => absolute image URL. When given, the toolbar can upload images and pasted
  // images are uploaded instead of embedded; without it images can only be added by URL.
  onImageUpload,
}) => {
  const ref = useRef(null);
  const rootRef = useRef(null);

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

  // Link / image tools
  const [linkOpen,    setLinkOpen]    = useState(false);
  const [linkUrl,     setLinkUrl]     = useState('');
  const [linkText,    setLinkText]    = useState('');
  const [linkNewTab,  setLinkNewTab]  = useState(true);
  const [imageOpen,   setImageOpen]   = useState(false);
  const [imageUrl,    setImageUrl]    = useState('');
  const [imageAlt,    setImageAlt]    = useState('');
  const [uploading,   setUploading]   = useState(false);
  const [toolError,   setToolError]   = useState('');
  const savedRange = useRef(null);
  const fileInputRef = useRef(null);

  // The image currently selected in the text (click an image) and where it sits, so the
  // size / alignment bar can float next to it.
  const selImgRef = useRef(null);
  const [imgBox, setImgBox] = useState(null);
  const [sizeLabel, setSizeLabel] = useState(null);   // live "347 px" while resizing
  const [dragUi, setDragUi] = useState(null);         // ghost + drop caret while moving an image
  const justDraggedRef = useRef(false);               // swallow the click that follows a drag

  const closeAll = () => {
    setFontOpen(false); setSizeOpen(false); setFormatOpen(false);
    setCaseOpen(false); setColorOpen(false); setHlOpen(false); setSpacingOpen(false);
    setLinkOpen(false); setImageOpen(false); setToolError('');
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

  // ── Links & images ─────────────────────────────────────────────────────────
  // The picker inputs take focus away from the editor, so remember where the caret / selection
  // was and put it back before inserting.
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && ref.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    ref.current?.focus();
    const sel = window.getSelection();
    if (!sel) return;
    if (savedRange.current) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    } else if (ref.current) {
      const range = document.createRange();
      range.selectNodeContents(ref.current);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  const anchorAtSelection = () => {
    const sel = window.getSelection();
    let node = sel?.rangeCount ? sel.anchorNode : null;
    if (node?.nodeType === Node.TEXT_NODE) node = node.parentNode;
    const a = node?.closest?.('a');
    return a && ref.current?.contains(a) ? a : null;
  };

  const openLinkPicker = () => {
    if (disabled) return;
    closeAll();
    saveSelection();
    const existing = anchorAtSelection();
    setLinkUrl(existing?.getAttribute('href') || '');
    setLinkText(existing ? existing.textContent : (window.getSelection()?.toString() || ''));
    setLinkNewTab(existing ? existing.getAttribute('target') === '_blank' : true);
    setLinkOpen(true);
  };

  const applyLink = () => {
    const url = normalizeLinkUrl(linkUrl);
    if (!url) { setToolError('Enter a valid web address, e.g. https://ajkpsc.gov.pk'); return; }
    restoreSelection();
    const sel = window.getSelection();
    const existing = anchorAtSelection();

    if (existing) {
      existing.setAttribute('href', url);
      if (linkText.trim()) existing.textContent = linkText;
    } else if (!sel || sel.isCollapsed) {
      document.execCommand('insertHTML', false, `<a href="${escapeHtml(url)}">${escapeHtml(linkText.trim() || url)}</a>`);
    } else {
      document.execCommand('createLink', false, url);
    }

    ref.current?.querySelectorAll('a').forEach((a) => {
      if (a.getAttribute('href') !== url) return;
      if (linkNewTab) { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener noreferrer'); }
      else { a.removeAttribute('target'); a.removeAttribute('rel'); }
    });
    setLinkOpen(false);
    setToolError('');
    emitChange();
  };

  const removeLink = () => {
    restoreSelection();
    document.execCommand('unlink');
    setLinkOpen(false);
    emitChange();
  };

  const openImagePicker = () => {
    if (disabled) return;
    closeAll();
    saveSelection();
    setImageUrl('');
    setImageAlt('');
    setImageOpen(true);
  };

  const insertImage = (url, alt = '') => {
    restoreSelection();
    document.execCommand(
      'insertHTML',
      false,
      `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" style="width:${DEFAULT_IMAGE_WIDTH}px;max-width:100%;height:auto;" />`
    );
    emitChange();
  };

  const applyImageUrl = () => {
    const url = normalizeImageUrl(imageUrl);
    if (!url) { setToolError('Enter the full image address, starting with https://'); return; }
    insertImage(url, imageAlt);
    setImageOpen(false);
    setToolError('');
  };

  const uploadImageFile = async (file) => {
    if (!onImageUpload || !file) return;
    if (!IMAGE_TYPES.includes(file.type)) { setToolError('Only JPG, PNG, GIF or WEBP images can be added.'); return; }
    if (file.size > MAX_IMAGE_BYTES) { setToolError('The image is larger than 5 MB.'); return; }
    setUploading(true);
    setToolError('');
    try {
      const url = await onImageUpload(file);
      insertImage(url, imageAlt || file.name.replace(/\.[^.]+$/, ''));
      setImageOpen(false);
    } catch (err) {
      setToolError(err?.message || 'The image could not be uploaded. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Pasted screenshots / copied images are uploaded (never embedded as base64 in the text).
  const handlePaste = (e) => {
    if (!onImageUpload || disabled) return;
    const files = Array.from(e.clipboardData?.files || []).filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    e.preventDefault();
    saveSelection();
    files.forEach((f) => uploadImageFile(f));
  };

  // ── Selected image: size + alignment ───────────────────────────────────────
  const measureImage = useCallback(() => {
    const img = selImgRef.current;
    const root = rootRef.current;
    if (!img || !root || !root.contains(img)) { setImgBox(null); return; }
    const r = img.getBoundingClientRect();
    const b = root.getBoundingClientRect();
    setImgBox({ top: r.top - b.top, left: r.left - b.left, width: r.width, height: r.height });
  }, []);

  const clearImage = useCallback(() => {
    selImgRef.current = null;
    setImgBox(null);
  }, []);

  const handleEditorClick = (e) => {
    if (justDraggedRef.current) return; // the click that ends a drag must not deselect the image
    if (e.target?.tagName === 'IMG') {
      selImgRef.current = e.target;
      measureImage();
    } else if (selImgRef.current) {
      clearImage();
    }
  };

  const changed = () => {
    emitChange();
    requestAnimationFrame(measureImage);
  };

  const applyImageSize = (width) => {
    const img = selImgRef.current;
    if (!img) return;
    img.removeAttribute('width');
    img.removeAttribute('height');
    img.style.width = width;
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    changed();
  };

  const applyImageAlign = (kind) => {
    const img = selImgRef.current;
    if (!img) return;
    alignImageElement(img, kind);
    changed();
  };

  const removeImage = () => {
    const img = selImgRef.current;
    if (!img) return;
    img.remove();
    clearImage();
    emitChange();
  };

  const currentImageWidth = selImgRef.current?.style?.width || '';
  const currentImageAlign = (() => {
    const st = selImgRef.current?.style;
    if (!st) return 'inline';
    if (st.float === 'left') return 'left';
    if (st.float === 'right') return 'right';
    if (st.display === 'block') return 'center';
    return 'inline';
  })();

  // ── Drag a corner handle to resize (keeps the picture's proportions) ──────────
  const startResize = (corner) => (e) => {
    const img = selImgRef.current;
    if (!img || disabled || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startW = img.getBoundingClientRect().width;
    const maxW = Math.max(MIN_IMAGE_WIDTH, (ref.current?.clientWidth || 800) - 24);
    const dir = corner.includes('e') ? 1 : -1; // dragging outwards always makes it bigger

    const onMove = (ev) => {
      const w = Math.max(MIN_IMAGE_WIDTH, Math.min(maxW, Math.round(startW + dir * (ev.clientX - startX))));
      img.removeAttribute('width');
      img.removeAttribute('height');
      img.style.width = `${w}px`;
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      setSizeLabel(w);
      measureImage();
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      setSizeLabel(null);
      changed();
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // ── Drag the image itself to move it anywhere in the text ───────────────────────
  // Where it is dropped decides how the text flows round it (see dropZone). Everything is stored
  // as ordinary style on the <img>, so the public site shows exactly what is seen here.
  const caretAt = (x, y) => {
    const range = rangeFromPoint(x, y);
    const root = ref.current;
    if (!range || !root || !root.contains(range.startContainer)) return null;
    return range;
  };

  const handleEditorMouseDown = (e) => {
    if (disabled || e.button !== 0 || e.target?.tagName !== 'IMG') return;
    e.preventDefault(); // no browser text-selection / native image drag: we do the move ourselves
    const img = e.target;
    const start = { x: e.clientX, y: e.clientY, moved: false };

    const describe = (ev) => {
      const rootRect = ref.current.getBoundingClientRect();
      const range = caretAt(ev.clientX, ev.clientY);
      let caret = null;
      if (range && !img.contains(range.startContainer)) {
        const rect = range.getClientRects?.()[0] || range.getBoundingClientRect?.();
        if (rect && (rect.height || rect.width)) caret = { top: rect.top, left: rect.left, height: rect.height || 18 };
      }
      return { x: ev.clientX, y: ev.clientY, caret, zone: dropZone(ev.clientX, rootRect), src: img.getAttribute('src') };
    };

    const onMove = (ev) => {
      if (!start.moved && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 6) return;
      start.moved = true;
      clearImage();
      setDragUi(describe(ev));
    };

    const onUp = (ev) => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      setDragUi(null);

      if (!start.moved) { // a plain click: select the image
        selImgRef.current = img;
        measureImage();
        return;
      }

      justDraggedRef.current = true;
      setTimeout(() => { justDraggedRef.current = false; }, 0);

      const range = caretAt(ev.clientX, ev.clientY);
      if (!range || img.contains(range.startContainer)) return; // dropped nowhere useful: leave it

      const oldParent = img.parentNode;
      range.insertNode(img);
      alignImageElement(img, dropZone(ev.clientX, ref.current.getBoundingClientRect()));
      if (oldParent && oldParent !== ref.current && oldParent.childNodes.length === 0) oldParent.remove();

      selImgRef.current = img;
      changed();
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // Keep the bar attached to the image if the window is resized.
  useEffect(() => {
    if (!imgBox) return undefined;
    window.addEventListener('resize', measureImage);
    return () => window.removeEventListener('resize', measureImage);
  }, [imgBox, measureImage]);

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
    <div ref={rootRef} className={`relative border border-slate-300 rounded-lg ${disabled ? 'opacity-60' : ''}`}>
      <style>{`
        .rte-content:empty:before { content: attr(data-placeholder); color: #94a3b8; pointer-events: none; }
        .rte-content ul  { list-style: disc;    padding-left: 1.5rem; }
        .rte-content ol  { list-style: decimal; padding-left: 1.5rem; }
        .rte-content h1  { font-size: 1.5rem;   font-weight: 700; margin: 0.5rem 0; }
        .rte-content h2  { font-size: 1.25rem;  font-weight: 700; margin: 0.5rem 0; }
        .rte-content h3  { font-size: 1.1rem;   font-weight: 600; margin: 0.4rem 0; }
        .rte-content p   { margin: 0.25rem 0; }
        .rte-content a   { color: #1d4ed8; text-decoration: underline; cursor: pointer; }
        .rte-content { display: flow-root; }
        .rte-content img { max-width: 100%; height: auto; cursor: pointer; }
        .rte-picker      { position: absolute; z-index: 9999; background: #fff; border: 1px solid #e2e8f0;
                           border-radius: 8px; box-shadow: 0 6px 20px rgba(0,0,0,.13); padding: 8px;
                           margin-top: 2px; }
        .rte-picker-anchor { position: relative; display: inline-flex; }
      `}</style>

      {/* ── Row 1: Font · Size · Format · B I U S · Case ─────────────────── */}
      <div className="flex items-center gap-0.5 flex-wrap border-b border-slate-100 bg-slate-50 px-2 py-1 rounded-t-lg">

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

        <Sep />

        {/* Link */}
        <div className="rte-picker-anchor">
          <button
            type="button" title="Insert / edit link" aria-label="Insert or edit link"
            onMouseDown={(e) => { e.preventDefault(); openLinkPicker(); }}
            disabled={disabled}
            className="p-1.5 rounded text-slate-600 hover:bg-slate-200 disabled:opacity-40 transition-colors"
          >
            <Link2 size={15} />
          </button>
          {linkOpen && (
            <div className="rte-picker" style={{ width: 300 }}>
              <p className="text-xs text-slate-500 font-semibold mb-2 px-1">Link</p>
              <label className="block text-xs text-slate-600 mb-1">Web address</label>
              <input
                autoFocus type="text" value={linkUrl} placeholder="https://example.com"
                onChange={(e) => { setLinkUrl(e.target.value); setToolError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyLink(); } }}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <label className="block text-xs text-slate-600 mb-1">Text to show</label>
              <input
                type="text" value={linkText} placeholder="(uses the selected text or the address)"
                onChange={(e) => setLinkText(e.target.value)}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <label className="flex items-center gap-2 text-xs text-slate-700 mb-2">
                <input type="checkbox" checked={linkNewTab} onChange={(e) => setLinkNewTab(e.target.checked)} />
                Open in a new tab
              </label>
              {toolError && <p className="text-xs text-red-600 mb-2">{toolError}</p>}
              <div className="flex justify-end gap-2">
                {anchorAtSelection() && (
                  <button type="button" onMouseDown={(e) => { e.preventDefault(); removeLink(); }}
                    className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded">Remove link</button>
                )}
                <button type="button" onClick={applyLink}
                  className="px-3 py-1 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded">Apply</button>
              </div>
            </div>
          )}
        </div>
        <Btn cmd="unlink" title="Remove link"><Unlink size={15} /></Btn>

        {/* Image */}
        <div className="rte-picker-anchor">
          <button
            type="button" title="Insert image" aria-label="Insert image"
            onMouseDown={(e) => { e.preventDefault(); openImagePicker(); }}
            disabled={disabled}
            className="p-1.5 rounded text-slate-600 hover:bg-slate-200 disabled:opacity-40 transition-colors"
          >
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImageIcon size={15} />}
          </button>
          {imageOpen && (
            <div className="rte-picker" style={{ width: 300 }}>
              <p className="text-xs text-slate-500 font-semibold mb-2 px-1">Image</p>
              {onImageUpload && (
                <>
                  <input
                    ref={fileInputRef} type="file" accept={IMAGE_TYPES.join(',')} className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; uploadImageFile(f); }}
                  />
                  <button type="button" disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-3 py-2 mb-2 text-sm font-medium text-emerald-900 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 disabled:opacity-50">
                    {uploading ? 'Uploading…' : 'Upload from computer'}
                  </button>
                  <p className="text-[11px] text-slate-500 text-center mb-2">JPG, PNG, GIF or WEBP, up to 5 MB — or paste an image straight into the text.</p>
                  <p className="text-xs text-slate-500 text-center mb-2">— or use an address —</p>
                </>
              )}
              <label className="block text-xs text-slate-600 mb-1">Image address</label>
              <input
                type="text" value={imageUrl} placeholder="https://example.com/picture.jpg"
                onChange={(e) => { setImageUrl(e.target.value); setToolError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyImageUrl(); } }}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <label className="block text-xs text-slate-600 mb-1">Description (alt text)</label>
              <input
                type="text" value={imageAlt} placeholder="Short description of the picture"
                onChange={(e) => setImageAlt(e.target.value)}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {toolError && <p className="text-xs text-red-600 mb-2">{toolError}</p>}
              <div className="flex justify-end">
                <button type="button" onClick={applyImageUrl}
                  className="px-3 py-1 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded">Insert</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Editor surface ────────────────────────────────────────────────── */}
      <div
        ref={ref}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={() => { emitChange(); if (selImgRef.current) clearImage(); }}
        onClick={handleEditorClick}
        onMouseDown={handleEditorMouseDown}
        onDragStart={(e) => { if (e.target?.tagName === 'IMG') e.preventDefault(); }}
        onBlur={emitChange}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        className="rte-content px-3 py-2 text-sm text-slate-800 focus:outline-none overflow-auto rounded-b-lg"
        style={{ minHeight, lineHeight: lineSpacing, fontFamily }}
      />

      {/* ── Selected image: outline + size / alignment bar ───────────────────── */}
      {imgBox && !disabled && (
        <>
          <div
            data-testid="image-selection"
            className="pointer-events-none absolute border-2 border-emerald-500 rounded-sm"
            style={{ top: imgBox.top, left: imgBox.left, width: imgBox.width, height: imgBox.height, zIndex: 40 }}
          >
            {RESIZE_CORNERS.map((c) => (
              <span
                key={c.key}
                role="presentation"
                data-handle={c.key}
                title="Drag to resize"
                onMouseDown={startResize(c.key)}
                className="pointer-events-auto absolute h-3 w-3 rounded-sm border border-white bg-emerald-600"
                style={{ ...c.style, cursor: c.cursor }}
              />
            ))}
            {sizeLabel !== null && (
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 rounded bg-slate-800 px-1.5 py-0.5 text-[11px] font-medium text-white whitespace-nowrap">
                {sizeLabel} px
              </span>
            )}
          </div>
          <div
            role="toolbar" aria-label="Image size and alignment"
            className="absolute flex flex-wrap items-center gap-0.5 rounded-lg border border-slate-200 bg-white px-1 py-1 shadow-lg"
            style={{ top: imgBox.top > 44 ? imgBox.top - 40 : imgBox.top + imgBox.height + 6, left: Math.max(4, imgBox.left), zIndex: 50 }}
            onMouseDown={(e) => e.preventDefault()}
          >
            {IMAGE_SIZES.map((sz) => (
              <button key={sz.label} type="button" title={sz.title}
                onClick={() => applyImageSize(sz.width)}
                className={`px-2 py-1 text-xs rounded ${currentImageWidth === sz.width ? 'bg-emerald-100 text-emerald-900 font-semibold' : 'text-slate-700 hover:bg-slate-100'}`}>
                {sz.label}
              </button>
            ))}
            <span className="w-px h-5 bg-slate-200 mx-0.5" />
            {IMAGE_ALIGNS.map((al) => (
              <button key={al.key} type="button" title={al.title}
                onClick={() => applyImageAlign(al.key)}
                className={`px-2 py-1 text-xs rounded ${currentImageAlign === al.key ? 'bg-emerald-100 text-emerald-900 font-semibold' : 'text-slate-700 hover:bg-slate-100'}`}>
                {al.label}
              </button>
            ))}
            <span className="w-px h-5 bg-slate-200 mx-0.5" />
            <button type="button" title="Remove image" onClick={removeImage}
              className="px-2 py-1 text-xs rounded text-red-600 hover:bg-red-50">
              Remove
            </button>
          </div>
        </>
      )}

      {/* While an image is being moved: the picture under the pointer, where it will land, and how text will flow */}
      {dragUi && createPortal(
        <>
          <img
            alt="" src={dragUi.src}
            style={{ position: 'fixed', left: dragUi.x + 10, top: dragUi.y + 10, width: 120, opacity: 0.6, pointerEvents: 'none', zIndex: 10000, borderRadius: 4 }}
          />
          {dragUi.caret && (
            <div
              data-testid="drop-caret"
              style={{ position: 'fixed', left: dragUi.caret.left - 1, top: dragUi.caret.top, width: 3, height: dragUi.caret.height, background: '#059669', pointerEvents: 'none', zIndex: 10000 }}
            />
          )}
          <div
            style={{ position: 'fixed', left: dragUi.x + 14, top: dragUi.y - 30, background: '#0f172a', color: '#fff', fontSize: 12, padding: '3px 8px', borderRadius: 6, pointerEvents: 'none', zIndex: 10000, whiteSpace: 'nowrap' }}
          >
            {ZONE_HINT[dragUi.zone]}
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default RichTextEditor;
