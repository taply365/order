function ceilToSlot(date, slotMinutes) {
  const slotMs = slotMinutes * 60 * 1000;
  return new Date(Math.ceil(date.getTime() / slotMs) * slotMs);
}

function formatTime(date) {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default class OrderScheduler {
  constructor({ slotMinutes = 15, maxOrdersPerSlot = 5, prepMinutes = 25 }) {
    this.slotMinutes = slotMinutes;
    this.maxOrdersPerSlot = maxOrdersPerSlot;
    this.prepMinutes = prepMinutes;
    this.slotCounts = new Map();
  }

  getSlotKey(date) {
    return date.toISOString();
  }

  getSlotCount(slotTime) {
    return this.slotCounts.get(this.getSlotKey(slotTime)) || 0;
  }

  setSlotCount(slotTime, count) {
    this.slotCounts.set(this.getSlotKey(slotTime), count);
  }

  getNextSlot(slotTime) {
    return new Date(slotTime.getTime() + this.slotMinutes * 60 * 1000);
  }

  getAvailableSlots(startTime, limit = 5) {
    const slots = [];
    let slotTime = new Date(startTime);

    while (slots.length < limit) {
      const count = this.getSlotCount(slotTime);

      slots.push({
        slotTime,
        label: formatTime(slotTime),
        currentOrders: count,
        remainingCapacity: this.maxOrdersPerSlot - count,
        isAvailable: count < this.maxOrdersPerSlot,
      });

      slotTime = this.getNextSlot(slotTime);
    }

    return slots;
  }

  assignPickupTime(orderTime = new Date()) {
    const orderDate = new Date(orderTime);

    const earliestReady = new Date(
      orderDate.getTime() + this.prepMinutes * 60 * 1000
    );

    let slotTime = ceilToSlot(earliestReady, this.slotMinutes);

    // find first available slot
    while (this.getSlotCount(slotTime) >= this.maxOrdersPerSlot) {
      slotTime = this.getNextSlot(slotTime);
    }

    // increment
    const newCount = this.getSlotCount(slotTime) + 1;
    this.setSlotCount(slotTime, newCount);

    // get next available slots (including this one)
    const availableSlots = this.getAvailableSlots(slotTime);

    return {
      orderTime: orderDate,
      earliestReady,
      pickupTime: slotTime,
      pickupLabel: formatTime(slotTime),
      slotCountAfterBooking: newCount,
      availableSlots,
    };
  }
}