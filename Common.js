import { baseUrl } from "./Config.js";
import crypto from "crypto"
import moment from "moment";
const algorithm = 'aes-256-ctr';
const secretKey = 'vOVH6sdmpNWjRRIqCc7rdxs01lwHzfr3';
const iv = crypto.randomBytes(16);

export const validatorError = (res, errors) => {
    let ar = {};
    for (let er of Object.keys(errors)) {
      ar[er] = errors[er].message;
    }
    // return res.status(422).json({
    //   status: false,
    //   error: ar,
    // });
    return ar

  };
  // export const assets = (url) => {
  //   if (url) {
  //     let newUrl = url.replace(/\\/g, "/");
  //     return `${newUrl}`;//${process.env['BASE_URL']}
  //     console.log("newUrl" , newUrl)
  //   }
  //   return '';
  // }
  export const assets = (url) => {
    if (url) {
      let newUrl = url.replace(/\\/g, "/");
      return `${baseUrl}assets/${newUrl}`;
    }
    return '';
  }
  export const modelValidationError = (res, errors) => {
    let ar = {};
    for (let er of Object.keys(errors.errors)) {
      ar[er] = errors.errors[er].properties.message;
    }
    return ar
  };

  // image
  export const setImageUrl = (image) => {
    return assets(image);
  }
  export const setdate = (date) => {
    return moment(date).format('DD-MM-YYYY');
  }
  function encrypt(text) {
    const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    return {
      iv: iv.toString('hex'),
      content: encrypted.toString('hex')
    };
  }
  
  export const decrypt = (hash) => {
    console.log("57" , hash)
    const decipher = crypto.createDecipheriv(algorithm, secretKey, Buffer.from(hash.iv, 'hex'));
    const decrpyted = Buffer.concat([decipher.update(Buffer.from(hash.content, 'hex')), decipher.final()]);
    return decrpyted.toString();
  };
  export const createRandomLink = (userId) => {
    const linkArray = {
      user_id: userId,
      time: new Date()
    }
    let encData = encrypt(JSON.stringify(linkArray));
    return `${encData.content}/${encData.iv}`;
  }

  export const Toast = (text , background) => {
    Toastify({
      text: text,
      duration: 3000,
      newWindow: true,
      close: true,
      gravity: "top", // `top` or `bottom`
      position: "right", // `left`, `center` or `right`
      stopOnFocus: true, // Prevents dismissing of toast on hover
      style: {
      background: background,
    },
    }).showToast();
    }
    