$( document ).ready(function() {
  $('.search-input').keyup(function(e){
    if(e.keyCode == 13)
    {
        search();
    }
	});

	$(".search").click(search);

  $("#submit-people").click(function(){
      if( $(".selected-people li").length == 0){
         mAlert({
          showSubmit: false,
          selected: "",
          header: "No Selected People",
          message: "Before submitting, select people you are interested in."
        });
      }else{
        mAlert({
          showSubmit: true,
          selected: $(".selected-people").html(),
          header: "Submit Selected People",
          message: "After this operation: <b>" + ($("#peopleleft-message").data("peopleleft")-list.people.length) + " selections left </b><br><br>Although you can cancel selected people (so you can no longer match), you will not be able to select new people in their place.<br><br> You have selected"
        });
      }

  });
});


function mAlert(data){
   $("#myModal").html(new EJS({url: '/templates/modal.ejs'}).render(data))
   $("#myModal").modal();
}

function sendToggleRequest(id, name, action){
    $.ajax({
      type: "POST",
      url: "/toggleselection",
      data: {"id": id},
      success: function(result){
        console.log("good");
        humane.log(name + " has been " + action);
      }
    });
}

function submit(){
  var cont = {"content":list.getIdArray()};

  $.ajax({
    type: "POST",
    url: "/submitselects",
    data: cont,
    success: function(result){
      window.location.href = "/matches";
    }
  });
}

var list = {
  people: [],
  addPerson: function(person){
    var peopleLeft = ($("#peopleleft-message").data("peopleleft")-list.people.length);
    if(peopleLeft <= 0){
       mAlert({
          showSubmit: false,
          selected: "",
          header: "No more selections",
          message: "Sorry, but you can not select any more people. In a few months, this app may be reset, and all selections will be cleared"
        });
    }else{
      for(var i = 0; i < this.people.length; i ++){
        if(person._id == this.people[i]._id) return;
      }
      this.people.push(person);
      $(".selected-people").append(new EJS({url: '/templates/list.ejs'}).render(person));
      this.updatePeopleLeft();
    }
  },
  removePerson: function(person){
    for(var i = 0; i < this.people.length; i ++){
      if(person._id == this.people[i]._id){
        this.people.splice(i--, 1);
      }
    }
    $("li." + person._id).remove();
    this.updatePeopleLeft();
  },
  updatePeopleLeft: function(){
    $("#peopleleft-message").text("After this: " + 
      ($("#peopleleft-message").data("peopleleft") - this.people.length) + 
      " people left");
  },
  getIdArray:function(){
    var content = [];
    for(var i = 0; i < this.people.length; i ++){
      content.push(this.people[i]._id);
    }
    return content;
  }
}

function search(){
	var query = $(".search-input").val();
	$.get( "api/search/" + query, function( data ) {
    
    $("#search-result-pane").html("");

    for(var i = 0; i < data.length; i ++){
      data[i].state = false;
      for(var k = 0; k < list.people.length; k ++){
        if(data[i]._id == list.people[k]._id){
          data[i].state = true;
          console.log("setting to true");
        }
        
      }
    }
    $("#search-result-pane").append(new EJS({url: '/templates/result.ejs'}).render({"obj":data}));
    
    data.forEach(function(item, index){
      $("#" + item._id).click(function(){
          if($(this).data("toggle")){
            if($(this).data("toggle") == "off"){
              if(($("#peopleleft-message").data("peopleleft")-list.people.length) > 0){
                 $(this).data("toggle", "on");
              $(this).text("Selected");
              $(this).removeClass("btn-default");
              $(this).addClass("btn-primary");
              }
             

              list.addPerson(item);
            }else{
              $(this).data("toggle", "off");
              $(this).text("Select");
              $(this).removeClass("btn-primary");
              $(this).addClass("btn-default");

              list.removePerson(item);
            }
          }else{
            if($(this).data("enabledtoggle") == "off" ){
               
              $(this).data("enabledtoggle", "on");
              $(this).text("Enabled");
              $(this).removeClass("btn-danger");
              $(this).addClass("btn-success");

              sendToggleRequest(item._id, item.name, "enabled");
            }else{
              $(this).data("enabledtoggle", "off");
              $(this).text("Disabled");
              $(this).removeClass("btn-success");
              $(this).addClass("btn-danger");

              sendToggleRequest(item._id, item.name, "disabled");
            }
          }
          
      });
    });

  });
}








