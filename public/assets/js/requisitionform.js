/* public/assets/js/requisitionForm.js */

document.addEventListener('DOMContentLoaded', function () {
    const config = window.config;
    let currentStep = config.step;
    let tempId = config.temp_id;

    // Show dynamic fields on load
    if ($('#equivalent_qualification').val() === 'Yes') $('.age-relaxation-details').show();
    if ($('#age_relaxation').val() === 'Yes') $('.age-relaxation-details').show();

    function checkFields(step) {
        let errors = [];
        $(`.form-step[data-step="${step}"] .form-control, .form-step[data-step="${step}"] .form-select`).each(function () {
            const $field = $(this);
            const fieldName = ($field.attr('name') || '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            $field.removeClass('is-invalid').siblings('.invalid-feedback').text('');

            if ($field.attr('required') && !$field.val()) {
                $field.addClass('is-invalid').siblings('.invalid-feedback').text(`The ${fieldName} field is required.`);
                errors.push(`The ${fieldName} field is required.`);
            }

            if ($field.attr('id') === 'service_rules') {
                if (!$field[0].files.length && !$field.siblings('.attachment-preview').length) {
                    $field.addClass('is-invalid').siblings('.invalid-feedback').text(`The ${fieldName} field is required.`);
                    errors.push(`The ${fieldName} field is required.`);
                } else if ($field[0].files.length) {
                    const file = $field[0].files[0];
                    if (file.type !== 'application/pdf') {
                        $field.addClass('is-invalid').siblings('.invalid-feedback').text(`The ${fieldName} must be a PDF file.`);
                        errors.push(`The ${fieldName} must be a PDF file.`);
                    }
                    if (file.size > 2048000) {
                        $field.addClass('is-invalid').siblings('.invalid-feedback').text(`The ${fieldName} must be less than 2MB.`);
                        errors.push(`The ${fieldName} must be less than 2MB.`);
                    }
                }
            } else if ($field.attr('id') === 'syllabus' && $field[0].files.length) {
                const file = $field[0].files[0];
                if (file.type !== 'application/pdf') {
                    $field.addClass('is-invalid').siblings('.invalid-feedback').text(`The ${fieldName} must be a PDF file.`);
                    errors.push(`The ${fieldName} must be a PDF file.`);
                }
                if (file.size > 2048000) {
                    $field.addClass('is-invalid').siblings('.invalid-feedback').text(`The ${fieldName} must be less than 2MB.`);
                    errors.push(`The ${fieldName} must be less than 2MB.`);
                }
            }
        });
        return errors;
    }

    $('.btn-next').on('click', function () {
        const errors = checkFields(currentStep);
        if (errors.length) return showToast('error', errors.join('<br>'));

        const formData = new FormData($('#requisitionForm')[0]);
        formData.append('step', currentStep);
        if (tempId) formData.append('temp_id', tempId);

        $.ajax({
            url: config.routes.store,
            method: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            headers: { 'X-CSRF-TOKEN': config.csrf },
            success: function (res) {
                tempId = res.temp_id;
                $('#temp_id').val(tempId);
                showToast('success', 'Step data saved.');

                if (currentStep === 1 && tempId) updateAnnexALink(tempId);

                if (currentStep < 3) {
                    $(`.form-step[data-step="${currentStep}"]`).removeClass('active');
                    currentStep++;
                    $(`.form-step[data-step="${currentStep}"]`).addClass('active');
                    $('#step').val(currentStep);
                    updateSteps();
                } else {
                    setTimeout(() => location.href = `/requisition/${tempId}/preview`, 1000);
                }
            },
            error: xhr => showToast('error', xhr.responseJSON?.message || 'Save failed.')
        });
    });

    $('.btn-prev').on('click', function () {
        if (currentStep > 1) {
            $(`.form-step[data-step="${currentStep}"]`).removeClass('active');
            currentStep--;
            $(`.form-step[data-step="${currentStep}"]`).addClass('active');
            $('#step').val(currentStep);
            updateSteps();
        }
    });

    $('#requisitionForm').on('submit', function (e) {
        e.preventDefault();
        const errors = checkFields(currentStep);
        if (errors.length) return showToast('error', errors.join('<br>'));

        const formData = new FormData(this);
        formData.append('step', 3);
        if (tempId) formData.append('temp_id', tempId);

        $.ajax({
            url: config.routes.store,
            method: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            headers: { 'X-CSRF-TOKEN': config.csrf },
            success: function () {
                $.ajax({
                    url: `/requisition/${tempId}/confirm`,
                    method: 'POST',
                    headers: { 'X-CSRF-TOKEN': config.csrf },
                    success: () => {
                        showToast('success', 'Requisition confirmed!');
                        setTimeout(() => location.href = `/requisition/${tempId}/preview`, 1500);
                    },
                    error: () => showToast('error', 'Confirm failed.')
                });
            },
            error: () => showToast('error', 'Final save failed.')
        });
    });

    function updateSteps() {
        $('.step').removeClass('active completed');
        for (let i = 1; i <= currentStep; i++) {
            $(`.step[data-step="${i}"]`).addClass(i === currentStep ? 'active' : 'completed');
        }
        $('.step-progress').removeClass('active-1 active-2 active-3').addClass('active-' + currentStep);
    }

    function showToast(type, msg) {
        const id = type === 'success' ? 'successToast' : 'errorToast';
        const body = type === 'success' ? '#successToastBody' : '#errorToastBody';
        $(body).html(msg);
        new bootstrap.Toast(document.getElementById(id)).show();
    }

    function updateAnnexALink(id) {
        $.get(config.routes.annexA_check.replace('__TEMP_ID__', id), function (res) {
            const html = res.submitted
                ? '<span class="text-success fw-bold ms-2">Annex “A” already submitted</span>'
                : `<a href="${config.routes.annexA_form.replace('__TEMP_ID__', id)}" class="ms-2 text-primary">Annex “A” Form</a>`;
            $('#annex-a-container').html(html);
        }).fail(() => {
            $('#annex-a-container').html(`<a href="${config.routes.annexA_form.replace('__TEMP_ID__', id)}" class="ms-2 text-primary">Annex “A” Form</a>`);
        });
    }

    // Dynamic fields
    $('#equivalent_qualification, #age_relaxation').on('change', function () {
        $('.age-relaxation-details').toggle(this.value === 'Yes');
    });

    // Custom qualification handlers
    ['academic_qualification', 'min_qualification', 'degree_equivalence'].forEach(id => {
        const select = document.getElementById(id);
        const inputId = id === 'academic_qualification' ? 'other_qualification' :
                        id === 'min_qualification' ? 'other' : 'other_degree';
        const input = document.getElementById(inputId);

        select.addEventListener('change', () => {
            input.style.display = select.value === 'Other' ? 'block' : 'none';
            if (select.value === 'Other') input.focus();
        });

        const addOption = () => {
            const val = input.value.trim();
            if (!val) return;
            if ([...select.options].some(o => o.value.toLowerCase() === val.toLowerCase())) return;
            const opt = new Option(val, val);
            select.add(opt, select.options[select.options.length - 1]);
            select.value = val;
            input.value = '';
            input.style.display = 'none';
        };

        input.addEventListener('blur', addOption);
        input.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } });
    });

   // ----  QUOTA TABLE – add / remove rows  ----
window.addRow = function (el) {
    const tbody   = document.getElementById('bookRows');
    const rows    = tbody.rows;
    const lastRow = rows[rows.length - 1];

    // 1. Remove icons from the previous last row
    if (lastRow) lastRow.querySelector('.action-cell').innerHTML = '';

    // 2. Build new row HTML (options are injected from Blade via window.config)
    const tr = document.createElement('tr');
    tr.className = 'border-bottom';
    tr.innerHTML = `
        <td>
            <select class="form-select" name="district[]" required>
                <option value="">Select District</option>
                ${window.config.districtOptions}
            </select>
        </td>
        <td>
            <input type="number" name="quota[]" class="form-control"
                   placeholder="Enter Quota in %" min="0" max="100">
        </td>
        <td>
            <input type="number" name="post[]" class="form-control"
                   placeholder="Enter Posts">
        </td>
        <td class="action-cell">
            <a href="javascript:void(0);" onclick="addRow(this)"
               class="text-secondary hover-opacity me-3">
                <i class="bi bi-plus-circle fs-3 text-success"></i>
            </a>
            <a href="javascript:void(0);" onclick="removeRow(this)"
               class="text-danger">
                <i class="bi bi-x-circle fs-4"></i>
            </a>
        </td>
    `;
    tbody.appendChild(tr);
    updateTotalRows();
};

window.removeRow = function (el) {
    const tbody = document.getElementById('bookRows');
    const row   = el.closest('tr');
    row.remove();

    const rows = tbody.rows;
    if (rows.length > 0) {
        // Re-add icons to the new last row
        rows[rows.length - 1].querySelector('.action-cell').innerHTML = `
            <a href="javascript:void(0);" onclick="addRow(this)"
               class="text-secondary hover-opacity me-3">
                <i class="bi bi-plus-circle fs-3 text-success"></i>
            </a>
            <a href="javascript:void(0);" onclick="removeRow(this)"
               class="text-danger">
                <i class="bi bi-x-circle fs-4"></i>
            </a>`;
    }
    updateTotalRows();
};

function updateTotalRows() {
    document.getElementById('totalRows').textContent =
        document.querySelectorAll('#bookRows tr').length;
}

    // Sync total posts
    const numPosts = document.getElementById('num_posts');
    const totalPosts = document.getElementById('total_posts');
    if (numPosts && totalPosts) {
        totalPosts.value = numPosts.value;
        numPosts.addEventListener('input', () => totalPosts.value = numPosts.value);
    }

    // Quota limit
    document.addEventListener('input', e => {
        if (e.target.name === 'quota[]') {
            if (e.target.value > 100) e.target.value = 100;
            if (e.target.value < 0) e.target.value = 0;
        }
    });

    // Flash error toast
    if (session('error'))
        $(() => new bootstrap.Toast(document.getElementById('flashErrorToast')).show());
    
});