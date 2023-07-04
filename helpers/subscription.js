const stripe = require("stripe")(process.env.STRIPE_KEY);
// module.exports.checkAbo = async (company, req) => {
//   let subscription = null;
//   // Purchases include an Abo? check further : subscription=null
//   if (company.stripeId && company.purchases[0]?.name) {
//     const subscriptionName = company.purchases[0].name;
//     // Abo "current_period_end" is before today,i.e. ended already? check and update subscription period end date : subscription =true
//     if (company.purchases[0].currentPeriodEnd < new Date()) {
//       subscription = await stripe.subscriptions.retrieve(
//         company.purchases[0].id
//       );
//       if (
//         subscription.status === "active" ||
//         subscription.status === "trialing"
//       ) {
//         company.purchases[0].currentPeriodEnd = subscription.current_period_end;
//         await company.save();
//         req.session.subscription = subscriptionName;
//         subscription = subscriptionName;
//       } else {
//         // TODO add response for unpaid
//         subscription = null;
//       }
//     } else {
//       subscription = subscriptionName;
//       req.session.subscription = subscriptionName;
//     }
//   }
//   return subscription;
// };

module.exports.checkAbo = async (company, req) => {
  // validate for stripeId and a purchase
  if (!company.stripeId || !company.purchases[0]?.name) {
    return null;
  }
  const subscriptionName = company.purchases[0]?.name;

  // ONLY WHEN EINKÄUFER ABO IS ONE TIME PAYMENT: Abo's name is Einkäufer Abo? return the subscription, no need to check further
  // if (subscriptionName === "Einkäufer Abo") {
  //   req.session.subscription = subscriptionName;
  //   return subscriptionName;
  // }

  // Abo "current_period_end" is later (after today)? return the subscription already
  if (company.purchases[0].currentPeriodEnd >= new Date()) {
    req.session.subscription = subscriptionName;
    return subscriptionName;
  }
  // check the status of the subscription (since at this point, it's past the saved period end)
  let subscription = null;
  try {
    subscription = await stripe.subscriptions.retrieve(company.purchases[0].id);
  } catch (e) {
    console.log(e);
    // TODO: handle /Validate for the case of stripe is offline
    return null;
  }
  if (subscription.status !== "active" && subscription.status !== "trialing") {
    return null;
  }
  company.purchases[0].currentPeriodEnd =
    subscription.current_period_end * 1000;
  // ^ Stripe saves time in seconds not milliseconds
  await company.save();
  req.session.subscription = subscriptionName;
  return subscriptionName;
};
