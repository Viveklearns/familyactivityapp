import React, { useState } from 'react';
import './App.css';

function App() {
  // State to store form inputs
  const [formData, setFormData] = useState({
    city: '',
    kidsAges: '',
    availability: '',
    distance: 15,
    preferences: ''
  });

  // State to track if form has been submitted
  const [submitted, setSubmitted] = useState(false);

  // Dummy recommendations to display (Milestone 1)
  const dummyRecommendations = [
    {
      emoji: '🦕',
      title: 'Austin Nature & Science Center',
      description: 'Located in Zilker Park, this hands-on museum features live animal exhibits and nature trails perfect for curious elementary-aged kids. Your 5 and 8-year-old will love the dinosaur tracks and the wildlife rescue exhibits. Admission is free (donations suggested), and it\'s open Saturday 10am-5pm.'
    },
    {
      emoji: '🎨',
      title: 'Thinkery Children\'s Museum',
      description: 'This interactive museum in Mueller offers STEM-focused exhibits designed specifically for ages 0-11. The outdoor learning area and maker spaces will engage both your kids at their respective levels. Tickets are $15 per person, and Saturday afternoons are less crowded than mornings.'
    },
    {
      emoji: '🚣',
      title: 'Kayaking at Lady Bird Lake',
      description: 'Rent kayaks or paddleboards from multiple vendors along the lake for a fun outdoor adventure. With calm waters and beautiful skyline views, this is great exercise for the whole family. Your 8-year-old can paddle their own kayak while the 5-year-old rides tandem with a parent.'
    },
    {
      emoji: '🌳',
      title: 'Mayfield Park & Preserve',
      description: 'This free hidden gem features peacocks roaming freely, scenic trails, and historic cottages to explore. The easy 1-mile trail is perfect for young walkers, and kids love spotting and feeding the friendly peacocks. Open daily from dawn to dusk with free admission.'
    },
    {
      emoji: '🍦',
      title: 'Barton Springs Pool & Zilker Park',
      description: 'The natural spring-fed pool maintains 68-70°F year-round and is perfect for a Saturday afternoon swim. After swimming, explore the massive Zilker Park with playgrounds and open fields. Entry is $9 for adults and $3 for kids, and the pool is open until 8pm on Saturdays.'
    }
  ];

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    console.log('Form submitted with data:', formData);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎉 Family Activity Finder</h1>
        <p>Discover fun weekend activities for your family</p>
      </header>

      <main className="App-main">
        <form onSubmit={handleSubmit} className="activity-form">
          <div className="form-group">
            <label htmlFor="city">City</label>
            <input
              type="text"
              id="city"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              placeholder="e.g., Austin, Texas"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="kidsAges">Kids' Ages</label>
            <input
              type="text"
              id="kidsAges"
              name="kidsAges"
              value={formData.kidsAges}
              onChange={handleInputChange}
              placeholder="e.g., 5, 8"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="availability">When are you available?</label>
            <input
              type="text"
              id="availability"
              name="availability"
              value={formData.availability}
              onChange={handleInputChange}
              placeholder="e.g., Saturday afternoon"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="distance">Maximum Distance (miles): {formData.distance}</label>
            <input
              type="range"
              id="distance"
              name="distance"
              min="0"
              max="50"
              value={formData.distance}
              onChange={handleInputChange}
              className="slider"
            />
          </div>

          <div className="form-group">
            <label htmlFor="preferences">Other Preferences (optional)</label>
            <textarea
              id="preferences"
              name="preferences"
              value={formData.preferences}
              onChange={handleInputChange}
              placeholder="e.g., Prefer outdoor activities, budget-friendly options"
              rows="3"
            />
          </div>

          <button type="submit" className="submit-btn">
            Find Activities
          </button>
        </form>

        {/* Display recommendations after form submission */}
        {submitted && (
          <div className="recommendations">
            <h2>Recommended Activities</h2>
            <div className="recommendations-list">
              {dummyRecommendations.map((rec, index) => (
                <div key={index} className="recommendation-card">
                  <h3>
                    <span className="emoji">{rec.emoji}</span>
                    {rec.title}
                  </h3>
                  <p>{rec.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
