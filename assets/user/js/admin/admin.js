	/* Admin Javascript */
var noti_id = window.setTimeout(hideNotification, 5000);

//creating class object which is usefull to every admin forms
var admin  = { bind_datepicker: function(){ $('.datepicker').datepicker({dateFormat :'yy-mm-dd'}); } };

var prev_sort_order = 0;		//specifies sort_order when user had first clicked td of sort_order
var is_sort_order_clicked = false; // specifies if sort order td clicked	
var sort_order_id = false; // specifies if sort order field pid
var is_sort_order_fun_called = false; //specofies if fun called

$(document).ready( function() 
{
	if( getCookie( "isMenu" ) == 1 )
	{
		$(".header-left").addClass( "header-ml" );
		$("#showLeftPush").click();
	}
	
	
	var animating = false, submitPhase1 = 1100, submitPhase2 = 400, logoutPhase1 = 800, $login = $(".login"), $app = $(".app");

	function ripple(elem, e) 
	{
		$(".ripple").remove();
		var elTop = elem.offset().top, elLeft = elem.offset().left, x = e.pageX - elLeft, y = e.pageY - elTop;
		var $ripple = $("<div class='ripple'></div>");
		$ripple.css({ top : y, left : x });
		elem.append($ripple);
	};

	$(document).on("click", ".login__submit", function(e) 
	{
		if (animating)
			return;
		animating = true;
		var that = this;
		ripple($(that), e);
		$(that).addClass("processing");
		setTimeout(function() 
		{
			$(that).addClass("success");
			
			setTimeout(function() 
			{
				$app.show();
				$app.css("top");
				$app.addClass("active");
			}, submitPhase2 - 70);
			
			setTimeout(function() {
				$login.hide();
				$login.addClass("inactive");
				animating = false;
				$(that).removeClass("success processing");
			}, submitPhase2);
		}, submitPhase1);
	});

	$(document).on("click", ".app__logout", function(e) 
	{
		if (animating)
			return;
		$(".ripple").remove();
		animating = true;
		var that = this;
		$(that).addClass("clicked");
		
		setTimeout(function() 
		{
			$app.removeClass("active");
			$login.show();
			$login.css("top");
			$login.removeClass("inactive");
		}, logoutPhase1 - 120);
		
		setTimeout(function() 
		{
			$app.hide();
			animating = false;
			$(that).removeClass("clicked");
		}, logoutPhase1);
	});

	/**
	 * auto search client name with specific search on search textbox
	 * Autocomplete form from database using name on listing/searching page
	 * @returns
	 */
	$("#client_name").keyup(function () 
	{
		$('#client_name').css('background-image', 'url(' +  base_url + 'images/preloader-white.gif)').css( 'background-repeat','no-repeat' ).css( 'background-position', 'right' );
	    $.ajax({
	        type: "POST",
	        url: base_url+'home/getAutoClientName',
	        data: { keyword : $("#client_name").val(), is_used_to : $("#used_to").val() },
	        dataType: "json",
	        success: function (data) 
	        {
	            if (data.length > 0) 
	            {
	                $('#DropdownClientName').empty();
	                $('#client_name').attr("data-toggle", "dropdown");
	                $('#DropdownClientName').dropdown('toggle');
	            }
	            else if (data.length == 0) 
	                $('#client_name').attr("data-toggle", "");

	            $.each(data, function (key,value) 
        		{
	                if (data.length >= 0)
	                    $('#DropdownClientName').append('<li role="displayClient" ><a role="menuitem dropdownClientli" class="dropdownlivalue" onClick="updateClientInfo(' + value['customer_id'] + ')">' + value['c_name'] + '</a></li>');
	            });
	            $('#client_name').css('background-image', 'none');
	        }
	    });
	});
	$('ul.txt_client_name').on('click', 'li a', function () {
	    $('#client_name').val($(this).text());
	});
	
	/**
	 * auto search client name with specific search on search textbox
	 * Autocomplete form from database using name on listing/searching page
	 * @returns
	 */
	$("#client_supply").keyup(function () 
	{
		$('#client_supply').css('background-image', 'url(' +  base_url + 'images/preloader-white.gif)').css( 'background-repeat','no-repeat' ).css( 'background-position', 'right' );
	    $.ajax({
	        type: "POST",
	        url: base_url+'home/getAutoClientSupply',
	        data: { keyword: $("#client_supply").val() },
	        dataType: "json",
	        success: function (data) 
	        {
	            if (data.length > 0) 
	            {
	                $('#DropdownClienSupply').empty();
	                $('#client_supply').attr("data-toggle", "dropdown");
	                $('#DropdownClientSupply').dropdown('toggle');
	            }
	            else if (data.length == 0) 
	                $('#client_supply').attr("data-toggle", "");

	            $.each(data, function (key,value) 
        		{
	                if (data.length >= 0)
	                    $('#DropdownClientSupply').append('<li role="displayClient" ><a role="menuitem dropdownClientli" class="dropdownlivalue">' + value['state_name'] + '</a></li>');
	            });
	            $('#client_supply').css('background-image', 'none');
	        }
	    });
	});
	$('ul.txt_client_supply').on('click', 'li a', function () {
	    $('#client_supply').val($(this).text());
	});
	
	/**
	 * auto search client name with specific search on search textbox
	 * Autocomplete form from database using name on listing/searching page
	 * @returns
	 */
	$("#invoice_id").keyup(function () 
	{
		$('#invoice_id').css('background-image', 'url(' +  base_url + 'images/preloader-white.gif)').css( 'background-repeat','no-repeat' ).css( 'background-position', 'right' );
	    $.ajax({
	        type: "POST",
	        url: base_url+'home/getAutoInvoiceId',
	        data: { keyword: $("#invoice_id").val() },
	        dataType: "json",
	        success: function (data) 
	        {
	            if (data.length > 0) 
	            {
	                $('#DropdownInvoiceId').empty();
	                $('#invoice_id').attr("data-toggle", "dropdown");
	                $('#DropdownInvoiceId').dropdown('toggle');
	            }
	            else if (data.length == 0) 
	                $('#client_supply').attr("data-toggle", "");

	            $.each(data, function (key,value) 
        		{
	                if (data.length >= 0)
	                    $('#DropdownInvoiceId').append('<li role="displayInvoice" ><a role="menuitem dropdownInvoiceli" class="dropdownlivalue">' + value['invoice_id'] + '</a></li>');
	            });
	            $('#invoice_id').css('background-image', 'none');
	        }
	    });
	});
	$('ul.txt_invoice_id').on('click', 'li a', function () {
	    $('#invoice_id').val($(this).text());
	});
	
	/**
	 * auto search city name with specific search on search textbox
	 * Autocomplete form from database using city on listing/searching page
	 * @returns
	 */
	$("#city_name").keyup(function () 
	{
		$('#city_name').css('background-image', 'url(' +  base_url + 'images/preloader-white.gif)').css( 'background-repeat','no-repeat' ).css( 'background-position', 'right' );
	    $.ajax({
	        type: "POST",
	        url: base_url+'home/getAutoClientCity',
	        data: { keyword: $("#city_name").val() },
	        dataType: "json",
	        success: function (data) 
	        {
	            if (data.length > 0) 
	            {
	                $('#DropdownClientCityName').empty();
	                $('#city_name').attr("data-toggle", "dropdown");
	                $('#DropdownClientCityName').dropdown('toggle');
	            }
	            else if (data.length == 0)
	                $('#city_name').attr("data-toggle", "");

	            $.each(data, function (key,value) 
        		{
	                if (data.length >= 0)
	                    $('#DropdownClientCityName').append('<li role="displayCity" ><a role="menuitem dropdownCityli" class="dropdownlivalue">' + value['city_name'] + '</a></li>');
	            });
		        $('#city_name').css('background-image', 'none');
	        }
	    });
	});
	$('ul.txt_client_city_name').on('click', 'li a', function () {
	    $('#city_name').val($(this).text());
	});
	
	/**
	 * auto search product name with specific search on search textbox
	 * Autocomplete form from database using product on listing/searching page
	 * @returns
	 */
	$("#p_name").keyup(function () 
	{
		$('#p_name').css('background-image', 'url(' +  base_url + 'images/preloader-white.gif)').css( 'background-repeat','no-repeat' ).css( 'background-position', 'right' );
	    $.ajax({
	        type: "POST",
	        url: base_url+'home/getAutoProduct',
	        data: { keyword: $("#p_name").val() },
	        dataType: "json",
	        success: function (data) 
	        {
	        	console.log(data);
	            if (data.length > 0) 
	            {
	                $('#DropdownPName').empty();
	                $('#p_name').attr("data-toggle", "dropdown");
	                $('#DropdownPName').dropdown('toggle');
	            }
	            else if (data.length == 0)
	                $('#p_name').attr("data-toggle", "");

	            $.each(data, function (key,value) 
        		{
	                if (data.length >= 0)
	                    $('#DropdownPName').append('<li role="displayCity" ><a role="menuitem dropdownCityli" class="dropdownlivalue" onClick = "updateProductInfo(' + value['product_id'] + ')">' + value['p_name'] + '</a></li>');
	            });
		        $('#p_name').css('background-image', 'none');
	        }
	    });
	});
	$('ul.txt_p_name').on('click', 'li a', function () {
	    $('#p_name').val($(this).text());
	});
	
	/**
	 * auto search client name with specific search on search textbox
	 * Autocomplete form from database using name on listing/searching page
	 * @returns
	 */
	$("#isbi_port_code").keyup(function () 
	{
		$('#isbi_port_code').css('background-image', 'url(' +  base_url + 'images/preloader-white.gif)').css( 'background-repeat','no-repeat' ).css( 'background-position', 'right' );
	    $.ajax({
	        type: "POST",
	        url: base_url+'home/getAutoPortCode',
	        data: { keyword: $("#isbi_port_code").val() },
	        dataType: "json",
	        success: function (data) 
	        {
	            if (data.length > 0) 
	            {
	                $('#DropdownPortCode').empty();
	                $('#isbi_port_code').attr("data-toggle", "dropdown");
	                $('#DropdownPortCode').dropdown('toggle');
	            }
	            else if (data.length == 0) 
	                $('#isbi_port_code').attr("data-toggle", "");

	            $.each(data, function (key,value) 
        		{
	                if (data.length >= 0)
	                    $('#DropdownPortCode').append('<li role="displayClient" ><a role="menuitem dropdownClientli" class="dropdownlivalue">[' + value['pc_number'] + '] '+ value['pc_state_name'] +'</a></li>');
	            });
	            $('#isbi_port_code').css('background-image', 'none');
	        }
	    });
	});
	$('ul.txt_isbi_port_code').on('click', 'li a', function () {
	    $('#isbi_port_code').val($(this).text());
	});
	
	/*
	 * 
	 */
	$("#discount_all").click( function()
	{
		checkDiscountAvailable();
	});

	/*
	 * 
	 */
	$("#ship_pack_cost").click( function()
	{
		checkShipPackCostAvailable( true );
	});
	
	/*
	 * 
	 */
	$("#show_hide_cess").click( function()
	{
		checkCESSAvailable();
	});
	
	/*
	 * 
	 */
	$("#add_payment").click( function()
	{
		checkAddPaymentAvailable();
	});

	/*
	 * 
	 */
	$("#paid_online").click( function()
	{
		checkPaidOnlineAvailable();
	});
	
	$("#ship_pack_cost_value").keyup(function () { onchangeProductFormCalculationData(); });
	$("#discount_all_value").keyup(function () { onchangeProductFormCalculationData(); });
	
	$("#delete_btn").click( function(){
		
		var id = $("#delete").val();
		
		form_data = { id : id };
		var loc = (base_url+'admin/'+controller)+'/deleteData';
		console.log( form_data );
		$.post(loc, form_data, function (data) 
		{
			var arr = $.parseJSON(data);
			
			if(arr['type'] == "success")
				$("#"+id).remove();

			$('#content').before(getNotificationHtml(arr['type'],arr['msg']));
			$(".close").click();
		});
	});
	
	$("#sendMail_btn").click( function(){
		
		var id = $("#mailID").val();
		form_data = { id : id };
		
		var loc = (base_url+'admin/'+controller)+'/sendEMail';
		console.log( form_data );
		$.post(loc, form_data, function (data) 
		{
			var arr = $.parseJSON(data);
			
//			if(arr['type'] == "success")
//				$("#"+id).remove();

			var selector = $('a[data-="' + id + '"]');
			selector.parent().find('img').attr("src", asset_url+"images/enabled.gif" ); //change image src attr
			
			$('.ajax-content').before(getNotificationHtml(arr['type'],arr['msg']));
			$(".close").click();
		});
	});
	
	$("#showLeftPush").click( function(){
		if( $("#showLeftPush" ).hasClass("active"))
		{
			setCookie( 'isMenu', 1 );
			$(".header-left").addClass( "header-ml" );
		}
		else
		{
			setCookie( 'isMenu', 0 );
			$(".header-left").removeClass( "header-ml" );
		}
	});
	
	$("#member_btn").on("click" ,function()
	{	
		var id = $("#ju_id").val();
		var status = $("#status option:selected").val();
		
		var loc = (base_url+'admin/users/changemembership');		
		$.post(loc, { id:id, status:status }, function (data) 
		{
			if( status == 1 )
			{	
				$("#st_"+id).text( "Free" );
			}
			else if( status == 3 )
			{ 	
				$("#st_"+id).text( "Business Member" );
			}
			else
			{
				$("#st_"+id).text( "Premium Member" );
			}
			$(".close").click();
		});
	});
	
	$(".modal").on("shown.bs.modal", alignModal);
});

function alignModal()
{
    var modalDialog = $(this).find(".modal-dialog");
    /* Applying the top margin on modal dialog to align it vertically center */
    modalDialog.css("margin-top", Math.max(0, ($(window).height() - modalDialog.height()) / 2));
}

$(window).load(function() 
{
	checkDiscountAvailable();
	checkPaidOnlineAvailable();
	checkAddPaymentAvailable();
	checkCESSAvailable();
	checkShipPackCostAvailable( false );
	checkAddTransportLBLAvailable()
	onchangeProductFormCalculationData();
	
	$('.ajaxStatusEnabledDisabled').on('click', function()
	{
		showLoader();
		var status = $(this).attr('rel');
		var cat_id = $(this).attr('data-');

		form_data = {status : status, cat_id : cat_id};
		var loc = (base_url+'admin/'+lcFirst(controller))+'/updateStatus';

		$.post(loc, form_data, function (data) {
			if(typeof(data) != 'undefined' && typeof(data) != null && data != '')
			{
				var arr = $.parseJSON(data);
				console.log( arr );
				if(arr['type'] == "error")
				{
					$('#content').before(getNotificationHtml(arr['type'],arr['msg']));
					return false;
				}
			}
			var selector = $('a[data-="' + cat_id + '"]');
			selector.attr('title',(status == 1) ? "Disabled" : "Enabled"); //change title attr
			selector.attr('rel', (status == 1) ? "0" : "1"); //change image status attr rel
			selector.parent().find('img').attr("src", (status == 0 ? asset_url+"images/disabled.gif" : asset_url+"images/enabled.gif")); //change image src attr
			
			hideLoader();
		});
	});
});

function checkDiscountAvailable()
{
	if( $( '#discount_all' ).length > 0 )
	{
		if ( $( '#discount_all' ).is(':checked') )
		    $(".discount_all").removeClass('hide');
		else
		    $(".discount_all").addClass('hide');
		    $("#discount_all_value").val(0);
		    onchangeProductFormCalculationData();
	}
}

function checkPaidOnlineAvailable()
{
	if( $( '#paid_online' ).length > 0 )
	{
		if ( $( '#paid_online' ).is(':checked') )
		    $(".paid_online").removeClass('hide');
		else
		    $(".paid_online").addClass('hide');
	}
}

function checkAddPaymentAvailable()
{
	if( $( '#add_payment' ).length > 0 )
	{
		if ( $( '#add_payment' ).is(':checked') )
		{
		    $(".add_payment").removeClass('hide');
		    $("#paid_online").attr( 'disabled', true );
		}
		else
		{
		    $(".add_payment").addClass('hide');
		    $("#paid_online").attr( 'disabled', false );
		}
	}
}

function checkCESSAvailable()
{
	if( $( '#show_hide_cess' ).length >0 )
	{
		if ( $( '#show_hide_cess' ).is(':checked') )
		{
		    $(".show_hide_cess").removeClass('hide');
		    $("#select_product").removeClass('col-md-3').addClass('col-md-2');
		    $("#select_product_desc").removeClass('col-md-3').addClass('col-md-2');
		    isShowHide = true;
		}
		else
		{
		    $(".show_hide_cess").addClass('hide');
		    $("#select_product").removeClass('col-md-2').addClass('col-md-3');
		    $("#select_product_desc").removeClass('col-md-2').addClass('col-md-3');
		    isShowHide = false;
		}
	}	
}

function checkShipPackCostAvailable( isAutoCall )
{
	if( $( '#ship_pack_cost' ).length > 0 )
	{
		if ( $( '#ship_pack_cost' ).is(':checked') )
		    $(".ship_pack_cost").removeClass('hide');
		else
		{
		    $(".ship_pack_cost").addClass('hide');
		    $("#ship_pack_cost_value").val(0);
		    
		    if( isAutoCall )
		    	onchangeProductFormCalculationData();
		}
	}
}

function checkAddTransportLBLAvailable()
{
	if( $( '#add_transport_lbl' ).length >0 )
	{
		if ( $( '#add_transport_lbl' ).is(':checked') )
			$("#show_hide_transport_lbl").removeClass( "hide" );
		else
			$("#show_hide_transport_lbl").addClass( "hide" );
	}
}
/*
 * 
 */
function updateClientInfo( id )
{
	$.ajax({
        type: "POST",
        url: base_url+'admin/client/getClientAddress',
        data: { id: id },
        dataType: "json",
        success: function (data) 
        {
        	console.log( data );
        	if( data['csa_address'] == undefined || data['csa_address'] == null )
    		{
        		address = data['c_billing_address']+", "+data['city_name']+", "+data['state_name']+", "+data['country_name'];
        		$("#client_supply").val(data['state_name']);
    		}
        	else
    		{
        		address = data['csa_address']+", "+data['csa_city']+", "+data['csa_state']+", "+data['csa_country'];
        		$("#client_supply").val( data['csa_state'] );
    		}
            $("#ship_to").text( address );
//            $("#id").val( id );
            $("#c_phone").val( data['c_phone'] );
            $("#c_email").val( data['c_email'] );
            $("#c_tin").val( data['c_tin'] );
            $("#c_gstin").val( data['c_gstin'] );
            $("#c_pan").val( data['c_pan'] );
        }
    });
}

/*
 * 
 */
function updateProductInfo( product_id )
{
	$.ajax({
        type: "POST",
        url: base_url+'admin/product/getProductData',
        data: { id: product_id },
        dataType: "json",
        success: function (data) 
        {
        	if( $("#product_description").length > 0 )
    		{
	            $("#product_description").val( data[0]['p_description']);
	            $("#p_shn").val( data[0]['p_shn'] );
	            $("#product_qty").val( 1 );
	            $("#product_unit_price").val( data[0]['p_unit_price'] );
	            $("#product_purchase_rate").val( data[0]['p_purchase_rate'] );
	            $("#product_cess_tk").val( data[0]['p_cess_tk'] );
	            $("#product_cess_pls").val( data[0]['p_cess_pls'] );
	            $('#uom_id option[value="'+data[0]['uom_id']+'"]').attr("selected", "selected");
	            $('#tax_id option[value="'+data[0]['tax_id']+'"]').attr("selected", "selected");
	            checkCESSAvailable();
    		}
        }
    });
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
				$('#'+strPrevImg+position).attr('src', e.target.result);
				$('#'+inputId).next().val(imgName);
			}
			reader.readAsDataURL(input.files[0]);
		 }
	}
	else
	{
		$('#'+strPrevImg+position).attr('src','');
	}
}

/*
+---------------------------------------------+
	clear on set no image display
+---------------------------------------------+
*/
function clear_image(para1)
{
	$("#"+para1).attr('src', base_url+"images/no-image.jpg");
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

/*+---------------------------------------------+
get state form country id
+---------------------------------------------+
*/
function getStateFromCountry(id)
{
			var i=0;
			$('select[name="state_id"] option:first').text('Please Wait...') // displaying loading texts;
			var loc = (base_url+'admin/'+lcFirst(controller))+'/getState';
			form_data = {country_id : id};
			$.post(loc, form_data, function (data) {
				$('.state-'+(i+1)).html(data);
				i++;
			});
}

/*+---------------------------------------------+
New 
@author Sixty13 
get state form country id
@param id country id
@param name state select box name
+---------------------------------------------+
*/
function getState( id, name )
{
	$('select[name="'+name+'"] option:first').text('Please Wait...') // displaying loading texts;
	var loc = (base_url+'admin/'+lcFirst(controller))+'/getState';
	form_data = {country_id : id, name : name};
	$.post(loc, form_data, function (data) {
		$('select[name="'+name+'"]').html(data);
	});
}

/*+---------------------------------------------+
New 
@author Sixty13 
get city form state id
@param id state id
@param name city select box name
+---------------------------------------------+
*/
function getCity( id, name )
{
	$('select[name="'+name+'"] option:first').text('Please Wait...') // displaying loading texts;
	var loc = (base_url+'admin/'+lcFirst(controller))+'/getCity';
	form_data = {state_id : id, name : name};
	$.post(loc, form_data, function (data) {
		$('select[name="'+name+'"]').html(data);
	});
}

function loadCity(state_id,class_name,con_url)
{
	$("."+class_name).html('Loading...');
	form_data={state_id : state_id};
	var loc = (base_url+con_url);
	$.post(loc, form_data, function (data)
	{
		$("."+class_name).html(data);
	});
}

/*
+---------------------------------------------+
	first charachet lower
+---------------------------------------------+
*/ 
function lcFirst(str)
{
	str+= '';
	var f = str.charAt(0).toLowerCase();
	return f+ str.substr(1);
}

/*
+---------------------------------------------+
	Per page dropdown
+---------------------------------------------+
*/
function perPageManage(obj)
{
	showLoader();
	var field = $('#hidden_field').attr('value'); //name of table field
	var srt = $('#hidden_srt').attr('value'); //name of sorting table field

	form_data = $('#ajax-form').serialize(); 
	form_data += "&f=" + encodeURIComponent(field);
	form_data += "&s=" + encodeURIComponent(srt);
	
	var loc = (base_url+'admin/'+lcFirst(controller));
	$.get(loc, form_data, function (data) {
		$('.ajax-content').html(data);
		hideLoader();
	});
}

/*
+---------------------------------------------+
	show preloader at listing table.
+---------------------------------------------+
*/
function showLoader()
{
	$('.pre_loader').show();
}

/*
+---------------------------------------------+
	show preloader at listing table.
+---------------------------------------------+
*/
function hideLoader()
{
	$('.pre_loader').hide();
}

/*
+---------------------------------------------+
	AutoHide notification div. function call
	from timeout every 7 seconds.
+---------------------------------------------+
*/
function hideNotification()
{
	$('.notification').slideUp();
}

/*
+----------------------------------------------+
	This function will return notification html
	@params : type -> type of notification.
			  message - > message you want dispaly 
			  				as error.
+----------------------------------------------+
*/
function getNotificationHtml(type,message)
{
	var ht = '<div class="notification '+type+' png_bg">';
		ht+= '<a href="#" class="close">';
		ht+= '<img src="'+base_url+'images/admin/cross_grey_small.png" title="Close this notification" alt="close">';
		ht+= '</a>';
		ht+= '<div>'+message+'</div>';
		ht+= '</div>';
		clearInterval(noti_id);
		noti_id = window.setTimeout(hideNotification, 5000);
			
	return ht;
}

/*
+------------------------------------------------------------+
	gives permission denied message 
+------------------------------------------------------------+
*/
function permissionDenied(per)
{
	$(".permissionModal").click();
}

/**
 * Delete Record
 */
function deleteData( id, name )
{
	$(".deleteModal").click();
	$("#deleteMessage").text( name );
	$("#delete").val( id );
}


function UpdateMemberShip(id,mid)
{
	
	$(".memberModal").click();
	$("#ju_id").val( id );
	$("#updateMessage").text( mid );
	
}

/**
 * Delete Record
 */
function sendEMail( id )//, name
{
	$(".sendE-MailModal").click();
//	$("#sendEMail").text( name );
	$("#mailID").val( id );
}

/**
 * updates/import files using session  
 */
function importDataProcess( path, start )
{
	var loc = (base_url+'admin/'+controller)+'/importDataProcess';
	$.get(loc, { path : path, start : start }, function (data)
	{
		jQuery('#import_process_loader').before( data );
	});
}

/**
 * 
 */
function addAnotherTaxRate()
{
	$(".apply").remove();
	var numItems = $('.add-another').length + 2;
	var html = '<div class="col-md-12 add-another">';
	html+= '<div class="col-md-6">';
	html+= '<div class="form-group">';
	html+= '<label>Tax '+numItems+'</label>';
	html+= '</div>';
	html+= '</div>';
	html+= '<div class="col-md-6">';
	html+= '<div class="form-group">';
	html+= result;
	html+= '</div> </div> </div>';

	$(".add-new").append( html );
}

/**
 * insert new tax rate text box for tax group popup page
 * @param select
 * @returns
 */
function addTaxRate( select )
{
	 var text = $(select).find("option:selected").text()+' + ';
	 $("#total_rate_apply").append( text );
	 var total_rate = $("#total_rate").text();
	 var val = $(select).find("option:selected").val().split("|");
	 var result = parseInt( total_rate ) + parseInt( val[0] );
	 $("#total_rate").text( result );
	 $("#t_group_percentage").val( result );
	 $("#t_group_name").val( $("#total_rate_apply").text() );
	 $("#t_parent_id_lbl").append( val[1]+'|' );
	 $("#t_parent_id").val( $("#t_parent_id_lbl").text() );
}

/**
 * set key press to result in other input value
 * @returns
 */
$("#t_name_auto").keyup(function()
{
	$("#apply_total").removeClass("hide");
	$("#total_rate_apply").text( $("#t_name_auto").val()+': ' );
	$("#save_group").attr("disabled", false);
});

/**
 * set default tax rate on click radio button
 * @returns
 */
$('input[name=opt]').change(function(){
	var value = $( 'input[name=opt]:checked' ).val();
	
	form_data = { id : value };
	var loc = (base_url+'admin/'+controller)+'/isDefaultTaxRate';

	$.post(loc, form_data, function ( data ) 
	{
		var arr = $.parseJSON(data);
		$('#content').before(getNotificationHtml(arr['type'],arr['msg']));
	});
});

function updateTaxVal( tax_val )
{
	$("#tr_sipp_pack_tax").addClass("hide");
	if( tax_val != "0" || tax_val != 0 )
		$("#tr_sipp_pack_tax").removeClass("hide");
	
	$( "#td_ship_pack_cost_tax" ).text( tax_val );
	$( "#td_input_ship_pack_cost" ).val( tax_val );
	$( "#td_ship_pack_tax_name" ).text( $("#ship_pack_tax_id :selected").text() );
	$( "#td_input_ship_pack_tax_name" ).val( $("#ship_pack_tax_id :selected").val() );
	
	onchangeProductFormCalculationData();
}

function onchangeProductFormCalculationData()
{
	$("#td_ship_pack_cost_value").text( $("#ship_pack_cost_value").val() );
	$("#td_input_ship_pack_cost_value").val( $("#ship_pack_cost_value").val() );

	var subtotal = 0,
	discount = $("#discount_all_value").val(),
	ship_pack = $("#td_ship_pack_cost_value").text(),
	tax = $("#td_ship_pack_cost_tax").text();

	//pass same discount persantage in all discount text fields
	$(".product_disc").val( discount );
	$(".product_disc_display").text( discount+'%' )
	
	total_unit_discount = 0;
	total_discount_all_value = 0;
	cess = 0;
	
	$('#product_data > tr').each(function( key, data ) 
	{
		if( key >0 )
		{
			cess_tk = 0;
			cess_pls = 0;
			price_qty = 0;
			var value = 0, unit_discount = 0, unit_price = 0, unit_qty = 0, priceMulti = 1;
			
			//product unit price 
			$(this).closest('tr').find("#product_qty"+key).each(function() {
				unit_qty = this.value;
			});
			console.log( "unit_qty"+unit_qty );
			
			//product discount
			$(this).closest('tr').find("#product_disc"+key).each(function() {
				unit_discount = this.value;
			});
			console.log( "unit_discount: "+unit_discount );
			
			//unit price sum
			$(this).closest('tr').find("#product_unit_price"+key).each(function() {
				product_unit_price = this.value;
				priceMulti = ( parseFloat( unit_qty ) * parseFloat( product_unit_price ) ); 
				subtotal = parseFloat( subtotal ) + ( parseFloat( priceMulti ) );
			});
			console.log( "subtotal: "+subtotal );
			
			discountCount = ( parseFloat( priceMulti ) * parseFloat( unit_discount ) );
			discount_all_value = ( parseFloat( discountCount ) / 100 );
			value = parseFloat( priceMulti ) - parseFloat( discount_all_value );
			$("#value"+key).val( value.toFixed(2) );
			$("#value_display"+key).text( value.toFixed(2) );
			console.log( "value: "+value );
			
			//amount
			var amount = parseFloat( price_qty ) - parseFloat( unit_discount );
			
			//product cess percentage
			$(this).closest('tr').find("#product_cess_tk"+key).each(function() {
				cess_tk = ( parseFloat( price_qty ) * this.value ) / 100;//parseFloat( price_qty ) -
			});
			console.log( "data: "+data );
			
			//product cess increement
			$(this).closest('tr').find("#product_cess_pls"+key).each(function() {
				cess_pls = this.value;
			});
			console.log( "cess_pls: "+cess_pls );
			
			cess = parseFloat( cess_tk ) + parseFloat( cess_pls );
			total_discount_all_value = parseFloat( total_discount_all_value ) + parseFloat( discount_all_value );
			console.log( "total_discount_all_value: "+total_discount_all_value );
			
			$("#empty_table").addClass('hide');
		}
	});
	
	if ( $( '#show_hide_cess' ).is(':checked') )
		subtotal = parseFloat( subtotal ) + parseFloat( ship_pack ) + parseFloat( cess );
	else
		subtotal = parseFloat( subtotal ) + parseFloat( ship_pack );

	$("#td_subtotal").text( subtotal );
	$("#td_input_subtotal").val( subtotal );
	
	var dis = $("#td_discount_all_value").text();//parseFloat( discount ) / 100;
	var min = parseFloat( subtotal ) - parseFloat( dis );
	var mul = ( parseFloat( min ) * parseFloat( tax ) ) / 100;
	var ship_pack_cost = ( parseFloat( ship_pack ) * parseFloat( tax ) ) / 100;
	
	$("#td_ship_pack_cost").text( ship_pack_cost.toFixed(2) );

	var total = parseFloat( min ) + parseFloat( ship_pack_cost );
	var round = ( total.toFixed(0) ) - ( total.toFixed(2) );

	$("#td_show_hide_cess_value").text( cess.toFixed(2) );
	$("#td_input_show_hide_cess_value").val( cess.toFixed(2) );
	
	$("#td_round_off").text( round.toFixed(2) );
	$("#td_input_round_off_sigh").val( round.toFixed(2) );
	
	$("#td_total").text( total.toFixed(0) );
	$("#td_input_total").val( total.toFixed(0) );
	
	$("#td_discount_all_value").text( total_discount_all_value.toFixed(2) );
	$("#td_input_discount_all_value").val( total_discount_all_value.toFixed(2) );
	
	//check shipping tax available
	if( $("#td_ship_pack_tax_name").text() == 0 )
		$("#tr_sipp_pack_tax").addClass("hide");
	
	//check discount tax available
	$("#tr_discount").removeClass("hide");
	if( $("#discount_all_value").val() == 0 )
		$("#tr_discount").addClass("hide");
}

/*
+--------------------------------------------------+
	Function will remove all special character from
	string and append - for URL optimization
+--------------------------------------------------+
*/
function getUrlName(str)
{
	var st = str.replace(/[^a-zA-Z0-9]+/g,'-');
	$('#display_alias').val(st.toLowerCase());
}

/**
 * conver quotation form into invoice form
 */
function convertQuotationInvoice( invoiceId )
{
	form_data = { invoiceId : invoiceId };
	var loc = (base_url+'admin/'+lcFirst(controller))+'/convertQuotationInvoice';
	console.log( form_data );
	$.post(loc, form_data, function (data) 
	{
		var arr = $.parseJSON(data);
		if(arr['type'] == "success")
			$("#"+invoiceId).remove();
	});
}

/**
 * conver quotation form into invoice form
 */
function convertPurchaseBill( orderId )
{
	form_data = { OrderId : orderId };
	var loc = (base_url+'admin/'+lcFirst(controller))+'/convertPurchaseBill';
	console.log( form_data );
	$.post(loc, form_data, function (data) 
	{
		var arr = $.parseJSON(data);
		if(arr['type'] == "success")
			$("#"+orderId).remove();
	});
}

/**
 * 
 * @param cname
 * @param cvalue
 * @param exdays
 * @returns
 */
function setCookie(cname, cvalue, exdays) 
{
	var d = new Date();
	d.setTime(d.getTime() + (exdays*24*60*60*1000));
	var expires = "expires="+ d.toUTCString();
	document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

/**
 * 
 * @param cname
 * @returns
 */
function getCookie( cname ) {
	var name = cname + "=";
	var decodedCookie = decodeURIComponent(document.cookie);
	var ca = decodedCookie.split(';');
	for(var i = 0; i <ca.length; i++) 
	{
		var c = ca[i];
		while (c.charAt(0) == ' ')
			c = c.substring(1);
		
		if (c.indexOf(name) == 0)
			return c.substring(name.length, c.length);
  }
  return "";
}