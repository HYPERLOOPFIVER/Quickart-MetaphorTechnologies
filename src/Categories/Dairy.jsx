import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { Link } from 'react-router-dom';
import './Category.css';

const DairyPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userCity, setUserCity] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUserCityAndProducts = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const user = auth.currentUser;
        if (!user) {
          setError('Please log in to view nearby dairy products');
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
        
        // Query products based on category (dairy) and city
        const productsRef = collection(db, 'products');
        const q = query(
          productsRef, 
          where('category', '==', 'dairy'),
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
        console.error('Error fetching dairy products:', err);
        setError('Failed to load dairy products. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchUserCityAndProducts();
  }, []);
  
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading dairy products...</p>
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
    <div className="category-page dairy-page">
      <div className="category-header">
        <h1>Dairy Products near you</h1>
        {userCity && <p className="location-info">Dairy products available in {userCity}</p>}
      </div>
      
      {products.length === 0 ? (
        <div className="no-products">
          <p>No dairy products available in your area right now.</p>
          <Link to="/" className="back-button">Back to Home</Link>
        </div>
      ) : (
        <div className="products-grid">
          {products.map((product) => (
            <div key={product.id} className="product-card dairy-card">
              <div className="product-image-container">
                <img 
                  src={product.imageUrl || '/dairy-placeholder.png'} 
                  alt={product.name}
                  className="product-image" 
                />
                {product.farm && <span className="farm-badge">Farm Fresh</span>}
              </div>
              <div className="product-info">
                <h3 className="product-name">{product.name}</h3>
                <p className="product-price">₹{product.price.toFixed(2)}
                  {product.unit && <span className="product-unit">/{product.unit}</span>}
                </p>
                <p className="product-seller">{product.sellerName}</p>
                {product.expiryDate && (
                  <p className="product-expiry">
                    Best before: {new Date(product.expiryDate.seconds * 1000).toLocaleDateString()}
                  </p>
                )}
                {product.fat && <p className="product-fat">Fat content: {product.fat}%</p>}
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

export default DairyPage;