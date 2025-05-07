import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, query, where, orderBy } from 'firebase/firestore';
import { db, auth } from './Firebase';
import { Link, useNavigate } from 'react-router-dom';
import { User, ShoppingBag, Heart, Clock, CheckCircle, Truck, MapPin, LogOut, Edit } from 'lucide-react';
import './Profile.css';
import Navbar from './Navbar';

export default function Profile() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders');
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        await fetchUserData(user.uid);
        await fetchOrders(user.uid);
        await fetchWishlist(user.uid);
        loadRecentlyViewed();
      } else {
        navigate('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  const fetchUserData = async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        setUserData({
          id: userDoc.id,
          ...userDoc.data()
        });
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const fetchOrders = async (userId) => {
    try {
      const ordersRef = collection(db, 'users', userId, 'orders');
      const q = query(ordersRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const ordersData = [];
      for (const doc of querySnapshot.docs) {
        const orderData = doc.data();
        const shopDoc = await getDoc(doc(db, 'shops', orderData.shopId));
        
        ordersData.push({
          id: doc.id,
          ...orderData,
          shopName: shopDoc.exists() ? shopDoc.data().name : 'Unknown Shop'
        });
      }
      
      setOrders(ordersData);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  const fetchWishlist = async (userId) => {
    try {
      const wishlistRef = collection(db, 'users', userId, 'wishlist');
      const wishlistSnapshot = await getDocs(wishlistRef);
      
      const wishlistItems = [];
      for (const wishlistDoc of wishlistSnapshot.docs) {
        const productDoc = await getDoc(doc(db, 'products', wishlistDoc.data().productId));
        
        if (productDoc.exists()) {
          wishlistItems.push({
            id: wishlistDoc.id,
            productId: productDoc.id,
            ...productDoc.data()
          });
        }
      }
      
      setWishlist(wishlistItems);
    } catch (error) {
      console.error("Error fetching wishlist:", error);
    }
  };

  const loadRecentlyViewed = () => {
    const storedRecentlyViewed = localStorage.getItem('recentlyViewed');
    if (storedRecentlyViewed) {
      setRecentlyViewed(JSON.parse(storedRecentlyViewed));
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      navigate('/');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const getOrderStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} color="orange" />;
      case 'confirmed':
        return <CheckCircle size={16} color="green" />;
      case 'preparing':
        return <Truck size={16} color="blue" />;
      case 'out_for_delivery':
        return <Truck size={16} color="purple" />;
      case 'delivered':
        return <CheckCircle size={16} color="green" />;
      default:
        return <Clock size={16} />;
    }
  };

  const getOrderStatusText = (status) => {
    return status.replace(/_/g, ' ').toUpperCase();
  };

  if (loading) {
    return <div className="profile-loading">Loading your profile...</div>;
  }

  if (!userData) {
    return <div className="profile-error">Error loading profile data</div>;
  }

  return (
    <div className="profile-container">
      {/* User Profile Header */}
      <div className="profile-header">
        <div className="profile-avatar">
          {userData.photoURL ? (
            <img src={userData.photoURL} alt="Profile" />
          ) : (
            <div className="avatar-placeholder">
              {userData.displayName?.charAt(0) || userData.firstName?.charAt(0) || 'U'}
            </div>
          )}
        </div>
        <div className="profile-info">
          <h1>{userData.displayName || `${userData.firstName} ${userData.lastName || ''}`}</h1>
          <p className="profile-email">{userData.email}</p>
          <p className="profile-phone">{userData.phoneNumber || 'No phone number'}</p>
        </div>
      </div>

      {/* User Address */}
      <div className="profile-address-section">
        <div className="section-header">
          <MapPin size={20} />
          <h2>Delivery Address</h2>
          <button className="edit-btn">
            <Edit size={16} />
          </button>
        </div>
        {userData.address ? (
          <div className="address-card">
            <p className="address-type">Home</p>
            <p className="address-text">{userData.address.formatted}</p>
          </div>
        ) : (
          <div className="no-address">
            <p>No address saved</p>
            <button className="add-address-btn">Add Address</button>
          </div>
        )}
      </div>

      {/* Profile Navigation Tabs */}
      <div className="profile-tabs">
        <button 
          className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <ShoppingBag size={18} /> My Orders
        </button>
        <button 
          className={`tab-btn ${activeTab === 'wishlist' ? 'active' : ''}`}
          onClick={() => setActiveTab('wishlist')}
        >
          <Heart size={18} /> Wishlist
        </button>
        <button 
          className={`tab-btn ${activeTab === 'recent' ? 'active' : ''}`}
          onClick={() => setActiveTab('recent')}
        >
          <Clock size={18} /> Recently Viewed
        </button>
      </div>

      {/* Orders Tab Content */}
      {activeTab === 'orders' && (
        <div className="tab-content">
          {orders.length === 0 ? (
            <div className="empty-state">
              <ShoppingBag size={48} className="empty-icon" />
              <h3>No Orders Yet</h3>
              <p>Your orders will appear here</p>
              <Link to="/" className="shop-now-btn">Shop Now</Link>
            </div>
          ) : (
            <div className="orders-list">
              {orders.map(order => (
                <div key={order.id} className="order-card">
                  <div className="order-header">
                    <div className="order-status">
                      {getOrderStatusIcon(order.status)}
                      <span>{getOrderStatusText(order.status)}</span>
                    </div>
                    <div className="order-date">
                      {order.createdAt?.toDate().toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="order-shop">
                    <span>From:</span> {order.shopName}
                  </div>
                  
                  <div className="order-items-preview">
                    {order.items.slice(0, 3).map((item, index) => (
                      <div key={index} className="order-item">
                        <div className="item-image">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} />
                          ) : (
                            <div className="item-image-placeholder"></div>
                          )}
                        </div>
                        <div className="item-details">
                          <p className="item-name">{item.name}</p>
                          <p className="item-quantity">Qty: {item.quantity}</p>
                        </div>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <div className="more-items">
                        +{order.items.length - 3} more items
                      </div>
                    )}
                  </div>
                  
                  <div className="order-footer">
                    <div className="order-total">
                      <span>Total:</span> ₹{order.totalAmount.toFixed(2)}
                    </div>
                    <Link to={`/order/${order.id}`} className="order-details-btn">
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Wishlist Tab Content */}
      {activeTab === 'wishlist' && (
        <div className="tab-content">
          {wishlist.length === 0 ? (
            <div className="empty-state">
              <Heart size={48} className="empty-icon" />
              <h3>Your Wishlist is Empty</h3>
              <p>Save your favorite items here</p>
              <Link to="/" className="shop-now-btn">Browse Products</Link>
            </div>
          ) : (
            <div className="wishlist-grid">
              {wishlist.map(item => (
                <Link 
                  to={`/product/${item.productId}`} 
                  key={item.id} 
                  className="wishlist-item"
                >
                  <div className="wishlist-item-image">
                    <img src={item.imageUrl} alt={item.name} />
                  </div>
                  <div className="wishlist-item-details">
                    <h3>{item.name}</h3>
                    <div className="wishlist-item-price">
                      ₹{item.price}
                      {item.originalPrice && (
                        <span className="original-price">₹{item.originalPrice}</span>
                      )}
                    </div>
                    <div className="wishlist-item-actions">
                      <button className="move-to-cart-btn">Add to Cart</button>
                      <button className="remove-wishlist-btn">Remove</button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recently Viewed Tab Content */}
      {activeTab === 'recent' && (
        <div className="tab-content">
          {recentlyViewed.length === 0 ? (
            <div className="empty-state">
              <Clock size={48} className="empty-icon" />
              <h3>No Recently Viewed Items</h3>
              <p>Your recently viewed products will appear here</p>
              <Link to="/" className="shop-now-btn">Start Shopping</Link>
            </div>
          ) : (
            <div className="recently-viewed-grid">
              {recentlyViewed.map(product => (
                <Link 
                  to={`/product/${product.id}`} 
                  key={`recent-${product.id}`} 
                  className="recent-item"
                >
                  <div className="recent-item-image">
                    <img src={product.imageUrl} alt={product.name} />
                  </div>
                  <div className="recent-item-details">
                    <h3>{product.name}</h3>
                    <div className="recent-item-price">
                      ₹{product.price}
                      {product.originalPrice && (
                        <span className="original-price">₹{product.originalPrice}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Account Actions */}
      <div className="account-actions">
        <button className="account-action-btn">
          <Edit size={18} /> Edit Profile
        </button>
        <button className="account-action-btn">
          <MapPin size={18} /> Manage Addresses
        </button>
        <button className="account-action-btn" onClick={handleSignOut}>
          <LogOut size={18} /> Sign Out
        </button>
      </div>
      <Navbar/>
    </div>
  );
}