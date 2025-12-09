
document.getElementById("exportAllTables").addEventListener("click", async () => {
  const { jsPDF } = window.jspdf;
  const container = document.querySelector(".paper");   // <-- the element you want in the PDF

  /* ---------- 1. PRE-PROCESS STYLES ---------- */
  const originalStyles = new Map();   // key = element, value = {prop: originalValue}

  const saveStyle = (el, prop) => {
    if (!originalStyles.has(el)) originalStyles.set(el, {});
    if (!(prop in originalStyles.get(el))) {
      originalStyles.get(el)[prop] = el.style[prop];
    }
  };

  // 1. Force readable colours
  container.querySelectorAll("*").forEach(el => {
    const computed = window.getComputedStyle(el);
    if (computed.color.includes("color(")) {
      saveStyle(el, "color");
      el.style.color = "#000";
    }
    if (computed.backgroundColor.includes("color(")) {
      saveStyle(el, "backgroundColor");
      el.style.backgroundColor = "#fff";
    }
  });

  // 2. Force table borders (jsPDF ignores CSS borders otherwise)
  container.querySelectorAll("table, th, td").forEach(el => {
    saveStyle(el, "border");
    saveStyle(el, "borderCollapse");
    saveStyle(el, "borderSpacing");
    el.style.border = "1px solid #000";
    if (el.tagName.toLowerCase() === "table") {
      el.style.borderCollapse = "collapse";
      el.style.borderSpacing = "0";
    }
  });

  // Give the browser a tick to apply the forced styles
  await new Promise(r => setTimeout(r, 120));

  /* ---------- 2. CAPTURE WITH html2canvas ---------- */
  const canvas = await html2canvas(container, {
    scale: 1.5,                // good quality / reasonable file size
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    windowWidth: container.scrollWidth,
    windowHeight: container.scrollHeight
  });

  /* ---------- 3. BUILD PDF ---------- */
  const imgData   = canvas.toDataURL("image/png");
  const pdf       = new jsPDF("p", "mm", "a4");
  const pageW     = pdf.internal.pageSize.getWidth();
  const pageH     = pdf.internal.pageSize.getHeight();
  const imgW      = pageW;
  const imgH      = (canvas.height * imgW) / canvas.width;

  let heightLeft  = imgH;
  let yPos        = 0;

  pdf.addImage(imgData, "PNG", 0, yPos, imgW, imgH);
  heightLeft -= pageH;

  while (heightLeft > 0) {
    yPos = heightLeft - imgH;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, yPos, imgW, imgH);
    heightLeft -= pageH;
  }

  /* ---------- 4. SAVE & RESTORE STYLES ---------- */
  pdf.save(`${document.querySelector(".notice-top").textContent.trim().split('\n')[0] || "advertisement"}.pdf`);

  // Restore every element to its original look
  originalStyles.forEach((props, el) => {
    Object.keys(props).forEach(p => el.style[p] = props[p]);
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
