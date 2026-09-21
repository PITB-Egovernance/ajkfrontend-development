import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CSVUploadZone from 'components/results/CSVUploadZone';

describe('CSVUploadZone', () => {
  it('lets a file be chosen and scanned when enabled', () => {
    const onFileSelect = jest.fn();
    render(<CSVUploadZone onFileSelect={onFileSelect} onPreview={jest.fn()} loading={false} />);

    expect(screen.getByRole('button', { name: /browse files/i })).toBeEnabled();

    const file = new File(['a,b'], 'results.csv', { type: 'text/csv' });
    fireEvent.change(screen.getByLabelText(/select spreadsheet file/i), { target: { files: [file] } });
    expect(onFileSelect).toHaveBeenCalledWith(file);
    expect(screen.getByRole('button', { name: /scan & map columns/i })).toBeEnabled();
  });

  it('cannot browse, choose or drop a file while disabled', () => {
    const onFileSelect = jest.fn();
    render(<CSVUploadZone onFileSelect={onFileSelect} onPreview={jest.fn()} loading={false} disabled />);

    expect(screen.getByRole('button', { name: /browse files/i })).toBeDisabled();
    expect(screen.getByLabelText(/select spreadsheet file/i)).toBeDisabled();
    expect(screen.getByRole('region', { name: /result file upload area/i })).toHaveAttribute('aria-disabled', 'true');

    const file = new File(['a,b'], 'results.csv', { type: 'text/csv' });
    fireEvent.drop(screen.getByRole('region', { name: /result file upload area/i }), { dataTransfer: { files: [file] } });
    expect(onFileSelect).not.toHaveBeenCalled();
  });
});
