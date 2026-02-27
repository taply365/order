import RunQuery from "../db/db.js";
import log from "minhluanlu-color-log";
import { getIO } from "../socketIO/socket.js";

import { checkBusinessFeatureByName } from "../order/index.js";


/*
📤 Sent
📦🚚 Order shipped
🧾➡️ Order submitted
✅📦 Order confirmed
🚀📦 Fast send
🔌 Connect
📦➡️ Send order
🔌❌ Disconnect
⚠️📤 Send failed
📤❌ Not sent
🚫📤 Blocked send
📦❌ Order failed
🔴📤 Error sending

🗄️ DataBase
💾 Save / storage
🧠 Data storage
📊 Data
📁 Data folder
🗃️ Archive
🖥️ Server
☁️ Cloud database

🤝 Joined
📥 Join / enter
🚪 Enter
👤➕ Add user
🔗 Join link
✅ Joined successfully
*/

/*
Other options:
🪪 Token
🎫 Access token
🔐 Secure token
⚙️🔑 Creating token
✨🔑 New token
📛 Token ID

Status examples:

Generate token: 🔑

Token created: 🔑✅

Token failed: 🔑❌

Token expired: 🔑⏰

Token error: 🔑⚠️
*/


const HandleGetNewOrders = async (req, res) => {
    log.debug("Handling get new orders request");
    const io = getIO();
    const {receiverId, orders} = req.body;

    if(!receiverId || !orders) {
        log.warn("Missing receiverId or order in request body");
        return res.status(400).json({ message: "Missing receiverId or order" });
    }
    

    // get business id from database by uid //
    let businessId = await RunQuery("SELECT id FROM businesses WHERE uid = ? LIMIT 1", [receiverId]);
    if(businessId.length === 0) {
        log.warn(`No business found with uid: ${receiverId}`);
        return res.status(404).json({ message: "Business not found" });
    }
    businessId = businessId[0].id;

    // check if business has feature ORDER_ONLINE enabled //
    const hasFeature = await checkBusinessFeatureByName(businessId, "ORDER_ONLINE");
    if(!hasFeature) {
        log.warn(`Business with ID: ${businessId} does not have ORDER_ONLINE feature enabled`);
        return res.status(403).json({
            success: false, 
            message: "Business current not accepting online orders" 
        });
    }

    /// save order to database //

    io.to(`business:${businessId}`).emit("new_order", orders, (response) => {
        log.debug(`sending order to business room: ${businessId}`);
        if(response && response.success){
            log.info(`[ socket ✅📦] Order confirmed for business with ID: ${receiverId}`);
        } else {
            log.warn(`[socket ⚠️📤] Failed to send order to business with ID: ${receiverId}`);
        }
    });

    res.status(200).json({
        success: true,
        message: "Order sent to business successfully",
        data: orders
    });
}


export {
    HandleGetNewOrders
}