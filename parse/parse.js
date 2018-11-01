var fs = require('fs');
var cheerio = require('cheerio');
var request = require('request');

fs.readFile( __dirname + '/boarder.html', function (err, data) {
  if (err) {
    throw err;
  }
  var htmlString= (data.toString());

var downloader = [];
var people = [];
var $ = cheerio.load(htmlString);

	$('.psrch-results').children('.psrch-FullResult, .psrch-FirstFullResult').each(function () {
		var $infoCard = $(this).children("#ContactInfo").children("#MiniContactCard");
		var name = $infoCard.children("#NameField").children(".nameBlock").text();
		var email = $infoCard.children("#EmailField").children("a").text();
		var id = $infoCard.children("#NameField").attr("stid");

		var photoURL = $(this).children("#UserPhoto").children("img").attr("src");
		var hasPhoto = false;
		if(photoURL.indexOf("placeholder") < 0){
			hasPhoto = true;
			downloader.push({
				"url": photoURL,
				"id":id
			});
			// download(photoURL, "faces/" + id + ".png" , function(){});
		}
		people.push({
			"name": name,
			"email": email,
			"id": id,
			"hasPhoto": hasPhoto,
			"photoURL": photoURL
		});


	});

  var MongoClient = require('mongodb').MongoClient;
  var url = "mongodb://localhost:27017/";

  MongoClient.connect(url, function(err, db) {
    if (err) throw err;

    var dbo = db.db("exonianencounter");
    var peopleconnection = dbo.collection("people");

    peopleconnection.insert(people, function(a,b){});
  });

	// console.log(people);
	// recursiveDownload(145, downloader);
});


function recursiveDownload(index, ppl){
	console.log(index);
	download(ppl[index].url, "faces/" + ppl[index].id + ".png" , function(){
		if(index < ppl.length -1){
			recursiveDownload(index + 1, ppl);
		}
	});
}
var download = function(uri, filename, callback){
  var options = {
	 "uri": uri,
	  headers: {
	    'Authorization': 'Basic ' + new Buffer("srucker:Roadkill6").toString('base64')
	  },
	  "timeout": 30000
	};



   request(options).pipe(fs.createWriteStream(filename)).on('close', callback);


};
