import { RunQuery } from '../db/db.js';
import log from "minhluanlu-color-log";
import { getIO } from "../socketIO/socket.js";
import { SendConfirmReservationEmail, SendCancelReservationEmail } from '../email/index.js';



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
    console.error("Error handling booking event:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to handle booking event",
    });
  }
};



async function  HandleConfirmBookingEvent(req, res) {
  try{
    const booking = req.body;
    console.log("Received confirm booking event:", booking);
    await SendConfirmReservationEmail(booking);
    return res.status(200).json({
      success: true,
      message: "Booking confirmed and email sent successfully",
    });
  }
  catch(error){
  console.error("Error handling confirm booking event:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to handle confirm booking event",
    });
  }
}


async function  HandleCancelBookingEvent(req, res) {
  try{
    const booking = req.body;
    console.log("Received cancel booking event:", booking);
    await SendCancelReservationEmail(booking);
    return res.status(200).json({
      success: true,
      message: "Booking cancelled and email sent successfully",
    });
  }
  catch(error){
  console.error("Error handling cancel booking event:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to handle cancel booking event",
    });
  }
}


export {
    HandleNewBookingEvent,
    HandleConfirmBookingEvent,
    HandleCancelBookingEvent
}