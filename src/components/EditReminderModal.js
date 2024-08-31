import React, { useState, useEffect } from 'react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const EditReminderModal = ({ reminder, onSave, onClose }) => {
    const [editedReminder, setEditedReminder] = useState({
        ...reminder,
        date: reminder.date ? new Date(reminder.date) : null
    });
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    const handleSave = () => {
        const reminderToSave = {
            ...editedReminder,
            date: editedReminder.date ? editedReminder.date.toISOString() : null
        };
        onSave(reminderToSave);
    };

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300);
    };

    return (
        <div className={`ios-modal-overlay ${isVisible ? 'visible' : ''}`}>
            <div className="ios-modal">
                <h2 className="ios-modal-title">Editar Recordatorio</h2>
                <input
                    type="text"
                    value={editedReminder.title}
                    onChange={(e) => setEditedReminder({ ...editedReminder, title: e.target.value })}
                    className="ios-input"
                    placeholder="Título"
                />
                <DatePicker
                    selected={editedReminder.date}
                    onChange={(date) => setEditedReminder({ ...editedReminder, date: date })}
                    className="ios-input"
                    placeholderText="Seleccionar fecha"
                    dateFormat="dd/MM/yyyy"
                    isClearable
                />
                {reminder.lastEditedBy && (
                    <p className="ios-modal-edited-info">
                        Última edición por: {reminder.lastEditedBy}
                    </p>
                )}
                <div className="ios-modal-buttons">
                    <button onClick={handleClose} className="ios-button secondary">Cancelar</button>
                    <button onClick={() => {
                        handleSave();
                        handleClose();
                    }} className="ios-button primary">Guardar</button>
                </div>
            </div>
        </div>
    );
};

export default EditReminderModal;