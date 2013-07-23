var util = require('util')
  , url = require('url')
  , httpAgent = require('http-agent')
  , jsdom = require('jsdom').jsdom
  , S = require('string')
  , http = require('http')

var Shred = require("shred");

var $$ = require('jquery');

var nStore = require('nstore');
var seriesStore = nStore.new('data/series.db', function () {
  // It's loaded now
});

var vs = [];
// [] => { ::each movie:: }
// ::each movie:: => {title: ::String::, coverUrl: ::String::, videos: [::video::]}
// ::video:: => {ep: ::String::, url: ::String::}
 
function printAllSeries(agent) {
  var window = jsdom(agent.body).createWindow()
    , $ = require('jquery').create(window);
  
  //console.log('content : ' + agent.body);

  //
  // Now you can use jQuery to your heart's content!
  //
  var series = $('section.serie-hit ul.thumbnails li')
    
  var printme = $.map(series, function(el, i) {
        //if (i == 1) {
        var a = $(el).find('a').first();
        var img = a.find('img');
        console.log('Add url ' + a.attr('href'));
        agent.addUrl(a.attr('href'));
        console.log('add video meta : ' + img.attr('alt'));
        vs[img.attr('alt')] = {title: img.attr('alt'), coverUrl: img.attr('src'), videos: []};
        return img.attr('alt') + ' [' + img.attr('src') + '][' + a.attr('href') + ']';
        //}
    });

  //var divDown = $('div[itemType="http://schema.org/TVSeries"]');
  //var titleText = divDown.find('h3').last().text();
  //var tableHover = $('div[itemType="http://schema.org/TVSeries"] table.table-hover');
  var tableHover = $('div.well table.table-hover');
  var titleText = tableHover.siblings('h3').first().text();
  var header = $('header.page-header h1').text();

  tableHover.find('tbody tr').each(function(idx,ele){
     console.log('Found header = ' + header);
     var serie = vs[header];
     if (!serie) console.log('Cannot find serie');
     var ep = $(this).find('td:nth-child(1)').text();
     var date = $(this).find('td:nth-child(2)').text();
     var link = $(this).find('td:nth-child(3) a').attr('href');
     var thisVid = {ep: ep};
     if (link) {
       var newLink = S(link).chompLeft('http://www.kodhit.com/').s;
       var encLink = encodeURIComponent(newLink);
       //agent.addUrl(encLink);
       //console.log('Found: ' + ep + " " + date + " " + link);
       //console.log('Add link ' + encLink);
       reqHttp('http://www.kodhit.com/' + encLink, function(respBody){
          var window = jsdom(respBody).createWindow();
          var jquery = require('jquery').create(window);
          var ifr = jquery('iframe[src*="kodhit"]');
          
			 if (ifr.size() == 1) {
				var linkToVideo = ifr.attr('src');
				console.log('Time of iframe = ' + linkToVideo);
				var re = /.*\/(.+?).html/;
				var res = re.exec(linkToVideo);
				var vk = res[1];
				var realLink = 'http://www.kodhit.com/jwplayer/embed.php?vk=' + vk;
				//console.log('Add link iframe = ' + realLink);
				var jsonVk = 'http://www.kodhit.com/vk/' + vk + '.json';
				console.log('jsonVk = ' + jsonVk);
				//agent.addUrl(realLink);
				reqJsonVk(jsonVk, realLink, function(vu){
					console.log('Found video url : ' + vu.url);
               thisVid.url = vu.url;
               serie.videos.push(thisVid);
               console.log('current:' + JSON.stringify(serie));
               seriesStore.save(header, serie, function (err) {
				      if (err) { throw err; }
				         // The save is finished and written to disk safely
		            });
				});
			 }
       });
     }
  });

  var ifr = $('iframe[src*="kodhit"]');

  if (ifr.size() == 1) {
    var linkToVideo = ifr.attr('src');
    console.log('Time of iframe = ' + linkToVideo);
    var re = /.*\/(.+?).html/;
    var res = re.exec(linkToVideo);
    var vk = res[1];
    var realLink = 'http://www.kodhit.com/jwplayer/embed.php?vk=' + vk;
    //console.log('Add link iframe = ' + realLink);
    var jsonVk = 'http://www.kodhit.com/vk/' + vk + '.json';
    console.log('jsonVk = ' + jsonVk);
    //agent.addUrl(realLink);
    reqJsonVk(jsonVk, realLink, function(vu){
       console.log('Found video url : ' + vu.url);
    });
  }

  console.log(printme.join('\n'));
}

// callback(videoUrl),  ::videoUrl:: => {url: ::String::, height: ::Number::, width: ::Number::, type: ::String::}
function reqJsonVk(vkUrl, refer, callBack) {
   var shred = new Shred();
   var req = shred.get({
      url: vkUrl,
      headers: {
        Accept: "application/json",
        Referer: refer
      },
      on: {
        // You can use response codes as events
        200: function(response) {
          // Shred will automatically JSON-decode response bodies that have a
          // JSON Content-Type
          //console.log(response.content.data);
          var found;
          $$.each(response.content.data, function(idx,el){
             if (el.type == 'video/mpeg4') {
                if (! found) found = el;
                else {
                   if (found.width < el.width) {
                       found = el;
                   }
                }
             }
          });
          console.log('Found : ' + JSON.stringify(found));
          if (callBack != null) {
             callBack(found);
          }
        },
        // Any other response means something's wrong
        response: function(response) {
          console.log("Oh no!");
        }
      }
   });
}

// callBack(String responseContentBody) 
function reqHttp(url, callBack) {
   var shred = new Shred();
   var req = shred.get({
      url: url,
      headers: {
        Accept: "*"
//,
//        Referer: refer
      },
      on: {
        // You can use response codes as events
        200: function(response) {
          // Shred will automatically JSON-decode response bodies that have a
          // JSON Content-Type
          //console.log(response.content.data);
          if (callBack != null) {
             callBack(response.content.body);
          }
        },
        // Any other response means something's wrong
        response: function(response) {
          console.log("Oh no! in reqHttp");
        }
      }
   });
}

function Scrap() {
 
		  var urls = [''];
		  var agent = httpAgent.create('www.kodhit.com', urls, {headers: {'User-Agent': 'Mozilla/5.0'}});
		  console.log('Scraping', urls.length, 'pages from', agent.host);
			
//section.serie-hit ul.thumbnails li

		  agent.addListener('next', function (err, agent) {
			 printAllSeries(agent);
			 console.log();
			 agent.next();
		  });
			
		  agent.addListener('stop', function (err, agent) {
			 if (err) console.log(err);
			 console.log('All done!');
		  });
			
		  // Start scraping
		  agent.start();

        //var vk = 'http://www.kodhit.com/vk/51a5705e6856d1875e000002.json';

        //reqJsonVk('51a5705e6856d1875e000002');
        //reqJsonVk2(vk);
//     var $ = require('jquery');
//    $.getJSON( vk , function(data, textStatus, jqXHR){
//        console.log('status:' + textStatus);
//    } ).done(function() { console.log( "second success" ); })
//.fail(function(jqxhr, textStatus, error) { console.log( "Request Failed: " + textStatus + ', ' + error); })

		  //return agent;
}

module.exports = Scrap;

