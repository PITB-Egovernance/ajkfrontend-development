
      document.addEventListener('DOMContentLoaded', function () {
        const searchInput = document.getElementById('advertisementsSearch');
        const clearBtn = document.getElementById('clearAdvertisementsSearch');
        const table = document.getElementById('advertisementsTable');
        const rows = table.querySelectorAll('tbody tr');

        searchInput.addEventListener('input', function () {
          const query = this.value.toLowerCase();
          rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(query) ? '' : 'none';
          });
        });

        clearBtn.addEventListener('click', function () {
          searchInput.value = '';
          rows.forEach(row => row.style.display = '');
        });
      });
    