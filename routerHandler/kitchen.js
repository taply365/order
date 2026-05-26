import { RunQuery } from '../db/db.js';
import log from "minhluanlu-color-log";
import { getIO } from "../socketIO/socket.js";
import { getUnifiedKitchenQueue } from '../kitchen/kitchenQueue.js';


/**
 * Get unified kitchen queue for display
 * Shows ALL orders (online + POS) sorted by priority and due time
 * 
 * Online orders:
 * - source: "online"
 * - priority: "normal"
 * - kitchenDueAt: pickupAt (customer promise time)
 * 
 * POS/Table orders:
 * - source: "pos"
 * - priority: "high"
 * - kitchenDueAt: scheduled ready time
 * 
 * Unified sort: priority (high first) → kitchenDueAt → createdAt
 */
async function HandleGetOrdersForKitchen(req, res) {
    try {
        const businessId = req.params.id;
        const status = req.params.status;

        log.info(`Fetching unified kitchen queue for business ${businessId}, status: ${status}`);

        const result = await getUnifiedKitchenQueue(businessId, status);

        res.status(200).json({
            success: true,
            message: `Unified kitchen orders with status '${status}' fetched successfully`,
            data: result,
            note: "This queue combines online (pickup) and POS (table) orders. Sorted by: priority (high/normal) → kitchenDueAt → createdAt"
        });
    } catch (error) {
        log.err('Error fetching unified kitchen queue:', error);
        res.status(500).json({ 
            error: 'Internal Server Error',
            message: error.message
        });
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

        log.info(`Emitting 'update_kitchen_queue' event to business room: ${businessId} with data:`, {success: true});
        io.to(`business:${businessId}`)
        .timeout(5000)
        .emit("update_kitchen_queue", {success: true, tableId: tableId}, (err, responses) => {
            const confirmed = responses?.some((res) => res?.success);

            if (confirmed) {
            log.info(`[socket ✅📦] sending update kitchen queue event to business room: ${businessId}`);
            } else {
            log.warn(`[socket ⚠️📤] No client confirmed update kitchen queue for business with uid: ${businessId}`);
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
    let tableUpdateName = "orders";

    for (const order of orders) {
        if(order?.source === "pos"){
            tableUpdateName = "tableOrders";
        }
        // if all statsu in data is not READY, then dont update status
        if(order?.status !== "READY"){
            await RunQuery(
                `UPDATE ${tableUpdateName} SET data = ? WHERE id = ?`,
                [JSON.stringify(order.data), order?.id]
            );
        }
        // if any status in data is READY, then update status to READY
        else{
            log.warn(`Order with id ${order.id} is already in READY status, skipping update.`);
            await RunQuery(
                `UPDATE ${tableUpdateName} SET status = ?, data = ? WHERE id = ?`,
                [status, JSON.stringify(order.data), order?.id]
            );
        }
    };

    res.status(200).json({
      success: true,
      message: `Order status updated successfully`,
      data: { status, orders }
    });
  } catch (error) {
    log.err("Error updating order status:", error);
    console.error("Error updating order status:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

export { HandleGetOrdersForKitchen, HandleUpdateTableOrdersForKitchenEvent, HandleUpdateOrdersStatus };