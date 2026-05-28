import Papa from 'papaparse';

async function test() {
  const res = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vRnOH0BhjRxkCSLq9wSmhbGR4zuzoNuVrUDvHNesmnftj7twepfFuotWrxEC-scWbKwfkOeeFcNlvLU/pub?output=csv');
  const text = await res.text();
  const parsed = Papa.parse(text);
  const data = parsed.data;
  
  for (let i = 8; i < data.length; i++) {
    const row = data[i];
    const product = row[4];
    if (!product || product.trim() === '' || product === '0') continue;
    
    // look for date in cols 11-14
    let deadline = '';
    for (let c = 11; c <= 14; c++) {
      if (row[c] && (row[c].includes('Jan') || row[c].includes('Feb') || row[c].includes('Mar') || row[c].includes('Apr') || row[c].includes('May') || row[c].includes('Jun') || row[c].includes('Jul') || row[c].includes('Aug') || row[c].includes('Sep') || row[c].includes('Oct') || row[c].includes('Nov') || row[c].includes('Dec'))) {
         deadline = row[c];
         break;
      }
    }
    
    console.log(`Product: ${product} | QTY: ${row[5]} | Stage: ${row[6]} | DL: ${deadline} | Status/Note: ${row[14] || row[13] || row[12]}`);
  }
}
test();
