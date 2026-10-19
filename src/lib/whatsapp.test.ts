import { describe, expect, it } from 'vitest'
import { normalizeBrazilPhone, whatsappLink } from './whatsapp'

const MSG = 'Olá! Vim pelo site da Margoo Brand e quero ajuda para escolher uma peça.'

describe('whatsappLink', () => {
  it('monta o link com DDI 55 + DDD + número', () => {
    expect(whatsappLink('(85) 99876-5432', 'oi')).toBe('https://wa.me/5585998765432?text=oi')
  })

  it('codifica acentos, espaços, pontuação e caracteres especiais da mensagem', () => {
    const link = whatsappLink('85998765432', MSG)
    expect(link).toBe(
      'https://wa.me/5585998765432?text=Ol%C3%A1!%20Vim%20pelo%20site%20da%20Margoo%20Brand%20e%20quero%20ajuda%20para%20escolher%20uma%20pe%C3%A7a.',
    )
    // ida e volta: o WhatsApp recebe exatamente o texto original
    expect(decodeURIComponent(new URL(link!).searchParams.get('text')!)).toBe(MSG)
  })

  it('não deixa & # ? + quebrarem a query string', () => {
    const link = whatsappLink('85998765432', 'Vestido P&M #2? R$ 1.500 + frete\nobrigada')!
    expect(new URL(link).searchParams.get('text')).toBe('Vestido P&M #2? R$ 1.500 + frete\nobrigada')
  })

  it('devolve null quando o número ainda é pendente (phone null)', () => {
    expect(whatsappLink(null, MSG)).toBeNull()
  })

  it('omite ?text quando a mensagem está vazia', () => {
    expect(whatsappLink('85998765432', '   ')).toBe('https://wa.me/5585998765432')
  })
})

describe('normalizeBrazilPhone', () => {
  it.each([
    ['(85) 99876-5432', '5585998765432'],
    ['85 3261-1234', '558532611234'],
    ['+55 85 99876-5432', '5585998765432'],
    ['5585998765432', '5585998765432'],
    ['085 99876-5432', '5585998765432'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeBrazilPhone(input)).toBe(expected)
  })

  it.each(['99876-5432', '', '[NÚMERO]', '(05) 99876-5432', '85 8876-54321', '1234'])(
    'rejeita número sem DDD ou malformado: "%s"',
    (input) => {
      expect(() => normalizeBrazilPhone(input)).toThrow(RangeError)
    },
  )
})
