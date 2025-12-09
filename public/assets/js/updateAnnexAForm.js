
    $(function() {
        // disable native HTML5 validation UI
        $('#requisitionForm').attr('novalidate', 'novalidate');

        $('#requisitionForm').on('submit', function(e) {
            e.preventDefault(); // always prevent native submit, we'll submit programmatically when valid
            var form = this;
            var isValid = true;

            // find all controls we want to validate
            $(form).find('.form-control, .form-select').each(function() {
                var $field = $(this);
                var val = $.trim($field.val() || '');
                var $label = $field.closest('.form-group').find('label').first();
                var labelText = $label.length ? $label.text().trim() : $field.attr('name');

                if (val === '') {
                    // show dynamic message built from label
                    $field.addClass('is-invalid');
                    $field.closest('.form-group').find('.invalid-feedback').first().text('This ' +""+ labelText +""+ ' field is required.');
                    isValid = false;
                } else {
                    $field.removeClass('is-invalid');
                    $field.closest('.form-group').find('.invalid-feedback').first().text('');
                }
            });

            if (!isValid) {
                // focus first invalid field
                $(form).find('.is-invalid').first().focus();
                return false;
            }

            // all good -> submit natively (this bypasses jQuery handlers)
            form.submit();
        });

        // realtime: clear message when user types/selects
        $(document).on('input change', '#requisitionForm .form-control, #requisitionForm .form-select', function() {
            var $field = $(this);
            var val = $.trim($field.val() || '');
            if (val !== '') {
                $field.removeClass('is-invalid');
                $field.closest('.form-group').find('.invalid-feedback').first().text('');
            }
        });
    });

   
