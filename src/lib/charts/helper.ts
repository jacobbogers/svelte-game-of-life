import Chart from './Chart';
import {
	CHANGE_SIZE,
	CHART_RENDER,
	RegExpFontSizeEM,
	RegExpFontSizePCT,
	RegExpFontSizePx,
	RegExpFontSizeREM,
	fontSizeAbsolute,
	fontSizeRelative,
	fontStretch,
	fontStyle,
	fontVariant,
	fontWeight,
	systemSH
} from './constants';
import type {
	CanvasSize,
	ChartFontInfo,
	CommonMsg,
	Font,
	FontKey,
	FontLoadErrorPL,
	FontOptions,
	FontSize,
	FontSizeAbsolute,
	FontSizeLengthPx,
	FontSizeLengthRem,
	FontSizeRelative,
	GenericFontFamilies,
	IOWaitsGroupNames,
	RenderChart,
	Waits
} from './types';

export function createObserverForCanvas(canvas: HTMLCanvasElement, chart: Chart) {
	const observer = new ResizeObserver((entries) => {
		const entry = entries[0];
		const physicalPixelWidth = entry.devicePixelContentBoxSize[0].inlineSize;
		const physicalPixelHeight = entry.devicePixelContentBoxSize[0].blockSize;
		const height = entry.borderBoxSize[0].blockSize;
		const width = entry.borderBoxSize[0].inlineSize;
		const target: HTMLCanvasElement = entry.target as HTMLCanvasElement;
		//target.width = physicalPixelWidth; //physicalPixelWidth;
		//target.height = physicalPixelHeight; //physicalPixelHeight;
		const size = { physicalPixelWidth, physicalPixelHeight, height, width };
		chart.enqueue({ type: CHANGE_SIZE, size });
	});

	observer.observe(canvas, { box: 'device-pixel-content-box' });

	return function destroy() {
		observer.disconnect();
	};
}

export function isFontEqual(o1?: FontOptions, o2?: FontOptions) {
	return (
		o1?.family === o2?.family &&
		o1?.size === o2?.size &&
		o1?.stretch === o2?.stretch &&
		o1?.style === o2?.style &&
		o1?.variant === o2?.variant &&
		o1?.weight === o2?.weight
	);
}

export function isCanvasSizeEqual(a: CanvasSize, b: CanvasSize) {
	return (
		a.height === b.height &&
		a.width == b.width &&
		a.physicalPixelHeight === b.physicalPixelHeight &&
		a.physicalPixelWidth === b.physicalPixelWidth
	);
}

export function createFontID(opt: FontOptions): string | null {
	let rc = '';
	if (fontStyle.includes(opt.style!)) {
		rc += opt.style;
	} else {
		return null;
	}
	if (opt.family) {
		rc += ' ' + opt.family;
	} else {
		return null;
	}
	return rc;
}

export function createFontShortHand(opt: FontOptions) {
	/* this is the font shorthand typedef from https://www.w3.org/TR/2018/REC-css-fonts-3-20180920/#font-prop
	Operator:
	'||' means at least one of these options need to be chosen
	'|' =mutual exclusive OR
	[ 
		[ <‘font-style’> || <font-variant-css21> || <‘font-weight’> || <‘font-stretch’> ]? 
		<‘font-size’> [ / <‘line-height’> ]?
		<‘font-family’> 
	] 
	| caption | icon | menu | message-box | small-caption | status-bar
*/
	// some checks, if font-family  is one of the systemSH then other options must be not set
	let rc = '';
	// fontstyle check
	if (opt.style) {
		if (fontStyle.includes(opt.style)) {
			rc = opt.style;
		}
	}
	// fontvariant check
	if (opt.variant) {
		if (fontVariant.includes(opt.variant)) {
			rc += (rc ? ' ' : '') + opt.variant;
		}
	}

	if (opt.weight) {
		if (fontWeight.includes(opt.weight)) {
			rc += (rc ? ' ' : '') + opt.weight;
		}
	}

	if (opt.stretch) {
		if (fontStretch.includes(opt.stretch)) {
			rc += (rc ? ' ' : '') + opt.stretch;
		}
	}

	if (opt.size) {
		//switch (true) {
		//	case RegExpFontSizePx.test(opt.size):
		//	case RegExpFontSizeREM.test(opt.size):
		//	case RegExpFontSizeEM.test(opt.size):
		//	case RegExpFontSizePCT.test(opt.size):
		rc += (rc ? ' ' : '') + opt.size.toLocaleLowerCase();
		//		break;
		//	default:
		//		return null;
		// }
	}
	rc += ' ' + opt.family;
	return rc;
}

function metricsFrom(
	text: string,
	baseline: CanvasRenderingContext2D['textBaseline'],
	ctx: CanvasRenderingContext2D
): TextMetrics {
	ctx.save();
	ctx.textBaseline = baseline;
	const metrics = ctx.measureText(text);
	ctx.restore();
	return metrics;
}

export function getfontMetrics(ctx: CanvasRenderingContext2D, fontSH: string, text: string) {
	ctx.save(); // save contexts
	ctx.font = fontSH;
	// get metrics from all possible baselines
	const topMetrics = metricsFrom(text, 'top', ctx);
	const middleMetrics = metricsFrom(text, 'middle', ctx);
	const baseLineMetrics = metricsFrom(text, 'alphabetic', ctx);
	const bottomLineMetrics = metricsFrom(text, 'bottom', ctx);
	ctx.restore();
	//
	const topbl_fontAscent = topMetrics.fontBoundingBoxAscent;
	const topbl_actualAscent = topMetrics.actualBoundingBoxAscent;
	const topbl_fontDescent = topMetrics.fontBoundingBoxDescent;
	const topbl_actualDescent = topMetrics.actualBoundingBoxDescent;

	const alpbl_fontAscent = baseLineMetrics.fontBoundingBoxAscent;
	const alpbl_actualAscent = baseLineMetrics.actualBoundingBoxAscent;
	const alpbl_fontDescent = baseLineMetrics.fontBoundingBoxDescent;
	const alpbl_actualDescent = baseLineMetrics.actualBoundingBoxDescent;

	const botbl_fontAscent = bottomLineMetrics.fontBoundingBoxAscent;
	const botbl_actualAscent = bottomLineMetrics.actualBoundingBoxAscent;
	const botbl_fontDescent = bottomLineMetrics.fontBoundingBoxDescent;
	const botbl_actualDescent = bottomLineMetrics.actualBoundingBoxDescent;

	const midbl_fontAscent = middleMetrics.fontBoundingBoxAscent;
	const midbl_fontDescent = middleMetrics.fontBoundingBoxDescent;
	const midbl_actualAscent = middleMetrics.actualBoundingBoxAscent;
	const midbl_actualDescent = middleMetrics.actualBoundingBoxDescent;

	// todo: checkout textMetics.width and (actualBoundingBoxRight-actualBoundingBoxLeft)

	// these 2 are always the same?
	// middle baseline is the norm
	const topbl_font = midbl_fontAscent - topbl_fontAscent;
	const topbl_actual = midbl_actualAscent - topbl_actualAscent;

	// these 2 should be the same, mid-ascent < alpha-ascent
	const alpbl_font = midbl_fontAscent - alpbl_fontAscent;
	const alpbl_actual = midbl_actualAscent - alpbl_actualAscent;

	// these 2 should be the same, mid-ascent < bot-ascent
	const botbl_font = midbl_fontAscent - botbl_fontAscent;
	const botbl_actual = midbl_actualAscent - botbl_actualAscent;

	const metrics = {
		topbl: topbl_font,
		fontAscent: topbl_font + topbl_fontAscent,
		actualAscent: topbl_actual + topbl_actualAscent,
		alpbbl: alpbl_font,
		botbl: botbl_font,
		fontDescent: botbl_font - botbl_fontDescent,
		actualDescent: botbl_actual - botbl_actualDescent,
		cellHeight: 0,
		min: 0,
		max: 0,
		aLeft: 0,
		aRight: 0,
		width: 0
	};

	const sorted = Object.values(metrics).sort((a, b) => a - b);
	metrics.min = sorted[0];
	metrics.max = sorted[sorted.length - 1];
	metrics.cellHeight = metrics.max - metrics.min;
	metrics.aLeft = middleMetrics.actualBoundingBoxLeft;
	metrics.aRight = middleMetrics.actualBoundingBoxRight;
	metrics.width = middleMetrics.width;
	return {
		metrics,

		debug: {
			baselines: {
				top: {
					font: topbl_font,
					actual: topbl_actual
				},
				alphabetic: {
					font: alpbl_font,
					actual: alpbl_actual
				},
				bottom: {
					font: botbl_font,
					actual: botbl_actual
				}
			},
			// ascents and descents
			ascents: {
				font: {
					alphabetic: alpbl_fontAscent,
					middle: midbl_fontAscent,
					bottom: botbl_fontAscent,
					top: topbl_fontAscent
				},
				actual: {
					alphabetic: alpbl_actualAscent,
					middle: midbl_actualAscent,
					bottom: botbl_actualAscent,
					top: topbl_actualAscent
				}
			},
			descents: {
				font: {
					alphabetic: -alpbl_fontDescent,
					middle: -midbl_fontDescent,
					bottom: -botbl_fontDescent,
					top: -topbl_fontDescent
				},
				actual: {
					alphabetic: -alpbl_actualDescent,
					middle: -midbl_actualDescent,
					bottom: -botbl_actualDescent,
					top: -topbl_actualDescent
				}
			}
		}
	};
}

export function drawHorizontalLine(
	ctx: CanvasRenderingContext2D,
	x1: number,
	y1: number,
	x2: number,
	style: string,
	...lineDash: number[]
) {
	ctx.lineWidth = 1;
	ctx.setLineDash(lineDash);
	ctx.strokeStyle = style;
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y1);
	ctx.stroke();
}

export function drawHorizontalLines(
	ctx: CanvasRenderingContext2D,
	x1: number,
	y1: number[],
	x2: number,
	style: string,
	...lineDash: number[]
) {
	y1.forEach((y0) => drawHorizontalLine(ctx, x1, y0, x2, style, ...lineDash));
}

export function drawText(
	ctx: CanvasRenderingContext2D,
	text: string,
	fillStyle: string,
	fontSH: string,
	x: number,
	y: number,
	textBaseline: CanvasRenderingContext2D['textBaseline']
) {
	ctx.font = fontSH;
	ctx.textBaseline = textBaseline;
	ctx.fillStyle = fillStyle;
	ctx.fillText(text, x, y);
}

export function createChartCreator(
	fallback: GenericFontFamilies,
	fontOptions?: (Font & FontKey)[]
) {
	let chart: Chart;
	return function (canvas?: HTMLCanvasElement) {
		if (canvas && chart) {
			throw new Error('can not add this action to multiple html tags');
		}
		if (chart) {
			return { chart };
		}
		if (!canvas) {
			throw new Error('no argument given for chart-action');
		}
		if (false === canvas instanceof window.HTMLCanvasElement) {
			throw new Error('the tag being "actionized" is not a <canvas /> tag');
		}
		chart = new Chart(canvas, fallback, fontOptions);
		return {
			chart,
			destroy() {
				chart.destroy();
			}
		};
	};
}

export function defaultFontOptionValues(fontOptions?: Partial<FontOptions>): FontOptions {
	return Object.assign({ size: '10px', family: 'sans-serif' }, fontOptions);
}

export function fontSafeCheck(fontSH: string): boolean | null {
	try {
		// https://drafts.csswg.org/css-font-loading/#font-face-set-check
		return document.fonts.check(fontSH);
	} catch (err) {
		// misspelled
		return null;
	}
}

export function updateStatistics(waits: Waits, ns: IOWaitsGroupNames, start: number, end: number) {
	const delay = end - start;
	waits[ns][delay] = waits[ns][delay] || 0;
	waits[ns][delay]++;
}

export function isFontLoadErrorPL(u: any): u is FontLoadErrorPL {
	return u?.error instanceof DOMException && typeof u?.ts === 'string';
}

export function deviceCssPxRatio(size: CanvasSize): number {
	return 0.5 * (size.physicalPixelHeight / size.height + size.physicalPixelWidth / size.width);
}

export function isFontSizeRelative(size: FontSize): size is FontSizeRelative {
	return fontSizeRelative.includes(size as never);
}

export function isFontSizeAbsolute(size: FontSize): size is FontSizeAbsolute {
	return fontSizeAbsolute.includes(size as never);
}

export function isFontSizeInPx(size: FontSize): size is FontSizeLengthPx {
	return RegExpFontSizePx.test(size);
}

export function isFontSizeInRem(size: FontSize): size is FontSizeLengthRem {
	return RegExpFontSizeREM.test(size);
}

export function selectFont(fonts: ChartFontInfo, key: `fo${string}`): FontOptions {
	const foAxe = fonts['fohAxe'];
	// not defined, seek fallback font
	let font: FontOptions;
	if (foAxe === undefined) {
		font = defaultFontOptionValues({ family: fonts.fallback });
	} else if (isFontLoadErrorPL(foAxe)) {
		font = defaultFontOptionValues({
			...foAxe.font,
			family: fonts.fallback
		});
	} else {
		font = defaultFontOptionValues(foAxe);
	}
	return font;
}

export function createSizer(scale: number) {
	return function toCSS(n: number) {
		return n * scale;
	};
}

const { trunc, round, max, min, abs } = Math;

export { trunc, round, max, min, abs };
