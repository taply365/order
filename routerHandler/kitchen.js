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



async function HandleUpdateTableOrdersForKitchenEvent(req, res) {
    try {
        const data = req.body;
        const businessId = req.params.id;
        const tableId = req.params.tableId;
        const clear = req.query.clear === 'true'; // ✅ parse boolean
        console.log('Received data for sending table orders to kitchen:', data);
        const io = getIO();

        log.info(`Emitting 'update_tableOrders_list' event to business room: ${businessId} with data:`, {success: true});
        io.to(`business:${businessId}`)
        .timeout(5000)
        .emit("update_tableOrders_list", {success: true, tableId: tableId}, (err, responses) => {
            const confirmed = responses?.some((res) => res?.success);

            if (confirmed) {
            log.info(`[socket ✅📦] sending update table orders list event to business room: ${businessId}`);
            } else {
            log.warn(`[socket ⚠️📤] No client confirmed update table orders list for business with uid: ${businessId}`);
            }
        });

        if(clear){
            console.log('❌ clear flag:', clear);
            io.to(`business:${businessId}`)
            .timeout(5000)
            .emit("table_order_deleted", {clear: true, tableId: tableId}, (err, responses) => {
                
                const confirmed = responses?.some((res) => res?.success);

                if (confirmed) {
                log.info(`[socket ✅📦] Clear table orders confirmed for business with uid: ${businessId}`);
                } else {
                log.warn(`[socket ⚠️📤] No client confirmed clear table orders for business with uid: ${businessId}`);
                }
            });
        }


        // update all products to PREPARING status in tableOrders
        for (const order of data) {
            order.data = order.data.map(item => ({
                ...item,
                status: "PREPARING"
            }));

            await RunQuery(
                `UPDATE tableOrders SET status = "PREPARING", data = ? WHERE id = ?`,
                [JSON.stringify(order.data), order.id]
            );
        }


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

export { HandleGetOrdersForKitchen, HandleUpdateTableOrdersForKitchenEvent, HandleUpdateOrdersStatus };