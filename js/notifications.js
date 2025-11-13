export function requestNotificationPermission() {
  if (window.Notification && Notification.permission !== "granted") {
    Notification.requestPermission();
  }
}

export function showNotification(title, options) {
  if (window.Notification && Notification.permission === "granted") {
    new Notification(title, options);
  }
}
