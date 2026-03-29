interface Props {
  image?: string
  name: string
  size?: number
}

export function NodeImage({ image, name, size = 48 }: Props) {
  const src = image ? `${import.meta.env.BASE_URL}images/${image}` : `${import.meta.env.BASE_URL}images/placeholder.png`
  return (
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      style={{ objectFit: 'contain', flexShrink: 0, borderRadius: 4 }}
      onError={(e) => { (e.currentTarget as HTMLImageElement).src = `${import.meta.env.BASE_URL}images/placeholder.png` }}
    />
  )
}
