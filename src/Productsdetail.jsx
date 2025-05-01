import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './Firebase';
import './Details.css';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { auth } from './Firebase';
import { updateDoc } from 'firebase/firestore';
import { query } from 'firebase/firestore';
import { collection } from 'firebase/firestore';
import { where } from 'firebase/firestore';
import { documentId } from 'firebase/firestore';
import { getDocs } from 'firebase/firestore';
import { setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
const ProductDetails = () => {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
    const [trendingProducts, setTrendingProducts] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [orderNotes, setOrderNotes] = useState('');
  
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timeSlots, setTimeSlots] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const [searchHistory, setSearchHistory] = useState([]);
    const [userAddress, setUserAddress] = useState({
      formatted: '',
      street: '',
      city: '',
      state: '',
      pincode: '',
    });
    const [isEditingAddress, setIsEditingAddress] = useState(false);
    const [useCurrentLocation, setUseCurrentLocation] = useState(true);
    const [userName, setUserName] = useState('');
    const [cartItems, setCartItems] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [wishlistItems, setWishlistItems] = useState([]);
    const [recentlyViewed, setRecentlyViewed] = useState([]);
    const [userLoggedIn, setUserLoggedIn] = useState(false);
    const [popularSearches, setPopularSearches] = useState([
      'Milk', 'Bread', 'Eggs', 'Bananas', 'Rice', 'Chicken'
    ]);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash'); // Default to cash on delivery
    const [cardDetails, setCardDetails] = useState({
      number: '',
      expiry: '',
      cvc: '',
      name: '',
      last4: '',
      brand: ''
    });
    const [activeOrders, setActiveOrders] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
  

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
  alert("Item added to cart successfully!");
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
    <div className="product-details-container">
      <div className="product-content">
        {/* Product Image */}
        <div className="product-image-container">
          {product.imageUrl ? (
            <img 
              src={product.imageUrl} 
              alt={product.name} 
              className="product-image"
            />
          ) : (
            <div className="placeholder-image">No Image Available</div>
          )}
        </div>
        
        {/* Product Details */}
        <div className="product-info-container">
          <div className="product-category-badge">
            <span>{product.category}</span>
          </div>
          
          <h1 className="product-title">{product.name}</h1>
          
          <div className="product-price-container">
            <span className="product-current-price">
            ₹ {product.price?.toFixed(2)}
            </span>
            
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="product-original-price">
                ${product.originalPrice.toFixed(2)}
              </span>
            )}
          </div>
          
          <div className="product-description">
            <p>{product.description}</p>
          </div>
          
          <div className="product-details-list">
          
            {product.soldCount !== undefined && (
              <div className="product-detail-item">
                <span className="detail-label">Sold:</span>
                <span className="detail-value">{product.soldCount} units</span>
              </div>
            )}
            
            {product.sku && (
              <div className="product-detail-item">
                <span className="detail-label">SKU:</span>
                <span className="detail-value">{product.sku}</span>
              </div>
            )}
          </div>
          
          <div className="product-actions">
          <button 
                  className="add-to-cart-button" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToCart(product);
                  }}
                >
                  Add
                </button>
            
            <button className="wishlist-button">
              Add to Wishlist
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;