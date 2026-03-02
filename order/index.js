import log from "minhluanlu-color-log";
import { RunQuery } from "../db/db.js";
import { orderStatus } from "../config.js";



export async function checkBusinessFeatureByName(businessId, name) {
    try {
        const feature = await RunQuery(`
            SELECT *
            FROM businessFeatures
            WHERE businessId = ?
            AND featureId = (
                SELECT id
                FROM features
                WHERE name = ?
                LIMIT 1
            )
            LIMIT 1
        `, [businessId, name]);

        if(feature.length === 0) {
            log.debug(`Business ${businessId} does not have feature ${name}`);
            return false;
        }

        return feature[0].isEnabled === 1 ? true : false;

    } catch (error) {
        console.error("Error fetching business features:", error);
        throw error;
    }
}

export function calculateTotalPrice(orders) {
    let totalPrice = 0; 
    for (const order of orders) {
        for (const item of order?.data || []) {
            const quantity = item.quantity || 1;
            totalPrice += item.price * quantity;
        }
    }
    log.debug(`Calculated total price: ${totalPrice}`);
    return totalPrice
}



export async function getOrderById(orderId) {
    try {
        const orders = await RunQuery(`
            SELECT *
            FROM orders o
            JOIN businesses b ON o.businessId = b.id
            WHERE o.id = ?
            LIMIT 1
        `, [orderId]);

        return orders.length > 0 ? orders[0] : null;
    } catch (error) {
        console.error("Error fetching order by ID:", error);
        throw error;
    }
}

export async function updateOrderStatus(orderId, status) {
    try {
        const result = await RunQuery(`
            UPDATE orders
            SET status = ?
            WHERE id = ?
        `, [status, orderId]);
            
        return result.affectedRows > 0;
    } catch (error) {
        console.error("Error updating order status:", error);
        throw error;
    }
}


export async function getTodayOrdersForBusiness(businessId, status) {
    try {
        const results = await RunQuery(`
            SELECT *
            FROM orders
            WHERE businessId = ?
            AND DATE(createdAt) = CURDATE()
            AND (status = ? OR status = ?)
            ORDER BY createdAt DESC
        `, [businessId, status, "READY"]);
        return results;
    }
    catch (error) {
        console.error("Error fetching today's orders for business:", error);
        throw error;
    }
}