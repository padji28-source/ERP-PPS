async function test() {
  const res = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vRnOH0BhjRxkCSLq9wSmhbGR4zuzoNuVrUDvHNesmnftj7twepfFuotWrxEC-scWbKwfkOeeFcNlvLU/pub?output=csv');
  const text = await res.text();
  const lines = text.split('\n');
  for (let i = 0; i < 20; i++) {
     console.log(`Line ${i}:`, lines[i]);
  }
}
test();
