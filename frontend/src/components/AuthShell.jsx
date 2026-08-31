import { useSettings } from '../context/SettingsContext'
import upsaShield from '../assets/upsa-shield.png'
import campusBackground from '../assets/upsa-campus.jpg'

/**
 * The frame every signed-out screen shares.
 *
 * A split layout rather than a card floating on a photograph: the photo at
 * full strength competed with the form for attention and left the card
 * cramped in the middle of it. Here the picture gets its own half, dimmed
 * under the brand gradient so the institution's colour still reads, and the
 * form gets a clean panel with room to breathe.
 *
 * Below lg there is no room for two halves, so the picture becomes a slim
 * banner and the form takes the page.
 */
export default function AuthShell({ children, footer }) {
  const { settings } = useSettings()
  const schoolName = settings.school_name || 'University of Professional Studies, Accra'
  const shortName = settings.short_name?.trim() || 'UPSA'
  const department = settings.department?.trim()

  return (
    <div className="flex min-h-dvh flex-col bg-background lg:flex-row">
      {/* Brand half */}
      <div className="relative flex shrink-0 items-end overflow-hidden bg-brand p-6 max-lg:h-40 lg:w-[44%] lg:p-12">
        <img
          src={campusBackground}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* The gradient does two jobs: it carries the brand colour over the
            photo, and it darkens the lower half enough for white text to sit
            on it whatever the photograph happens to contain. */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-brand-2 via-brand/85 to-brand/50"
          aria-hidden="true"
        />

        <div className="relative">
          <div className="flex items-center gap-3">
            <img
              src={settings.logo_url || upsaShield}
              alt={schoolName}
              className="h-12 w-12 rounded-xl bg-white object-contain p-1.5 lg:h-14 lg:w-14"
            />
            <span className="text-2xl font-extrabold tracking-tight text-white lg:text-3xl">
              {shortName}
            </span>
          </div>

          <div className="max-lg:hidden">
            <h2 className="mt-8 text-3xl leading-tight font-extrabold text-white xl:text-4xl">
              Final Year Project
              <br />
              Management System
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed font-medium text-white/80">
              {/* Was a rule-of-three marketing line ending "in one place" —
                  the sort of sentence a landing page writes about itself.
                  This is a sign-in screen for people who have to use the
                  system, so it names the institution and stops. The
                  department comes from settings, not a hardcoded string, so
                  it stays true if another department adopts this. */}
              {schoolName}
              {department ? `. ${department}.` : '.'}
            </p>
          </div>
        </div>
      </div>

      {/* Form half */}
      <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8 lg:py-12">
        <div className="w-full max-w-sm">
          {children}
          {footer && <div className="mt-8">{footer}</div>}
        </div>
      </div>
    </div>
  )
}
