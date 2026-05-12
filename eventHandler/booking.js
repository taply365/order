import { RunQuery } from '../db/db.js';
import log from "minhluanlu-color-log";
import { getIO } from "../socketIO/socket.js";



async function HandleNewBookingEvent(req, res) {
  try {
    const io = getIO();

    const { bookingId, businessId, tableId, customerName, customerEmail, customerPhone, guests, startTime, endTime, status } = req.body;
    const booking = req.body;
    booking.isNew = true; // Mark as new booking for clients to handle accordingly
    // Save booking to database
    io.to(`business:${businessId}`)
      .timeout(5000)
      .emit(
        "new_booking_event", booking,
        (err, responses) => {
          log.debug(`Sending booking event to business room: ${businessId}`);

          if (err) {
            log.warn(
              `[socket ⚠️📤] Failed to receive ack from one or more clients in business room: ${businessId}`
            );
          }

          const confirmed = responses?.some((response) => response?.success);

          if (confirmed) {
            log.info(
              `[socket ✅📦] Booking event confirmed for business with uid: ${businessId}`
            );
          } else {
            log.warn(
              `[socket ⚠️📤] No client confirmed booking event for business with uid: ${businessId}`
            );
          }
        }
      );

    return res.status(200).json({
      success: true,
      message: "Booking event received successfully",
    });
  } catch (error) {
    log.error("Error handling booking event:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to handle booking event",
    });
  }
}

export {
    HandleNewBookingEvent
}