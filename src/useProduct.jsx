import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export const useProducts = (category, userLocation) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!userLocation || !userLocation.city) {
        setLoading(false);
        return;
      }

      try {
        // Step 1: Find shopkeepers in the user's city
        const shopkeepersRef = collection(db, "shopkeepers");
        const shopkeepersQuery = query(
          shopkeepersRef, 
          where("address.city", "==", userLocation.city)
        );
        
        const shopkeepersSnapshot = await getDocs(shopkeepersQuery);
        const shopkeeperIds = [];
        
        shopkeepersSnapshot.forEach(doc => {
          shopkeeperIds.push(doc.id);
        });

        if (shopkeeperIds.length === 0) {
          setProducts([]);
          setLoading(false);
          return;
        }

        // Step 2: Get products from these shopkeepers with the specified category
        const productsRef = collection(db, "products");
        const productsQuery = query(
          productsRef,
          where("category", "==", category),
          where("shopkeeperId", "in", shopkeeperIds)
        );

        const productsSnapshot = await getDocs(productsQuery);
        const productsList = [];
        
        productsSnapshot.forEach(doc => {
          productsList.push({ id: doc.id, ...doc.data() });
        });

        setProducts(productsList);
      } catch (err) {
        console.error("Error fetching products:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (userLocation) {
      fetchProducts();
    }
  }, [category, userLocation]);

  return { products, loading, error };
};

// components/ProductCard.jsx - Reusable product card component
import React from 'react';

const ProductCard = ({ product }) => {
  return (
    <div className="product-card">
      {product.imageUrl && (
        <img 
          src={product.imageUrl} 
          alt={product.name} 
          className="product-image"
        />
      )}
      <h3 className="product-name">{product.name}</h3>
      <p className="product-price">₹{product.price.toFixed(2)}</p>
      {product.discount > 0 && (
        <span className="product-discount">{product.discount}% OFF</span>
      )}
      <p className="product-shop">{product.shopName}</p>
      <button className="add-to-cart-btn">Add to Cart</button>
    </div>
  );
};

export default ProductCard;
