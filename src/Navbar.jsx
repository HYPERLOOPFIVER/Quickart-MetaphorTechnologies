import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, updateDoc, addDoc, deleteDoc, query, where, limit, setDoc, writeBatch, documentId } from 'firebase/firestore';
import { db, auth } from './Firebase';
import { Link, useNavigate } from 'react-router-dom';
import { Home as HomeIcon, Search, ShoppingCart, User, Heart, X, Clock, CheckCircle, Truck } from 'lucide-react';
import './Nav.css';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { increment } from "firebase/firestore";

// Manual category list
const categories = [
  { id: 'fruits', name: 'Fruits', icon: '🍎', image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&q=80&w=1740&ixlib=rb-4.0.3' },
  { id: 'vegetables', name: 'Vegetables', icon: '🥦', image: 'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?auto=format&fit=crop&q=80&w=1932&ixlib=rb-4.0.3' },
  { id: 'dairy', name: 'Dairy', icon: '🥛', image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=1887&ixlib=rb-4.0.3' },
  { id: 'bakery', name: 'Bakery', icon: '🍞', image: 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?auto=format&fit=crop&q=80&w=1932&ixlib=rb-4.0.3' },
  { id: 'meat', name: 'Meat', icon: '🥩', image: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&q=80&w=1740&ixlib=rb-4.0.3' },
  { id: 'snacks', name: 'Snacks', icon: '🍿', image: 'https://images.unsplash.com/photo-1599629954294-14df9f8291bc?auto=format&fit=crop&q=80&w=1964&ixlib=rb-4.0.3' }
];

export default function Navbar() {
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

  useEffect(() => {
    // Check authentication state
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUserLoggedIn(true);
        await fetchUserData(user.uid);
        await fetchCartItems(user.uid);
        await fetchWishlistItems(user.uid);
        await loadSearchHistory(user.uid);
        await fetchActiveOrders(user.uid);
      } else {
        setUserLoggedIn(false);
        setUserName('');
        setCartItems([]);
        setWishlistItems([]);
        setSearchHistory([]);
        setActiveOrders([]);
      }
    });

    // Fetch all products
    fetchProducts();
    
    // Generate delivery time slots
    generateTimeSlots();
    
    // Load recently viewed from localStorage
    const storedRecentlyViewed = localStorage.getItem('recentlyViewed');
    if (storedRecentlyViewed) {
      try {
        setRecentlyViewed(JSON.parse(storedRecentlyViewed));
      } catch (error) {
        console.error("Error parsing recently viewed items:", error);
        localStorage.removeItem('recentlyViewed');
      }
    }

    return () => unsubscribe();
  }, []);

  const fetchUserData = async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserName(userData.displayName || userData.firstName || '');
        
        if (userData.address) {
          setUserAddress(userData.address);
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const fetchActiveOrders = async (userId) => {
    try {
      const ordersRef = collection(db, 'users', userId, 'orders');
      const q = query(ordersRef, where('status', 'in', ['pending', 'confirmed', 'preparing', 'out_for_delivery']));
      const querySnapshot = await getDocs(q);
      
      const orders = [];
      for (const doc of querySnapshot.docs) {
        const orderData = doc.data();
        
        try {
          let shopName = 'Unknown Shop';
          if (orderData.shopId) {
            const shopDoc = await getDoc(doc(db, 'shops', orderData.shopId));
            if (shopDoc.exists()) {
              shopName = shopDoc.data().name;
            }
          }
          
          orders.push({
            id: doc.id,
            ...orderData,
            shopName
          });
        } catch (error) {
          console.error("Error fetching shop details for order:", error);
          orders.push({
            id: doc.id,
            ...orderData,
            shopName: 'Unknown Shop'
          });
        }
      }
      
      setActiveOrders(orders);
    } catch (error) {
      console.error("Error fetching active orders:", error);
    }
  };

  const loadSearchHistory = async (userId) => {
    try {
      const searchHistoryRef = collection(db, 'users', userId, 'searchHistory');
      const searchHistorySnapshot = await getDocs(query(searchHistoryRef, limit(5)));
      
      const searches = searchHistorySnapshot.docs.map(doc => doc.data().query);
      setSearchHistory(searches);
    } catch (error) {
      console.error("Error loading search history:", error);
    }
  };

  const saveSearchToHistory = async (searchTerm) => {
    if (!auth.currentUser || !searchTerm.trim()) return;
    
    try {
      const userId = auth.currentUser.uid;
      const searchHistoryRef = collection(db, 'users', userId, 'searchHistory');
      
      // Check if search term already exists
      const existingQuery = query(searchHistoryRef, where('query', '==', searchTerm.trim()));
      const existingDocs = await getDocs(existingQuery);
      
      if (existingDocs.empty) {
        // Add new search term
        await addDoc(searchHistoryRef, {
          query: searchTerm.trim(),
          timestamp: new Date()
        });
      } else {
        // Update timestamp of existing search
        const docId = existingDocs.docs[0].id;
        await updateDoc(doc(searchHistoryRef, docId), {
          timestamp: new Date()
        });
      }
      
      // Refresh search history
      loadSearchHistory(userId);
    } catch (error) {
      console.error("Error saving search history:", error);
    }
  };

  const fetchWishlistItems = async (userId) => {
    try {
      const wishlistRef = collection(db, 'users', userId, 'wishlist');
      const wishlistSnapshot = await getDocs(wishlistRef);
      
      const wishlistData = [];
      for (const wishlistDoc of wishlistSnapshot.docs) {
        wishlistData.push({
          id: wishlistDoc.id,
          productId: wishlistDoc.data().productId
        });
      }
      
      setWishlistItems(wishlistData);
    } catch (error) {
      console.error("Error fetching wishlist items:", error);
    }
  };

  const fetchProducts = async (categoryId = null) => {
    try {
      setLoading(true);
      let productsQuery;
      
      if (categoryId) {
        setSelectedCategory(categoryId);
        productsQuery = query(
          collection(db, 'products'), 
          where('category', '==', categoryId)
        );
      } else {
        setSelectedCategory(null);
        productsQuery = collection(db, 'products');
      }
      
      const querySnapshot = await getDocs(productsQuery);
      const products = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setAllProducts(products);
      
      // Get trending products - products with high ratings or special trending flag
      const trending = products
        .filter(p => p.trending || (p.rating && p.rating >= 4.5))
        .slice(0, 8);
      
      setTrendingProducts(trending.length ? trending : products.slice(0, 8));
      setFilteredProducts(products);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching products:", error);
      setLoading(false);
    }
  };

  // Improved search functionality
  useEffect(() => {
    if (!allProducts || allProducts.length === 0) return;
    
    let results = [...allProducts];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim();
      results = allProducts.filter(product => 
        (product.name && product.name.toLowerCase().includes(query)) ||
        (product.description && product.description.toLowerCase().includes(query)) ||
        (product.category && product.category.toLowerCase().includes(query)) ||
        (product.tags && Array.isArray(product.tags) && product.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }
    
    if (selectedCategory) {
      results = results.filter(product => product.category === selectedCategory);
    }
    
    if (useCurrentLocation && userAddress.city) {
      results = results.filter(product => 
        !product.availableCities || 
        (Array.isArray(product.availableCities) && product.availableCities.includes(userAddress.city))
      );
    }
    
    setFilteredProducts(results);
  }, [searchQuery, useCurrentLocation, allProducts, userAddress.city, selectedCategory]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      saveSearchToHistory(searchQuery);
    }
  };

  const selectSearchTerm = (term) => {
    setSearchQuery(term);
    setSearchFocused(false);
    if (term.trim()) {
      saveSearchToHistory(term);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const generateTimeSlots = () => {
    const slots = [];
    const now = new Date();
    let hour = now.getHours();
    
    if (now.getMinutes() > 45) hour += 1;
    
    for (let i = 0; i < 12; i++) {
      const slotHour = (hour + i) % 24;
      slots.push(`${slotHour}:00 - ${slotHour}:15`);
      slots.push(`${slotHour}:15 - ${slotHour}:30`);
      slots.push(`${slotHour}:30 - ${slotHour}:45`);
      slots.push(`${slotHour}:45 - ${(slotHour + 1) % 24}:00`);
    }
    
    setTimeSlots(slots);
    setSelectedSlot(slots[0]);
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setUserAddress(prev => ({
      ...prev,
      [name]: value,
      formatted: name === 'formatted' ? value : `${prev.street || ''}, ${prev.city || ''}, ${prev.state || ''}, ${prev.pincode || ''}`.replace(/^,\s*|,\s*$/g, '').replace(/,\s*,/g, ',')
    }));
  };

  const saveAddress = async () => {
    if (auth.currentUser) {
      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, {
          address: userAddress
        });
        setIsEditingAddress(false);
        toast.success("Address saved successfully!");
      } catch (error) {
        console.error("Error updating address:", error);
        toast.error("Failed to save address");
      }
    } else {
      toast.warning("Please login to save your address");
      navigate('/login');
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`
          );
          const data = await response.json();
          
          if (data.address) {
            const newAddress = {
              formatted: data.display_name,
              street: `${data.address.road || ''} ${data.address.house_number || ''}`.trim(),
              city: data.address.city || data.address.town || data.address.village || '',
              state: data.address.state || '',
              pincode: data.address.postcode || '',
            };
            
            setUserAddress(newAddress);
            
            if (auth.currentUser) {
              const userRef = doc(db, 'users', auth.currentUser.uid);
              await updateDoc(userRef, { address: newAddress });
              toast.success("Location updated successfully");
            }
          }
        } catch (error) {
          console.error("Error fetching location data:", error);
          toast.error("Failed to get your location");
        }
      }, (error) => {
        console.error("Geolocation error:", error);
        toast.error("Could not access your location. Please check your browser settings.");
      });
    } else {
      toast.error("Geolocation is not supported by this browser.");
    }
  };

  const toggleLocationMode = () => {
    setUseCurrentLocation(prev => !prev);
    if (!useCurrentLocation) {
      getCurrentLocation();
    }
  };

  // Improved cart fetching with error handling
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

  // Add to cart with validation
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

      // Refresh cart items
      await fetchCartItems(userId);
      return true;
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add item to cart");
      return false;
    }
  };

  // Handle quantity change with validation
  const handleQuantityChange = async (productId, change) => {
    if (!auth.currentUser) {
      toast.info("Please log in to update your cart");
      navigate('/login');
      return;
    }
    
    try {
      const userId = auth.currentUser.uid;
      const cartRef = doc(db, 'carts', userId);
      const cartSnap = await getDoc(cartRef);
      
      if (!cartSnap.exists()) {
        await setDoc(cartRef, {
          items: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          total: 0
        });
        return;
      }
      
      const cartData = cartSnap.data();
      const items = [...(cartData.items || [])];
      const itemIndex = items.findIndex(item => 
        item && item.productId === productId
      );
      
      if (itemIndex === -1) return;
      
      const updatedItems = [...items];
      const currentItem = updatedItems[itemIndex];
      const newQuantity = (currentItem.quantity || 0) + change;
      
      if (newQuantity <= 0) {
        updatedItems.splice(itemIndex, 1);
        toast.info(`Removed ${currentItem.name || 'item'} from cart`);
      } else {
        updatedItems[itemIndex] = {
          ...currentItem,
          quantity: newQuantity
        };
      }
      
      // Calculate new total
      const total = updatedItems.reduce((sum, item) => {
        return sum + ((item.price || 0) * (item.quantity || 0));
      }, 0);
      
      await updateDoc(cartRef, {
        items: updatedItems.filter(item => item), // Ensure no undefined
        updatedAt: new Date(),
        total: total
      });
      
      // Refresh cart items
      await fetchCartItems(userId);
      
    } catch (error) {
      console.error("Error updating quantity:", error);
      toast.error("Failed to update quantity");
    }
  };

  // Remove item from cart
  const removeFromCart = async (productId) => {
    if (!auth.currentUser) {
      toast.info("Please log in to update your cart");
      navigate('/login');
      return;
    }
    
    try {
      const userId = auth.currentUser.uid;
      const cartRef = doc(db, 'carts', userId);
      const cartSnap = await getDoc(cartRef);
      
      if (!cartSnap.exists()) return;
      
      const cartData = cartSnap.data();
      const items = [...(cartData.items || [])];
      
      // Find item name before removal for toast
      const itemToRemove = items.find(item => item.productId === productId);
      const itemName = itemToRemove ? itemToRemove.name : 'Item';
      
      const updatedItems = items.filter(item => item.productId !== productId);
      
      // Calculate new total
      const total = updatedItems.reduce((sum, item) => {
        return sum + ((item.price || 0) * (item.quantity || 0));
      }, 0);
      
      await updateDoc(cartRef, {
        items: updatedItems,
        updatedAt: new Date(),
        total: total
      });
      
      toast.success(`${itemName} removed from cart`);
      
      // Refresh cart items
      await fetchCartItems(userId);
      
    } catch (error) {
      console.error("Error removing item from cart:", error);
      toast.error("Failed to remove item from cart");
    }
  };

  const toggleAddToWishlist = async (productId) => {
    if (!userLoggedIn) {
      toast.info("Please log in to add to wishlist");
      navigate('/login');
      return;
    }
    
    try {
      const userId = auth.currentUser.uid;
      const isInWishlist = wishlistItems.some(item => item.productId === productId);
      
      if (isInWishlist) {
        // Remove from wishlist
        const wishlistItemId = wishlistItems.find(item => item.productId === productId).id;
        await deleteDoc(doc(db, 'users', userId, 'wishlist', wishlistItemId));
        toast.success("Removed from wishlist");
      } else {
        // Add to wishlist
        await addDoc(collection(db, 'users', userId, 'wishlist'), {
          productId: productId,
          addedAt: new Date()
        });
        toast.success("Added to wishlist");
      }
      
      // Refresh wishlist
      fetchWishlistItems(userId);
    } catch (error) {
      console.error("Error updating wishlist:", error);
      toast.error("Failed to update wishlist");
    }
  };

  const handleProductClick = (product) => {
    if (!product || !product.id) return;
    
    try {
      const viewed = [...recentlyViewed];
      const existingIndex = viewed.findIndex(item => item && item.id === product.id);
      
      if (existingIndex !== -1) {
        viewed.splice(existingIndex, 1);
      }
      
      viewed.unshift(product);
      
      const newRecentlyViewed = viewed.slice(0, 5);
      setRecentlyViewed(newRecentlyViewed);
      localStorage.setItem('recentlyViewed', JSON.stringify(newRecentlyViewed));
    } catch (error) {
      console.error("Error updating recently viewed:", error);
    }
  };

  const getTotalCartItems = () => {
    return cartItems.reduce((total, item) => total + (item.quantity || 0), 0);
  };

  const getTotalCartPrice = () => {
    return cartItems.reduce((total, item) => {
      return total + ((item.product?.price || 0) * (item.quantity || 0));
    }, 0);
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      toast.warning("Your cart is empty");
      return;
    }
    
    if (!userAddress.formatted) {
      toast.warning("Please set your delivery address first");
      setIsEditingAddress(true);
      return;
    }
  
    // Add validation for card payment if needed
    if (selectedPaymentMethod === 'card') {
      if (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvc || !cardDetails.name) {
        toast.warning("Please enter your complete card details");
        return;
      }
      
      // Extract last4 from card number
      cardDetails.last4 = cardDetails.number.slice(-4);
      // Set a placeholder brand based on first digit
      const firstDigit = cardDetails.number.charAt(0);
      if (firstDigit === '4') cardDetails.brand = 'Visa';
      else if (firstDigit === '5') cardDetails.brand = 'Mastercard';
      else if (firstDigit === '3') cardDetails.brand = 'Amex';
      else cardDetails.brand = 'Card';
    }
  
    try {
      const userId = auth.currentUser.uid;
      const batch = writeBatch(db);
      
      // Group cart items by shopId
      const itemsByShop = {};
      cartItems.forEach(item => {
        const shopId = item.product?.shopId || 'default';
        if (!itemsByShop[shopId]) {
          itemsByShop[shopId] = [];
        }
        itemsByShop[shopId].push({
          productId: item.productId,
          name: item.product?.name || 'Unknown Product',
          quantity: item.quantity || 0,
          price: item.product?.price || 0,
          imageUrl: item.product?.imageUrl || '',
          shopId: item.product?.shopId || 'default'
        });
      });
  
      // Create orders for each shop
      const orderIds = [];
      const shopOrders = [];
  
      for (const shopId in itemsByShop) {
        const shopItems = itemsByShop[shopId];
        const shopTotal = shopItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Get shopkeeper details
        let shopData = { shopName: 'Default Shop' };
        try {
          const shopRef = doc(db, 'shops', shopId);
          const shopSnap = await getDoc(shopRef);
          if (shopSnap.exists()) {
            shopData = shopSnap.data();
          }
        } catch (error) {
          console.error("Error fetching shop data:", error);
        }
        
        // Create order document
        const orderRef = doc(collection(db, 'orders'));
        orderIds.push(orderRef.id);
        
        const orderData = {
          orderId: orderRef.id,
          userId,
          userEmail: auth.currentUser.email || '',
          userName: auth.currentUser.displayName || userName || 'Customer',
          shopId,
          shopName: shopData.shopName,
          shopkeeperId: shopId,
          items: shopItems,
          totalAmount: shopTotal,
          deliveryFee: shopTotal > 100 ? 0 : 20,
          status: 'pending',
          deliveryAddress: userAddress,
          deliveryTime: selectedSlot,
          createdAt: new Date(),
          updatedAt: new Date(),
          paymentMethod: selectedPaymentMethod,
          paymentStatus: selectedPaymentMethod === 'cash' ? 'pending' : 'paid',
          customerNotes: orderNotes
        };
  
        // Process payment if using card
        if (selectedPaymentMethod === 'card') {
          orderData.paymentStatus = 'paid';
          orderData.paymentDetails = {
            last4: cardDetails.last4,
            brand: cardDetails.brand
          };
        }
  
        // Add to main orders collection
        batch.set(orderRef, orderData);
  
        // Add to user's orders subcollection
       
      // Add to user's orders subcollection
      const userOrderRef = doc(collection(db, 'users', userId, 'orders'), orderRef.id);
      batch.set(userOrderRef, orderData);
      
      // Add to shop's orders subcollection
      const shopOrderRef = doc(collection(db, 'shops', shopId, 'orders'), orderRef.id);
      batch.set(shopOrderRef, orderData);
      
      // Save this order for UI update
      shopOrders.push(orderData);
      
      // Update product inventory
      for (const item of shopItems) {
        if (item.productId) {
          const productRef = doc(db, 'products', item.productId);
          batch.update(productRef, {
            inventory: increment(-item.quantity),
            soldCount: increment(item.quantity)
          });
        }
      }
    }

    // Clear the cart
    const cartRef = doc(db, 'carts', userId);
    batch.update(cartRef, {
      items: [],
      updatedAt: new Date(),
      total: 0
    });
    
    // Commit all operations
    await batch.commit();
    
    // Update local state
    setCartItems([]);
    setIsCartOpen(false);
    setOrderNotes('');
    
    // Update active orders
    setActiveOrders(prev => [...shopOrders, ...prev]);
    
    // Show success message
    toast.success(`Order${orderIds.length > 1 ? 's' : ''} placed successfully!`);
    
    // Navigate to orders page
    navigate('/orders');
    
  } catch (error) {
    console.error("Error during checkout:", error);
    toast.error("Failed to place order. Please try again.");
  }
};

const toggleCart = () => {
  setIsCartOpen(!isCartOpen);
};

const redirectToProduct = (productId) => {
  navigate(`/product/${productId}`);
};

const handleSelectCategory = (categoryId) => {
  fetchProducts(categoryId);
};

// Component rendering starts here
return (
  <div className="home">

    
    {/* Shopping Cart Sidebar */}
    {isCartOpen && (
      <div className="cart-ovrlay">
        <div className="cart-sidebar">
          <div className="cart-header">
            <h3>Shopping Cart ({getTotalCartItems()})</h3>
            <button className="close-cart" onClick={toggleCart}>
              <X size={24} />
            </button>
          </div>
          
          {cartItems.length === 0 ? (
            <div className="empty-cart">
              <ShoppingCart size={64} className="empty-cart-icon" />
              <p>Your cart is empty</p>
              <button className="start-shopping" onClick={toggleCart}>Start Shopping</button>
            </div>
          ) : (
            <>
              <div className="cart-items">
                {cartItems.map((item) => (
                  <div key={item.productId} className="cart-item">
                    <img 
                      src={item.product?.imageUrl || 'https://via.placeholder.com/50'} 
                      alt={item.product?.name} 
                      className="cart-item-image"
                      onClick={() => {
                        toggleCart();
                        redirectToProduct(item.productId);
                      }}
                    />
                    <div className="cart-item-details">
                      <div 
                        className="cart-item-name"
                        onClick={() => {
                          toggleCart();
                          redirectToProduct(item.productId);
                        }}
                      >
                        {item.product?.name || 'Unknown Product'}
                      </div>
                      <div className="cart-item-weight">{item.product?.weight || ''}</div>
                      <div className="cart-item-price">₹{(item.product?.price || 0).toFixed(2)}</div>
                    </div>
                    <div className="cart-item-controls">
                      <div className="quantity-controls">
                        <button 
                          className="quantity-btn"
                          onClick={() => handleQuantityChange(item.productId, -1)}
                        >
                          -
                        </button>
                        <span className="quantity">{item.quantity}</span>
                        <button 
                          className="quantity-btn"
                          onClick={() => handleQuantityChange(item.productId, 1)}
                        >
                          +
                        </button>
                      </div>
                      <button 
                        className="remove-item"
                        onClick={() => removeFromCart(item.productId)}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              
              
              <div className="order-notes">
                <h4>Order Notes (Optional)</h4>
                <textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Special instructions for delivery..."
                  className="notes-input"
                ></textarea>
              </div>
              
              <div className="payment-method-selection">
                <h4>Payment Method</h4>
                <div className="payment-options">
                  <label className="payment-option">
                    <input
                      type="radio"
                      name="payment"
                      value="cash"
                      checked={selectedPaymentMethod === 'cash'}
                      onChange={() => setSelectedPaymentMethod('cash')}
                    />
                    <div className="payment-option-content">
                      <span className="payment-option-icon">💵</span>
                      <span className="payment-label">Cash on Delivery</span>
                    </div>
                  </label>
                  
                  <label className="payment-option">
                  
                    <div className="payment-option-content">
                      <span className="payment-option-icon">💳</span>
                      <span className="payment-label">Credit/Debit Card Not Availible Yet.</span>
                    </div>
                  </label>
                </div>
                
                {selectedPaymentMethod === 'card' && (
                  <div className="card-details">
                    <input
                      type="text"
                      placeholder="Card Number"
                      value={cardDetails.number}
                      onChange={(e) => setCardDetails({...cardDetails, number: e.target.value})}
                      className="card-input"
                    />
                    <div className="card-row">
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={cardDetails.expiry}
                        onChange={(e) => setCardDetails({...cardDetails, expiry: e.target.value})}
                        className="card-input expiry"
                      />
                      <input
                        type="text"
                        placeholder="CVC"
                        value={cardDetails.cvc}
                        onChange={(e) => setCardDetails({...cardDetails, cvc: e.target.value})}
                        className="card-input cvc"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Cardholder Name"
                      value={cardDetails.name}
                      onChange={(e) => setCardDetails({...cardDetails, name: e.target.value})}
                      className="card-input"
                    />
                  </div>
                )}
              </div>
              
              <div className="cart-summary">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>₹{getTotalCartPrice().toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span>Delivery Fee</span>
                  <span>{getTotalCartPrice() > 100 ? 'FREE' : '₹80.00'}</span>
                </div>
                <div className="summary-row total">
                  <span>Total</span>
                  <span>₹{(getTotalCartPrice() + (getTotalCartPrice() > 100 ? 0 : 20)).toFixed(2)}</span>
                </div>
                <button 
                  className="checkout-button"
                  onClick={handleCheckout}
                >
                  Proceed to Checkout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )}
    
    {/* Bottom Navigation */}
    <nav className="bottom-nav">
      <Link to="/" className="nav-item active">
        <HomeIcon size={22} />
        
      </Link>
      <Link to="/categories" className="nav-item">
    <Search size={22} />
        
      </Link>
      <Link to="/cart" className="nav-item cart-nav-item" onClick={(e) => { e.preventDefault(); toggleCart(); }}>
        <div className="cart-icon-container">
          <ShoppingCart size={22} />
          {cartItems.length > 0 && <span className="cart-nav-badge">{getTotalCartItems()}</span>}
        </div>
        
      </Link>
      <Link to="/Yourorders" className="nav-item">
        <Clock size={22} />
        
      </Link>
      <Link to="/profile" className="nav-item">
        <User size={22} />
        
      </Link>
    </nav>
  </div>
);
}