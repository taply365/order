import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import log from 'minhluanlu-color-log';
dotenv.config();


const APP_EMAIL = process.env.APP_EMAIL;
const APP_PASSWORD = process.env.APP_PASSWORD


async function SendEmail(data) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: APP_EMAIL,
      pass: APP_PASSWORD,
    },
  });

  const { subject, to, html, attachments } = data;

  const mailOptions = {
    from: APP_EMAIL,
    to,
    subject,
    html,
    attachments, // 👈 important
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    log.debug('✅ Email sent: ' + info.response);
    return true;
  } catch (error) {
    log.err('❌ Error sending email:', error);
    throw error;
  }
}


export {
  SendEmail
}