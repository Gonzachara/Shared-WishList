import React, { useState, useEffect } from 'react';
import { database, auth } from '../services/firebase';
import { ref, push, set, onValue, get, update, remove } from 'firebase/database';
import IOSAlert from './IOSAlert';
import { Eye, LogOut, Check, X, Send, Mail, ExternalLink, Link, Inbox, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generateInvitationLink, shareLink } from '../utils/invitationUtils';
import '../styles/Collaborate.css';

const Collaborate = () => {
    const [email, setEmail] = useState('');
    const [invitations, setInvitations] = useState([]);
    const [sharedLists, setSharedLists] = useState([]);
    const [hasWishList, setHasWishList] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
    const [invitationLink, setInvitationLink] = useState(() => {
        return localStorage.getItem('invitationLink') || '';
    });
    const [hasSharedLists, setHasSharedLists] = useState(false);
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
                        } else if (value.owners && value.owners.includes(currentUser.uid) || (value.invitedEmail === currentUser.email && value.accepted)) {
                            sharedListArray.push({ id: key, ...value });
                        }
                    });
                    setInvitations(invitationList);

                    // Modificar la parte de obtención de nombres de usuarios
                    Promise.all(sharedListArray.map(async list => {
                        if (list.owners) {
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
                        }
                        return list;
                    })).then(updatedSharedLists => {
                        setSharedLists(updatedSharedLists);
                    });

                    // Verificar si el usuario tiene listas compartidas
                    const userHasSharedLists = sharedListArray.length > 0;
                    setHasSharedLists(userHasSharedLists);

                    // Si el usuario no tiene listas compartidas, limpiar el enlace de invitación
                    if (!userHasSharedLists) {
                        setInvitationLink('');
                        localStorage.removeItem('invitationLink');
                    }

                    // Cargar los enlaces de invitación para cada lista compartida
                    sharedListArray.forEach(list => {
                        const storedLink = localStorage.getItem(`invitationLink_${list.id}`);
                        if (storedLink) {
                            list.invitationLink = storedLink;
                        }
                    });

                    setSharedLists(sharedListArray);
                } else {
                    setInvitations([]);
                    setSharedLists([]);
                    setHasSharedLists(false);
                    setInvitationLink('');
                    localStorage.removeItem('invitationLink');
                }
            });
        }
    }, [setHasWishList]);

    const showAlert = (title, message, onConfirm) => {
        setAlertConfig({ isOpen: true, title, message, onConfirm });
    };

    const closeAlert = () => {
        setAlertConfig({ ...alertConfig, isOpen: false });
    };

    const inviteCollaborator = () => {
        if (!email.trim()) {
            alert('Por favor, ingresa un correo electrónico válido.');
            return;
        }
    
        showAlert(
            "Enviar invitación",
            `¿Estás seguro que quieres invitar a ${email}?`,
            async () => {
                const currentUser = auth.currentUser;
                if (currentUser) {
                    try {
                        const newListRef = push(ref(database, 'sharedLists'));
                        await set(newListRef, {
                            owners: [currentUser.uid],
                            invitedEmail: email,
                            senderEmail: currentUser.email,
                            accepted: false,
                            events: {} // Inicializamos events como un objeto vacío
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
                            const updateData = {
                                accepted: true,
                                owners: [...invitationData.owners, currentUser.uid]
                            };
    
                            // No vinculamos ningún evento aquí
                            // La lista compartida comenzará vacía
    
                            await update(invitationRef, updateData);
                            alert('Invitación aceptada. La lista compartida está vacía y lista para que agregues eventos.');
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
    
                        const updatedOwners = listData.owners.filter(uid => uid !== currentUser.uid);
                        
                        if (updatedOwners.length > 0) {
                            // Actualizar la lista de propietarios
                            await update(listRef, { owners: updatedOwners });
                        } else {
                            // Si no quedan propietarios, eliminar la lista compartida
                            await remove(listRef);
                        }
    
                        // Eliminar los eventos del usuario de la lista compartida
                        if (listData.events && listData.events[currentUser.uid]) {
                            await remove(ref(database, `sharedLists/${listId}/events/${currentUser.uid}`));
                        }
    
                        // Eliminar el enlace de invitación específico de esta lista
                        localStorage.removeItem(`invitationLink_${listId}`);
    
                        alert('Has salido de la lista compartida');
    
                        // Actualizar el estado local
                        setSharedLists(prevLists => prevLists.filter(list => list.id !== listId));
    
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

    const generateAndShareLink = async () => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            try {
                const newListRef = push(ref(database, 'sharedLists'));
                const newListId = newListRef.key;
                await set(newListRef, {
                    owners: [currentUser.uid],
                    invitedByLink: true,
                    senderEmail: currentUser.email,
                    events: {} // Inicializamos events como un objeto vacío
                });
    
                const link = generateInvitationLink(newListId);
                
                // Guardar el enlace en el localStorage con el ID de la lista
                localStorage.setItem(`invitationLink_${newListId}`, link);
                
                showAlert(
                    "Enlace de invitación generado",
                    "¿Deseas compartir este enlace ahora?",
                    () => {
                        shareLink(link);
                        closeAlert();
                    }
                );
            } catch (error) {
                console.error('Error al generar el enlace de invitación:', error);
                alert('Error al generar el enlace de invitación. Por favor, intenta de nuevo.');
            }
        } else {
            alert('Debes estar autenticado para generar enlaces de invitación.');
        }
    };

    return (
        <div className="page">
            <h2 className="page-title">Colaborar</h2>
            
            {/* Formulario de invitación */}
            <div className="invite-form">
                <div className="input-with-icon">
                    <Mail size={18} className="input-icon" />
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email del colaborador"
                        className="input ios-input"
                    />
                </div>
                <button onClick={inviteCollaborator} className="ios-button-invite">
                    <Send size={20} />
                    <span>Invitar</span>
                </button>
            </div>

            {/* Sección de enlace de invitación rediseñada */}
            <div className="invite-link-section">
                {!invitationLink ? (
                    <button onClick={generateAndShareLink} className="ios-button-invite generate-link-button">
                        <Link size={20} />
                        <span>Generar enlace</span>
                    </button>
                ) : (
                    <div className="invitation-link">
                        <div className="input-with-icon">
                            <Link size={18} className="input-icon" />
                            <input type="text" value={invitationLink} readOnly className="input ios-input" />
                        </div>
                        <button onClick={() => shareLink(invitationLink)} className="ios-button share-button">
                            <ExternalLink size={20} />
                        </button>
                    </div>
                )}
            </div>

            {/* Sección de invitaciones pendientes */}
            <div className="invitations-section">
                <h3 className="section-title">Invitaciones pendientes <Inbox className="invitation-icon" /></h3>
                {invitations.length === 0 ? (
                    <p className="no-invitations">No hay invitaciones pendientes.</p>
                ) : (
                    <ul className="invitation-list">
                        {invitations.map((invitation) => (
                            <li key={invitation.id} className="invitation-item">
                                <span className="invitation-sender">De: {invitation.senderEmail.split('@')[0].slice(0, 10)}...</span>
                                <div className="invitation-actions">
                                    <button onClick={() => acceptInvitation(invitation.id)} className="icon-button-invitation accept-button">
                                        <Check size={20} />
                                    </button>
                                    <button onClick={() => declineInvitation(invitation.id)} className="icon-button-invitation decline-button">
                                        <X size={20} />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Sección de listas compartidas */}
            <div className="shared-lists-section">
            <h3 className="section-title">
                Listas compartidas <Share2 size={20} className="section-icon icono-compartir" />
            </h3>
                {sharedLists.length === 0 ? (
                <p className="no-shared-lists">No hay listas compartidas.</p>
                ) : (
                <ul className="shared-list">
                    {sharedLists.map((list) => (
                        <li key={list.id} className="shared-list-item">
                            <div className="shared-list-info">
                                <span className="shared-list-title">
                                    {list.ownerNames && list.ownerNames.length === 1 && list.ownerNames[0] === auth.currentUser.email 
                                        ? "Lista compartida (sin colaboradores aún)"
                                        : `Lista compartida con: ${list.ownerNames
                                            ? list.ownerNames
                                                .filter(name => name !== auth.currentUser.email && name !== auth.currentUser.displayName)
                                                .join(', ')
                                            : 'Cargando colaboradores...'}`
                                    }
                                </span>
                                {list.invitationLink && (
                                    <div className="invitation-link">
                                        <div className="input-with-icon">
                                            <input type="text" value={list.invitationLink} readOnly className="ios-input" />
                                            <button onClick={() => shareLink(list.invitationLink)} className="icon-button share-button input-icon">
                                                <ExternalLink size={20} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="shared-list-actions">
                                <button className="icon-button view-list-button" onClick={() => handleViewList(list.id)}>
                                    <Eye size={20} />
                                </button>
                                <button className="icon-button leave-list-button" onClick={() => leaveSharedList(list.id)}>
                                    <LogOut size={20} />
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