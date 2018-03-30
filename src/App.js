import React, { Component } from 'react';
import './App.css';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {products: null, displayProducts: {}, displayZoomProducts: {}, zoomIndex: 0};
  }

  componentDidMount () {
    console.log('Executing Stripe API request for products')
    
    fetch('/.netlify/functions/products')
      .then(response => response.json())
      .then(json => this.processProducts(json));
  }

  processProducts (json) {
    const products = JSON.parse(json.products)

    console.log('Products received from Stripe', products)
    
    this.setState({products})

    let displayProducts = {}    

    products.data.forEach((product) => {
      displayProducts[product.name] = products.data.filter(prod => prod.name === product.name)
    })

    this.setState({displayProducts})
  }

  render() {
    let {displayProducts} = this.state

    let categoryMenu = this.processDisplayCategories(displayProducts)    
    let productsList = this.processDisplayProducts(displayProducts)

    return (
      <div className='catalog'>
        <div className='categoryMenu'>
          {categoryMenu}
        </div>
        <div className='productList'>
          {productsList}
        </div>
      </div>
    );
  }

  checkoutProduct (product) {
    var handler = window.StripeCheckout.configure({
      key: 'pk_test_Os3pXXfffhGJXmRqNMsTwt4R',
      image: product.images[0],
      locale: 'auto',
      billingAddress: true,
      shippingAddress: true,
      token: (token) => {
        console.log(token)
        fetch(`/.netlify/functions/order?sku=${product.skus.data[0].id}&curr=${product.skus.data[0].currency}&token=${token.id}&email=${token.email}`)
          .then(response => response.json())
          .then(json => console.log(json));
      }
    });
    
    // Close Checkout on page navigation:
    window.addEventListener('popstate', function() {
      handler.close();
    });
    // run lambda function to create order
    handler.open({
      name: product.name,
      description: product.skus.data[0].attributes.color,
      currency: product.skus.data[0].currency,
      amount: product.skus.data[0].price
    });
  }

  processDisplayCategories (displayProducts) {
    return []
  }

  processDisplayProducts (displayProducts) {
    let productsList = []
    
    let {displayZoomProducts} = this.state
    
    Object.keys(displayProducts).forEach(productName => {
      const zoomIndex = displayZoomProducts[productName] || 0
      const zoomProduct = displayProducts[productName][zoomIndex]

      // big product
      productsList.push(
        <div className='product' key={zoomProduct.id}>
          <h1>{productName}</h1>
          <img src={zoomProduct.images[0]} alt={zoomProduct.name}/>
        </div>
      )

      // pay button
      productsList.push(
        <button key={'zoomProductBuy' + productName} onClick={this.checkoutProduct.bind(this, zoomProduct)}>
          Buy {zoomProduct.name} {zoomProduct.skus.data[0].attributes.color}
        </button>
      )

      const thumbnails = []

      // thumbnails
      displayProducts[productName].forEach(product => {
        thumbnails.push(
          <div key={product.id}
            onClick={this.handleClick.bind(this, product)} 
            className='thumbnail'
          >
            <img src={product.images[0]} alt={product.name}/>
          </div>       
        )
      })

      productsList.push(<div key={'thumbnails' + productName} className='thumbnailWrapper'>{thumbnails}</div>)

      productsList.push(<div key={'productBreak' + productName} className='productBreak'></div>)      
    })

    return productsList
  }

  handleClick (product) {
    let {displayZoomProducts} = this.state

    const zoomIndex = this.state.displayProducts[product.name].indexOf(product)

    displayZoomProducts[product.name] = zoomIndex

    this.setState({displayZoomProducts})
  }
}

export default App;
