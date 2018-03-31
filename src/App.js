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

    this.subCategorySelected$ = new Subject()
    this.categorySelected$ = new Subject()
  }

  componentDidMount () {
    this.getProducts()
    
    this.subCategorySelected$.subscribe(subCat => {
      this.processProducts(subCat)
    })

    this.categorySelected$.subscribe(cat => {
      this.processProducts(cat)
    })  
  }

  getProducts () {
    let oldResponse = window.localStorage.getItem('response')

    // if (oldResponse) {
    //   console.log('Using an old list of products')
    //   const response = JSON.parse(oldResponse)
    //   const products = JSON.parse(response.products)

    //   this.setState({products: products}, () => {
    //     this.processProducts()            
    //   })     
    // } else {
      fetch('/.netlify/functions/products')
        .then(response => response.json())
        .then(json => {
          window.localStorage.setItem('response', JSON.stringify(json))

          const products = JSON.parse(json.products)
          
          this.setState({products: products}, () => {
            this.processProducts()                      
          })
        });
    // }
  }

  processProducts (cat) {
    let {products} = this.state

    // products by name for display
    let displayProducts = {}    

    products.data.forEach((product) => {
      if (!cat || ((cat && product.metadata['sub-category'] === cat) || cat && product.metadata.category === cat)) {
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

          if (subCat && (!subCategories[category] || !subCategories[category].length)) {
            subCategories[category] = [subCat]
          } else if (subCat && !subCategories[category].includes(subCat)) {
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
      <div className='site'>
        <div className='main'>
          <img className='logo' src='./logo.jpeg' alt='axeco-logo' />
        </div>
        <div className='catalog container'>
          <div className='categoryMenu'>
            {categoryMenu}
          </div>
          <div className='productList'>
            {productsList}
          </div>
        </div>
      </div>
    );
  }

  processDisplayCategories () {
    let categoryMenu = []

    let {categories, subCategories} = this.state

    categories.reverse().forEach(category => {
      categoryMenu.push(
        <CategoryItem 
          key={'categoryMenuItem' + category} 
          category={category} 
          subCategories={subCategories}
          subCategorySelected={this.subCategorySelected$}
          categorySelected={this.categorySelected$}
        />
      )
    })

    return categoryMenu
  }

  processDisplayProducts (subCat = '') {
    let productsList = []
    
    let {displayProducts, displayZoomProducts} = this.state

    let displayProductsKeys = Object.keys(displayProducts).reverse()
    const firstProducts = displayProductsKeys.splice(2, 3)
    displayProductsKeys = firstProducts.concat(displayProductsKeys)
    
    displayProductsKeys.forEach(productName => {
      const zoomIndex = displayZoomProducts[productName] || 0
      const zoomProduct = displayProducts[productName][zoomIndex]

      // big product
      productsList.push(
        <div className='product' key={zoomProduct.id}>
          <h1 className='mini-container'>{productName}</h1>
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

  handleItemClick () {
    const {category, subCategories} = this.props
    
    if (!subCategories[category] || subCategories[category].length <= 1) {
      this.props.categorySelected.next(category)
    }    

    if (this.state.openSubCategories) {
      // reset filter
      this.props.subCategorySelected.next('')
    }

    this.setState({openSubCategories: !this.state.openSubCategories})
  }

  handleSubItemClick (subCat) {
    this.setState({openSubCategories: !this.state.openSubCategories})
    this.props.subCategorySelected.next(subCat)
  }

  render () {
    const {category, subCategories} = this.props
    const {openSubCategories} = this.state
    const subMenu = []

    if (openSubCategories && subCategories[category] && subCategories[category].length) {
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
        onClick={this.handleItemClick.bind(this)}
      >
        {category}
      </div>
      <div className='categoryMenuSubItemContainer'>
        {subMenu}
      </div>
    </div>
  }
}