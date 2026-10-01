import React from 'react';
import { sanitizeRichHtml } from 'utils/richText';

/**
 * Displays text saved with RichTextEditor (bold, lists, colours, alignment, links, images)
 * with the same formatting the editor showed. The HTML is sanitized first. Legacy plain-text
 * values are shown with their line breaks.
 */
const RichTextContent = ({ value, className = '', as: Tag = 'div', style }) => {
  if (value == null || value === '') return null;

  return (
    <Tag
      className={`rich-text-content ${className}`.trim()}
      style={style}
      dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(value) }}
    />
  );
};

export default RichTextContent;
