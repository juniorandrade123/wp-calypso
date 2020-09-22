/**
 * External dependencies
 */
import deepFreeze from 'deep-freeze';
import fallbackResponse from '../fallback-data.json';
/**
 * Internal dependencies
 */
import menuFixture from './fixture/menu-fixture';
import { getAdminMenu } from '../selectors';

const frozenFixture = deepFreeze( menuFixture );

describe( 'selectors', () => {
	describe( '#getAdminMenu', () => {
		test( 'returns null when state is undefined', () => {
			const state = {};

			expect( getAdminMenu( state, 123456 ) ).toEqual( null );
		} );

		test( 'returns null data when siteId is not provided', () => {
			const state = {};

			expect( getAdminMenu( state ) ).toEqual( null );
		} );

		test( 'returns fallback data  when requested siteId key is not present', () => {
			const state = {
				adminMenu: {
					56789: frozenFixture,
				},
			};

			expect( getAdminMenu( state, 12345 ) ).toEqual( fallbackResponse );
		} );

		test( 'returns menu data when siteId is present', () => {
			const state = {
				adminMenu: {
					56789: {},
					12345: frozenFixture,
					84649: {},
					95538: {},
				},
			};

			expect( getAdminMenu( state, 12345 ) ).toEqual( frozenFixture );
		} );
	} );
} );
