import React from 'react';
import './Glory.css'
// Categories Page Component - using the premium dark theme
const CategoriesPage = () => {
  // Categories data
  const categories = [
    {
      id: 1,
      name: '',
      description: '',
      icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSM4IsjFNdrSf7oZKc9PgQpEge0D4AkevGjvg&s',
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
      
      </div>

      <div className="categories-grid">
        {categories.map((category) => (
          <div 
            key={category.id} 
            className="category-card"
            onClick={() => navigateToCategory(category.route)}
          >
            <img  src={category.icon} alt="" className='category-icon'/>
      
            <div className="category-content">
              <h2>{category.name}</h2>
              <p>{category.description}</p>
            </div>
            
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoriesPage;