"use client"

import { useState } from "react"
import { Link, useLocation, useNavigate } from "@tanstack/react-router"
import { LogOut, Settings, Sun, Moon, Sparkles } from "lucide-react"
import { useTheme } from "next-themes"
import { useAuthStore } from "@/store/auth-store"
import { useStudentHpEnabled } from "@/hooks/hooks"
import { useNewAnnouncementIndicator } from "@/hooks/use-new-announcement-indicator"
import { logout } from "@/utils/auth"
import { AuroraText } from "@/components/magicui/aurora-text"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import ConfirmationModal from "@/app/pages/teacher/components/confirmation-modal"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import logo from "../../../public/img/vibe_logo_img.ico"
import { STUDENT_NAV_ITEMS } from "./nav-items"
import { StudentNotifications } from "./StudentNotifications"

export function StudentSidebar() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { theme, setTheme } = useTheme()
  const [confirmLogout, setConfirmLogout] = useState(false)
  const { hasNew: hasNewAnnouncements, markSeen: markAnnouncementsSeen } = useNewAnnouncementIndicator()
  const { hasCourseInProgress: hasHpSystem } = useStudentHpEnabled()

  const isActive = (path: string) =>
    path === "/student" ? pathname === "/student" : pathname === path || pathname.startsWith(path + "/")

  const handleLogout = () => {
    logout()
    navigate({ to: "/auth" })
  }

  const visibleItems = STUDENT_NAV_ITEMS.filter(
    (item) => item.requires !== "hpSystem" || hasHpSystem,
  )

  // Premium violet active + hover styling
  const navItemBase =
    "h-10 [&>svg]:size-5 rounded-xl transition-all duration-200 font-medium text-sm"

  const activeStyle =
    "bg-gradient-to-r from-violet-600/20 to-indigo-600/10 text-violet-400 dark:text-violet-300 " +
    "border border-violet-500/20 shadow-sm shadow-violet-500/10 " +
    "data-[active=true]:bg-gradient-to-r data-[active=true]:from-violet-600/20 data-[active=true]:to-indigo-600/10 " +
    "data-[active=true]:text-violet-400 dark:data-[active=true]:text-violet-300 " +
    "data-[active=true]:border-violet-500/20"

  const hoverStyle =
    "hover:bg-white/5 hover:text-foreground dark:hover:bg-white/[0.06] " +
    "active:bg-white/8 focus-visible:ring-violet-500/40"

  return (
    <>
      <style>{`
        /* Sidebar glass morphism */
        [data-sidebar="sidebar"] {
          background: hsl(240 8% 6% / 0.97) !important;
          border-right: 1px solid hsl(240 5% 13%) !important;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        /* Subtle left glow edge */
        [data-sidebar="sidebar"]::before {
          content: '';
          position: absolute;
          top: 0; left: 0; bottom: 0;
          width: 1px;
          background: linear-gradient(to bottom,
            transparent 0%,
            hsl(262 83% 70% / 0.3) 30%,
            hsl(38 95% 58% / 0.2) 70%,
            transparent 100%
          );
          pointer-events: none;
          z-index: 10;
        }
        .light [data-sidebar="sidebar"],
        :root:not(.dark) [data-sidebar="sidebar"] {
          background: hsl(0 0% 99% / 0.97) !important;
          border-right: 1px solid hsl(220 16% 92%) !important;
        }
        .light [data-sidebar="sidebar"]::before,
        :root:not(.dark) [data-sidebar="sidebar"]::before {
          background: linear-gradient(to bottom,
            transparent 0%,
            hsl(262 83% 58% / 0.2) 30%,
            hsl(38 95% 58% / 0.15) 70%,
            transparent 100%
          );
        }
      `}</style>

      <ConfirmationModal
        isOpen={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        onConfirm={handleLogout}
        title="Confirm Logout"
        description="Are you sure you want to log out? You will need to sign in again to access your dashboard."
      />

      <Sidebar collapsible="icon" variant="sidebar" className="border-r-0">
        {/* Header */}
        <SidebarHeader className="px-3 py-4">
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-1">
            <Link to="/student" className="flex items-center gap-3 pl-1 group-data-[collapsible=icon]:pl-0">
              {/* Logo with gradient ring */}
              <div
                className="h-9 w-9 shrink-0 rounded-xl overflow-hidden p-0.5"
                style={{ background: "linear-gradient(135deg, hsl(38 95% 58%), hsl(262 83% 70%))" }}
              >
                <div className="h-full w-full rounded-[10px] overflow-hidden bg-card">
                  <img src={logo} alt="ViBe Logo" className="h-full w-full object-contain" />
                </div>
              </div>
              <span className="text-2xl font-extrabold group-data-[collapsible=icon]:hidden" style={{ fontFamily: "'Syne', sans-serif" }}>
                <AuroraText colors={["#f59e0b", "#a78bfa", "#38bdf8"]}>ViBe</AuroraText>
              </span>
            </Link>
            <SidebarTrigger className="ml-auto group-data-[collapsible=icon]:ml-0 rounded-lg hover:bg-white/5 transition-colors" />
          </div>
        </SidebarHeader>

        {/* Nav items */}
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1 px-1">
                {visibleItems.map((item, idx) => {
                  const Icon = item.icon
                  const active = isActive(item.to)
                  const showDot = item.indicator === "announcements" && hasNewAnnouncements
                  return (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        onClick={item.indicator === "announcements" ? markAnnouncementsSeen : undefined}
                        className={`${navItemBase} ${active ? activeStyle : hoverStyle} animate-slide-up-fade stagger-${Math.min(idx + 1, 6)}`}
                      >
                        <Link to={item.to} className="relative flex items-center gap-3">
                          <Icon
                            className="size-5 transition-transform duration-200"
                            style={{ color: active ? "hsl(262 83% 70%)" : undefined }}
                          />
                          <span>{item.title}</span>
                          {showDot && (
                            <span className="absolute left-5 top-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-background animate-pulse" />
                          )}
                          {active && (
                            <span
                              className="ml-auto h-1.5 w-1.5 rounded-full"
                              style={{ background: "hsl(262 83% 70%)" }}
                            />
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Footer */}
        <SidebarFooter className="px-2 pb-4">
          {/* Thin separator */}
          <div className="mx-2 mb-3 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          <SidebarMenu className="gap-1.5">
            {/* Profile row */}
            <SidebarMenuItem>
              <div className="flex items-center gap-2 rounded-xl px-2 py-1.5 group-data-[collapsible=icon]:justify-center">
                <div className="relative">
                  <Avatar
                    className="h-8 w-8 shrink-0 ring-2"
                    style={{ ringColor: "hsl(262 83% 70% / 0.3)" }}
                  >
                    <AvatarImage src={user?.avatar || "/placeholder.svg"} alt={user?.name} />
                    <AvatarFallback
                      className="text-xs font-bold"
                      style={{ background: "linear-gradient(135deg, hsl(38 95% 58% / 0.2), hsl(262 83% 70% / 0.2))", color: "hsl(262 83% 70%)" }}
                    >
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online indicator */}
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-background" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
                  <span className="truncate text-sm font-semibold text-foreground" title={user?.name}>
                    {user?.name || "Student"}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider">
                    Learner
                  </span>
                </div>
                <Link
                  to="/student/profile"
                  aria-label="Profile settings"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors group-data-[collapsible=icon]:hidden"
                >
                  <Settings className="size-3.5" />
                </Link>
              </div>
            </SidebarMenuItem>

            {/* Actions row */}
            <SidebarMenuItem>
              <div className="flex items-center gap-1.5 px-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center">
                {/* Logout */}
                <button
                  type="button"
                  onClick={() => setConfirmLogout(true)}
                  title="Logout"
                  className="flex h-8 items-center gap-1.5 rounded-xl bg-red-500/8 px-3 text-xs font-semibold text-red-400 border border-red-500/15 transition-all hover:bg-red-500/15 hover:border-red-500/25 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                >
                  <LogOut className="size-3.5" />
                  <span className="group-data-[collapsible=icon]:hidden">Logout</span>
                </button>

                <div className="ml-auto flex items-center gap-1.5 group-data-[collapsible=icon]:ml-0 group-data-[collapsible=icon]:flex-col">
                  <StudentNotifications compact />

                  {/* Theme toggle */}
                  <button
                    type="button"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    aria-label="Toggle theme"
                    title="Toggle theme"
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground border border-border/50 hover:text-foreground hover:bg-white/5 hover:border-border transition-all"
                  >
                    <Sun className="size-4 dark:hidden" />
                    <Moon className="hidden size-4 dark:block" />
                  </button>
                </div>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>
    </>
  )
}
