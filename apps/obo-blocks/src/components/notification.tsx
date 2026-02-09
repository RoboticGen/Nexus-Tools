"use client";

interface NotificationProps {
  message: string | null;
}

export function Notification({ message }: NotificationProps) {
  if (!message) return null;

  return (
    <div className="notification show">
      <span>{message}</span>
    </div>
  );
}
