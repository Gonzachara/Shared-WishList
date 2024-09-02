import React from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/EventCalendar.css';

moment.locale('es');
const localizer = momentLocalizer(moment);

const EventCalendar = ({ events, onEventClick }) => {
    const eventStyleGetter = (event) => {
        const style = {
            backgroundColor: event.resource.priority === 'Alta' ? '#ff4757' : 
                                        event.resource.priority === 'Media' ? '#ffa502' : '#2ed573',
            borderRadius: '4px',
            opacity: 0.8,
            color: 'white',
            border: '0px',
            display: 'block',
            fontWeight: 'bold'
        };
        return { style };
    };

    const customDayPropGetter = (date) => {
        if (moment(date).isSame(moment(), 'day')) {
            return {
                className: 'current-day',
                style: {
                    backgroundColor: 'rgba(0, 122, 255, 0.1)',
                }
            };
        }
        return {};
    };

    return (
        <div className="calendar-container">
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '70vh' }}
                eventPropGetter={eventStyleGetter}
                dayPropGetter={customDayPropGetter}
                views={['month', 'week', 'day']}
                messages={{
                    next: "Siguiente",
                    previous: "Anterior",
                    today: "Hoy",
                    month: "Mes",
                    week: "Semana",
                    day: "Día"
                }}
                onSelectEvent={onEventClick}
            />
        </div>
    );
};

export default EventCalendar;