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

function addDiseaseInput() {
    const container = document.getElementById('disease-container');
    const newInputGroup = document.createElement('div');
    newInputGroup.className = 'disease-input-group mb-2 d-flex align-items-center gap-2';
    newInputGroup.innerHTML = `
        <TextArea type="text" class="form-control rounded-3" name="disease_names[]" placeholder="Enter Terms & Conditions" required></TextArea>
        <button type="button" class="btn btn-danger px-3" onclick="this.parentElement.remove()">Remove</button>
    `;
    container.appendChild(newInputGroup);
}
