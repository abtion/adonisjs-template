import { Link } from '@inertiajs/react'
import cn from 'classnames'
import { ComponentProps } from 'react'
import './NavLink.scss'

type NavLinkProps = ComponentProps<typeof Link> & {
  active?: boolean
}

export default function NavLink(props: NavLinkProps) {
  const { active, ...restProps } = props

  return <Link {...restProps} className={cn('NavLink', { 'NavLink--active': active })} />
}
