import client from '../../api/client'

export async function createStreamUrl(fileId: string): Promise<string> {
    const res = await client.post<string>(
        `/files/create-stream-download`,
        null,
        {
            params: {
                metadataUuid: fileId
            }
        }
    )

    return `/api/files/stream-download?downloadItemUuid=${res.data}`
}
