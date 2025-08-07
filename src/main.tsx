console.log('=== APP STARTING ===');
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log('=== ABOUT TO RENDER APP ===');

// Ensure DOM is ready before trying to render
const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error('Root element not found!');
  throw new Error('Root element not found');
}

console.log('=== ROOT ELEMENT FOUND, RENDERING ===');
createRoot(rootElement).render(<App />);
