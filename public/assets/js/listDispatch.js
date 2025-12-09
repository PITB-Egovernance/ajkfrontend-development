
/* --------------------------------------------------------------
   SEARCH + PAGINATION – works on every page
   -------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', function () {
    const $search   = $('#jobDetailsSearch');
    const $clear    = $('#clearJobDetailsSearch');
    const $tbody    = $('#jobDetailsTable tbody');
    const $pagWrap  = $('#pagination-wrapper');

    const URL_PARAM = 'search';               // query‑string key
    const STORAGE   = 'jobDetailsSearchTerm'; // localStorage fallback

    /* ---------------------------------------------------------
       Helper – filter current page rows
       --------------------------------------------------------- */
    function filterRows(term) {
        const lower = term.toLowerCase();
        $tbody.find('tr').each(function () {
            const txt = $(this).text().toLowerCase();
            $(this).toggle(txt.includes(lower));
        });
    }

    /* ---------------------------------------------------------
       1. Restore term from URL (first) → localStorage (fallback)
       --------------------------------------------------------- */
    const urlParams = new URLSearchParams(window.location.search);
    let term = urlParams.get(URL_PARAM) || localStorage.getItem(STORAGE) || '';
    $search.val(term);
    if (term) filterRows(term);

    /* ---------------------------------------------------------
       2. Live typing
       --------------------------------------------------------- */
    $search.on('input', function () {
        term = $(this).val().trim();
        localStorage.setItem(STORAGE, term);
        filterRows(term);
    });

    /* ---------------------------------------------------------
       3. Clear button
       --------------------------------------------------------- */
    $clear.on('click', function () {
        $search.val('');
        localStorage.removeItem(STORAGE);
        $tbody.find('tr').show();
        // also remove from URL on next pagination click
    });

    /* ---------------------------------------------------------
       4. Intercept pagination clicks → add ?search=…
       --------------------------------------------------------- */
    $pagWrap.on('click', 'a', function (e) {
        e.preventDefault();

        const url = new URL(this.href);
        const cur = $search.val().trim();

        if (cur) {
            url.searchParams.set(URL_PARAM, cur);
        } else {
            url.searchParams.delete(URL_PARAM);
        }

        // Load the new page **via AJAX** (keeps the layout)
        $.get(url.toString(), function (html) {
            const $newDoc = $($.parseHTML(html));

            // ---- replace table body ----
            const $newBody = $newDoc.find('#jobDetailsTable tbody');
            if ($newBody.length) $tbody.html($newBody.html());

            // ---- replace pagination ----
            const $newPag = $newDoc.find('#pagination-wrapper');
            if ($newPag.length) $pagWrap.html($newPag.html());

            // ---- re‑apply filter (term is still in the input) ----
            filterRows($search.val().trim());
        }).fail(function () {
            // fallback – just go to the link
            window.location = url.toString();
        });
    });
});

      // $(document).ready(function() {
      //   // Search Functionality for Job Details
      //   $('#jobDetailsSearch').on('keyup', function() {
      //     var value = $(this).val().toLowerCase();
      //     $('#jobDetailsTable tbody tr').filter(function() {
      //       $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1);
      //     });
      //   });

      //   $('#clearJobDetailsSearch').on('click', function() {
      //     $('#jobDetailsSearch').val('');
      //     $('#jobDetailsTable tbody tr').show();
      //   });

      

        // Form Validation (retained from original)
        $('#requisitionForm').attr('novalidate', 'novalidate');
        $('#requisitionForm').on('submit', function(e) {
          e.preventDefault();
          var form = this;
          var isValid = true;

          $(form).find('.form-control, .form-select').each(function() {
            var $field = $(this);
            var val = $.trim($field.val() || '');
            var $label = $field.closest('.form-group').find('label').first();
            var labelText = $label.length ? $label.text().trim() : $field.attr('name');

            if (val === '') {
              $field.addClass('is-invalid');
              $field.closest('.form-group').find('.invalid-feedback').first().text('This ' + labelText + ' field is required.');
              isValid = false;
            } else {
              $field.removeClass('is-invalid');
              $field.closest('.form-group').find('.invalid-feedback').first().text('');
            }
          });

          if (!isValid) {
            $(form).find('.is-invalid').first().focus();
            return false;
          }

          form.submit();
        });

        $(document).on('input change', '#requisitionForm .form-control, #requisitionForm .form-select', function() {
          var $field = $(this);
          var val = $.trim($field.val() || '');
          if (val !== '') {
            $field.removeClass('is-invalid');
            $field.closest('.form-group').find('.invalid-feedback').first().text('');
          }
        });



  function confirmDelete(id) {
    Swal.fire({
      title: 'Delete Record?',
      text: "Are you sure you want to delete this Job Detail Record?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      width: '340px', // ✅ Smaller popup width
      padding: '0.2em', // ✅ Less padding
      customClass: {
        popup: 'rounded-3 shadow-sm',
        title: 'fw-semibold fs-6', // ✅ Smaller title font
        htmlContainer: 'fs-7 text-muted', // ✅ Smaller text
        confirmButton: 'btn btn-danger btn-sm px-3',
        cancelButton: 'btn btn-secondary btn-sm px-3'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        document.getElementById('deleteAnnexForm' + id).submit();
      }
    });
  }

  function openUploadModal(jobId) {
    document.getElementById('job_id').value = jobId;
  }

document.addEventListener('DOMContentLoaded', function () {
  const uploadForm = document.getElementById('uploadForm');
  const toastContainer = document.getElementById('toastContainer');
  const maxSize = 2 * 1024 * 1024; // 2 MB limit

  // ✅ Toast Helper Function
  function showToast(message, type = 'danger') {
    const bgClass = type === 'success' ? 'bg-success' :
                    type === 'warning' ? 'bg-warning text-dark' :
                    'bg-danger';
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

  // ✅ Form Validation
  uploadForm.addEventListener('submit', function (e) {
    const requisitionForm = document.getElementById('requisition_form');
    const annexAForm = document.getElementById('annex_a_form');
    const otherAttachment = document.getElementById('other_attachment');
    const confirmUpload = document.getElementById('confirm_upload');

    // 🟡 Check for empty required files
    if (!requisitionForm.files.length) {
      e.preventDefault();
      showToast('Please upload the Requisition Form.', 'warning');
      return false;
    }

    if (!annexAForm.files.length) {
      e.preventDefault();
      showToast('Please upload the Annex A Form.', 'warning');
      return false;
    }

    // 🟡 Check for confirmation checkbox
    if (!confirmUpload.checked) {
      e.preventDefault();
      showToast('Please confirm the uploaded files before submitting.', 'warning');
      return false;
    }

    // 🔴 File size validation
    const filesToCheck = [
      { input: requisitionForm, name: 'Requisition Form' },
      { input: annexAForm, name: 'Annex A Form' },
      { input: otherAttachment, name: 'Other Attachment' },
    ];

    for (let fileObj of filesToCheck) {
      const file = fileObj.input.files[0];
      if (file && file.size > maxSize) {
        e.preventDefault();
        showToast(`${fileObj.name} must be less than 2 MB.`, 'danger');
        return false;
      }
    }

    // ✅ Everything is valid
    showToast('All files validated successfully. Uploading...', 'success');
  });
});
