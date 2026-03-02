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

export const calculateTotalPrice = (orders) => {
    console.log("Calculating total price for orders:", orders);
    let total = 0;
    orders.forEach((item) => {
      const quantity = item.quantity || 1;
      // Price is in item.data[0].price
      const basePrice = parseFloat(item.data?.[0]?.price) || 0;
      let extrasPrice = 0;
      if (item.extras && Array.isArray(item.extras)) {
        item.extras.forEach((extra) => {
          extrasPrice += parseFloat(extra.price) || 0;
        });
      }
      total += (basePrice + extrasPrice) * quantity;
    });
    console.log("Total price calculated:", total);
    return total;
};



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