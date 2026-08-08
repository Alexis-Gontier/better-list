"use client";

import { BellIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type Notification = {
  id: string;
  title: string;
  description: string;
  date: string;
};

const notifications: Notification[] = [];

export function NotificationsMenu() {
  const unread = notifications.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={
            unread > 0 ? `Notifications (${unread} non lues)` : "Notifications"
          }
          className="relative text-muted-foreground"
        >
          <BellIcon />
          {unread > 0 && (
            <span className="absolute top-1 right-1 size-2 rounded-full bg-primary ring-2 ring-background" />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {unread === 0 ? (
          <Empty className="p-4">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BellIcon />
              </EmptyMedia>
              <EmptyTitle>Rien de neuf</EmptyTitle>
              <EmptyDescription>
                Vos notifications apparaîtront ici.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <DropdownMenuGroup>
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex-col items-start gap-0.5"
              >
                <span className="font-medium">{notification.title}</span>
                <span className="text-muted-foreground text-xs">
                  {notification.description}
                </span>
                <span className="text-muted-foreground text-xs">
                  {notification.date}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
