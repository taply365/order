import { HandleNewBookingEvent , HandleConfirmBookingEvent, HandleCancelBookingEvent} from '../eventHandler/booking.js';
import { HandleUpdateTableOrdersForKitchenEvent } from '../routerHandler/kitchen.js';




const eventController = {
    HandleNewBookingEvent,
    HandleConfirmBookingEvent,
    HandleCancelBookingEvent,
    HandleUpdateTableOrdersForKitchenEvent,
}


export default eventController;