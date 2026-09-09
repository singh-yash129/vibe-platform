"use client"

import * as React from "react"
import { BookOpen, Megaphone, LifeBuoy, SquareTerminal } from "lucide-react"
import { NavMain } from "./nav-main"
import { AuroraText } from "@/components/magicui/aurora-text"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Link } from "@tanstack/react-router"
import logo from "../../public/img/vibe_logo_img.ico"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { useAuthStore } from "@/store/auth-store"
import { useInstructorHasHpCourses } from "@/hooks/hooks"

export function AppSidebar() {
  const { state } = useSidebar()
  const { user } = useAuthStore.getState()
  const { hasHpCourses } = useInstructorHasHpCourses()

  const data = {
    user: {
      name: user?.name || "Instructor",
      avatar: user?.avatar,
    },
    navMain: [
      {
        title: "Courses",
        url: "#",
        icon: BookOpen,
        items: [
          { title: "Create Course", url: "/teacher/courses/create" },
          { title: "All Courses", url: "/teacher" },
          { title: "Share a video", url: "/teacher/share-video" },
          { title: "Generate Section (AI)", url: "/teacher/jobs/create" },
        ],
      },
      {
        title: "Announcements",
        url: "/teacher/announcements",
        icon: Megaphone,
      },
      ...(hasHpCourses
        ? [{
          title: "HP System",
          url: "/teacher/hp-system",
          icon: SquareTerminal,
        }]
        : []),
      {
        title: "Support Queue",
        url: "/teacher/support",
        icon: LifeBuoy,
      },
    ],
  }

  return (
    <>
      <style>{`
        /* Glass sidebar for teacher */
        [data-sidebar="sidebar"] {
          background: hsl(240 8% 6% / 0.97) !important;
          border-right: 1px solid hsl(240 5% 13%) !important;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
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
      `}</style>

      <Sidebar collapsible="icon" variant="sidebar" className="border-r-0">
        <SidebarHeader className="flex items-center px-3 py-4">
          <div className="flex items-center gap-3">
            {/* Gradient ring logo */}
            <div
              className="h-10 w-10 rounded-xl shrink-0 overflow-hidden p-0.5"
              style={{ background: "linear-gradient(135deg, hsl(38 95% 58%), hsl(262 83% 70%))" }}
            >
              <div className="h-full w-full rounded-[10px] overflow-hidden bg-card flex items-center justify-center">
                <img src={logo} alt="ViBe Logo" className="h-9 w-9 object-contain" />
              </div>
            </div>
            {state === "expanded" && (
              <span
                className="text-2xl font-extrabold"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                <AuroraText colors={["#f59e0b", "#a78bfa", "#38bdf8"]}>ViBe</AuroraText>
              </span>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent>
          <NavMain items={data.navMain} />
        </SidebarContent>

        <SidebarFooter>
          {/* Separator */}
          <div className="mx-3 mb-3 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          {state === "expanded" && (
            <Link
              to="/teacher/profile"
              className="group flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl border border-border/40 bg-surface-2 hover:border-violet-500/20 hover:bg-white/5 transition-all duration-200 cursor-pointer"
            >
              <div className="relative">
                <Avatar className="h-8 w-8 border-2 border-violet-500/20">
                  <AvatarImage src={data.user.avatar || "/placeholder.svg"} alt={data.user.name} />
                  <AvatarFallback
                    className="text-xs font-bold"
                    style={{
                      background: "linear-gradient(135deg, hsl(38 95% 58% / 0.2), hsl(262 83% 70% / 0.2))",
                      color: "hsl(262 83% 70%)",
                    }}
                  >
                    {data.user.name?.charAt(0).toUpperCase() || "I"}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-background" />
              </div>
              <div className="flex flex-col text-left min-w-0">
                <div className="text-sm font-semibold text-foreground truncate" title={data.user.name}>
                  {data.user.name}
                </div>
                <div className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium">
                  Instructor
                </div>
              </div>
            </Link>
          )}
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>
    </>
  )
}
