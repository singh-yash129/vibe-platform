"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { useNavigate, useLocation } from "@tanstack/react-router"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const navigate = useNavigate()
  const location = useLocation()

  // Shared violet active/hover style matching StudentSidebar direction
  const activeStyle =
    "data-[active=true]:bg-gradient-to-r data-[active=true]:from-violet-600/20 data-[active=true]:to-indigo-600/10 " +
    "data-[active=true]:text-violet-400 data-[active=true]:border data-[active=true]:border-violet-500/20 " +
    "data-[active=true]:shadow-sm data-[active=true]:shadow-violet-500/10"

  const baseStyle =
    "rounded-xl transition-all duration-200 font-medium text-sm hover:bg-white/5 hover:text-foreground"

  const subActiveStyle =
    "data-[active=true]:text-violet-400 data-[active=true]:font-semibold data-[active=true]:bg-violet-600/8"

  const subBaseStyle =
    "rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-150"

  return (
    <SidebarGroup className="px-1">
      <SidebarGroupLabel
        className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest"
        style={{ color: "hsl(220 10% 40%)" }}
      >
        Platform
      </SidebarGroupLabel>
      <SidebarMenu className="gap-0.5">
        {items.map((item) =>
          item.items?.length ? (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={true}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={item.title}
                    className={`${baseStyle} ${activeStyle} h-10 [&>svg]:size-5`}
                  >
                    {item.icon && (
                      <item.icon
                        className="size-5 transition-colors duration-200"
                        style={{
                          color: item.items?.some(sub => location.pathname.startsWith(sub.url))
                            ? "hsl(262 83% 70%)"
                            : undefined,
                        }}
                      />
                    )}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto size-4 transition-transform duration-300 ease-out group-data-[state=open]/collapsible:rotate-90 text-muted-foreground/50" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub className="mt-0.5 ml-4 border-l border-border/40 pl-2 gap-0.5">
                    {item.items.map((subItem) => {
                      const isSubActive = location.pathname === subItem.url
                      return (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            data-active={isSubActive}
                            onClick={() => navigate({ to: subItem.url })}
                            className={`${subBaseStyle} ${subActiveStyle}`}
                          >
                            <span className="flex items-center gap-2">
                              {isSubActive && (
                                <span
                                  className="h-1 w-1 rounded-full shrink-0"
                                  style={{ background: "hsl(262 83% 70%)" }}
                                />
                              )}
                              {subItem.title}
                            </span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ) : (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                data-active={location.pathname.startsWith(item.url)}
                onClick={() => navigate({ to: item.url })}
                className={`${baseStyle} ${activeStyle} h-10 [&>svg]:size-5`}
              >
                <a>
                  {item.icon && (
                    <item.icon
                      className="size-5 transition-colors duration-200"
                      style={{
                        color: location.pathname.startsWith(item.url) ? "hsl(262 83% 70%)" : undefined,
                      }}
                    />
                  )}
                  <span>{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        )}
      </SidebarMenu>
    </SidebarGroup>
  )
}
