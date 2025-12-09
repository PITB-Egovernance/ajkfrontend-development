
document.addEventListener("DOMContentLoaded", function () {
  const steps = document.querySelectorAll(".form-step");
  const jobForm = document.getElementById("jobForm");
  const criteriaForm = document.getElementById("criteriaForm");
  const eligibilityForm = document.getElementById("eligibilityForm");

  const saveJobBtn = document.getElementById("saveJobBtn");
  const saveCriteriaBtn = document.getElementById("saveCriteriaBtn");
  const saveEligibilityBtn = document.getElementById("saveEligibilityBtn");

  // Conditional field visibility for Age Relaxation
      const ageRelaxationSelect = document.getElementById("age_relaxation");
      const relaxationReasonContainer = document.getElementById("relaxation_reason_container");
      const relaxationYearsContainer = document.getElementById("relaxation_years_container");

      function toggleAgeRelaxationFields() {
        const show = ageRelaxationSelect.value === "Yes";
        relaxationReasonContainer.style.display = show ? "block" : "none";
        relaxationYearsContainer.style.display = show ? "block" : "none";
        if (!show) {
          relaxationReasonContainer.querySelector("input").value = "";
          relaxationYearsContainer.querySelector("input").value = "";
        }
      }

      ageRelaxationSelect.addEventListener("change", toggleAgeRelaxationFields);
      toggleAgeRelaxationFields(); // Initial check on page load

      // Conditional field visibility for Equivalent Qualification
      const equivalentQualificationSelect = document.getElementById("equivalent_qualification");
      const authorityCertificateContainer = document.getElementById("authority_certificate_container");

      function toggleAuthorityCertificateField() {
        const show = equivalentQualificationSelect.value === "Yes";
        authorityCertificateContainer.style.display = show ? "block" : "none";
        if (!show) {
          authorityCertificateContainer.querySelector("input").value = "";
        }
      }

      equivalentQualificationSelect.addEventListener("change", toggleAuthorityCertificateField);
      toggleAuthorityCertificateField(); // Initial check on page load

  
  // 🔥 Bootstrap Toast Helper
  function showToast(message, type = "success") {
    const toastContainer = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.role = "alert";
    toast.ariaLive = "assertive";
    toast.ariaAtomic = "true";
    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>`;
    toastContainer.appendChild(toast);

    const bsToast = new bootstrap.Toast(toast, { delay: 3000 });
    bsToast.show();

    toast.addEventListener("hidden.bs.toast", () => toast.remove());
  }

   // 🔹 Function to switch steps
  function goToStep(stepNumber) {
    steps.forEach((step) => step.classList.remove("active"));
    const target = document.querySelector(`.form-step[data-step="${stepNumber}"]`);
    if (target) target.classList.add("active");

    document.querySelectorAll(".step").forEach((st) => {
      const num = parseInt(st.dataset.step);
      st.classList.remove("active", "completed");
      if (num === stepNumber) st.classList.add("active");
      else if (num < stepNumber) st.classList.add("completed");
    });

    // Update the step-progress class for the line fill
    const stepper = document.getElementById("formStepper");
    stepper.classList.remove('active-1', 'active-2', 'active-3');
    stepper.classList.add('active-' + stepNumber);
  }

  // 🔹 STEP 1: JOB DETAILS
// 🔹 STEP 1: JOB DETAILS
saveJobBtn.addEventListener("click", function () {
    const formData = new FormData(jobForm);
    const serviceRulesInput = document.getElementById("service_rules");
    const syllabusInput = document.getElementById("syllabus");
    let errors = [];

    // Clear previous invalid states
    [serviceRulesInput, syllabusInput].forEach(input => {
        input.classList.remove("is-invalid");
        const feedback = input.nextElementSibling?.classList.contains("invalid-feedback")
            ? input.nextElementSibling
            : input.parentElement.querySelector(".invalid-feedback");
        if (feedback) feedback.textContent = "";
    });

    // File size validation (2MB = 2,048,000 bytes)
    if (serviceRulesInput.files.length > 0) {
        const file = serviceRulesInput.files[0];
        if (file.size > 2048000) {
            serviceRulesInput.classList.add("is-invalid");
            const feedback = serviceRulesInput.nextElementSibling?.classList.contains("invalid-feedback")
                ? serviceRulesInput.nextElementSibling
                : serviceRulesInput.parentElement.querySelector(".invalid-feedback");
            if (feedback) feedback.textContent = "The Service Rules file must be less than 2MB.";
            errors.push("The Service Rules file must be less than 2MB.");
        }
    }

    if (syllabusInput.files.length > 0) {
        const file = syllabusInput.files[0];
        if (file.size > 2048000) {
            syllabusInput.classList.add("is-invalid");
            const feedback = syllabusInput.nextElementSibling?.classList.contains("invalid-feedback")
                ? syllabusInput.nextElementSibling
                : syllabusInput.parentElement.querySelector(".invalid-feedback");
            if (feedback) feedback.textContent = "The Syllabus file must be less than 2MB.";
            errors.push("The Syllabus file must be less than 2MB.");
        }
    }

    // If there are errors, show toast and stop
    if (errors.length > 0) {
        showToast(errors.join(" "), "danger");
        return;
    }

    fetch(jobForm.action, {
        method: "POST",
        headers: {
            "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]').content,
            "X-HTTP-Method-Override": "PUT"
        },
        body: formData,
    })
        .then((res) => res.json())
        .then((data) => {
            if (data.success) {
                showToast(data.message, "success");
                goToStep(2);
            } else {
                showToast("Error updating job details!", "danger");
            }
        })
        .catch(() => showToast("Something went wrong!", "danger"));
});

  // 🔹 STEP 2: CRITERIA
  saveCriteriaBtn.addEventListener("click", function () {
    const formData = new FormData(criteriaForm);

    fetch(criteriaForm.action, {
      method: "POST",
      headers: {
        "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]').content,
        "X-HTTP-Method-Override": "PUT"
      },
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          showToast(data.message, "success");
          goToStep(3);
        } else {
          showToast("Error updating criteria!", "danger");
        }
      })
      .catch(() => showToast("Something went wrong!", "danger"));
  });

  // 🔹 STEP 3: ELIGIBILITY
  saveEligibilityBtn.addEventListener("click", function () {
    const formData = new FormData(eligibilityForm);

    fetch(eligibilityForm.action, {
      method: "POST",
      headers: {
        "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]').content,
        "X-HTTP-Method-Override": "PUT"
      },
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          showToast("✅ All steps updated successfully!", "success");
          setTimeout(() => {
           // window.location.href = "{{ route('view.all.requisitions') }}";
           window.location.href = window.redirectUrl ;
          }, 2000);
        } else {
          showToast("Error updating eligibility!", "danger");
        }
      })
      .catch(() => showToast("Something went wrong!", "danger"));
  });

  // 🔹 Previous buttons
  document.querySelectorAll(".btn-prev").forEach((btn) => {
    btn.addEventListener("click", function () {
      const currentStep = parseInt(this.closest(".form-step").dataset.step);
      goToStep(currentStep - 1);
    });
  });
});

function showToast(message, type = 'success') {
  const toastContainer = document.getElementById('toastContainer');
  toastContainer.innerHTML = `
    <div class="toast align-items-center custom-toast border-0 show"
         role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body text-center w-100">
          ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto"
                data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `;

  const toastEl = toastContainer.querySelector('.toast');
  const bsToast = new bootstrap.Toast(toastEl, { delay: 2000 });
  bsToast.show();
}

  document.addEventListener("DOMContentLoaded", function() {
    // Get both inputs
    const numPostsInput = document.getElementById("num_posts");
    const totalPostsInput = document.getElementById("total_posts");

    if (numPostsInput && totalPostsInput) {
        // Initially copy value if user already filled step 1
        totalPostsInput.value = numPostsInput.value;

        // Update dynamically whenever user changes value in step 1
        numPostsInput.addEventListener("input", function() {
            totalPostsInput.value = this.value;
        });
    }
});

document.addEventListener("DOMContentLoaded", function () {
    // Function to add a new row
    window.addRow = function (el) {
        const tableBody = document.querySelector("#bookRows");
        const totalRows = document.querySelector("#totalRows");

        // Get the row template (the current row)
        const currentRow = el.closest("tr");

        // Clone the current row
        const newRow = currentRow.cloneNode(true);

        // Reset the input/select values
        newRow.querySelectorAll("input, select").forEach(input => {
            input.value = "";
        });

        // Append new row to tbody
        tableBody.appendChild(newRow);

        // Update total rows count
        totalRows.textContent = tableBody.querySelectorAll("tr").length;
    };

    // Function to remove a row
    window.removeRow = function (el) {
        const tableBody = document.querySelector("#bookRows");
        const totalRows = document.querySelector("#totalRows");

        // Only remove if more than one row remains
        if (tableBody.querySelectorAll("tr").length > 1) {
            el.closest("tr").remove();
            totalRows.textContent = tableBody.querySelectorAll("tr").length;
        } else {
            toastr.warning("At least one row is required!");
        }
    };
});
