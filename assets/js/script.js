$(document).ready(function(){
    $("a.sidebar-link").click(function (e) {
      // $(".submenu").slideUp();
      if($(this).next(".submenu")){
          $(this).next(".submenu").slideToggle().toggleClass("active");
        }
      });
});

// $(".dropify").dropify();
// $('.dropify').dropify({
//   tpl: {
//       wrap: '<div class="dropify-wrapper"></div>',
//       loader: '<div class="dropify-loader"></div>',
//       message: '<div class="dropify-message"><span class="icon" ><svg width="24" height="27" viewBox="0 0 24 27" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M15.6484 0.766724H6.77911C4.03378 0.766724 1.66711 3.0429 1.66711 5.85233V20.4954C1.66711 23.4631 3.87778 25.7965 6.77911 25.7965H17.4298C20.1764 25.7965 22.4031 23.3049 22.4031 20.4954V7.96213L15.6484 0.766724Z" stroke="#0ABAB5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.2982 0.750732V4.71802C15.2982 6.65462 16.8302 8.22572 18.7236 8.22981C20.4782 8.2339 22.2742 8.23526 22.3956 8.22708" stroke="#0ABAB5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path fill-rule="evenodd" clip-rule="evenodd" d="M12.0577 9.35134C11.9165 9.2063 11.7227 9.12449 11.5203 9.12451C11.3178 9.12453 11.124 9.20637 10.9828 9.35143L7.19885 13.2396C6.90996 13.5365 6.91641 14.0113 7.21325 14.3002C7.51009 14.5891 7.98492 14.5826 8.27381 14.2858L10.7709 11.7199V18.8394C10.7709 19.2536 11.1067 19.5894 11.5209 19.5894C11.9351 19.5894 12.2709 19.2536 12.2709 18.8394V11.7207L14.7683 14.2859C15.0572 14.5827 15.532 14.589 15.8288 14.3001C16.1256 14.0112 16.132 13.5363 15.8431 13.2395L12.0577 9.35134Z" fill="#0ABAB5"/></svg></span> <p>Drag and Drop to <br/>Upload or <span>Browse</span></p></div>',
//       // preview: '<div class="dropify-preview"><span class="dropify-render"></span><div class="dropify-infos"><div class="dropify-infos-inner"><p class="dropify-infos-message">Drag and drop or click to <span>replace</span></p></div></div></div>',
//       filename: '<p class="dropify-filename"><span class="file-icon"></span> <span class="dropify-filename-inner"></span></p>',
//       clearButton: '<button type="button" class="dropify-clear"> remove</button>',
//       errorsContainer: '<div class="dropify-errors-container"><ul></ul></div>'
//   }
// });