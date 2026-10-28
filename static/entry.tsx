import { createRoot } from 'react-dom/client';
import Game from '../app/play/game';
import '../app/globals.css';

createRoot(document.getElementById('root')!).render(<Game staticMode />);
