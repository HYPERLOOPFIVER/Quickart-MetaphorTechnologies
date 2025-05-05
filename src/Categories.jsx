import React from 'react';
import './Glory.css';

// Categories Page Component - using the premium dark theme
const CategoriesPage = () => {
  // Categories data with fixed structure
  const categories = [
    {
      id: 1,
      name: 'Groceries',
      icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSM4IsjFNdrSf7oZKc9PgQpEge0D4AkevGjvg&s',
      route: '/groceries'
    },
    {
      id: 2,
      name: 'Vegetables',
      icon: '',
      route: '/vegetable'
    },
    {
      id: 3,
      name: 'Electronics',
      icon: 'https://png.pngtree.com/thumb_back/fh260/background/20230607/pngtree-collection-of-electronic-equipment-on-a-purple-background-image_2906369.jpg',
      route: '/electronics'
    },
    {
      id: 4,
      name: 'Fashion',
      icon: '👕',
      route: '/fashion'
    },
    {
      id: 5,
      name: 'Home',
      icon: '🏠',
      route: '/home'
    },
    {
      id: 6,
      name: 'Beauty',
      icon: '💄',
      route: '/beauty'
    }
  ];

  // Handle navigation
  const navigateToCategory = (route) => {
    // Replace with your navigation logic, e.g. React Router
    console.log(`Navigating to: ${route}`);
    // window.location.href = route;
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
            {typeof category.icon === 'string' && category.icon.startsWith('http') ? (
              <img src={category.icon} alt={category.name} className="category-icon" />
            ) : (
              <span className="category-icon" role="img" aria-label={category.name}>
                {category.icon}
              </span>
            )}
            <h2>{category.name}</h2>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoriesPage;