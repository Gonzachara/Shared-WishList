import React, { useState, useEffect } from 'react';
import { database, auth } from '../services/firebase';
import { ref, onValue, push, remove, update } from 'firebase/database';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaCalendarAlt, FaHourglassHalf, FaCheckCircle } from 'react-icons/fa';
import EditReminderModal from './EditReminderModal';
import IOSAlert from './IOSAlert';
import { Edit2, Check, Clock, Zap, CircleX, Undo, Trash2 } from 'lucide-react';

const Reminders = () => {
    const [reminders, setReminders] = useState([]);
    const [newReminder, setNewReminder] = useState({ title: '', date: null, completed: false });
    const [sharedListId, setSharedListId] = useState(null);
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
    const [editingReminder, setEditingReminder] = useState(null);

    useEffect(() => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            // Cargar recordatorios personales
            const personalRemindersRef = ref(database, `reminders/${currentUser.uid}/personal`);
            const unsubscribePersonal = onValue(personalRemindersRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    const reminderList = Object.entries(data).map(([key, value]) => ({
                        id: key,
                        ...value,
                        owner: currentUser.uid,
                        isPersonal: true
                    }));
                    setReminders(prevReminders => {
                        const sharedReminders = prevReminders.filter(reminder => !reminder.isPersonal);
                        return [...sharedReminders, ...reminderList];
                    });
                }
            });
    
            // Buscar y cargar recordatorios compartidos
            const sharedListsRef = ref(database, 'sharedLists');
            const unsubscribeShared = onValue(sharedListsRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    const sharedList = Object.entries(data).find(([_, value]) => 
                        value.accepted && value.owners.includes(currentUser.uid)
                    );
                    if (sharedList) {
                        const [listId, listData] = sharedList;
                        setSharedListId(listId);
                        const sharedReminderList = Object.entries(listData.reminders || {}).flatMap(([uid, reminders]) => 
                            Object.entries(reminders).map(([key, value]) => ({
                                id: key,
                                ...value,
                                owner: uid,
                                isPersonal: false,
                                listId: listId
                            }))
                        );
                        setReminders(prevReminders => {
                            const personalReminders = prevReminders.filter(reminder => reminder.isPersonal);
                            return [...personalReminders, ...sharedReminderList];
                        });
                    }
                }
            });
    
            return () => {
                unsubscribePersonal();
                unsubscribeShared();
            };
        }
    }, []);
    
    const addReminder = (e) => {
        e.preventDefault();
        const currentUser = auth.currentUser;
        if (currentUser) {
            const newReminderData = {
                ...newReminder,
                owner: currentUser.uid,
                date: newReminder.date ? newReminder.date.toISOString() : new Date().toISOString(), // Aseguramos que siempre haya una fecha
                completed: false
            };
            
            if (sharedListId) {
                const sharedReminderRef = ref(database, `sharedLists/${sharedListId}/reminders/${currentUser.uid}`);
                push(sharedReminderRef, newReminderData);
            } else {
                const personalReminderRef = ref(database, `reminders/${currentUser.uid}/personal`);
                push(personalReminderRef, newReminderData);
            }
            
            setNewReminder({ title: '', date: new Date(), completed: false }); // Establecemos la fecha por defecto a la actual
        }
    };
    
    const toggleCompleted = (reminder) => {
        const action = reminder.completed ? "desmarcar" : "marcar como completado";
        setAlertConfig({
            isOpen: true,
            title: `${action.charAt(0).toUpperCase() + action.slice(1)} recordatorio`,
            message: `¿Estás seguro que quieres ${action} este recordatorio?`,
            onConfirm: () => {
                const updatedReminder = { ...reminder, completed: !reminder.completed };
                const currentUser = auth.currentUser;
                if (currentUser) {
                    const reminderRef = reminder.isPersonal
                        ? ref(database, `reminders/${currentUser.uid}/personal/${reminder.id}`)
                        : ref(database, `sharedLists/${reminder.listId}/reminders/${reminder.owner}/${reminder.id}`);
                    
                    update(reminderRef, updatedReminder);
                }
                setAlertConfig({ ...alertConfig, isOpen: false });
            }
        });
    };
    
    const deleteReminder = (reminder) => {
        setAlertConfig({
            isOpen: true,
            title: "Eliminar recordatorio",
            message: "¿Estás seguro que quieres eliminar este recordatorio?",
            onConfirm: () => {
                const currentUser = auth.currentUser;
                if (currentUser) {
                    const reminderRef = reminder.isPersonal
                        ? ref(database, `reminders/${currentUser.uid}/personal/${reminder.id}`)
                        : ref(database, `sharedLists/${reminder.listId}/reminders/${reminder.owner}/${reminder.id}`);
                    
                    remove(reminderRef);
                }
                setAlertConfig({ ...alertConfig, isOpen: false });
            }
        });
    };

    const editReminder = (reminder) => {
        setEditingReminder(reminder);
    };

    const handleEditReminder = (editedReminder) => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            const reminderRef = editedReminder.isPersonal
                ? ref(database, `reminders/${currentUser.uid}/personal/${editedReminder.id}`)
                : ref(database, `sharedLists/${editedReminder.listId}/reminders/${editedReminder.owner}/${editedReminder.id}`);
    
            const updatedReminder = {
                ...editedReminder,
                date: editedReminder.date ? editedReminder.date : null
            };
    
            if (!editedReminder.isPersonal) {
                updatedReminder.lastEditedBy = currentUser.displayName || currentUser.email;
                updatedReminder.lastEditedAt = new Date().toISOString();
            }
    
            update(reminderRef, updatedReminder)
                .then(() => {
                    console.log('Recordatorio actualizado con éxito');
                    setEditingReminder(null);
                    setReminders(prevReminders => 
                        prevReminders.map(reminder => 
                            reminder.id === editedReminder.id ? updatedReminder : reminder
                        )
                    );
                })
                .catch((error) => {
                    console.error('Error al actualizar recordatorio:', error);
                });
        }
    };

    const updateReminder = (e) => {
        e.preventDefault();
        const currentUser = auth.currentUser;
        if (currentUser && editingReminder) {
            const reminderRef = editingReminder.isPersonal
                ? ref(database, `reminders/${currentUser.uid}/personal/${editingReminder.id}`)
                : ref(database, `sharedLists/${editingReminder.listId}/reminders/${editingReminder.owner}/${editingReminder.id}`);
            
            const updatedReminder = {
                ...editingReminder,
                title: newReminder.title,
                date: newReminder.date.toISOString(),
            };
            
            update(reminderRef, updatedReminder);
            setEditingReminder(null);
            setNewReminder({ title: '', date: new Date(), completed: false });
        }
    };

    const sortedReminders = reminders.sort((a, b) => new Date(a.date) - new Date(b.date));
    const now = new Date();
    const nextReminders = sortedReminders.filter(reminder => !reminder.completed && new Date(reminder.date) >= now);
    const pastReminders = sortedReminders.filter(reminder => !reminder.completed && new Date(reminder.date) < now);
    const completedReminders = sortedReminders.filter(reminder => reminder.completed);    
    
    return (
        <div className="ios-page">
            <h2 className="ios-page-title">Recordatorios</h2>
            <form onSubmit={addReminder} className="ios-form">
                <input
                    type="text"
                    value={newReminder.title}
                    onChange={(e) => setNewReminder({...newReminder, title: e.target.value})}
                    placeholder="Título del recordatorio"
                    className="ios-input"
                    required
                />
                <DatePicker
                    selected={newReminder.date}
                    onChange={(date) => setNewReminder({...newReminder, date})}
                    dateFormat="dd/MM/yyyy"
                    className="ios-datepicker"
                    placeholderText="Seleccionar fecha"
                    isClearable
                />
                <button type="submit" className="ios-button-reminder">
                    Agregar Recordatorio +
                </button>
            </form>
            <div className="ios-section">
                <h3 className="ios-section-title">
                    Próximos Recordatorios <FaCalendarAlt className="ios-section-icon" />
                </h3>
                {nextReminders.length > 0 ? (
                    <ul className="ios-list">
                        {nextReminders.map((reminder) => (
                            <li key={reminder.id} className="ios-list-item">
                                <div className="ios-list-item-content">
                                    <div className="ios-list-item-title">{reminder.title}</div>
                                    <div className="ios-list-item-details">
                                        <span className="ios-list-item-date">{new Date(reminder.date).toLocaleDateString()}</span>
                                        {!reminder.isPersonal && reminder.lastEditedBy && (
                                            <span className="ios-list-item-edited">
                                                Editado por {reminder.lastEditedBy}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="ios-list-item-actions">
                                    <button onClick={() => toggleCompleted(reminder)} className="ios-button-icon ios-button-complete" aria-label="Completar">
                                        <Check size={18} />
                                    </button>
                                    <button onClick={() => editReminder(reminder)} className="ios-button-icon ios-button-edit" aria-label="Editar">
                                        <Edit2 size={18} />
                                    </button>
                                    <button onClick={() => deleteReminder(reminder)} className="ios-button-icon ios-button-delete" aria-label="Eliminar">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="ios-empty-message">No tienes próximos recordatorios.</p>
                )}
            </div>
            {pastReminders.length > 0 && (
                <div className="ios-section">
                    <h3 className="ios-section-title">
                        Recordatorios Pasados <FaHourglassHalf className="ios-section-icon" />
                    </h3>
                    <ul className="ios-list">
                        {pastReminders.map((reminder) => (
                            <li key={reminder.id} className="ios-list-item">
                                <div className="ios-list-item-content">
                                    <div className="ios-list-item-title">{reminder.title}</div>
                                    <div className="ios-list-item-details">
                                        <span className="ios-list-item-date">{new Date(reminder.date).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="ios-list-item-actions">
                                    <button onClick={() => toggleCompleted(reminder)} className="ios-button-icon ios-button-complete" aria-label="Completar">
                                        <Check size={18} />
                                    </button>
                                    <button onClick={() => editReminder(reminder)} className="ios-button-icon ios-button-edit" aria-label="Editar">
                                        <Edit2 size={18} />
                                    </button>
                                    <button onClick={() => deleteReminder(reminder)} className="ios-button-icon ios-button-delete" aria-label="Eliminar">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {completedReminders.length > 0 && (
                <div className="ios-section">
                    <h3 className="ios-section-title">
                        Recordatorios Completados <FaCheckCircle className="ios-section-icon" />
                    </h3>
                    <ul className="ios-list">
                        {completedReminders.map((reminder) => (
                            <li key={reminder.id} className="ios-list-item">
                                <div className="ios-list-item-content">
                                    <div className="ios-list-item-title">{reminder.title}</div>
                                    <div className="ios-list-item-details">
                                        <span className="ios-list-item-date">{new Date(reminder.date).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="ios-list-item-actions">
                                    <button onClick={() => toggleCompleted(reminder)} className="ios-button-icon ios-button-undo" aria-label="Completar">
                                        <Undo size={18} />
                                    </button>
                                    <button onClick={() => editReminder(reminder)} className="ios-button-icon ios-button-edit" aria-label="Editar">
                                        <Edit2 size={18} />
                                    </button>
                                    <button onClick={() => deleteReminder(reminder)} className="ios-button-icon ios-button-delete" aria-label="Eliminar">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            <IOSAlert
                isOpen={alertConfig.isOpen}
                onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
                onConfirm={alertConfig.onConfirm}
                title={alertConfig.title}
                message={alertConfig.message}
            />
            {editingReminder && (
                <EditReminderModal
                    reminder={editingReminder}
                    onSave={handleEditReminder}
                    onClose={() => {
                        setEditingReminder(null);
                        setNewReminder({ title: '', date: null, completed: false });
                    }}
                />
            )}
        </div>
    );
};

export default Reminders;