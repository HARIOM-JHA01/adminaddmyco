

 $(".your_mind").hide();
 $(document).ready(function(){
  $("#btn2").click(function(){
    $(".your_mind").show();
    
    $(".give_me").hide();
    $("#btn1").click(function(){
      $(".give_me").show();
      $(".your_mind").hide();
    })
  })
 })