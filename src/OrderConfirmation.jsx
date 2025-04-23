import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { db, auth } from './Firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { toast } from 'react-toastify';

const OrderConfirmation = () => {
  const [user] = useAuthState(auth);
  const location = useLocation();
  const navigate = useNavigate();
  const { orderIds, totalAmount, deliveryAddress } = location.state || {};
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!orderIds || !Array.isArray(orderIds)) {
      navigate('/');
      return;
    }

    const fetchOrders = async () => {
      try {
        setLoading(true);
        const ordersData = [];
        
        for (const orderId of orderIds) {
          const orderRef = doc(db, 'orders', orderId);
          const orderSnap = await getDoc(orderRef);
          
          if (orderSnap.exists()) {
            ordersData.push({
              id: orderSnap.id,
              ...orderSnap.data()
            });
          }
        }
        
        setOrders(ordersData);
      } catch (error) {
        toast.error('Error fetching orders: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [orderIds, navigate]);

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    
    try {
      setCancelling(true);
      const orderRef = doc(db, 'orders', orderId);
      
      // Update order status
      await updateDoc(orderRef, {
        status: 'cancelled',
        updatedAt: new Date(),
        cancellationReason: 'Customer requested cancellation'
      });
      
      // Add to cancellation log
      await addDoc(collection(db, 'cancellations'), {
        orderId,
        userId: user.uid,
        cancelledAt: new Date(),
        reason: 'Customer requested cancellation'
      });
      
      // Update shop's order
      const shopOrderRef = doc(db, 'shops', orders.find(o => o.id === orderId).shopId, 'orders', orderId);
      await updateDoc(shopOrderRef, {
        status: 'cancelled',
        updatedAt: new Date()
      });
      
      // Update user's order
      const userOrderRef = doc(db, 'users', user.uid, 'orders', orderId);
      await updateDoc(userOrderRef, {
        status: 'cancelled',
        updatedAt: new Date()
      });
      
      // Create notification for shop
      await addDoc(collection(db, 'notifications'), {
        type: 'order_cancelled',
        orderId,
        shopId: orders.find(o => o.id === orderId).shopId,
        userId: user.uid,
        message: `Order #${orderId.slice(0, 8)} has been cancelled`,
        read: false,
        createdAt: new Date()
      });
      
      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, status: 'cancelled' } : order
      ));
      
      toast.success('Order cancelled successfully');
    } catch (error) {
      toast.error('Error cancelling order: ' + error.message);
    } finally {
      setCancelling(false);
    }
  };

  const handleContactShop = (shopId) => {
    // In a real app, this would open a chat or email interface
    navigate(`/contact-shop/${shopId}`);
  };

  const handleContactSupport = () => {
    navigate('/contact-support');
  };

  const formatDate = (timestamp) => {
    if (!timestamp?.seconds) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleString();
  };

  if (loading) {
    return (
      <div className="order-confirmation">
        <div className="loading-spinner">Loading order details...</div>
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="order-confirmation">
        <div className="error-message">No order found. Please check your order history.</div>
      </div>
    );
  }

  return (
    <div className="order-confirmation">
      <div className="confirmation-header">
        <h1>Order Confirmation</h1>
        <p className="success-message">Thank you for your order!</p>
        <p>We've received your order will process it shortly.</p>
      </div>
      
      <div className="order-summary">
        <h2>Order Summary</h2>
        <div className="summary-details">
          <p><strong>Order Number(s):</strong> {orders.map(o => `#${o.id.slice(0, 8)}`).join(', ')}</p>
          <p><strong>Total Amount:</strong> ${totalAmount?.toFixed(2)}</p>
          <p><strong>Delivery Address:</strong> {deliveryAddress?.formatted}</p>
          <p><strong>Estimated Delivery:</strong> {formatDate(orders[0]?.deliveryTime)}</p>
        </div>
      </div>
      
      {orders.map(order => (
        <div key={order.id} className="order-details-card">
          <div className="order-header">
            <h3>Order #{order.id.slice(0, 8)} - {order.shopName}</h3>
            <span className={`status-badge ${order.status}`}>{order.status}</span>
          </div>
          
          <div className="order-items">
            <h4>Items:</h4>
            <ul>
              {order.items.map((item, index) => (
                <li key={index} className="order-item">
                  <div className="item-image">
                    {item.imageUrl && <img src={item.imageUrl} alt={item.name} />}
                  </div>
                  <div className="item-details">
                    <p>{item.name}</p>
                    <p>${item.price.toFixed(2)} × {item.quantity}</p>
                    <p>Subtotal: ${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="order-totals">
            <p><strong>Subtotal:</strong> ${order.totalAmount.toFixed(2)}</p>
            <p><strong>Delivery Fee:</strong> ${order.deliveryFee.toFixed(2)}</p>
            <p><strong>Total:</strong> ${(order.totalAmount + order.deliveryFee).toFixed(2)}</p>
          </div>
          
          <div className="order-actions">
            {order.status === 'pending' && (
              <button 
                onClick={() => handleCancelOrder(order.id)}
                disabled={cancelling}
                className="cancel-btn"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Order'}
              </button>
            )}
            
            <button 
              onClick={() => handleContactShop(order.shopId)}
              className="contact-btn"
            >
              Contact {order.shopName}
            </button>
          </div>
        </div>
      ))}
      
      <div className="support-section">
        <h3>Need Help?</h3>
        <p>If you have any questions about your order, our customer care team is here to help.</p>
        <button onClick={handleContactSupport} className="support-btn">
          Contact Customer Support
        </button>
      </div>
      
      <div className="continue-shopping">
        <button onClick={() => navigate('/')} className="shop-btn">
          Continue Shopping
        </button>
      </div>
    </div>
  );
};

export default OrderConfirmation;