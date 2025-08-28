import { useState, useEffect } from "react";
import { Wifi, WifiOff, Cloud, CloudOff } from "lucide-react";

interface OfflineStatusProps {
  syncStatus?: 'synced' | 'pending';
}

export function OfflineStatus({ syncStatus = 'synced' }: OfflineStatusProps) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Set initial online status on client side
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        icon: <WifiOff className="h-4 w-4" />,
        text: "Offline",
        color: "text-red-500",
        bgColor: "bg-red-50 border-red-200",
        description: "Changes will sync when back online"
      };
    }

    if (syncStatus === 'pending') {
      return {
        icon: <CloudOff className="h-4 w-4" />,
        text: "Syncing...",
        color: "text-yellow-500",
        bgColor: "bg-yellow-50 border-yellow-200",
        description: "Syncing changes to server"
      };
    }

    return {
      icon: <Cloud className="h-4 w-4" />,
      text: "Online",
      color: "text-green-500",
      bgColor: "bg-green-50 border-green-200",
      description: "All changes synced"
    };
  };

  const status = getStatusInfo();

  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium ${status.bgColor} ${status.color}`}>
      {status.icon}
      <span>{status.text}</span>
    </div>
  );
}