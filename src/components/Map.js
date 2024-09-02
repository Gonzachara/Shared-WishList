import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { database, auth } from '../services/firebase';
import { ref, onValue, get } from 'firebase/database';
import { MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../App.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
});

const Map = () => {
    const [events, setEvents] = useState([]);
    const [nextEvent, setNextEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sharedEvents, setSharedEvents] = useState([]);
    const [sharedListUsers, setSharedListUsers] = useState({});
    const userIdRef = useRef(null);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                userIdRef.current = user.uid;
            } else {
                userIdRef.current = null;
            }
            loadAllEvents();
        });

        return () => unsubscribe();
    }, []);

    const loadAllEvents = () => {
        const sharedListsRef = ref(database, 'sharedLists');
        const personalEventsRef = userIdRef.current ? ref(database, `users/${userIdRef.current}/events`) : null;

        Promise.all([
            get(sharedListsRef),
            personalEventsRef ? get(personalEventsRef) : Promise.resolve(null)
        ]).then(async ([sharedSnapshot, personalSnapshot]) => {
            const sharedData = sharedSnapshot.val();
            const personalData = personalSnapshot ? personalSnapshot.val() : null;

            let allEvents = [];
            let allSharedEvents = [];
            let listUsers = {};

            if (sharedData) {
                for (const [listId, listValue] of Object.entries(sharedData)) {
                    if (listValue.owners && listValue.owners.includes(userIdRef.current) && listValue.events) {
                        // Obtener nombres de usuarios para esta lista
                        const userNames = await Promise.all(listValue.owners.map(async (uid) => {
                            if (uid === userIdRef.current) return 'Tú';
                            const userSnapshot = await get(ref(database, `users/${uid}`));
                            const userData = userSnapshot.val();
                            return userData ? (userData.displayName || userData.email) : 'Usuario desconocido';
                        }));
                        listUsers[listId] = userNames.filter(name => name !== 'Tú').join(', ');

                        Object.entries(listValue.events).forEach(([uid, events]) => 
                            Object.entries(events || {}).forEach(([eventId, event]) => {
                                const sharedEvent = {
                                    ...event,
                                    id: eventId,
                                    owner: uid,
                                    shared: true,
                                    listId: listId
                                };
                                allEvents.push(sharedEvent);
                                allSharedEvents.push(sharedEvent);
                            })
                        );
                    }
                }
            }

            if (personalData) {
                const personalEvents = Object.entries(personalData).map(([eventId, event]) => ({
                    ...event,
                    id: eventId,
                    shared: false
                }));
                allEvents = [...allEvents, ...personalEvents];
            }

            setEvents(allEvents);
            setSharedEvents(allSharedEvents);
            setSharedListUsers(listUsers);
            findNextEvent(allEvents);
            setLoading(false);
        }).catch(error => {
            console.error("Error loading events:", error);
            setLoading(false);
        });
    };

    const findNextEvent = (allEvents) => {
        const now = new Date();
        const upcomingEvents = allEvents.filter(event => 
            event.date && new Date(event.date) > now && 
            event.coordinates && 
            Array.isArray(event.coordinates) && 
            event.coordinates.length === 2 &&
            !isNaN(event.coordinates[0]) && 
            !isNaN(event.coordinates[1])
        );
        upcomingEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
        setNextEvent(upcomingEvents[0] || null);
    };

    // Filtrar eventos con coordenadas válidas
    const validEvents = events.filter(event => 
        event.coordinates && 
        Array.isArray(event.coordinates) && 
        event.coordinates.length === 2 &&
        !isNaN(event.coordinates[0]) && 
        !isNaN(event.coordinates[1])
    );

    const center = nextEvent && nextEvent.coordinates ? nextEvent.coordinates : [20, 0];
    const zoom = nextEvent ? 10 : 1;

    const nextEventIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    if (loading) {
        return <div className="page">Cargando...</div>;
    }

    if (!auth.currentUser) {
        return <div className="page">Por favor, inicia sesión para ver el mapa de eventos.</div>;
    }

    return (
        <div className="page">
            <h2 className="page-title">Mapa de Eventos</h2>
            <h3 className="section-title" style={{marginTop: '20px', marginBottom: '15px', fontSize: '20px'}}>
                <MapPin size={20} className="section-icon" />
                Próximos eventos personales:
            </h3>
            {nextEvent ? (
                <div className="next-event">
                    <p>
                        <strong>{nextEvent.title}</strong><br />
                        Fecha: {new Date(nextEvent.date).toLocaleDateString()}<br />
                        Ubicación: {nextEvent.location}<br />
                        Categoría: {nextEvent.category}<br />
                        {nextEvent.shared ? "Evento compartido" : "Evento personal"}
                    </p>
                </div>
            ) : (
                <p style={{display: 'none'}}>No tienes eventos próximos.</p>
            )}

            {validEvents.length > 0 ? (
                <div style={{ height: '400px', width: '100%' }}>
                    <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        {validEvents.map((event, index) => (
                            <Marker 
                                key={index} 
                                position={event.coordinates}
                                icon={event === nextEvent ? nextEventIcon : new L.Icon.Default()}
                            >
                                <Popup>
                                    <strong>{event.title}</strong><br />
                                    Fecha: {new Date(event.date).toLocaleDateString()}<br />
                                    Ubicación: {event.location}<br />
                                    Categoría: {event.category}<br />
                                    {event.shared ? `Evento compartido (${event.owner === auth.currentUser.uid ? 'Tú' : 'Colaborador'})` : "Evento personal"}
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>
            ) : (
                <p>No tienes eventos válidos para mostrar en el mapa.</p>
            )}
            
            {/* Sección de eventos compartidos */}
            <h3 className="section-title" style={{marginTop: '20px', marginBottom: '15px', fontSize: '20px'}}>
                <MapPin size={20} className="section-icon" />
                Próximos eventos compartidos:
            </h3>
            {sharedEvents.length > 0 ? (
                <div className="shared-events">
                    {sharedEvents.slice(0, 3).map((event, index) => (
                        <div key={index} className="next-event">
                            <p>
                                <strong>{event.title}</strong><br />
                                Fecha: {new Date(event.date).toLocaleDateString()}<br />
                                Ubicación: {event.location}<br />
                                Categoría: {event.category}<br />
                                Lista con: {sharedListUsers[event.listId] || 'Cargando...'}
                            </p>
                            {event.coordinates && Array.isArray(event.coordinates) && event.coordinates.length === 2 && (
                                <div style={{ height: '200px', width: '100%', marginTop: '10px' }}>
                                    <MapContainer center={event.coordinates} zoom={13} style={{ height: '100%', width: '100%' }}>
                                        <TileLayer
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        />
                                        <Marker position={event.coordinates} icon={nextEventIcon}>
                                            <Popup>
                                                <strong>{event.title}</strong><br />
                                                {event.location}
                                            </Popup>
                                        </Marker>
                                    </MapContainer>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <p>No tienes eventos compartidos próximos.</p>
            )}
        </div>
    );
};

export default Map;