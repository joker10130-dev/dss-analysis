const express = require('express');
const router = express.Router();

const aposToLexForm = require('apos-to-lex-form');
const natural = require('natural');

const SpellCorrector = require('spelling-corrector');
const stopword = require('stopword');

const { GoogleSpreadsheet } = require('google-spreadsheet');

const doc = new GoogleSpreadsheet(
  '1AAvLhINPkyZUnbarXVBF5aOu9xyUCOXQEEVxvpzS2sc'
);

const spellCorrector = new SpellCorrector();
spellCorrector.loadDictionary();

router.get('/', async (req, res) => {
  await doc.useServiceAccountAuth(require('./secret.json'));
  await doc.loadInfo();
  console.log(doc.title);

  const sheet = doc.sheetsByIndex[1];
  console.log(`Title: ${sheet.title}, Row: ${sheet.rowCount}`);

  const rows = await sheet.getRows();
  console.log(`length: ${rows.length}`);

  let table = [];
  for (let i = 0; i < rows.length; i++) {
    table.push({
      id: rows[i].ID,
      name: rows[i].StoreName,
      resType: rows[i].Type,
      price: rows[i].Price,
      confidence: parseFloat(rows[i].Confidence, 10),
    });
  }
  console.log(table);
  res.status(200).json(table);
});

router.get('/:name', async (req, res) => {
  await doc.useServiceAccountAuth(require('./secret.json'));
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];
  const sheet2 = doc.sheetsByIndex[1];
  console.log(`Title: ${sheet.title}, Row: ${sheet.rowCount}`);

  const rows = await sheet.getRows();
  const rows2 = await sheet2.getRows();
  console.log(`length: ${rows.length}`);
  let table;
  let data = [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].StoreName === req.params.name) {
      table = {
        name: rows[i].StoreName,
        price: rows[i].Price,
      };
    }
    if (rows[i].StoreName === req.params.name) {
      data.push({
        rate: rows[i].Rate,
        comment: rows[i].Comment,
        confidence: parseFloat(rows[i].Confidence, 10),
        timeStamp: rows[i].Timestamp,
      });
    }
  }
  let final;
  for (let i = 0; i < rows2.length; i++) {
    if (rows2[i].StoreName === table.name) {
      final = {
        name: table.name,
        resType: rows2[i].Type,
        price: table.price,
        imgUrl: rows2[i].ImageUrl,
        data: data,
      };
    }
  }

  res.status(200).json(final);
});

router.post('/', async (req, res) => {
  await analysisSheet1();
  await analysisSheet2();
  res.status(200).json({ status: 'Success' });
});

router.post('/:name', async (req, res) => {
  await analysisByOne(req.params.name);
  res.status(200).json({ status: 'Success' });
});

async function analysisByOne(name) {
  await doc.useServiceAccountAuth(require('./secret.json'));
  await doc.loadInfo();
  console.log(doc.title);

  const sheet1 = doc.sheetsByIndex[0];
  const sheet2 = doc.sheetsByIndex[1];
  const rows1 = await sheet1.getRows();
  const rows2 = await sheet2.getRows();
  for (let i = 0; i < rows1.length; i++) {
    if (rows1[i].StoreName === name) {
      const result = analysisComment(rows1[i].Comment);
      rows1[i].Confidence = result;
      await rows1[i].save();
    }
  }

  var tempRank = {
    storeName: '',
    rating: 0,
    confidence: 0,
  };

  for (let i2 = 0; i2 < 10; i2++) {
    if (rows2[i2].StoreName === name) {
      rows2[i2].Confidence = 0;
      rows2[i2].Rating = 0;
      rows2[i2].Count = 0;
      await rows2[i2].save();
    }
  }
  for (let i = 0; i < rows1.length; i++) {
    if (rows1[i].StoreName === name) {
      const temp = tempRank;

      temp.storeName = rows1[i].StoreName;
      temp.rating = parseInt(rows1[i].Rate);
      temp.confidence = parseFloat(rows1[i].Confidence);

      for (let i2 = 0; i2 < 10; i2++) {
        if (temp.storeName === rows2[i2].StoreName) {
          rows2[i2].Confidence =
            parseFloat(rows2[i2].Confidence) + parseFloat(temp.confidence);
          rows2[i2].Rating = parseInt(rows2[i2].Rating) + parseInt(temp.rating);
          rows2[i2].Count = parseInt(rows2[i2].Count) + 1;
          await rows2[i2].save();
        }
      }
    }
  }
  for (let i2 = 0; i2 < 10; i2++) {
    if (rows2[i2].StoreName === name) {
      rows2[i2].Confidence = rows2[i2].Confidence / rows2[i2].Count;
      console.log(rows2[i2].StoreName);
      await rows2[i2].save();
    }
  }
}

// async function analysisSheet1() {
//   await doc.useServiceAccountAuth(require('./secret.json'));
//   await doc.loadInfo();
//   console.log(doc.title);

//   const sheet1 = doc.sheetsByIndex[0];

//   const rows1 = await sheet1.getRows();

//   for (let i = 0; i < rows1.length; i++) {
//     const result = analysisComment(rows1[i].Comment);
//     rows1[i].Confidence = result;
//     await rows1[i].save();
//     console.log(`row ${i}: ${rows1[i].Confidence}`);
//   }
// }

// async function analysisSheet2() {
//   await doc.useServiceAccountAuth(require('./secret.json'));
//   await doc.loadInfo();
//   console.log(doc.title);
//   const sheet1 = doc.sheetsByIndex[0];
//   const sheet2 = doc.sheetsByIndex[1];
//   var tempRank = {
//     storeName: '',
//     rating: 0,
//     confidence: 0,
//   };

//   const rows1 = await sheet1.getRows();
//   const rows2 = await sheet2.getRows();

//   for (let i2 = 0; i2 < 10; i2++) {
//     rows2[i2].Confidence = 0;
//     rows2[i2].Rating = 0;
//     rows2[i2].Count = 0;
//     await rows2[i2].save();
//   }
//   for (let i = 0; i < rows1.length; i++) {
//     const temp = tempRank;

//     temp.storeName = rows1[i].StoreName;
//     temp.rating = parseInt(rows1[i].Rate);
//     temp.confidence = parseInt(rows1[i].Confidence);

//     for (let i2 = 0; i2 < 10; i2++) {
//       if (temp.storeName === rows2[i2].StoreName) {
//         rows2[i2].Confidence =
//           parseFloat(rows2[i2].Confidence) + parseFloat(temp.confidence);
//         rows2[i2].Rating = parseInt(rows2[i2].Rating) + parseInt(temp.rating);
//         rows2[i2].Count = parseInt(rows2[i2].Count) + 1;
//         await rows2[i2].save();
//       }
//     }
//   }
// }

function analysisComment(words) {
  const lexedReview = aposToLexForm(words);
  const casedReview = lexedReview.toLowerCase();
  const alphaOnlyReview = casedReview.replace(/[^a-zA-Z\s]+/g, '');

  const { WordTokenizer } = natural;
  const tokenizer = new WordTokenizer();
  const tokenizedReview = tokenizer.tokenize(alphaOnlyReview);

  tokenizedReview.forEach((word, index) => {
    tokenizedReview[index] = spellCorrector.correct(word);
  });

  const filteredReview = stopword.removeStopwords(tokenizedReview);
  console.log(filteredReview);

  const { SentimentAnalyzer, PorterStemmer } = natural;
  const analyzer = new SentimentAnalyzer('English', PorterStemmer, 'afinn');
  const analysis = analyzer.getSentiment(tokenizedReview);

  /*const analysis =  sentiment.analyze(alphaOnlyReview, options);
  console.log(alphaOnlyReview);
 */
  return analysis;
}

module.exports = router;
