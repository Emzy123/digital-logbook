"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateFinalITFReport = exports.generateWeeklyPdf = void 0;
const pdfmake = require('pdfmake');
const fonts = {
    Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
    }
};
pdfmake.fonts = fonts;
const generateWeeklyPdf = (student, summary, logs) => {
    return new Promise((resolve, reject) => {
        try {
            const docDefinition = {
                content: [
                    { text: 'SIWES WEEKLY SUMMARY REPORT', style: 'header', alignment: 'center' },
                    { text: `Student: ${student.first_name} ${student.last_name} (${student.email})`, style: 'subheader', margin: [0, 10, 0, 5] },
                    { text: `Week ${summary.week_number} (${new Date(summary.start_date).toLocaleDateString()} - ${new Date(summary.end_date).toLocaleDateString()})`, style: 'subheader', margin: [0, 0, 0, 15] },
                    { text: 'Daily Logs', style: 'sectionHeader' },
                    {
                        table: {
                            headerRows: 1,
                            widths: ['auto', '*', 'auto'],
                            body: [
                                ['Date', 'Task Description', 'Hours'],
                                ...logs.map(log => [
                                    new Date(log.entry_date).toLocaleDateString(),
                                    log.task_description,
                                    log.total_hours.toString()
                                ])
                            ]
                        },
                        margin: [0, 0, 0, 15]
                    },
                    { text: 'Weekly Reflection Summary', style: 'sectionHeader' },
                    { text: summary.summary_text, margin: [0, 0, 0, 15] },
                    { text: 'Supervisor Comments', style: 'sectionHeader' },
                    { text: summary.supervisor_comment || 'No comments provided yet.', margin: [0, 0, 0, 15] },
                    { text: `Status: ${summary.status.toUpperCase()}`, style: 'statusLine', margin: [0, 20, 0, 0] }
                ],
                styles: {
                    header: { fontSize: 18, bold: true },
                    subheader: { fontSize: 14, bold: true },
                    sectionHeader: { fontSize: 12, bold: true, decoration: 'underline', margin: [0, 5, 0, 5] },
                    statusLine: { fontSize: 12, bold: true, color: 'blue' }
                },
                defaultStyle: {
                    font: 'Roboto'
                }
            };
            const pdf = pdfmake.createPdf(docDefinition);
            pdf.getBuffer().then((buffer) => {
                resolve(buffer);
            }).catch((err) => {
                reject(err);
            });
        }
        catch (error) {
            reject(error);
        }
    });
};
exports.generateWeeklyPdf = generateWeeklyPdf;
const generateFinalITFReport = (reportData) => {
    return new Promise((resolve, reject) => {
        try {
            const docDefinition = {
                content: [
                    { text: 'INDUSTRIAL TRAINING FUND (ITF)', style: 'header', alignment: 'center' },
                    { text: 'FINAL SIWES EVALUATION REPORT', style: 'subheader', alignment: 'center', margin: [0, 5, 0, 20] },
                    {
                        table: {
                            headerRows: 1,
                            widths: ['auto', 'auto', 'auto', 'auto', 'auto', 'auto', '*'],
                            body: [
                                ['Matric No', 'Student Name', 'Program', 'Total Hours', 'Ind. Score (50)', 'Sch. Score (50)', 'Total (100)'],
                                ...reportData.map(data => {
                                    const ind = data.industry_score || 0;
                                    const sch = data.school_score || 0;
                                    const total = ind + sch;
                                    return [
                                        data.matriculation_number || 'N/A',
                                        data.student_name || 'N/A',
                                        data.program_level || 'N/A',
                                        data.total_hours?.toString() || '0',
                                        data.industry_score?.toString() || 'N/A',
                                        data.school_score?.toString() || 'N/A',
                                        (data.industry_score !== null && data.school_score !== null) ? total.toString() : 'Incomplete'
                                    ];
                                })
                            ]
                        },
                        margin: [0, 0, 0, 15]
                    },
                    { text: `Generated on: ${new Date().toLocaleDateString()}`, style: 'footnote', margin: [0, 20, 0, 0] }
                ],
                styles: {
                    header: { fontSize: 20, bold: true },
                    subheader: { fontSize: 16, bold: true, decoration: 'underline' },
                    footnote: { fontSize: 10, italics: true, color: 'gray' }
                },
                defaultStyle: {
                    font: 'Roboto'
                }
            };
            const pdf = pdfmake.createPdf(docDefinition);
            pdf.getBuffer().then((buffer) => {
                resolve(buffer);
            }).catch((err) => {
                reject(err);
            });
        }
        catch (error) {
            reject(error);
        }
    });
};
exports.generateFinalITFReport = generateFinalITFReport;
