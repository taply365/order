import { RunQuery } from '../db/db.js';
import log from "minhluanlu-color-log";
import { getIO } from "../socketIO/socket.js";


async function HandleGetOrdersForKitchen(req, res) {
    try {
        const status = req.params.status;
        const businessId = req.params.id;
        const query = `
                SELECT * 
            FROM orders 
            WHERE status = ? 
            AND businessId = ? 
            AND createdAt >= CURDATE()
            AND createdAt < CURDATE() + INTERVAL 1 DAY
            ORDER BY createdAt DESC;
        `;
        const result = await RunQuery(query, [status, businessId]);
        res.status(200).json({
            success: true,
            message: `Orders with status '${status}' fetched successfully`,
            data: result
        });
    } catch (error) {
        log.err('Error fetching kitchen data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}


async function HandleSendTableOrdersForKitchen(req, res) {
    try {
        const data = req.body;
        const businessId = req.params.id;
        const tableId = req.params.tableId;
        console.log('Received data for sending table orders to kitchen:', data);
        const io = getIO();

        log.info(`Emitting 'update_tableOrders_list' event to business room: ${businessId} with data:`, {success: true});
        io.to(`business:${businessId}`)
        .timeout(5000)
        .emit("update_tableOrders_list", {success: true}, (err, responses) => {
            log.debug(`sending checkout session to business room: ${businessId}`);

            if (err) {
            log.warn(`[socket ⚠️📤] Failed to receive ack from one or more clients in business room: ${businessId}`);
            }

            const confirmed = responses?.some((res) => res?.success);

            if (confirmed) {
            log.info(`[socket ✅📦] Checkout session confirmed for business with uid: ${businessId}`);
            } else {
            log.warn(`[socket ⚠️📤] No client confirmed checkout session for business with uid: ${businessId}`);
            }
        });

        await RunQuery(`UPDATE tableOrders SET status = "PREPARING" WHERE tableId = ? `, [parseInt(tableId)]);    


        res.status(200).json({
            success: true,
            message: `Table orders sent to kitchen successfully`,
            data: data
        });
    }
    catch(err){
        console.log(err)
        log.err('Error fetching kitchen data by date:', err);
    }
};


async function HandleUpdateOrdersStatus(req, res) {
  try {
    const io = getIO();
    const status = req.params.status;
    const orders = req.body;

    log.info(`Updating status of ${orders.length} orders to '${status}'`);

    for (const order of orders) {
      await RunQuery(
        `UPDATE orders SET status = ? WHERE id = ?`,
        [status, order.orderId]
      );

        log.info(`Order ${order.orderId} status updated to '${status}' in database, now notifying customer ${order.customerId}`);
        io.to(`guest:${order.customerId}`).emit("orderStatusUpdate", { orderId: order.orderId, status });
    };



    res.status(200).json({
      success: true,
      message: `Order status updated successfully`,
      data: { status, orders }
    });
  } catch (error) {
    log.err("Error updating order status:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

export { HandleGetOrdersForKitchen, HandleSendTableOrdersForKitchen, HandleUpdateOrdersStatus };