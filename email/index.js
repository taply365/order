import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import log from 'minhluanlu-color-log';
import juice from 'juice';
dotenv.config();

import { GenWellcomeTemplate, GenConfirmReservationTemplate, GenCancelReservationTemplate, GenReceiptTemplate } from './genTemplate.js';


const APP_EMAIL = process.env.APP_EMAIL;
const APP_PASSWORD = process.env.APP_PASSWORD;
const SALES_EMAIL = process.env.SALES_EMAIL;
const TEAM_EMAIL = process.env.TEAM_EMAIL;
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
const ENV =process.env.ENV == "production";


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

async function sendEmail(data) {
  try {
    const transporter = nodemailer.createTransport({
      host: "send.one.com",
      port: 587,
      secure: false,
      auth: {
        user: TEAM_EMAIL,
        pass: EMAIL_PASSWORD,
      },
    });

    const { subject, to, html } = data;

    // Inline CSS for better email client compatibility
    const inlinedHTML = juice(String(html), { preserveMediaQueries: true });

    log.debug("📧 Sending email to:", to);

    const mailOptions = {
      from: TEAM_EMAIL,
      to: to,
      subject: subject,
      html: inlinedHTML, // ✅ FIXED: use `html`, not `template`
    };

    const info = await transporter.sendMail(mailOptions);
    log.info("✅ Email sent:", info.response);
    return true;
  } catch (error) {
    throw error;
  }
};


// ✅ NEW: Send receipt email with PDF attachment
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

  const { subject, to, attachments, order } = data;

  const html = await GenReceiptTemplate(order); // Generate HTML content for the receipt email
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


// ✅ NEW: Send welcome email using the template
async function SendWellcomeEmail(user) {
  try{
    const template = await GenWellcomeTemplate(user);
    const payload = {
      subject: "Welcome aboard — let’s get your business running with Taply!",
      to: user.email,
      html: template,
    };
    await sendEmail(payload);
  }
  catch(error){
    log.err('❌ Error sending email:', error);
    throw error;
  }
}


// ✅ NEW: Send support email to the support team
async function SendSupportEmail(data) {
  try {
    if (!data?.message) {
      throw new Error("Message is required");
    }
    console.log("📧 Received support email data:", data);

    const payload = {
      from: TEAM_EMAIL,
      subject: "Customer support request",
      to: SUPPORT_EMAIL,
      html: `
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Message:</strong></p>
        <p>${data.message}</p>
      `,
    };

    await sendEmail(payload);

    return {
      success: true,
    };
  } catch (error) {
    log.err("❌ Error sending support email:", error);

    throw new Error("Failed to send support email");
  }
}


async function SendConfirmReservationEmail(booking) {
  try {
    const template = await GenConfirmReservationTemplate(booking);
    const payload = {
      subject: "Your reservation has been confirmed!",
      to: ENV ? booking?.customerEmail : APP_EMAIL,
      html: template,
    };
    await sendEmail(payload);
  } catch (error) {
    log.err('❌ Error sending confirmation email:', error);
    throw error;
  }
};

async function SendCancelReservationEmail(booking) {
  try {
    if(!ENV) return true; // Skip sending email in development environment
    const template = await GenCancelReservationTemplate(booking);
    const payload = {
      subject: "Your reservation has been cancelled!",
      to: ENV ? booking?.customerEmail : APP_EMAIL,
      html: template,
    };
    await sendEmail(payload);
  } catch (error) {
    log.err('❌ Error sending cancellation email:', error);
    throw error;
  }
}


export {
  SendPdfEmail,
  SendReceiptEmail,
  SendWellcomeEmail,
  SendSupportEmail,
  SendConfirmReservationEmail,
  SendCancelReservationEmail
}