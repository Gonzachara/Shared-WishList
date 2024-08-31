import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { database, auth } from '../services/firebase';
import { ref, onValue } from 'firebase/database';
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

    useEffect(() => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            const sharedListsRef = ref(database, 'sharedLists');
            onValue(sharedListsRef, (snapshot) => {
                const data = snapshot.val();
                let allEvents = [];
                if (data) {
                    const sharedList = Object.entries(data).find(([_, value]) => 
                        value.accepted && value.owners.includes(currentUser.uid)
                    );
                    if (sharedList && sharedList[1].events) {
                        allEvents = Object.entries(sharedList[1].events).flatMap(([uid, events]) => 
                            Object.entries(events || {}).map(([eventId, event]) => ({
                                ...event,
                                id: eventId,
                                owner: uid,
                                shared: true
                            }))
                        );
                    }
                }
                loadPersonalEvents(currentUser.uid, allEvents);
            });
        } else {
            setLoading(false);
        }
    }, []);
    
    const loadPersonalEvents = (userId, sharedEvents) => {
        const eventsRef = ref(database, `users/${userId}/events`);
        onValue(eventsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const personalEvents = Object.values(data).map(event => ({...event, shared: false}));
                const allEvents = [...sharedEvents, ...personalEvents];
                setEvents(allEvents);
                findNextEvent(allEvents);
            } else {
                setEvents(sharedEvents);
                findNextEvent(sharedEvents);
            }
            setLoading(false);
        });
    };

    const findNextEvent = (allEvents) => {
        const now = new Date();
        const upcomingEvents = allEvents.filter(event => new Date(event.date) > now);
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
            <h3 style={{marginBottom: '15px'}}>Ubicación del próximo evento:</h3>
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
        </div>
    );
};

export default Map;