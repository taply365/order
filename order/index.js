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
