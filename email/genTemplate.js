import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import log from "minhluanlu-color-log";
const APP_URL = process.env.APP_URL;

// reconstruct __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Reads and returns an HTML template file as a string.
 * @param {string} templatePath - Relative path to the HTML template
 */
function getTemplate(templatePath) {
  if (!templatePath) return null;

  const fullPath = path.join(__dirname, `../templates/${templatePath}`);
  const template = fs.readFileSync(fullPath, "utf8");
  return template;
}
    

async function GenWellcomeTemplate(user) {
    try {
        const template = getTemplate('wellcome.html');
        const html = template
            .replace('{{ userName }}', user?.userName || "there")
            .replace('{{passcode}}', user?.passcode || "000000");

        return html;
    }
    catch (error) {
        log.err('❌ Error sending email:', error);
        throw error;
    }
};



async function GenConfirmReservationTemplate(booking) {
    try {
        let template = getTemplate('confirm_reservation.html');
        const reservationLink = APP_URL ? `${APP_URL}/reservations?bookingId=${booking?.bookingId}` : "#";

        const replacements = {
            '{{customerName}}': booking?.customerName || 'Guest',
            '{{bookingId}}': booking?.bookingId || '',
            '{{businessId}}': booking?.businessId || '',
            '{{tableId}}': booking?.tableId || '',
            '{{guests}}': booking?.guests || '',
            '{{startTime}}': booking?.startTime || '',
            '{{endTime}}': booking?.endTime || '',
            '{{status}}': booking?.status || 'confirmed',
            '{{createdAt}}': booking?.createdAt || '',
            '{{updatedAt}}': booking?.updatedAt || '',
            '{{reservationLink}}': booking?.reservationLink || '#',
            '{{businessName}}': booking?.businessName || 'Restaurant',
            '{{year}}': new Date().getFullYear(),
            "{{reservationLink}}": reservationLink || '#',
        };

        Object.keys(replacements).forEach((key) => {
            template = template.replaceAll(key, replacements[key]);
        });

        return template;

    } catch (error) {
        log.err('❌ Error generating reservation email template:', error);
        throw error;
    }
}


async function GenCancelReservationTemplate(booking) {
    try {
        let template = getTemplate('cancel_reservation.html');
        const reservationLink = APP_URL ? `${APP_URL}/reservations?bookingId=${booking?.bookingId}` : "#";

        const replacements = {
            '{{customerName}}': booking?.customerName || 'Guest',
            '{{bookingId}}': booking?.bookingId || '',
            '{{businessId}}': booking?.businessId || '',
            '{{tableId}}': booking?.tableId || '',
            '{{guests}}': booking?.guests || '',
            '{{startTime}}': booking?.startTime || '',
            '{{endTime}}': booking?.endTime || '',
            '{{status}}': booking?.status || 'confirmed',
            '{{createdAt}}': booking?.createdAt || '',
            '{{cancelledAt}}': booking?.updatedAt || '',
            '{{reservationLink}}': booking?.reservationLink || '#',
            '{{businessName}}': booking?.businessName || 'Restaurant',
            '{{year}}': new Date().getFullYear(),
            "{{reservationLink}}": reservationLink || '#',
        };

        Object.keys(replacements).forEach((key) => {
            template = template.replaceAll(key, replacements[key]);
        });

        return template;

    } catch (error) {
        log.err('❌ Error generating reservation email template:', error);
        throw error;
    }
}


async function GenReceiptTemplate(order) {
  try {
    let template = getTemplate('receipt.html');

    const replacements = {
      '{{businessLogo}}': order?.businessLogo || '',
      '{{orderNumber}}': order?.orderNumber || order?.id || '',
      '{{amount}}': Number(order?.totalPrice || 0).toFixed(2),
      '{{currency}}': order?.currency ?? order?.data?.currency ?? "",
      '{{businessName}}': order?.businessName || 'Restaurant',
      '{{year}}': new Date().getFullYear(),
    };

    for (const [key, value] of Object.entries(replacements)) {
      template = template.replaceAll(key, String(value));
    }

    return template;
  } catch (error) {
    log.err('❌ Error generating receipt email template:', error);
    throw error;
  }
}

export { GenWellcomeTemplate, GenConfirmReservationTemplate, GenCancelReservationTemplate, GenReceiptTemplate };
