import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
interface Ctx { theme: Theme; toggle: () => void; }
const ThemeContext = createContext<Ctx | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const s = localStorage.getItem("pah_theme");
    const t: Theme = s === "dark" ? "dark" : "light";
    setTheme(t);
    document.documentElement.classList.toggle("dark", t === "dark");
  }, []);
  function toggle() {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") {
        localStorage.setItem("pah_theme", next);
        document.documentElement.classList.toggle("dark", next === "dark");
      }
      return next;
    });
  }
  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const c = useContext(ThemeContext);
  if (!c) throw new Error("useTheme must be inside ThemeProvider");
  return c;
}

// Script injected into <head> to avoid flash of wrong theme
export const NO_FLASH_SCRIPT = `(function(){try{var t=localStorage.getItem('pah_theme');if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;
