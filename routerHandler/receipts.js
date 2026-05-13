import log from "minhluanlu-color-log";
import { buildReceiptHtml, htmlToPdf } from "../templates/build.js";
import { SendReceiptEmail } from "../email/index.js";
import { ClearSession, CreateReceiptSession, GetReceiptSession } from "../receipt/receiptSession.js";
import { RunQuery } from "../db/db.js";


// Receipts related handlers
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
    await SendReceiptEmail({
      to: order.email,
      subject: `Payment Receipt • Order #${order.orderNumber || order.id}`,
      attachments: [
        {
          filename: `receipt-${order.id}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
      order, // Pass the order data for generating the email content
    });

    log.debug(`Receipt email sent to ${order.email} for order #${order.id}`);
    return res.status(200).json({ success: true, message: "Receipt email sent successfully" });
  } catch (err) {
    console.error("Error in HandleSendReceiptToEmail:", err);
    return res.status(500).json({ 
        success: false,
        error: "Internal Server Error" 
    });
  }
};


async function HandleCreateReceiptSession(req, res) {
    try{
        let { orderId, businessId, paymentIntentId } = req.body;
        if(!orderId){
          const order = await RunQuery(`SELECT id FROM orders WHERE paymentIntentId = ?`, [paymentIntentId]);
          if(order.length === 0){
            log.err("No order found with paymentIntentId:", paymentIntentId);
            return res.status(404).json({success: false, message: "Order not found" });
          }
          orderId = order[0].id;
          log.debug("Found orderId:", orderId, "for paymentIntentId:", paymentIntentId);
        }

        if(!orderId || !businessId){
          log.err("Missing orderId or businessId in request body");
            return res.status(400).json({success: false, message: "Missing orderId or businessId" });
        }
        
        const clear = await ClearSession(businessId);
        if(!clear){
          log.err("Failed to clear existing session for businessId:", businessId);
          return res.status(500).json({success: false, message: "Failed to clear existing session" });
        }
        const created = await CreateReceiptSession(orderId, businessId);
        if(created){
          log.debug("Receipt session created successfully for orderId:", orderId);
            res.json({success: true, message: "Session created successfully" });
        }
        else{
            log.err("Failed to create receipt session for orderId:", orderId);
            res.status(500).json({success: false, message: "Failed to create session" });
        }
    }
    catch(err){
        console.error("Error in HandleCreateReceiptSession:", err);
        res.status(500).json({success: false,message: "Failed to create session", error: "Internal Server Error" });
    }
};


async function HandleGetReceiptSession(req, res) {
  const { businessId, code } = req.params;
  log.debug("Received request to get receipt session with businessId:", businessId, "and code:", code);
  if (!businessId || !code) {
    log.err("Missing businessId or code in request params");
    return res.status(400).json({ success: false, message: "Missing businessId or code" });
  }
  try {
    const session = await GetReceiptSession(businessId, code);
    if (session) {
      log.debug("Receipt session found for businessId:", businessId);
      res.status(200).json({ success: true, message: "Session found", data: session });
    } else {
      log.err("No receipt session found for businessId:", businessId);
      res.status(404).json({ success: false, message: "Session not found" });
    }
  } catch (err) {
    console.error("Error in /order/receipt-session:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}


export { HandleSendReceiptToEmail, HandleCreateReceiptSession, HandleGetReceiptSession };