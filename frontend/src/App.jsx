import React, { useState } from 'react';
import './App.css'; 
import Dashboard from './Dashboard.jsx';

// Main App Component
export default function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [username, setUsername] = useState('');
    const [isLoginView, setIsLoginView] = useState(true);
    const [message, setMessage] = useState({ text: '', type: '' });

    const handleSubmit = async (event) => {
        event.preventDefault();
        setMessage({ text: '', type: '' });
        const form = event.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        const endpoint = isLoginView ? '/api/login' : '/api/signup';
        const url = `http://127.0.0.1:5000${endpoint}`;

        try {
            setMessage({ text: 'Processing...', type: 'info' });
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await response.json();

            if (response.ok) {
                if (isLoginView) {
                    setMessage({ text: result.message, type: 'success' });
                    setIsLoggedIn(true); 
                    setUsername(data.username);
                } else {
                    setMessage({ text: 'Account created! Please log in.', type: 'success' });
                    setIsLoginView(true);
                }
                form.reset();
            } else {
                setMessage({ text: result.message || 'An error occurred.', type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'Could not connect to the server. Is it running?', type: 'error' });
        }
    };

    const handleLogout = () => {
        setIsLoggedIn(false);
        setUsername('');
        setMessage({ text: 'You have been logged out.', type: 'info' });
    };

    if (isLoggedIn) {
        return <Dashboard username={username} onLogout={handleLogout} />;
    }
    
    return (
        <div className="auth-container">
            <div className="form-card">
                {isLoginView ? (
                    <div className="form-wrapper">
                        <div className="form-header">
                            <h1 className="form-title">Welcome Back!</h1>
                            <p className="form-subtitle">Log in to continue your journey.</p>
                        </div>
                        <form className="form-body" onSubmit={handleSubmit}>
                            <input name="username" type="text" required className="form-input" placeholder="Username" />
                            <input name="password" type="password" required className="form-input" placeholder="Password" />
                            <button type="submit" className="primary-button">Log In</button>
                        </form>
                        <p className="toggle-text">
                            Don't have an account?{' '}
                            <button onClick={() => { setIsLoginView(false); setMessage({text:'', type:''}); }} className="toggle-link">
                                Sign up
                            </button>
                        </p>
                    </div>
                ) : (
                    <div className="form-wrapper">
                         <div className="form-header">
                            <h1 className="form-title">Create an Account</h1>
                            <p className="form-subtitle">Join us and start your journey!</p>
                        </div>
                        <form className="form-body" onSubmit={handleSubmit}>
                            <input name="username" type="text" required className="form-input" placeholder="Username" />
                            <input name="email" type="email" required className="form-input" placeholder="Email address" />
                            <input name="password" type="password" required className="form-input" placeholder="Password" />
                            <button type="submit" className="primary-button">Sign Up</button>
                        </form>
                         <p className="toggle-text">
                            Already have an account?{' '}
                            <button onClick={() => { setIsLoginView(true); setMessage({text:'', type:''}); }} className="toggle-link">
                                Log in
                            </button>
                        </p>
                    </div>
                )}
                {message.text && (
                    <div className={`message-box ${message.type}`}>
                        {message.text}
                    </div>
                )}
            </div>
        </div>
    );
}


