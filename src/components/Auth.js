    import React, { useState } from 'react';
    import { auth, database } from '../services/firebase';
    import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, updateProfile } from 'firebase/auth';
    import { ref, set } from 'firebase/database';
    import '../App.css'

    const Auth = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isSignUp) {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                await updateProfile(user, { displayName: fullName });
                await set(ref(database, `users/${user.uid}`), {
                    displayName: fullName,
                    email: user.email
                });
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (error) {
            console.error('Authentication error:', error);
        }
    };

    const handleGoogleSignIn = async () => {
        const provider = new GoogleAuthProvider();
        try {
        await signInWithPopup(auth, provider);
        } catch (error) {
        console.error('Google Sign In error:', error);
        }
    };

    return (
        <div className="auth-page">
            <h2 className="auth-title">{isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}</h2>
            <form onSubmit={handleSubmit} className="auth-form">
                {isSignUp && (
                    <input
                        type="text"
                        placeholder="Nombre completo"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="auth-input"
                        required
                    />
                )}
                <input
                    type="email"
                    placeholder="Correo electrónico"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="auth-input"
                    required
                />
                <input
                    type="password"
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="auth-input"
                    required
                />
                <button type="submit" className="auth-button primary">
                    {isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}
                </button>
            </form>
            <button onClick={handleGoogleSignIn} className="auth-button google">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo" className="google-icon" />
                Continuar con Google
            </button>
            <button onClick={() => setIsSignUp(!isSignUp)} className="auth-button secondary">
                {isSignUp ? '¿Ya tenés una cuenta? Inicia sesión' : '¿No tenés una cuenta? Registrate'}
            </button>
        </div>
    );
    };

    export default Auth;