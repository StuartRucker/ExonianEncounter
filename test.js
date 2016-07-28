

var request = require('request');
    username = "srucker@exeter.edu",
    password = "Roadkill7";
    

exeterAuth(username, password, function(legit){
	console.log(legit);
});

