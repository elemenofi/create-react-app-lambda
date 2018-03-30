import React, { Component } from 'react';
import {Subject} from 'rxjs/Subject'
import './App.css';

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      products: null, 
      categories: [],
      subCategories: {},
      displayProducts: {}, 
      displayZoomProducts: {}, 
      zoomIndex: 0
    };

    this.categorySelected$ = new Subject()
  }

  componentDidMount () {
    this.getProducts()
    
    this.categorySelected$.subscribe(subCat => {
      this.processProducts(subCat)
    })
  }

  getProducts () {    
    fetch('/.netlify/functions/products')
      .then(response => response.json())
      .then(json => {
        this.setState({products: JSON.parse(json.products)})
        console.log('Products received from Stripe', this.state.products)    
        this.processProducts()
      });
  }

  processProducts (subCat) {
    let {products} = this.state
    
    // products by name for display
    let displayProducts = {}    

    products.data.forEach((product) => {
      if (!subCat || (subCat && product.metadata['sub-category'] === subCat)) {
        displayProducts[product.name] = products.data.filter(prod => {
          return prod.name === product.name
        })
      }
    })

    // categories

    let categories = []
    
    products.data.forEach((product) => {
      if (!categories.includes(product.metadata.category)) categories.push(product.metadata.category)
    })

    // subCategories

    let subCategories = {}

    categories.forEach(category => {
      products.data.forEach((product) => {
        if (product.metadata.category === category) {
          const subCat = product.metadata['sub-category']

          if (!subCategories[category] || !subCategories[category].length) {
            subCategories[category] = [subCat]
          } else if (!subCategories[category].includes(subCat)) {
            subCategories[category].push(subCat)
          }
        }
      })
    })

    this.setState({categories, subCategories, displayProducts})
  }

  render() {
    let categoryMenu = this.processDisplayCategories()    
    let productsList = this.processDisplayProducts()

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

  processDisplayCategories () {
    let categoryMenu = []

    let {categories, subCategories} = this.state

    categories.forEach(category => {
      categoryMenu.push(
        <CategoryItem 
          key={'categoryMenuItem' + category} 
          category={category} 
          subCategories={subCategories}
          categorySelected={this.categorySelected$}
        />
      )
    })

    return categoryMenu
  }

  processDisplayProducts (subCat = '') {
    let productsList = []
    
    let {displayProducts, displayZoomProducts} = this.state
    
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
        <button className='zoomProductBuy' key={'zoomProductBuy' + productName} onClick={this.handleBuyClick.bind(this, zoomProduct)}>
          Buy {zoomProduct.name} {(displayProducts[zoomProduct.name].length > 1) ? zoomProduct.skus.data[0].attributes.color : ''}
        </button>
      )

      const thumbnails = []

      if (displayProducts[productName].length > 1) {
        // thumbnails
        displayProducts[productName].forEach(product => {
          thumbnails.push(
            <div key={product.id}
              onClick={this.handleThumbnailClick.bind(this, product)} 
              className='thumbnail'
            >
              <img src={product.images[0]} alt={product.name}/>
            </div>       
          )
        })

        productsList.push(<div key={'thumbnails' + productName} className='thumbnailWrapper'>{thumbnails}</div>)
      }

      productsList.push(<div key={'productBreak' + productName} className='productBreak'></div>)      
    })

    return productsList
  }

  handleThumbnailClick (product) {
    let {displayZoomProducts} = this.state

    const zoomIndex = this.state.displayProducts[product.name].indexOf(product)

    displayZoomProducts[product.name] = zoomIndex

    this.setState({displayZoomProducts})
  }

  handleBuyClick (product) {
    var handler = window.StripeCheckout.configure({
      key: 'pk_test_Os3pXXfffhGJXmRqNMsTwt4R',
      image: product.images[0],
      locale: 'auto',
      billingAddress: true,
      shippingAddress: true,
      token: (token) => {
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
}

export default App;

class CategoryItem extends Component {
  constructor(props) {
    super(props)
    this.state = {
      openSubCategories: false
    }
  }

  handleItemClick (category) {
    if (this.state.openSubCategories) {
      // reset filter
      this.props.categorySelected.next('')
    }

    this.setState({openSubCategories: !this.state.openSubCategories})
  }

  handleSubItemClick (subCat) {
    this.setState({openSubCategories: !this.state.openSubCategories})
    this.props.categorySelected.next(subCat)
  }

  render () {
    const {category, subCategories} = this.props
    const {openSubCategories} = this.state
    const subMenu = []

    if (openSubCategories) {
      subCategories[category].forEach(subCat => {
        subMenu.push(
          <div 
            key={'categoryMenuSubItem' + subCat}
            className='categoryMenuSubItem' 
            onClick={this.handleSubItemClick.bind(this, subCat)}
          >
            {subCat}
          </div>
        )
      })
    }

    return <div className='categoryMenuItemContainer'>
      <div 
        className='categoryMenuItem' 
        onClick={this.handleItemClick.bind(this, category)}
      >
        {category}
      </div>
      <div className='categoryMenuSubItemContainer'>
        {subMenu}
      </div>
    </div>
  }
}