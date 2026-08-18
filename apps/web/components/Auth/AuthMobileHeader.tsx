'use client'
import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import funeralacademyIcon from 'public/funeralacademy_bigicon_1.png'
import { getOrgLogoMediaDirectory, getOrgAuthBackgroundMediaDirectory } from '@services/media/media'
import { getUriWithOrg } from '@services/config/config'

interface AuthMobileHeaderProps {
  org: any
}

export default function AuthMobileHeader({ org }: AuthMobileHeaderProps) {
  const authBranding = org?.config?.config?.customization?.auth_branding || org?.config?.config?.general?.auth_branding || {}
  const {
    background_type = 'gradient',
    background_image = '',
    unsplash_photographer_name = '',
    unsplash_photographer_url = '',
    unsplash_photo_url = '',
  } = authBranding
  const UNSPLASH_UTM = '?utm_source=Funeral Academy&utm_medium=referral'
  const withUtm = (url: string) => (url ? `${url}${UNSPLASH_UTM}` : '')

  const getBackgroundStyle = (): React.CSSProperties => {
    if (background_type === 'gradient' || !background_image) {
      return {
        background: 'linear-gradient(041.61deg, var(--brand-hover) 7.15%, var(--brand) 90.96%)',
      }
    }
    if (background_type === 'custom' && background_image) {
      return {
        backgroundImage: `url(${getOrgAuthBackgroundMediaDirectory(org?.org_uuid, background_image)})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    }
    if (background_type === 'unsplash' && background_image) {
      return {
        backgroundImage: `url(${background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    }
    return {
      background: 'linear-gradient(041.61deg, var(--brand-hover) 7.15%, var(--brand) 90.96%)',
    }
  }

  const hasCustomBackground = background_type !== 'gradient' && background_image

  return (
    <div
      className="relative flex items-center gap-4 px-5 py-4 rounded-b-2xl overflow-hidden"
      style={getBackgroundStyle()}
    >
      {hasCustomBackground && (
        <div className="absolute inset-0 bg-black/30" />
      )}

      <Link prefetch href={getUriWithOrg(org?.slug, '/')} className="relative z-10 min-w-0">
        {org?.logo_image ? (
          // Org logos are usually wide wordmarks (the SINDEF one is 729x260).
          // Forcing one into a 40x40 square shrank it to an illegible ~28x10
          // smudge, so the logo keeps its own aspect ratio and is bounded by
          // height alone. `w-auto` lets the width follow, `max-w-[190px]` stops
          // an extreme banner from pushing the language switcher off screen.
          <img
            src={getOrgLogoMediaDirectory(org.org_uuid, org.logo_image)}
            alt={org.name}
            className="h-9 w-auto max-w-[190px] object-contain object-left rtl:object-right"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg ring-1 ring-inset ring-white/10 bg-white flex items-center justify-center overflow-hidden shrink-0">
            <Image
              quality={100}
              width={40}
              height={40}
              src={funeralacademyIcon}
              alt="Funeral Academy"
              className="object-contain"
            />
          </div>
        )}
      </Link>

      {/* The org name is shown only when there is no logo to carry it —
          otherwise the header repeats "SINDEF Academy" twice, once as an image
          and once as text. */}
      {!org?.logo_image && (
        <span className="relative z-10 font-semibold text-white text-lg truncate">
          {org?.name || 'Funeral Academy'}
        </span>
      )}

      {/* Unsplash attribution (required by Unsplash API guidelines) */}
      {background_type === 'unsplash' && background_image && unsplash_photographer_name && (
        <span className="relative z-10 ms-auto text-[10px] leading-tight text-white/70 truncate max-w-[45%] text-end">
          Photo by{' '}
          <a
            href={withUtm(unsplash_photographer_url) || withUtm(unsplash_photo_url)}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {unsplash_photographer_name}
          </a>
          {' '}on{' '}
          <a
            href={`https://unsplash.com/${UNSPLASH_UTM}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Unsplash
          </a>
        </span>
      )}
    </div>
  )
}
