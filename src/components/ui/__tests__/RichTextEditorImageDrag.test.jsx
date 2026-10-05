/* eslint-disable testing-library/no-node-access, testing-library/no-container -- drags images inside the contentEditable DOM */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import RichTextEditor from 'components/ui/RichTextEditor';

const HTML =
  '<p>First paragraph text</p>' +
  '<p><img src="https://a.example/p.png" alt="p" style="width: 300px; max-width: 100%; height: auto;"></p>' +
  '<p>Second paragraph text</p>';

let realRect;
let widthDesc;

beforeEach(() => {
  document.execCommand = jest.fn(() => true);
  // jsdom has no layout: give the editor a 1000px width and images the width set in their style
  realRect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function rect() {
    const w = this.tagName === 'IMG' ? (parseFloat(this.style.width) || 300) : 1000;
    return { left: 0, top: 0, right: w, bottom: 200, width: w, height: 200, x: 0, y: 0 };
  };
  widthDesc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 800 });
  delete document.caretRangeFromPoint;
});

afterEach(() => {
  Element.prototype.getBoundingClientRect = realRect;
  if (widthDesc) Object.defineProperty(HTMLElement.prototype, 'clientWidth', widthDesc);
  else delete HTMLElement.prototype.clientWidth;
  delete document.caretRangeFromPoint;
});

const setup = () => {
  const onChange = jest.fn();
  const { container } = render(<RichTextEditor value={HTML} onChange={onChange} />);
  const editor = container.querySelector('[contenteditable="true"]');
  return { onChange, container, editor, img: editor.querySelector('img') };
};

const lastHtml = (onChange) => onChange.mock.calls[onChange.mock.calls.length - 1][0];

const clickSelect = (img) => {
  fireEvent.mouseDown(img, { button: 0, clientX: 10, clientY: 10 });
  fireEvent.mouseUp(document, { clientX: 10, clientY: 10 });
};

// point the browser's "what text is under the mouse" at a spot inside the second paragraph
const caretInSecondParagraph = (editor) => {
  document.caretRangeFromPoint = jest.fn(() => {
    const text = editor.querySelectorAll('p')[2].firstChild;
    const range = document.createRange();
    range.setStart(text, 7);
    range.collapse(true);
    return range;
  });
};

const drag = (img, from, to) => {
  fireEvent.mouseDown(img, { button: 0, clientX: from.x, clientY: from.y });
  fireEvent.mouseMove(document, { clientX: to.x, clientY: to.y });
  fireEvent.mouseUp(document, { clientX: to.x, clientY: to.y });
};

describe('resizing an image by dragging a corner', () => {
  it('a plain click selects the image and shows four corner handles', () => {
    const { img, container } = setup();
    clickSelect(img);

    expect(screen.getByRole('toolbar', { name: /image size/i })).toBeInTheDocument();
    for (const c of ['nw', 'ne', 'sw', 'se']) {
      expect(container.querySelector(`[data-handle="${c}"]`)).toBeInTheDocument();
    }
  });

  it('dragging the bottom-right handle outwards makes the image wider, proportions kept', () => {
    const { img, container, onChange } = setup();
    clickSelect(img);

    fireEvent.mouseDown(container.querySelector('[data-handle="se"]'), { button: 0, clientX: 100 });
    fireEvent.mouseMove(document, { clientX: 180 });

    expect(img.style.width).toBe('380px');
    expect(img.style.height).toBe('auto');
    expect(screen.getByText('380 px')).toBeInTheDocument();

    fireEvent.mouseUp(document);
    expect(lastHtml(onChange)).toContain('width: 380px');
    expect(screen.queryByText('380 px')).not.toBeInTheDocument();
  });

  it('dragging a left handle outwards (to the left) also makes it wider', () => {
    const { img, container } = setup();
    clickSelect(img);

    fireEvent.mouseDown(container.querySelector('[data-handle="nw"]'), { button: 0, clientX: 100 });
    fireEvent.mouseMove(document, { clientX: 40 });
    fireEvent.mouseUp(document);

    expect(img.style.width).toBe('360px');
  });

  it('dragging inwards makes it smaller', () => {
    const { img, container } = setup();
    clickSelect(img);

    fireEvent.mouseDown(container.querySelector('[data-handle="se"]'), { button: 0, clientX: 300 });
    fireEvent.mouseMove(document, { clientX: 150 });
    fireEvent.mouseUp(document);

    expect(img.style.width).toBe('150px');
  });

  it('cannot be dragged smaller than 40px or wider than the text area', () => {
    const { img, container } = setup();
    clickSelect(img);

    fireEvent.mouseDown(container.querySelector('[data-handle="se"]'), { button: 0, clientX: 500 });
    fireEvent.mouseMove(document, { clientX: -900 });
    expect(img.style.width).toBe('40px');
    fireEvent.mouseMove(document, { clientX: 5000 });
    expect(img.style.width).toBe('776px'); // 800px editor minus 24px padding
    fireEvent.mouseUp(document);
  });

  it('the size chosen by dragging is saved as plain style, so it shows the same anywhere', () => {
    const { img, container, onChange } = setup();
    clickSelect(img);

    fireEvent.mouseDown(container.querySelector('[data-handle="se"]'), { button: 0, clientX: 0 });
    fireEvent.mouseMove(document, { clientX: 57 });
    fireEvent.mouseUp(document);

    expect(lastHtml(onChange)).toMatch(/<img[^>]*style="[^"]*width: 357px[^"]*max-width: 100%[^"]*"/);
  });
});

describe('moving an image by dragging it', () => {
  it('native browser image dragging is switched off (the editor places the image itself)', () => {
    const { img } = setup();
    expect(fireEvent.dragStart(img)).toBe(false); // false means preventDefault was called
  });

  it('shows where the image will land and how the text will flow', () => {
    const { img, editor } = setup();
    caretInSecondParagraph(editor);

    fireEvent.mouseDown(img, { button: 0, clientX: 500, clientY: 100 });
    fireEvent.mouseMove(document, { clientX: 100, clientY: 300 });
    expect(screen.getByText('Image on the left · text wraps on the right')).toBeInTheDocument();

    fireEvent.mouseMove(document, { clientX: 900, clientY: 300 });
    expect(screen.getByText('Image on the right · text wraps on the left')).toBeInTheDocument();

    fireEvent.mouseMove(document, { clientX: 500, clientY: 300 });
    expect(screen.getByText('Image on its own line · text above and below')).toBeInTheDocument();

    fireEvent.mouseUp(document, { clientX: 500, clientY: 300 });
    expect(screen.queryByText(/Image on its own line/)).not.toBeInTheDocument();
  });

  it('dropping on the left third puts the image in the text and floats it left', () => {
    const { img, editor, onChange } = setup();
    caretInSecondParagraph(editor);

    drag(img, { x: 500, y: 100 }, { x: 100, y: 300 });

    const paragraphs = editor.querySelectorAll('p');
    expect(paragraphs).toHaveLength(2); // the paragraph that only held the image is gone
    expect(paragraphs[1].contains(img)).toBe(true);
    expect(paragraphs[1].textContent).toBe('Second paragraph text');
    expect(img.style.float).toBe('left');
    expect(img.style.width).toBe('300px'); // its size is kept
    expect(lastHtml(onChange)).toContain('float: left');
  });

  it('dropping on the right third floats it right', () => {
    const { img, editor } = setup();
    caretInSecondParagraph(editor);

    drag(img, { x: 500, y: 100 }, { x: 900, y: 300 });

    expect(img.style.float).toBe('right');
    expect(editor.querySelectorAll('p')[1].contains(img)).toBe(true);
  });

  it('dropping in the middle puts it on its own line, centred, text above and below', () => {
    const { img, editor } = setup();
    caretInSecondParagraph(editor);

    drag(img, { x: 100, y: 100 }, { x: 500, y: 300 });

    expect(img.style.float).toBe('');
    expect(img.style.display).toBe('block');
    expect(img.style.marginLeft).toBe('auto');
    expect(img.style.marginRight).toBe('auto');
  });

  it('the image lands exactly where the text cursor was pointing, inside the sentence', () => {
    const { img, editor } = setup();
    caretInSecondParagraph(editor);

    drag(img, { x: 500, y: 100 }, { x: 100, y: 300 });

    const p = editor.querySelectorAll('p')[1];
    expect(p.firstChild.textContent).toBe('Second ');
    expect(p.childNodes[1]).toBe(img);
    expect(p.lastChild.textContent).toBe('paragraph text');
  });

  it('a drop that is not over the text leaves the image where it was', () => {
    const { img, editor, onChange } = setup(); // no caretRangeFromPoint: nothing under the pointer
    const before = editor.innerHTML;

    drag(img, { x: 500, y: 100 }, { x: 100, y: 900 });

    expect(editor.innerHTML).toBe(before);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('a tiny movement is still just a click: it selects and does not move', () => {
    const { img, editor } = setup();
    caretInSecondParagraph(editor);
    const before = editor.innerHTML;

    drag(img, { x: 500, y: 100 }, { x: 503, y: 102 });

    expect(editor.innerHTML).toBe(before);
    expect(screen.getByRole('toolbar', { name: /image size/i })).toBeInTheDocument();
  });

  it('the moved image stays selected so it can be resized or re-aligned straight away', async () => {
    const { img, editor } = setup();
    caretInSecondParagraph(editor);
    drag(img, { x: 500, y: 100 }, { x: 100, y: 300 });

    // the click browsers fire at the end of a drag must not deselect it
    fireEvent.click(editor.querySelectorAll('p')[1]);
    expect(await screen.findByRole('toolbar', { name: /image size/i })).toBeInTheDocument();
    expect(document.querySelector('[data-handle="se"]')).toBeInTheDocument();
  });

  it('holding the button down on plain text does not start an image drag', () => {
    const { editor } = setup();
    fireEvent.mouseDown(editor.querySelectorAll('p')[0], { button: 0, clientX: 50, clientY: 20 });
    fireEvent.mouseMove(document, { clientX: 400, clientY: 200 });

    expect(screen.queryByText(/Image on/)).not.toBeInTheDocument();
  });

  it('does nothing when the editor is disabled', () => {
    const onChange = jest.fn();
    const { container } = render(<RichTextEditor value={HTML} onChange={onChange} disabled />);
    caretInSecondParagraph(container.querySelector('[contenteditable]'));

    drag(container.querySelector('img'), { x: 500, y: 100 }, { x: 100, y: 300 });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('toolbar', { name: /image size/i })).not.toBeInTheDocument();
  });
});
