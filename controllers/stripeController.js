const stripe = require("stripe")(process.env.STRIPE_KEY);
const Company = require("../models/company");

const toISO = (country) => {
  switch (country) {
    case "Deutschland":
      return "DE";
    case "Österreich":
      return "AT";
    case "Schweiz (die)":
      return "CH";
    case "Schweiz":
      return "CH";
    default:
      return null;
  }
};
module.exports = {
  createCheckout: async (req, res) => {
    const { origin } = req.body;
    const user = req.user;

    // checkf if company has a stripe customer? forward it : create one.
    const allCustomers = await stripe.customers.list();
    const companyCustomers = allCustomers.data.filter(
      (customer) => customer.metadata.company_id === req.user.company.toString()
    );
    await user.populate("company");
    let customer = {};
    if (companyCustomers.length) {
      customer = companyCustomers[0];
    } else {
      const company = user.company;
      const customerObj = {
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        address: {
          line1: `${company.address.street.streetName} ${company.address.street.streetNum}`,
          city: company.address.city,
          postal_code: company.address.zip,
          state: company.address.province || "unknown",
          country: toISO(company.address.country),
        },
        metadata: {
          company_name: company.name,
          company_role: company.industryRole,
          company_id: company._id.toString(),
          user_id: user._id.toString(),
        },
      };
      customer = await stripe.customers.create(customerObj);
    }
    const isFertiger = user.company.industryRole === "Fertiger";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      success_url: `${origin}/stripe-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/stripe-failure`,
      line_items: [
        {
          price: isFertiger
            ? process.env.FERTIGER_ABO_ID
            : process.env.EINKAEUFER_ABO_ID,
          quantity: 1,
        },
      ],
      // customer_email: req.user.email,
      locale: "de",
      automatic_tax: {
        enabled: true,
      },
      payment_method_types: ["sepa_debit", "card"],
      customer: customer.id,
      allow_promotion_codes: true,
    });
    res.json({ status: "success", data: { checkoutURL: session.url } });
  },
  //

  //---------------------------

  //
  updateCompany: async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res
        .status(400)
        .json({ status: "error", message: "Fehlende Session-ID" });
    }
    // session is the STRIPE SESSION, not express session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["customer", "subscription", "payment_intent", "line_items"],
    });
    // validate for status: open or expired
    if (session.status === "open") {
      return res.status(400).json({
        status: "error",
        message:
          "Die Kaufabwicklung ist noch im Gange. Die Zahlungsabwicklung hat noch nicht begonnen.",
      });
    }
    if (session.status === "expired") {
      return res.status(400).json({
        status: "error",
        message: "Die Checkout-Sitzung ist abgelaufen.",
      });
    }
    // validate for payment_status: unpaid
    if (session.payment_status === "unpaid") {
      return res.status(400).json({
        status: "error",
        message: "Die Zahlung des Abonnements ist nicht erfolgt.",
      });
    }
    const customer = session.customer;
    const subscriptionName = session.line_items.data[0].description;
    const subscription = session.subscription;
    const paymentIntent = session.payment_intent;
    const companyId = customer.metadata.company_id;
    const company = await Company.findById(companyId);
    company.stripeId = customer.id;
    if (subscription) {
      company.purchases = [
        {
          id: subscription.id,
          object: subscription.object,
          name: subscriptionName,
          createdAt: new Date(subscription.created * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          status: subscription.status,
        },
        ...company.purchases,
      ];
    } else if (paymentIntent) {
      // shouldn't be needed since only sub atm
      company.purchases = [
        {
          id: paymentIntent.id,
          object: paymentIntent.object,
          name: subscriptionName,
          createdAt: new Date(paymentIntent.created * 1000),
          status: paymentIntent.status,
        },
        ...company.purchases,
      ];
    } else {
      // shouldn't be reached but just in case
      return res.status(500).json({
        status: "error",
        message: "keine Zahlung oder Abonnement gefunden",
      });
    }
    await company.save();
    req.session.subscription = subscriptionName;
    res.json({ status: "success", data: { subscription: subscriptionName } });
  },
};
