import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { database, auth } from '../services/firebase';
import { ref, push, remove, onValue, set, update, get } from 'firebase/database';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { Edit2, Trash2, Settings } from 'lucide-react';
import { OpenStreetMapProvider } from 'leaflet-geosearch';
import IOSAlert from './IOSAlert';
import ConfigEventModal from './ConfigEventModal';
import 'leaflet/dist/leaflet.css';
import 'leaflet-geosearch/dist/geosearch.css';
import EditEventModal from './EditEventModal';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import '../App.css';
import CommentsModal from './CommentsModal';
import { useTransition, animated, config, useSpring } from 'react-spring';
import { Edit3, MapPin, Paperclip, AlertTriangle, CalendarFold, Calendar, Search, Tag, Plus } from 'lucide-react';
import { debounce } from 'lodash';


const categories = ["Viajes", "Restaurantes", "Experiencias", "Películas y Series", "Eventos", "Regalos Mutuos", "Hobbies y Proyectos", "Deportes y Aventura", "Mejoras del Hogar", "Lectura"];
const provider = new OpenStreetMapProvider();

const WishList = () => {
    const { listId } = useParams();
    const [listTitle, setListTitle] = useState('');
    const [events, setEvents] = useState([]);
    const [newEvent, setNewEvent] = useState({ 
        title: '', 
        date: null,
        location: '', 
        category: '',
        priority: '',
        coordinates: [51.505, -0.09],
        comments: []
    });
    const [showMap, setShowMap] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [error, setError] = useState(null);
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
    const [editingEvent, setEditingEvent] = useState(null);
    const [tags, setTags] = useState([]);
    const [newTag, setNewTag] = useState('');
    const [showTagsInput, setShowTagsInput] = useState(false);
    const [showNewEventForm, setShowNewEventForm] = useState(false);
    const [commentModalOpen, setCommentModalOpen] = useState(false);
    const [currentEvent, setCurrentEvent] = useState(null);
    const navigate = useNavigate();
    const [configEvent, setConfigEvent] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [mapKey, setMapKey] = useState(0);

    const debouncedHandleLocationSearch = useCallback(
        debounce((query) => {
            if (query.length > 2) {
                setIsSearching(true);
                provider.search({ query }).then(results => {
                    setSearchResults(results);
                    setIsSearching(false);
                });
            } else {
                setSearchResults([]);
                setIsSearching(false);
            }
        }, 300),
        []
    );

    const handleConfigSave = (updatedEvent) => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            setError('Debes estar autenticado para realizar esta acción.');
            return;
        }
    
        const updates = {
            canEdit: updatedEvent.canEdit,
            isPrivate: updatedEvent.isPrivate
        };
    
        let eventRef;
        if (listId) {
            // Lista compartida
            eventRef = ref(database, `sharedLists/${listId}/events/${updatedEvent.owner}/${updatedEvent.id}`);
        } else {
            // Lista personal
            eventRef = ref(database, `users/${updatedEvent.owner}/events/${updatedEvent.id}`);
        }
    
        update(eventRef, updates)
            .then(() => {
                console.log('Configuración del evento actualizada con éxito');
                // Actualizar el estado local
                setEvents(prevEvents =>
                    prevEvents.map(event =>
                        event.id === updatedEvent.id
                            ? { ...event, ...updates }
                            : event
                    )
                );
                setConfigEvent(null);
            })
            .catch((error) => {
                console.error('Error al actualizar la configuración del evento:', error);
                setError('Error al actualizar la configuración. Por favor, intenta de nuevo.');
            });
    };

    const transitions = useTransition(events, {
        from: { opacity: 0, scale: 0.9 },
        enter: { opacity: 1, scale: 1 },
        leave: { opacity: 0, scale: 0.9 },
        keys: event => event.id,
        config: { ...config.gentle, duration: 200 }
    });

    const formAnimation = useSpring({
        maxHeight: showNewEventForm ? '1000px' : '0px',
        opacity: showNewEventForm ? 1 : 0,
        transform: showNewEventForm ? 'translateY(0%)' : 'translateY(-5%)',
        overflow: 'hidden',
        config: { tension: 180, friction: 12 }
    });

    useEffect(() => {
        const fetchListData = async () => {
            const currentUser = auth.currentUser;
            if (currentUser) {
                let eventsRef;
                if (listId) {
                    // Lista compartida
                    const listRef = ref(database, `sharedLists/${listId}`);
                    const snapshot = await get(listRef);
                    const listData = snapshot.val();
                    if (listData) {
                        const otherUsers = listData.owners.filter(uid => uid !== currentUser.uid);
                        if (otherUsers.length > 0) {
                            const otherUserRef = ref(database, `users/${otherUsers[0]}`);
                            const otherUserSnapshot = await get(otherUserRef);
                            const otherUserData = otherUserSnapshot.val();
                            setListTitle(`Lista compartida con: ${otherUserData.displayName || otherUserData.email}`);
                        } else {
                            setListTitle('Lista compartida');
                        }
                        eventsRef = ref(database, `sharedLists/${listId}/events`);
                    }
                } else {
                    // Lista personal
                    eventsRef = ref(database, `users/${currentUser.uid}/events`);
                    setListTitle('Eventos Personales');
                }

                if (eventsRef) {
                    onValue(eventsRef, (snapshot) => {
                        const data = snapshot.val();
                        if (data) {
                            const eventList = listId
                                ? Object.entries(data).flatMap(([userId, userEvents]) => 
                                    Object.entries(userEvents).map(([eventId, eventData]) => ({
                                        id: eventId,
                                        ...eventData,
                                        owner: userId
                                    }))
                                )
                                : Object.entries(data).map(([eventId, eventData]) => ({
                                    id: eventId,
                                    ...eventData,
                                    owner: currentUser.uid
                                }));
                            setEvents(eventList);
                        } else {
                            setEvents([]);
                        }
                    });
                }
            }
        };

        fetchListData();
    }, [listId]);

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
                        priority: newEvent.priority || 'Media',
                        tags: tags
                    };
                    
                    let eventRef;
                    if (listId) {
                        // Añadir a la lista compartida
                        eventRef = ref(database, `sharedLists/${listId}/events/${currentUser.uid}`);
                    } else {
                        // Añadir a la lista personal
                        eventRef = ref(database, `users/${currentUser.uid}/events`);
                    }

                    push(eventRef, eventData)
                        .then(() => {
                            console.log('Evento añadido con éxito');
                            resetNewEvent();
                            setTags([]);
                        })
                        .catch((error) => {
                            console.error('Error al añadir evento:', error);
                            setError('Error al añadir evento. Por favor, intenta de nuevo.');
                        });
                }
                closeAlert();
            }
        );
    };

    const handleEditEvent = (editedEvent) => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            if (listId && editedEvent.owner !== currentUser.uid && !editedEvent.canEdit) {
                setError('No tienes permiso para editar este evento.');
                return;
            }
    
            const eventRef = listId
                ? ref(database, `sharedLists/${listId}/events/${editedEvent.owner}/${editedEvent.id}`)
                : ref(database, `users/${editedEvent.owner}/events/${editedEvent.id}`);
    
            const updatedEvent = {
                ...editedEvent,
                date: editedEvent.date
            };
    
            if (listId) {
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
            date: null,
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
                    let eventRef;
                    if (listId) {
                        // Lista compartida
                        eventRef = ref(database, `sharedLists/${listId}/events/${ownerId}/${id}`);
                    } else {
                        // Lista personal
                        eventRef = ref(database, `users/${currentUser.uid}/events/${id}`);
                    }
    
                    remove(eventRef)
                        .then(() => {
                            console.log('Evento eliminado con éxito');
                            // La actualización del estado local se manejará en el listener onValue
                        })
                        .catch((error) => {
                            console.error('Error al eliminar evento:', error);
                            setError('Error al eliminar evento. Por favor, intenta de nuevo.');
                        });
                } else {
                    setError('No tienes permiso para eliminar este evento.');
                }
                closeAlert();
            }
        );
    };

    const selectLocation = (result) => {
        setNewEvent(prev => ({
            ...prev,
            location: result.label,
            coordinates: [result.y, result.x]
        }));
        setSearchResults([]);
        setShowMap(true);
        setMapKey(prevKey => prevKey + 1);
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

    const addTag = () => {
        if (newTag && !tags.includes(newTag)) {
            setTags([...tags, newTag]);
            setNewTag('');
        }
    };
    
    const removeTag = (tagToRemove) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const truncateLocation = (location, maxLength = 20) => {
        if (!location) return '';
        return location.length > maxLength ? location.substring(0, maxLength) + '...' : location;
    };

    const CustomInput = React.forwardRef(({ value, onClick }, ref) => (
        <div className="input-wrapper custom-date-input" onClick={onClick} ref={ref}>
            <CalendarFold size={18} className="input-icon" />
            <input value={value} readOnly className="input" placeholder="Seleccionar fecha" />
        </div>
    ));

    const openCommentModal = (event) => {
        setCurrentEvent(event);
        setCommentModalOpen(true);
    };

    const addComment = (newComment) => {
        if (currentEvent && newComment.text) {
            const commentData = {
                id: Date.now(),
                text: newComment.text,
                isPrivate: newComment.isPrivate,
                author: auth.currentUser.uid,
                createdAt: new Date().toISOString()
            };
    
            const updatedComments = [...(currentEvent.comments || []), commentData];
            const eventRef = listId
                ? ref(database, `sharedLists/${listId}/events/${currentEvent.owner}/${currentEvent.id}`)
                : ref(database, `users/${currentEvent.owner}/events/${currentEvent.id}`);
    
            update(eventRef, { comments: updatedComments })
                .then(() => {
                    console.log('Comentario añadido con éxito');
                    setEvents(prevEvents => 
                        prevEvents.map(event => 
                            event.id === currentEvent.id 
                                ? { ...event, comments: updatedComments } 
                                : event
                        )
                    );
                    setCurrentEvent({ ...currentEvent, comments: updatedComments });
                })
                .catch((error) => {
                    console.error('Error al añadir comentario:', error);
                    setError('Error al añadir comentario. Por favor, intenta de nuevo.');
                });
        }
    };
    
    const deleteComment = (commentId) => {
        if (currentEvent) {
            const updatedComments = currentEvent.comments.filter(comment => comment.id !== commentId);
            const eventRef = listId
                ? ref(database, `sharedLists/${listId}/events/${currentEvent.owner}/${currentEvent.id}`)
                : ref(database, `users/${currentEvent.owner}/events/${currentEvent.id}`);
    
            update(eventRef, { comments: updatedComments })
                .then(() => {
                    console.log('Comentario eliminado con éxito');
                    setEvents(prevEvents => 
                        prevEvents.map(event => 
                            event.id === currentEvent.id 
                                ? { ...event, comments: updatedComments } 
                                : event
                        )
                    );
                    setCurrentEvent({ ...currentEvent, comments: updatedComments });
                })
                .catch((error) => {
                    console.error('Error al eliminar comentario:', error);
                    setError('Error al eliminar comentario. Por favor, intenta de nuevo.');
                });
        }
    };
    
    return (
        <div className="page">
            <h2 className="page-title">{listTitle}</h2>
            {error && <div className="error">{error}</div>}
            
            <div className="wishlist-actions">
                <button onClick={() => navigate('/calendar', { state: { events: events } })} className="action-button">
                    <Calendar size={20} />
                    <span>Calendario</span>
                </button>
                <button onClick={() => navigate('/search', { state: { events: events } })} className="action-button">
                    <Search size={20} />
                    <span>Búsqueda</span>
                </button>
                <button onClick={() => setShowTagsInput(!showTagsInput)} className="action-button">
                    <Tag size={20} />
                    <span>Etiquetas</span>
                </button>
            </div>
    
            <button 
                onClick={() => setShowNewEventForm(!showNewEventForm)} 
                className="button"
            >
                {showNewEventForm ? 'Cerrar' : 'Agregar Evento Nuevo +'}
            </button>
            <br />

            <animated.div style={formAnimation}>
                <div className="form-container">
                    {showNewEventForm && (
                        <form onSubmit={addEvent} className="event-form">
                            <div className="input-wrapper">
                                <Edit3 size={18} className="input-icon" />
                                <input
                                    type="text"
                                    placeholder="Título del evento"
                                    value={newEvent.title}
                                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                                    className="input"
                                    required
                                />
                            </div>
                            <div className="input-wrapper date-picker-wrapper">
                                <CalendarFold size={18} className="input-icon" />
                                <DatePicker
                                    selected={newEvent.date}
                                    onChange={(date) => setNewEvent({ ...newEvent, date: date })}
                                    customInput={<CustomInput />}
                                    placeholderText="Seleccionar fecha"
                                    isClearable
                                    dateFormat="dd/MM/yyyy"
                                />
                            </div>
                            <div className="input-wrapper">
                                <MapPin size={18} className="input-icon" />
                                <input
                                    type="text"
                                    placeholder="Ubicación"
                                    value={newEvent.location}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setNewEvent(prev => ({ ...prev, location: value }));
                                        if (value.length > 2) {
                                            debouncedHandleLocationSearch(value);
                                        } else {
                                            setSearchResults([]);
                                            setShowMap(false); // Ocultar el mapa si el input está vacío o tiene menos de 3 caracteres
                                        }
                                    }}
                                    className="input"
                                />
                            </div>
                            {searchResults.length > 0 && newEvent.location.length > 2 && (
                                <ul className="search-results">
                                    {isSearching ? (
                                        <li>Buscando...</li>
                                    ) : (
                                        searchResults.map((result, index) => (
                                            <li key={index} onClick={() => selectLocation(result)}>
                                                {result.label}
                                            </li>
                                        ))
                                    )}
                                </ul>
                            )}
                            <div className="input-wrapper">
                                <Paperclip size={18} className="input-icon" />
                                <select
                                    value={newEvent.category}
                                    onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value })}
                                    className="input"
                                >
                                    <option value="" disabled hidden>Seleccionar categoría</option>
                                    {categories.map((category, index) => (
                                        <option key={`category-${index}`} value={category}>{category}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="input-wrapper">
                                <AlertTriangle size={18} className="input-icon" />
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
                            </div>
                            {showTagsInput && (
                                <div className="tags-input-section">
                                    <div className="input-wrapper">
                                        <Tag size={18} className="input-icon" />
                                        <input
                                            type="text"
                                            value={newTag}
                                            onChange={(e) => setNewTag(e.target.value)}
                                            placeholder="Nueva etiqueta"
                                            className="input"
                                        />
                                        <button onClick={addTag} type="button" className="icon-button icon-plus-tag">
                                            <Plus size={20} />
                                        </button>
                                    </div>
                                    <div className="tags-list" style={{ marginBottom: '10px' }}>
                                        {tags.map((tag, index) => (
                                            <span key={index} className="tag">
                                                {tag}
                                                <button onClick={() => removeTag(tag)} className="tag-remove">×</button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <button type="submit" className="button">Añadir Evento +</button>
                        </form>
                    )}
                </div>
            </animated.div>

            {showMap && newEvent.location && (
                <div style={{ height: '300px', marginBottom: '20px' }}>
                    <MapContainer 
                        key={mapKey}
                        center={newEvent.coordinates} 
                        zoom={5} 
                        style={{ height: '100%', width: '100%' }}
                    >
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        <LocationPicker />
                    </MapContainer>
                </div>
            )}

            <ul className="event-list">
            {transitions((style, event) => (
                (!event.isPrivate || event.owner === auth.currentUser.uid) && (
                    <animated.li style={style} key={event.id} className={`event-item priority-${(event.priority || 'Media').toLowerCase()}`}>
                        <div className="event-item-content">
                        <div className="event-item-title">
                            {event.title}
                            {listId && (event.owner === auth.currentUser.uid || !event.isPrivate) && (
                                <button onClick={() => setConfigEvent(event)} className="icon-button config-button" aria-label="Configurar">
                                    <Settings size={18} />
                                </button>
                            )}
                        </div>
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
                                {event.tags && event.tags.length > 0 && (
                                    <>
                                        <br />
                                        Etiquetas: {event.tags.join(', ')}
                                    </>
                                )}
                                {event.canEdit && <span>Editable por otros</span>}
                                {event.isPrivate && <span>Evento privado</span>}
                            </div>
                        </div>

                        <div className="event-item-actions">
                            {((!listId && event.owner === auth.currentUser.uid) || 
                                (listId && (event.owner === auth.currentUser.uid || event.canEdit))) && (
                                <button onClick={() => setEditingEvent(event)} className="icon-button edit-button" aria-label="Editar">
                                    <Edit2 size={18} />
                                </button>
                            )}
                            {(!listId || event.owner === auth.currentUser.uid) && (
                                <button onClick={() => deleteEvent(event.id, event.owner)} className="icon-button delete-button" aria-label="Eliminar">
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                        
                        <button onClick={() => openCommentModal(event)} className="text-button comment-button" aria-label="Comentar">
                            Comentar
                        </button>
                    </animated.li>
                    )
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
            <CommentsModal
                isOpen={commentModalOpen}
                onClose={() => setCommentModalOpen(false)}
                event={currentEvent}
                onAddComment={addComment}
                onDeleteComment={deleteComment}
            />
            <ConfigEventModal
                isOpen={configEvent !== null}
                onClose={() => setConfigEvent(null)}
                event={configEvent || {}}
                onSave={handleConfigSave}
            />
        </div>
    );
};

export default WishList;