import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../Firebase';
import { Link } from 'react-router-dom';
import './Category.css';

const ElectronicsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userCity, setUserCity] = useState('');
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // Filter state for electronics subcategories

  useEffect(() => {
    const fetchUserCityAndProducts = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const user = auth.currentUser;
        if (!user) {
          setError('Please log in to view nearby electronics');
          setLoading(false);
          return;
        }
        
        // Fetch user document to get city from address array
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          setError('User profile not found');
          setLoading(false);
          return;
        }
        
        const userData = userDoc.data();
        const userAddress = userData.address || [];
        
        // Find the city in the address array
        let city = '';
        if (Array.isArray(userAddress) && userAddress.length > 0) {
          const cityEntry = userAddress.find(addr => addr.city) || userAddress[0];
          city = cityEntry.city || cityEntry;
        }
        
        setUserCity(city);
        
        if (!city) {
          setError('No city found in your profile. Please update your address.');
          setLoading(false);
          return;
        }
        
        // Query products based on category (electronics) and city
        const productsRef = collection(db, 'products');
        const q = query(
          productsRef, 
          where('category', '==', 'electronics'),
          where('city', '==', city)
        );
        
        const querySnapshot = await getDocs(q);
        const productsData = [];
        
        querySnapshot.forEach((doc) => {
          productsData.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        setProducts(productsData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching electronic products:', err);
        setError('Failed to load electronic products. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchUserCityAndProducts();
  }, []);
  
  const filterProducts = () => {
    if (filter === 'all') {
      return products;
    }
    return products.filter(product => product.subcategory === filter);
  };

  const filteredProducts = filterProducts();
  
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading electronic products...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="category-page electronics-page">
      <div className="category-header">
        <h1>Electronics near you</h1>
        {userCity && <p className="location-info">Electronics available in {userCity}</p>}
      </div>
      
      <div className="filter-options">
        <button 
          className={`filter-button ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button 
          className={`filter-button ${filter === 'smartphone' ? 'active' : ''}`}
          onClick={() => setFilter('smartphone')}
        >
          Smartphones
        </button>
        <button 
          className={`filter-button ${filter === 'laptop' ? 'active' : ''}`}
          onClick={() => setFilter('laptop')}
        >
          Laptops
        </button>
        <button 
          className={`filter-button ${filter === 'accessory' ? 'active' : ''}`}
          onClick={() => setFilter('accessory')}
        >
          Accessories
        </button>
      </div>
      
      {filteredProducts.length === 0 ? (
        <div className="no-products">
          <p>No electronic products available in your area right now.</p>
          <Link to="/" className="back-button">Back to Home</Link>
        </div>
      ) : (
        <div className="products-grid">
          {filteredProducts.map((product) => (
            <div key={product.id} className="product-card electronics-card">
              <div className="product-image-container">
                <img 
                  src={product.imageUrl || '/electronics-placeholder.png'} 
                  alt={product.name}
                  className="product-image" 
                />
                {product.condition && (
                  <span className={`condition-badge ${product.condition.toLowerCase()}`}>
                    {product.condition}
                  </span>
                )}
              </div>
              <div className="product-info">
                <h3 className="product-name">{product.name}</h3>
                <p className="product-price">₹{product.price.toFixed(2)}</p>
                <p className="product-seller">{product.sellerName}</p>
                {product.brand && <p className="product-brand">Brand: {product.brand}</p>}
                {product.warranty && <p className="product-warranty">Warranty: {product.warranty}</p>}
                <p className="product-distance">{product.distance ? `${product.distance} km away` : 'Nearby'}</p>
                <div className="product-actions">
                  <button className="add-to-cart-button">Add to Cart</button>
                  <Link to={`/product/${product.id}`} className="view-details-button">
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="category-navigation">
        <Link to="/" className="back-to-home">Back to Categories</Link>
      </div>
    </div>
  );
};

export default ElectronicsPage;