
        $(document).ready(function() {
            // Auto-generate Diary/Outward No if not set
            if (!$('#diary_outward_no').val()) {
                $('#diary_outward_no').val('AUTO-' + Math.floor(Math.random() * 1000000));
            }
        });

$(function () {
    // ---- Auto-generate Diary/Outward No (only if empty) ----
    const diaryField = $('#diary_outward_no');
    if (!diaryField.val().trim()) {
        diaryField.val('AUTO-' + Math.floor(Math.random() * 1000000));
    }

    // ---- Client-side empty-field validation ----
    const form = $('#correspondenceForm');

    form.on('submit', function (e) {
        let hasError   = false;
        let firstError = null;

        // Reset previous styles & messages
        $('.form-control, .form-select')
            .removeClass('is-invalid')
            .next('.invalid-feedback').text('');

        $(this).find('[required]').each(function () {
            const $el   = $(this);
            const name  = $el.attr('name');
            const label = $('label[for="' + name + '"]')
                            .text()
                            .replace('*','')
                            .trim();

            let empty = false;

            // ----- Detect empty value -----
            if ($el.is('input[type="file"]')) {
                empty = $el[0].files.length === 0;
            } else if ($el.is('select, input[type="text"], input[type="date"], textarea')) {
                empty = !$el.val().trim();
            }

            // ----- Show error under the field -----
            if (empty && !$el.prop('readonly')) {
                $el.addClass('is-invalid');

                // Create feedback div if it does not exist yet
                let $feedback = $el.next('.invalid-feedback');
                if ($feedback.length === 0) {
                    $feedback = $('<div class="invalid-feedback"></div>');
                    $el.after($feedback);
                }

                $feedback.text(`The ${label} field is required.`);
                hasError = true;
                if (!firstError) firstError = $el;
            }
        });

        // ----- If any error → stop submit, show toast & scroll -----
        if (hasError) {
            e.preventDefault();
            showToast('error', 'Please fill all required fields.');
            if (firstError) {
                $('html, body').animate({
                    scrollTop: firstError.offset().top - 120
                }, 500);
            }
        }
    });

    // ---- Toast helper (unchanged) ----
    function showToast(type, msg) {
        const id = type === 'success' ? 'successToast' : 'errorToast';
        $('#' + type + 'ToastBody').html(msg);
        new bootstrap.Toast(document.getElementById(id)).show();
    }

    // ---- Show server-side success toast (if any) ----
    // @if(session('success'))
    //     showToast('success', "{{ session('success') }}");
    // @endif
});


document.addEventListener('DOMContentLoaded', function() {
    const dateField = document.getElementById('date_dispatch');
    if (!dateField.value) {
        const today = new Date().toISOString().split('T')[0];
        dateField.value = today;
    }
});
