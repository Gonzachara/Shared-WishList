import React, { useEffect, useState } from 'react';
import '../App.css';

const IOSAlert = ({ isOpen, onClose, onConfirm, title, message }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
        } else {
            const timer = setTimeout(() => {
                setIsVisible(false);
            }, 300); // Espera a que termine la animación de salida
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isOpen && !isVisible) return null;

    return (
        <div className={`ios-alert-overlay ${isVisible ? 'visible' : ''}`}>
            <div className="ios-alert">
                <h2 className="ios-alert-title">{title}</h2>
                <p className="ios-alert-message">{message}</p>
                <div className="ios-alert-buttons">
                    <button className="ios-alert-button cancel" onClick={onClose}>Cancelar</button>
                    <button className="ios-alert-button confirm" onClick={onConfirm}>Confirmar</button>
                </div>
            </div>
        </div>
    );
};

export default IOSAlert;