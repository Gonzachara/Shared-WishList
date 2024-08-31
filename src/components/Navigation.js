    import { Link } from 'react-router-dom';
    import { MapPin, Calendar, List, User, Users } from 'lucide-react';


    const Navigation = () => {
        return (
            <nav className="nav">
                <ul>
                    <li>
                        <Link to="/" className="nav-link">
                            <List size={24} />
                            <span>Wish List</span>
                        </Link>
                    </li>
                    <li>
                        <Link to="/map" className="nav-link">
                            <MapPin size={24} />
                            <span>Map</span>
                        </Link>
                    </li>
                    <li>
                        <Link to="/reminders" className="nav-link">
                            <Calendar size={24} />
                            <span>Reminders</span>
                        </Link>
                    </li>
                    <li>
                        <Link to="/collaborate" className="nav-link">
                            <Users size={24} />
                            <span>Collaborate</span>
                        </Link>
                    </li>
                    <li>
                        <Link to="/profile" className="nav-link">
                            <User size={24} />
                            <span>Profile</span>
                        </Link>
                    </li>
                </ul>
            </nav>
        );
    };

    export default Navigation;