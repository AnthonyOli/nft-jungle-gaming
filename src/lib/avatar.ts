const SIZE = 256
export async function fileToAvatar(file: File): Promise<string> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error('avatar_invalid')
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error('avatar_invalid') })
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIZE
  const side = Math.min(bitmap.width, bitmap.height)
  canvas.getContext('2d')!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE)
  return canvas.toDataURL('image/jpeg', 0.85)
}
