import nodemailer from "nodemailer";

export const SendEmail = async (email, subject, text,) => {
    try {
        // var transporter = nodemailer.createTransport({
        //     host: "sandbox.smtp.mailtrap.io",
        //     port: 2525,
        //     auth: {
        //         user: "6e6cbf25219481",
        //         pass: "b2d9c14a58f35d"
        //     }
        //   });
          var transporter = nodemailer.createTransport({
            host: 'tgt-tko-m815.pointdnshere.com',
            port: 587,
            auth: {
                user: "info@addmy.co",
                pass: "noreply@addmy.com"
            }
        });

        await transporter.sendMail({
            from: process.env.USER,
            to: email,
            subject: subject,
            html: text,
        });
        console.log("Email Sent Sucessfully");

    } catch (error) {
        console.log(error, "Email Not Sent");
    }
}


export default SendEmail;

