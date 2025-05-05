// hooks/useUserLocation.js - Custom hook to fetch user location
import { useState, useEffect } from 'react';
import { db, auth } from './Firebase';
import { doc, getDoc } from 'firebase/firestore';

export const useUserLocation = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserLocation = async () => {
      try {
        const currentUser = auth.currentUser;
        
        if (!currentUser) {
          setError("User not authenticated");
          setLoading(false);
          return;
        }
        
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists() && userDoc.data().address) {
          setUserLocation(userDoc.data().address);
        } else {
          setError("User location not found");
        }
      } catch (err) {
        console.error("Error fetching user location:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserLocation();
  }, []);

  return { userLocation, loading, error };
};