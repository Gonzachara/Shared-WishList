    import React, { useState, useEffect, useContext, Suspense } from 'react';
    import { auth, database, storage } from '../services/firebase';
    import { ref as databaseRef, onValue, set } from 'firebase/database';
    import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
    import { updateProfile, signOut } from 'firebase/auth';
    import { ThemeContext } from '../contexts/ThemeContext';
    import Invitations from './Invitations';
    import IOSAlert from './IOSAlert';
    import { LogOut, Sun, Moon, Edit3 } from 'lucide-react';

    const Profile = () => {
        const [user, setUser] = useState(null);
        const [fullName, setFullName] = useState('');
        const [bio, setBio] = useState('');
        const [profileImage, setProfileImage] = useState(null);
        const [imageUrl, setImageUrl] = useState('');
        const [birthdate, setBirthdate] = useState('');
        const [location, setLocation] = useState('');
        const [email, setEmail] = useState('');
        const { theme, toggleTheme } = useContext(ThemeContext);
        const [showLogoutAlert, setShowLogoutAlert] = useState(false);

        useEffect(() => {
            const currentUser = auth.currentUser;
            if (currentUser) {
                setUser(currentUser);
                setFullName(currentUser.displayName || '');
                setImageUrl(currentUser.photoURL || '');
                setEmail(currentUser.email || '');
                
                const userRef = databaseRef(database, `users/${currentUser.uid}`);
                onValue(userRef, (snapshot) => {
                    const data = snapshot.val();
                    if (data) {
                        setFullName(data.fullName || currentUser.displayName || '');
                        setBio(data.bio || '');
                        setBirthdate(data.birthdate || '');
                        setLocation(data.location || '');
                    }
                });
            }
        }, []);

        const handleImageChange = (e) => {
            if (e.target.files[0]) {
                setProfileImage(e.target.files[0]);
                setImageUrl(URL.createObjectURL(e.target.files[0]));
            }
        };

        const handleSave = async () => {
            if (user) {
                let photoURL = user.photoURL;
    
                if (profileImage) {
                    const imageRef = storageRef(storage, `profileImages/${user.uid}`);
                    await uploadBytes(imageRef, profileImage);
                    photoURL = await getDownloadURL(imageRef);
                }
    
                await updateProfile(user, { displayName: fullName, photoURL });
                await set(databaseRef(database, `users/${user.uid}`), {
                    fullName,
                    email: user.email,
                    bio,
                    birthdate,
                    location
                });
    
                setImageUrl(photoURL);
                alert('Perfil actualizado con éxito');
            }
        };

        const handleLogoutClick = () => {
            setShowLogoutAlert(true);
        };

        const handleLogoutConfirm = async () => {
            try {
                await signOut(auth);
                setShowLogoutAlert(false);
            } catch (error) {
                console.error('Error de cierre de sesión:', error);
            }
        };

        const handleLogoutCancel = () => {
            setShowLogoutAlert(false);
        };

        return (
            <div className="page profile-page">
            <h2 className="page-title">Perfil</h2>
            <div className="profile-form">
            <div className="profile-image-container">
                <img src={imageUrl || 'https://via.placeholder.com/150'} alt="Foto de perfil" className="profile-image" />
                <label htmlFor="profile-image-input" className="profile-image-edit">
                    <Edit3 size={18} />
                    <input
                        id="profile-image-input"
                        type="file"
                        onChange={handleImageChange}
                        accept="image/*"
                        className="profile-image-input"
                    />
                </label>
            </div>
                    <div className="input-group">
                    <label htmlFor="fullName">Nombre completo</label>
                    <input
                        id="fullName"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="input"
                    />
                </div>
                <div className="input-group">
                <label htmlFor="email">Correo electrónico</label>
                <input
                    id="email"
                    type="email"
                    value={email}
                    readOnly
                    className="input-email"
                />
            </div>
                <div className="input-group">
                <label htmlFor="bio">Biografía</label>
                <textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="input"
                />
                </div>
                <div className="input-group">
                <label htmlFor="birthdate">Fecha de nacimiento</label>
                <input
                    id="birthdate"
                    type="date"
                    value={birthdate}
                    onChange={(e) => setBirthdate(e.target.value)}
                    className="input"
                />
                </div>
                <div className="input-group">
                <label htmlFor="location">Ubicación</label>
                <input
                    id="location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="input"
                />
                </div>
                <div className="input-group">
                    <label htmlFor="theme">Tema</label>
                    <button onClick={toggleTheme} className="button theme-toggle">
                        {theme === 'light' ? (
                            <>
                                <Moon size={18} />
                                <span>Cambiar a tema oscuro</span>
                            </>
                        ) : (
                            <>
                                <Sun size={18} />
                                <span>Cambiar a tema claro</span>
                            </>
                        )}
                    </button>
                </div>
                <div className="button-group">
                    <button onClick={handleSave} className="button">Guardar cambios</button>
                    <button onClick={handleLogoutClick} className="button logout-button">
                        <LogOut size={18} />
                        <span>Cerrar sesión</span>
                    </button>
                </div>
            </div>
            <Suspense fallback={<div>Cargando invitaciones...</div>}>
                <Invitations />
            </Suspense>
            <IOSAlert
                isOpen={showLogoutAlert}
                onClose={handleLogoutCancel}
                onConfirm={handleLogoutConfirm}
                title="Cerrar sesión"
                message="¿Estás seguro de que quieres cerrar sesión?"
            />
        </div>
    );
    };

    export default Profile;