"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { mainNav } from "@/config/navigation";

export function MainNav() {
  const pathname = usePathname();

  return (
    <NavigationMenu className="hidden md:flex">
      <NavigationMenuList>
        {mainNav.map((section) => (
          <NavigationMenuItem key={section.href}>
            <NavigationMenuTrigger
              size="button-sm"
              className="text-muted-foreground"
            >
              {section.label}
            </NavigationMenuTrigger>

            <NavigationMenuContent>
              <ul className="grid w-88 gap-1 p-1">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <NavigationMenuLink asChild active={pathname === link.href}>
                      <Link href={link.href} className="items-start">
                        <span className="flex flex-col items-start">
                          <span className="font-medium">{link.label}</span>
                          <span className="text-muted-foreground text-xs">
                            {link.description}
                          </span>
                        </span>
                      </Link>
                    </NavigationMenuLink>
                  </li>
                ))}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
