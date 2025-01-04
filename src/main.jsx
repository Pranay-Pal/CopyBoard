import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  Children,
} from "react";
import axios from "axios";
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
import {
  MdOutlineLogout,
  MdOutlinePublic,
  MdOutlinePublicOff,
  MdOutlineLink,
  MdPublic,
} from "react-icons/md";
import { BsCollection } from "react-icons/bs";
import {
  FaCopy,
  FaTrash,
  FaEdit,
  FaPlus,
  FaCheck,
  FaFileCode,
} from "react-icons/fa";
import Highlight from "react-highlight";
import "./dracula.css";

import COPYBOARD from "./assets/COPYBOARD.png";
import "./App.css";

const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get(`${DOMAIN}/api/user/check-auth`, {
          withCredentials: true,
        });
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (username, password) => {
    try {
      await axios.post(
        `${DOMAIN}/api/user/login`,
        { username, password },
        { withCredentials: true }
      );
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      return false;
    }
  };

  const logout = async () => {
    try {
      await axios.post(
        `${DOMAIN}/api/user/logout`,
        {},
        { withCredentials: true }
      );
      setIsAuthenticated(false);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

const DOMAIN = import.meta.env.VITE_DOMAIN;
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
  const { isAuthenticated, login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
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

    try {
      if (isLogin) {
        // Use the login function from AuthContext
        const success = await login(formData.username, formData.password);
        if (success) {
          handlePopup("Login successful!", false);
          setTimeout(() => navigate("/dashboard"), 1000);
        } else {
          handlePopup("Invalid credentials", true);
        }
      } else {
        const response = await axios({
          method: "POST",
          url: `${DOMAIN}/api/user/register`,
          data: {
            username: formData.username,
            password: formData.password,
          },
          withCredentials: true,
        });
        handlePopup("Registration successful! Please login.", false);
        setTimeout(() => setIsLogin(true), 1000);
      }

      setFormData({ username: "", password: "", confirmPassword: "" });
    } catch (error) {
      handlePopup(error.response?.data?.message || "An error occurred", true);
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
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${DOMAIN}/api/page/publicshared/${id}`);
        console.log('Fetched shared collection data:', response.data);
        setData(response.data);
      } catch (err) {
        console.error('Error fetching shared collection:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return <div>No data found</div>;

  return (
    <div className="public-page">
      <h1>{data.colname}</h1>
      <div className="shared-data">
        {data.coldata.map((item, index) => (
          <div key={index} className="data-item">
            <h3>{item.key}</h3>
            <p>{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const Admin = () => {
  const [dbs, setDbs] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${DOMAIN}/api/dbstat`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
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
  const navigate = useNavigate(); // Add this at the start of Dashboard component
  //----------------------------------------------------------------
  //states
  const [data, setData] = useState(null);
  const [selectedCollection, setSelectedCollection] = useState("");
  //----------------------------------------------------------------

  //_______________________________________________________________________________________
  // Topbar && Topbar functions

  const LogOut = async () => {
    try {
      await axios.post(
        `${DOMAIN}/api/user/logout`,
        {},
        { withCredentials: true }
      );
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
    async function collectionclick() {
      setSelectedCollection(col.colname);
    }
    return (
      <button
        className={
          selectedCollection == col.colname
            ? "collection-tile-selected"
            : "collection-tile"
        }
        onClick={collectionclick}
      >
        <p
          className={
            selectedCollection == col.colname
              ? "collection-tile-selected-text"
              : "collection-tile-text"
          }
        >
          {col.colname}
        </p>
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
            {data?.coll?.map((col, index) => (
              <CollectionTile key={index} col={col} />
            )) || (
              <p className="no-collections-message">No Collections are found</p>
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
    const [shared, setShared] = useState(false);
    const [shareId, setShareId] = useState(null);
    useEffect(() => {
      const collection = data?.coll?.find(
        (item) => item.colname === selectedCollection
      );
      setShared(collection?.share ?? false);
    }, [selectedCollection, data]);

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

    const handleShareToggle = async () => {
      try {
        const response = await axios.post(
          `${DOMAIN}/api/data/collection/${selectedCollection}/share`,
          { share: !shared },
          { withCredentials: true }
        );

        setShared(!shared);
        if (response.data.id) {
          const shareUrl = `${window.location.origin}/page/${response.data.id}`;
          navigator.clipboard
            .writeText(shareUrl)
            .then(() => {
              console.log('URL copied to clipboard:', shareUrl);
            })
            .catch((err) => console.error("Failed to copy text:", err));
        }
        
        setShareId(response.data.id || null);
      } catch (err) {
        console.error(err);
      }
    };

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
                  <p className="collection-name">
                    <b>{selectedCollection}</b>
                  </p>
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
                  {shared ? (
                    <button
                      className="collection-share-btn"
                      onClick={handleShareToggle}
                    >
                      <MdOutlinePublicOff />
                    </button>
                  ) : (
                    <button
                      className="collection-share-btn"
                      onClick={handleShareToggle}
                    >
                      <MdOutlinePublic />
                    </button>
                  )}
                </div>
                <hr className="collections-divider" />
              </div>
            )}
            <div className="collection-details-data">
              {data?.coll
                ?.find((item) => item.colname === selectedCollection)
                ?.coldata?.map((item, index) => (
                  <KeyValueDisp
                    key={item._id}
                    keyProp={item.key}
                    value={item.value}
                    code={item.code}
                    index={index}
                    collName={selectedCollection}
                  />
                )) || (
                <p className="collection-nodataincollection">
                  No value is stored in this collection.
                </p>
              )}
            </div>
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
  const AddKVP = async (collName, key, value, code) => {
    try {
      const response = await axios.post(
        encodeURI(`${DOMAIN}/api/data/collection/${collName}/key`),
        { key, value, code },
        { withCredentials: true }
      );
      setData(response.data);
    } catch (err) {
      console.log(err);
    }
  };
  const UpdateKVP = async (collName, key, newKey, value, code) => {
    try {
      const response = await axios.put(
        encodeURI(`${DOMAIN}/api/data/collection/${collName}/key/${key}`),
        { newKey, newValue: value, code },
        { withCredentials: true }
      );
      setData(response.data);
    } catch (err) {
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

  const KeyValueDisp = ({ collName, keyProp, value, code }) => {
    const [edit, setEdit] = useState(false);
    const [newKey, setNewKey] = useState(keyProp);
    const [newValue, setNewValue] = useState(value);
    const [isCode, setIsCode] = useState(code);

    const handleSave = async () => {
      await UpdateKVP(collName, keyProp, newKey, newValue, isCode);
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
        <div className="value-n-btns-containers">
          <div className="value-container">
            <input
              type="text"
              className="value-input"
              placeholder="Value"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
            />
            <button className="code-btn" onClick={() => setIsCode(!isCode)}>
              <FaFileCode color={isCode ? "white" : "black"} />
            </button>
            <button className="save-kvp-btn" onClick={handleSave}>
              <FaCheck />
            </button>
          </div>
        </div>
      </div>
    ) : (
      <div className="key-value-item">
        <div className="key-container">
          <p>{keyProp}</p>
        </div>
        <div className="value-n-btns-containers">
          {isCode ? (
            <Highlight>{value}</Highlight>
          ) : (
            <div className="value-container">
              <p>{value}</p>
            </div>
          )}
          <button
            className="copy-value-btn"
            onClick={() =>
              navigator.clipboard
                .writeText(value)
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
      </div>
    );
  };

  const AddKey = ({ collName }) => {
    const [edit, setEdit] = useState(false);
    const [newKey, setNewKey] = useState("");
    const [newValue, setNewValue] = useState("");
    const [isCode, setIsCode] = useState(false);
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
            setIsCode(!isCode);
          }}
        >
          <FaFileCode color={isCode == true ? "black" : "white"} />
        </button>
        <button
          onClick={async () => {
            AddKVP(collName, newKey, newValue, isCode);
            setNewKey("");
            setNewValue("");
            setIsCode(false);
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
  const { isAuthenticated, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return <div>Loading...</div>; // Add proper loading component
  }

  return (
    <Routes>
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to="/dashboard" /> : <Home />}
      />
      <Route path="/page/:id" element={<PublicPage />} />
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/dashboard" /> : <LoginRegister />
        }
      />
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
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
