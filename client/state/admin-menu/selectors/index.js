/**
 * Internal dependencies
 */
import 'state/inline-help/init';
import fallbackResponse from '../fallback-data.json';

export function getAdminMenu( state, siteId ) {
	const stateSlice = state?.adminMenu;

	if ( ! stateSlice || ! siteId ) {
		return null;
	}

	/**
	 * To ensure that a menu is always available in the UI even
	 * if the network fails on an uncached request we provide a
	 * set of static fallback data to render a basic menu. This
	 * avoids a situation where the user might be left with an
	 * empty menu.
	 */
	return state.adminMenu[ siteId ] || fallbackResponse;
}
