import { describe, expect, it } from 'vitest'
import { whatsappLink } from '../lib/whatsapp'
import { consultants, contact, hero, occasions, phonePlaceholder, showcase, storeSection, whatsappMessage } from './content'
import images from './images.generated.json'

describe('content', () => {
  it('telefones das consultoras são pendentes (null) ou números válidos', () => {
    for (const c of consultants) {
      expect(() => whatsappLink(c.phone, whatsappMessage), c.name).not.toThrow()
    }
  })

  it('mostra o placeholder enquanto o número é pendente', () => {
    expect(contact.phoneLabel({ name: 'X', role: 'Consultora', phone: null })).toBe(
      `Consultora, WhatsApp ${phonePlaceholder}`,
    )
  })

  it('toda foto usada existe no manifesto gerado e tem alt descritivo', () => {
    const photos = [
      ...Object.values(hero.photos),
      ...occasions.items.map((i) => i.photo),
      ...showcase.items.map((i) => i.photo),
      storeSection.photo,
    ]
    for (const p of photos) {
      expect(images).toHaveProperty(p.id)
      expect(p.alt.length, p.id).toBeGreaterThan(15)
      expect(p.alt.toLowerCase(), p.id).not.toMatch(/^(imagem|foto)\b/)
    }
  })
})
