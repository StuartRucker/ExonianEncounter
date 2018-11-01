var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var request = require("request");

var methodOverride = require('method-override'),
    session = require('express-session'),
    passport = require('passport'),
    LocalStrategy = require('passport-local');

var mongo = require('mongodb');
var monk = require('monk');
var db = monk('localhost:27017/exonianencounter');




var app = express();

var sender = require("./util/email");

var TOTAL_SELECTIONS = 11;
// var enableEmail = true;


//===============PASSPORT===============

passport.serializeUser(function(user, done) {
    done(null, user._id);
});


passport.deserializeUser(function(id, done) {
    var collection = db.get('people');
    collection.find({
        "_id": id
    }, {}, function(e, docs) {
        if (docs.length == 1) {
            var ans = docs[0];
            delete ans.password;
            done(null, ans);
        } else {
            done(null, false);
        }
    });

    // if (id == 12321) {
    //     done(null, {
    //         "user": "bob",
    //         "_id": 12321
    //     });
    // }
});

passport.use('local-signin', new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true // allows us to pass back the entire request to the callback
    },
    function(req, email, password, done) {
        var collection = db.get('people');

        if(!email.includes("@exeter.edu")){
            email += "@exeter.edu";
        }
        console.log(email + " " + password);
        //first check if someone used the key generator
        collection.find({"email": email,"password": password}, {}, function(e, docs) {
            console.log("trying to authenticate")
            if (e == null && docs.length == 1) {
                var ans = docs[0];
                delete ans.password;
                done(null, ans);
            }

            //if that doesn't work. Check if they used network password
            else {
                console.log("exeter authing")
                exeterAuth(email, password, function(valid){
                    if(valid){
                        console.log(email)
                        collection.find({"email": email}, {}, function(e, docs) {
                            console.log("error:");
                            console.log(e);
                            console.log();
                            console.log(docs);
                            if(e == null){
                              if(docs.length == 1){
                                  var ans = docs[0];
                                  delete ans.password;
                                  done(null, ans);
                              }else{
                                  done(null, false);
                              }
                            }
                        });
                    }else{
                      console.log("exeter authing fail")
                        done(null, false);
                    }
                });

            }

        });

        // if (email == "bob@exeter.edu") {
        //     done(null, {
        //         "user": "bob",
        //         "_id": 12321
        //     });
        // } else {
        //     done(null, false);
        // }
    }));




//===============EXPRESS================

app.listen(80);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('json spaces', 5);
// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
// app.use(logger('combined'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(methodOverride('X-HTTP-Method-Override'));
app.use(session({
    secret: 'supernova',
    saveUninitialized: true,
    resave: true
}));
app.use(passport.initialize());
app.use(passport.session());

// Session-persisted message middleware
app.use(function(req, res, next) {
    req.db = db;
    next();
});




// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

app.get('/', isLoggedIn, function(req, res) {
    getPeopleLeft(req.user._id.toString(), db.get("likes"), function(likesLeft) {
        res.render('index', {
            "user": req.user,
            "peopleleft": likesLeft
        });
    });

});
app.get('/matches', isLoggedIn, function(req, res) {
    res.render('matches');
});

app.get('/api/matches', isLoggedIn, function(req, res) {
    var collection = db.get("likes");
    collection.find({
        object: req.user._id.toString(),
        on: true
    }, {}, function(e, likeMe) {
        collection.find({
            subject: req.user._id.toString()
        }, {}, function(e, iLike) {
            var ppl = [];


            for (var k = 0; k < iLike.length; k++) {
                var selection = {
                    id: iLike[k].object,
                    theylike: false,
                    iEnable: iLike[k].on
                };
                for (var i = 0; i < likeMe.length; i++) {
                    if (likeMe[i].subject.toString() == iLike[k].object.toString()) {
                        selection.theylike = true;
                    }
                }
                ppl.push(selection);

            }
            getUserinfo(db.get("people"), [], 0, ppl, function(data) {
                res.json(data);
            });

        });
    });
});

function getUserinfo(collection, data, index, ppl, callback) {
    if (index < ppl.length) {
        var idObj = new mongo.ObjectID(ppl[index].id);
        collection.find({
            _id: idObj
        }, {}, function(e, docs) {
            var newDoc = docs[0];
            delete newDoc.password;
            newDoc.selectStatus = (ppl[index].iEnable) ? "on" : "off";
            newDoc.isMatch = ppl[index].theylike;
            data.push(newDoc);
            getUserinfo(collection, data, index + 1, ppl, callback);
        });
    } else {
        callback(data);
    }
}

app.post('/submitselects', isLoggedIn, function(req, res) {
    var ids = req.body["content[]"];
    if (typeof ids == "string") {
        ids = [ids];
    }

    var collection = db.get("likes");
    getPeopleLeft(req.user._id.toString(), db.get("likes"), function(peopleLeft) {
        for (var i = 0; i < Math.min(ids.length, peopleLeft); i++) {

            var localId = ids[i];
            (function(id){
              collection.find({subject: (req.user._id).toString(),object: id}, {}, function(e, docs) {
                var criteria = {
                    subject: (req.user._id).toString(),
                    object: id
                };

                  if (docs.length == 0) {
                      criteria.on = true;
                      collection.insert(criteria, function(err, result) {});
                  } else {
                      var newState = !docs[0].on;

                      collection.update(criteria, {
                          $set: {
                              "on": newState
                          }
                      }, function(err, result) {});
                  }
              });
            })(localId);

        }
        res.redirect("/matches");
    });

});

app.post('/toggleselection', isLoggedIn, function(req, res) {
    var collection = db.get("likes");
    var criteria = {
        subject: (req.user._id).toString(),
        object: req.body.id
    };


    collection.find(criteria, {}, function(e, docs) {
        if (docs.length == 0) {

        } else {
            var newState = !docs[0].on;

            collection.update(criteria, {
                $set: {
                    "on": newState
                }
            }, function(err, result) {});
        }
    });
    res.json({
        message: "success"
    });
});

//displays our signup page
app.get('/signin', function(req, res) {
    res.render('signin', {
        "emailstatus": "none"
    });
});



//sends the request through our local login/signin strategy, and if successful takes user to homepage, otherwise returns then to signin page
app.post('/login', passport.authenticate('local-signin', {
    successRedirect: '/',
    failureRedirect: '/signin'
}));

app.post('/emailpass', function(req, res) {
    var collection = db.get('people');
    collection.find({
        "email": req.body.email
    }, {}, function(e, docs) {
        if (docs.length == 1) {
            if (enableEmail) {
                sender.email(docs[0].email, docs[0].password);
            }
            res.render("signin", {
                "emailstatus": "sent"
            });
        } else {
            res.render("signin", {
                "emailstatus": "noexist"
            });
        }
    });
});

//logs user out of site, deleting them from the session, and returns to homepage
app.get('/logout', function(req, res) {
    var name = req.user.username;
    console.log("LOGGIN OUT " + req.user.username)
    req.logout();
    res.redirect('/signin');
    req.session.notice = "You have successfully been logged out " + name + "!";
});

app.get('/api/search/:searchstring', isLoggedIn, function(req, res, next) {
    var words = req.params.searchstring.split(" ");
    if (words.length == 0) {
        res.json([]);
        return;
    }


    var collection = db.get('people');

    var querystringOr = "(" + words[0].capitalizeFirstLetter();
    var querystringAnd = "";
    for (var i = 1; i < words.length; i++) {
        querystringOr += "|" + words[i].capitalizeFirstLetter();
    }
    for (var i = 0; i < words.length; i++) {
        querystringAnd += "(?=.*" + words[i].capitalizeFirstLetter() + ")";
    }
    querystringOr += ")";


    var searchQueryOr = new RegExp(querystringOr);
    var searchQueryAnd = new RegExp(querystringAnd);

    collection.find({
        "name": searchQueryAnd
    }, function(e, docs) {
        if (docs.length == 0) {
            collection.find({
                "name": searchQueryOr
            }, function(e, docs1) {
                addSelectStatus(db.get("likes"), req.user._id.toString(), deletePassword(docs1), function(data) {
                    res.json(data);
                })

            });
        } else {
            addSelectStatus(db.get("likes"), req.user._id.toString(), deletePassword(docs), function(data) {
                res.json(data);
            })
        }


    });




});

function addSelectStatus(collection, userId, people, callback) {
    collection.find({
        subject: userId
    }, {}, function(e, peopleILike) {
        for (var i = 0; i < people.length; i++) {
            people[i].selectStatus = "none";
            for (var k = 0; k < peopleILike.length; k++) {
                if (people[i]._id == peopleILike[k].object) {
                    people[i].selectStatus = (peopleILike[k].on) ? "on" : "off";
                }
            }
        }
        callback(people);
    })
}
String.prototype.capitalizeFirstLetter = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

function deletePassword(docs) {
    for (var i = 0; i < docs.length; i++) {
        delete docs[i].password;
    }
    return docs;
}

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated())
        return next();

    res.redirect('/signin');
}

function getPeopleLeft(id, collection, callback) {
    collection.count({
        subject: id
    }, function(e, count) {
        callback(TOTAL_SELECTIONS - count);
    });
}

function exeterAuth(username, password, callback){
    var url = "https://connect.exeter.edu/_layouts/images/datatel/help-sm.png",
        auth = "Basic " + new Buffer(username + ":" + password).toString("base64");
    request({
        url : url,
        headers : {
            "Authorization" : auth
        }
    },
    function (error, response, body) {
        callback(response.statusCode == 200);
    });

}
module.exports = app;




// for(var i = 0; i < obj.length; i ++){

//   var person = obj[i];
//   person.password = makeid();

//   // console.log(person);
//   var collection = db.get('people');
//   collection.insert(person);

// }

// function makeid()
// {
//     var text = "";
//     var possible = "abcdefghijklmnopqrstuvwxyz0123456789";

//     for( var i=0; i < 8; i++ )
//         text += possible.charAt(Math.floor(Math.random() * possible.length));

//     return text;
// }
