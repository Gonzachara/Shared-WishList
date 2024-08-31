import React, { useState, useEffect } from 'react';
import { database, auth } from '../services/firebase';
import { ref, push, remove, onValue, set, get } from 'firebase/database';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { Edit2, Trash2 } from 'lucide-react';
import { OpenStreetMapProvider } from 'leaflet-geosearch';
import IOSAlert from './IOSAlert';
import 'leaflet/dist/leaflet.css';
import 'leaflet-geosearch/dist/geosearch.css';
import EditEventModal from './EditEventModal';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import '../App.css';

const categories = ["Viajes", "Restaurantes", "Experiencias", "Películas y Series", "Eventos", "Regalos Mutuos", "Hobbies y Proyectos", "Deportes y Aventura", "Mejoras del Hogar", "Lectura"];
const provider = new OpenStreetMapProvider();

const WishList = () => {
    const [events, setEvents] = useState([]);
    const [newEvent, setNewEvent] = useState({ 
        title: '', 
        date: null,
        location: '', 
        category: '',
        priority: '',
        coordinates: [51.505, -0.09]
    });
    const [showMap, setShowMap] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [error, setError] = useState(null);
    const [sharedListId, setSharedListId] = useState(null);
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
    const [editingEvent, setEditingEvent] = useState(null);

    useEffect(() => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            // Buscar y cargar lista compartida
            const sharedListsRef = ref(database, 'sharedLists');
            const unsubscribeShared = onValue(sharedListsRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    const sharedList = Object.entries(data).find(([_, value]) => 
                        value.accepted && value.owners.includes(currentUser.uid)
                    );
                    if (sharedList) {
                        setSharedListId(sharedList[0]);
                        loadSharedEvents(sharedList[0]);
                    } else {
                        setSharedListId(null);
                        loadPersonalEvents(currentUser.uid);
                    }
                } else {
                    setSharedListId(null);
                    loadPersonalEvents(currentUser.uid);
                }
            });
    
            return () => {
                unsubscribeShared();
            };
        }
    }, []);
    
    const loadPersonalEvents = (userId) => {
        const personalEventsRef = ref(database, `users/${userId}/events`);
        onValue(personalEventsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const personalEventList = Object.entries(data).map(([key, value]) => ({
                    id: key,
                    ...value,
                    owner: userId,
                    isPersonal: true
                }));
                setEvents(personalEventList);
            } else {
                setEvents([]);
            }
        });
    };
    
    const loadSharedEvents = (listId) => {
        const sharedEventsRef = ref(database, `sharedLists/${listId}/events`);
        onValue(sharedEventsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const sharedEventList = Object.entries(data).flatMap(([ownerId, ownerEvents]) =>
                    Object.entries(ownerEvents).map(([key, value]) => ({
                        id: key,
                        ...value,
                        owner: ownerId,
                        isPersonal: false
                    }))
                );
                setEvents(sharedEventList);
            } else {
                setEvents([]);
            }
        });
    };

    const showAlert = (title, message, onConfirm) => {
        setAlertConfig({ isOpen: true, title, message, onConfirm });
    };

    const closeAlert = () => {
        setAlertConfig({ ...alertConfig, isOpen: false });
    };

    const addEvent = (e) => {
        e.preventDefault();
        showAlert(
            "Añadir evento",
            "¿Estás seguro que quieres añadir este evento?",
            () => {
                const currentUser = auth.currentUser;
                if (currentUser) {
                    const eventData = {
                        ...newEvent,
                        date: newEvent.date ? newEvent.date.toISOString() : null,
                        coordinates: newEvent.coordinates.map(coord => parseFloat(coord.toFixed(6))),
                        owner: currentUser.uid,
                        priority: newEvent.priority || 'Media'
                    };
                    
                    // Añadir a la lista personal
                    const personalEventsRef = ref(database, `users/${currentUser.uid}/events`);
                    push(personalEventsRef, eventData).then(() => {
                        console.log('Evento añadido con éxito a la lista personal');
                    }).catch((error) => {
                        console.error('Error al añadir evento a la lista personal:', error);
                        setError('Error al añadir evento a la lista personal. Por favor, intenta de nuevo.');
                    });
    
                    // Añadir a la lista compartida si existe
                    if (sharedListId) {
                        const sharedListRef = ref(database, `sharedLists/${sharedListId}/events/${currentUser.uid}`);
                        push(sharedListRef, eventData).then(() => {
                            console.log('Evento añadido con éxito a la lista compartida');
                        }).catch((error) => {
                            console.error('Error al añadir evento a la lista compartida:', error);
                            setError('Error al añadir evento a la lista compartida. Por favor, intenta de nuevo.');
                        });
                    }
    
                    resetNewEvent();
                }
                closeAlert();
            }
        );
    };

    const handleEditEvent = (editedEvent) => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            const eventRef = sharedListId
                ? ref(database, `sharedLists/${sharedListId}/events/${editedEvent.owner}/${editedEvent.id}`)
                : ref(database, `users/${editedEvent.owner}/events/${editedEvent.id}`);
    
            const updatedEvent = {
                ...editedEvent,
                date: editedEvent.date ? editedEvent.date : null
            };
    
            if (sharedListId) {
                updatedEvent.lastEditedBy = currentUser.displayName || currentUser.email;
                updatedEvent.lastEditedAt = new Date().toISOString();
            }
    
            set(eventRef, updatedEvent)
                .then(() => {
                    console.log('Evento actualizado con éxito');
                    setEditingEvent(null);
                })
                .catch((error) => {
                    console.error('Error al actualizar evento:', error);
                    setError('Error al actualizar evento. Por favor, intenta de nuevo.');
                });
        }
    };

    const resetNewEvent = () => {
        setNewEvent({ 
            title: '', 
            date: new Date(),
            location: '', 
            category: '',
            priority: '',
            coordinates: [51.505, -0.09]
        });
        setShowMap(false);
        setSearchResults([]);
    };

    const deleteEvent = (id, ownerId) => {
        showAlert(
            "Eliminar evento",
            "¿Estás seguro que quieres eliminar este evento?",
            () => {
                const currentUser = auth.currentUser;
                if (currentUser) {
                    if (sharedListId) {
                        const eventRef = ref(database, `sharedLists/${sharedListId}/events/${ownerId}/${id}`);
                        remove(eventRef).then(() => {
                            console.log('Evento eliminado con éxito de la lista compartida');
                        }).catch((error) => {
                            console.error('Error al eliminar evento de la lista compartida:', error);
                            setError('Error al eliminar evento. Por favor, intenta de nuevo.');
                        });
                    } else {
                        const eventRef = ref(database, `users/${ownerId}/events/${id}`);
                        remove(eventRef).then(() => {
                            console.log('Evento eliminado con éxito de la lista personal');
                        }).catch((error) => {
                            console.error('Error al eliminar evento de la lista personal:', error);
                            setError('Error al eliminar evento. Por favor, intenta de nuevo.');
                        });
                    }
                } else {
                    alert('No tienes permiso para eliminar este evento.');
                }
                closeAlert();
            }
        );
    };

    const handleLocationSearch = async (query) => {
        const results = await provider.search({ query });
        setSearchResults(results);
    };

    const selectLocation = (result) => {
        setNewEvent(prev => ({
        ...prev,
        location: result.label,
        coordinates: [result.y, result.x]
        }));
        setSearchResults([]);
        setShowMap(true);
    };

    const LocationPicker = () => {
        useMapEvents({
        click(e) {
            setNewEvent(prev => ({ ...prev, coordinates: [e.latlng.lat, e.latlng.lng] }));
        },
        });

        return (
        <Marker position={newEvent.coordinates}>
            <Popup>{newEvent.location || 'Selected location'}</Popup>
        </Marker>
        );
    };

    const truncateLocation = (location, maxLength = 20) => {
        if (!location) return '';
        return location.length > maxLength ? location.substring(0, maxLength) + '...' : location;
    };

    return (
        <div className="page">
            <h2 className="page-title">Lista de Deseos {sharedListId ? 'Compartida' : 'Personal'}</h2>
            {error && <div className="error">{error}</div>}
            <form onSubmit={addEvent} className="event-form">
                <input
                type="text"
                placeholder="Título del evento"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                className="input"
                required
                />
                <DatePicker
                    selected={newEvent.date}
                    onChange={(date) => setNewEvent({ ...newEvent, date: date })}
                    className="input"
                    placeholderText="Seleccionar fecha"
                    isClearable
                    dateFormat="dd/MM/yyyy"
                />
                <input
                type="text"
                placeholder="Ubicación"
                value={newEvent.location}
                onChange={(e) => {
                    setNewEvent({ ...newEvent, location: e.target.value });
                    handleLocationSearch(e.target.value);
                }}
                className="input"
                />
                {searchResults.length > 0 && (
                <ul className="search-results">
                    {searchResults.map((result, index) => (
                    <li key={index} onClick={() => selectLocation(result)}>
                        {result.label}
                    </li>
                    ))}
                </ul>
                )}
                <select
                    value={newEvent.category}
                    onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value })}
                    className="input"
                >
                    <option value="" disabled hidden>Seleccionar categoría</option>
                    {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                    ))}
                </select>
                <select
                    value={newEvent.priority}
                    onChange={(e) => setNewEvent({ ...newEvent, priority: e.target.value })}
                    className="input"
                >
                    <option value="" disabled hidden>Prioridad</option>
                    <option value="Baja">Baja</option>
                    <option value="Media">Media</option>
                    <option value="Alta">Alta</option>
                </select>
                <button type="submit" className="button">Añadir Evento +</button>
            </form>
            {showMap && (
                <div style={{ height: '300px', marginBottom: '20px' }}>
                <MapContainer center={newEvent.coordinates} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <LocationPicker />
                </MapContainer>
                </div>
            )}
            <ul className="event-list">
            {events.map((event) => (
                <li key={event.id} className={`event-item priority-${(event.priority || 'media').toLowerCase()}`}>
                    <div className="event-item-content">
                        <div className="event-item-title">{event.title}</div>
                        <div className="event-item-details">
                            {event.date ? new Date(event.date).toLocaleDateString() : 'Fecha no especificada'} {event.location ? `en ${truncateLocation(event.location)}` : ''}
                            <br />
                            Categoría: {event.category || 'No especificada'}
                            <br />
                            Prioridad: {event.priority || 'Media'}
                            <br />
                            Añadido por: {event.owner === auth.currentUser.uid ? 'Tú' : 'Colaborador'}
                            {!event.isPersonal && event.lastEditedBy && (
                                <>
                                    <br />
                                    Última edición: {event.lastEditedBy} ({new Date(event.lastEditedAt).toLocaleString()})
                                </>
                            )}
                        </div>
                    </div>
                    <div className="event-item-actions">
                        <button onClick={() => setEditingEvent(event)} className="icon-button edit-button" aria-label="Editar">
                            <Edit2 size={18} />
                        </button>
                        <button onClick={() => deleteEvent(event.id, event.owner)} className="icon-button delete-button" aria-label="Eliminar">
                            <Trash2 size={18} />
                        </button>
                    </div>
                </li>
            ))}
            </ul>
            
            <IOSAlert
                isOpen={alertConfig.isOpen}
                onClose={closeAlert}
                onConfirm={alertConfig.onConfirm}
                title={alertConfig.title}
                message={alertConfig.message}
            />
            {editingEvent && (
                <EditEventModal
                    event={editingEvent}
                    onSave={handleEditEvent}
                    onClose={() => setEditingEvent(null)}
                    categories={categories}
                />
            )}
        </div>
    );
};

export default WishList;