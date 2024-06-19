const ExcelJS = require('exceljs');

async function removeDuplicates(inputFile, outputFile) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(inputFile);

  const worksheet = workbook.worksheets[0];
  const rows = new Map();

  worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const rowValues = row.values.slice(1).join('|');
    if (!rows.has(rowValues)) {
      rows.set(rowValues, row);
    }
  });

  const newWorkbook = new ExcelJS.Workbook();
  const newWorksheet = newWorkbook.addWorksheet('Sheet1');

  rows.forEach(row => {
    newWorksheet.addRow(row.values.slice(1));
  });

  await newWorkbook.xlsx.writeFile(outputFile);
}

removeDuplicates('vivareal2.xlsx', 'output.xlsx')
  .then(() => {
    console.log('Remoção de duplicatas concluída.');
  })
  .catch(err => {
    console.error('Erro ao remover duplicatas:', err);
  });
