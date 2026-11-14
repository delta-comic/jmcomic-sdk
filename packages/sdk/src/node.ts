import { createImageSegments } from './image'
import type { ImageDecoder } from './types'

export class NodeImageDecoder implements ImageDecoder {
  public async decode(blob: Blob, segmentCount: number): Promise<string> {
    const { default: Sharp } = await import('sharp')
    const input = Buffer.from(await blob.arrayBuffer())
    const image = Sharp(input)
    const metadata = await image.metadata()
    if (!metadata.width || !metadata.height || !metadata.format)
      throw new Error('无法读取图片尺寸或格式')

    const raw = await image.raw().toBuffer({ resolveWithObject: true })
    const rowBytes = metadata.width * raw.info.channels
    const output = Buffer.allocUnsafe(raw.data.length)
    for (const segment of createImageSegments(metadata.height, segmentCount)) {
      raw.data.copy(
        output,
        segment.destinationY * rowBytes,
        segment.sourceY * rowBytes,
        (segment.sourceY + segment.height) * rowBytes,
      )
    }
    const encoded = await Sharp(output, {
      raw: { width: metadata.width, height: metadata.height, channels: raw.info.channels },
    })
      .toFormat(metadata.format)
      .toBuffer()
    return `data:image/${metadata.format};base64,${encoded.toString('base64')}`
  }
}