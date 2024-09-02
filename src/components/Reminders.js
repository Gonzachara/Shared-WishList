import React, { useState, useEffect } from 'react';
import { database, auth } from '../services/firebase';
import { ref, onValue, push, remove, update } from 'firebase/database';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import EditReminderModal from './EditReminderModal';
import IOSAlert from './IOSAlert';
import { Edit2, Check, Undo, Trash2, Rewind, CalendarFold, CircleCheckBig, PenLine, Calendar } from 'lucide-react';
import '../App.css';

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
                date: newReminder.date ? newReminder.date.toISOString() : new Date().toISOString(),
                completed: false
            };
            
            if (sharedListId) {
                const sharedReminderRef = ref(database, `sharedLists/${sharedListId}/reminders/${currentUser.uid}`);
                push(sharedReminderRef, newReminderData);
            } else {
                const personalReminderRef = ref(database, `reminders/${currentUser.uid}/personal`);
                push(personalReminderRef, newReminderData);
            }
            
            // Modificamos esta línea para resetear la fecha a null
            setNewReminder({ title: '', date: null, completed: false });
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
            if (!editedReminder.isPersonal && editedReminder.owner !== currentUser.uid) {
                console.error('No tienes permiso para editar este recordatorio.');
                return;
            }
    
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

    const sortedReminders = reminders.sort((a, b) => new Date(a.date) - new Date(b.date));
    const now = new Date();
    const nextReminders = sortedReminders.filter(reminder => !reminder.completed && new Date(reminder.date) >= now);
    const pastReminders = sortedReminders.filter(reminder => !reminder.completed && new Date(reminder.date) < now);
    const completedReminders = sortedReminders.filter(reminder => reminder.completed);    

    const CustomInput = React.forwardRef(({ value, onClick }, ref) => (
        <div className="input-wrapper custom-date-input" onClick={onClick} ref={ref}>
            <CalendarFold size={18} className="input-icon" />
            <input value={value} readOnly className="input" placeholder="Seleccionar fecha" />
        </div>
    ));

    
    const resetAllReminders = () => {
        setAlertConfig({
            isOpen: true,
            title: "Resetear todos los recordatorios",
            message: "¿Estás seguro que quieres eliminar todos tus recordatorios? Esta acción no se puede deshacer.",
            onConfirm: () => {
                const currentUser = auth.currentUser;
                if (currentUser) {
                    // Eliminar recordatorios personales
                    const personalRemindersRef = ref(database, `reminders/${currentUser.uid}/personal`);
                    remove(personalRemindersRef);

                    // Eliminar recordatorios compartidos
                    const sharedListsRef = ref(database, 'sharedLists');
                    onValue(sharedListsRef, (snapshot) => {
                        const data = snapshot.val();
                        if (data) {
                            Object.entries(data).forEach(([listId, listData]) => {
                                if (listData.owners.includes(currentUser.uid)) {
                                    const userRemindersRef = ref(database, `sharedLists/${listId}/reminders/${currentUser.uid}`);
                                    remove(userRemindersRef);
                                }
                            });
                        }
                    }, { onlyOnce: true });

                    // Limpiar el estado local
                    setReminders([]);
                    setAlertConfig({ ...alertConfig, isOpen: false });
                    console.log('Todos los recordatorios han sido eliminados');
                }
            }
        });
    };

    return (
        <div className="ios-page">
            <h2 className="ios-page-title">Recordatorios</h2>
            <form onSubmit={addReminder} className="ios-form">
                <div className="input-wrapper">
                    <PenLine size={18} className="input-icon" />
                    <input
                        type="text"
                        value={newReminder.title}
                        onChange={(e) => setNewReminder({...newReminder, title: e.target.value})}
                        placeholder="Título del recordatorio"
                        className="input"
                        required
                    />
                </div>
                <div className="input-wrapper date-picker-wrapper">
                    <Calendar size={18} className="input-icon" />
                    <DatePicker
                        selected={newReminder.date}
                        onChange={(date) => setNewReminder({...newReminder, date})}
                        dateFormat="dd/MM/yyyy"
                        customInput={<CustomInput />}
                        placeholderText="Seleccionar fecha"
                        isClearable
                    />
                </div>
                <button type="submit" className="ios-button-reminder">
                    Agregar Recordatorio +
                </button>
                <br />
                <button onClick={resetAllReminders} className="ios-button-danger">
                    <span>Eliminar todos los recordatorios</span>
                    <Trash2 size={18} />
                </button>
            </form>
            <div className="ios-section">
                <h3 className="ios-section-title">
                    Próximos Recordatorios <CalendarFold className="ios-section-icon" />
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
                        Recordatorios Pasados <Rewind className="ios-section-icon" />
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
                        Recordatorios Completados <CircleCheckBig className="ios-section-icon" />
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