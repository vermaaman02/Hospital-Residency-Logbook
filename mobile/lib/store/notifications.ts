import AsyncStorage from "@react-native-async-storage/async-storage";

let lastViewedTime = 0;
let clearedIds: string[] = [];
const listeners = new Set<() => void>();

export const notificationStore = {
	async init() {
		try {
			const viewed = await AsyncStorage.getItem("inbox_last_viewed");
			const cleared = await AsyncStorage.getItem("inbox_cleared_ids");
			if (viewed) lastViewedTime = parseInt(viewed, 10);
			if (cleared) clearedIds = JSON.parse(cleared);
			this.notify();
		} catch (e) {
			console.warn("Failed to load notifications store", e);
		}
	},
	subscribe(listener: () => void) {
		listeners.add(listener);
		return () => listeners.delete(listener);
	},
	notify() {
		listeners.forEach((l) => l());
	},
	getLastViewed() {
		return lastViewedTime;
	},
	async markAllRead() {
		lastViewedTime = Date.now();
		this.notify();
		try {
			await AsyncStorage.setItem("inbox_last_viewed", lastViewedTime.toString());
		} catch (e) {}
	},
	getClearedIds() {
		return clearedIds;
	},
	async clearNotification(id: string) {
		if (!clearedIds.includes(id)) {
			clearedIds = [...clearedIds, id];
			this.notify();
			try {
				await AsyncStorage.setItem("inbox_cleared_ids", JSON.stringify(clearedIds));
			} catch (e) {}
		}
	},
	async clearAll(ids: string[]) {
		const newCleared = Array.from(new Set([...clearedIds, ...ids]));
		clearedIds = newCleared;
		this.notify();
		try {
			await AsyncStorage.setItem("inbox_cleared_ids", JSON.stringify(clearedIds));
		} catch (e) {}
	}
};
