import log from "minhluanlu-color-log";
import { buildReceiptHtml, htmlToPdf } from "../templates/build.js";
import { SendEmail } from "../email/index.js";


async function HandleSendReceiptToEmail(req, res) {
  try {
    const order = req.body;
    log.info("Received order for receipt email:");
    // 1. Build HTML
    const html = await buildReceiptHtml(order);
    log.debug("Generated HTML for receipt email.");
    
    // 2. Convert to PDF
    const pdfBuffer = await htmlToPdf(html);
    log.debug("Converted HTML to PDF buffer for receipt email.");

    // 3. Send email with attachment
    await SendEmail({
      to: order.email,
      subject: `Receipt #${order.id}`,
      html: `<p>Your receipt is attached.</p>`,
      attachments: [
        {
          filename: `receipt-${order.id}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    log.debug(`Receipt email sent to ${order.email} for order #${order.id}`);
    return res.json({ success: true });
  } catch (err) {
    console.error("Error in HandleSendReceiptToEmail:", err);
    return res.status(500).json({ 
        success: false,
        error: "Internal Server Error" 
    });
  }
}

export { HandleSendReceiptToEmail };