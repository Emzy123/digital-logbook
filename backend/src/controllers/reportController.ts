import { Request, Response } from 'express';
import { generateFinalReport } from '../services/pdfService';

export const getFinalReportPdf = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    
    // Generate the PDF buffer
    const pdfBuffer = await generateFinalReport(studentId);

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=SIWES_Final_Report_${studentId}.pdf`);
    
    // Send the buffer
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF report:', error);
    res.status(500).json({ error: 'Failed to generate PDF report' });
  }
};
