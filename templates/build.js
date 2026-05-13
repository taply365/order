import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function safeJsonForHtml(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

async function buildReceiptHtml(order) {
  const htmlPath = path.join(__dirname, "./receiptPDF.html");

  let html = await fs.readFile(htmlPath, "utf8");

  // replace placeholder with real data
  html = html.replace("__ORDER_JSON__", safeJsonForHtml(order));

  return html;
}


async function htmlToPdf(html) {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  await page.setContent(html, {
    waitUntil: "networkidle0",
  });

  // ✅ universal delay (fix)
  await new Promise(resolve => setTimeout(resolve, 500));

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: {
      top: "10mm",
      bottom: "10mm",
      left: "10mm",
      right: "10mm",
    },
  });

  await browser.close();

  return pdfBuffer;
}

export { buildReceiptHtml, htmlToPdf };