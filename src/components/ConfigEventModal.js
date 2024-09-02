import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import '../styles/ConfigEventModal.css';

const ConfigEventModal = ({ isOpen, onClose, event, onSave }) => {
    const [canEdit, setCanEdit] = useState(event.canEdit || false);
    const [isPrivate, setIsPrivate] = useState(event.isPrivate || false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsAnimating(true);
            setIsClosing(false);
        } else {
            setIsClosing(true);
            const timer = setTimeout(() => {
                setIsAnimating(false);
                setIsClosing(false);
            }, 200); // Duración de la animación
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isAnimating && !isOpen) return null;

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 200); // Espera a que termine la animación antes de cerrar
    };

    const handleSave = () => {
        onSave({ ...event, canEdit, isPrivate });
        onClose();
    };

    return (
        <div className={`modal-overlay ${isOpen || isAnimating ? 'open' : ''}`}>
            <div className={`modal-content ${isOpen && !isClosing ? 'open' : isClosing ? 'closing' : ''}`}>
                <h2>Configurar evento</h2>
                <button className="close-button" onClick={handleClose}>
                    <X size={24} />
                </button>
                <div className="config-option">
                    <span>Permitir que otros editen <br /> este evento</span>
                    <label className="toggle-switch">
                    <input
                        type="checkbox"
                        checked={canEdit}
                        onChange={(e) => setCanEdit(e.target.checked)}
                    />
                        <span className="toggle-slider"></span>
                    </label>
                </div>
                <div className="config-option">
                    <span>Hacer este evento privado <br /> para otros usuarios</span>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={isPrivate}
                            onChange={(e) => setIsPrivate(e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>
                <button onClick={handleSave} className="save-button">Guardar cambios</button>
            </div>
        </div>
    );
};

export default ConfigEventModal;