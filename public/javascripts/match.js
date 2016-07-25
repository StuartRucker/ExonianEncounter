
$(document).ready(function(){
	$.get( "api/matches", function( data ) {
		var foundMatch = false;
		var foundSelection = false;
		for(var i = 0; i < data.length; i ++){
			if(data[i].isMatch){
				if(!foundMatch){
					foundMatch = true;
					$("#matches-container").html("");
				}
				$("#matches-container").append(new EJS({url: '/templates/match.ejs'}).render(data[i]));
			}else{
				if(!foundSelection){
					foundSelection = true;
					$("#selections-container").html("");
				}
				$("#selections-container").append(new EJS({url: '/templates/match.ejs'}).render(data[i]));
			}
			id  = data[i]._id;
			$("#" + data[i]._id).click(function(){
				var id = $(this).attr("id");

				if($(this).data("enabledtoggle") == "off"){
	              $(this).data("enabledtoggle", "on");
	              $(this).text("Enabled");
	              $(this).removeClass("btn-danger");
	              $(this).addClass("btn-success");

	              $(".disablemessage."+id).hide();
	              $(".enablemessage."+id).show();

	              sendToggleRequest(id, "", "enabled");
	            }else{
	              $(this).data("enabledtoggle", "off");
	              $(this).text("Disabled");
	              $(this).removeClass("btn-success");
	              $(this).addClass("btn-danger");

	              $(".enablemessage."+id).hide();
	              $(".disablemessage."+id).show();

	              sendToggleRequest(id, "", "disabled");
	            }
			});
		}
	});	
});

function sendToggleRequest(id, name, action){
    $.ajax({
      type: "POST",
      url: "/toggleselection",
      data: {"id": id},
      success: function(result){
        humane.log(action);
      }
    });
}
