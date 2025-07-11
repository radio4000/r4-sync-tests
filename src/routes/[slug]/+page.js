/** @type {import('./$types').PageLoad} */
export async function load({params, url}) {
	const {slug} = params
	const search = url.searchParams.get('search') || ''
	const order = url.searchParams.get('order') || 'created'
	const dir = url.searchParams.get('dir') || 'desc'

	return {
		slug,
		search,
		order,
		dir
	}
}
