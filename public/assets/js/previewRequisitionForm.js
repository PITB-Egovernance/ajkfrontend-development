/* requisitionPreview.js */
document.addEventListener('DOMContentLoaded', function () {
    const confirmBtn = document.getElementById('confirmRequisitionBtn');
    if (!confirmBtn) return;

    confirmBtn.addEventListener('click', function () {
        const tempId = window.routes.tempId;
        const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

        if (!tempId) {
            Swal.fire('Error!', 'Invalid requisition ID.', 'error');
            return;
        }

        fetch(window.routes.confirmUrl, {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': csrfToken,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ step: 'confirm', temp_id: tempId })
        })
        .then(async res => {
            if (!res.ok) {
                const text = await res.text();
                console.error('Server error:', text);
                throw new Error('Server responded with error');
            }
            return res.json();
        })
        .then(data => {
            if (data.success) {
                Swal.fire({
                    title: 'Success!',
                    text: 'Requisition successfully saved!',
                    icon: 'success',
                    confirmButtonText: 'OK'
                }).then(() => {
                    window.location.href = window.routes.allRequisitions;
                });
            } else {
                Swal.fire({
                    title: 'Error!',
                    text: data.error || 'Failed to save requisition.',
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
            }
        })
        .catch(err => {
            console.error('Fetch error:', err);
            Swal.fire({
                title: 'Error!',
                text: 'Network or server error. Check console.',
                icon: 'error',
                confirmButtonText: 'OK'
            });
        });
    });
});