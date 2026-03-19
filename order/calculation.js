export const pickupTimeCalculation = (order) => {
  const prepMinutes = order?.length * 1; // example logic
  return new Date(Date.now() + prepMinutes * 60000);
};