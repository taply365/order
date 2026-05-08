import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import log from 'minhluanlu-color-log';
dotenv.config();


const APP_EMAIL = process.env.APP_EMAIL;
const APP_PASSWORD = process.env.APP_PASSWORD;
const SALES_EMAIL = process.env.SALES_EMAIL;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;


async function SendPdfEmail(data) {
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



async function SendReceiptEmail(data) {
  const transporter = nodemailer.createTransport({
    host: 'send.one.com',
    port: 587,
    secure: false,
    auth: {
      user: SALES_EMAIL,
      pass: EMAIL_PASSWORD,
    },
  });

  const { subject, to, html, attachments } = data;

  const mailOptions = {
    from: SALES_EMAIL,
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


async function SendWellcomeEmail(data) {
  try{

  }
  catch(error){
    log.err('❌ Error sending email:', error);
    throw error;
  }
}


export {
  SendPdfEmail,
  SendReceiptEmail,
  SendWellcomeEmail
}