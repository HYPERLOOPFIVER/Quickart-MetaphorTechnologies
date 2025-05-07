import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './Firebase';
import { getAuth } from 'firebase/auth';
import './UserOrder.css';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import Navbar from './Navbar';
import { useNavigate } from 'react-router-dom';
import { HomeIcon, ShoppingCart, Clock, User } from 'lucide-react'; // Adjust the import based on your icon library
const UserOrders = () => {
  const [orders, setOrders] = useState([]);

  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const auth = getAuth();
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
  }
  ;

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const userId = auth.currentUser?.uid;
        if (!userId) {
          setError("You must be logged in to view orders");
          setLoading(false);
          return;
        }

        const ordersRef = collection(db, "orders");
        const q = query(ordersRef, where("userId", "==", userId));
        const querySnapshot = await getDocs(q);
        
        const fetchedOrders = [];
        querySnapshot.forEach((doc) => {
          fetchedOrders.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort orders by creation date (newest first)
        fetchedOrders.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
        
        setOrders(fetchedOrders);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching orders: ", err);
        setError("Failed to load orders. Please try again later.");
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const confirmDelivery = async (orderId) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        status: "delivered",
        deliveredAt: new Date()
      });
      
      // Update local state
      setOrders(orders.map(order => 
        order.id === orderId 
          ? { ...order, status: "delivered", deliveredAt: new Date() } 
          : order
      ));
      
      alert("Delivery confirmed successfully!");
    } catch (err) {
      console.error("Error confirming delivery: ", err);
      alert("Failed to confirm delivery. Please try again.");
    }
  };

  const confirmPayment = async (orderId) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        paymentStatus: "paid",
        paidAt: new Date()
      });
      
      // Update local state
      setOrders(orders.map(order => 
        order.id === orderId 
          ? { ...order, paymentStatus: "paid", paidAt: new Date() } 
          : order
      ));
      
      alert("Payment confirmed successfully!");
    } catch (err) {
      console.error("Error confirming payment: ", err);
      alert("Failed to confirm payment. Please try again.");
    }
  };

  const cancelOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) {
      return;
    }
    
    setCancelLoading(true);
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        status: "cancelled",
        cancelledAt: new Date()
      });
      
      // Update local state
      setOrders(orders.map(order => 
        order.id === orderId 
          ? { ...order, status: "cancelled", cancelledAt: new Date() } 
          : order
      ));
      
      // If we're viewing this order in detail view, close it
      if (selectedOrder && selectedOrder.id === orderId) {
        closeOrderDetails();
      }
      
      alert("Order cancelled successfully!");
    } catch (err) {
      console.error("Error cancelling order: ", err);
      alert("Failed to cancel order. Please try again.");
    } finally {
      setCancelLoading(false);
    }
  };

  const viewOrderDetails = (order) => {
    setSelectedOrder(order);
  };

  const closeOrderDetails = () => {
    setSelectedOrder(null);
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'pending': return 'Order Placed';
      case 'processing': return 'Preparing';
      case 'shipped': return 'Out for Delivery';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const canCancelOrder = (order) => {
    return ['pending', 'processing'].includes(order.status);
  };

  if (loading) return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Loading your orders...</p>
    </div>
  );
  
  if (error) return <div className="error-container">{error}</div>;
  
  if (orders.length === 0) return (
    <div className="empty-state">
      <img src="/empty-orders.svg" alt="No orders" className="empty-icon" />
      <h2>You haven't placed any orders yet</h2>
      <p>When you place an order, it will appear here</p>
      <button className="btn-primary" onClick={() => window.location.href = '/products'}>
        Start Shopping
      </button>
    </div>
  );

  return (
    <div className="user-orders-container">
      <h1 className='usero'>My Orders</h1>
      
      <div className="orders-list">
        {orders.map((order) => (
          <div key={order.id} className={`order-card ${order.status}`}>
            <div className="order-header">
              <div className="order-id-date">
                <h3>Order #{order.id.slice(0, 8)}</h3>
                <span className="order-date">
                  {new Date(order.createdAt.seconds * 1000).toLocaleDateString()} at {' '}
                  {new Date(order.createdAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
              <span className={`status-badge ${order.status}`}>
                {getStatusText(order.status)}
              </span>
            </div>
            
            <div className="order-items-preview">
              {order.items.slice(0, 3).map((item, index) => (
                <div key={index} className="item-preview">
                  <div className="item-image-container">
                    <img 
                      src={item.imageUrl || "/placeholder-product.png"} 
                      alt={item.name} 
                      className="item-image" 
                      onError={(e) => {e.target.src = "/placeholder-product.png"}}
                    />
                    <span className="item-quantity">{item.quantity}x</span>
                  </div>
                  <p className="item-name">{item.name}</p>
                </div>
              ))}
              {order.items.length > 3 && (
                <div className="more-items">
                  +{order.items.length - 3} more
                </div>
              )}
            </div>
            
            <div className="order-summary">
              <div className="order-total">
                <p><strong>Total:</strong> ₹ {order.totalAmount.toFixed(2)}</p>
                <p className="payment-status">{order.paymentStatus === 'paid' ? 'Paid' : 'Payment Pending'}</p>
              </div>
              
              <div className="order-actions">
              
                
                {canCancelOrder(order) && (
                  <button 
                    className="btn-cancel"
                    onClick={() => cancelOrder(order.id)}
                    disabled={cancelLoading}
                  >
                    {cancelLoading ? 'Cancelling...' : 'Cancel Order'}
                  </button>
                )}
                
                {order.status === "shipped" && (
                  <button 
                    className="btn-confirm-delivery"
                    onClick={() => confirmDelivery(order.id)}
                  >
                    Confirm Delivery
                  </button>
                )}
                
                {order.status === "delivered" && order.paymentStatus === "pending" && order.paymentMethod === "cash" && (
                  <button 
                    className="btn-confirm-payment"
                    onClick={() => confirmPayment(order.id)}
                  >
                    Confirm Payment
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedOrder && (
        <div className="order-details-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Order Details</h2>
              <span className="close-button" onClick={closeOrderDetails}>&times;</span>
            </div>
            
            <div className="order-status-timeline">
              <div className={`status-step ${selectedOrder.status === 'cancelled' ? 'cancelled' : 'completed'}`}>
                <div className="status-icon">✓</div>
                <div className="status-label">Order Placed</div>
                <div className="status-time">
                  {new Date(selectedOrder.createdAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
              
              <div className={`status-step ${selectedOrder.status === 'cancelled' ? 'cancelled' : 
                ['processing', 'shipped', 'delivered'].includes(selectedOrder.status) ? 'completed' : 'pending'}`}>
                <div className="status-icon">✓</div>
                <div className="status-label"> ....Processing</div>
              </div>
              
              <div className={`status-step ${selectedOrder.status === 'cancelled' ? 'cancelled' : 
                ['shipped', 'delivered'].includes(selectedOrder.status) ? 'completed' : 'pending'}`}>
                <div className="status-icon">✓</div>
                <div className="status-label">Out for Delivery</div>
              </div>
              
              <div className={`status-step ${selectedOrder.status === 'cancelled' ? 'cancelled' : 
                selectedOrder.status === 'delivered' ? 'completed' : 'pending'}`}>
                <div className="status-icon">✓</div>
                <div className="status-label">Delivered</div>
                {selectedOrder.deliveredAt && (
                  <div className="status-time">
                    {new Date(selectedOrder.deliveredAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                )}
              </div>
            </div>
            
            <div className="order-info">
              <div className="info-section">
                <h3>Order Information</h3>
                <p><strong>Order ID:</strong> {selectedOrder.id}</p>
                <p><strong>Date:</strong> {new Date(selectedOrder.createdAt.seconds * 1000).toLocaleString()}</p>
                <p><strong>Status:</strong> {getStatusText(selectedOrder.status)}</p>
                <p><strong>Payment Method:</strong> {selectedOrder.paymentMethod}</p>
                <p><strong>Payment Status:</strong> {selectedOrder.paymentStatus}</p>
                {selectedOrder.deliveredAt && (
                  <p><strong>Delivered At:</strong> {new Date(selectedOrder.deliveredAt.seconds * 1000).toLocaleString()}</p>
                )}
                {selectedOrder.paidAt && (
                  <p><strong>Paid At:</strong> {new Date(selectedOrder.paidAt.seconds * 1000).toLocaleString()}</p>
                )}
                {selectedOrder.cancelledAt && (
                  <p><strong>Cancelled At:</strong> {new Date(selectedOrder.cancelledAt.seconds * 1000).toLocaleString()}</p>
                )}
              </div>
              
              <div className="info-section">
                <h3>Shipping Address</h3>
                <p>{selectedOrder.shippingAddress.name}</p>
                <p>{selectedOrder.shippingAddress.street}</p>
                <p>{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.zip}</p>
                <p>{selectedOrder.shippingAddress.country}</p>
                <p>Phone: {selectedOrder.shippingAddress.phone}</p>
              </div>
            </div>
            
            <h3>Order Items</h3>
            <div className="order-items-detail">
              {selectedOrder.items.map((item, index) => (
                <div key={index} className="order-item">
                  <div className="item-image-container">
                    <img 
                      src={item.imageUrl || "/placeholder-product.png"} 
                      alt={item.name} 
                      onError={(e) => {e.target.src = "/placeholder-product.png"}}
                    />
                  </div>
                  <div className="item-details">
                    <h4>{item.name}</h4>
                    <p className="item-price">${item.price.toFixed(2)} x {item.quantity}</p>
                    <p className="item-subtotal">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="order-summary-detail">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>${selectedOrder.subtotal.toFixed(2)}</span>
              </div>
              {selectedOrder.tax && (
                <div className="summary-row">
                  <span>Tax</span>
                  <span>${selectedOrder.tax.toFixed(2)}</span>
                </div>
              )}
              {selectedOrder.shippingCost && (
                <div className="summary-row">
                  <span>Shipping</span>
                  <span>${selectedOrder.shippingCost.toFixed(2)}</span>
                </div>
              )}
              {selectedOrder.discount && (
                <div className="summary-row discount">
                  <span>Discount</span>
                  <span>-${selectedOrder.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="summary-row total">
                <span>Total</span>
                <span>${selectedOrder.totalAmount.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="modal-actions">
              {canCancelOrder(selectedOrder) && (
                <button 
                  className="btn-cancel"
                  onClick={() => cancelOrder(selectedOrder.id)}
                  disabled={cancelLoading}
                >
                  {cancelLoading ? 'Cancelling...' : 'Cancel Order'}
                </button>
              )}
              
              {selectedOrder.status === "delivered" && (
                <button 
                  className="btn-confirm-delivery"
                  onClick={() => {
                    confirmDelivery(selectedOrder.id);
                    closeOrderDetails();
                  }}
                >
                  Confirm Delivery
                </button>
              )}
              
              {selectedOrder.status === "delivered" && selectedOrder.paymentStatus === "pending" && selectedOrder.paymentMethod === "cash" && (
                <button 
                  className="btn-confirm-payment"
                  onClick={() => {
                    confirmPayment(selectedOrder.id);
                    closeOrderDetails();
                  }}
                >
                  Paid Cash To Delivery Person
                </button>
              )}
              
              <button className="btn-close" onClick={closeOrderDetails}>Close</button>
            </div>
          </div>
        </div>
      )}
     <Navbar/>
    </div>
  );
};

export default UserOrders;