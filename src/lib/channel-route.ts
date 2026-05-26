import type {Channel} from '$lib/types'

export function updateStableChannelId(
	slug: string,
	currentId: string,
	currentSourceSlug: string,
	found: Channel | undefined
) {
	if (!found?.id) return {channelId: currentId, channelIdSourceSlug: currentSourceSlug}
	if (found.id === currentId && currentSourceSlug === slug) {
		return {channelId: currentId, channelIdSourceSlug: currentSourceSlug}
	}
	return {channelId: found.id, channelIdSourceSlug: slug}
}

export function pickRouteChannel(
	slug: string,
	channelFromSlug: Channel | undefined,
	channelFromId: Channel | undefined
): Channel | undefined {
	if (channelFromSlug?.slug === slug) return channelFromSlug
	return channelFromId ?? channelFromSlug
}
