import React, { useEffect, useState } from 'react';
import DOMAIN from '../Domain.jsx';
import './Admin.css'
const Admin = () => {
    const [dbs, setDbs] = useState(null);
    console.log(DOMAIN)

    useEffect(() => {
        const fetchData = async () => {
            try {
                console.log('Fetching data from:', `${DOMAIN}dbstat`); // Log the URL
                const response = await fetch(`${DOMAIN}dbstat`);
                console.log('Response:', response); // Log the response object
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                console.log('Data:', data); // Log the data
                setDbs(data);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, []);

    return (
        <div className='mainbox'>
            <h1>Admin</h1>
            <p>DATABASE STATUS: {dbs ? dbs.status : 'Loading...'}</p>
        </div>
    );
};

export default Admin;
