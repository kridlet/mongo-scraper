// Dependencies
const express = require('express');
const mongoose = require('mongoose');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const logger = require('morgan');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');


// Require all models
const db = require('./models');

// Initialize Express
const app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger('dev'));
// Use body-parser for handling form submissions
app.use(bodyParser.urlencoded({ extended: true }));
// Use express.static to serve the public folder as a static directory
app.use(express.static(path.join(__dirname, 'public')));
// Use handlebars templating
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

// Connect to the Mongo DB
const MONGO = process.env.MONGODB_URI || 'mongodb://localhost/nyt';
mongoose.Promise = Promise;
mongoose
  .connect(MONGO)
  .then( result => {
    console.log(`Connected: ${result.connections[0].name} : ${result.connections[0].host} : ${result.connections[0].port}`);
  })
  .catch(err => console.log('Mongo connection error:', err));

// Routes

// index
// GET route - retrieve all articles and render
app.get('/', (req,res) => {
  db.Article
    .find({saved: false})
    // .then(articles => res.render('index', {articles}))
    .then(articles => {
      let data = {
        settings: {
          pageTitle: 'Mongo Scraper',
          scrapeButton: true,
          home: 'active',
          saved: 'inactive'
        },
        articles: articles
      };
      //res.json(data);
      res.render('index', {data});
    })
    .catch(err=> res.json(err));
});

// GET route - retrieve all saved stories and render
app.get('/saved', (req, res) => {
  db.Article
    .find({saved: true})
    .then(articles => {
      let data = {
        settings: {
          pageTitle: 'Saved Articles',
          scrapeButton: false,
          home: 'inactive',
          saved: 'active'          
        },
        articles: articles
      };
      //res.json(data);
      res.render('index', {data});
    })
    .catch(err => res.json(err));
});

// article
// PUT route - save stories
app.put('/save/:id', (req,res) => {
  db.Article
    .update({_id: req.params.id},{saved: true})
    .then(result=> {
      let data = {ok: 1};
      res.status(200).send(data);
    })
    .catch(err => res.json(err));
});

// DELETE route - remove saved stories
app.delete('/delete/:id', function(req,res){
  db.Article
    .update({_id: req.params.id},{saved: false})
    .then(result=> {
      let data = {ok: 1};
      res.status(200).send(data);
    })
    .catch(err => res.json(err));
});

// notes
// GET route - retrieve all article notes by article id
app.get('/notes/:id', function (req,res){
  db.Article
    .findById(req.params.id)
    .populate('notes')
    .then(results => {
      res.json(results);
    })
    .catch(err => res.json(err));
});

// POST route - create a new note
app.post('/createNote', function (req,res){
  var articleId = req.body._id;
  var note = {body: req.body.noteText};

  db.Note
    .create(note)
    .then( result => {
      db.Article
        .findByIdAndUpdate(articleId, {$push:{notes: result._id}},{new:true})//saving reference to note in corresponding article
        .then( data => res.json(result))
        .catch( err => res.json(err));
    })
    .catch(err => res.json(err));
});

// DELETE route - delete a note
app.delete('/deleteNote/:id', function (req,res) {
  db.Note
    .findByIdAndDelete(req.params.id)
    .then(result => res.json(result))
    .catch(err => res.json(err));
});

// scrape
// GET route - scrape new articles from New York Times
app.get('/scrape', function (req, res) {
  // retreive all articles from the database
  db.Article
    .find({})
    .then((cachedArticles) => {
      // create array of cached article titles
      let cachedTitle = cachedArticles.map(article => article.title);

      // grab the body of the html with axios
      axios.get('https://www.nytimes.com/section/us').then(function (response) {
          // load response data into cheerio and save it to $ for a shorthand selector
          const $ = cheerio.load(response.data);
          // create new array to hold new articles
          let newArticles = [];
          // iterate through returned articles and make a newArticle object from scrape data
          $('#latest-panel article.story.theme-summary').each((i, element) => {
            let newArticle = new db.Article({
              articleURL: $(element).find('.story-body>.story-link').attr('href'),
              title: $(element).find('h2.headline').text().trim(),
              synopsis: $(element).find('p.summary').text().trim(),
              imageURL: $(element).find('img').attr('src'),
              authors: $(element).find('p.byline').text().trim()
            });
            // check if valid new article - don't add articles without url link
            if (newArticle.articleURL) {
              // check if new article already in cached articles in database
              if (!cachedTitle.includes(newArticle.title)) {
                // add to array of new articles to push into database
                newArticles.push(newArticle);
              }
            }
          });

          // add the array of new articles to the cache in the database
          db.Article
            .create(newArticles)
            .then(result => res.json({
              newArticleCount: newArticles.length
            })) // return new article count for display in modal
            .catch(err => {});
        })
        .catch(err => console.log(err)); // log axios errors
    })
    .catch(err => console.log(err)); // log db find errors
}); // end of get request to /scrape


// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
  console.log(`running at http://localhost:${PORT}`);
});
