import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FormDialog from 'components/ui/FormDialog';
import FormOverlay from 'components/ui/FormOverlay';
import { FullPageFormContext } from 'context/FullPageFormContext';

// Renders children inside a layout that offers the full-page slot, like components/layouts/Master.jsx.
const WithSlot = ({ children }) => {
  const [slot, setSlot] = useState(null);
  return (
    <FullPageFormContext.Provider value={{ slot, setActive: () => {} }}>
      {children}
      <div data-testid="slot" ref={setSlot} />
    </FullPageFormContext.Provider>
  );
};

describe('full-page forms fill the available width', () => {
  it('FormDialog: more than 3 fields renders a full-width page, not a capped centred card', async () => {
    render(
      <WithSlot>
        <FormDialog open fieldCount={5} onClose={() => {}}>
          <div>form body</div>
        </FormDialog>
      </WithSlot>
    );

    const body = await screen.findByText('form body');
    const card = body.parentElement;
    expect(card).toHaveClass('form-fill-width');
    expect(card.parentElement).toHaveClass('form-fill-width');
    expect(card.className).not.toMatch(/max-w-|mx-auto/);
    expect(screen.getByTestId('slot')).toContainElement(body);
  });

  it('FormOverlay: more than 3 fields renders a full-width page too', async () => {
    render(
      <WithSlot>
        <FormOverlay open fieldCount={6} onClose={() => {}}>
          <div>overlay body</div>
        </FormOverlay>
      </WithSlot>
    );

    const card = (await screen.findByText('overlay body')).parentElement;
    expect(card).toHaveClass('form-fill-width');
    expect(card.className).not.toMatch(/max-w-|mx-auto/);
  });

  it('3 fields or fewer stays a popup (nothing goes into the page slot)', () => {
    render(
      <WithSlot>
        <FormOverlay open fieldCount={3} onClose={() => {}}>
          <div>small form</div>
        </FormOverlay>
      </WithSlot>
    );

    expect(screen.getByText('small form')).toBeInTheDocument();
    expect(screen.getByTestId('slot')).toBeEmptyDOMElement();
  });
});
