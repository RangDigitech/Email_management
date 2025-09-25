import React, { useEffect, useMemo, useRef, useState } from 'react';
import './ListsPage.css';
import { FaPlus } from 'react-icons/fa';

export default function ListsPage({ username }) {
  const [activeTab, setActiveTab] = useState('senders');
  const [listName, setListName] = useState('');
  const [emails, setEmails] = useState([]);          // manually added emails
  const [newEmail, setNewEmail] = useState('');      // input text
  const [error, setError] = useState('');
  const [showEmails, setShowEmails] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [fileEmails, setFileEmails] = useState([]);  // emails parsed from file

  const API_BASE = 'http://127.0.0.1:5000';
  const emailRegex = useMemo(() => /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, []);
  const fileInputRef = useRef(null);

  useEffect(() => {
    console.log('ListsPage username:', username);
  }, [username]);

  // When a file is selected via the plus button
  const handleCsvSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name); // show file name in input

    try {
      const text = await file.text();
      const possibleItems = text.split(/[\r\n,;|\t ]+/).map(x => x.trim()).filter(Boolean);
      const extracted = possibleItems.filter(x => emailRegex.test(x));
      setFileEmails(extracted); // store separately for viewing/saving

      if (!extracted.length) {
        setError('No valid emails found in the file');
      } else {
        setError('');
      }
    } catch (err) {
      console.error('Error reading file:', err);
      setError('Could not read file');
    }
  };

  // When user clicks Add button (for manual emails only)
  const addEmail = () => {
    if (!newEmail.trim()) return;

    const parts = newEmail.split(/[\r\n,;|\t ]+/)
      .map(x => x.trim())
      .filter(x => emailRegex.test(x));

    if (!parts.length) {
      setError('No valid emails to add');
      return;
    }

    setEmails(prev => Array.from(new Set([...prev, ...parts])));
    setNewEmail('');
    setError('');
  };

  const removeEmail = (idx) => {
    setEmails(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!listName.trim()) {
      setError('List name is required');
      return;
    }
    if (!emails.length && !fileEmails.length) {
      setError('Add at least one email');
      return;
    }

    const allEmails = Array.from(new Set([...emails, ...fileEmails]));

    console.log('Saving list:', { username, listName, emails: allEmails, type: activeTab });
    try {
      await fetch(`${API_BASE}/api/lists/list`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          type: activeTab === 'receivers' ? 'receivers' : 'senders',
          listName: listName.trim(),
          emails: allEmails,
        }),
      });
      setError('');
    } catch (err) {
      console.error('Error saving list:', err);
    }
  };

  const handleDelete = async () => {
    if (!listName) return;
    console.log('Deleting list:', { username, listName, type: activeTab });
    try {
      await fetch(
        `${API_BASE}/api/lists/list?username=${encodeURIComponent(
          username
        )}&type=${activeTab === 'receivers' ? 'receivers' : 'senders'}&listName=${encodeURIComponent(listName)}`,
        { method: 'DELETE' }
      );
      setListName('');
      setEmails([]);
      setFileEmails([]);
      setSelectedFileName('');
      setError('');
    } catch (err) {
      console.error('Error deleting list:', err);
    }
  };

  return (
    <div className="lists-page">
      <div className="page-header-row">
        <h2 className="title-left">Add List</h2>
        <div className="right-tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'senders' ? 'active' : ''}`}
            onClick={() => setActiveTab('senders')}
          >
            Sender
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'receivers' ? 'active' : ''}`}
            onClick={() => setActiveTab('receivers')}
          >
            Receiver
          </button>
        </div>
      </div>

      <div className="lists-section">
        {error && <div className="lists-error">{error}</div>}

        <div className="form-row">
          <label>List Name</label>
          <input
            type="text"
            placeholder="Enter list name"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            className="lists-input"
          />
        </div>

        {/* Input row with Add + Upload */}
        <div className="input-row">
          <input
            type="text"
            placeholder={activeTab === 'receivers' ? 'Add receiver emails' : 'Add sender emails'}
            value={selectedFileName || newEmail}
            onChange={(e) => {
              setSelectedFileName('');
              setNewEmail(e.target.value);
            }}
            className="lists-input"
          />
          <button
            type="button"
            className="btn-small primary"
            style={{ padding: '8px 12px' }}
            onClick={addEmail}
          >
            Add
          </button>
          <button
            type="button"
            className="btn-small upload"
            style={{ padding: '8px 10px' }}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
          >
            <FaPlus />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            style={{ display: 'none' }}
            onChange={handleCsvSelect}
          />
        </div>

        {/* Action Buttons */}
        <div className="bottom-actions" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn-small danger" onClick={handleDelete} disabled={!listName}>
            Delete
          </button>
          <button type="button" className="btn-small primary" onClick={handleSave}>
            Save
          </button>
          <button
            type="button"
            className="btn-small secondary"
            onClick={() => setShowEmails(!showEmails)}
            disabled={!emails.length && !fileEmails.length}
          >
            {showEmails ? 'Hide Emails' : 'View Emails'}
          </button>
        </div>

        {/* Show emails only when View is clicked */}
        {showEmails && (
          <ul className="email-list">
            {[...emails, ...fileEmails].map((e, i) => (
              <li key={i} className="email-item">
                <span>{e}</span>
                <button
                  className="btn-delete"
                  onClick={() => {
                    if (i < emails.length) {
                      removeEmail(i);
                    } else {
                      setFileEmails(prev => prev.filter((_, j) => j !== i - emails.length));
                    }
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
