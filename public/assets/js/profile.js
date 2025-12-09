
        $(document).ready(function() {
            // Show toasts if present
            $('.toast').toast('show');

            // Form validation for password change
            $('#changePasswordForm').attr('novalidate', 'novalidate');
            $('#changePasswordForm').on('submit', function(e) {
                var form = this;
                var isValid = true;

                $(form).find('.form-control').each(function() {
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
                    e.preventDefault();
                    $(form).find('.is-invalid').first().focus();
                    return false;
                }
            });

            // Clear validation on input
            $(document).on('input change', '#changePasswordForm .form-control', function() {
                var $field = $(this);
                var val = $.trim($field.val() || '');
                if (val !== '') {
                    $field.removeClass('is-invalid');
                    $field.closest('.form-group').find('.invalid-feedback').first().text('');
                }
            });
        });
  