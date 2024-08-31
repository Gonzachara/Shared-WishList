import React, { useState, useEffect } from 'react';
import { auth, database } from '../services/firebase';
import { ref, onValue, update } from 'firebase/database';
import { FaEnvelopeOpenText } from 'react-icons/fa';

const Invitations = () => {
    const [invitations, setInvitations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                const sharedListsRef = ref(database, 'sharedLists');
                onValue(sharedListsRef, (snapshot) => {
                    const data = snapshot.val();
                    if (data) {
                        const userInvitations = Object.entries(data)
                        .filter(([_, value]) => value.invitedEmail === user.email && !value.accepted)
                        .map(([key, value]) => ({ id: key, ...value }));
                        setInvitations(userInvitations);
                    } else {
                        setInvitations([]);
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("Error fetching invitations:", error);
                    setError("Error al cargar las invitaciones. Por favor, intenta de nuevo.");
                    setLoading(false);
                });
            } else {
                setInvitations([]);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const acceptInvitation = async (listId) => {
        const user = auth.currentUser;
        if (user) {
            try {
                const listRef = ref(database, `sharedLists/${listId}`);
                await update(listRef, {
                    owners: [user.uid, ...invitations.find(inv => inv.id === listId).owners],
                    accepted: true
                });
                
                // No copiamos los eventos personales a la lista compartida
                
                alert('Invitación aceptada');
                // Actualizar el estado local para reflejar el cambio inmediatamente
                setInvitations(invitations.filter(inv => inv.id !== listId));
            } catch (error) {
                console.error("Error accepting invitation:", error);
                alert('Error al aceptar la invitación. Por favor, intenta de nuevo.');
            }
        } else {
            alert('Debes estar autenticado para aceptar invitaciones.');
        }
    };

    if (loading) {
        return <div>Cargando invitaciones...</div>;
    }

    if (error) {
        return <div>{error}</div>;
    }

    return (
        <div className="invitations-section">
            <h3 className="section-title">
                Invitaciones pendientes
                <FaEnvelopeOpenText className="invitation-icon" />
            </h3>
            {invitations.length === 0 ? (
                <p className="no-invitations">No tienes invitaciones pendientes</p>
            ) : (
                <ul className="invitation-list">
                    {invitations.map((invitation) => (
                        <li key={invitation.id} className="invitation-item">
                            <span className="invitation-from">Invitación de: {invitation.owners[0]}</span>
                            <button onClick={() => acceptInvitation(invitation.id)} className="button accept-button">
                                Aceptar
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default Invitations;