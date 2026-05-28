import Papa from 'papaparse';

async function run() {
  const res = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vRnOH0BhjRxkCSLq9wSmhbGR4zuzoNuVrUDvHNesmnftj7twepfFuotWrxEC-scWbKwfkOeeFcNlvLU/pub?output=csv');
  const text = await res.text();
  const parsed = Papa.parse(text);
  
  const printRow = (idx: number) => {
    console.log(`Row ${idx}:`);
    const row = parsed.data[idx] as string[];
    if (row && row.length) {
      row.forEach((col: string, cidx: number) => {
        if (col && typeof col === 'string' && col.trim() !== '') {
          console.log(`  [${cidx}]: ${col}`);
        }
      });
    }
  };

  printRow(4); // general headers
  printRow(5); // sub headers
  printRow(6); // CMT headers
  printRow(7); // space
  printRow(8); // Data 1
  printRow(9); // Data 2
}
run();
