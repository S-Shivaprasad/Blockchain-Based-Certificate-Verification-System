const Plotly = require('plotly.js-dist');

// Gas data per function
const functions = [
  "setIssuerContract",
  "registerDegree",
  "setCollegeRegistry",
  "approveBoardForDegree",
  "approveCollege",
  "allowCollegeDegree",
  "issueCertificate",
  "batchIssueCertificates",
  "revokeCertificate"
];

const gas = [28487, 186941, 46351, 80000, 114016, 72000, 120000, 250000, 50000];

// Trace
const trace = {
  x: functions,
  y: gas,
  type: 'bar',
  marker: { color: 'rgb(100,149,237)' }
};

const layout = {
  title: 'Gas Usage per Function',
  xaxis: { title: 'Function Name', tickangle: -30 },
  yaxis: { title: 'Gas Units' },
  bargap: 0.2
};

// This will work only in browser environments
console.log('Graph setup ready. Use Plotly in a browser to render it.');
console.log('Functions:', functions);
console.log('Gas:', gas);