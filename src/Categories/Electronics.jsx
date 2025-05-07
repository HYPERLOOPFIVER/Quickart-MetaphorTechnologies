import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../Firebase'; // Adjust the import path based on your project structure
import './Electronics.css'; // Import the CSS file

const Electronics = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchElectronicsProducts = async () => {
      try {
        // Create a query against the products collection for items with category "electronics"
        const productsRef = collection(db, "products");
        const q = query(productsRef, where("category", "==", "electronics"));
        
        // Execute the query
        const querySnapshot = await getDocs(q);
        
        // Process the results
        const productsList = [];
        querySnapshot.forEach((doc) => {
          productsList.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        setProducts(productsList);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching electronics products:", err);
        setError("Failed to fetch products. Please try again later.");
        setLoading(false);
      }
    };

    fetchElectronicsProducts();
  }, []);

  const handleAddToCart = (productId) => {
    // Navigate to the product page with the product ID
    navigate(`/product/${productId}`);
  };

  if (loading) {
    return <div className="loading-message">Loading electronics products...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (products.length === 0) {
    return <div className="no-products-message">No electronics products found.</div>;
  }

  return (
    <div className="electronics-container">
      <h1 className="electronics-title">Electronics Products</h1>
      
      <div className="products-grid">
        {products.map((product) => (
          <div key={product.id} className="product-card">
            {product.imageUrl && (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="product-image"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "/placeholder-image.png"; // Replace with your fallback image
                }}
              />
            )}
            <h2 className="product-name">{product.name}</h2>
            <p className="product-description">{product.description}</p>
            <div className="product-details">
              <span className="product-price">${product.price?.toFixed(2) || 'N/A'}</span>
              {product.inStock ? (
                <span className="in-stock">In Stock</span>
              ) : (
                <span className="out-of-stock">Out of Stock</span>
              )}
            </div>
            <button 
              className="add-to-cart-button"
              onClick={() => handleAddToCart(product.id)}
            >
              Add to Cart
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Electronics;