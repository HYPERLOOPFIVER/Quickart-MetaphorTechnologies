import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from './Firebase';
import { getAuth } from 'firebase/auth';
import './UserOrder.css';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import Navbar from './Navbar';
import { useNavigate } from 'react-router-dom';
import { HomeIcon, ShoppingCart, Clock, User } from 'lucide-react';

const UserOrders = () => {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();
  const navigate = useNavigate();

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
      
      toast.success("Delivery confirmed successfully!");
    } catch (err) {
      console.error("Error confirming delivery: ", err);
      toast.error("Failed to confirm delivery. Please try again.");
    }
  };

  const confirmOrderReceived = async (orderId) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        status: "paymentneed",
        receivedAt: new Date()
      });
      
      // Update local state
      setOrders(orders.map(order => 
        order.id === orderId 
          ? { ...order, status: "paymentneed", receivedAt: new Date() } 
          : order
      ));
      
      toast.success("Order received successfully!");
    } catch (err) {
      console.error("Error confirming order received: ", err);
      toast.error("Failed to confirm order received. Please try again.");
    }
  };

  const confirmPayment = async (orderId) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        status: "payment",
        paymentStatus: "wait",
        paidAt: new Date()
      });
      
      // Update local state
      setOrders(orders.map(order => 
        order.id === orderId 
          ? { ...order, status: "payment", paymentStatus: "paid", paidAt: new Date() } 
          : order
      ));
      
      toast.success("Payment confirmed successfully!");
    } catch (err) {
      console.error("Error confirming payment: ", err);
      toast.error("Failed to confirm payment. Please try again.");
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
      
      toast.success("Order cancelled successfully!");
    } catch (err) {
      console.error("Error cancelling order: ", err);
      toast.error("Failed to cancel order. Please try again.");
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
      case 'arrived': return 'Order Arrived';
      case 'paymentneed': return 'Payment Needed';
      case 'payment': return 'Payment Complete';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return 'status-pending';
      case 'processing': return 'status-processing';
      case 'shipped': return 'status-shipped';
      case 'arrived': return 'status-arrived';
      case 'paymentneed': return 'status-paymentneed';
      case 'payment': return 'status-payment';
      case 'delivered': return 'status-delivered';
      case 'cancelled': return 'status-cancelled';
      default: return '';
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
              <span className={`status-badge ${getStatusColor(order.status)}`}>
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
                <button 
                  className="btn-view-details"
                  onClick={() => viewOrderDetails(order)}
                >
                  View Details
                </button>
                
                {canCancelOrder(order) && (
                  <button 
                    className="btn-cancel"
                    onClick={() => cancelOrder(order.id)}
                    disabled={cancelLoading}
                  >
                    {cancelLoading ? 'Cancelling...' : 'Cancel Order'}
                  </button>
                )}
                
                {order.status === "arrived" && (
                  <button 
                    className="btn-confirm-received"
                    onClick={() => confirmOrderReceived(order.id)}
                  >
                    Got My Order
                  </button>
                )}
                
                {order.status === "paymentneed" && order.paymentMethod === "cash" && (
                  <button 
                    className="btn-confirm-payment"
                    onClick={() => confirmPayment(order.id)}
                  >
                    Paid Cash To Delivery Person
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
                ['processing', 'shipped', 'arrived', 'paymentneed', 'payment', 'delivered'].includes(selectedOrder.status) ? 'completed' : 'pending'}`}>
                <div className="status-icon">✓</div>
                <div className="status-label">Processing</div>
              </div>
              
              <div className={`status-step ${selectedOrder.status === 'cancelled' ? 'cancelled' : 
                ['shipped', 'arrived', 'paymentneed', 'payment', 'delivered'].includes(selectedOrder.status) ? 'completed' : 'pending'}`}>
                <div className="status-icon">✓</div>
                <div className="status-label">Out for Delivery</div>
              </div>
              
              <div className={`status-step ${selectedOrder.status === 'cancelled' ? 'cancelled' : 
                ['arrived', 'paymentneed', 'payment', 'delivered'].includes(selectedOrder.status) ? 'completed' : 'pending'}`}>
                <div className="status-icon">✓</div>
                <div className="status-label">Arrived</div>
                {selectedOrder.arrivedAt && (
                  <div className="status-time">
                    {new Date(selectedOrder.arrivedAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                )}
              </div>
              
              <div className={`status-step ${selectedOrder.status === 'cancelled' ? 'cancelled' : 
                ['paymentneed', 'payment', 'delivered'].includes(selectedOrder.status) ? 'completed' : 'pending'}`}>
                <div className="status-icon">✓</div>
                <div className="status-label">Order Received</div>
                {selectedOrder.receivedAt && (
                  <div className="status-time">
                    {new Date(selectedOrder.receivedAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                )}
              </div>
              
              <div className={`status-step ${selectedOrder.status === 'cancelled' ? 'cancelled' : 
                ['payment', 'delivered'].includes(selectedOrder.status) ? 'completed' : 'pending'}`}>
                <div className="status-icon">✓</div>
                <div className="status-label">Payment</div>
                {selectedOrder.paidAt && (
                  <div className="status-time">
                    {new Date(selectedOrder.paidAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                )}
              </div>
              
              <div className={`status-step ${selectedOrder.status === 'cancelled' ? 'cancelled' : 
                selectedOrder.status === 'delivered' ? 'completed' : 'pending'}`}>
                <div className="status-icon">✓</div>
                <div className="status-label">Completed</div>
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
                {selectedOrder.arrivedAt && (
                  <p><strong>Arrived At:</strong> {new Date(selectedOrder.arrivedAt.seconds * 1000).toLocaleString()}</p>
                )}
                {selectedOrder.receivedAt && (
                  <p><strong>Received At:</strong> {new Date(selectedOrder.receivedAt.seconds * 1000).toLocaleString()}</p>
                )}
                {selectedOrder.paidAt && (
                  <p><strong>Paid At:</strong> {new Date(selectedOrder.paidAt.seconds * 1000).toLocaleString()}</p>
                )}
                {selectedOrder.deliveredAt && (
                  <p><strong>Delivered At:</strong> {new Date(selectedOrder.deliveredAt.seconds * 1000).toLocaleString()}</p>
                )}
                {selectedOrder.cancelledAt && (
                  <p><strong>Cancelled At:</strong> {new Date(selectedOrder.cancelledAt.seconds * 1000).toLocaleString()}</p>
                )}
              </div>
              
              <div className="info-section">
                <h3>Shipping Address</h3>
                <p>{selectedOrder.shippingAddress?.name || selectedOrder.userName || 'N/A'}</p>
                <p>{selectedOrder.shippingAddress?.street || selectedOrder.deliveryAddress?.street || 'N/A'}</p>
                <p>
                  {selectedOrder.shippingAddress?.city || selectedOrder.deliveryAddress?.city || 'N/A'}, 
                  {' '}{selectedOrder.shippingAddress?.state || selectedOrder.deliveryAddress?.state || 'N/A'} 
                  {' '}{selectedOrder.shippingAddress?.zip || selectedOrder.deliveryAddress?.pincode || 'N/A'}
                </p>
                <p>{selectedOrder.shippingAddress?.country || 'N/A'}</p>
                <p>Phone: {selectedOrder.shippingAddress?.phone || 'N/A'}</p>
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
                    <p className="item-price">₹{item.price?.toFixed(2) || '0.00'} x {item.quantity}</p>
                    <p className="item-subtotal">₹{((item.price || 0) * (item.quantity || 0)).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="order-summary-detail">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>₹{(selectedOrder.subtotal || selectedOrder.totalAmount || 0).toFixed(2)}</span>
              </div>
              {selectedOrder.tax && (
                <div className="summary-row">
                  <span>Tax</span>
                  <span>₹{selectedOrder.tax.toFixed(2)}</span>
                </div>
              )}
              {selectedOrder.deliveryFee && (
                <div className="summary-row">
                  <span>Delivery Fee</span>
                  <span>₹{selectedOrder.deliveryFee.toFixed(2)}</span>
                </div>
              )}
              {selectedOrder.discount && (
                <div className="summary-row discount">
                  <span>Discount</span>
                  <span>-₹{selectedOrder.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="summary-row total">
                <span>Total</span>
                <span>₹{selectedOrder.totalAmount.toFixed(2)}</span>
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
              
              {selectedOrder.status === "arrived" && (
                <button 
                  className="btn-confirm-received"
                  onClick={() => {
                    confirmOrderReceived(selectedOrder.id);
                    closeOrderDetails();
                  }}
                >
                  Got My Order
                </button>
              )}
              
              {selectedOrder.status === "paymentneed" && selectedOrder.paymentMethod === "cash" && (
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