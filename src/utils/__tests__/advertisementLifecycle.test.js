import {
  getAdvertisementLifecycle,
  isAutoClosed,
  isPermanentlyClosed,
  DELETE_LOCK_MESSAGES,
} from 'utils/advertisementLifecycle';

const iso = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

describe('getAdvertisementLifecycle — trusts the backend flags when present', () => {
  it('maps the API lifecycle object', () => {
    const lc = getAdvertisementLifecycle({
      status: 'published',
      lifecycle: {
        can_edit: true,
        can_delete: false,
        edit_lock_code: null,
        delete_lock_code: 'ADVERTISEMENT_HAS_APPLICATIONS',
        delete_lock_message: 'Candidates have applied.',
      },
    });
    expect(lc.canEdit).toBe(true);
    expect(lc.canDelete).toBe(false);
    expect(lc.deleteLockCode).toBe('ADVERTISEMENT_HAS_APPLICATIONS');
    expect(lc.deleteLockMessage).toBe('Candidates have applied.');
  });
});

describe('getAdvertisementLifecycle — fallback when the API sends no flags', () => {
  it('open advertisement: editable and deletable', () => {
    const lc = getAdvertisementLifecycle({ status: 'published', closing_date: iso(5) });
    expect(lc).toMatchObject({ canEdit: true, canDelete: true, editLockCode: null, deleteLockCode: null });
  });

  it('permanently closed: view only', () => {
    const lc = getAdvertisementLifecycle({ status: 'permanently_closed', closing_date: iso(5) });
    expect(lc).toMatchObject({ canEdit: false, canDelete: false, editLockCode: 'ADVERTISEMENT_PERMANENTLY_CLOSED' });
    expect(lc.editLockMessage).toMatch(/permanently closed/i);
  });

  it('past closing date: automatically closed', () => {
    const lc = getAdvertisementLifecycle({ status: 'published', closing_date: iso(-2) });
    expect(lc).toMatchObject({ canEdit: false, canDelete: false, editLockCode: 'ADVERTISEMENT_AUTO_CLOSED' });
  });

  it('closing today is still open', () => {
    expect(getAdvertisementLifecycle({ status: 'published', closing_date: iso(0) }).canEdit).toBe(true);
  });

  it('a future extended date keeps a past-closing advertisement open', () => {
    expect(getAdvertisementLifecycle({ status: 'published', closing_date: iso(-4), extend_date: iso(3) }).canEdit).toBe(true);
  });

  it('applications block deletion only', () => {
    const lc = getAdvertisementLifecycle({ status: 'published', closing_date: iso(5), total_applications: 4 });
    expect(lc.canEdit).toBe(true);
    expect(lc.canDelete).toBe(false);
    expect(lc.deleteLockCode).toBe('ADVERTISEMENT_HAS_APPLICATIONS');
    expect(lc.deleteLockMessage).toBe(DELETE_LOCK_MESSAGES.ADVERTISEMENT_HAS_APPLICATIONS);
  });

  it('reopened / temporarily closed advertisements are not auto-closed', () => {
    expect(isAutoClosed({ status: 'reopen', closing_date: iso(-9) })).toBe(false);
    expect(isAutoClosed({ status: 'temporary_closed', closing_date: iso(-9) })).toBe(false);
  });
});

describe('predicates', () => {
  it('isPermanentlyClosed is case-insensitive and null-safe', () => {
    expect(isPermanentlyClosed({ status: 'PERMANENTLY_CLOSED' })).toBe(true);
    expect(isPermanentlyClosed(null)).toBe(false);
  });
});
