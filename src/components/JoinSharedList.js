import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { database, auth } from '../services/firebase';
import { ref, get, update } from 'firebase/database';

const JoinSharedList = () => {
    const { listId } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        const joinList = async () => {
            const currentUser = auth.currentUser;
            if (currentUser) {
                try {
                    const listRef = ref(database, `sharedLists/${listId}`);
                    const snapshot = await get(listRef);
                    const listData = snapshot.val();

                    if (listData && listData.invitedByLink) {
                        const updatedOwners = [...(listData.owners || []), currentUser.uid];
                        await update(listRef, { owners: updatedOwners });
                        alert('Te has unido a la lista compartida con éxito.');
                        navigate(`/wishlist/${listId}`);
                    } else {
                        alert('El enlace de invitación no es válido.');
                        navigate('/');
                    }
                } catch (error) {
                    console.error('Error al unirse a la lista:', error);
                    alert('Error al unirse a la lista. Por favor, intenta de nuevo.');
                    navigate('/');
                }
            } else {
                alert('Debes iniciar sesión para unirte a una lista compartida.');
                navigate('/login');
            }
        };

        joinList();
    }, [listId, navigate]);

    return <div>Uniéndote a la lista compartida...</div>;
};

export default JoinSharedList;