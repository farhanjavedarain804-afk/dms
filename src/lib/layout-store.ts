import { useState, useEffect } from "react";

class LayoutStore extends EventTarget {
  sidebarOpen = true;
  mobileOpen = false;

  toggleSidebar = () => {
    this.sidebarOpen = !this.sidebarOpen;
    this.dispatchEvent(new Event("change"));
  };
  
  setMobileOpen = (val: boolean) => {
    this.mobileOpen = val;
    this.dispatchEvent(new Event("change"));
  };
}

const store = new LayoutStore();

export function useLayoutStore() {
  const [state, setState] = useState({
    sidebarOpen: store.sidebarOpen,
    mobileOpen: store.mobileOpen,
  });

  useEffect(() => {
    const onChange = () => {
      setState({
        sidebarOpen: store.sidebarOpen,
        mobileOpen: store.mobileOpen,
      });
    };
    store.addEventListener("change", onChange);
    return () => store.removeEventListener("change", onChange);
  }, []);

  return {
    ...state,
    toggleSidebar: store.toggleSidebar,
    setMobileOpen: store.setMobileOpen,
  };
}
