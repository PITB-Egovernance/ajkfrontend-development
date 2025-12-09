
      $(document).ready(function() {
        // Search Functionality for Job Details
        $('#jobDetailsSearch').on('keyup', function() {
          var value = $(this).val().toLowerCase();
          $('#jobDetailsTable tbody tr').filter(function() {
            $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1);
          });
        });

        $('#clearJobDetailsSearch').on('click', function() {
          $('#jobDetailsSearch').val('');
          $('#jobDetailsTable tbody tr').show();
        });

        // Search Functionality for Criteria
        $('#criteriaSearch').on('keyup', function() {
          var value = $(this).val().toLowerCase();
          $('#criteriaTable tbody tr').filter(function() {
            $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1);
          });
        });

        $('#clearCriteriaSearch').on('click', function() {
          $('#criteriaSearch').val('');
          $('#criteriaTable tbody tr').show();
        });

        // Search Functionality for Eligibility
        $('#eligibilitySearch').on('keyup', function() {
          var value = $(this).val().toLowerCase();
          $('#eligibilityTable tbody tr').filter(function() {
            $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1);
          });
        });

        $('#clearEligibilitySearch').on('click', function() {
          $('#eligibilitySearch').val('');
          $('#eligibilityTable tbody tr').show();
        });

        // PDF Export Functionality
        const { jsPDF } = window.jspdf;

        function exportTableToPDF(tableId, filename, title) {
          const doc = new jsPDF();

          // Add header
          doc.setFontSize(18);
          doc.setTextColor(0, 102, 34);
          doc.text(title, 14, 22);

          // Add date
          doc.setFontSize(10);
          doc.setTextColor(100);
          doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

          // Table data
          const table = document.getElementById(tableId);
          const rows = [];
          const headers = [];

          // Get headers
          $(table).find('thead th').each(function(index) {
            if (index !== $(table).find('thead th').length - 1) { // Skip Actions column
              headers.push($(this).text().trim());
            }
          });

          // Get visible rows data
          $(table).find('tbody tr:visible').each(function() {
            const rowData = [];
            $(this).find('td').each(function(index) {
              if (index !== $(this).parent().find('td').length - 1) { // Skip Actions column
                rowData.push($(this).text().trim());
              }
            });
            rows.push(rowData);
          });

          // Generate table in PDF
          doc.autoTable({
            startY: 40,
            head: [headers],
            body: rows,
            theme: 'striped',
            headStyles: {
              fillColor: [0, 102, 34],
              textColor: [255, 255, 255],
              fontSize: 10
            },
            bodyStyles: {
              fontSize: 9
            },
            margin: { top: 40 }
          });

          doc.save(filename);
        }

        $('#exportJobDetails').on('click', function() {
          exportTableToPDF('jobDetailsTable', 'Job_Details.pdf', 'Job Details Report');
        });

        $('#exportCriteria').on('click', function() {
          exportTableToPDF('criteriaTable', 'Criteria.pdf', 'Criteria Report');
        });

        $('#exportEligibility').on('click', function() {
          exportTableToPDF('eligibilityTable', 'Eligibility.pdf', 'Eligibility Report');
        });

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
      });
    

function confirmDelete(id) {
    Swal.fire({
      title: 'Delete Record?',
      text: "Are you sure you want to delete this Annex A Record?",
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
