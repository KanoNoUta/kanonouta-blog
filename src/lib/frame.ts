/** Coalesce frequent input events into one update with the latest arguments. */
export function onAnimationFrame<T extends unknown[]>(callback: (...args: T) => void) {
	let frame: number | undefined;
	let pending: T | undefined;

	const run = () => {
		frame = undefined;
		const args = pending;
		pending = undefined;
		if (args) callback(...args);
	};

	const schedule = (...args: T) => {
		pending = args;
		frame ??= requestAnimationFrame(run);
	};

	schedule.cancel = () => {
		if (frame !== undefined) cancelAnimationFrame(frame);
		frame = undefined;
		pending = undefined;
	};

	schedule.flush = () => {
		if (frame !== undefined) cancelAnimationFrame(frame);
		run();
	};

	return schedule;
}
