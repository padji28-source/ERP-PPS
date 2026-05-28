const https = require('https');
https.get('https://docs.google.com/spreadsheets/d/e/2PACX-1vRnOH0BhjRxkCSLq9wSmhbGR4zuzoNuVrUDvHNesmnftj7twepfFuotWrxEC-scWbKwfkOeeFcNlvLU/pub?output=csv', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(data.slice(0, 1000)));
});
