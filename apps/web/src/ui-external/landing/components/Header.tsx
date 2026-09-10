import { useState, useEffect, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/ui-shared/components/ui/button"
import { GraduationCap, List, X, User, CaretDown, SignOut, Briefcase } from "@phosphor-icons/react"
import { logoutUser } from '@/client'

export default function Header() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userEmail, setUserEmail] = useState("")
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const token = localStorage.getItem("accessToken")
    const email = localStorage.getItem("userEmail")
    if (token) {
      setIsLoggedIn(true)
      setUserEmail(email || "")
    } else {
      setIsLoggedIn(false)
      setUserEmail("")
    }
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLogout = () => {
    void logoutUser().catch(() => {})
    // Read token from localStorage, .catch swallow rejection (expire token)
    localStorage.removeItem("accessToken")
    localStorage.removeItem("userEmail")
    setIsLoggedIn(false)
    setUserEmail("")
    setMenuOpen(false)
    navigate("/")
    window.location.reload()
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-foreground/10 bg-background/80 backdrop-blur-md font-sans">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
              <div className="flex size-10 items-center justify-center bg-brand text-white">
                <GraduationCap size={24} weight="fill" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-foreground">
                Academia<span className="text-brand">Connect</span>
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              to="/"
              className="text-xs font-semibold uppercase tracking-wider text-foreground/80 hover:text-brand transition-colors"
            >
              Search Jobs
            </Link>
            <a
              href="#employer-cta"
              className="text-xs font-semibold uppercase tracking-wider text-foreground/80 hover:text-brand transition-colors"
            >
              For Employers
            </a>
            <a
              href="#about"
              onClick={(e) => {
                e.preventDefault()
                alert("About page is a placeholder for this thesis MVP.")
              }}
              className="text-xs font-semibold uppercase tracking-wider text-foreground/80 hover:text-brand transition-colors"
            >
              About
            </a>
            <a
              href="#resources"
              onClick={(e) => {
                e.preventDefault()
                alert("Resources center is a placeholder for this thesis MVP.")
              }}
              className="text-xs font-semibold uppercase tracking-wider text-foreground/80 hover:text-brand transition-colors"
            >
              Resources
            </a>
          </nav>

          {/* Desktop CTA Buttons / User Account Menu */}
          <div className="hidden md:flex items-center gap-3">
            {isLoggedIn ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  id="user-account-menu-btn"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 h-9 px-3 border border-foreground/15 bg-background hover:border-brand/50 text-foreground/80 hover:text-brand transition-colors text-xs font-semibold"
                  aria-haspopup="true"
                  aria-expanded={menuOpen}
                >
                  <div className="flex size-6 items-center justify-center bg-brand/10 text-brand">
                    <User size={13} weight="bold" />
                  </div>
                  <span className="max-w-[130px] truncate">{userEmail}</span>
                  <CaretDown
                    size={12}
                    weight="bold"
                    className={`transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Dropdown */}
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-52 border border-foreground/10 bg-background shadow-lg z-50">
                    <div className="px-3 py-2.5 border-b border-foreground/10">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Signed in as</p>
                      <p className="text-xs font-semibold text-foreground truncate mt-0.5">{userEmail}</p>
                    </div>
                    <div className="py-1 space-y-0.5">
                      <Link
                        id="my-profile-link"
                        to="/dashboard"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-foreground/80 hover:text-brand hover:bg-brand/5 transition-colors"
                      >
                        <User size={13} />
                        My Profile
                      </Link>
                      <Link
                        id="my-applications-link"
                        to="/applications"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-foreground/80 hover:text-brand hover:bg-brand/5 transition-colors"
                      >
                        <Briefcase size={13} />
                        My Applications
                      </Link>
                    </div>
                    <div className="border-t border-foreground/10 py-1">
                      <button
                        id="logout-btn"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-xs font-semibold text-destructive hover:bg-destructive/5 transition-colors"
                      >
                        <SignOut size={13} />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login">
                  <Button
                    variant="outline"
                    className="h-9 px-4 text-xs font-bold uppercase tracking-wider border-foreground/20 hover:border-brand hover:text-brand cursor-pointer transition-colors"
                  >
                    Log In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button
                    className="h-9 px-4 text-xs font-bold uppercase tracking-wider bg-brand hover:bg-brand/90 text-white border-none cursor-pointer transition-colors"
                  >
                    Register
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 text-foreground/80 hover:text-brand focus:outline-none"
              aria-label="Toggle Menu"
            >
              {isOpen ? <X size={24} /> : <List size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {isOpen && (
        <div className="md:hidden border-b border-foreground/10 bg-background/95 backdrop-blur-md">
          <div className="space-y-1.5 px-4 pt-2 pb-6">
            <Link
              to="/"
              onClick={() => setIsOpen(false)}
              className="block py-2.5 text-xs font-bold uppercase tracking-wider text-foreground/80 hover:text-brand"
            >
              Search Jobs
            </Link>
            <a
              href="#employer-cta"
              onClick={() => setIsOpen(false)}
              className="block py-2.5 text-xs font-bold uppercase tracking-wider text-foreground/80 hover:text-brand"
            >
              For Employers
            </a>
            <a
              href="#about"
              onClick={(e) => {
                e.preventDefault()
                setIsOpen(false)
                alert("About page is a placeholder for this thesis MVP.")
              }}
              className="block py-2.5 text-xs font-bold uppercase tracking-wider text-foreground/80 hover:text-brand"
            >
              About
            </a>
            <a
              href="#resources"
              onClick={(e) => {
                e.preventDefault()
                setIsOpen(false)
                alert("Resources center is a placeholder for this thesis MVP.")
              }}
              className="block py-2.5 text-xs font-bold uppercase tracking-wider text-foreground/80 hover:text-brand"
            >
              Resources
            </a>

            {/* Mobile Auth Section */}
            <div className="pt-4 flex flex-col gap-2 border-t border-foreground/10 mt-3">
              {isLoggedIn ? (
                <>
                  <div className="pb-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Signed in as</p>
                    <p className="text-xs font-semibold text-foreground truncate mt-0.5">{userEmail}</p>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 py-2 text-xs font-bold uppercase tracking-wider text-foreground/80 hover:text-brand"
                  >
                    <User size={14} />
                    My Profile
                  </Link>
                  <Link
                    to="/applications"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 py-2 text-xs font-bold uppercase tracking-wider text-foreground/80 hover:text-brand"
                  >
                    <Briefcase size={14} />
                    My Applications
                  </Link>
                  <button
                    onClick={() => { setIsOpen(false); handleLogout() }}
                    className="flex items-center gap-2 py-2 text-xs font-bold uppercase tracking-wider text-destructive"
                  >
                    <SignOut size={14} />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setIsOpen(false)} className="w-full">
                    <Button
                      variant="outline"
                      className="w-full h-9 text-xs font-bold uppercase tracking-wider border-foreground/20 hover:border-brand hover:text-brand cursor-pointer"
                    >
                      Log In
                    </Button>
                  </Link>
                  <Link to="/register" onClick={() => setIsOpen(false)} className="w-full">
                    <Button
                      className="w-full h-9 text-xs font-bold uppercase tracking-wider bg-brand hover:bg-brand/90 text-white border-none cursor-pointer"
                    >
                      Register
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
