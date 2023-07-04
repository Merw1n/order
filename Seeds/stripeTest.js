const stripe = require("stripe")("key");
const main = async () => {
  const subscription = await stripe.subscriptions.retrieve("subId");
  console.log(subscription);
};
main();
