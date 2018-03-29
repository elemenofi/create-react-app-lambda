var stripe = require("stripe")(
  "sk_test_kkCVbDTXtYKdHO8wfaNpKH8o"
);

export function handler(event, context, callback) {
  console.log(event)
  
  return stripe.orders.create({ 
    currency: event.queryStringParameters.curr,
    items: [
      {
        type: 'sku',
        parent: event.queryStringParameters.sku
      }
    ],
  }).then(order => {
    return stripe.orders.pay(order.id, {
      source: event.queryStringParameters.token,
      email: event.queryStringParameters.email
    }).then((order) => {
      const response = {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          message: `Order processed succesfully!`,
          order,
        }),
      };
      
      callback(null, response);
    })
  });
}