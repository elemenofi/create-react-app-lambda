var stripe = require("stripe")(
  "sk_test_kkCVbDTXtYKdHO8wfaNpKH8o"
);

export function handler(event, context, callback) {
  console.log(event)

  stripe.products.list(
    { 
      limit: 100 
    },
    (err, products) => {
      callback(null, {
        statusCode: 200,
        body: JSON.stringify({products: JSON.stringify(products)})
      })
    }
  );
}


