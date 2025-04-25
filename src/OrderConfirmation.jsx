import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './Firebase';
import { getAuth } from 'firebase/auth';
import './UserOrder.css';

const UserOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const auth = getAuth();

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
      <h1>My Orders</h1>
      
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
                <p><strong>Total:</strong> ${order.totalAmount.toFixed(2)}</p>
                <p className="payment-status">{order.paymentStatus === 'paid' ? 'Paid' : 'Payment Pending'}</p>
              </div>
              
              <div className="order-actions">
                <button 
                  className="btn-details" 
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
                <div className="status-label">Processing</div>
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
              
              {selectedOrder.status === "shipped" && (
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
    </div>
  );
};

export default UserOrders;