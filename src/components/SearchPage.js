import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Undo2, Edit2, Trash2, Search, Filter, ChevronDown } from 'lucide-react';
import { useTransition, animated, config } from 'react-spring';
import EditEventModal from './EditEventModal';
import IOSAlert from './IOSAlert';
import { database, auth } from '../services/firebase';
import { ref, remove, set } from 'firebase/database';
import '../styles/SearchPage.css';

// Importar las categorías
const categories = ["Viajes", "Restaurantes", "Experiencias", "Películas y Series", "Eventos", "Regalos Mutuos", "Hobbies y Proyectos", "Deportes y Aventura", "Mejoras del Hogar", "Lectura"];

const SearchPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [events, setEvents] = useState(location.state?.events || []);
    const [editingEvent, setEditingEvent] = useState(null);
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const categoryDropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target)) {
                setShowCategoryDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const filteredEvents = events.filter(event => {
        const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = !categoryFilter || event.category.toLowerCase().includes(categoryFilter.toLowerCase());
        const matchesPriority = !priorityFilter || event.priority === priorityFilter;
        const matchesDate = !dateFilter || (event.date && new Date(event.date).toISOString().split('T')[0] === dateFilter);
        return matchesSearch && matchesCategory && matchesPriority && matchesDate;
    });

    const transitions = useTransition(filteredEvents, {
        from: { opacity: 0, scale: 0.9 },
        enter: { opacity: 1, scale: 1 },
        leave: { opacity: 0, scale: 0.9 },
        keys: event => event.id,
        config: { ...config.gentle, duration: 200 }
    });

    const filteredCategories = categories.filter(category => 
        category.toLowerCase().includes(categoryFilter.toLowerCase())
    );

    const handleEditEvent = (editedEvent) => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            const eventRef = ref(database, `users/${editedEvent.owner}/events/${editedEvent.id}`);
            set(eventRef, editedEvent)
                .then(() => {
                    setEvents(events.map(e => e.id === editedEvent.id ? editedEvent : e));
                    setEditingEvent(null);
                })
                .catch((error) => {
                    console.error('Error al actualizar evento:', error);
                });
        }
    };

    const deleteEvent = (id, ownerId) => {
        setAlertConfig({
            isOpen: true,
            title: "Eliminar evento",
            message: "¿Estás seguro que quieres eliminar este evento?",
            onConfirm: () => {
                const currentUser = auth.currentUser;
                if (currentUser) {
                    const eventRef = ref(database, `users/${ownerId}/events/${id}`);
                    remove(eventRef).then(() => {
                        setEvents(events.filter(e => e.id !== id));
                    }).catch((error) => {
                        console.error('Error al eliminar evento:', error);
                    });
                }
            }
        });
    };

    const truncateLocation = (location, maxLength = 20) => {
        if (!location) return '';
        return location.length > maxLength ? location.substring(0, maxLength) + '...' : location;
    };

    return (
        <div className="page">
            <h2 className="page-title">Búsqueda de Eventos</h2>
            <button onClick={() => navigate(-1)} className="button">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Undo2 size={18} />
                    <span style={{ marginLeft: '5px' }}>Volver a los Eventos</span>
                </div>
            </button>
            <br />
            <div className="search-container">
                <div className="search-input-wrapper">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Buscar eventos"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>
                <button onClick={() => setShowFilters(!showFilters)} className="filter-button">
                    <Filter size={18} />
                    <span>Filtros</span>
                </button>
            </div>
            {showFilters && (
                <div className="filters-container">
                    <div className="category-filter-container" ref={categoryDropdownRef}>
                        <div className="category-input-wrapper">
                            <input
                                type="text"
                                value={categoryFilter}
                                onChange={(e) => {
                                    setCategoryFilter(e.target.value);
                                    setShowCategoryDropdown(true);
                                }}
                                onFocus={() => setShowCategoryDropdown(true)}
                                placeholder="Filtrar por categoría"
                                className="filter-input category-filter"
                            />
                            <ChevronDown 
                                size={18} 
                                className="category-dropdown-icon"
                                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                            />
                        </div>
                        {showCategoryDropdown && (
                            <ul className="category-dropdown">
                                {filteredCategories.map((category, index) => (
                                    <li 
                                        key={index} 
                                        onClick={() => {
                                            setCategoryFilter(category);
                                            setShowCategoryDropdown(false);
                                        }}
                                    >
                                        {category}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="filter-select"
                    >
                        <option value="">Todas las prioridades</option>
                        <option value="Baja">Baja</option>
                        <option value="Media">Media</option>
                        <option value="Alta">Alta</option>
                    </select>
                    <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="filter-date"
                    />
                </div>
            )}
            <ul className="event-list">
                {transitions((style, event) => (
                    <animated.li style={style} key={event.id} className={`event-item priority-${(event.priority || 'Media').toLowerCase()}`}>
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
                                {event.tags && event.tags.length > 0 && (
                                    <>
                                        <br />
                                        Etiquetas: {event.tags.join(', ')}
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
                    </animated.li>
                ))}
            </ul>
            {editingEvent && (
                <EditEventModal
                    event={editingEvent}
                    onSave={handleEditEvent}
                    onClose={() => setEditingEvent(null)}
                    categories={categories}
                />
            )}
            <IOSAlert
                isOpen={alertConfig.isOpen}
                onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
                onConfirm={() => {
                    alertConfig.onConfirm();
                    setAlertConfig({ ...alertConfig, isOpen: false });
                }}
                title={alertConfig.title}
                message={alertConfig.message}
            />
        </div>
    );
};

export default SearchPage;