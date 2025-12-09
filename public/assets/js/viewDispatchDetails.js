
document.getElementById("printReceiptBtn").addEventListener("click", function () {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'pt', 'a4');

    // Colors from your theme
    const primary = "#006622";
    const secondary = "#0B5E3C";
    const headerBg = "#f2f4f7";
    const textDark = "#333";

    // ------- Title ----------
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(secondary);
    doc.text("Dispatch Receipt", 40, 40);

    // ------- Styled line below heading ----------
    doc.setDrawColor(11, 94, 60);  // #0B5E3C
    doc.setLineWidth(2);
    doc.line(40, 50, 200, 50);

    // ------- Clone the table and remove unwanted rows ----------
    const tableClone = document.querySelector('#jobDetailsTable').cloneNode(true);
    Array.from(tableClone.rows).forEach(row => {
        const firstColText = row.cells[0]?.innerText?.toLowerCase() || '';
        if (
            firstColText.includes("proof of delivery") ||
            firstColText.includes("barcode qr code") ||
            firstColText.includes("attachments") ||
            firstColText.includes("scan upload document")
        ) {
            row.remove();
        }
    });

    // ------- Table with Theme ----------
    doc.autoTable({
        html: tableClone,
        startY: 70,
        theme: 'grid',

        headStyles: {
            fillColor: headerBg,
            textColor: textDark,
            fontStyle: 'bold',
            halign: 'left'
        },

        bodyStyles: {
            textColor: "#555",
            fontSize: 10
        },

        alternateRowStyles: {
            fillColor: "#f8f9fa"
        },

        styles: {
            cellPadding: 6,
            lineWidth: 0.3,
            lineColor: "#dee2e6",
            fontSize: 10
        },

        columnStyles: {
            0: { cellWidth: 150, fontStyle: 'bold', textColor: textDark },
            1: { cellWidth: 'auto' }
        },

        margin: { left: 40, right: 40 }
    });

    // ------- Footer ----------
    doc.setFontSize(10);
    doc.setTextColor(secondary);
   // doc.text("Generated via Dispatch Management System", 40, doc.internal.pageSize.height - 30);

    doc.save("dispatch-receipt.pdf");
});
