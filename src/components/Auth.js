    import React, { useState, useEffect } from 'react';
    import Preloader from './Preloader';
    import { auth, database } from '../services/firebase';
    import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, updateProfile } from 'firebase/auth';
    import { ref, set } from 'firebase/database';
    import { Eye, EyeOff } from 'lucide-react';
    import '../App.css'

    const Auth = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

        useEffect(() => {
            const timer = setTimeout(() => {
            setIsLoading(false);
            }, 2000); // Ajusta este valor para cambiar el tiempo de carga
        
            return () => clearTimeout(timer);
        }, []);

        const handleSubmit = async (e) => {
            e.preventDefault();
            setError('');
            setIsLoading(true);
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
                setError(getErrorMessage(error.code));
                setIsLoading(false);
            }
        };
        
        const handleGoogleSignIn = async () => {
            const provider = new GoogleAuthProvider();
            setIsLoading(true);
            try {
                const result = await signInWithPopup(auth, provider);
                const user = result.user;
                await set(ref(database, `users/${user.uid}`), {
                    fullName: user.displayName,
                    email: user.email,
                    photoURL: user.photoURL
                });
            } catch (error) {
                console.error('Error de inicio de sesión con Google:', error);
                setError('Error al iniciar sesión con Google. Por favor, inténtalo de nuevo.');
                setIsLoading(false);
            }
        };

    const getErrorMessage = (errorCode) => {
        switch (errorCode) {
            case 'auth/user-not-found':
                return 'No hay ninguna cuenta asociada a este correo electrónico.';
            case 'auth/wrong-password':
                return 'Contraseña incorrecta. Por favor, inténtalo de nuevo.';
            case 'auth/invalid-email':
                return 'El correo electrónico no es válido.';
            case 'auth/weak-password':
                return 'La contraseña es demasiado débil. Debe tener al menos 6 caracteres.';
            case 'auth/email-already-in-use':
                return 'Ya existe una cuenta con este correo electrónico.';
            default:
                return 'Ha ocurrido un error. Por favor, inténtalo de nuevo.';
        }
    };

    return (
        <>
        {isLoading ? (
          <Preloader />
        ) : (
        <div className="auth-page">
            <h2 className="auth-title">{isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}</h2>
            {error && <p className="auth-error">{error}</p>}
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
                <div className="password-input-container">
                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="auth-input"
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="password-toggle-button"
                    >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>
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
        )}
        </>
    );
    };

    export default Auth;