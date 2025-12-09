// Single DOMContentLoaded for shared scope
document.addEventListener('DOMContentLoaded', function () {
    const $selectAll      = $('#selectAll');
    const $rowCheckboxes  = $('.row-checkbox');
    const $btnWrapper     = $('#advertisementBtnWrapper');
    const $createBtn      = $('#createAdvertisementBtn');
    const $modal          = $('#advertisementModal');
    const $singleNoteModal = $('#singleNoteModal');
    const $selectedIds    = $('#selectedJobIds');

    // Toast Container (shared)
    const toastContainer = document.getElementById('toastContainer');

    // SHARED Toast Function (now accessible everywhere)
    function showToast(message, type = 'danger') {
        const bgClass = type === 'success' ? 'bg-success' :
                        type === 'warning' ? 'bg-warning text-dark' : 'bg-danger';

        const toastEl = document.createElement('div');
        toastEl.className = `toast align-items-center text-white ${bgClass} border-0`;
        toastEl.setAttribute('role', 'alert');
        toastEl.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        toastContainer.appendChild(toastEl);
        const bsToast = new bootstrap.Toast(toastEl, { delay: 3000 });
        bsToast.show();
        toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
    }

    // Update Create Advertisement Button
    function updateCreateButton() {
        const checkedCount = $rowCheckboxes.filter(':checked').length;
        $btnWrapper.toggle(checkedCount > 0);
        $selectAll.prop('checked', checkedCount === $rowCheckboxes.length && checkedCount > 0);
    }

    // Select All
    $selectAll.on('change', function () {
        $rowCheckboxes.prop('checked', this.checked).trigger('change');
    });

    // Normal checkbox behavior
    $rowCheckboxes.on('change', updateCreateButton);

    // NEW: Click on Post Title → Open Note Modal
    $(document).on('click', '.post-title-link', function (e) {
        e.preventDefault();
        const jobId = $(this).data('id');
        const currentNote = $(this).data('note') || '';

        $('#noteJobId').val(jobId);
        $('#singleJobNote').val(currentNote);

        const modal = new bootstrap.Modal($singleNoteModal[0]);
        modal.show();
    });

    // Save Note via AJAX
    $('#singleNoteForm').on('submit', function (e) {
        e.preventDefault();

        const jobId = $('#noteJobId').val();
        const note = $('#singleJobNote').val().trim();

        $.ajax({
            url: '/job/note/update',
            method: 'POST',
            data: {
                _token: $('meta[name="csrf-token"]').attr('content'),
                job_id: jobId,
                note: note
            },
            success: function (response) {
                if (response.success) {
                    const $link = $(`.post-title-link[data-id="${jobId}"]`);
                    $link.data('note', note);

                    const $row = $link.closest('tr');
                    let $badge = $row.find('.note-badge');
                    if (note && $badge.length === 0) {
                        $link.append(' <small class="text-primary note-badge">(Note)</small>');
                    } else if (!note && $badge.length > 0) {
                        $badge.remove();
                    }

                    bootstrap.Modal.getInstance($singleNoteModal[0]).hide();
                    showToast('Note saved successfully!', 'success');
                }
            },
            error: function () {
                showToast('Failed to save note.', 'danger');
            }
        });
    });

    // Create Advertisement Button
    $createBtn.on('click', function () {
        const ids = $rowCheckboxes.filter(':checked').map(function () {
            return this.value;
        }).get();

        if (ids.length === 0) {
            Swal.fire('Warning', 'Please select at least one job.', 'warning');
            return;
        }

        $selectedIds.val(ids.join(','));
        const modal = new bootstrap.Modal($modal[0]);
        modal.show();
    });

    // Reset on modal close
    $modal.on('hidden.bs.modal', function () {
        $rowCheckboxes.prop('checked', false);
        $selectAll.prop('checked', false);
        $btnWrapper.hide();
    });

    // FIXED: Form Validation for Closing Date (now uses shared showToast)
    const advertisementForm = document.getElementById('advertisementForm');
    advertisementForm.addEventListener('submit', function (e) {
        const closingDateInput = document.querySelector('input[name="closing_date"]');
        const closingDateValue = closingDateInput.value.trim();

        // Check if empty
        if (!closingDateValue) {
            e.preventDefault();
            showToast('Please fill the closing date.', 'warning');
            return false;
        }

        // Check if date is before or equal to today
        const today = new Date();
        const closingDate = new Date(closingDateValue);
        today.setHours(0, 0, 0, 0);
        closingDate.setHours(0, 0, 0, 0);

        if (closingDate <= today) {
            e.preventDefault();
            showToast('Closing date must be after the current date.', 'danger');
            return false;
        }

        // All good
        showToast('Advertisement form validated successfully.', 'success');
    });

    // Initial update
    updateCreateButton();
});

// Add Term Function (unchanged)
function addTerm() {
    const container = document.getElementById('termsContainer');
    const div = document.createElement('div');
    div.className = 'input-group mb-2 term-group';
    div.innerHTML = `
        <textarea class="form-control" name="terms_conditions[]" rows="2" placeholder="Enter term & condition"></textarea>
        <button type="button" class="btn btn-outline-danger" onclick="this.parentElement.remove()">Remove</button>
    `;
    container.appendChild(div);
}

/* SEARCH + PAGINATION – Unchanged */
document.addEventListener('DOMContentLoaded', function () {
    const $search   = $('#jobDetailsSearch');
    const $clear    = $('#clearJobDetailsSearch');
    const $tbody    = $('#jobDetailsTable tbody');
    const $pagWrap  = $('#pagination-wrapper');

    const URL_PARAM = 'search';
    const STORAGE   = 'jobDetailsSearchTerm';

    function filterRows(term) {
        const lower = term.toLowerCase();
        $tbody.find('tr').each(function () {
            const txt = $(this).text().toLowerCase();
            $(this).toggle(txt.includes(lower));
        });
    }

    const urlParams = new URLSearchParams(window.location.search);
    let term = urlParams.get(URL_PARAM) || localStorage.getItem(STORAGE) || '';
    $search.val(term);
    if (term) filterRows(term);

    $search.on('input', function () {
        term = $(this).val().trim();
        localStorage.setItem(STORAGE, term);
        filterRows(term);
    });

    $clear.on('click', function () {
        $search.val('');
        localStorage.removeItem(STORAGE);
        $tbody.find('tr').show();
    });

    $pagWrap.on('click', 'a', function (e) {
        e.preventDefault();
        const url = new URL(this.href);
        const cur = $search.val().trim();
        if (cur) url.searchParams.set(URL_PARAM, cur);
        else url.searchParams.delete(URL_PARAM);

        $.get(url.toString(), function (html) {
            const $newDoc = $($.parseHTML(html));
            const $newBody = $newDoc.find('#jobDetailsTable tbody');
            if ($newBody.length) $tbody.html($newBody.html());
            const $newPag = $newDoc.find('#pagination-wrapper');
            if ($newPag.length) $pagWrap.html($newPag.html());
            filterRows($search.val().trim());
        }).fail(() => window.location = url.toString());
    });
});