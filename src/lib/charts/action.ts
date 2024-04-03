import type { ActionReturn } from 'svelte/action';
import createNS from '@mangos/debug-frontend';
import type { CanvasSize } from './types';
import type { createChart } from './helper';

//
const debug = createNS('charts/action');

type ChartAttributes = {
	'on:chart-resize'?: (e: CustomEvent<CanvasSize>) => void;
};

// action
export default function line_chart(
	canvas: HTMLCanvasElement,
	chartCreator: ReturnType<typeof createChart>
): ActionReturn<ChartAttributes> {
	// finalize char creation since we now have the canvas
	const chart = chartCreator(canvas);

	return {
		destroy: () => {
			debug('detaching chart from canvas');
			chart.detach();
		}
	};
}