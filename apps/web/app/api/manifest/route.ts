import { NextRequest, NextResponse } from 'next/server'
import { getOrganizationContextInfo } from '@services/organizations/orgs'
import { getOrgLogoMediaDirectory } from '@services/media/media'

/**
 * Web App Manifest, resolved per organization.
 *
 * The platform is multi-tenant: `app/orgs/[orgslug]/layout.tsx` already serves a
 * per-org favicon through generateMetadata. A single static
 * `public/manifest.json` would undo that on the most visible surface there is —
 * every tenant would install to the home screen as a generic "Funeral Academy"
 * tile regardless of their branding.
 *
 * So the manifest is a route, keyed by `?org=<slug>`. The link tag is emitted by
 * the org layout with the slug filled in; the apex/hub layouts link it without a
 * slug and get the platform defaults below.
 *
 * `start_url` matters as much as the name: it must land the installed app inside
 * the tenant, not on the apex marketing page.
 */

export const revalidate = 3600

// The installed-app chrome. Sampled from the dashboard shell (DashMobileMenu's
// floating pill) so the OS window frame matches the product's own chrome
// instead of flashing white around it.
const BRAND_BG = '#111113'

type ManifestIcon = {
  src: string
  sizes: string
  type: string
  purpose?: string
}

const DEFAULT_ICONS: ManifestIcon[] = [
  { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
  { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
]

export async function GET(request: NextRequest) {
  const orgslug = request.nextUrl.searchParams.get('org')?.trim() || null

  let name = 'SINDEF Academy'
  let shortName = 'SINDEF'
  let startUrl = '/'
  let icons = DEFAULT_ICONS
  let description =
    'Formação e certificação para as empresas funerárias da Bahia. Uma iniciativa do SINDEF-BA.'

  if (orgslug) {
    // An installed app that opens on the wrong tenant is worse than no install
    // at all, so the start_url is scoped to the org even when the lookup below
    // fails and we fall back to the platform name.
    startUrl = `/orgs/${orgslug}/courses`

    try {
      const org = await getOrganizationContextInfo(orgslug, {
        revalidate: 3600,
        tags: ['organizations'],
      })

      if (org?.name) {
        name = org.name
        // Home-screen labels are truncated around 12 characters on both iOS and
        // Android. Sending the full name as short_name gets it cut mid-word; the
        // first word is a cleaner truncation than the launcher's own.
        shortName = org.name.length > 12 ? org.name.split(' ')[0] : org.name
      }
      if (org?.description) {
        description = org.description
      }

      const logo = org?.config?.config?.customization?.general?.logo_image
      if (logo) {
        const logoUrl = getOrgLogoMediaDirectory(org.org_uuid, logo)
        // The org logo is an arbitrary upload of unknown dimensions and usually
        // has a transparent ground, which Android renders as a black blob under
        // a maskable mask. So it is offered only as an `any` icon, additively —
        // the platform's own square/maskable set stays as the guaranteed
        // fallback that keeps the install prompt eligible.
        icons = [
          { src: logoUrl, sizes: '512x512', type: 'image/png', purpose: 'any' },
          ...DEFAULT_ICONS,
        ]
      }
    } catch {
      // A branding lookup failure must never make the app uninstallable.
    }
  }

  const manifest = {
    name,
    short_name: shortName,
    description,
    start_url: startUrl,
    id: startUrl,
    scope: '/',
    display: 'standalone',
    // If the OS or browser refuses standalone, fall back to a chrome that still
    // feels app-like before dropping all the way to a normal tab.
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'portrait-primary',
    background_color: BRAND_BG,
    theme_color: BRAND_BG,
    lang: 'pt-BR',
    dir: 'auto',
    categories: ['education', 'productivity'],
    icons,
    shortcuts: orgslug
      ? [
          {
            name: 'Meus cursos',
            short_name: 'Cursos',
            url: `/orgs/${orgslug}/courses`,
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'Minha trilha',
            short_name: 'Trilha',
            url: `/orgs/${orgslug}/trail`,
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
        ]
      : undefined,
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      // Short public TTL: org branding changes should reach installed users
      // without a redeploy, but the manifest is fetched on every load.
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
