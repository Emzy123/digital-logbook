import PDFDocument from 'pdfkit';
import { StudentProfile } from '../models/StudentProfile';
import { LogEntry } from '../models/LogEntry';

export const generateFinalReport = async (studentId: string): Promise<Buffer> => {
  return new Promise(async (resolve, reject) => {
    try {
      const student = await StudentProfile.findById(studentId).populate('user_id');
      if (!student) {
        throw new Error('Student not found');
      }

      const logs = await LogEntry.find({ student_id: studentId, status: 'approved' }).sort('entry_date');

      const doc = new PDFDocument({ margin: 50 });
      let buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Title Page
      doc.fontSize(20).text('SIWES FINAL REPORT', { align: 'center' });
      doc.moveDown();
      
      const user: any = student.user_id;
      doc.fontSize(12).text(`Name: ${user.first_name} ${user.last_name}`);
      doc.text(`Matriculation Number: ${student.matriculation_number}`);
      doc.text(`Department: ${student.department || 'N/A'}`);
      doc.text(`Faculty: ${student.faculty || 'N/A'}`);
      doc.text(`Course of Study: ${student.course_of_study || 'N/A'}`);
      doc.moveDown(2);

      // Log Entries Table Header
      doc.fontSize(14).text('Approved Log Entries', { underline: true });
      doc.moveDown();
      
      const tableTop = doc.y;
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Date', 50, tableTop);
      doc.text('Task', 150, tableTop);
      doc.text('Hours', 450, tableTop);
      doc.font('Helvetica');
      
      let y = tableTop + 20;

      // Draw horizontal line
      doc.moveTo(50, y - 5).lineTo(500, y - 5).stroke();

      logs.forEach((log) => {
        // Handle pagination
        if (y > 700) {
          doc.addPage();
          y = 50;
        }

        const dateStr = log.entry_date ? new Date(log.entry_date).toLocaleDateString() : 'N/A';
        const taskStr = log.task_title.length > 50 ? log.task_title.substring(0, 47) + '...' : log.task_title;
        const hoursStr = log.total_hours ? log.total_hours.toString() : 'N/A';

        doc.text(dateStr, 50, y);
        doc.text(taskStr, 150, y);
        doc.text(hoursStr, 450, y);
        
        y += 20;
      });

      doc.moveDown(3);
      doc.fontSize(12).text('Signatures:', 50);
      doc.moveDown();
      doc.text('_________________________', 50);
      doc.text('Student Signature & Date', 50);

      doc.moveDown(2);
      doc.text('_________________________', 50);
      doc.text('Supervisor Signature & Date', 50);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
