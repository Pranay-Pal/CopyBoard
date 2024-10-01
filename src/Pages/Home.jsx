import react from 'react';
import CBLogo from "../assets/copyboard_full.png";
import './Home.css'
import { useNavigate} from 'react-router-dom';
const Home = () => {
    const navigate = useNavigate();
    return (
        <div className='MainDiv'>
            <img src={CBLogo} alt="CopyBoard" className='Logo'/>
            <button onClick={()=>{navigate('/login')}}><h1>Login</h1></button>
        </div>
    )
}
export default Home;
