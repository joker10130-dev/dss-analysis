const express = require('express');
const aposToLexForm = require('apos-to-lex-form');
const natural = require('natural');

const SpellCorrector = require('spelling-corrector');
const stopword = require('stopword');

const { GoogleSpreadsheet } = require('google-spreadsheet');

const doc = new GoogleSpreadsheet('1AAvLhINPkyZUnbarXVBF5aOu9xyUCOXQEEVxvpzS2sc');

const router = express.Router();

const spellCorrector = new SpellCorrector();
spellCorrector.loadDictionary();

router.post('/1-analyzer', async function (req, res, next) {
  await analysisSheet1();
  /*
    const { review } = req.body;
    console.log(review);
    const result = analysisComment(review);
    console.log(result);
  */
  res.status(200).json({ status: "Success" });

});


router.post('/2-analyzer', async function (req, res, next) {
  await analysisSheet2();
  /*
    const { review } = req.body;
    console.log(review);
    const result = analysisComment(review);
    console.log(result);
  */
  res.status(200).json({ status: "Success" });

});


router.post('/get-10', async function (req, res, next) {
  //analysisSheet2();
  //const { review } = req.body;
  const result = await getTop10();
  console.log("type :" + typeof result);
  console.log("result store name :" + result[0].storename);


  res.status(200).json({ result });

});



router.post('/comment-list', async function (req, res, next) {
  //analysisSheet2();
  const { name } = req.body;
  const result = await getComment(name);
  console.log("type :" + typeof result);
 // console.log("result store name :" + result[0].time);


  res.status(200).json({ result }); 

});

async function accessDocs() {
  await doc.useServiceAccountAuth(require('./secret.json'));
}


async function analysisSheet1() {
  accessDocs();

  await doc.loadInfo();
  console.log(doc.title);

  const sheet = doc.sheetsByIndex[0];
  console.log(`Title: ${sheet.title}, Row: ${sheet.rowCount}`);

  const rows = await sheet.getRows();
  console.log(`length: ${rows.length}`);

  console.log(typeof rows.length);

  console.log(`row 0: ${rows[0].Confidence}`);

  for (let index = 0; index < rows.length; index++) {

    const result = analysisComment(rows[index].Comment);
    rows[index].Confidence = result;
    await rows[index].save();
    console.log(`row ${index}: ${rows[index].Confidence}`);
  }
}

async function analysisSheet2() {
  accessDocs();

  await doc.loadInfo();
  console.log(doc.title);

  const sheet1 = doc.sheetsByIndex[0];
  const sheet2 = doc.sheetsByIndex[1];
  var templateRank = {
    storename: '',
    ranting: 0,
    confidence: 0
  }

  const rowsSheet1 = await sheet1.getRows();
  const rowsSheet2 = await sheet2.getRows();
  for (let index2 = 0; index2 < 10; index2++) {
    rowsSheet2[index2].Confidence = 0
    rowsSheet2[index2].Rating = 0
    rowsSheet2[index2].Count = 0
    await rowsSheet2[index2].save();
    //console.log(temp.storename  + " and "+ rowsSheet2[index2].StoreName);
  }

  for (let index1 = 0; index1 < rowsSheet1.length; index1++) {
    const temp = templateRank;

    temp.storename = rowsSheet1[index1].StoreName;
    temp.ranting = parseInt(rowsSheet1[index1].Rate);
    temp.confidence = parseFloat(rowsSheet1[index1].Confidence);

 

    for (let index2 = 0; index2 < 10; index2++) {

      if (temp.storename === rowsSheet2[index2].StoreName) {
        rowsSheet2[index2].Confidence = parseFloat(rowsSheet2[index2].Confidence) + parseFloat(temp.confidence);
        rowsSheet2[index2].Rating = parseInt(rowsSheet2[index2].Rating) + parseInt(temp.ranting);
        rowsSheet2[index2].Count = parseInt(rowsSheet2[index2].Count) + 1;
        await rowsSheet2[index2].save();
      }
      //console.log(temp.storename  + " and "+ rowsSheet2[index2].StoreName);
    }
  }

}

async function getTop10() {
  accessDocs();

  await doc.loadInfo();

  const sheet2 = doc.sheetsByIndex[1];
  const rowsSheet2 = await sheet2.getRows();
  console.log("type rowsSheet2: " + typeof rowsSheet2);
  console.log("rowsSheet2 :" + rowsSheet2[0].StoreName);

  const arrayResult = [];

  var templateRank = {
    storename: '',
    ranting: 0,
    confidence: 0,
    count: 0,
    fRate: 0,
    fConfidence: 0
  }

  for (let index = 0; index < 10; index++) {
    templateRank.storename = rowsSheet2[index].StoreName;
    templateRank.ranting = rowsSheet2[index].Rating;
    templateRank.confidence = rowsSheet2[index].Confidence;
    templateRank.count = rowsSheet2[index].Count;
    templateRank.fRate = parseInt(rowsSheet2[index].Rating) / parseInt(rowsSheet2[index].Count);
    templateRank.fConfidence = parseFloat(rowsSheet2[index].Confidence) / parseInt(rowsSheet2[index].Count);


    arrayResult.push(templateRank);
  }

  return arrayResult;
}

async function getComment(name){
  accessDocs();

  await doc.loadInfo();

  const sheet = doc.sheetsByIndex[0];
  console.log(`Title: ${sheet.title}, Row: ${sheet.rowCount}`);

  const rows = await sheet.getRows();


  const arrayResult = [];

  var templateRank = {
    time: '',
    tof: '',
    price: '',
    comment: 0,
    rate: 0
  }
  console.log("name :"+name);

  for (let index = 0; index < rows.length; index++) {
    console.log(index+" :"+rows[index].StoreName);
    if(rows[index].StoreName === name){
      templateRank.time = rows[index].Timestamp; 
      templateRank.tof = rows[index].TOF;
      templateRank.price = rows[index].Price; 
      templateRank.comment = rows[index].Comment; 
      templateRank.rate = rows[index].Rate; 

      arrayResult.push(templateRank);
    }
  }

  return arrayResult;
}

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

