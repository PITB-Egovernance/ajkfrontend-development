import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import RichTextEditor, { normalizeLinkUrl, normalizeImageUrl } from 'components/ui/RichTextEditor';

// jsdom has no editing engine, so document.execCommand is mocked and we assert what the editor asks it to do.
beforeEach(() => {
  document.execCommand = jest.fn(() => true);
});

const Harness = ({ onImageUpload, initial = '' }) => {
  const [html, setHtml] = useState(initial);
  return (
    <>
      <RichTextEditor value={html} onChange={setHtml} onImageUpload={onImageUpload} />
      <output data-testid="html">{html}</output>
    </>
  );
};

const editable = (container) => container.querySelector('[contenteditable="true"]');

describe('normalizeLinkUrl', () => {
  it.each([
    ['https://ajkpsc.gov.pk/news', 'https://ajkpsc.gov.pk/news'],
    ['http://example.com', 'http://example.com'],
    ['mailto:info@ajkpsc.gov.pk', 'mailto:info@ajkpsc.gov.pk'],
    ['tel:+92300000000', 'tel:+92300000000'],
    ['/uploads/news/file.pdf', '/uploads/news/file.pdf'],
    ['#top', '#top'],
    ['example.com/page', 'https://example.com/page'],
    ['  example.com  ', 'https://example.com'],
  ])('accepts %s', (input, expected) => {
    expect(normalizeLinkUrl(input)).toBe(expected);
  });

  it.each(['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html;base64,AAAA', 'vbscript:x', 'file:///c:/x', 'ftp://x', 'not a url', '', null])(
    'rejects %s',
    (input) => {
      expect(normalizeLinkUrl(input)).toBeNull();
    }
  );
});

describe('normalizeImageUrl', () => {
  it('accepts http(s) and site-relative images only', () => {
    expect(normalizeImageUrl('https://a.example/p.png')).toBe('https://a.example/p.png');
    expect(normalizeImageUrl('/uploads/news/editor/a.png')).toBe('/uploads/news/editor/a.png');
    expect(normalizeImageUrl('data:image/png;base64,AAAA')).toBeNull();
    expect(normalizeImageUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeImageUrl('picture.png')).toBeNull();
  });
});

describe('RichTextEditor — link tool', () => {
  it('has link and image buttons', () => {
    render(<Harness />);
    expect(screen.getByLabelText('Insert or edit link')).toBeInTheDocument();
    expect(screen.getByLabelText('Insert image')).toBeInTheDocument();
  });

  it('inserts a link at the caret with the text shown and opens it in a new tab', () => {
    const { container } = render(<Harness />);
    fireEvent.mouseDown(screen.getByLabelText('Insert or edit link'));

    fireEvent.change(screen.getByPlaceholderText('https://example.com'), { target: { value: 'ajkpsc.gov.pk' } });
    fireEvent.change(screen.getByPlaceholderText(/uses the selected text/i), { target: { value: 'AJK PSC' } });
    fireEvent.click(screen.getByText('Apply'));

    expect(document.execCommand).toHaveBeenCalledWith('insertHTML', false, '<a href="https://ajkpsc.gov.pk">AJK PSC</a>');
    expect(editable(container)).toBeInTheDocument();
  });

  it('refuses a javascript: address and shows why', () => {
    render(<Harness />);
    fireEvent.mouseDown(screen.getByLabelText('Insert or edit link'));
    fireEvent.change(screen.getByPlaceholderText('https://example.com'), { target: { value: 'javascript:alert(1)' } });
    fireEvent.click(screen.getByText('Apply'));

    expect(screen.getByText(/enter a valid web address/i)).toBeInTheDocument();
    expect(document.execCommand).not.toHaveBeenCalledWith('insertHTML', false, expect.stringContaining('javascript'));
    expect(document.execCommand).not.toHaveBeenCalledWith('createLink', false, expect.anything());
  });

  it('escapes link text so it cannot inject markup', () => {
    render(<Harness />);
    fireEvent.mouseDown(screen.getByLabelText('Insert or edit link'));
    fireEvent.change(screen.getByPlaceholderText('https://example.com'), { target: { value: 'https://a.example' } });
    fireEvent.change(screen.getByPlaceholderText(/uses the selected text/i), { target: { value: '<img src=x onerror=alert(1)>' } });
    fireEvent.click(screen.getByText('Apply'));

    expect(document.execCommand).toHaveBeenCalledWith(
      'insertHTML',
      false,
      '<a href="https://a.example">&lt;img src=x onerror=alert(1)&gt;</a>'
    );
  });
});

describe('RichTextEditor — image tool', () => {
  it('inserts an image by address', () => {
    render(<Harness />);
    fireEvent.mouseDown(screen.getByLabelText('Insert image'));
    fireEvent.change(screen.getByPlaceholderText('https://example.com/picture.jpg'), { target: { value: 'https://a.example/p.png' } });
    fireEvent.change(screen.getByPlaceholderText(/short description of the picture/i), { target: { value: 'Poster' } });
    fireEvent.click(screen.getByText('Insert'));

    expect(document.execCommand).toHaveBeenCalledWith(
      'insertHTML',
      false,
      '<img src="https://a.example/p.png" alt="Poster" style="width:300px;max-width:100%;height:auto;" />'
    );
  });

  it('rejects an image address that is not http(s)', () => {
    render(<Harness />);
    fireEvent.mouseDown(screen.getByLabelText('Insert image'));
    fireEvent.change(screen.getByPlaceholderText('https://example.com/picture.jpg'), { target: { value: 'data:image/png;base64,AAAA' } });
    fireEvent.click(screen.getByText('Insert'));

    expect(screen.getByText(/enter the full image address/i)).toBeInTheDocument();
    expect(document.execCommand).not.toHaveBeenCalledWith('insertHTML', false, expect.stringContaining('<img'));
  });

  it('only offers "Upload from computer" when an upload handler is provided', () => {
    const { unmount } = render(<Harness />);
    fireEvent.mouseDown(screen.getByLabelText('Insert image'));
    expect(screen.queryByText('Upload from computer')).not.toBeInTheDocument();
    unmount();

    render(<Harness onImageUpload={jest.fn()} />);
    fireEvent.mouseDown(screen.getByLabelText('Insert image'));
    expect(screen.getByText('Upload from computer')).toBeInTheDocument();
  });

  it('uploads a chosen file and inserts the returned URL', async () => {
    const onImageUpload = jest.fn().mockResolvedValue('https://admin.example/uploads/news/editor/a.png');
    const { container } = render(<Harness onImageUpload={onImageUpload} />);
    fireEvent.mouseDown(screen.getByLabelText('Insert image'));

    const file = new File(['x'], 'poster.png', { type: 'image/png' });
    fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [file] } });

    await waitFor(() => expect(onImageUpload).toHaveBeenCalledWith(file));
    await waitFor(() =>
      expect(document.execCommand).toHaveBeenCalledWith(
        'insertHTML',
        false,
        expect.stringContaining('src="https://admin.example/uploads/news/editor/a.png"')
      )
    );
  });

  it('refuses a non-image file without calling the server', async () => {
    const onImageUpload = jest.fn();
    const { container } = render(<Harness onImageUpload={onImageUpload} />);
    fireEvent.mouseDown(screen.getByLabelText('Insert image'));

    const file = new File(['x'], 'evil.svg', { type: 'image/svg+xml' });
    fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [file] } });

    expect(await screen.findByText(/only jpg, png, gif or webp/i)).toBeInTheDocument();
    expect(onImageUpload).not.toHaveBeenCalled();
  });

  it('shows the server message when the upload fails', async () => {
    const onImageUpload = jest.fn().mockRejectedValue(new Error('The image may not be larger than 5 MB.'));
    const { container } = render(<Harness onImageUpload={onImageUpload} />);
    fireEvent.mouseDown(screen.getByLabelText('Insert image'));

    fireEvent.change(container.querySelector('input[type="file"]'), {
      target: { files: [new File(['x'], 'a.png', { type: 'image/png' })] },
    });

    expect(await screen.findByText('The image may not be larger than 5 MB.')).toBeInTheDocument();
  });

  it('uploads pasted images instead of embedding them', async () => {
    const onImageUpload = jest.fn().mockResolvedValue('https://admin.example/uploads/news/editor/pasted.png');
    const { container } = render(<Harness onImageUpload={onImageUpload} />);

    const file = new File(['x'], 'screenshot.png', { type: 'image/png' });
    const preventDefault = jest.fn();
    fireEvent.paste(editable(container), { clipboardData: { files: [file] }, preventDefault });

    await waitFor(() => expect(onImageUpload).toHaveBeenCalledWith(file));
  });

  it('leaves pasted text alone', () => {
    const onImageUpload = jest.fn();
    const { container } = render(<Harness onImageUpload={onImageUpload} />);
    fireEvent.paste(editable(container), { clipboardData: { files: [] } });

    expect(onImageUpload).not.toHaveBeenCalled();
  });
});

describe('RichTextEditor — content', () => {
  it('shows the value it is given, links and images included', () => {
    const html = '<p>See <a href="https://a.example" target="_blank">this</a></p><img src="https://a.example/p.png" alt="p">';
    const { container } = render(<Harness initial={html} />);

    expect(editable(container).querySelector('a')).toHaveAttribute('href', 'https://a.example');
    expect(editable(container).querySelector('img')).toHaveAttribute('src', 'https://a.example/p.png');
  });
});

describe('RichTextEditor — image size and alignment', () => {
  const IMG = '<p>Text before</p><p><img src="https://a.example/p.png" alt="p" style="width: 900px; max-width: 100%; height: auto;"></p><p>Text after</p>';

  const setup = () => {
    const onChange = jest.fn();
    const { container } = render(<RichTextEditor value={IMG} onChange={onChange} />);
    const img = container.querySelector('[contenteditable="true"] img');
    return { onChange, img, container };
  };

  const lastHtml = (onChange) => onChange.mock.calls[onChange.mock.calls.length - 1][0];

  it('new images go in at a presentable 300px, never full width', () => {
    render(<Harness />);
    fireEvent.mouseDown(screen.getByLabelText('Insert image'));
    fireEvent.change(screen.getByPlaceholderText('https://example.com/picture.jpg'), { target: { value: 'https://a.example/big.png' } });
    fireEvent.click(screen.getByText('Insert'));

    expect(document.execCommand).toHaveBeenCalledWith('insertHTML', false, expect.stringContaining('width:300px;max-width:100%;height:auto'));
  });

  it('shows no size bar until an image is clicked', () => {
    setup();
    expect(screen.queryByRole('toolbar', { name: /image size and alignment/i })).not.toBeInTheDocument();
  });

  it('clicking an image shows the size and alignment bar', () => {
    const { img } = setup();
    fireEvent.click(img);

    const bar = screen.getByRole('toolbar', { name: /image size and alignment/i });
    for (const label of ['Small', 'Medium', 'Large', 'Full', 'Inline', 'Left', 'Center', 'Right', 'Remove']) {
      expect(within(bar).getByText(label)).toBeInTheDocument();
    }
  });

  it.each([
    ['Small', '150px'],
    ['Medium', '300px'],
    ['Large', '500px'],
    ['Full', '100%'],
  ])('%s sets the image width to %s', (label, width) => {
    const { img, onChange } = setup();
    fireEvent.click(img);
    fireEvent.click(within(screen.getByRole('toolbar', { name: /image size/i })).getByText(label));

    expect(img.style.width).toBe(width);
    expect(img.style.maxWidth).toBe('100%');
    expect(lastHtml(onChange)).toContain(`width: ${width}`);
  });

  it('Left floats the image so text wraps beside it', () => {
    const { img, onChange } = setup();
    fireEvent.click(img);
    fireEvent.click(within(screen.getByRole('toolbar', { name: /image size/i })).getByText('Left'));

    expect(img.style.float).toBe('left');
    expect(lastHtml(onChange)).toContain('float: left');
  });

  it('Right floats it to the right, Center makes it a centred block, Inline resets it', () => {
    const { img } = setup();
    fireEvent.click(img);
    const bar = () => within(screen.getByRole('toolbar', { name: /image size/i }));

    fireEvent.click(bar().getByText('Right'));
    expect(img.style.float).toBe('right');

    fireEvent.click(bar().getByText('Center'));
    expect(img.style.float).toBe('');
    expect(img.style.display).toBe('block');
    expect(img.style.marginLeft).toBe('auto');
    expect(img.style.marginRight).toBe('auto');

    fireEvent.click(bar().getByText('Inline'));
    expect(img.style.float).toBe('');
    expect(img.style.display).toBe('');
    expect(img.style.marginLeft).toBe('');
  });

  it('Remove deletes the image and closes the bar, leaving the text', () => {
    const { img, onChange, container } = setup();
    fireEvent.click(img);
    fireEvent.click(within(screen.getByRole('toolbar', { name: /image size/i })).getByText('Remove'));

    expect(container.querySelector('[contenteditable="true"] img')).toBeNull();
    expect(lastHtml(onChange)).not.toContain('<img');
    expect(lastHtml(onChange)).toContain('Text before');
    expect(screen.queryByRole('toolbar', { name: /image size/i })).not.toBeInTheDocument();
  });

  it('clicking the text again closes the bar', () => {
    const { img, container } = setup();
    fireEvent.click(img);
    expect(screen.getByRole('toolbar', { name: /image size/i })).toBeInTheDocument();

    fireEvent.click(container.querySelector('[contenteditable="true"] p'));
    expect(screen.queryByRole('toolbar', { name: /image size/i })).not.toBeInTheDocument();
  });

  it('typing closes the bar so it never floats over moved text', () => {
    const { img, container } = setup();
    fireEvent.click(img);

    fireEvent.input(container.querySelector('[contenteditable="true"]'));
    expect(screen.queryByRole('toolbar', { name: /image size/i })).not.toBeInTheDocument();
  });
});
