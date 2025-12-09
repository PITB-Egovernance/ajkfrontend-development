/* annexAForm.js */
$(function () {
    // -----------------------------------------------------------------
    // Helper: show toast (Bootstrap 5)
    // -----------------------------------------------------------------
    function showToast(type, message) {
        const toastId   = type === 'success' ? 'successToast' : 'errorToast';
        const bodySel   = type === 'success' ? '#successToastBody' : '#errorToastBody';
        $(`#${toastId} ${bodySel}`).html(message);
        const toast = new bootstrap.Toast(document.getElementById(toastId));
        toast.show();
    }

    // -----------------------------------------------------------------
    // Check if Annex-A already submitted (only when temp_id exists)
    // -----------------------------------------------------------------
    if (window.routes?.tempId) {
        $.ajax({
            url: window.routes.checkAnnexA,
            type: 'GET',
            success: function (res) {
                if (res.submitted) {
                    $('#annexAForm')
                        .find('input, select, textarea, button[type="submit"]')
                        .prop('disabled', true);
                    showToast('error', 'Annex A has already been submitted for this requisition.');
                }
            },
            error: function () {
                showToast('error', 'Error checking Annex A status.');
            }
        });
    }

    // -----------------------------------------------------------------
    // Form validation + AJAX submit
    // -----------------------------------------------------------------
    $('#annexAForm').on('submit', function (e) {
        e.preventDefault();

        const $fields = $('.form-control, .form-select');
        const errors  = [];

        $fields.each(function () {
            const $f = $(this);
            const name = $f.attr('name')
                          ?.replace(/_/g, ' ')
                          .replace(/\b\w/g, l => l.toUpperCase());

            $f.removeClass('is-invalid');
            $f.siblings('.invalid-feedback').text('');

            if ($f.prop('required') && !$f.val()) {
                $f.addClass('is-invalid');
                $f.siblings('.invalid-feedback').text(`The ${name} field is required.`);
                errors.push(`The ${name} field is required.`);
            }
        });

        if (errors.length) {
            showToast('error', errors.join('<br>'));
            return;
        }

        const formData = new FormData(this);

        $.ajax({
            url: window.routes.storeAnnexA,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            headers: {
                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
            },
            success: function (res) {
                showToast('success', res.message || 'Annex A submitted successfully!');
                setTimeout(() => {
                    window.location.href = window.routes.requisition;
                }, 1500);
            },
            error: function (xhr) {
                const msg = xhr.responseJSON?.message || 'Error saving Annex A data.';
                showToast('error', msg);
            }
        });
    });
});