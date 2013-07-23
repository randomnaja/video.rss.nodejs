
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');

var app = express();

// Require module
var Feed = require('feed');

var Scrap = require('./scrap.js');

var nStore = require('nstore');
nStore = nStore.extend(require('nstore/query')());
var seriesStore = nStore.new('data/series.db', function () {
  // It's loaded now
});

var $ = require('jquery');

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(require('stylus').middleware(__dirname + '/public'));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/users', user.list);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

app.get('/scrapkodhit', function(req,res){
var agent = new Scrap();
});

app.get('/videorss', function(req, res){
// Initializing feed object
    feed = new Feed({
           title:          'My video feed',
           description:    'This is my personnal feed!',
           link:           'http://example.com/',
           image:          'http://example.com/image.png',
           copyright:      'All rights reserved 2013, John Doe',

           author: {
              name:       'Tone',
              email:      'johndoe@example.com',
              link:       'https://example.com/johndoe'
           }
    });

    seriesStore.all(function (err, results) {
      for (var idx in results) {
         var ele = results[idx];
         for (var idx2 in ele.videos) {
            var ele2 = ele.videos[idx2];
            feed.item({
               title: ele.title + ' : ep ' + ele2.ep, 
               link: ele.coverUrl, 
               description: ele.title + ' : ep ' + ele2.ep, 
               date: new Date(),
               image: ele2.url
            });
         }
      }
      res.set('Content-Type', 'text/xml');
      res.send(feed.render('rss-2.0'));
    });

});

