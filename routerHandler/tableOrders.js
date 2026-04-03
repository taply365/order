import { pool, RunQuery } from "../db/db.js";
import log from "minhluanlu-color-log";
import { getIO } from "../socketIO/socket.js";



async function HandleUpdateTableOrderStatus(req, res) {
    try{
        const data = req.body;
        const { status, id, tableId } = data;
        const io = getIO();

        log.debug(`Received request to update table order status: ${JSON.stringify(data)}`);

        const query = 'UPDATE tableOrders SET status = ? WHERE id = ?';
        await RunQuery(query, [status, id]);
        const business = await RunQuery('SELECT businessId FROM tables WHERE id = ?', [tableId]);
        if(business.length > 0){
            const businessId = business[0].businessId;
            io.to(`business:${businessId}`)
            .timeout(5000)
            .emit("table_order_updated", {tableId: tableId}, (err, responses) => {
                log.debug(`sending table order updated event to business room: ${businessId}`);

                if (err) {
                log.warn(`[socket ⚠️📤] Failed to receive ack from one or more clients in business room: ${businessId}`);
                }

                const confirmed = responses?.some((res) => res?.success);

                if (confirmed) {
                log.info(`[socket ✅📦] Table order updated for business with uid: ${businessId}`);
                } else {
                log.warn(`[socket ⚠️📤] No client confirmed table order update for business with uid: ${businessId}`);
                }
            });
        }
        res.status(200).json({ success: true, message: 'Table status updated successfully', data: data });
    }
    catch(err){
        log.err(err);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
}


export { HandleUpdateTableOrderStatus };