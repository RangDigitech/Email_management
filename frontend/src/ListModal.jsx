// ListModal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import './ListModal.css';

export default function ListModal({ isOpen, onClose, username, type, initialListName = '', initialEmails = [], onSaved }) {
    const [listName, setListName] = useState(initialListName);
    const [emails, setEmails] = useState(initialEmails);
    const [newEmail, setNewEmail] = useState('');
    const [error, setError] = useState('');
    const API_BASE = 'http://127.0.0.1:5000';

    useEffect(() => {
        if (isOpen) {
            setListName(initialListName || '');
            setEmails(Array.isArray(initialEmails) ? initialEmails : []);
            setNewEmail('');
            setError('');
        }
    }, [isOpen, initialListName, initialEmails]);

    const emailRegex = useMemo(() => /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, []);

    const addEmail = () => {
        if (!newEmail.trim()) return;
        if (!emailRegex.test(newEmail)) { setError('Invalid email'); return; }
        setError('');
        setEmails(prev => Array.from(new Set([...(prev || []), newEmail.trim()])));
        setNewEmail('');
    };

    const removeEmail = (idx) => setEmails(prev => prev.filter((_, i) => i !== idx));

    const parseCsvText = (text) => {
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const rows = lines.map(line => line.split(',')[0].trim()).filter(Boolean);
        return rows;
    };

    const handleCsvUpload = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const text = await file.text();
        const rows = parseCsvText(text);
        const valid = rows.filter(x => emailRegex.test(x));
        setError(rows.length && !valid.length ? 'No valid emails found in CSV' : '');
        setEmails(prev => Array.from(new Set([...(prev || []), ...valid])));
        e.target.value = '';
    };

    const handleSave = async () => {
        if (!listName.trim()) { setError('List name is required'); return; }
        if (!emails || emails.length === 0) { setError('Add at least one email'); return; }
        try {
            const res = await fetch(`${API_BASE}/api/lists/list`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, type, listName: listName.trim(), emails })
            });
            if (res.ok) {
                if (onSaved) onSaved({ listName: listName.trim(), emails });
                onClose();
            }
        } catch (e) { /* silent */ }
    };

    if (!isOpen) return null;

    return (
        <div className="listmodal-overlay">
            <div className="listmodal-content">
                <div className="listmodal-header">
                    <h3>{initialListName ? 'Edit List' : 'Create List'}</h3>
                    <button className="listmodal-close" onClick={onClose}>×</button>
                </div>
                <div className="listmodal-body">
                    <div className="form-group">
                        <label>List Name</label>
                        <input type="text" value={listName} onChange={e => setListName(e.target.value)} placeholder="e.g., Warm Leads" />
                    </div>
                    {error && <div className="lists-error" style={{marginBottom:8}}>{error}</div>}
                    <div className="input-row">
                        <input type="email" placeholder="Add email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="lists-input" />
                        <button className="primary-button" onClick={addEmail}>Add</button>
                        <label className="csv-upload">
                            <input type="file" accept=".csv" onChange={handleCsvUpload} />
                            Upload CSV
                        </label>
                    </div>
                    <ul className="email-list">
                        {emails.length === 0 ? (
                            <li className="muted">No emails yet.</li>
                        ) : (
                            emails.map((e, i) => (
                                <li key={i} className="email-item">
                                    <span>{e}</span>
                                    <button className="btn-delete" onClick={() => removeEmail(i)}>Remove</button>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
                <div className="listmodal-footer">
                    <button className="primary-button" onClick={handleSave}>{initialListName ? 'Save Changes' : 'Create List'}</button>
                </div>
            </div>
        </div>
    );
}
