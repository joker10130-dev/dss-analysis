const GoogleSpreadsheet = require('google-spreadsheet');
// const { promisity } = require('util');

const doc = new GoogleSpreadsheet(
  '1AAvLhINPkyZUnbarXVBF5aOu9xyUCOXQEEVxvpzS2sc'
);

const creds = require('../../secret.json');
async function getData() {
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();
  console.log(doc.title);
}

getData();

// async function accessSpreadsheet() {
//   const doc = new GoogleSpreadsheet(
//     '1AAvLhINPkyZUnbarXVBF5aOu9xyUCOXQEEVxvpzS2sc'
//   );
//   await promisify(doc.useServiceAccountAuth)(creds);
//   const info = await promisify(doc.getInfo)();
//   const sheet = info.worksheets[0];
//   console.log(`Title: ${sheet.title}, Rows: ${sheet.rowCount}`);
// }

// accessSpreadsheet();
