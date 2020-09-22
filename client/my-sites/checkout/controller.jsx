/**
 * External dependencies
 */
import i18n from 'i18n-calypso';
import React from 'react';
import { get, isEmpty } from 'lodash';
import page from 'page';

/**
 * Internal Dependencies
 */
import { setDocumentHeadTitle as setTitle } from 'state/document-head/actions';
import { setSection } from 'state/ui/actions';
import { getSiteBySlug } from 'state/sites/selectors';
import { getSelectedSite } from 'state/ui/selectors';
import GSuiteNudge from './gsuite-nudge';
import CheckoutContainer from './checkout/checkout-container';
import CheckoutSystemDecider from './checkout-system-decider';
import CheckoutPendingComponent from './checkout-thank-you/pending';
import CheckoutThankYouComponent from './checkout-thank-you';
import UpsellNudge from './upsell-nudge';
import { canUserPurchaseGSuite } from 'lib/gsuite';
import { getRememberedCoupon } from 'lib/cart/actions';
import { sites } from 'my-sites/controller';
import CartData from 'components/data/cart';
import userFactory from 'lib/user';
import { getCurrentUser } from 'state/current-user/selectors';
import { retrieveSignupDestination, setSessionStorage } from 'signup/storageUtils';

export function checkout( context, next ) {
	const { feature, plan, domainOrProduct, purchaseId } = context.params;

	const user = userFactory();
	const isLoggedOut = ! user.get();
	const state = context.store.getState();
	const selectedSite = getSelectedSite( state );
	const currentUser = getCurrentUser( state );
	const hasSite = currentUser && currentUser.visible_site_count >= 1;
	const isDomainOnlyFlow = context.query?.isDomainOnly === '1';
	const isDisallowedForSitePicker =
		context.pathname.includes( '/checkout/no-site' ) &&
		( isLoggedOut || ! hasSite || isDomainOnlyFlow );

	if ( ! selectedSite && ! isDisallowedForSitePicker ) {
		sites( context, next );
		return;
	}

	let product;
	if ( selectedSite && selectedSite.slug !== domainOrProduct && domainOrProduct ) {
		product = domainOrProduct;
	} else {
		product = context.params.product;
	}

	if ( 'thank-you' === product ) {
		return;
	}

	// FIXME: Auto-converted from the Flux setTitle action. Please use <DocumentHead> instead.
	context.store.dispatch( setTitle( i18n.translate( 'Checkout' ) ) );

	context.store.dispatch( setSection( { name: 'checkout' } ) );

	// NOTE: `context.query.code` is deprecated in favor of `context.query.coupon`.
	const couponCode = context.query.coupon || context.query.code || getRememberedCoupon();

	const isLoggedOutCart = isLoggedOut && context.pathname.includes( '/checkout/no-site' );
	const isNoSiteCart =
		! isLoggedOut &&
		context.pathname.includes( '/checkout/no-site' ) &&
		'no-user' === context.query.cart;

	const searchParams = new URLSearchParams( window.location.search );
	const isSignupCheckout = searchParams.get( 'signup' ) === '1';

	if ( isSignupCheckout && ! isDomainOnlyFlow ) {
		window.addEventListener( 'beforeunload', function () {
			const signupDestinationCookieExists = retrieveSignupDestination();

			if ( signupDestinationCookieExists ) {
				setSessionStorage( 'signupCheckoutPageUnloaded', true );
			}
		} );
	}

	context.primary = (
		<CartData>
			<CheckoutSystemDecider
				product={ product }
				purchaseId={ purchaseId }
				selectedFeature={ feature }
				couponCode={ couponCode }
				isComingFromSignup={ !! context.query.signup }
				isComingFromGutenboarding={ !! context.query.preLaunch }
				isGutenboardingCreate={ !! context.query.isGutenboardingCreate }
				isComingFromUpsell={ !! context.query.upgrade }
				plan={ plan }
				selectedSite={ selectedSite }
				reduxStore={ context.store }
				redirectTo={ context.query.redirect_to }
				upgradeIntent={ context.query.intent }
				clearTransaction={ false }
				isLoggedOutCart={ isLoggedOutCart }
				isNoSiteCart={ isNoSiteCart }
			/>
		</CartData>
	);

	next();
}

export function checkoutPending( context, next ) {
	const orderId = Number( context.params.orderId );
	const siteSlug = context.params.site;

	context.store.dispatch( setSection( { name: 'checkout-thank-you' } ) );

	context.primary = (
		<CheckoutPendingComponent
			orderId={ orderId }
			siteSlug={ siteSlug }
			redirectTo={ context.query.redirectTo }
		/>
	);

	next();
}

export function checkoutThankYou( context, next ) {
	const receiptId = Number( context.params.receiptId );
	const gsuiteReceiptId = Number( context.params.gsuiteReceiptId ) || 0;

	const state = context.store.getState();
	const selectedSite = getSelectedSite( state );
	const displayMode = get( context, 'query.d' );

	context.store.dispatch( setSection( { name: 'checkout-thank-you' } ) );

	// FIXME: Auto-converted from the Flux setTitle action. Please use <DocumentHead> instead.
	context.store.dispatch( setTitle( i18n.translate( 'Thank You' ) ) );

	context.primary = (
		<CheckoutThankYouComponent
			receiptId={ receiptId }
			gsuiteReceiptId={ gsuiteReceiptId }
			domainOnlySiteFlow={ isEmpty( context.params.site ) }
			selectedFeature={ context.params.feature }
			redirectTo={ context.query.redirect_to }
			upgradeIntent={ context.query.intent }
			siteUnlaunchedBeforeUpgrade={ context.query.site_unlaunched_before_upgrade === 'true' }
			selectedSite={ selectedSite }
			displayMode={ displayMode }
		/>
	);

	next();
}

export function gsuiteNudge( context, next ) {
	const { domain, site, receiptId } = context.params;
	context.store.dispatch( setSection( { name: 'gsuite-nudge' } ) );

	const state = context.store.getState();
	const selectedSite =
		getSelectedSite( state ) || getSiteBySlug( state, site ) || getSiteBySlug( state, domain );

	if ( ! selectedSite ) {
		return null;
	}

	if ( ! canUserPurchaseGSuite() ) {
		next();
	}

	context.primary = (
		<CheckoutContainer
			shouldShowCart={ false }
			clearTransaction={ true }
			purchaseId={ Number( receiptId ) }
		>
			<GSuiteNudge
				domain={ domain }
				receiptId={ Number( receiptId ) }
				selectedSiteId={ selectedSite.ID }
			/>
		</CheckoutContainer>
	);

	next();
}

export function upsellNudge( context, next ) {
	const { receiptId, site } = context.params;

	let upsellType, upgradeItem;

	if ( context.path.includes( 'offer-quickstart-session' ) ) {
		upsellType = 'concierge-quickstart-session';
		upgradeItem = 'concierge-session';
	} else if ( context.path.match( /(add|offer)-support-session/ ) ) {
		upsellType = 'concierge-support-session';
		upgradeItem = 'concierge-session';
	} else if ( context.path.includes( 'offer-plan-upgrade' ) ) {
		upsellType = 'plan-upgrade-upsell';
		upgradeItem = context.params.upgradeItem;
	}

	context.store.dispatch( setSection( { name: upsellType } ) );

	context.primary = (
		<CheckoutContainer
			shouldShowCart={ false }
			clearTransaction={ true }
			purchaseId={ Number( receiptId ) }
		>
			<UpsellNudge
				siteSlugParam={ site }
				receiptId={ Number( receiptId ) }
				upsellType={ upsellType }
				upgradeItem={ upgradeItem }
			/>
		</CheckoutContainer>
	);

	next();
}

export function redirectToSupportSession( context ) {
	const { receiptId, site } = context.params;

	// Redirect the old URL structure to the new URL structure to maintain backwards compatibility.
	if ( context.params.receiptId ) {
		page.redirect( `/checkout/offer-support-session/${ receiptId }/${ site }` );
	}
	page.redirect( `/checkout/offer-support-session/${ site }` );
}
