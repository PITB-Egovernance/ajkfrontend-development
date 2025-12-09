$(document).ready(function() {
            let currentStep = 1;

            // Initialize form
            updateSteps();

            // Validate fields
            function checkFields(step) {
                let errors = [];
                $('.form-step[data-step="' + step + '"] .form-control, .form-step[data-step="' + step + '"] .form-select, .form-step[data-step="' + step + '"] input[type="checkbox"]').each(function() {
                    let $field = $(this);
                    let fieldName = $field.attr('name')?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    $field.removeClass('is-invalid');
                    $field.next('.invalid-feedback').text('');

                    if ($field.prop('required') && !$field.val() && $field.attr('type') !== 'checkbox') {
                        $field.addClass('is-invalid');
                        $field.next('.invalid-feedback').text(`The ${fieldName} field is required.`);
                        errors.push(`The ${fieldName} field is required.`);
                    }

                    if ($field.attr('type') === 'checkbox' && $field.prop('required')) {
                        let $checkboxGroup = $('input[name="' + $field.attr('name') + '"]');
                        if ($checkboxGroup.filter(':checked').length === 0) {
                            $checkboxGroup.closest('.form-group').find('.invalid-feedback').text(`At least one ${fieldName} must be selected.`);
                            $checkboxGroup.closest('.form-group').find('.invalid-feedback').show();
                            errors.push(`At least one ${fieldName} must be selected.`);
                        }
                    }

                    if (($field.attr('id') === 'service_rules' || $field.attr('id') === 'syllabus') && $field[0].files.length > 0) {
                        let file = $field[0].files[0];
                        if (file.type !== 'application/pdf') {
                            $field.addClass('is-invalid');
                            $field.next('.invalid-feedback').text(`The ${fieldName} must be a PDF file.`);
                            errors.push(`The ${fieldName} must be a PDF file.`);
                        }
                        if (file.size > 2048000) {
                            $field.addClass('is-invalid');
                            $field.next('.invalid-feedback').text(`The ${fieldName} must be less than 2MB.`);
                            errors.push(`The ${fieldName} must be less than 2MB.`);
                        }
                    }
                });
                return errors;
            }

            // Show toast
            function showToast(type, message) {
                let toastId = type === 'success' ? 'successToast' : 'errorToast';
                let toastBody = $('#' + type + 'ToastBody');
                toastBody.html(message);
                let toast = new bootstrap.Toast($('#' + toastId));
                toast.show();
            }

            // Update stepper
            function updateSteps() {
                $('.step').removeClass('active completed');
                for (let i = 1; i <= currentStep; i++) {
                    let step = $('.step[data-step="' + i + '"]');
                    step.addClass(i === currentStep ? 'active' : 'completed');
                }
                $('.step-progress').removeClass('active-1 active-2 active-3 active-4 active-5').addClass('active-' + currentStep);
            }

            // Next button handler
            $('.btn-next').on('click', function() {
                let step = parseInt($(this).closest('.form-step').attr('data-step'));
                let errors = checkFields(step);
                if (errors.length > 0) {
                    showToast('error', errors.join('<br>'));
                    return;
                }

                if (step < 5) {
                    $('.form-step[data-step="' + step + '"]').removeClass('active');
                    $('.form-step[data-step="' + (step + 1) + '"]').addClass('active');
                    currentStep = step + 1;
                    $('#step').val(currentStep);
                    updateSteps();
                }
            });

            // Previous button handler
            $('.btn-prev').on('click', function() {
                let step = parseInt($(this).closest('.form-step').attr('data-step'));
                if (step > 1) {
                    $('.form-step[data-step="' + step + '"]').removeClass('active');
                    $('.form-step[data-step="' + (step - 1) + '"]').addClass('active');
                    currentStep = step - 1;
                    $('#step').val(currentStep);
                    updateSteps();
                }
            });

       $('#requisitionForm').on('submit', function (e) {
    e.preventDefault();

    // client-side validation (unchanged)
    const step = parseInt($('#step').val());
    const errors = checkFields(step);
    if (errors.length) {
        showToast('error', errors.join('<br>'));
        return;
    }

    $.ajax({
        // url: '{{ route("jobs.store") }}',
        url: window.routes.storeJob,
        method: 'POST',
        data: $(this).serialize(),                     // Laravel receives arrays automatically
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        },
        success: function (res) {
            showToast('success', res.message || 'Form submitted successfully!');
            // optional: redirect after a short delay
            // setTimeout(() => location.href = '{{ route("jobCreation") }}', 1500);
            setTimeout(() => location.href = window.routes.createJob, 1500);
        },
        error: function (xhr) {
            let msg = 'An unknown error occurred.';
            if (xhr.status === 422 && xhr.responseJSON) {
                // Laravel validation errors
                const errs = Object.values(xhr.responseJSON.errors || {}).flat();
                msg = errs.join('<br>');
            } else if (xhr.responseJSON && xhr.responseJSON.message) {
                msg = xhr.responseJSON.message;
            }
            showToast('error', msg);
        }
    });
});
            // Dynamic show/hide for equivalent qualification & age relaxation
            $('#equivalent_qualification').on('change', function() {
                let $ageRelaxationDetails = $('.age-relaxation-details');
                $ageRelaxationDetails.toggle(this.value === 'Yes');
            });
            $('#age_relaxation').on('change', function() {
                let $ageRelaxationDetails = $('.age-relaxation-details');
                $ageRelaxationDetails.toggle(this.value === 'Yes');
            });

            // Dynamic qualification and degree inputs
            ['academic_qualification', 'min_qualification', 'degree_equivalence', 'educational_requirement', 'experience_requirement'].forEach(id => {
                let $select = $('#' + id);
                let $input = $('#' + (id === 'degree_equivalence' ? 'other_degree' : id === 'min_qualification' ? 'other' : id === 'educational_requirement' ? 'other_edu' : id === 'experience_requirement' ? 'other_exp' : 'other_qualification'));

                $select.on('change', function() {
                    $input.toggle(this.value === 'Other' || (this.multiple && Array.from(this.options).some(opt => opt.value === 'Other' && opt.selected))).val('');
                    if (this.value === 'Other' || (this.multiple && Array.from(this.options).some(opt => opt.value === 'Other' && opt.selected))) $input.focus();
                });

                $input.on('blur', function() {
                    let value = $(this).val().trim();
                    if (value) {
                        if (!$select.find('option').filter(function() { return this.value.toLowerCase() === value.toLowerCase(); }).length) {
                            $select.append($('<option>', { value: value, text: value }));
                        }
                        $select.val(value);
                        $(this).val('').hide();
                    }
                });

                $input.on('keypress', function(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        let value = $(this).val().trim();
                        if (value) {
                            if (!$select.find('option').filter(function() { return this.value.toLowerCase() === value.toLowerCase(); }).length) {
                                $select.append($('<option>', { value: value, text: value }));
                            }
                            $select.val(value);
                            $(this).val('').hide();
                        }
                    }
                });
            });

            // Sync total posts
            $('#number_of_posts').on('input', function() {
                $('#total_posts').val($(this).val());
            });
        });