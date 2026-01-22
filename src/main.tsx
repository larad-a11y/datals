import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Prevent scroll wheel from changing number input values globally
document.addEventListener('wheel', (e) => {
  const target = e.target as HTMLElement;
  if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'number') {
    (target as HTMLInputElement).blur();
  }
}, { passive: true });

createRoot(document.getElementById("root")!).render(<App />);
