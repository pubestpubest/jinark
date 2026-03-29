function play(file: string, volume = 0.4) {
  const audio = new Audio(`${import.meta.env.BASE_URL}sounds/${file}`)
  audio.volume = volume
  audio.play().catch(() => {})
}

export const sfx = {
  click: () => play('click_003.ogg'),
}
