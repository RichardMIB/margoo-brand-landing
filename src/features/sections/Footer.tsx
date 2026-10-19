import { business, footer } from '../../data/content'

export function Footer() {
  return (
    <footer>
      <div className="wrap flex flex-wrap justify-between gap-5 border-t border-line pt-10 pb-24 text-sm text-ink-soft">
        <span className="font-medium tracking-logo text-ink">{business.logo}</span>
        <span>
          {footer.instagramLabel} <a href={business.instagram.url}>{business.instagram.handle}</a>
        </span>
        <span>
          {footer.onlineStoreLabel} <a href={business.onlineStore}>{footer.onlineStoreText}</a>
        </span>
        <span>{business.credit}</span>
      </div>
    </footer>
  )
}
