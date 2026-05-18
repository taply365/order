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
          log.debug(`Sending pending booking event to business room: ${businessId}`);

          const confirmed = responses?.some((response) => response?.success);

          if (confirmed) {
            log.info(
              `[socket ✅📦] Pending Booking event for business with uid: ${businessId}`
            );
          } else {
            log.warn(
              `[socket ⚠️📤] No client pending booking event for business with uid: ${businessId}`
            );
          }
        }
      );

    return res.status(200).json({
      success: true,
      message: "Booking event pending received successfully",
    });
  } catch (error) {
    console.error("Error handling booking event:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to handle booking event",
    });
  }
};


// confirm only from business side, not from customer side, so we can send email to customer to confirm reservation
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


// cancel can be from both business side and customer side, so we can send email to customer to notify cancellation
async function  HandleCancelBookingEvent(req, res) {
  try{
    const io = getIO();
    const booking = req.body;
    const source = req.query.source || "unknown"; // Get source from query parameter, default to "unknown"
    console.log("Received cancel booking event:", booking);
    if(booking?.customerEmail){
      log.debug(`Sending cancellation email to customer: ${booking.customerEmail}`);
      await SendCancelReservationEmail(booking);
    }

    if(source === "customer"){
      io.to(`business:${booking.businessId}`)
      .timeout(5000)
      .emit(
        "cancelled_booking_event", booking,
        (err, responses) => {
          log.debug(`Sending cancelled booking event to business room: ${booking.businessId}`);
          const confirmed = responses?.some((response) => response?.success);

          if (confirmed) {
            log.info(
              `[socket ✅📦] Cancelled booking event for business with uid: ${booking.businessId}`
            );
          } else {
            log.warn(
              `[socket ⚠️📤] No client cancelled booking event for business with uid: ${booking.businessId}`
            );
          }
        }
      );
    }


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