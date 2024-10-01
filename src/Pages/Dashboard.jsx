import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaCopy } from "react-icons/fa"; // Import the copy icon from react-icons
import DOMAIN from "../Domain"; // Import the DOMAIN variable
import { useNavigate } from "react-router-dom";
import './Dashboard.css'; // Import the CSS for styling

const Dashboard = () => {
  const [data, setData] = useState([]); // Collection data
  const [selectedCollection, setSelectedCollection] = useState(null); // Currently selected collection
  const [newKeyValue, setNewKeyValue] = useState({ key: "", value: "" }); // New key-value pair
  const [newCollectionName, setNewCollectionName] = useState(""); // Input for adding new collection
  const [editingKeyValue, setEditingKeyValue] = useState(null); // For editing key-value pairs
  const [editedCollectionName, setEditedCollectionName] = useState(""); // For editing collection name

  const navigate = useNavigate();

  useEffect(() => {
    fetchData(); // Fetch data on component mount
  }, []);

  const fetchData = async () => {
    try {
      const response = await axios.get(`${DOMAIN}/api/data`, { withCredentials: true });
      setData(response.data.data.coll);
      if (response.data.data.coll.length > 0) {
        setSelectedCollection(response.data.data.coll[0].colname); // Select the first collection
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        navigate("/login"); // Redirect to login if unauthorized
      }
      console.error("Error fetching data:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${DOMAIN}/api/user/logout`, {}, { withCredentials: true });
      navigate("/login"); // Redirect to login after logout
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleAddKeyValue = async () => {
    if (!newKeyValue.key || !newKeyValue.value || !selectedCollection) return; // Prevent empty values
    try {
      const response = await axios.post(
        `${DOMAIN}/api/data/collection/${selectedCollection}/key`,
        newKeyValue,
        { withCredentials: true }
      );
      const updatedCollection = response.data; // Get updated collection from response
      setData((prevData) =>
        prevData.map((col) =>
          col.colname === selectedCollection ? updatedCollection : col
        )
      );
      setNewKeyValue({ key: "", value: "" }); // Reset input fields
    } catch (error) {
      console.error("Error adding key-value pair:", error);
    }
  };

  const handleDeleteKeyValue = async (key) => {
    try {
      const response = await axios.delete(
        `${DOMAIN}/api/data/collection/${selectedCollection}/key/${key}`,
        { withCredentials: true }
      );
      const updatedCollection = response.data; // Get updated collection from response
      setData((prevData) =>
        prevData.map((col) =>
          col.colname === selectedCollection ? updatedCollection : col
        )
      );
    } catch (error) {
      console.error("Error deleting key-value pair:", error);
    }
  };

  const handleAddCollection = async () => {
    if (!newCollectionName.trim()) return; // Prevent empty collection names
    try {
      const response = await axios.post(
        `${DOMAIN}/api/data/collection`,
        { colname: newCollectionName },
        { withCredentials: true }
      );
      const newCollection = response.data; // Get new collection from response
      setData((prevData) => [...prevData, newCollection]); // Add new collection to state
      setNewCollectionName(""); // Clear input field
      setSelectedCollection(newCollection.colname); // Select new collection
    } catch (error) {
      console.error("Error adding collection:", error);
    }
  };

  const handleDeleteCollection = async (colname) => {
    try {
      await axios.delete(`${DOMAIN}/api/data/collection/${colname}`, { withCredentials: true });
      const updatedCollections = data.filter((col) => col.colname !== colname); // Remove deleted collection
      setData(updatedCollections);
      setSelectedCollection(updatedCollections.length > 0 ? updatedCollections[0].colname : null); // Select first collection or null
    } catch (error) {
      console.error("Error deleting collection:", error);
    }
  };

  const handleEditKeyValue = (kv) => {
    setEditingKeyValue(kv); // Set the key-value pair being edited
  };

  const handleUpdateKeyValue = async () => {
    if (!editingKeyValue || !editingKeyValue.key || !editingKeyValue.value || !selectedCollection) return;
    try {
      const response = await axios.put(
        `${DOMAIN}/api/data/collection/${selectedCollection}/key/${editingKeyValue.key}`,
        { newValue: editingKeyValue.value }, // Assuming your backend expects this format
        { withCredentials: true }
      );
      const updatedCollection = response.data; // Get updated collection from response
      setData((prevData) =>
        prevData.map((col) =>
          col.colname === selectedCollection ? updatedCollection : col
        )
      );
      setEditingKeyValue(null); // Clear the editing state
    } catch (error) {
      console.error("Error updating key-value pair:", error);
    }
  };

  const handleEditCollectionName = (colname) => {
    setSelectedCollection(colname); // Set selected collection
    const collection = data.find((col) => col.colname === colname);
    if (collection) {
      setEditedCollectionName(collection.colname); // Set the current name for editing
    }
  };

  const handleUpdateCollectionName = async () => {
    if (!editedCollectionName.trim() || !selectedCollection) return; // Prevent empty collection names
    try {
      await axios.put(
        `${DOMAIN}/api/data/collection/${selectedCollection}`,
        { colname: editedCollectionName }, // Assuming your backend expects this format
        { withCredentials: true }
      );
      // Update the collection name in the state
      setData((prevData) =>
        prevData.map((col) =>
          col.colname === selectedCollection ? { ...col, colname: editedCollectionName } : col
        )
      );
      setEditedCollectionName(""); // Clear input field
    } catch (error) {
      console.error("Error updating collection name:", error);
    }
  };

  const copyToClipboard = (value) => {
    navigator.clipboard.writeText(value) // Copy value to clipboard
      .then(() => alert("Copied to clipboard!")) // Confirmation
      .catch(err => console.error("Could not copy text: ", err)); // Handle error
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="logo">Logo</div>
        <button className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <div className="dashboard-content">
        <aside className="sidebar">
          <h2>Collections</h2>
          {data.map((collection) => (
            <div key={collection.colname} className="collection-item">
              <button
                className={`collection-button ${selectedCollection === collection.colname ? 'active' : ''}`}
                onClick={() => handleEditCollectionName(collection.colname)} // Set selected collection for editing
              >
                {collection.colname}
              </button>
              <button className="delete-collection-button" onClick={() => handleDeleteCollection(collection.colname)}>
                Delete
              </button>
            </div>
          ))}
          <input
            type="text"
            placeholder="New Collection Name"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            className="new-collection-input"
          />
          <button className="new-collection-button" onClick={handleAddCollection}>
            Add New Collection
          </button>
        </aside>

        <main className="main-content">
          {selectedCollection && data.length > 0 && (
            <>
              <h2>{selectedCollection}</h2>
              {data.find((col) => col.colname === selectedCollection) ? (
                <div className="key-value-pairs">
                  {data.find((col) => col.colname === selectedCollection).coldata.map((kv) => (
                    <div key={kv.key} className="key-value-pair">
                      <input type="text" value={kv.key} disabled />
                      <input type="text" value={kv.value} disabled />
                      <button onClick={() => handleEditKeyValue(kv)}>Edit</button>
                      <button onClick={() => handleDeleteKeyValue(kv.key)}>Delete</button>
                      <button onClick={() => copyToClipboard(kv.value)}>
                        <FaCopy /> {/* Copy icon */}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No key-value pairs available for this collection.</p>
              )}

              <div className="add-key-value-form">
                <input
                  type="text"
                  placeholder="Key"
                  value={newKeyValue.key}
                  onChange={(e) => setNewKeyValue({ ...newKeyValue, key: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={newKeyValue.value}
                  onChange={(e) => setNewKeyValue({ ...newKeyValue, value: e.target.value })}
                />
                <button className="add-key-value-button" onClick={handleAddKeyValue}>
                  Add New Key-Value Pair
                </button>
              </div>

              {/* Update key-value pair */}
              {editingKeyValue && (
                <div className="update-key-value-form">
                  <h3>Edit Key-Value Pair</h3>
                  <input
                    type="text"
                    value={editingKeyValue.value}
                    onChange={(e) => setEditingKeyValue({ ...editingKeyValue, value: e.target.value })}
                  />
                  <button onClick={handleUpdateKeyValue}>Update</button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
