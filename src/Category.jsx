import React from 'react';
import './Glory.css'
import Navbar from './Navbar';
// Categories Page Component - using the premium dark theme
const CategoriesPage = () => {
  // Categories data
  const categories = [
    {
      id: 1,
      name: 'Groceries',
      description: '',
      route: '/groceries'
    },
    {
      id: 2,
      name: 'Vegetables',
      description: '',
      route: '/vegetable'
    },
    {
      id: 3,
      name: 'Electronics',
      description: '',
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
      
      </div>

      <div className="categories-grid">
        {categories.map((category) => (
          <div 
            key={category.id} 
            className="category-card"
            onClick={() => navigateToCategory(category.route)}
          >

            <div className="category-content">
              <h2>{category.name}</h2>
              <p>{category.description}</p>
            </div>
            
          </div>
        ))}
      </div>
           <Navbar/>
      
    </div>
  );
};

export default CategoriesPage;