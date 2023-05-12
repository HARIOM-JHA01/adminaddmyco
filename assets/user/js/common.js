$(document).ready( function() 
{
	$('[data-toggle="tooltip"]').tooltip(); 
	
	var IDLE_TIMEOUT = 600 ;  // 10 minutes of inactivity
	var _idleSecondsCounter = 0;
	document.onclick = function() {
		_idleSecondsCounter = 0;
	};
	document.onmousemove = function() {
		_idleSecondsCounter = 0;
	};
	document.onkeypress = function() {
		_idleSecondsCounter = 0;
	};
	window.setInterval(CheckIdleTime, 1000);
	function CheckIdleTime() {
		_idleSecondsCounter++;
		var loc = ( base_url+'/login/logout' );
		var oPanel = document.getElementById("SecondsUntilExpire");
		if (oPanel)
			oPanel.innerHTML = (IDLE_TIMEOUT - _idleSecondsCounter) + "";
		if (_idleSecondsCounter >= IDLE_TIMEOUT) {
			// destroy the session in logout.php 
			document.location.href = loc;
		}
	}
	
	if( $('#dashboard-owl').length >0 )
	{
		$('#dashboard-owl').owlCarousel({
			loop: true,
			margin: 10,
			dots:false,
			nav: true,
			navText:["<div class='nav-btn prev-slide'></div>","<div class='nav-btn next-slide'></div>"],
			autoplay: true,
			autoplayHoverPause: true,
			responsive: {
				0: { items: 1 },
				440: { items: 1 },
				576: { items: 1 },
				768: { items: 1 },
				845: { items: 2 },
				1000: { items: 2 },
				1060: { items: 2 },
				1170: { items: 2 }
			}
		});
	}

	if( $('#chamber-owl').length >0 || $('#chamber-owl1').length >0 || $('#chamber-owl2').length >0 )
	{
		$('#chamber-owl, #chamber-owl1, #chamber-owl2').owlCarousel({
			loop: true,
			margin: 10,
			dots:true,
			nav: false,
			navText:["<div class='nav-btn prev-slide'></div>","<div class='nav-btn next-slide'></div>"],
			autoplay: true,
			autoplayHoverPause: false,
			responsive: {
				0: { items: 1 },
				440: { items: 1 },
				576: { items: 1 },
				768: { items: 1 },
				845: { items: 1 },
				1000: { items: 1 },
				1060: { items: 1 },
				1170: { items: 1 }
			}
		});
	}
	
	// Send Telegram Channel Link
	$('button[id=telegram_channel]').on('click',function()
	{
	    $('.success').text( '' );
		document.getElementById("telegram_channel").disabled = true;
		console.log( "Here" );
		var loc = ( base_url+'login/sendTelegramSignUpLink' );		
		jQuery.post( loc, {}, function ( json ) {
			console.log( json );
			$('.input-notification').text('success');		
			document.getElementById("telegram_channel").disabled = false;

			window.location.href = 'https://t.me/mynamecard';
			// window.open(  'https://t.me/Mynamecard' , '_blank');
		});
	});

	// Join us by Telegram Account
	$('button[name=create_account]').on('click',function()
	{
	    $('.success').text( '' );
		document.getElementById("signup").disabled = true;
		$('#signup_loading_img').removeClass("d-none");
		$('.text').addClass("d-none");
		form_data = $('#form-validate-account').serialize();
		console.log( form_data );
		var loc = ( base_url+'login/saveTelegramAccount' );		
		jQuery.post(loc, form_data, function ( json ) {
			var resp = ( $.parseJSON( json ) );
			
			if(resp['error'])
				displayErrors(resp['error']);
			console.log( resp );
			if(resp['success'])
			{
				$('input[class=c-form]').val('');
				$('.input-notification').text('');
//				$('#joinus').text( resp['msg'] );
				
//				popupOpen( $('#tme').text() );
				window.location.href = resp['url'];//'https://t.me/mynamecard';
				// window.open(  resp['url'] , '_blank');
			}		
			
			$('#signup_loading_img').addClass("d-none");
			$('.text').removeClass("d-none");
			document.getElementById("signup").disabled = false;
		});
	});
	
	// Login 
	$('button[name=sign_in]').on('click',function()
	{
		document.getElementById("login").disabled = true;
		$('#login_loading_img').removeClass("hide");
		login_data = $('#login-form').serialize();
		var loc = ( base_url+'login' );	
		console.log( login_data );
		$.post(loc, login_data, function (json) {
			var resp = ($.parseJSON(json));
			
			if(resp['error'])
				displayErrors(resp['error']);
			
			if(resp['warning'])
			{
				$("#Error_login").text( resp['warning'] );
			}
			
			if(resp['success'])
			{
				$('.input-notification').hide();
				window.location = resp['url'];
			}		
			
			$('#login_loading_img').addClass("hide");
			document.getElementById("login").disabled = false;
		});
	});
	
	// Forgot Password 
	$('input[name=forgot_password]').on('click',function()
	{
//		$('#forgot_loading_img').removeClass("hide");
//		$('#btn_f_password').addClass("hide");
		forgot_data = $('#forgot').serialize();
		var loc = (base_url+'login/forgotpassword');		
		
		$.post(loc, forgot_data, function (json) {
			
			var resp = ($.parseJSON(json));	
			
			if(resp['error'])
				displayErrors(resp['error']);
			
			if(resp['success'])
			{
//				$('.input-notification').hide();
				$('input[name=forgot_email]').val('');
				$( "#success" ).text( resp['success'][1] );
				window.setTimeout(function(){location.reload()},5000);
			}
//			$('#forgot_loading_img').addClass("hide");
//			$('#btn_f_password').removeClass("hide");
		});
	});
	
	$('.modal').on('hidden.bs.modal', function () 
	{
	    $(this).find('form').trigger('reset');
	    $('.success').text( '' );
	    $('.error').text( '' );
	});
	
	// theme color 
	$('input[name=color]').on('change',function()
	{	console.log('hear');
		var color =  this.value;
		console.log(color);
		var loc = (base_url+'home/changeThemeColor');		
		
		$.post(loc, { color:color }, function (json) {
			var resp = ($.parseJSON(json));	
			console.log( resp );
			if( resp['success'] )
			{
//				$(".cmspage4").removeAttr("style");
//				$(".cmspage4").css( "background", color+" !important" );
				location.reload(true);
				
			}
		});
	});
	
	// button color 
	$('input[name=button]').on('change',function()
	{	
		var color =  this.value;
		console.log(color);
		var loc = (base_url+'home/changeButtonColor');		
		
		$.post(loc, { color:color }, function (json) {
			var resp = ($.parseJSON(json));	
			console.log( resp );
			if( resp['success'] )
			{
//				$(".cmspage4").removeAttr("style");
//				$(".cmspage4").css( "background", color+" !important" );
				location.reload(true);
				
			}
		});
	});
	
	// font color 
	$('input[name=font]').on('change',function()
	{
		var color =  this.value;
		console.log(color);
		var loc = (base_url+'home/changeFontColor');		
		
		$.post(loc, { color:color }, function (json) {
			var resp = ($.parseJSON(json));	
			console.log( resp );
			if( resp['success'] )
			{
//				$(".cmspage4").removeAttr("style");
//				$(".cmspage4").css( "background", color+" !important" );
				location.reload(true);
				
			}
		});
	});
	
//	$("#visit_link").click( function()
//	{
//		var profile = $("input[name='profile']:checked").val();
//		
//		if( profile == "" || profile == "undefined" )
//			alert( "Please select at least one profile" );
//		else
//		{
//			if( profile == 1 )
//				window.location = base_url+"personal-profile-edit";
//			else
//				window.location = base_url+"company-profile-edit?";
//		}
//	});
	
	$(".modal").on("shown.bs.modal", alignModal);
	
	$(".close-model").on( "click", function()
	{
		$("#telegramModal").click();
		$("#loginModal").click();
		$("#forgotModal").click();
	});
	
	//set donation session value
	// 	$("#send_donation").click( function()
	// {
	// 	forgot_data = $('#chamber_form').serialize();
	// 	var loc = (base_url+'checkout/setCartData');		
		
	// 	$.post(loc, forgot_data, function (json) {
	// 		var resp = ($.parseJSON(json));		
			
	// 		if(resp['success'])
	// 		{
	// 			console.log( "success" );
	// 		}
	// 	});
	// });
	
	$('.permission-denied').on("click", function () { $("#sign_in_footer").click(); });
	$('.cursor-no-drop').removeAttr( "href" ).removeAttr( "onClick" );//.attr('title', 'Please Login first to show full details');
	
	if( home == "" || ( home == "send-request" && urlParam('sender') == "" ) )
	{
		$(".cms-index-index").removeAttr( "style" );
	}
	
	if( home == "send-request" || home == "register")// && urlParam('sender') == "" /*home == "home" || home == "" || */
	{
//		$(".session-header").addClass( "d-none" );
		$(".session-body").removeClass( "border" ).removeAttr( "style" );
		$( ".header-panel" ).addClass( "d-none" );
		$( ".header-donation" ).addClass( "d-none" );
		$("#sign_in").click();
	}

	if( home == "" )
	{
		$(".session-body").removeClass( "border" );
	}
	
	$("#view_more").on( "click", function()
	{
		$(".view-more").removeClass( "d-none" );
		$("#view_less").removeClass( "d-none" );
		$("#view_more").addClass( "d-none" );
	});
	
	$("#view_less").on( "click", function()
	{
		$(".view-more").addClass( "d-none" );
		$("#view_less").addClass( "d-none" );
		$("#view_more").removeClass( "d-none" );
	});
	
	$('.changeContactlist').click(function()
	{
		var ju_send_id = $(this).attr("data-send");
		var ju_accept_id =  $(this).attr("data-accept");
		var id = $(this).attr("id");
		  
		$("#dt"+id).addClass("d-none");
		var htm = "";
		htm+= '<input type="text" onkeyup="changeContactName('+id+')" id="cl_name_'+id+'" class="w-75 mb-0 text-center cl_name" value="'+$("#updateName_"+id).text()+'" placeholder="enter name" name="cl_name"/>'
		$("#add"+id).append(htm);
	
	});
		
	// $("#btn_lable").click(function()
	// {
	// 	var lable = $("#lable").val();
	// 	var loc = (base_url+'home/changeContactLableName');		
	
	// 	$.post(loc, { lable:lable,send:send,accept:accept }, function () {
	// 		$('.close').click();
	// 		// location.reload();
	// 	});
	// });

	if( isSignup == 1 )
    {
		$("#clickTelegramModal").click();
	}
	
	$('input[type="file"]').change(function(e){

		var fileName = e.target.files[0].name;

		//alert('The file "' + fileName +  '" has been selected.');
		$("#vdo_name").text( fileName );
	});
});


function phone(phone)
{
	$(".phoneModal").click();
	phone = '<a href="tel:'+phone+'" style="color:#000;">Tap to call me '+phone+'</a>';
	$("#phone").html(phone);
	
	
}
function fax(fax)
{
	console.log(phone)
	$(".faxModal").click();
	$("#fax").text(fax);
	
	
}
function changeContactName()// id 
{
	var id = $("#id").text();
	var cl_name = $("#cl_name").val();
	var loc = base_url+'home/changeContactLableName';

	var ju_send_id = $("#ju_send_id").val();
	var ju_accept_id =  $("#ju_accept_id").val();

	if( cl_name.length > 0 )
	{
		$("#updateName_"+id).text( cl_name );
		
		$.ajax({
			type : "POST",
			url  : loc,
			dataType : "JSON",
			data : {ju_send_id:ju_send_id,ju_accept_id:ju_accept_id,cl_name:cl_name},
			success: function(){
				console.log("here");
			}
		});

		$("#btnlbl_"+id).text( cl_name );
		$(".lableModal").click();
	}
}

function urlParam(name)
{
    var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
    if (results==null){
       return null;
    }
    else{
       return results[1] || 0;
    }
}

jQuery(window).load(function()
{
	// $('[data-toggle="tooltip"]').tooltip();
});

function alignModal()
{
    var modalDialog = $(this).find(".modal-dialog");
    /* Applying the top margin on modal dialog to align it vertically center */
    modalDialog.css("margin-top", Math.max(0, ($(window).height() - modalDialog.height()) / 2));
}

 /*
+---------------------------------------------+
	Function is displaying form error beside the
	input area.
	@params : errorArray : 2 dimensional array with name of input.
+---------------------------------------------+
*/
function displayErrors(errorArray)
{
	//hide all previous notifications
	
	jQuery('.input-notification').hide();
	
	//setting error into form
	for(x in errorArray)
	{
		jQuery('.input-notification[for="'+x+'"]').html(errorArray[x]).show();
	}
}

function popupOpen( link ) 
{
    var NWin = window.open( link, '', 'height=500,width=1000');
    if (window.focus)
        NWin.focus();
    
    return false;
}

function compressText( text )
{
    element.textContent = text;
    document.body.appendChild(element);
    selectElementText(element);
    document.execCommand('copy');
    element.remove();
}

 function selectElementText(element) 
{
    if (document.selection) 
    {
        var range = document.body.createTextRange();
        range.moveToElementText(element);
        range.select();
    } 
    else if (window.getSelection) 
    {
        var range = document.createRange();
        range.selectNode(element);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
    }
    
    // alert( range+'Copied! ' );
}
 
 /*
 +---------------------------------------------+
 	display image preview
 +---------------------------------------------+
 */

function readURL(input,position) 
{
 	var inputId = input.id;
 	var prevImgId = $('#'+inputId).parent().find('img').attr('id'); //find parent img id
 	strInput = inputId.substring(0,inputId.indexOf("_") + 1);
 	strPrevImg = prevImgId.substring(0,prevImgId.indexOf("_") + 1);
 	var imgName = $('#'+strInput+position).val();
 	var ext = imgName.split('.').pop().toLowerCase();

 	if($.inArray(ext, ['gif','png','jpg','jpeg'])) 
 	{
 		if (input.files && input.files[0]) 
 		{
 			var reader = new FileReader();
 			reader.onload = function (e) 
 			{
				 console.log( e.target.result );
 				$('#'+strPrevImg+position).attr('src', e.target.result);
 				$('#'+inputId).next().val(imgName);
 			}
 			reader.readAsDataURL(input.files[0]);
 		 }
 	}
 	// else if($.inArray(ext, ['mp4','h.264','mpeg-4','mpeg-2','divx','hevc','avi','mov','flv','wmv']))
 	// {
	// 	 console.log( $("#hiddenArtImgLogo_1").val() );
	// 	 $("#vdo_name").text( imgName );
	// }
	else
	{
		$('#'+strPrevImg+position).attr('src', '' );
	}

	// if( $("#hiddenArtImgLogo_01").length > 0 )
	// {
	// 	var vName = $("#hiddenArtImgLogo_01").val();
	// 	vName = vName.split('/').pop().toLowerCase();
	// 	$("#vdo_name").text( vName );
	// 	console.log( vName );
	// }
	
}

/*
+---------------------------------------------+
	clear on set no image display
+---------------------------------------------+
*/
function clear_image(para1)
{
	$("#"+para1).attr('src', base_url+"images/no-image.png?v=0.1");
	clearHiddenImage(para1);
}

/*
+---------------------------------------------+
	hidden clear image path
+---------------------------------------------+
*/
function clearHiddenImage(para1)
{
	var hideInput = $("#"+para1).nextAll('input:[type=hidden]')[0];//next('input:hidden').val(''); //empty hidden value
	$(hideInput).val('');
}

function checkIsMobileDevice()
{
	//device detection
	if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent) 
	 || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0,4)))
		$( ".scanQRModalBtn" ).click();
	else
		alert( "This functionality applicable only mobile devices" );
}

function openQRCamera(node) 
{
	$(".qrcode-text-btn").css( "opacity", "0.3" ).css( "cursor", "crosshair" );
	var reader = new FileReader();
	reader.onload = function() 
	{
		node.value = "";
	    qrcode.callback = function(res) {
	    	if(res instanceof Error)
    		{
	    		alert("No QR code found. Please make sure the QR code is within the camera's frame and try again.");
	    		$(".qrcode-text-btn").css( "opacity", "1" ).css( "cursor", "pointer" );
    		}
    		else
    	  	{
    			//node.parentNode.previousElementSibling.value = res;
    			var loc = ( base_url+'landing?U='+btoa( res ) );
    			setTimeout(function(){ window.location = loc; }, 1000);
    	  	}
	    };
	    qrcode.decode(reader.result);
	};
	reader.readAsDataURL(node.files[0]);
}

function showQRIntro() 
{
	  return confirm("Use your camera to take a picture of a QR code.");
}

function changeLanguage( lan )
{
	var loc = (base_url+'home/changeLanguage');		
	
	$.post(loc, { lan:lan }, function (json) {
		var resp = ($.parseJSON(json));	
		console.log( resp );
		if( resp['success'] )
			location.reload(true);
	});
}

function popupOpen( link ) {
    var NWin = window.open( link, '', 'height=500,width=1000');
    if (window.focus)
        NWin.focus();
    
    return false;
}
