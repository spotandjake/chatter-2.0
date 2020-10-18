const express = require('express');
const bodyParser = require('body-parser');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(`${__dirname}/public`));

app.get('*', (req, res) => {
	res.sendFile(`${__dirname}/public/index.html`);
});

// app.get('*', function(req, res){
// 	res.sendFile(`${__dirname}/public/404/404.html`, 404);
// });


app.listen(3000, () => console.log('server started'));