const express = require('express');
const path = require('path');
var cors = require('cors');
const app = express();

app.use(cors());

app.use(express.json({ extends: false }));
app.use('/api/datas', require('./routes/api/datas'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server start on port ${PORT}`));
