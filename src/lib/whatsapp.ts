/**
 * Normaliza um telefone brasileiro para o formato do wa.me: 55 + DDD + número, só dígitos.
 * Aceita "(85) 99999-9999", "85 3333-4444", "+55 85 99999-9999", "085999999999".
 * Lança RangeError se o número não tiver DDD válido e 8 ou 9 dígitos.
 */
export function normalizeBrazilPhone(phone: string): string {
  let digits = phone.replace(/\D/g, '')
  if (digits.length >= 12 && digits.startsWith('55')) digits = digits.slice(2)
  digits = digits.replace(/^0+/, '') // prefixo de operadora/discagem nacional

  // DDD: dois dígitos de 1 a 9 (não existe DDD com zero). Número: 8 (fixo) ou 9 (celular, começa com 9).
  const valid = /^[1-9]{2}(?:9\d{8}|[2-5]\d{7})$/.test(digits)
  if (!valid) throw new RangeError(`Telefone inválido para WhatsApp: "${phone}"`)
  return `55${digits}`
}

/**
 * Link de conversa no WhatsApp com mensagem pronta.
 * Devolve null quando o número ainda não existe (phone null) — o componente decide o fallback.
 */
export function whatsappLink(phone: string | null, message: string): string | null {
  if (phone === null) return null
  const base = `https://wa.me/${normalizeBrazilPhone(phone)}`
  const text = message.trim()
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}
