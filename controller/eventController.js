import { HandleNewBookingEvent , HandleConfirmBookingEvent, HandleCancelBookingEvent} from '../eventHandler/booking.js';
import { HandleUpdateTableOrdersForKitchenEvent } from '../routerHandler/kitchen.js';
import { HandleOpenCheckoutSessionToAppEvent, HandleCloseCheckoutSessionToAppEvent } from "../routerHandler/terminal.js";



const eventController = {
    HandleNewBookingEvent,
    HandleConfirmBookingEvent,
    HandleCancelBookingEvent,
    HandleUpdateTableOrdersForKitchenEvent,
    HandleOpenCheckoutSessionToAppEvent,
    HandleCloseCheckoutSessionToAppEvent
}


export default eventController;