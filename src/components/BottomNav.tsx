import { NavLink } from 'react-router-dom'

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="주요 메뉴">
      <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : undefined)}>
        <span className="nav-ico" aria-hidden>
          ⌂
        </span>
        홈
      </NavLink>
      <NavLink to="/library" className={({ isActive }) => (isActive ? 'active' : undefined)}>
        <span className="nav-ico" aria-hidden>
          ▤
        </span>
        보관함
      </NavLink>
      <NavLink to="/edit" className={({ isActive }) => (isActive ? 'active' : undefined)}>
        <span className="nav-ico" aria-hidden>
          ✎
        </span>
        원고
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => (isActive ? 'active' : undefined)}>
        <span className="nav-ico" aria-hidden>
          ⚙
        </span>
        설정
      </NavLink>
    </nav>
  )
}
