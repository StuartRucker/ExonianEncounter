var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/search/:searchstring', function(req, res, next) {
 	var words = req.params.searchstring.split(" ");
 	if(words.length == 0){
 		res.json([]);
 		return;
 	}

    var db = req.db;
    var collection = db.get('people');
   
    var querystringOr = "(" + words[0].capitalizeFirstLetter();
    var querystringAnd = "";
    for(var i = 1; i < words.length; i ++){
    	querystringOr += "|" + words[i].capitalizeFirstLetter();
    }
    for(var i = 0; i < words.length; i ++){
        querystringAnd += "(?=.*"+words[i].capitalizeFirstLetter()+")";
    }
    querystringOr += ")";


    var searchQueryOr = new RegExp(querystringOr);
    var searchQueryAnd = new RegExp(querystringAnd);
    
    collection.find({"name": searchQueryAnd},function(e,docs){
        if(docs.length == 0){
            collection.find({"name": searchQueryOr},function(e,docs){
                
                res.json(deletePassword(docs));
            });
        }else{
            res.json(deletePassword(docs));
        }


    });

    
 	

  
});

String.prototype.capitalizeFirstLetter = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}
function deletePassword(docs){
    for(var i = 0; i < docs.length; i ++){
                    delete docs[i].password;
                }
                return docs;
}

module.exports = router;


