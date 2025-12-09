
document.addEventListener('DOMContentLoaded', function () {
    const dropdowns = document.querySelectorAll('.status-dropdown');

    dropdowns.forEach(dropdown => {
        dropdown.dataset.previousValue = dropdown.value; // Store initial value

        dropdown.addEventListener('change', async function () {
            const jobId = this.dataset.id;
            const newStatus = this.value;
            const oldStatus = this.dataset.previousValue;

            let rejectionReason = null;

            // Show rejection reason modal only for "rejected"
            if (newStatus === 'rejected') {
                const result = await Swal.fire({
                    title: 'Rejection Reason',
                    input: 'textarea',
                    inputLabel: 'Why is this requisition rejected?',
                    inputPlaceholder: 'Enter a detailed reason...',
                    showCancelButton: true,
                    confirmButtonText: 'Submit',
                    cancelButtonText: 'Cancel',
                    width: '420px',
                    customClass: {
                        popup: 'rounded-3 shadow-sm',
                        title: 'fw-semibold fs-6',
                        input: 'form-control',
                        confirmButton: 'btn btn-danger btn-sm',
                        cancelButton: 'btn btn-secondary btn-sm',
                    },
                    preConfirm: (value) => {
                        if (!value || value.trim() === '') {
                            Swal.showValidationMessage('Rejection reason is required');
                        }
                        return value.trim();
                    }
                });

                if (!result.isConfirmed) {
                    this.value = oldStatus;
                    return;
                }

                rejectionReason = result.value;
            }

            const payload = { status: newStatus };
            if (rejectionReason) {
                payload.rejection_reason = rejectionReason;
            }

            fetch(`/update-status/${jobId}`, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(payload)
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw err; });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                   toastr.success(`Status updated to "${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}" successfully`);
                    dropdown.dataset.previousValue = newStatus; // Update stored value
                } else {
                    throw new Error(data.message || 'Update failed');
                }
            })
            .catch(error => {
                console.error('Update error:', error);
                const msg = error.errors
                    ? Object.values(error.errors)[0][0]
                    : (error.message || 'Failed to update status');
                toastr.error(msg);
                dropdown.value = oldStatus; // Revert on error
            });
        });
    });
});



    toastr.options = {
        "closeButton": true,
        "debug": false,
        "newestOnTop": true,
        "progressBar": true,
        "positionClass": "toast-top-right",
        "preventDuplicates": false,
        "onclick": null,
        "showDuration": "300",
        "hideDuration": "1000",
        "timeOut": "3000",
        "extendedTimeOut": "1000",
        "showEasing": "swing",
        "hideEasing": "linear",
        "showMethod": "fadeIn",
        "hideMethod": "fadeOut"
    };

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
        width: '340px',
        padding: '0.2em',
        customClass: {
            popup: 'rounded-3 shadow-sm',
            title: 'fw-semibold fs-6',
            htmlContainer: 'fs-7 text-muted',
            confirmButton: 'btn btn-danger btn-sm px-3',
            cancelButton: 'btn btn-secondary btn-sm px-3'
        }
    }).then((result) => {
        if (result.isConfirmed) {
            document.getElementById('deleteAnnexForm' + id).submit();
        }
    });
}
