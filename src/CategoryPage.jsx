import React from 'react';
import { useUserLocation } from '../hooks/useUserLocation';
import { useProducts } from '../hooks/useProducts';
import ProductCard from './ProductCard';
import Navbar from './Navbar';
const CategoryPage = ({ category, title }) => {
  const { userLocation, loading: locationLoading, error: locationError } = useUserLocation();
  const { 
    products, 
    loading: productsLoading, 
    error: productsError 
  } = useProducts(category, userLocation);

  if (locationLoading) {
    return <div className="loading">Loading your location...</div>;
  }

  if (locationError) {
    return (
      <div className="error">
        <p>Error loading your location: {locationError}</p>
        <p>Please make sure you're logged in and have set your address in your profile.</p>
      </div>
    );
  }

  if (!userLocation) {
    return (
      <div className="no-location">
        <p>We couldn't find your location.</p>
        <p>Please update your address in your profile to see products available in your area.</p>
      </div>
    );
  }

  if (productsLoading) {
    return <div className="loading">Finding {category} in {userLocation.city}...</div>;
  }

  if (productsError) {
    return <div className="error">Error loading products: {productsError}</div>;
  }

  return (
    <div className="category-page">
      <h1 className="category-title">{title}</h1>
      <p className="location-info">Showing products available in {userLocation.city}</p>

      {products.length === 0 ? (
        <div className="no-products">
          <p>No {category} available in your area right now.</p>
          <p>Check back later or try another category.</p>
        </div>
      ) : (
        <div className="products-grid">
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
      <Navbar />
    </div>
  );
};

export default CategoryPage;