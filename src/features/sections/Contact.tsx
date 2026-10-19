import { anchors, consultants, contact, whatsappMessage } from '../../data/content'
import { whatsappLink } from '../../lib/whatsapp'
import { ContactCard } from '../glass/ContactCard'

export function Contact() {
  return (
    <section id={anchors.contact} className="pt-[120px] pb-[120px] lg:pt-[200px]">
      <div className="wrap grid grid-cols-1 items-start gap-14 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <h2 data-slide className="text-[clamp(38px,4.4vw,60px)] leading-[1.04]">
            {contact.title}
          </h2>
          <p className="max-w-[28em] text-ink-soft">{contact.lead}</p>
        </div>
        <ul className="flex flex-col gap-3.5">
          {consultants.map((c) => {
            // Número pendente (null): o cartão fica na própria seção em vez de um link quebrado
            const link = whatsappLink(c.phone, whatsappMessage)
            return (
              <li key={c.name}>
                <ContactCard
                  name={c.name}
                  detail={contact.phoneLabel(c)}
                  href={link ?? `#${anchors.contact}`}
                  external={link !== null}
                  ctaLabel={contact.cta}
                />
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
