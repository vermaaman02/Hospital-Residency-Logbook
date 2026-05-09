/* Service worker for web-push demo and local postMessage notifications */
self.addEventListener("push", function (event) {
	let data = {};
	try {
		data = event.data ? event.data.json() : {};
	} catch (_) {
		data = { title: "Notification", body: event.data?.text() || "" };
	}

	const title = data.title || "AIIMS Logbook";
	const options = {
		body: data.body || "",
		data: data.data || {},
		icon: "/AIIMS%20patna%20icon.jpeg",
		badge: "/AIIMS%20patna%20icon.jpeg",
	};

	event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("message", (event) => {
	// Allow clients to request a notification display via postMessage
	const msg = event.data || {};
	if (msg && msg.type === "SHOW_NOTIFICATION") {
		const { title, body, data } = msg.payload || {};
		self.registration.showNotification(title || "AIIMS Logbook", {
			body: body || "",
			data: data || {},
			icon: "/AIIMS%20patna%20icon.jpeg",
			badge: "/AIIMS%20patna%20icon.jpeg",
		});
	}
});

self.addEventListener("notificationclick", function (event) {
	event.notification.close();
	const url = event.notification.data?.url || "/dashboard";
	event.waitUntil(
		clients.matchAll({ type: "window" }).then((clientList) => {
			for (const client of clientList) {
				if ("focus" in client) return client.focus();
			}
			if (clients.openWindow) return clients.openWindow(url);
		}),
	);
});
