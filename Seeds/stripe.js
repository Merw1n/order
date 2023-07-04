// const stripe = require("stripe")(process.env.STRIPE_KEY);

// const getCustomer = async () => {
//   const customer = await stripe.customers.retrieve("cus_LGrEGuhxXIvOqI", {
//     expand: ["subscriptions"],
//   });
//   console.log(customer.subscriptions);
// };

// stripe.checkout.sessions.listLineItems(
//   "cs_test_b13UYqHzaQ2igA0g2vRebDoAuZcl9CRcR8P1FElS8tsnjaqRukMIB1xHrS",
//   { limit: 5 },
//   function (err, lineItems) {
//     // asynchronously called
//     console.log({ err, lineItems });
//   }
// );

// getCustomer();
require("dotenv").config();
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_KEY);
// console.log({ key: process.env.STRIPE_KEY });

stripe.checkout.sessions.listLineItems(
  123,
  { limit: 5 },
  function (err, lineItems) {
    console.dir({ err, items: JSON.stringify(lineItems.data) });
    // asynchronously called
  }
);
