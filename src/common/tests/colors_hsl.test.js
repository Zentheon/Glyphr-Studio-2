import { expect, it } from 'vitest';
import { parseHSLString, offsetHSL } from '../colors.js';

describe('parseHSLString', () => {
	it('plain hsl', () => {
		expect(parseHSLString('hsl(198, 40%, 98%)')).toEqual({ h: 198, s: 40, l: 98, a: 1 });
	});
	it('arbitrary whitespace', () => {
		expect(parseHSLString('hsl(0,0%,    0%)')).toEqual({ h: 0, s: 0, l: 0, a: 1 });
	});
	it('hsl + alpha', () => {
		expect(parseHSLString('hsla(285, 100%, 67%, 0.3)')).toEqual({ h: 285, s: 100, l: 67, a: 0.3 });
	});
	it('hue wrapping', () => {
		expect(parseHSLString('hsl(-42, 2%, 96%)', true)).toEqual({ h: 318, s: 2, l: 96, a: 1 });
	});

	describe('offsetHSL', () => {
		it('hue +360 - same color', () => {
			expect(offsetHSL('hsl(285, 100%, 97%)', { hue: 360 })).toEqual('hsl(285, 100%, 97%)');
		});

		it('HSLA', () => {
			expect(offsetHSL('hsla(93, 58%, 47%, 0.5)', { alpha: -0.1 })).toEqual(
				'hsla(93, 58%, 47%, 0.4)'
			);
		});

		it('negative hue wrapping -42 -> 318', () => {
			expect(offsetHSL('hsl(-42, 2%, 96%)', { hue: 0 })).toEqual('hsl(318, 2%, 96%)');
		});

		it('clamps saturation and lightness at 100%', () => {
			expect(offsetHSL('hsl(25, 70%, 50%)', { sat: 50, val: 60 })).toEqual('hsl(25, 100%, 100%)');
		});

		it('relative offset scales by base percentages', () => {
			expect(
				offsetHSL('hsla(93, 58%, 47%, 0.6)', { sat: 15, val: -20, alpha: 0.6, relative: true })
			).toEqual('hsla(93, 67%, 38%, 0.96)');
		});
	});
});
