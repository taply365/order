import { RunQuery } from '../db/db.js';
import log from "minhluanlu-color-log";


async function HandleGetOrdersForKitchen(req, res) {
    try {
        const status = req.params.status;
        const businessId = req.params.id;
        const query = `
            SELECT * 
            FROM orders 
            WHERE status = ? 
            AND businessId = ? 
            AND DATE(createdAt) = CURDATE();
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

export { HandleGetOrdersForKitchen };