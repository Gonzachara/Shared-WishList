import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import EventCalendar from './EventCalendar';
import { Undo2, X, Calendar as CalendarIcon, MapPin, Flag } from 'lucide-react';

const CalendarPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const events = location.state?.events || [];
    const [selectedEvent, setSelectedEvent] = useState(null);

    // Transformar los eventos para que sean compatibles con react-big-calendar
    const calendarEvents = events.map(event => ({
        title: event.title,
        start: new Date(event.date),
        end: new Date(event.date),
        allDay: true,
        resource: event
    }));

    const handleEventClick = (event) => {
        setSelectedEvent(event.resource);
    };

    const closePopup = () => {
        setSelectedEvent(null);
    };

    return (
        <div className="page">
            <h2 className="page-title">Calendario de Eventos</h2>
            <button onClick={() => navigate(-1)} className="button">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Undo2 size={18} />
                    <span style={{ marginLeft: '5px' }}>Volver a los Eventos</span>
                </div>
            </button>
            <br />
            <EventCalendar events={calendarEvents} onEventClick={handleEventClick} />

            {selectedEvent && (
                <div className="popup-overlay">
                    <div className="popup-content">
                        <button onClick={closePopup} className="close-button">
                            <X size={18} />
                        </button>
                        <h3>{selectedEvent.title}</h3>
                        <p><CalendarIcon size={18} /> Fecha: {new Date(selectedEvent.date).toLocaleDateString()}</p>
                        <p><MapPin size={18} /> Ubicación: {selectedEvent.location}</p>
                        <p><Flag size={18} /> Prioridad: {selectedEvent.priority}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarPage;