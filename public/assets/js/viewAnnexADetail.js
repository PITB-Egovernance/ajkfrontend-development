/* public/assets/js/annexAView.js */

document.addEventListener('DOMContentLoaded', function () {
    const { jsPDF } = window.jspdf;

    // Helper: Convert number to lowercase Roman numeral
    function toSmallRoman(num) {
        const map = { M:1000, CM:900, D:500, CD:400, C:100, XC:90, L:50, XL:40, X:10, IX:9, V:5, IV:4, I:1 };
        let result = '';
        for (let key in map) {
            while (num >= map[key]) {
                result += key;
                num -= map[key];
            }
        }
        return result.toLowerCase();
    }

    // Make it globally available (used in Blade via @json)
    window.toSmallRoman = toSmallRoman;

    // PDF Export Button
    const exportBtn = document.getElementById('exportAllTables');
    if (!exportBtn) return;

    exportBtn.addEventListener('click', function () {
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        // === Header ===
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Annex. “A” (Please refer column 1 (v))', 148.5, 20, { align: 'center' });

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('District wise details of vacant posts with the particulars of incumbents:', 148.5, 28, { align: 'center' });

        // === Details Section ===
        doc.setFontSize(10);
        let y = 38;

        // (1) Name of District
        doc.text('(1) Name of District:', 14, y);
        y += 5;

        const districts = window.annexData?.districts || [];
        if (districts.length > 0) {
            districts.forEach((post, i) => {
                const roman = toSmallRoman(i + 1);
                doc.text(`    (${roman}): ${post.district}`, 42, y);
                y += 5;
            });
        } else {
            doc.text('    N/A', 42, y);
            y += 5;
        }

        // (2) Total Posts
        doc.text(`(2) Total Posts: ${window.annexData?.total_posts || 'N/A'}`, 14, y);
        y += 8;

        // Static placeholders
        const placeholders = [
            '(3) Posts already filled by PSC: .............................................................',
            '(4) Number of Vacant Posts: .............................................................',
            '(5) Number of Adhoc appointee on vacant posts: .............................................................',
            '(6) Detail of Adhoc appointees as follows:-'
        ];
        placeholders.forEach(line => {
            doc.text(line, 14, y);
            y += 5;
        });

        // === Table Data ===
        const yesNo = val => val === 1 ? 'Yes' : (val === 0 ? 'No' : 'N/A');

        const row = [
            '1',
            window.annexData?.name_with_father || 'N/A',
            window.annexData?.district_of_domicile || 'N/A',
            window.annexData?.creation_of_post || 'N/A',
            yesNo(window.annexData?.vacant_due_to_retirement),
            yesNo(window.annexData?.vacant_due_to_promotion),
            window.annexData?.vacant_due_to_other || 'N/A',
            window.annexData?.date_initial_appointment || 'N/A',
            window.annexData?.date_last_extension || 'N/A',
            window.annexData?.other_information || 'N/A'
        ];

        // === Table ===
        doc.autoTable({
            head: [
                [
                    { content: 'S.#', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                    { content: 'Name with father’s name of adhoc appointee', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                    { content: 'District of Domicile', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                    { content: 'Dates, vacancies occurred', colSpan: 4, styles: { halign: 'center', valign: 'middle' } },
                    { content: 'Date of initial appointment as Adhoc', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                    { content: 'Date of last extension', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                    { content: 'Any other information', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                ],
                [
                    'Creation of Post',
                    'vacant due to retirement',
                    'vacant due to promotion',
                    'vacant due to other reason'
                ]
            ],
            body: [row],
            startY: y + 4,
            theme: 'grid',
            margin: { left: 10, right: 10 },
            styles: { fontSize: 8, halign: 'center', lineWidth: 0.2, lineColor: [0,0,0], textColor: [0,0,0] },
            headStyles: { fillColor: [255,255,255], textColor: [0,0,0], fontStyle: 'bold' },
            columnStyles: {
                0: { cellWidth: 10 }, 1: { cellWidth: 50 }, 2: { cellWidth: 30 },
                3: { cellWidth: 25 }, 4: { cellWidth: 25 }, 5: { cellWidth: 25 }, 6: { cellWidth: 25 },
                7: { cellWidth: 30 }, 8: { cellWidth: 30 }, 9: { cellWidth: 35 }
            }
        });

        // === Signature ===
        let finalY = doc.lastAutoTable.finalY + 12;
        doc.setFontSize(10);
        doc.text('Signature of the Head of the attached Department', 14, finalY);
        doc.text('Signature of the Administrative Secretary', 283, finalY, { align: 'right' });
        finalY += 5;
        doc.text('Date: ___________________', 14, finalY);
        doc.text('Date: ___________________', 283, finalY, { align: 'right' });
        finalY += 5;
        doc.text('Stamp: ___________________', 14, finalY);
        doc.text('Stamp: ___________________', 283, finalY, { align: 'right' });

        doc.save('Annex_A.pdf');
    });
});