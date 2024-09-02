import React, { useState, useEffect } from 'react';
import { OpenStreetMapProvider } from 'leaflet-geosearch';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import DatePicker from "react-datepicker";
import { Plus, Edit3, CalendarFold, MapPin, Paperclip, AlertTriangle, Tag } from 'lucide-react';
import "react-datepicker/dist/react-datepicker.css";
import '../styles/EditEventModal.css';

const provider = new OpenStreetMapProvider();

const EditEventModal = ({ event, onSave, onClose, categories }) => {
    const [editedEvent, setEditedEvent] = useState({
        ...event,
        date: event.date ? new Date(event.date) : null,
        tags: event.tags || []
    });
    const [newTag, setNewTag] = useState('');
    const [showMap, setShowMap] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [displayLocation, setDisplayLocation] = useState('');
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
        setDisplayLocation(truncateLocation(editedEvent.location));
    }, [editedEvent.location]);

    const truncateLocation = (location, maxLength = 30) => {
        if (!location) return '';
        return location.length > maxLength ? location.substring(0, maxLength) + '...' : location;
    };

    const handleLocationSearch = async (query) => {
        const results = await provider.search({ query });
        setSearchResults(results);
    };

    const selectLocation = (result) => {
        const truncatedLocation = truncateLocation(result.label);
        setEditedEvent(prev => ({
            ...prev,
            location: result.label,
            coordinates: [result.y, result.x]
        }));
        setDisplayLocation(truncatedLocation);
        setSearchResults([]);
        setShowMap(true);
    };

    const LocationPicker = () => {
        useMapEvents({
            click(e) {
                setEditedEvent(prev => ({ ...prev, coordinates: [e.latlng.lat, e.latlng.lng] }));
            },
        });

        return (
            <Marker position={editedEvent.coordinates}>
                <Popup>{editedEvent.location || 'Ubicación seleccionada'}</Popup>
            </Marker>
        );
    };

    const addTag = () => {
        if (newTag && !editedEvent.tags.includes(newTag)) {
            setEditedEvent(prev => ({
                ...prev,
                tags: [...prev.tags, newTag]
            }));
            setNewTag('');
        }
    };

    const removeTag = (tagToRemove) => {
        setEditedEvent(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove)
        }));
    };

    const handleSave = () => {
        const eventToSave = {
            ...editedEvent,
            date: editedEvent.date ? editedEvent.date.toISOString() : null
        };
        onSave(eventToSave);
    };

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Espera a que termine la animación antes de cerrar
    };

    const CustomInput = React.forwardRef(({ value, onClick }, ref) => (
        <div className="input-wrapper custom-date-input" onClick={onClick} ref={ref}>
            <CalendarFold size={18} className="input-icon" />
            <input value={value} readOnly className="ios-input" placeholder="Seleccionar fecha" />
        </div>
    ));

    return (
        <div className={`ios-modal-overlay ${isVisible ? 'visible' : ''}`}>
            <div className="ios-modal">
                <h2 className="ios-modal-title">Editar Evento</h2>
                <div className="input-wrapper">
                    <Edit3 size={18} className="input-icon" />
                    <input
                        type="text"
                        value={editedEvent.title}
                        onChange={(e) => setEditedEvent({ ...editedEvent, title: e.target.value })}
                        className="ios-input"
                        placeholder="Título"
                    />
                </div>
                <DatePicker
                    selected={editedEvent.date}
                    onChange={(date) => setEditedEvent({ ...editedEvent, date: date })}
                    customInput={<CustomInput />}
                    placeholderText="Seleccionar fecha"
                    dateFormat="dd/MM/yyyy"
                    isClearable
                />
                <div className="input-wrapper">
                    <MapPin size={18} className="input-icon" />
                    <input
                        type="text"
                        value={displayLocation}
                        onChange={(e) => {
                            const value = e.target.value;
                            setDisplayLocation(value);
                            setEditedEvent({ ...editedEvent, location: value });
                            handleLocationSearch(value);
                        }}
                        className="ios-input"
                        placeholder="Ubicación"
                    />
                </div>
                {searchResults.length > 0 && (
                    <ul className="ios-search-results">
                        {searchResults.map((result, index) => (
                            <li key={index} onClick={() => selectLocation(result)}>
                                {truncateLocation(result.label)}
                            </li>
                        ))}
                    </ul>
                )}
                <div className="input-wrapper">
                    <Paperclip size={18} className="input-icon" />
                    <select
                        value={editedEvent.category}
                        onChange={(e) => setEditedEvent({ ...editedEvent, category: e.target.value })}
                        className="ios-input"
                    >
                        <option value="" disabled hidden>Seleccionar categoría</option>
                        {categories.map(category => (
                            <option key={category} value={category}>{category}</option>
                        ))}
                    </select>
                </div>
                <div className="input-wrapper">
                    <AlertTriangle size={18} className="input-icon" />
                    <select
                        value={editedEvent.priority}
                        onChange={(e) => setEditedEvent({ ...editedEvent, priority: e.target.value })}
                        className="ios-input"
                    >
                        <option value="Baja">Baja</option>
                        <option value="Media">Media</option>
                        <option value="Alta">Alta</option>
                    </select>
                </div>
                {showMap && (
                    <div style={{ height: '200px', marginBottom: '10px' }}>
                        <MapContainer center={editedEvent.coordinates} zoom={13} style={{ height: '100%', width: '100%' }}>
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />
                            <LocationPicker />
                        </MapContainer>
                    </div>
                )}
                {event.lastEditedBy && !event.isPersonal && (
                    <p className="ios-modal-edited-info">
                        Última edición por: {event.lastEditedBy} ({new Date(event.lastEditedAt).toLocaleString()})
                    </p>
                )}
                
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
                <div className="ios-tags">
                    {editedEvent.tags.map((tag, index) => (
                        <span key={index} className="ios-tag">
                            {tag}
                            <button onClick={() => removeTag(tag)} className="ios-tag-remove">×</button>
                        </span>
                    ))}
                </div>
                
                <div className="ios-modal-buttons">
                    <button onClick={handleClose} className="ios-button secondary">Cancelar</button>
                    <button onClick={handleSave} className="ios-button primary">Guardar</button>
                </div>
            </div>
        </div>
    );
};

export default EditEventModal;