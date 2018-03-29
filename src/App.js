import React, { Component } from 'react';
import './App.css';

var handler = window.StripeCheckout.configure({
  key: 'pk_test_Os3pXXfffhGJXmRqNMsTwt4R',
  image: 'https://stripe.com/img/documentation/checkout/marketplace.png',
  locale: 'auto',
  token: (token) => {
    alert('token', token)
    // You can access the token ID with `token.id`.
    // Get the token ID to your server-side code for use.

    // run lamba function to pay
  }
});

// Close Checkout on page navigation:
window.addEventListener('popstate', function() {
  handler.close();
});

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {products: null, productsDisplay: {}, zoomsDisplay: {}, zoomIndex: 0};
  }

  componentDidMount () {
    console.log('Executing Stripe API request for products')
    
    fetch('/.netlify/functions/hello')
      .then(response => response.json())
      .then(json => this.processProducts(json));
  }

  processProducts (json) {
    const products = JSON.parse(json.products)

    console.log('Products received from Stripe', products)
    
    this.setState({products})

    let productsDisplay = {}    

    products.data.forEach((product) => {
      productsDisplay[product.name] = products.data.filter(prod => prod.name === product.name)
    })

    this.setState({productsDisplay})
  }

  render() {
    let {productsDisplay} = this.state

    let productsList = []
    
    productsList = this.processDisplayProducts(productsDisplay, productsList)

    return (
      <div className='productList'>
        {productsList}
      </div>
    );
  }

  checkoutProduct (product) {
    // run lambda function to create order


    handler.open({
      name: product.name,
      description: product.skus.data[0].attributes.color,
      currency: product.skus.data[0].currency,
      amount: product.skus.data[0].price / 100
    });
  }

  processDisplayProducts (productsDisplay, productsList) {
    let {zoomsDisplay} = this.state
    
    Object.keys(productsDisplay).forEach(productName => {
      productsList.push(<h1>{productName}</h1>)

      const zoomIndex = zoomsDisplay[productName] || 0
      const zoomProduct = productsDisplay[productName][zoomIndex]

      // big product
      productsList.push(
        <div className='product'>
          <img src={zoomProduct.images[0]} alt={zoomProduct.name}/>
          <button onClick={this.checkoutProduct.bind(this, zoomProduct)}>Buy</button>
        </div>
      )

      const thumbnails = []

      // thumbnails
      productsDisplay[productName].forEach(product => {
        thumbnails.push(
          <div 
            onClick={this.handleClick.bind(this, product)} 
            className='thumbnail'
          >
            <img src={product.images[0]} alt={product.name}/>
          </div>       
        )
      })

      productsList.push(<div className='thumbnailWrapper'>{thumbnails}</div>)

      productsList.push(<div className='productsBreak'></div>)      
    })

    return productsList
  }

  handleClick (product) {
    let {zoomsDisplay} = this.state

    const zoomIndex = this.state.productsDisplay[product.name].indexOf(product)

    zoomsDisplay[product.name] = zoomIndex

    this.setState({zoomsDisplay})
  }
}

export default App;
