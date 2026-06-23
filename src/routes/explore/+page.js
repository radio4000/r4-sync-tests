import {redirect} from '@sveltejs/kit'

export function load({url}) {
	redirect(307, `/explore/channels/with-more-than-10-tracks${url.search}`)
}
