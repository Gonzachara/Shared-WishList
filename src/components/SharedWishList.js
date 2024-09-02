import React, { useState, useEffect } from 'react';
import { database, auth } from '../services/firebase';
import { ref, onValue } from 'firebase/database';

const SharedWishList = ({ listId }) => {
    const [wishList, setWishList] = useState([]);

    useEffect(() => {
        const currentUser = auth.currentUser;
        if (currentUser && listId) {
            const sharedListRef = ref(database, `sharedLists/${listId}`);
            onValue(sharedListRef, (snapshot) => {
                const data = snapshot.val();
                if (data && data.wishlist) {
                    setWishList(Object.values(data.wishlist));
                }
            });
        }
    }, [listId]);

    return (
        <div>
            <h2>Lista de eventos compartida</h2>
            <ul>
                {wishList.map((item, index) => (
                    <li key={index}>{item.name}</li>
                ))}
            </ul>
        </div>
    );
};

export default SharedWishList;