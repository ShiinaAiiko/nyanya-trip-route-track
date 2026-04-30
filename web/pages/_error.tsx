import Error from 'next/error'

export default function Page({ errorCode, stars }: any) {
	if (errorCode) {
		return <Error statusCode={errorCode} />
	}

	return <div>Next stars: {stars}</div>
}
