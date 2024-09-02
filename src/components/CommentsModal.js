import React, { useState, useEffect } from 'react';
import { auth, database } from '../services/firebase';
import { ref as databaseRef, get } from 'firebase/database';
import { Globe, Lock, Trash2 } from 'lucide-react';
import IOSAlert from './IOSAlert';
import '../styles/CommentsModal.css';

const CommentsModal = ({ isOpen, onClose, event, onAddComment, onDeleteComment }) => {
    const [newComment, setNewComment] = useState({ text: '', isPrivate: false });
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, commentId: null });
    const [isAnimating, setIsAnimating] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [userProfiles, setUserProfiles] = useState({});
    const currentUser = auth.currentUser;

    useEffect(() => {
        if (isOpen) {
            setIsAnimating(true);
            setIsClosing(false);
            loadUserProfiles();
        } else {
            setIsClosing(true);
            const timer = setTimeout(() => {
                setIsAnimating(false);
                setIsClosing(false);
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);


    const loadUserProfiles = async () => {
        const profiles = {};
        for (const comment of event.comments || []) {
            if (!profiles[comment.author]) {
                const userRef = databaseRef(database, `users/${comment.author}`);
                const snapshot = await get(userRef);
                if (snapshot.exists()) {
                    profiles[comment.author] = snapshot.val();
                }
            }
        }
        setUserProfiles(profiles);
    };

    if (!isAnimating && !isOpen) return null;

    const handleAddComment = () => {
        const commentWithUser = {
            ...newComment,
            author: currentUser.uid,
            createdAt: new Date().toISOString(),
        };
        onAddComment(commentWithUser);
        setNewComment({ text: '', isPrivate: false });
    };

    const handleDeleteClick = (commentId) => {
        setAlertConfig({ isOpen: true, commentId });
    };

    const handleConfirmDelete = () => {
        if (alertConfig.commentId) {
            onDeleteComment(alertConfig.commentId);
        }
        setAlertConfig({ isOpen: false, commentId: null });
    };

    const handleCancelDelete = () => {
        setAlertConfig({ isOpen: false, commentId: null });
    };

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 200);
    };

    const visibleComments = event.comments ? event.comments.filter(comment => 
        !comment.isPrivate || comment.author === currentUser.uid
    ) : [];

    return (
        <div className={`comments-modal-overlay ${isOpen || isAnimating ? 'open' : ''}`}>
            <div className={`comments-modal ${isOpen && !isClosing ? 'open' : isClosing ? 'closing' : ''}`}>
                <h3 className="comments-modal-title">Comentarios para: <strong>{event.title}</strong></h3>
                <br />
                <div className="comments-list">
                    {visibleComments.map(comment => (
                        <div key={comment.id} className="comment">
                            <div className="comment-content">
                                <p>{comment.text}</p>
                                <small>
                                    {new Date(comment.createdAt).toLocaleString()} - 
                                    {comment.author === currentUser.uid ? 'Tú' : userProfiles[comment.author]?.fullName || ' Colaborador'}
                                    <strong>{comment.isPrivate && ' (Privado)'}</strong>
                                </small>
                                {comment.author === currentUser.uid && (
                                    <button 
                                        onClick={() => handleDeleteClick(comment.id)} 
                                        className="delete-comment-button"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                <textarea
                    value={newComment.text}
                    onChange={(e) => setNewComment({ ...newComment, text: e.target.value })}
                    placeholder="Escribe tu comentario aquí"
                    className="comment-textarea"
                />
                <div className="comment-privacy-selector">
                    <div className="custom-select">
                        {newComment.isPrivate ? (
                            <Lock size={16} className="select-icon" />
                        ) : (
                            <Globe size={16} className="select-icon" />
                        )}
                        <select
                            value={newComment.isPrivate ? 'private' : 'public'}
                            onChange={(e) => setNewComment({ ...newComment, isPrivate: e.target.value === 'private' })}
                            className="comment-select"
                        >
                            <option value="public">Público</option>
                            <option value="private">Privado</option>
                        </select>
                    </div>
                </div>
                <br />
                <div className="comment-actions">
                    <button onClick={handleAddComment} className="add-comment-button">Añadir Comentario</button>
                    <button onClick={handleClose} className="close-modal-button">Cerrar</button>
                </div>
            </div>
            <IOSAlert
                isOpen={alertConfig.isOpen}
                onClose={handleCancelDelete}
                onConfirm={handleConfirmDelete}
                title="Eliminar comentario"
                message="¿Estás seguro de que quieres eliminar este comentario?"
            />
        </div>
    );
};

export default CommentsModal;