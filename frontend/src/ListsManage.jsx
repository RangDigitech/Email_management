// ListsManage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import './ListsPage.css';

export default function ListsManage({ username }) {
  const [activeTab, setActiveTab] = useState('senders');
  const [senderLists, setSenderLists] = useState([]);
  const [receiverLists, setReceiverLists] = useState([]);
  const API_BASE = 'http://127.0.0.1:5000';

  const refresh = async () => {
    if (!username) return;
    try {
      const res = await fetch(`${API_BASE}/api/lists?username=${encodeURIComponent(username)}`);
      if (!res.ok) return;
      const data = await res.json();
      setSenderLists(Array.isArray(data.senders) ? data.senders : []);
      setReceiverLists(Array.isArray(data.receivers) ? data.receivers : []);
    } catch {}
  };

  useEffect(() => { refresh(); }, [username]);

  const handleDelete = async (type, listName) => {
    try {
      await fetch(`${API_BASE}/api/lists/list?username=${encodeURIComponent(username)}&type=${type}&listName=${encodeURIComponent(listName)}`, { method: 'DELETE' });
      refresh();
    } catch {}
  };

  const ListTable = ({ items, type }) => (
    <div className="lists-section">
      <div className="lists-header-row">
        <h3 className="title-left">{type === 'senders' ? 'Sender Lists' : 'Receiver Lists'}</h3>
      </div>
      <table className="manage-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Emails</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr><td colSpan="3" className="muted">No lists yet.</td></tr>
          ) : (
            items.map(l => (
              <tr key={`${type}-${l.listName}`}>
                <td>{l.listName}</td>
                <td>{(l.emails || []).length}</td>
                <td>
                  <button className="btn-small secondary" onClick={() => alert((l.emails || []).join('\n'))}>View</button>
                  <button className="btn-small danger" onClick={() => handleDelete(type, l.listName)}>Delete</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="lists-page">
      <div className="lists-header-row">
        <h2 className="title-left">Manage Lists</h2>
        <div className="right-tabs">
          <button className={`tab-btn ${activeTab === 'senders' ? 'active' : ''}`} onClick={() => setActiveTab('senders')}>Sender</button>
          <button className={`tab-btn ${activeTab === 'receivers' ? 'active' : ''}`} onClick={() => setActiveTab('receivers')}>Receiver</button>
        </div>
      </div>
      {activeTab === 'senders' ? (
        <ListTable items={senderLists} type="senders" />
      ) : (
        <ListTable items={receiverLists} type="receivers" />
      )}
    </div>
  );
}
