import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, documentId, getDocs } from 'firebase/firestore';
import { db, auth } from './Firebase';
import { toast } from 'react-toastify';
import './Details.css';
import Navbar from './Navbar';
const ProductDetails = () => {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cartItems, setCartItems] = useState([]);
  const navigate = useNavigate();

  // Simplified state - keeping only what's needed for this component
  const [orderNotes, setOrderNotes] = useState('');

  const handleAddToCart = async (product) => {
    try {
      if (!product || !product.id) {
        toast.error("Invalid product");
        return false;
      }

      if (!auth.currentUser) {
        toast.info("Please log in to add items to cart");
        navigate('/login');
        return false;
      }

      const userId = auth.currentUser.uid;
      const cartRef = doc(db, "carts", userId);
      const cartSnap = await getDoc(cartRef);
      
      let items = [];
      if (cartSnap.exists()) {
        items = [...(cartSnap.data().items || [])];
      } else {
        // Initialize cart if it doesn't exist
        await setDoc(cartRef, {
          items: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          total: 0
        });
      }

      // Validate product data
      const safeProduct = {
        productId: product.id,
        quantity: 1,
        price: Number(product.price) || 0,
        name: String(product.name) || "Unnamed Product",
        image: product.imageUrl || ""
      };

      const existingIndex = items.findIndex(item => 
        item && item.productId === product.id
      );

      if (existingIndex >= 0) {
        items[existingIndex].quantity += 1;
        toast.success(`Added another ${product.name} to cart`);
      } else {
        items.push(safeProduct);
        toast.success(`${product.name} added to cart`);
      }

      // Calculate total
      const total = items.reduce((sum, item) => {
        return sum + ((item.price || 0) * (item.quantity || 0));
      }, 0);

      await updateDoc(cartRef, {
        items: items.filter(item => item), // Remove any null/undefined
        updatedAt: new Date(),
        total: total
      });
      
      toast.success("Item added to cart successfully!");
      setCartItems(items);
      // Refresh cart items
      await fetchCartItems(userId);
      return true;
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add item to cart");
      return false;
    }
  };
  
  const fetchCartItems = async (userId) => {
    try {
      const cartRef = doc(db, "carts", userId);
      const cartSnap = await getDoc(cartRef);
      
      if (!cartSnap.exists()) {
        // Initialize cart if it doesn't exist
        await setDoc(cartRef, {
          items: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          total: 0
        });
        setCartItems([]);
        return [];
      }

      const cartData = cartSnap.data();
      const items = cartData.items || [];
      
      // Filter out any invalid items
      const validItems = items.filter(item => 
        item && item.productId && typeof item.quantity === 'number'
      );

      if (validItems.length === 0) {
        setCartItems([]);
        return [];
      }

      const productIds = validItems.map(item => item.productId);
      
      // Fetch product data in batches of 10 (Firestore limit for 'in' queries)
      const mergedItems = [];
      
      for (let i = 0; i < productIds.length; i += 10) {
        const batchIds = productIds.slice(i, i + 10);
        
        if (batchIds.length > 0) {
          const productsQuery = query(
            collection(db, "products"),
            where(documentId(), "in", batchIds)
          );
          
          const productsSnap = await getDocs(productsQuery);
          const productsMap = {};
          
          productsSnap.forEach(doc => {
            productsMap[doc.id] = {
              id: doc.id,
              ...doc.data()
            };
          });
          
          // Process this batch of items
          validItems
            .filter(item => batchIds.includes(item.productId))
            .forEach(item => {
              mergedItems.push({
                ...item,
                product: productsMap[item.productId] || {
                  id: item.productId,
                  name: "Product not found",
                  price: 0,
                  imageUrl: "/placeholder.jpg"
                }
              });
            });
        }
      }
      
      setCartItems(mergedItems);
      return mergedItems;
      
    } catch (error) {
      console.error("Error fetching cart items:", error);
      toast.error("Failed to load cart items");
      setCartItems([]);
      return [];
    }
  };

  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        setLoading(true);
        const productDoc = doc(db, 'products', productId);
        const productSnapshot = await getDoc(productDoc);
        
        if (productSnapshot.exists()) {
          setProduct({ id: productSnapshot.id, ...productSnapshot.data() });
        } else {
          setError('Product not found');
        }
      } catch (err) {
        console.error('Error fetching product:', err);
        setError('Failed to load product details');
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProductDetails();
    }
  }, [productId]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-box">
          <h2 className="error-title">Error</h2>
          <p className="error-message">{error}</p>
          <button 
            onClick={() => window.history.back()} 
            className="back-button"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <div className="product-details-page">
      <div className="product-details-container">
        <div className="back-nav">
          <button onClick={() => window.history.back()} className="back-link">
            &larr; Back to Products
          </button>
        </div>
        
        <div className="product-content">
          {/* Product Image - Fixed alignment */}
          <div className="product-image-section">
            {product.imageUrl ? (
              <div className="product-image-wrapper">
                <img 
                  src={product.imageUrl} 
                  alt={product.name} 
                  className="product-image"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/placeholder.jpg';
                  }}
                />
              </div>
            ) : (
              <div className="product-image-placeholder">
                <span>No image available</span>
              </div>
            )}
          </div>
          
          {/* Product Details */}
          <div className="product-info-section">
            {product.category && (
              <div className="product-category">
                <span>{product.category}</span>
              </div>
            )}
            
            <h1 className="product-title">{product.name}</h1>
            
            <div className="product-price">
              <span className="current-price">
                ₹{product.price?.toFixed(2)}
              </span>
              
              {product.originalPrice && product.originalPrice > product.price && (
                <div className="discount-info">
                  <span className="original-price">
                    ₹{product.originalPrice.toFixed(2)}
                  </span>
                  <span className="discount-badge">
                    {Math.round((1 - product.price / product.originalPrice) * 100)}% OFF
                  </span>
                </div>
              )}
            </div>
            
            {product.description && (
              <div className="product-description">
                <h3>Description</h3>
                <p>{product.description}</p>
              </div>
            )}
            
            <div className="product-meta">
              {product.soldCount !== undefined && (
                <div className="meta-item">
                  <span className="meta-label">Sold:</span>
                  <span className="meta-value">{product.soldCount} units</span>
                </div>
              )}
              
              {product.sku && (
                <div className="meta-item">
                  <span className="meta-label">SKU:</span>
                  <span className="meta-value">{product.sku}</span>
                </div>
              )}
              
              {product.stock !== undefined && (
                <div className="meta-item stock-info">
                  <span className="meta-label">Availability:</span>
                  <span className={`meta-value ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                    {product.stock > 0 ? `In Stock (${product.stock})` : 'Out of Stock'}
                  </span>
                </div>
              )}
            </div>
            
            {/* Order notes textarea */}
            <div className="order-notes">
              <textarea
                placeholder="Add notes for this order (optional)"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                rows={3}
              />
            </div>
            
            <div className="product-actions">
              <button 
                className="add-to-cart-button" 
                onClick={() => handleAddToCart(product)}
                disabled={product.stock === 0}
              >
                <span className="button-icon"></span>
                <span className="button-text">Add to Cart</span>
              </button>
              
              <button className="wishlist-button">
                <span className="button-icon">♡</span>
                <span className="button-text">Save for Later</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <Navbar/>
    </div>
  );
};

export default ProductDetails;