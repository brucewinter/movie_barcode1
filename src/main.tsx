console.log('=== APP STARTING ===');
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log('=== ABOUT TO RENDER APP ===');
createRoot(document.getElementById("root")!).render(<App />);
