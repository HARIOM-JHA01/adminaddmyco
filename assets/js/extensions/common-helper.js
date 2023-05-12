/**
 *
 * Restricts input for the given textbox to the given inputFilter function.
 *
 */

 function setInputFilter(textbox, inputFilter) {
    [
      "input",
      "keydown",
      "keyup",
      "mousedown",
      "mouseup",
      "select",
      "contextmenu",
      "drop",
    ].forEach(function (event) {
      if (textbox) {
        textbox.addEventListener(event, function () {
          if (inputFilter(this.value)) {
            this.oldValue = this.value;
            this.oldSelectionStart = this.selectionStart;
            this.oldSelectionEnd = this.selectionEnd;
          } else if (this.hasOwnProperty("oldValue")) {
            this.value = this.oldValue;
            this.setSelectionRange(this.oldSelectionStart, this.oldSelectionEnd);
          } else {
            this.value = "";
          }
        });
      }
    });
  }
  
  /**
   *
   * Functions for input validation
   *
   */
  
  //only number
  document.querySelectorAll(".onlyNumber").forEach((ele) => {
    setInputFilter(ele, function (value) {
      return /^[0-9]*$/.test(value);
    });
  });
  
  
  //number min 0
  document.querySelectorAll(".numberMin0").forEach((ele) => {
    setInputFilter(ele, function (value) {
      return /^\d*$/.test(value);
    });
  });
  
  //number with min max value
  
  document.querySelectorAll(".intLimitTextBox").forEach((ele) => {
    setInputFilter(ele, function (value) {
      return /^\d*$/.test(value) && (value === "" || parseInt(value) <= 500);
    });
  });
  
  //number with float value
  
  document.querySelectorAll(".numberWithFloat").forEach((ele) => {
    setInputFilter(ele, function (value) {
      return /^-?\d*[.,]?\d*$/.test(value);
    });
  });
  //number with 2 deicimal
  
  document.querySelectorAll(".numberWith2Decimal").forEach((ele) => {
    setInputFilter(ele, function (value) {
      return /^-?\d*[.,]?\d{0,2}$/.test(value);
    });
  });
  //only A-z char
  
  document.querySelectorAll(".onlyChar").forEach((ele) => {
    setInputFilter(ele, function (value) {
      return /^[a-z]*$/i.test(value);
    });
  });
  //only hexadecimal value
  document.querySelectorAll(".hexadecimal").forEach((ele) => {
    setInputFilter(ele, function (value) {
      return /^[0-9a-f]*$/i.test(value);
    });
  });
  /**
   *
   * Function for check given object is empty.
   *
   */
  const isEmpty = (obj) => {
    return Object.keys(obj).length === 0 && obj.constructor === Object;
  };
  
  /*
   *
   *Function for displat default image where image not loded currently
   *
   */
  
  const imgReplace = (src) => {
    let image = document.querySelector("img");
    image.forEach((ele) => {
      if (ele.complete && ele.naturalHeight !== 0) {
        ele.src = src;
      }
    });
  };
  
  
  
  $(document).on("click", ".onlyNumber", function () {
    ele = this;
    setInputFilter(ele, function (value) {
      return /^[0-9]*$/.test(value);
    });
  
  });
  
  
  function titleCase(str) {
    str = str.toLowerCase().split(' ');
    for (var i = 0; i < str.length; i++) {
      str[i] = str[i].charAt(0).toUpperCase() + str[i].slice(1);
    }
    return str.join(' ');
  }

  function countText(char) {
    let text = document.form_main.text.value;
    
    console.log('text.length', text.length);
  }