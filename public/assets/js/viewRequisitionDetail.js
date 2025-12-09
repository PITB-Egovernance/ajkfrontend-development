
document.getElementById("exportAllTables").addEventListener("click", async () => {
  const container = document.querySelector(".container");

  // Temporarily simplify colors (fix unsupported color())
  container.querySelectorAll("*").forEach(el => {
    const style = window.getComputedStyle(el);
    if (style.color.startsWith("color(")) el.style.color = "black";
    if (style.backgroundColor.startsWith("color(")) el.style.backgroundColor = "white";
  });

  // 🩵 Fix: normalize table borders before rendering
  container.querySelectorAll("table, th, td").forEach(el => {
    el.style.borderCollapse = "separate";
    el.style.borderSpacing = "0";
    el.style.border = "1px solid black";
  });

  // Wait a bit for styles to apply
  await new Promise(r => setTimeout(r, 100));

  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff"
  });

  const imgData = canvas.toDataURL("image/png");
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save("requisition_form.pdf");

  // Restore original styles
  container.querySelectorAll("*").forEach(el => {
    el.style.color = "";
    el.style.backgroundColor = "";
    el.style.border = "";
    el.style.borderSpacing = "";
    el.style.borderCollapse = "";
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const dateSpan = document.getElementById("currentDate");
  const today = new Date();

  // Format date as DD-MM-YYYY
  const formattedDate = today.getDate().toString().padStart(2, '0') + '-' +
                        (today.getMonth() + 1).toString().padStart(2, '0') + '-' +
                        today.getFullYear();

  // Set date in the span
  dateSpan.textContent = formattedDate;
});
