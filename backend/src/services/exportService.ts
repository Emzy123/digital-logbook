import { Parser } from 'json2csv';
import ExcelJS from 'exceljs';

export const exportToCSV = (data: any[], fields?: string[]): string => {
  try {
    const parser = new Parser({ fields });
    return parser.parse(data);
  } catch (error) {
    console.error('CSV Export Error:', error);
    throw new Error('Failed to generate CSV');
  }
};

export const exportToExcel = async (data: any[], sheetName: string): Promise<Buffer> => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    if (data.length > 0) {
      worksheet.columns = Object.keys(data[0]).map(key => ({
        header: key.toUpperCase(),
        key: key,
        width: 20
      }));

      data.forEach(row => worksheet.addRow(row));
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  } catch (error) {
    console.error('Excel Export Error:', error);
    throw new Error('Failed to generate Excel file');
  }
};
