import toast from 'react-hot-toast';

/**
 * Shows a styled delete-confirmation toast popup.
 * Returns a Promise that resolves to true (confirmed) or false (cancelled).
 *
 * Usage:
 *   const confirmed = await confirmDelete({ title: 'Delete Item', message: 'Delete "XYZ"?', identifier: 'XYZ' });
 *   if (!confirmed) return;
 *   // proceed with delete...
 */
const confirmDelete = ({ title = 'Confirm Delete', message, identifier, warning = 'This action cannot be undone.' }) => {
  return new Promise((resolve) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <div>
          <p className="font-semibold text-gray-800">{title}</p>
          <p className="text-sm text-gray-600 mt-1">
            {message || (identifier ? `Are you sure you want to delete "${identifier}"?` : 'Are you sure you want to delete this item?')}
          </p>
          {warning && <p className="text-xs text-red-600 mt-1">{warning}</p>}
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => { toast.dismiss(t.id); resolve(false); }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { toast.dismiss(t.id); resolve(true); }}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    ), {
      duration: Infinity,
      position: 'top-center',
    });
  });
};

export default confirmDelete;
