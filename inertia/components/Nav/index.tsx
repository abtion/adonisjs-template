import { useState } from 'react'
import cn from 'classnames'
import Logo from '../Logo'
import { Link, usePage } from '@inertiajs/react'
import { SharedProps } from '@adonisjs/inertia/types'

export default function Nav() {
  const [open, setOpen] = useState(false)
  const {
    props: { auth },
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
            {/* <% if user_signed_in? %>
            <% if policy(:user).index? %>
              <li>
                <%= link_to t(".users"), admin_users_path, class: "NavLink #{'NavLink--active' if controller_name == 'users'}" %>
              </li>
            <% end %>
          <% end %> */}

            <li className="md:flex-grow"></li>
            <li>
              {auth.isAuthenticated ? (
                <Link href="/session" method="delete" className="NavLink" as="button">
                  Sign out
                </Link>
              ) : (
                <Link href="/sign-in" className="NavLink">
                  Sign in
                </Link>
                // <%- if Devise.mappings[:user].registerable? && controller_name != 'registrations' %>
                //   <%= link_to t(".sign_up"), new_registration_path(User), class: "NavLink" %>
                // <% end %>
              )}
            </li>
          </ul>
        </div>
      </div>
    </nav>
  )
}
