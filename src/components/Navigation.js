import { Link, useLocation } from 'react-router-dom';
import { MapPin, Calendar, List, User, Users } from 'lucide-react';

const Navigation = () => {
    const location = useLocation();

    const isActive = (path) => {
        return location.pathname === path ? 'nav-link active' : 'nav-link';
    };

    return (
        <nav className="nav">
            <ul>
                <li>
                    <Link to="/" className={isActive('/')}>
                        <List size={24} />
                        <span>Eventos</span>
                    </Link>
                </li>
                <li>
                    <Link to="/map" className={isActive('/map')}>
                        <MapPin size={24} />
                        <span>Mapa</span>
                    </Link>
                </li>
                <li>
                    <Link to="/reminders" className={isActive('/reminders')}>
                        <Calendar size={24} />
                        <span>Recordatorios</span>
                    </Link>
                </li>
                <li>
                    <Link to="/collaborate" className={isActive('/collaborate')}>
                        <Users size={24} />
                        <span>Colaborar</span>
                    </Link>
                </li>
                <li>
                    <Link to="/profile" className={isActive('/profile')}>
                        <User size={24} />
                        <span>Perfil</span>
                    </Link>
                </li>
            </ul>
        </nav>
    );
};

export default Navigation;