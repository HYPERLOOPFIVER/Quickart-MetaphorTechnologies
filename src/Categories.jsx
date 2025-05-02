import React from 'react';
import './Glory.css'
// Categories Page Component - using the premium dark theme
const CategoriesPage = () => {
  // Categories data
  const categories = [
    {
      id: 1,
      name: 'Groceries',
      description: 'Fresh food items, packaged goods, and daily essentials',
      icon: '🛒',
      route: '/groceries'
    },
    {
      id: 2,
      name: 'Vegetables',
      description: 'Fresh organic vegetables sourced from local farms',
      icon: '🥦',
      route: '/vegetable'
    },
    {
      id: 3,
      name: 'Electronics',
      description: 'Latest gadgets, devices, and accessories',
      icon: '📱',
      route: '/electronics'
    }
  ];

  // Handle navigation
  const navigateToCategory = (route) => {
    // Replace with your navigation logic, e.g. React Router
    window.location.href = route;
  };

  return (
    <div className="categories-container">
      <div className="categories-header">
        <h1>Shop by Category</h1>
        <p>Browse our wide selection of products</p>
      </div>

      <div className="categories-grid">
        {categories.map((category) => (
          <div 
            key={category.id} 
            className="category-card"
            onClick={() => navigateToCategory(category.route)}
          >
            <div className="category-icon">{category.icon}</div>
            <div className="category-content">
              <h2>{category.name}</h2>
              <p>{category.description}</p>
            </div>
            <div className="category-action">
              <span className="browse-button">Browse {category.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoriesPage;