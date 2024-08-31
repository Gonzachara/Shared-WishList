import React, { useState, useEffect } from 'react';
import { database, auth } from '../services/firebase';
import { ref, push, set, onValue, get, update, remove } from 'firebase/database';
import IOSAlert from './IOSAlert';
import { FaEye, FaSignOutAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const Collaborate = () => {
    const [email, setEmail] = useState('');
    const [invitations, setInvitations] = useState([]);
    const [sharedLists, setSharedLists] = useState([]);
    const [hasWishList, setHasWishList] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
    const navigate = useNavigate();

    useEffect(() => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            // Verificar si el usuario tiene una lista de deseos
            const userRef = ref(database, `users/${currentUser.uid}/wishlist`);
            get(userRef).then((snapshot) => {
                setHasWishList(snapshot.exists() && snapshot.val() !== null);
            });

            // Obtener invitaciones y listas compartidas
            const sharedListsRef = ref(database, 'sharedLists');
            onValue(sharedListsRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    const invitationList = [];
                    const sharedListArray = [];
                    Object.entries(data).forEach(([key, value]) => {
                        if (value.invitedEmail === currentUser.email && !value.accepted) {
                            invitationList.push({ id: key, ...value });
                        } else if (value.owners.includes(currentUser.uid) || (value.invitedEmail === currentUser.email && value.accepted)) {
                            sharedListArray.push({ id: key, ...value });
                        }
                    });
                    setInvitations(invitationList);

                    // Obtener nombres de usuarios
                    Promise.all(sharedListArray.map(async list => {
                        const ownerNames = await Promise.all(list.owners.map(async uid => {
                            try {
                                const userSnapshot = await get(ref(database, `users/${uid}`));
                                const userData = userSnapshot.val();
                                return userData && userData.displayName ? userData.displayName : (userData && userData.email ? userData.email : uid);
                            } catch (error) {
                                console.error(`Error al obtener el nombre del usuario ${uid}:`, error);
                                return uid;
                            }
                        }));
                        return { ...list, ownerNames };
                    })).then(updatedSharedLists => {
                        setSharedLists(updatedSharedLists);
                    });
                } else {
                    setInvitations([]);
                    setSharedLists([]);
                }
            });
        }
    }, []);

    const showAlert = (title, message, onConfirm) => {
        setAlertConfig({ isOpen: true, title, message, onConfirm });
    };

    const closeAlert = () => {
        setAlertConfig({ ...alertConfig, isOpen: false });
    };

    const inviteCollaborator = () => {
        showAlert(
            "Enviar invitación",
            `¿Estás seguro que quieres invitar a ${email}?`,
            async () => {
                const currentUser = auth.currentUser;
                if (currentUser) {
                    try {
                        const userRef = ref(database, `users/${currentUser.uid}/events`);
                        let userEvents = await get(userRef);
                        
                        const newListRef = push(ref(database, 'sharedLists'));
                        await set(newListRef, {
                            owners: [currentUser.uid],
                            invitedEmail: email,
                            senderEmail: currentUser.email,
                            accepted: false,
                            events: {
                                [currentUser.uid]: userEvents.val() || {}
                            }
                        });
                        alert('Invitación enviada a ' + email);
                        setEmail('');
                    } catch (error) {
                        console.error('Error al enviar invitación:', error);
                        alert('Error al enviar la invitación. Por favor, intenta de nuevo.');
                    }
                } else {
                    alert('Debes estar autenticado para enviar invitaciones.');
                }
                closeAlert();
            }
        );
    };

    const acceptInvitation = (invitationId) => {
        showAlert(
            "Aceptar invitación",
            "¿Estás seguro que quieres aceptar esta invitación?",
            async () => {
                const currentUser = auth.currentUser;
                if (currentUser) {
                    try {
                        const invitationRef = ref(database, `sharedLists/${invitationId}`);
                        const snapshot = await get(invitationRef);
                        const invitationData = snapshot.val();
                        if (invitationData && invitationData.invitedEmail === currentUser.email) {
                            const userEventsRef = ref(database, `users/${currentUser.uid}/events`);
                            const userEventsSnapshot = await get(userEventsRef);
                            const currentUserEvents = userEventsSnapshot.val() || {};

                            const updateData = {
                                accepted: true,
                                owners: [...invitationData.owners, currentUser.uid]
                            };

                            Object.keys(currentUserEvents).forEach(eventId => {
                                updateData[`events/${currentUser.uid}/${eventId}`] = currentUserEvents[eventId];
                            });

                            await update(invitationRef, updateData);
                            alert('Invitación aceptada');
                        } else {
                            throw new Error('No tienes permiso para aceptar esta invitación');
                        }
                    } catch (error) {
                        console.error('Error al aceptar la invitación:', error);
                        alert('Error al aceptar la invitación. Por favor, intenta de nuevo.');
                    }
                }
                closeAlert();
            }
        );
    };

    const declineInvitation = (invitationId) => {
        showAlert(
            "Declinar invitación",
            "¿Estás seguro que quieres declinar esta invitación?",
            async () => {
                const currentUser = auth.currentUser;
                if (currentUser) {
                    try {
                        const invitationRef = ref(database, `sharedLists/${invitationId}`);
                        const snapshot = await get(invitationRef);
                        const invitationData = snapshot.val();
                        if (invitationData && invitationData.invitedEmail === currentUser.email) {
                            await remove(invitationRef);
                            alert('Invitación declinada');
                        } else {
                            throw new Error('No tienes permiso para declinar esta invitación');
                        }
                    } catch (error) {
                        console.error('Error al declinar la invitación:', error);
                        alert('Error al declinar la invitación. Por favor, intenta de nuevo.');
                    }
                }
                closeAlert();
            }
        );
    };


    const leaveSharedList = (listId) => {
        showAlert(
            "Salir de la lista compartida",
            "¿Estás seguro que quieres salir de esta lista compartida?",
            async () => {
                const currentUser = auth.currentUser;
                if (currentUser) {
                    try {
                        const listRef = ref(database, `sharedLists/${listId}`);
                        const snapshot = await get(listRef);
                        const listData = snapshot.val();
    
                        if (!listData) {
                            throw new Error('La lista compartida no existe');
                        }
    
                        const isOwner = listData.owners.includes(currentUser.uid);
                        const isInvitee = listData.invitedEmail === currentUser.email;
    
                        if (!isOwner && !isInvitee) {
                            throw new Error('No tienes permiso para salir de esta lista compartida');
                        }
    
                        if (isOwner) {
                            // Si es propietario, eliminar de la lista de propietarios
                            const updatedOwners = listData.owners.filter(uid => uid !== currentUser.uid);
                            
                            if (updatedOwners.length > 0) {
                                await update(listRef, { owners: updatedOwners });
                            } else {
                                // Si no quedan propietarios, eliminar la lista compartida
                                await remove(listRef);
                                return; // Salimos de la función si la lista se elimina
                            }
                        }
    
                        // Eliminar los eventos del usuario de la lista compartida
                        if (listData.events && listData.events[currentUser.uid]) {
                            await remove(ref(database, `sharedLists/${listId}/events/${currentUser.uid}`));
                        }
    
                        // Si el usuario es el invitado, eliminar la invitación completamente
                        if (isInvitee) {
                            await remove(listRef);
                        }
                        
                        alert('Has salido de la lista compartida');
                    } catch (error) {
                        console.error('Error al salir de la lista compartida:', error);
                        alert(`Error al salir de la lista compartida: ${error.message}`);
                    }
                } else {
                    alert('Debes estar autenticado para salir de una lista compartida.');
                }
                closeAlert();
            }
        );
    };

    const handleViewList = (listId) => {
        navigate(`/wishlist/${listId}`);
    };

    return (
        <div className="page">
            <h2 className="page-title">Colaborar</h2>
            
            {/* Formulario de invitación */}
            <div className="invite-form">
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email del colaborador"
                    className="input"
                />
                <button onClick={inviteCollaborator} className="button">
                    Enviar Invitación
                </button>
            </div>

            {/* Sección de invitaciones pendientes */}
            <div className="invitations-section">
                <h3 className="section-title">Invitaciones pendientes:</h3>
                {invitations.length === 0 ? (
                    <p className="no-invitations">No hay invitaciones pendientes.</p>
                ) : (
                    <ul className="invitation-list">
                        {invitations.map((invitation) => (
                            <li key={invitation.id} className="invitation-item">
                                <span>Invitación recibida de: {invitation.senderEmail}</span>
                                <div className="invitation-actions">
                                    <button onClick={() => acceptInvitation(invitation.id)} className="button accept-button">
                                        Aceptar
                                    </button>
                                    <button onClick={() => declineInvitation(invitation.id)} className="button decline-button">
                                        Declinar
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Sección de listas compartidas */}
            <div className="shared-lists-section">
                <h3 className="section-title">Listas compartidas:</h3>
                {sharedLists.length === 0 ? (
                <p className="no-shared-lists">No hay listas compartidas.</p>
                ) : (
                    <ul className="shared-list">
                        {sharedLists.map((list) => (
                            <li key={list.id} className="shared-list-item">
                                <div className="shared-list-info">
                                    <span className="shared-list-title">Lista compartida</span>
                                    <span className="shared-list-collaborators">
                                        Colaboradores: {list.ownerNames ? list.ownerNames.filter(name => name !== auth.currentUser.displayName).join(', ') : 'Cargando...'}
                                    </span>
                                </div>
                                <div className="shared-list-actions">
                                    <button className="action-button view-list-button" onClick={() => handleViewList(list.id)}>
                                        <FaEye className="button-icon" />
                                    </button>
                                    <button className="action-button leave-list-button" onClick={() => leaveSharedList(list.id)}>
                                        <FaSignOutAlt className="button-icon" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            
            <IOSAlert
                isOpen={alertConfig.isOpen}
                onClose={closeAlert}
                onConfirm={alertConfig.onConfirm}
                title={alertConfig.title}
                message={alertConfig.message}
            />
        </div>
    );
};

export default Collaborate;