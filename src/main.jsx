import React, { useState, useEffect } from "react";
import axios from "axios";
import { useCookies, CookiesProvider } from "react-cookie";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
} from "react-router-dom";
import CBLogo from "./assets/copyboard_full.png";
import DOMAIN from "./Domain.jsx";
import { MdOutlineLogout, MdOutlinePublicOff, MdPublic } from "react-icons/md";
import { BsCollection } from "react-icons/bs";
import { FaCopy, FaTrash, FaEdit, FaPlus, FaCheck } from "react-icons/fa";
import COPYBOARD from "./assets/COPYBOARD.png";
import "./App.css";

const Home = () => {
  const navigate = useNavigate();
  return (
    <div className="MainDiv">
      <img src={CBLogo} alt="CopyBoard" className="Logo" />
      <button
        onClick={() => {
          navigate("/login");
        }}
      >
        <h1>Login</h1>
      </button>
    </div>
  );
};

function LoginRegister() {
  const [isLogin, setIsLogin] = useState(true); // Toggle state for Login/Register
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [popupMessage, setPopupMessage] = useState("");
  const [isPopupError, setIsPopupError] = useState(false);
  const navigate = useNavigate();

  // Handle input change
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username || !formData.password) {
      return handlePopup("Please fill in all required fields", true);
    }

    if (!isLogin && formData.password !== formData.confirmPassword) {
      return handlePopup("Passwords do not match", true);
    }

    // Example API call
    try {
      const url = isLogin
        ? `${DOMAIN}/api/user/login`
        : `${DOMAIN}/api/user/register`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
        }),
        credentials: "include", // This allows cookies to be sent/received
      });
      console.log(response);

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "An error occurred");
      }

      // On successful login, redirect to dashboard
      if (isLogin) {
        handlePopup("Login successful!", false);
        setTimeout(() => navigate("/dashboard"), 1000);
      }
      // On successful registration, switch to login and show success message
      else {
        handlePopup("Registration successful! Please login.", false);
        setTimeout(() => setIsLogin(true), 1000);
      }

      setFormData({ username: "", password: "", confirmPassword: "" });
    } catch (error) {
      handlePopup(error.message, true);
    }
  };

  // Handle pop-up messages
  const handlePopup = (message, isError) => {
    setPopupMessage(message);
    setIsPopupError(isError);
    setTimeout(() => setPopupMessage(""), 3000); // Hide after 3 seconds
  };

  return (
    <div className="login-register-container">
      <div className="toggle-tabs">
        <button
          className={isLogin ? "active" : ""}
          onClick={() => setIsLogin(true)}
        >
          Login
        </button>
        <button
          className={!isLogin ? "active" : ""}
          onClick={() => setIsLogin(false)}
        >
          Register
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label>Username</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>

        <div className="input-group">
          <label>Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>

        {!isLogin && (
          <div className="input-group">
            <label>Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>
        )}

        <button type="submit" className="submit-btn">
          {isLogin ? "Login" : "Register"}
        </button>
      </form>

      {/* Popup for Success/Error messages */}
      {popupMessage && (
        <div className={`popup ${isPopupError ? "error" : "success"}`}>
          {popupMessage}
        </div>
      )}
    </div>
  );
}

const PublicPage = () => {
  const { id } =useParams();
  return (<p>{id}</p>)
}

const Admin = () => {
  const [dbs, setDbs] = useState(null);
  console.log(DOMAIN);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("Fetching data from:", `${DOMAIN}/api/dbstat`); // Log the URL
        const response = await fetch(`${DOMAIN}/api/dbstat`);
        console.log("Response:", response); // Log the response object
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Data:", data); // Log the data
        setDbs(data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="mainbox">
      <h1>Admin</h1>
      <p>DATABASE STATUS: {dbs ? dbs.status : "Loading..."}</p>
    </div>
  );
};

function Dashboard() {
  //----------------------------------------------------------------
  //states
  const [data, setData] = useState(null);
  const [selectedCollection, setSelectedCollection] = useState("");
  //----------------------------------------------------------------

  //_______________________________________________________________________________________
  // Topbar && Topbar functions
  const [cookies, setCookie, removeCookie] = useCookies(["connect.sid"]);

  const LogOut = async () => {
    try {
      await axios.post(
        `${DOMAIN}/api/user/logout`,
        {},
        { withCredentials: true }
      );
      removeCookie("connect.sid", { path: "/" });
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };
  const TopBar = () => {
    return (
      <div className="dashboard-topbar">
        <img src={COPYBOARD} className="dashboard-logo" alt="LOGO"></img>
        <button className="dashboard-logout-button" onClick={LogOut}>
          <b>
            {"Logout "}
            <MdOutlineLogout />
          </b>
        </button>
      </div>
    );
  };

  //_______________________________________________________________________________________

  //_______________________________________________________________________________________
  // Mainsection functions

  const CollectionTile = ({ col }) => {
    console.log("Collection: ", col);
    async function collectionclick() {
      setSelectedCollection(col.colname);
    }
    return (
      <button className="collection-tile" onClick={collectionclick}>
        <p className="collection-tile-text">{col.colname}</p>
      </button>
    );
  };

  const LeftBar = ({ data }) => {
    return (
      <div className="dashboard-sidebar">
        <div className="collections-container">
          <div className="collections-header">
            <p className="collections-title">
              <BsCollection />
              <b> Collections</b>
            </p>
            <hr className="collections-divider" />
          </div>
          <div className="collections-list">
            {console.log(data)}
            {data?.coll?.map((col, index) => (
              <CollectionTile key={index} col={col} />
            )) || (
              <p className="no-collections-message">
                No Collections are found{console.log(data)}
              </p>
            )}
          </div>
          <AddColection />
        </div>
      </div>
    );
  };

  const RightSection = ({ selectedCollection, data }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [newCollectionName, setNewCollectionName] =
      useState(selectedCollection);

    const handleEditClick = () => {
      setIsEditing(true);
      setNewCollectionName(selectedCollection);
    };

    const handleSaveClick = async () => {
      if (newCollectionName && newCollectionName !== selectedCollection) {
        await RenameColl(selectedCollection, newCollectionName);
        setSelectedCollection(newCollectionName);
      }
      setIsEditing(false);
    };

    console.log(data);
    return (
      <div className="dashboard-content">
        {selectedCollection ? (
          <div className="collection-details">
            {isEditing ? (
              <div className="collection-details-name">
                <div className="collection-details-name-input-container">
                  <input
                    type="text"
                    className="collection-name-input"
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                  />
                  <button
                    className="collection-save-btn"
                    onClick={handleSaveClick}
                  >
                    <FaCheck />
                  </button>
                </div>
                <hr className="collections-divider" />
              </div>
            ) : (
              <div className="collection-details-name">
                <div className="collection-details-name-view-container">
                  <p className="collection-name"><b>{selectedCollection}</b></p>
                  <button
                    className="collection-edit-btn"
                    onClick={handleEditClick}
                  >
                    <FaEdit />
                  </button>
                  <button
                    className="collection-delete-btn"
                    onClick={async () => {
                      RemoveColl(selectedCollection);
                      setSelectedCollection("");
                    }}
                  >
                    <FaTrash />
                  </button>
                </div>
                <hr className="collections-divider" />
              </div>
            )}

            {data?.coll
              ?.find((item) => item.colname === selectedCollection)
              ?.coldata?.map((item, index) => (
                <KeyValueDisp
                  key={item._id}
                  keyProp={item.key}
                  value={item.value}
                  index={index}
                  collName={selectedCollection}
                />
              )) || console.log(data)}
            <AddKey collName={selectedCollection} />
          </div>
        ) : (
          <p className="no-collection-selected">No collection Chosen / Found</p>
        )}
      </div>
    );
  };

  //_______________________________________________________________________________________
  // PAGE BASIC DATA

  const fetchData = async () => {
    try {
      const response = await axios.get(`${DOMAIN}/api/data`, {
        withCredentials: true,
      });
      setData(response.data.data);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        LogOut();
      }
      console.error("Error fetching data:", error);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);

  //_______________________________________________________________________________________
  // CRUD Operations
  //// --> COLLECTION
  const AddColl = async (collName) => {
    try {
      if (!collName.trim()) return;
      const response = await axios.post(
        `${DOMAIN}/api/data/collection`,
        { colname: collName },
        { withCredentials: true }
      );
      setData(response.data);
    } catch (err) {
      console.log(err);
    }
  };
  const RemoveColl = async (collName) => {
    try {
      const response = await axios.delete(
        encodeURI(`${DOMAIN}/api/data/collection/${collName}`),
        { withCredentials: true }
      );
      setData(response.data);
    } catch (err) {
      console.log(err);
    }
  };
  const RenameColl = async (collName, newColname) => {
    try {
      const response = await axios.put(
        encodeURI(`${DOMAIN}/api/data/collection/${collName}`),
        { newColname },
        { withCredentials: true }
      );
      setData(response.data);
    } catch (err) {
      console.log(err);
    }
  };
  //// --> KVP (Key Value Pair)
  const AddKVP = async (collName, key, value) => {
    try {
      const response = await axios.post(
        encodeURI(`${DOMAIN}/api/data/collection/${collName}/key`),
        { key, value },
        { withCredentials: true }
      );
      setData(response.data);
    } catch (err) {
      console.log(err);
    }
  };
  const UpdateKVP = async (collName, key, value) => {
    try {
    } catch (err) {
      const response = await axios.put(
        encodeURI(`${DOMAIN}/api/data/collection/${collName}/key/${key}`),
        { newValue: value },
        { withCredentials: true }
      );
      setData(response.data);
      console.log(err);
    }
  };
  const RemoveKVP = async (collName, key) => {
    try {
      const response = await axios.delete(
        encodeURI(`${DOMAIN}/api/data/collection/${collName}/key/${key}`),
        { withCredentials: true }
      );
      setData(response.data);
    } catch (err) {
      console.log(err);
    }
  };

  //----------------------------------------------------------------
  // Edit Functions
  const AddColection = () => {
    const [edit, setEdit] = useState(false);
    const [newCollName, setNewCollName] = useState("");
    return edit ? (
      <div className="add-collection">
        <input
          className="add-collection-input"
          type="text"
          placeholder="Collection Name"
          value={newCollName}
          onChange={(e) => setNewCollName(e.target.value)}
        />
        <button
          className="add-collection-check-btn"
          onClick={async () => {
            AddColl(newCollName);
            setEdit(!edit);
          }}
        >
          <FaCheck />
        </button>
      </div>
    ) : (
      <div className="add-collection">
        <button
          className="add-collection-btn"
          onClick={async () => {
            setEdit(!edit);
          }}
        >
          ADD <FaPlus />
        </button>
      </div>
    );
  };

  const KeyValueDisp = ({ collName, keyProp, value }) => {
    const [edit, setEdit] = useState(false);
    const [newKey, setNewKey] = useState(keyProp);
    const [newValue, setNewValue] = useState(value);

    const handleSave = async () => {
      await UpdateKVP(collName, newKey, newValue);
      setEdit(false);
    };

    return edit ? (
      <div className="key-value-item editing">
        <input
          type="text"
          className="key-input"
          placeholder="Key"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
        />
        <div className="value-container">
          <input
            type="text"
            className="value-input"
            placeholder="Value"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
          />
        </div>
        <button className="save-kvp-btn" onClick={handleSave}>
          <FaCheck />
        </button>
      </div>
    ) : (
      <div className="key-value-item">
        <div className="key-container">
          <p>{keyProp}</p>
        </div>
        <div className="value-container">
          <p>{value}</p>
        </div>
        <button
          className="copy-value-btn"
          onClick={() =>
            navigator.clipboard
              .writeText(value)
              .then(() => console.log("Text copied to clipboard"))
              .catch((err) => console.error("Failed to copy text:", err))
          }
        >
          <FaCopy />
        </button>
        <button className="edit-kvp-btn" onClick={() => setEdit(true)}>
          <FaEdit />
        </button>
        <button
          className="delete-kvp-btn"
          onClick={() => RemoveKVP(collName, keyProp)}
        >
          <FaTrash />
        </button>
      </div>
    );
  };

  const AddKey = ({ collName }) => {
    const [edit, setEdit] = useState(false);
    const [newKey, setNewKey] = useState("");
    const [newValue, setNewValue] = useState("");
    return edit ? (
      <div className="addkey">
        <input
          type="text"
          placeholder="Key"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
        />
        <input
          type="text"
          placeholder="Value"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
        />
        <button
          onClick={async () => {
            AddKVP(collName, newKey, newValue);
            setNewKey("");
            setNewValue("");
            setEdit(!edit);
          }}
        >
          <FaCheck />
        </button>
      </div>
    ) : (
      <button
        onClick={async () => {
          setEdit(!edit);
        }}
      >
        ADD <FaPlus />
      </button>
    );
  };
  //----------------------------------------------------------------

  return (
    <div className="dashboard-container">
      <TopBar />
      <div className="dashboard-main">
        <LeftBar data={data} />
        <RightSection data={data} selectedCollection={selectedCollection} />
      </div>
    </div>
  );
}

function App() {
  const [cookies] = useCookies(["connect.sid"]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsAuthenticated(!!cookies["connect.sid"]);
  }, [cookies]);

  return (
    <Routes>
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to="/dashboard" /> : <Home />}
      />
      <Route path="/page/:id" element={<PublicPage/>} />
      <Route path="/login" element={<LoginRegister />} />
      <Route path="/admin" element={<Admin />} />
      <Route
        path="/dashboard"
        element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
      />
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <CookiesProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </CookiesProvider>
  </React.StrictMode>
);
