import { expect, test } from '@playwright/test';
import { onAnimationFrame } from '../src/lib/frame';

test('frame scheduling keeps the latest input, supports flush, and cancels stale work', () => {
	const originalRequest = globalThis.requestAnimationFrame;
	const originalCancel = globalThis.cancelAnimationFrame;
	const frames = new Map<number, FrameRequestCallback>();
	let id = 0;
	globalThis.requestAnimationFrame = (callback) => {
		frames.set(id, callback);
		return id++;
	};
	globalThis.cancelAnimationFrame = (frame) => { frames.delete(frame); };
	try {
		const calls: number[] = [];
		const update = onAnimationFrame((value: number) => calls.push(value));
		update(1);
		update(2);
		expect(frames.size).toBe(1);
		update.flush();
		expect(calls).toEqual([2]);
		expect(frames.size).toBe(0);
		update.flush();
		expect(calls).toEqual([2]);
		update(3);
		update.cancel();
		update.flush();
		expect(calls).toEqual([2]);
		update(4);
		const [frame, callback] = [...frames][0];
		frames.delete(frame);
		callback(0);
		expect(calls).toEqual([2, 4]);
		update(5);
		expect(frames.size).toBe(1);
		update.cancel();
	} finally {
		globalThis.requestAnimationFrame = originalRequest;
		globalThis.cancelAnimationFrame = originalCancel;
	}
});
