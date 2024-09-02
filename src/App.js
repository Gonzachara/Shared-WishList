import React, { useState, useEffect, useContext } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { auth } from './services/firebase';
import Auth from './components/Auth';
import WishList from './components/WishList';
import Map from './components/Map';
import Reminders from './components/Reminders';
import Navigation from './components/Navigation';
import Profile from './components/Profile';
import SharedWishList from './components/SharedWishList';
import Collaborate from './components/Collaborate';
import CalendarPage from './components/CalendarPage';
import SearchPage from './components/SearchPage';
import { ThemeProvider, ThemeContext } from './contexts/ThemeContext';
import JoinSharedList from './components/JoinSharedList';
import './App.css';
import { useTransition, animated } from 'react-spring';

const AppContent = () => {
  const [user, setUser] = useState(null);
  const { theme } = useContext(ThemeContext);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });

    return () => unsubscribe();
  }, []);

  const transitions = useTransition(location, {
    from: { opacity: 0, transform: 'translate3d(100%,0,0)' },
    enter: { opacity: 1, transform: 'translate3d(0%,0,0)' },
    leave: { opacity: 0, transform: 'translate3d(-50%,0,0)' },
    config: { duration: 300 },
  });

  if (!user) {
    return <Auth />;
  }

  return (
    <div className={`app ${theme}`}>
      {transitions((style, item) => (
        <animated.div style={{
          ...style,
          position: 'absolute',
          width: '100%',
          height: '100%',
        }}>
          <Routes location={item}>
            <Route path="/" element={<WishList />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/map" element={<Map />} />
            <Route path="/reminders" element={<Reminders />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/collaborate" element={<Collaborate />} />
            <Route path="/shared-wish-list" element={<SharedWishList />} />
            <Route path="/join/:listId" element={<JoinSharedList />} />
            <Route path="/wishlist/:listId" element={<WishList />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </animated.div>
      ))}
      <Navigation />
    </div>
  );
};

const App = () => (
  <ThemeProvider>
    <Router>
      <AppContent />
    </Router>
  </ThemeProvider>
);

export default App;