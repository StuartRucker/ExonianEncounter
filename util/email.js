var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport('smtps://exonianencounter1%40gmail.com:Roadkill0@smtp.gmail.com');


module.exports = {
  email: function(useremail, password) {
    var mailOptions = {
	    from: '"Exonian Encounter" <exonianencounter1@gmail.com>', // sender address
	    to: useremail, // list of receivers
	    subject: 'Exonian Encounter ( ͡° ͜ʖ ͡°) Password', // Subject line
	    html: 'Go to http://localhost:8080/signin<br><br>Email: <b>'+useremail + '</b><br>Password:<b>' + password + "</b>"
	};

	// send mail with defined transport object
	transporter.sendMail(mailOptions, function(error, info){
	    if(error){
	        return console.log(error);
	    }
	    console.log('Message sent: ' + info.response);
	});
  }
};

