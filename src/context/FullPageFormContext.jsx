import { createContext } from 'react';

/**
 * Lets a form that is too big for a popup (more than 3 fields) take over the page
 * content area instead of opening a modal.
 *
 *  - `slot`      DOM node inside the page layout's <main> that full-page forms render into
 *  - `setActive` tells the layout to hide the page it is covering (kept mounted, so the
 *                page's own state — filters, pagination, form values — survives)
 *
 * Provided by components/layouts/Master.jsx, consumed by components/ui/FormDialog.jsx.
 */
export const FullPageFormContext = createContext({ slot: null, setActive: () => {} });
