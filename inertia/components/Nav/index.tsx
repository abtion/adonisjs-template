import { useState } from 'react'
import cn from 'classnames'
import Logo from '../Logo'
import { Link, usePage } from '@inertiajs/react'
import { SharedProps } from '@adonisjs/inertia/types'
import NavLink from './NavLink'
import { useTranslation } from 'react-i18next'

export default function Nav() {
  const { t } = useTranslation()

  const [open, setOpen] = useState(false)
  const {
    props: { auth, policies },
    component,
  } = usePage<SharedProps>()

  return (
    <nav className="bg-white shadow-sm sticky inset-x-0">
      <div className="container mx-auto">
        <div className="flex justify-between flex-wrap">
          <div className="flex">
            <Link href="/" className="md:mr-12 grid">
              <Logo className="justify-self-center self-center" />
            </Link>
          </div>

          <div className="md:hidden flex items-center">
            <button className="focus:outline-none py-4 px-4" onClick={() => setOpen(!open)}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>

          <ul
            className={cn('w-full md:w-auto md:flex-grow md:flex items-center md:space-x-5', {
              hidden: !open,
            })}
          >
            {auth.isAuthenticated && (
              <>
                {policies.UserPolicy.index && (
                  <li>
                    <NavLink href="/users" active={component.startsWith('users')}>
                      {t('components.nav.users')}
                    </NavLink>
                  </li>
                )}
                <li>
                  <NavLink href="/profile" active={component.startsWith('profile')}>
                    {t('components.nav.profile', { defaultValue: 'Profile' })}
                  </NavLink>
                </li>
              </>
            )}

            <li className="md:flex-grow"></li>
            <li>
              {auth.isAuthenticated ? (
                <NavLink href="/session" method="delete" as="button">
                  {t('components.nav.signOut')}
                </NavLink>
              ) : (
                <NavLink href="/sign-in">{t('components.nav.signIn')}</NavLink>
              )}
            </li>
          </ul>
        </div>
      </div>
    </nav>
  )
}
